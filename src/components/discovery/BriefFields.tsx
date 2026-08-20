"use client";

import {
    BRIEF_TONES,
    type BriefTone,
    type SiteBrief,
} from "@/lib/ai/generate/brief";
import { DictationButton } from "@/components/ui/DictationButton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TONE_LABEL: Record<BriefTone, string> = {
    simple: "Simple",
    warm: "Warm",
    bold: "Bold",
};

export function BriefFields({
    value,
    onChange,
    disabled,
}: {
    value: SiteBrief;
    onChange: (next: SiteBrief) => void;
    disabled?: boolean;
}) {
    const set = (patch: Partial<SiteBrief>) => onChange({ ...value, ...patch });

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
                A name, a place, and what they do. Type it, or tap the mic and talk —
                AI cannot invent a phone number you never gave.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Business name" htmlFor="brief-name">
                    <Input
                        id="brief-name"
                        inputSize="lg"
                        autoComplete="organization"
                        placeholder="Mithas Sweets"
                        value={value.name}
                        disabled={disabled}
                        onChange={(e) => set({ name: e.target.value })}
                    />
                </Field>
                <Field label="City or area" htmlFor="brief-place">
                    <Input
                        id="brief-place"
                        inputSize="lg"
                        placeholder="Old Delhi, Koramangala…"
                        value={value.place}
                        disabled={disabled}
                        onChange={(e) => set({ place: e.target.value })}
                    />
                </Field>
            </div>

            <Field
                label="What do they do?"
                htmlFor="brief-offer"
                hint="The shop, the clinic, the services — the more specific, the better the site."
            >
                <div className="relative">
                    <textarea
                        id="brief-offer"
                        rows={3}
                        value={value.offer}
                        disabled={disabled}
                        placeholder="Family dental clinic. Check-ups, root canals and braces."
                        className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-field px-4 py-3 pr-12 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => set({ offer: e.target.value })}
                    />
                    <DictationButton
                        disabled={disabled}
                        label="Speak what they do"
                        className="absolute right-2 top-2 size-8 rounded-md"
                        onTranscript={(spoken) =>
                            set({ offer: joinSpoken(value.offer, spoken) })
                        }
                    />
                </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone" htmlFor="brief-phone" optional>
                    <Input
                        id="brief-phone"
                        inputSize="lg"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Only if you want it on the site"
                        value={value.phone}
                        disabled={disabled}
                        onChange={(e) => set({ phone: e.target.value })}
                    />
                </Field>
                <Field label="Hours" htmlFor="brief-hours" optional>
                    <Input
                        id="brief-hours"
                        inputSize="lg"
                        placeholder="Open daily 10–8, Sundays too"
                        value={value.hours}
                        disabled={disabled}
                        onChange={(e) => set({ hours: e.target.value })}
                    />
                </Field>
            </div>

            <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-foreground">
                    How should it feel?{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                    {BRIEF_TONES.map((tone) => {
                        const on = value.tone === tone;
                        return (
                            <button
                                key={tone}
                                type="button"
                                disabled={disabled}
                                aria-pressed={on}
                                onClick={() => set({ tone: on ? "" : tone })}
                                className={cn(
                                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    on
                                        ? "border-primary bg-accent text-foreground"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                                )}
                            >
                                {TONE_LABEL[tone]}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <Field label="Anything else?" htmlFor="brief-extra" optional>
                <div className="relative">
                    <textarea
                        id="brief-extra"
                        rows={2}
                        value={value.extra}
                        disabled={disabled}
                        placeholder="WhatsApp orders, parking, a Hindi name on the page…"
                        className="flex min-h-16 w-full resize-y rounded-lg border border-input bg-field px-4 py-3 pr-12 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => set({ extra: e.target.value })}
                    />
                    <DictationButton
                        disabled={disabled}
                        label="Speak anything else"
                        className="absolute right-2 top-2 size-8 rounded-md"
                        onTranscript={(spoken) =>
                            set({ extra: joinSpoken(value.extra, spoken) })
                        }
                    />
                </div>
            </Field>
        </div>
    );
}

function Field({
    label,
    htmlFor,
    hint,
    optional,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    optional?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
                {label}
                {optional ? (
                    <span className="font-normal text-muted-foreground"> (optional)</span>
                ) : null}
            </label>
            {children}
            {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

function joinSpoken(current: string, spoken: string): string {
    const next = spoken.trim();
    if (!next) return current;
    if (!current.trim()) return next;
    return `${current.trim()} ${next}`;
}
