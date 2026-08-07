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

            {mode !== "forgot" && (
                <>
                    <div className="mt-5 flex items-center gap-3" aria-hidden="true">
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <span className="h-px flex-1 bg-border" />
                    </div>

                    <a
                        href="/api/v1/auth/google"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.57Z" />
                            <path fill="#34A853" d="M12 23.5c3.1 0 5.71-1.03 7.62-2.78l-3.72-2.9c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.540-2.02-6.45-4.74H1.7v2.99A11.5 11.5 0 0 0 12 23.5Z" />
                            <path fill="#FBBC05" d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.83H1.7a11.5 11.5 0 0 0 0 10.34l3.85-3Z" />
                            <path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.29C17.7 1.26 15.1.5 12 .5A11.5 11.5 0 0 0 1.7 6.83l3.85 2.99C6.46 7.1 9 4.75 12 4.75Z" />
                        </svg>
                        Continue with Google
                    </a>
                </>
            )}

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
