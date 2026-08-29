'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Clock, ExternalLink, Loader2, Rocket } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/lib/editor-store';
import { previewSiteUrl } from '@/lib/publish/site-address';
import {
    pollDeployment,
    saveProjectSettings,
    startProjectPublish,
} from '@/lib/project-source';
import { apiGet, apiPost } from '@/lib/api/client';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { cn } from '@/lib/utils';

/** 5 minutes in seconds for the post-publish countdown. */
const PUBLISH_COUNTDOWN_SECONDS = 5 * 60;

type Phase =
    | 'idle'
    | 'address'
    | 'own_domain'
    | 'confirm_domain'
    | 'checking'
    | 'pay'
    | 'publishing'
    | 'success'
    | 'error';

const SITES_HREF = '/?slide=sites';

interface DomainSuggestion {
    name: string;
    available: boolean;
    priceInr: number;
    renewalInr: number;
    quoteExpiresAt: string;
}

export default function GoLiveButton({
    projectId,
    projectName,
    className,
}: {
    projectId: string;
    projectName: string | null;
    className?: string;
}) {
    const router = useRouter();
    const saveProject = useEditorStore((s) => s.saveProject);
    const flushPendingSave = useEditorStore((s) => s.flushPendingSave);
    const setProjectName = useEditorStore((s) => s.setProjectName);

    const [phase, setPhase] = useState<Phase>('idle');
    const [siteName, setSiteName] = useState('');
    const [liveUrl, setLiveUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<DomainSuggestion | null>(null);
    const [ownedDomain, setOwnedDomain] = useState('');
    const [countdown, setCountdown] = useState(0);
    const cancelledRef = useRef(false);

    const checkout = useRazorpayCheckout({
        onAlreadyGranted: () => {
            void finishAfterDomainPaid();
        },
        onSuccess: () => {
            void finishAfterDomainPaid();
        },
        onError: (message) => {
            setPhase('error');
            setError(message);
        },
        onDismiss: () => {
            setPhase('confirm_domain');
        },
    });

    // Keep finishAfterDomainPaid stable for checkout callbacks via ref pattern below.
    const suggestionRef = useRef<DomainSuggestion | null>(null);
    useEffect(() => {
        suggestionRef.current = suggestion;
    }, [suggestion]);

    async function finishAfterDomainPaid() {
        const chosen = suggestionRef.current;
        if (!chosen) {
            setPhase('success');
            return;
        }
        const list = await apiGet<{ items: Array<{ name: string; status: string }> }>(
            `/api/v1/projects/${encodeURIComponent(projectId)}/domains`,
        );
        const live = list.data?.items.find((d) => d.name === chosen.name && d.status === 'live');
        setLiveUrl(live ? `https://${live.name}` : `https://${chosen.name}`);
        setPhase('success');
    }

    function openPublish() {
        cancelledRef.current = false;
        setSiteName(projectName?.trim() || 'My site');
        setError(null);
        setSuggestion(null);
        setOwnedDomain('');
        setLiveUrl(null);
        setCountdown(0);
        setPhase('address');
    }

    function closeAll() {
        cancelledRef.current = true;
        setPhase('idle');
        setError(null);
        setLiveUrl(null);
        setSuggestion(null);
        setOwnedDomain('');
        setCountdown(0);
    }

    function goToYourSites() {
        closeAll();
        router.push(SITES_HREF);
    }

    function openLiveAndLeave() {
        if (liveUrl) {
            window.open(liveUrl, '_blank', 'noopener,noreferrer');
        }
        goToYourSites();
    }

    // Start countdown when success phase is entered
    const startCountdown = useCallback(() => {
        setCountdown(PUBLISH_COUNTDOWN_SECONDS);
    }, []);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    const countdownMinutes = Math.floor(countdown / 60);
    const countdownSeconds = countdown % 60;
    const countdownText = `${countdownMinutes}:${String(countdownSeconds).padStart(2, '0')}`;
    const countdownDone = phase === 'success' && countdown <= 0;

    function continueFromAddress(e?: FormEvent) {
        e?.preventDefault();
        const name = siteName.trim();
        if (!name) {
            setError('Give your site a name.');
            return;
        }
        setError(null);
        void publishSite(null);
    }

    async function loadSuggestion(name: string) {
        setPhase('checking');
        setError(null);
        const result = await apiGet<{
            suggestion: DomainSuggestion | null;
            message?: string;
        }>(`/api/v1/domains/suggest?name=${encodeURIComponent(name)}`);
        if (cancelledRef.current) return;
        if (result.error || !result.data?.suggestion) {
            setPhase('address');
            setError(
                result.data?.message ??
                    result.detail ??
                    result.error ??
                    'Could not suggest a domain. Try a shorter name, or publish on PageCrafts.',
            );
            return;
        }
        setSuggestion(result.data.suggestion);
        setPhase('confirm_domain');
    }

    async function acceptSuggestedDomain() {
        if (!suggestion?.available) {
            setError('That domain is not available. Try another site name.');
            return;
        }
        setError(null);
        await publishSite(suggestion.name);
    }

    async function startDomainPayment(domainName: string) {
        setPhase('pay');
        setError(null);
        await checkout.openDomainCheckout(projectId, domainName);
    }

    async function connectOwnedDomain() {
        const custom = ownedDomain.trim().toLowerCase();
        if (!custom) {
            setError('Enter the domain you already own, for example yourshop.in');
            return;
        }
        setError(null);
        await publishSite(null, { afterLive: async () => {
            setPhase('checking');
            const result = await apiPost<{
                applyUrl: string | null;
                providerName: string | null;
                pagesTarget: string;
                message?: string;
                domain?: { name: string; status: string };
            }>(`/api/v1/projects/${encodeURIComponent(projectId)}/domains/domain-connect`, {
                name: custom,
            });
            if (cancelledRef.current) return;
            if (result.error) {
                setPhase('error');
                setError(result.detail ?? result.error);
                return;
            }
            const applyUrl = result.data?.applyUrl;
            if (applyUrl) {
                window.location.assign(applyUrl);
                return;
            }
            setLiveUrl(`https://${custom}`);
            setPhase('success');
            setError(
                result.data?.message ??
                    'Publish worked. Finish DNS at your domain provider, or ask support to enable one-click connect.',
            );
        } });
    }

    async function publishSite(
        customDomain: string | null,
        options?: { afterLive?: () => Promise<void> },
    ) {
        const name = siteName.trim();
        if (!name) {
            setError('Give your site a name.');
            setPhase('address');
            return;
        }

        cancelledRef.current = false;
        setPhase('publishing');
        setError(null);

        flushPendingSave();
        await saveProject();
        if (cancelledRef.current) return;

        const { detail, error: nameError } = await saveProjectSettings(projectId, { name });
        if (cancelledRef.current) return;
        if (nameError) {
            setPhase('error');
            setError(
                /taken|already|exists/i.test(nameError)
                    ? 'That name is already taken. Choose another name.'
                    : nameError,
            );
            return;
        }
        if (detail?.name) setProjectName(detail.name);

        const idempotencyKey =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`;

        const { deploymentId, status, liveUrl, error: publishError } =
            await startProjectPublish(projectId, idempotencyKey);
        if (cancelledRef.current) return;
        if (publishError && !deploymentId) {
            setPhase('error');
            setError(publishError);
            return;
        }

        let resolvedLive = liveUrl;

        if (status === 'failed') {
            setPhase('error');
            setError(publishError ?? 'Publishing did not finish. Try again in a moment.');
            return;
        }

        if (!(status === 'live' && liveUrl) && deploymentId) {
            for (let attempt = 0; attempt < 30; attempt++) {
                if (cancelledRef.current) return;
                if (attempt > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 400));
                }
                const { deployment, error: pollError } = await pollDeployment(deploymentId);
                if (cancelledRef.current) return;
                if (pollError) {
                    setPhase('error');
                    setError(pollError);
                    return;
                }
                if (!deployment) continue;

                if (deployment.status === 'live' && deployment.liveUrl) {
                    resolvedLive = deployment.liveUrl;
                    break;
                }

                if (deployment.status === 'failed') {
                    setPhase('error');
                    setError(
                        deployment.error ??
                            'Publishing did not finish. Try again in a moment.',
                    );
                    return;
                }
            }
        }

        if (!resolvedLive && !customDomain && !options?.afterLive) {
            setPhase('error');
            setError('Publishing is taking longer than expected. Check Your sites in a minute.');
            return;
        }

        if (options?.afterLive) {
            setLiveUrl(resolvedLive ?? null);
            await options.afterLive();
            return;
        }

        if (customDomain) {
            setLiveUrl(resolvedLive);
            await startDomainPayment(customDomain);
            return;
        }

        setLiveUrl(resolvedLive ?? null);
        setPhase('success');
        startCountdown();
    }

    const busy =
        phase === 'publishing' ||
        phase === 'checking' ||
        phase === 'pay' ||
        checkout.status === 'loading' ||
        checkout.status === 'open' ||
        checkout.status === 'verifying';
    const preview = previewSiteUrl(siteName || projectName || 'My site');

    return (
        <>
            <button
                id="go-live-button"
                type="button"
                disabled={busy || phase === 'success'}
                onClick={openPublish}
                className={
                    className ??
                    'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40'
                }
            >
                {busy ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : phase === 'success' ? (
                    <Check aria-hidden className="size-4" />
                ) : (
                    <Rocket aria-hidden className="size-4" />
                )}
                {busy ? 'Publishing…' : phase === 'success' ? 'Live' : 'Go Live'}
            </button>

            {/* Warn phase removed — editing is free after publish */}

            <Dialog
                open={phase === 'address'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Where should your site live?</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            Get a free address on PageCrafts, or pick a custom domain.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={continueFromAddress} className="grid gap-3">
                        <label htmlFor="go-live-site-name" className="text-sm font-medium">
                            Site name
                        </label>
                        <Input
                            id="go-live-site-name"
                            inputSize="lg"
                            value={siteName}
                            autoFocus
                            placeholder="Kettle & Co."
                            onChange={(e) => {
                                setSiteName(e.target.value);
                                setError(null);
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Free address:{' '}
                            <span className="font-medium text-foreground">{preview}</span>
                        </p>
                        {error ? (
                            <p role="alert" className="text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 w-full cursor-pointer"
                            onClick={() => {
                                setError(null);
                                const name = siteName.trim();
                                if (!name) {
                                    setError('Give your site a name first.');
                                    return;
                                }
                                void loadSuggestion(name);
                            }}
                        >
                            Choose a Custom Domain
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 w-full cursor-pointer"
                            onClick={() => {
                                setError(null);
                                setOwnedDomain('');
                                setPhase('own_domain');
                            }}
                        >
                            I already have a domain
                        </Button>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 cursor-pointer"
                                onClick={closeAll}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                className="min-h-11 cursor-pointer"
                            >
                                Publish on PageCrafts
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'own_domain'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Use a domain you already own</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            Type your domain below. If your provider supports one-click setup,
                            we will send you there — no technical steps needed.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="grid gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void connectOwnedDomain();
                        }}
                    >
                        <label htmlFor="owned-domain" className="text-sm font-medium">
                            Your domain
                        </label>
                        <Input
                            id="owned-domain"
                            inputSize="lg"
                            value={ownedDomain}
                            autoFocus
                            placeholder="yourshop.in"
                            onChange={(e) => {
                                setOwnedDomain(e.target.value);
                                setError(null);
                            }}
                        />
                        {error ? (
                            <p role="alert" className="text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 cursor-pointer"
                                onClick={() => setPhase('address')}
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                className="min-h-11 cursor-pointer"
                            >
                                Continue — Authorize at provider
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'confirm_domain' || phase === 'checking'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {phase === 'checking' ? 'Finding a domain…' : 'Use this domain?'}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            {phase === 'checking'
                                ? 'Checking .in, .co.in and .com for a free name that matches your site.'
                                : 'We will check it is still free, take payment, then point DNS and put your site live on this name.'}
                        </DialogDescription>
                    </DialogHeader>
                    {phase === 'checking' ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 aria-hidden className="size-4 animate-spin" />
                            Looking up names…
                        </p>
                    ) : suggestion ? (
                        <div className="rounded-xl border border-border bg-muted px-3 py-3">
                            <p className="text-base font-semibold text-foreground">
                                {suggestion.name}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Available · Rs {suggestion.priceInr} first year · renews at Rs{' '}
                                {suggestion.renewalInr}
                            </p>
                        </div>
                    ) : null}
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 cursor-pointer"
                            disabled={phase === 'checking'}
                            onClick={() => setPhase('address')}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            variant="brand"
                            className="min-h-11 cursor-pointer"
                            disabled={phase === 'checking' || !suggestion?.available}
                            onClick={() => void acceptSuggestedDomain()}
                        >
                            Yes — pay and go live
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'pay'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Complete payment</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            Pay for {suggestion?.name ?? 'your domain'}. After payment we finish
                            DNS and open the site on that address.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        Opening checkout…
                    </p>
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 cursor-pointer"
                            onClick={closeAll}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'publishing'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Setting up your site</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            We are putting your site online. This takes about a minute.
                        </DialogDescription>
                    </DialogHeader>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        Working on {previewSiteUrl(siteName)}…
                    </p>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 cursor-pointer"
                            onClick={closeAll}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'success'}
                onOpenChange={(open) => {
                    if (!open && countdownDone) goToYourSites();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {countdownDone ? 'Your site is live!' : 'Your site is getting ready'}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            {countdownDone
                                ? `${siteName.trim()} is live${suggestion ? ` on ${suggestion.name}` : ' on PageCrafts'}. You can edit it anytime.`
                                : `${siteName.trim()} is being set up${suggestion ? ` on ${suggestion.name}` : ' on PageCrafts'}. It takes about 5 minutes.`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* 5-minute countdown stopwatch */}
                    {!countdownDone ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="relative flex size-28 items-center justify-center">
                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112">
                                    <circle
                                        cx="56" cy="56" r="50"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-border"
                                    />
                                    <circle
                                        cx="56" cy="56" r="50"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        className="text-primary transition-all duration-1000"
                                        strokeDasharray={2 * Math.PI * 50}
                                        strokeDashoffset={
                                            2 * Math.PI * 50 * (countdown / PUBLISH_COUNTDOWN_SECONDS)
                                        }
                                    />
                                </svg>
                                <div className="z-[1] flex flex-col items-center">
                                    <Clock className="mb-1 size-4 text-primary" aria-hidden />
                                    <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                                        {countdownText}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your site will be ready to open in {countdownText}
                            </p>
                        </div>
                    ) : null}

                    {liveUrl && countdownDone ? (
                        <button
                            type="button"
                            onClick={openLiveAndLeave}
                            className={cn(
                                'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-gold bg-gold px-4',
                                'text-sm font-semibold text-gold-foreground hover:opacity-90',
                            )}
                        >
                            Open {liveUrl.replace(/^https:\/\//, '')}
                            <ExternalLink aria-hidden className="size-4" />
                        </button>
                    ) : liveUrl ? (
                        <button
                            type="button"
                            disabled
                            className={cn(
                                'inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-muted px-4',
                                'cursor-not-allowed text-sm font-semibold text-muted-foreground opacity-60',
                            )}
                        >
                            <Clock aria-hidden className="size-4" />
                            Opens in {countdownText}
                        </button>
                    ) : null}
                    <DialogFooter className="pt-2">
                        {countdownDone ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 cursor-pointer"
                                    onClick={goToYourSites}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="button"
                                    variant="brand"
                                    className="min-h-11 cursor-pointer"
                                    onClick={goToYourSites}
                                >
                                    Your sites
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 cursor-pointer"
                                onClick={closeAll}
                            >
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={phase === 'error'}
                onOpenChange={(open) => {
                    if (!open) closeAll();
                }}
            >
                <DialogContent className="border-border/70 bg-card/90 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Publishing did not finish</DialogTitle>
                    </DialogHeader>
                    {error ? (
                        <p
                            role="alert"
                            className="flex items-start gap-2 text-sm text-destructive"
                        >
                            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                            {error}
                        </p>
                    ) : null}
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 cursor-pointer"
                            onClick={closeAll}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            variant="brand"
                            className="min-h-11 cursor-pointer"
                            onClick={openPublish}
                        >
                            Try again
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {checkout.confirmDialog}
        </>
    );
}
