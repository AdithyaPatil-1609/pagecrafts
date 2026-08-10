import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { treeSha } from "../src/lib/data/tree-hash";

// The D10 acceptance, run against the real database (R3).
//
//   npm run verify:loop
//
// Every test in this repo runs against a fake — tests/support/fake-db.ts and
// fake-supabase.ts. They are good at proving the code is self-consistent and they cannot
// prove the one thing a milestone rests on: that the shared database has the columns, the
// function and the policies the code assumes. A migration written and never applied looks
// identical to an applied one from inside a unit test.
//
// So this signs in as a real user with the anon key — no service role, RLS fully in force,
// exactly as a request from a browser — and walks the loop the week was built to support:
//
//   fork a design -> read it back -> edit -> save a version -> restore -> history intact
//
// It cleans up after itself. Nothing is left in the database when it finishes.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const EMAIL = process.env.VERIFY_EMAIL?.trim();
const PASSWORD = process.env.VERIFY_PASSWORD?.trim();

type FileMap = Record<string, string>;

let step = 0;

function ok(message: string) {
  step += 1;
  console.log(`  ${String(step).padStart(2)}. OK    ${message}`);
}

class Failed extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

// Throws rather than exiting: process.exit() skips `finally`, which is where the project
// this script created gets deleted. A verification run that leaves wreckage behind on a
// shared database is worse than no verification run.
function bail(message: string, detail?: unknown): never {
  throw new Failed(message, detail);
}

/** Fails loudly rather than letting a null flow onward and confuse a later step. */
function must<T>(value: T | null, error: { message: string } | null, what: string): T {
  if (error) bail(`could not ${what}`, error.message);
  if (value === null) bail(`could not ${what}`, "no row came back — RLS, or it is not there");
  return value;
}

async function signIn(): Promise<{ db: SupabaseClient; userId: string }> {
  if (!URL || !ANON) bail("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  if (!EMAIL || !PASSWORD) {
    bail(
      "VERIFY_EMAIL and VERIFY_PASSWORD must be set in .env.local",
      "use a real account on the shared project — the script only ever touches its own rows",
    );
  }

  // No session file and no refresh timer: this is a one-shot script, and the timer keeps
  // the event loop alive after we are done, which makes Node complain on the way out.
  const supabase = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (error) {
    bail(
      "could not sign in",
      `${error.message} — the account must already exist on the shared project, ` +
        "and its email must be confirmed. Sign up through the app first.",
    );
  }

  const userId = data.user?.id;
  if (!userId) bail("signed in but got no user id back");

  ok(`signed in as ${EMAIL} (anon key, so RLS applies exactly as it would in a browser)`);
  return { db: supabase, userId };
}

async function main() {
  const { db, userId } = await signIn();

  // 1. A design to fork.
  const { data: template, error: templateError } = await db
    .from("templates")
    .select("id, name, files")
    .limit(1)
    .maybeSingle();

  const design = must(template, templateError, "read a template");
  const templateFiles = (design.files ?? {}) as FileMap;

  if (Object.keys(templateFiles).length === 0) {
    bail("the template has no files", "seed the catalogue before running this");
  }
  ok(`picked the design "${design.name}" (${Object.keys(templateFiles).length} files)`);

  // 2. Fork it.
  // user_id is not optional: the insert policy is `with check (user_id = auth.uid())`, so a
  // row nobody owns is refused outright. The route sets it from the session for the same
  // reason — an orphaned project would be invisible to its own creator.
  const { data: created, error: createError } = await db
    .from("projects")
    .insert({
      user_id: userId,
      name: `verify-core-loop ${Date.now()}`,
      source_template_id: design.id,
    })
    .select("id")
    .single();

  const projectId = must(created, createError, "create a project").id as string;
  ok(`created project ${projectId}`);

  try {
    // 3. Write the tree through the database function. This is the D6 migration: if it was
    //    never applied, this is where the run stops.
    const { data: forkedAt, error: forkError } = await db.rpc("replace_project_files", {
      p_project_id: projectId,
      p_files: templateFiles,
    });

    if (forkError) bail("replace_project_files failed — is the D6 migration applied?", forkError.message);
    ok(`wrote the design into the working tree (updated_at ${forkedAt})`);

    // 4. Record version #1, carrying the tree. Needs commits.snapshot to exist.
    const forkSha = treeSha(templateFiles);
    const { error: firstCommitError } = await db.from("commits").insert({
      project_id: projectId,
      sha: forkSha,
      message: `Created from ${design.name}`,
      author: "system",
      snapshot: templateFiles,
    });

    if (firstCommitError) {
      bail("could not record version #1 — is commits.snapshot there?", firstCommitError.message);
    }
    ok(`recorded version #1 as ${forkSha.slice(0, 7)}`);

    // 5. Read it back. A fork that cannot be read is not a fork.
    const { data: forkedRows, error: readError } = await db
      .from("project_files")
      .select("path, content")
      .eq("project_id", projectId);

    if (readError) bail("could not read the working tree", readError.message);

    const readBack: FileMap = {};
    for (const row of forkedRows ?? []) readBack[row.path as string] = row.content as string;

    if (treeSha(readBack) !== forkSha) {
      bail("the tree read back is not the tree written", `${treeSha(readBack)} vs ${forkSha}`);
    }
    ok("read the tree back byte for byte");

    // 6. Edit, and save that as its own version.
    const firstPath = Object.keys(templateFiles).sort()[0]!;
    const edited: FileMap = { ...templateFiles, [firstPath]: `${templateFiles[firstPath]}<!-- edited -->` };
    const editedSha = treeSha(edited);

    const { error: editError } = await db.rpc("replace_project_files", {
      p_project_id: projectId,
      p_files: edited,
    });
    if (editError) bail("could not write the edit", editError.message);

    const { error: secondCommitError } = await db.from("commits").insert({
      project_id: projectId,
      sha: editedSha,
      message: "Edited the first file",
      author: "user",
      snapshot: edited,
    });
    if (secondCommitError) bail("could not save the edit as a version", secondCommitError.message);
    ok(`edited ${firstPath} and saved it as ${editedSha.slice(0, 7)}`);

    // 7. Restore to version #1 — the step that has never run outside a fake.
    const { data: storedCommit, error: snapshotError } = await db
      .from("commits")
      .select("snapshot")
      .eq("project_id", projectId)
      .eq("sha", forkSha)
      .maybeSingle();

    const stored = must(storedCommit, snapshotError, "read version #1 back");
    const snapshot = (stored.snapshot ?? {}) as FileMap;

    if (Object.keys(snapshot).length === 0) {
      bail("version #1 came back with no files", "the snapshot was not stored");
    }

    const { error: restoreError } = await db.rpc("replace_project_files", {
      p_project_id: projectId,
      p_files: snapshot,
    });
    if (restoreError) bail("could not restore", restoreError.message);

    // 8. And the files really came back — not a reported success over an unchanged tree.
    const { data: restoredRows } = await db
      .from("project_files")
      .select("path, content")
      .eq("project_id", projectId);

    const restored: FileMap = {};
    for (const row of restoredRows ?? []) restored[row.path as string] = row.content as string;

    if (treeSha(restored) !== forkSha) {
      bail("restore did not bring the files back", `tree is ${treeSha(restored).slice(0, 7)}`);
    }
    ok(`restored to ${forkSha.slice(0, 7)} and the files came back`);

    // 9. History is additive: going back did not remove the version we came from.
    const { data: history, error: historyError } = await db
      .from("commits")
      .select("sha, message, author")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (historyError) bail("could not read the history", historyError.message);
    if ((history ?? []).length !== 2) {
      bail(`history has ${(history ?? []).length} versions, expected 2`, history);
    }
    ok(`history intact: ${history!.map((c) => `"${c.message}"`).join(", ")}`);
  } finally {
    // Leave nothing behind, even after a failure. Files and commits cascade.
    await db.from("projects").delete().eq("id", projectId);
    console.log(`\n  cleaned up project ${projectId}`);
  }

  console.log("\n  The core loop works on the real database. D10 exit condition met.\n");
}

main().catch((error: unknown) => {
  const failure = error instanceof Failed ? error : new Failed("unexpected", String(error));

  console.error(`\n  ${String(step + 1).padStart(2)}. FAIL  ${failure.message}`);
  if (failure.detail) {
    const detail = failure.detail;
    console.error(`         ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  console.error("");
  process.exitCode = 1;
});
