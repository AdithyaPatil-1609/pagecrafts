"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResendVerification({ email }: { email: string }) {
    const [state, setState] = useState<"idle" | "busy" | "sent">("idle");

    async function resend() {
        setState("busy");
        await fetch("/api/v1/auth/verify/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        }).catch(() => null);
        setState("sent");
    }

    return (
        <div aria-live="polite" className="mt-4">
            {state === "sent" ? (
                <p className="text-sm text-muted-foreground">Sent. Give it a minute, then check again.</p>
            ) : (
                <Button variant="outline" className="w-full" onClick={resend} disabled={state === "busy"}>
                    {state === "busy" ? "Sending…" : "Send it again"}
                </Button>
            )}
        </div>
    );
}