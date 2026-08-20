import { redirect } from "next/navigation";

import { viewer } from "@/lib/auth/session";
import { supabaseViewerClient } from "@/lib/auth/server";
import { getAccount } from "@/lib/data/account";
import type { AccountResponse } from "@/lib/contracts";
import { TrainingConsent } from "@/components/settings/TrainingConsent";
import { DeleteAccount } from "@/components/settings/DeleteAccount";

export const dynamic = "force-dynamic";

// Settings (M-account).
//
// Deliberately small. The sidebar row for this has been inert since the shell was built, and
// the temptation with an empty settings page is to fill it — themes, notifications, a profile
// nobody looks at. What actually belongs here is the short list of things about a person that
// the product holds and they are entitled to change: who they are, whether their work may be
// used for training, and the ability to leave.
//
// Read on the server through the viewer's own client, so RLS is what decides whose account
// this is rather than a user id passed down from the page.
export default async function SettingsPage() {
  const user = await viewer();
  if (!user) redirect("/?mode=signin#sign-in");

  let account: AccountResponse | null = null;

  try {
    const supabase = await supabaseViewerClient();
    account = await getAccount(supabase);
  } catch {
    // A settings page that half-renders is worse than one that says it could not load: the
    // consent control would show "off" for someone whose consent is on.
    account = null;
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-4">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your account, and what PageCraft does with your work.
      </p>

      {account === null ? (
        <p className="mt-8 rounded-2xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
          We could not load your settings just now. Nothing has changed — please refresh the page.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 p-5">
            <p className="text-base font-semibold text-foreground">Account</p>

            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{account.email}</dd>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Verified</dt>
                <dd className={account.emailVerified ? "text-foreground" : "text-muted-foreground"}>
                  {account.emailVerified ? "Yes" : "Not yet — check your inbox"}
                </dd>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Joined</dt>
                <dd className="text-foreground">
                  {new Date(account.createdAt).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>

          <TrainingConsent initial={account.trainingOptIn} />

          <DeleteAccount />
        </div>
      )}
    </main>
  );
}
