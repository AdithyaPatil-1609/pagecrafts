"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyMessage } from "@/lib/api/messages";
import type { ApiResult } from "@/lib/contracts";

const CONFIRM = "delete my account";

// Closing an account (M-account, C-12).
//
// Irreversible, so the confirmation is deliberately awkward: the person types the words, and
// then proves it is them. Typing guards against an accident; the password guards against
// somebody else at an unlocked laptop. Accounts created through Google have no password, so
// the field is optional here and the route decides — it knows which identities exist.
//
// What it says it will remove is what it removes. Sites, files, version history and every
// paid unlock cascade from the account row. A published site does not: it is theirs, on
// hosting they were given, and closing an account is not a request to take a website off the
// internet. Saying so here is the difference between a promise kept and a nasty surprise.
export function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [password, setPassword] = useState("");
    const [state, setState] = useState<"idle" | "deleting" | "failed">("idle");
    const [problem, setProblem] = useState<string | null>(null);

    const armed = typed.trim().toLowerCase() === CONFIRM;

    function close() {
        setOpen(false);
        setTyped("");
        setPassword("");
        setState("idle");
        setProblem(null);
    }

    async function remove() {
        setState("deleting");
        setProblem(null);

        try {
            const response = await fetch("/api/v1/account", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as ApiResult<unknown> | null;
                const said =
                    body && "ok" in body && !body.ok
                        ? friendlyMessage(body.error.code, body.error.message)
                        : "That did not work. Your account is still here.";

                setProblem(said);
                setState("failed");
                return;
            }

            // A full navigation, not a router push: the session this page was rendered with
            // no longer refers to anything, and every cached server component belongs to a
            // user who has just stopped existing.
            window.location.href = "/";
        } catch {
            setProblem("We could not reach PageCrafts. Your account is still here.");
            setState("failed");
        }
    }

    return (
        <div className="rounded-2xl border-2 border-destructive/60 bg-destructive/10 p-5">
            <p className="text-base font-semibold text-destructive">Delete your account</p>

            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                This cannot be undone.{" "}
                <span className="text-foreground">
                    Sites you have already published stay online — they are yours.
                </span>
            </p>

            {!open ? (
                <Button
                    variant="destructive"
                    size="sm"
                    className="mt-4 rounded-lg font-semibold"
                    onClick={() => setOpen(true)}
                >
                    Delete my account
                </Button>
            ) : (
                <div
                    role="alertdialog"
                    aria-labelledby="delete-heading"
                    className="mt-4 rounded-xl border-2 border-destructive bg-background p-4"
                >
                    <p
                        id="delete-heading"
                        className="flex items-center gap-2 text-base font-bold text-destructive"
                    >
                        <AlertTriangle className="size-5 shrink-0" aria-hidden />
                        Are you sure? This cannot be undone.
                    </p>

                    <p className="mt-3 text-sm font-medium text-foreground">
                        Deleting your account permanently destroys:
                    </p>

                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>
                            <span className="font-semibold text-destructive">
                                Every design you have paid for.
                            </span>{" "}
                            Paid designs and unlocks are tied to this account. They are not
                            refunded and they cannot be moved to another account.
                        </li>
                        <li>Your plan, and any time remaining on it.</li>
                        <li>Every site you have made, with its files and version history.</li>
                    </ul>

                    <label
                        htmlFor="confirm-delete"
                        className="mt-4 block text-sm text-muted-foreground"
                    >
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

                    <label
                        htmlFor="delete-password"
                        className="mt-4 block text-sm text-muted-foreground"
                    >
                        Enter your password.{" "}
                        <span className="text-xs">
                            Leave blank if you only ever signed in with Google.
                        </span>
                    </label>

                    <Input
                        id="delete-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        className="mt-2 max-w-sm"
                    />

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Button
                            size="sm"
                            className="rounded-lg font-medium"
                            onClick={close}
                        >
                            Keep my account
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg font-semibold"
                            disabled={!armed || state === "deleting"}
                            onClick={remove}
                        >
                            {state === "deleting" ? "Deleting…" : "Delete everything"}
                        </Button>
                    </div>

                    <p aria-live="polite" className="mt-3 text-sm text-destructive">
                        {state === "failed" ? problem : null}
                    </p>
                </div>
            )}
        </div>
    );
}
