"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRM = "delete my account";

// Closing an account (M-account, C-12).
//
// Irreversible, so the confirmation is deliberately awkward: the person types the words. A
// second button is something you can click by accident twice; a sentence is not.
//
// What it says it will remove is what it removes. Sites, files, version history and publish
// records all cascade from the account row. A published site does not: it is theirs, on
// hosting they were given, and closing an account is not a request to take a website off the
// internet. Saying so here is the difference between a promise kept and a nasty surprise.
export function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [state, setState] = useState<"idle" | "deleting" | "failed">("idle");

    const armed = typed.trim().toLowerCase() === CONFIRM;

    async function remove() {
        setState("deleting");

        try {
            const response = await fetch("/api/v1/account", { method: "DELETE" });
            if (!response.ok) throw new Error("refused");

            // A full navigation, not a router push: the session this page was rendered with
            // no longer refers to anything, and every cached server component belongs to a
            // user who has just stopped existing.
            window.location.href = "/";
        } catch {
            setState("failed");
        }
    }

    return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-base font-semibold text-foreground">Delete your account</p>

            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                This removes your account, every site you have made, their files and their version
                history. It cannot be undone.{" "}
                <span className="text-foreground">
                    Sites you have already published stay online — they are yours.
                </span>
            </p>

            {!open ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-lg font-medium text-destructive"
                    onClick={() => setOpen(true)}
                >
                    Delete my account
                </Button>
            ) : (
                <div className="mt-4">
                    <label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
                        Type <span className="font-semibold text-foreground">{CONFIRM}</span> to
                        confirm.
                    </label>

                    <Input
                        id="confirm-delete"
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        autoComplete="off"
                        className="mt-2 max-w-sm"
                        placeholder={CONFIRM}
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg font-medium text-destructive"
                            disabled={!armed || state === "deleting"}
                            onClick={remove}
                        >
                            {state === "deleting" ? "Deleting…" : "Delete everything"}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg font-medium"
                            onClick={() => {
                                setOpen(false);
                                setTyped("");
                                setState("idle");
                            }}
                        >
                            Keep my account
                        </Button>

                        <p aria-live="polite" className="text-xs text-muted-foreground">
                            {state === "failed"
                                ? "That did not work. Your account is still here."
                                : null}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
