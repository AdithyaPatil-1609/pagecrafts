"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { CreateProjectResponse, TemplateTier } from "@/lib/contracts";
import { apiPost } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

// "Use this design" (R3 D8).
//
// This is the seam R2 has been carrying since D4. The button used to link to
// /new?template=<slug>, a holding page, because a project's source_template_id is a foreign
// key into `templates` and a library slug is not a uuid. With the library seeded and a
// derived id to point at (see lib/templates/template-id.ts), the button can do the thing it
// says: make the person a site and put them in the editor.
//
// It stays a button rather than becoming a link, because forking is not navigation — it
// creates something, it can fail, and the person needs to see it working.

export function UseDesignButton({
    forkId,
    name,
    tier,
}: {
    forkId: string;
    name: string;
    tier: TemplateTier;
}) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fork = useCallback(async () => {
        setPending(true);
        setError(null);

        // The design's name is the site's opening name, not a placeholder like "Untitled".
        // It is the only name anybody has said out loud yet, and it is renameable.
        const { data, error: failure } = await apiPost<CreateProjectResponse>("/api/v1/projects", {
            name,
            sourceTemplateId: forkId,
        });

        if (failure || !data) {
            // Includes the paid case: a premium or signature design is paid for at this
            // point (Doc 22 P2/P3), and until payments land the route answers
            // payment_required, which friendlyMessage already puts into words.
            setError(failure ?? "The server replied with nothing at all.");
            setPending(false);
            return;
        }

        // No setPending(false) on the way out: the navigation is the end of this component's
        // life, and flipping the label back to "Use this design" mid-route makes it look as
        // though nothing happened.
        router.push(`/editor/${encodeURIComponent(data.id)}`);
    }, [forkId, name, router]);

    return (
        <div className="flex flex-col items-end gap-1.5">
            <Button variant="brand" size="lg" onClick={fork} disabled={pending}>
                {pending ? "Setting up your site…" : "Use this design"}
            </Button>
            {error && (
                <span role="alert" className="text-xs text-destructive">
                    {error}
                </span>
            )}
            {tier !== "free" && !error && (
                <span className="text-xs text-muted-foreground">
                    You will be asked to pay for this design once, before it is set up.
                </span>
            )}
        </div>
    );
}
