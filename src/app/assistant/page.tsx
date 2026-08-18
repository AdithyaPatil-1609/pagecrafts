import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";

import { viewer } from "@/lib/auth/session";
import { supabaseViewerClient } from "@/lib/auth/server";
import { listProjects } from "@/lib/data/projects";
import type { ProjectSummary } from "@/lib/contracts";
import { buttonVariants } from "@/components/ui/button";
import { SitesError } from "@/components/dashboard/SitesEmpty";

export const dynamic = "force-dynamic";

// AI Assistant — the way in.
//
// The assistant itself is not new and does not live here. It is ChatPanel, inside the editor,
// and every message it sends is "change this section of this project". That is why the sidebar
// row was inert: there was nothing for it to point at, because an assistant with no project in
// front of it has nothing to talk about.
//
// So this page does the one thing that was missing — it asks which site, and then gets out of
// the way. It holds no chat of its own, because a second chat that could not actually change
// anything would be worse than no row at all.
export default async function AssistantPage() {
  const user = await viewer();
  if (!user) redirect("/#sign-in");

  let sites: ProjectSummary[] | null = null;

  try {
    const supabase = await supabaseViewerClient();
    sites = await listProjects(supabase, user.id);
  } catch {
    sites = null;
  }

  // One site means the question has only one answer, and asking it would be a page whose
  // only purpose is to be clicked through. Straight to the editor with Ask already open.
  if (sites && sites.length === 1) redirect(`/editor/${sites[0].id}?ask=1`);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16 pt-4">
      <h1 className="text-2xl font-semibold text-foreground">AI Assistant</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        Describe a change in plain words and the assistant will suggest it. Nothing is applied
        until you keep it. Pick the site you want to work on.
      </p>

      <div className="mt-8">
        {sites === null ? (
          <SitesError />
        ) : sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
            <p className="text-base font-semibold text-foreground">Nothing to work on yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              The assistant changes a site you already have. Make one first and it will be here
              waiting.
            </p>

            <Link
              href="/new"
              className={buttonVariants({
                variant: "brand",
                className: "mt-6 rounded-xl font-semibold",
              })}
            >
              <Plus aria-hidden />
              Make your first site
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sites.map((site) => (
              <li key={site.id}>
                <Link
                  href={`/editor/${site.id}?ask=1`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {site.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">Ask for a change</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
