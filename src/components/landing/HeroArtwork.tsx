import type { TemplateSummary } from "@/lib/templates/query";
import { TemplatePreview } from "@/components/discovery/TemplatePreview";

const FRAMES = [
    {
        place: "left-[5%] top-[8%] h-[40%] w-[58%] rounded-2xl float-b",
        tone: "hero-shot",
    },
    {
        place: "right-[5%] top-[12%] h-[50%] w-[38%] rounded-2xl float-a",
        tone: "hero-shot-amber",
    },
    {
        place: "left-[7%] bottom-[8%] h-[34%] w-[34%] rounded-xl float-c",
        tone: "hero-shot",
    },
    {
        place: "left-[42%] bottom-[9%] h-[32%] w-[28%] rounded-xl",
        tone: "hero-shot-amber",
    },
    {
        place: "right-[6%] bottom-[8%] h-[28%] w-[30%] rounded-lg",
        tone: "hero-shot",
    },
] as const;

/**
 * Hero canvas: library designs that are not on the signed-in home face.
 * Presentational only — hidden from assistive tech.
 */
export function HeroArtwork({ templates }: { templates: TemplateSummary[] }) {
    return (
        <div aria-hidden className="hero-blueprint w-full max-w-2xl">
            {FRAMES.map((frame, index) => {
                const template = templates[index];
                if (!template) return null;
                return (
                    <span
                        key={template.id}
                        className={`absolute overflow-hidden ${frame.place} ${frame.tone}`}
                    >
                        <HeroFace template={template} />
                    </span>
                );
            })}
        </div>
    );
}

function HeroFace({ template }: { template: TemplateSummary }) {
    if (template.thumbnailUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={template.thumbnailUrl}
                alt=""
                width={640}
                height={400}
                className="absolute inset-0 size-full object-cover object-top"
            />
        );
    }

    return (
        <div className="absolute inset-0 [&_>div]:h-full [&_>div]:w-full [&_>div]:aspect-auto">
            <TemplatePreview preview={template.preview} priority />
        </div>
    );
}
