"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { CreateProjectResponse } from "@/lib/contracts";
import { apiPost } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

// Edit this design (R3 D8).
//
// Forking is not navigation — it creates a project from the chosen catalogue row and
// opens the editor on that copy. Listed price stays on the tile; it is not a plan
// picker and it does not block editing.

export function UseDesignButton({
    forkId,
    name,
}: {
    forkId: string;
    name: string;
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
            setError(failure ?? "The server replied with nothing at all.");
            setPending(false);
            return;
        }

        // No setPending(false) on the way out: the navigation is the end of this component's
        // life, and flipping the label back to "Edit" mid-route makes it look as
        // though nothing happened.
        router.push(`/editor/${encodeURIComponent(data.id)}`);
    }, [forkId, name, router]);

    return (
        <div className="flex flex-col items-end gap-1.5">
            <Button variant="brand" size="lg" onClick={fork} disabled={pending}>
                {pending ? "Opening editor…" : "Edit"}
            </Button>
            {error && (
                <span role="alert" className="text-xs text-destructive">
                    {error}
                </span>
            )}
        </div>
    );
}
