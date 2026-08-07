"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/auth/PasswordField";
import { credentialsSchema, MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { signUpFormSchema, passwordResetRequestSchema } from "@/lib/contracts/auth";
import type { ApiResult, ErrorCode } from "@/lib/contracts";

// Supabase returns a session immediately when "Confirm email" is off, and no session
// with pending:true when it is on. The signup route passes that through, so the UI
// sends the user to the right next screen either way.
interface SignUpData {
    user: { id: string; email: string } | null;
    pending: boolean;
}

type Mode = "signup" | "signin" | "forgot";

// Plain-language copy for every failure this screen can reach (N-4, FR-002).
// A user never sees an ErrorCode; they see a sentence and a way forward.
const MESSAGES: Partial<Record<ErrorCode, string>> = {
    validation_failed: "Check the details above and try again.",
    unauthorized: "That email and password do not match. Try again, or reset your password.",
    rate_limited: "Too many attempts. Wait a few minutes and try again.",
    internal: "Something went wrong on our side. Please try again.",
};
const FIELD_MESSAGES: Record<string, string> = {
    email: "Enter a valid email address.",
    password: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    confirmPassword: "Both passwords need to match.",
};
const COPY: Record<Mode, { title: string; blurb: string; action: string }> = {
    signup: {
        title: "Create your account",
        blurb: "Building and editing are free. You only pay when you go live.",
        action: "Create account",
    },
    signin: {
        title: "Welcome back",
        blurb: "Sign in to pick up where you left off.",
        action: "Sign in",
    },
    forgot: {
        title: "Reset your password",
        blurb: "Tell us your email and we will send you a link to set a new password.",
        action: "Send reset link",
    },
};

export function AuthCard({ initialMode = "signup" }: { initialMode?: Mode }) {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    function switchTo(next: Mode) {
        setMode(next);
        setError(null);
        setSent(false);
        setPassword("");
        setConfirmPassword("");
    }

    async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
        const response = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return (await response.json()) as ApiResult<T>;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (mode === "forgot") {
            const parsed = passwordResetRequestSchema.safeParse({ email });
            if (!parsed.success) {
                setError("Enter a valid email address.");
                return;
            }
            setBusy(true);
            const result = await post<unknown>("/api/v1/auth/password/reset", parsed.data).catch(() => null);
            setBusy(false);
            if (result === null) setError(MESSAGES.internal!);
            else setSent(true);
            return;
        }

        if (mode === "signup") {
            const parsed = signUpFormSchema.safeParse({ email, password, confirmPassword });
            if (!parsed.success) {
                const issue = parsed.error.issues[0];
                setError(FIELD_MESSAGES[String(issue?.path[0] ?? "")] ?? MESSAGES.validation_failed!);
                return;
            }
            setBusy(true);
            const result = await post<SignUpData>("/api/v1/auth/signup", {
                email: parsed.data.email,
                password: parsed.data.password,
            }).catch(() => null);
            setBusy(false);

            if (result === null) { setError(MESSAGES.internal!); return; }
            if (!result.ok) { setError(MESSAGES[result.error.code] ?? MESSAGES.internal!); return; }
            router.push(
                result.data.pending
                    ? `/verify?email=${encodeURIComponent(parsed.data.email)}`
                    : "/new",
            );
            return;
        }

        const parsed = credentialsSchema.safeParse({ email, password });
        if (!parsed.success) {
            setError("Enter your email and password.");
            return;
        }
        setBusy(true);
        const result = await post<unknown>("/api/v1/auth/login", parsed.data).catch(() => null);
        setBusy(false);

        if (result === null) { setError(MESSAGES.internal!); return; }
        if (!result.ok) { setError(MESSAGES[result.error.code] ?? MESSAGES.internal!); return; }
        router.push("/new");
    }

    if (mode === "forgot" && sent) {
        return (
            <div id="sign-in" className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center" aria-live="polite">
                <h2 className="text-lg font-semibold text-card-foreground">Check your email</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    If there is an account for <span className="font-medium text-foreground">{email}</span>,
                    we have sent a link to set a new password. It lasts one hour.
                </p>
                <button type="button" onClick={() => switchTo("signin")} className="mt-4 text-sm font-medium text-primary underline underline-offset-4">
                    Back to sign in
                </button>
            </div>
        );
    }

    const copy = COPY[mode];

    return (
        <form id="sign-in" onSubmit={handleSubmit} noValidate className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.blurb}</p>

            <label htmlFor="email" className="mt-5 block text-sm font-medium text-foreground">Email</label>
            <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "auth-error" : undefined}
                className="mt-1.5"
                required
            />

            {mode !== "forgot" && (
                <PasswordField
                    id="password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    describedBy={mode === "signup" ? "password-hint" : undefined}
                    invalid={Boolean(error)}
                />
            )}

            {mode === "signup" && (
                <>
                    <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
                        At least {MIN_PASSWORD_LENGTH} characters. A short phrase you will remember works well.
                    </p>
                    <PasswordField
                        id="confirmPassword"
                        label="Confirm password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                        invalid={Boolean(error)}
                    />
                </>
            )}

            <div aria-live="polite">
                {error && <p id="auth-error" className="mt-3 text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="mt-5 w-full" disabled={busy}>
                {busy ? "Just a moment…" : copy.action}
            </Button>

            <div className="mt-4 flex flex-col items-center gap-1 text-xs text-muted-foreground">
                {mode === "signin" && (
                    <>
                        <button type="button" onClick={() => switchTo("forgot")} className="font-medium text-primary underline underline-offset-4">
                            Forgot your password?
                        </button>
                        <span>
                            New here?{" "}
                            <button type="button" onClick={() => switchTo("signup")} className="font-medium text-primary underline underline-offset-4">
                                Create an account
                            </button>
                        </span>
                    </>
                )}
                {mode === "signup" && (
                    <span>
                        Already have an account?{" "}
                        <button type="button" onClick={() => switchTo("signin")} className="font-medium text-primary underline underline-offset-4">
                            Sign in
                        </button>
                    </span>
                )}
                {mode === "forgot" && (
                    <button type="button" onClick={() => switchTo("signin")} className="font-medium text-primary underline underline-offset-4">
                        Back to sign in
                    </button>
                )}
            </div>
        </form>
    );
}
