import { ResendVerification } from "@/components/auth/ResendVerification";
import { VerifyWatcher } from "@/components/auth/VerifyWatcher";

export default async function VerifyPage({
    searchParams,
}: {
    searchParams: Promise<{ email?: string }>;
}) {
    const { email } = await searchParams;

    return (
        <main className="flex flex-1 items-center justify-center px-6 py-16">
            <div data-reveal className="w-full max-w-sm rounded-2xl glass-panel p-6 text-center">
                <h1 className="text-lg font-semibold text-card-foreground">Confirm your email</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    We sent a confirmation link to{" "}
                    <span className="font-medium text-foreground">{email ?? "your email address"}</span>.
                    Tap it and you are ready to build.
                </p>
                {email && <ResendVerification email={email} />}
                <VerifyWatcher />
                <p className="mt-4 text-xs text-muted-foreground">
                    Nothing arrived? Check the spam folder before asking for another.
                </p>
            </div>
        </main>
    );
}