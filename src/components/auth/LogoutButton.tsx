"use client";

import { useState } from "react";

export function LogoutButton({ className }: { className?: string }) {
    const [busy, setBusy] = useState(false);

    async function leave() {
        if (busy) return;
        setBusy(true);

        try {
            const response = await fetch("/api/v1/auth/logout", { method: "POST" });
            if (!response.ok) throw new Error("refused");
            window.location.href = "/";
        } catch {
            setBusy(false);
        }
    }

    return (
        <button type="button" onClick={leave} disabled={busy} className={className}>
            {busy ? "Signing out…" : "Log out"}
        </button>
    );
}
