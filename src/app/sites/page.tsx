import { redirect } from "next/navigation";

import { viewer } from "@/lib/auth/session";
import { supabaseViewerClient } from "@/lib/auth/server";
import { listProjects } from "@/lib/data/projects";
import type { ProjectSummary } from "@/lib/contracts";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { SitesEmpty, SitesError } from "@/components/dashboard/SitesEmpty";

export const dynamic = "force-dynamic";

// Your sites — the dashboard (V-7).
//
// Signing in used to land nowhere: the sidebar row for this was inert because the page did
// not exist, so a person with three sites had no way to reach the second one. Everything it
// needs was already built — listProjects has returned name, status, live URL, failure and
// last-edited since D2, and nothing had ever read it.
//
// Rendered on the server through the viewer's own client, so RLS decides what is here. That
// is not belt-and-braces: it means this page cannot leak somebody else's site even if the
// user id were wrong, because the database would return nothing for it.
//
// force-dynamic because a publish changes what this says. A cached dashboard would tell
// someone their site is still publishing minutes after it went live.
export default async function SitesPage() {
  // viewer(), not currentUser(): this is a server component, and the route client writes
  // refreshed session cookies — which a render is not allowed to do.
  const user = await viewer();

  // Not an error — just not signed in. Sent to the door rather than shown an empty page
  // that looks like their sites have vanished.
  if (!user) redirect("/#sign-in");

  let sites: ProjectSummary[] | null = null;

  try {
    const supabase = await supabaseViewerClient();
    sites = await listProjects(supabase, user.id);
  } catch {
    // The read failed, which is different from having no sites, and the two must not look
    // alike. Someone whose dashboard is briefly unreadable should not be told they have
    // nothing.
    sites = null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Your sites</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {sites && sites.length > 0
              ? "Pick one up where you left it, or start something new."
              : "Everything you make lives here."}
          </p>
        </div>

        {sites && sites.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {sites.length} site{sites.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        {sites === null ? (
          <SitesError />
        ) : sites.length === 0 ? (
          <SitesEmpty />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
