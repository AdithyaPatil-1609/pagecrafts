import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { treeSha } from "../src/lib/data/tree-hash";
import { createProject } from "../src/lib/data/projects";
import { putProjectFiles } from "../src/lib/data/project-files";

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
    .select("id, name, files, content_schema, tier")
    .limit(1)
    .maybeSingle();

  const design = must(template, templateError, "read a template");
  const templateFiles = (design.files ?? {}) as FileMap;

  if (Object.keys(templateFiles).length === 0) {
    bail("the template has no files", "run `npm run templates:seed` before this");
  }
  ok(`picked the design "${design.name}" (${Object.keys(templateFiles).length} files)`);

  // 2. Fork it — through createProject, not by hand.
  //
  // This used to insert the row, call replace_project_files and write the commit itself,
  // which proved the SQL and nothing about the code above it. The fork path grew a lot at
  // D7 and D8 — it copies the schema, seeds content_json from the markup, seeds site_meta,
  // and refuses a paid design without an entitlement — and none of that was exercised by an
  // imitation of it. A milestone that walks a parallel implementation is not a milestone.
  const forked = await createProject(db, userId, {
    name: `verify-core-loop ${Date.now()}`,
    sourceTemplateId: design.id as string,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/paid for/i.test(message)) {
      bail("the first design in the catalogue is a paid one", "seed a free design, or grant this user pro");
    }
    bail("createProject failed", message);
  });

  const projectId = forked.id;
  const forkSha = forked.firstCommit;
  if (!forkSha) bail("the fork returned no first commit", "history would start empty");
  ok(`forked into project ${projectId}, version #1 is ${forkSha.slice(0, 7)}`);

  try {
    // 3. What D7 promised the fork would leave behind. Checked here rather than trusted,
    //    because the fake database cannot tell us whether the real columns took the values.
    const { data: row, error: rowError } = await db
      .from("projects")
      .select("content_schema, content_json, site_meta")
      .eq("id", projectId)
      .maybeSingle();

    const project = must(row, rowError, "read the forked project");
    const schema = (project.content_schema ?? {}) as { sections?: unknown[] };
    const content = (project.content_json ?? {}) as Record<string, unknown>;
    const meta = (project.site_meta ?? {}) as { title?: string };

    if (!schema.sections?.length) {
      bail("the fork copied no content schema", "the project cannot be edited in the panel");
    }
    if (Object.keys(content).length === 0) {
      bail("the fork seeded no content", "the panel would open blank over a full page");
    }
    if (!meta.title) bail("the fork set no site title", "publishing would emit no <title>");
    ok(`fork carried its own schema (${schema.sections.length} sections), content and site title`);

    // 4. The commit the fork wrote really is the tree it wrote.
    const { data: firstCommit, error: firstCommitError } = await db
      .from("commits")
      .select("sha, snapshot")
      .eq("project_id", projectId)
      .eq("sha", forkSha)
      .maybeSingle();

    const version1 = must(firstCommit, firstCommitError, "read version #1");
    if (treeSha((version1.snapshot ?? {}) as FileMap) !== forkSha) {
      bail("version #1's snapshot does not hash to its own sha", "restoring it would not restore it");
    }
    ok(`version #1 carries the tree it names`);

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

    // 10. Two tabs, at once — the one thing no test in this repo can reach.
    //
    // The D6 precondition is enforced inside replace_project_files, behind a
    // `select ... for update`. Every unit test for it runs against tests/support/fake-db.ts,
    // which has no transactions and no locks: it can show that a *stale* timestamp is
    // refused, and it cannot show that two writers arriving together are serialised. That
    // is the half that matters, because it is the half that loses somebody's work.
    //
    // So: read the tree's timestamp once, then fire two writes that both claim it. Postgres
    // must let exactly one through — the second blocks on the row lock, wakes up seeing the
    // timestamp the first one wrote, and finds its own precondition no longer true.
    const { data: beforeRace, error: beforeError } = await db
      .from("projects")
      .select("updated_at")
      .eq("id", projectId)
      .maybeSingle();

    const sharedAt = must(beforeRace, beforeError, "read updated_at before the race").updated_at as string;

    const settled = await Promise.allSettled([
      putProjectFiles(db, projectId, { "index.html": "<h1>tab A</h1>" }, sharedAt),
      putProjectFiles(db, projectId, { "index.html": "<h1>tab B</h1>" }, sharedAt),
    ]);

    const won = settled.filter((r) => r.status === "fulfilled").length;
    const refused = settled.filter(
      (r) => r.status === "rejected" && /changed since you opened it/i.test(String(r.reason?.message ?? "")),
    ).length;

    if (won !== 1 || refused !== 1) {
      bail(
        `two concurrent writes settled as ${won} accepted / ${refused} refused, expected 1 and 1`,
        settled.map((r) => (r.status === "fulfilled" ? "accepted" : String(r.reason?.message ?? r.reason))),
      );
    }
    ok("two writers arriving together: one won, one was refused — the row lock holds");

    // 11. Somebody who is not signed in sees nothing.
    //
    // Every owner-scoping guarantee in the API rests on RLS making another person's rows
    // invisible rather than raising — the routes turn that silence into not_found. The unit
    // tests assert it against policies transcribed into the fake by hand, and a
    // transcription can be wrong in the same direction twice. This asks Postgres.
    //
    // A signed-out client rather than a second account: it needs no extra credentials, and
    // it is the same policy doing the work.
    const stranger = createClient(URL!, ANON!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: seenProject } = await stranger
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    const { data: seenFiles } = await stranger
      .from("project_files")
      .select("path")
      .eq("project_id", projectId);

    if (seenProject) bail("a signed-out client can read this project", "RLS is not doing its job");
    if ((seenFiles ?? []).length > 0) {
      bail("a signed-out client can read this project's files", `${seenFiles!.length} rows came back`);
    }
    ok("a signed-out client sees neither the project nor its files");
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
