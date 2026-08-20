import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";

import { SignInPrompt } from "@/components/deck/SignInPrompt";
import { SitesError } from "@/components/dashboard/SitesEmpty";
import { buttonVariants } from "@/components/ui/button";
import { CardIndex } from "@/components/ui/card-index";
import type { ProjectSummary } from "@/lib/contracts";

export function AssistantSlide({
    signedIn,
    sites,
}: {
    signedIn: boolean;
    sites: ProjectSummary[] | null;
}) {
    return (
        <aside
            id="assistant"
            className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start"
            aria-labelledby="assistant-heading"
        >
            <div className="glass-panel overflow-hidden rounded-3xl p-5 sm:p-6">
                <h2
                    id="assistant-heading"
                    data-reveal
                    className="text-2xl font-bold tracking-tight text-foreground"
                >
                    AI Assistant
                </h2>
                <p data-reveal className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    Describe a change in plain words. Nothing is applied until you keep it.
                </p>

                <div className="mt-6">
                    {!signedIn ? (
                        <SignInPrompt
                            compact
                            title="Sign in to talk about a site"
                            body="Pick a site, then ask for a change in plain words."
                        />
                    ) : sites === null ? (
                        <SitesError />
                    ) : sites.length === 0 ? (
                        <div
                            className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-8 text-center"
                            data-reveal
                        >
                            <p className="text-sm font-semibold text-foreground">
                                Nothing to work on yet
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Make a site first and the assistant will be here waiting.
                            </p>
                            <Link
                                href="/new"
                                className={buttonVariants({
                                    variant: "brand",
                                    className: "mt-5 rounded-xl font-semibold",
                                })}
                            >
                                <Plus aria-hidden />
                                Make your first site
                            </Link>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {sites.map((site, i) => (
                                <li key={site.id}>
                                    <Link
                                        href={`/editor/${site.id}?ask=1`}
                                        className="card-hover relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-background/30 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <CardIndex n={i + 1} compact />
                                        <MessageSquare
                                            className="relative z-[1] size-4 shrink-0 text-muted-foreground"
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                        <span className="relative z-[1] min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                            {site.name}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </aside>
    );
}
