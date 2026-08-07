import type { Template } from "@/lib/contracts";
import { previewOf } from "@/lib/discovery/preview";
import type { PreviewPalette } from "@/lib/discovery/preview";

// A miniature of the design, drawn from the template's own hero copy and stylesheet
// palette (see lib/discovery/preview.ts). Static — never a live iframe (D-3, AC-F3-2) —
// and hidden from assistive tech: the tile's real name, category, price and description
// are in the card around it, at a readable size.

function Block({
    color,
    opacity,
    className,
}: {
    color: string;
    opacity?: number;
    className?: string;
}) {
    return <span className={className} style={{ backgroundColor: color, opacity }} />;
}

function MiniNav({ palette }: { palette: PreviewPalette }) {
    return (
        <div className="flex items-center justify-between px-3 pt-2.5">
            <Block color={palette.ink} opacity={0.85} className="h-1 w-6 rounded-full" />
            <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                    <Block key={i} color={palette.muted} opacity={0.55} className="h-1 w-4 rounded-full" />
                ))}
            </div>
        </div>
    );
}

export function TemplatePreview({ template }: { template: Template }) {
    const { headline, subhead, palette, shape } = previewOf(template);

    const headlineStyle = { color: palette.ink };
    const subheadStyle = { color: palette.muted };

    return (
        <div
            aria-hidden
            className="flex aspect-2/1 w-full flex-col overflow-hidden"
            style={{ backgroundColor: palette.bg }}
        >
            <MiniNav palette={palette} />

            {shape === "split" && (
                <div className="flex flex-1 items-center gap-3 px-3 pb-3 pt-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <p
                            className="line-clamp-3 text-[13px] font-semibold leading-[1.15] tracking-tight"
                            style={headlineStyle}
                        >
                            {headline}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[8px] leading-[1.3]" style={subheadStyle}>
                            {subhead}
                        </p>
                        <Block color={palette.accent} className="mt-2 h-2.5 w-11 rounded-[3px]" />
                    </div>
                    <div className="flex h-full w-2/5 shrink-0 flex-col gap-1.5 py-1">
                        <Block color={palette.accent} opacity={0.75} className="flex-1 rounded-md" />
                        <Block color={palette.muted} opacity={0.3} className="h-1/3 rounded-md" />
                    </div>
                </div>
            )}

            {shape === "gallery" && (
                <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                    <p
                        className="line-clamp-1 text-[12px] font-semibold leading-tight tracking-tight"
                        style={headlineStyle}
                    >
                        {headline}
                    </p>
                    <div className="mt-2 grid flex-1 grid-cols-4 gap-1.5">
                        {[0.8, 0.45, 0.65, 0.3].map((opacity, i) => (
                            <Block
                                key={i}
                                color={i % 2 === 0 ? palette.accent : palette.muted}
                                opacity={opacity}
                                className="rounded-md"
                            />
                        ))}
                    </div>
                </div>
            )}

            {shape === "editorial" && (
                <div className="flex flex-1 flex-col items-center px-5 pb-3 pt-3 text-center">
                    <p
                        className="line-clamp-2 text-[13px] font-semibold leading-[1.15] tracking-tight"
                        style={headlineStyle}
                    >
                        {headline}
                    </p>
                    <Block color={palette.muted} opacity={0.4} className="mt-2 h-px w-full" />
                    <div className="mt-2.5 flex w-full flex-1 gap-4">
                        {[0, 1].map((column) => (
                            <div key={column} className="flex flex-1 flex-col gap-1">
                                {["w-full", "w-11/12", "w-3/4"].map((width) => (
                                    <Block
                                        key={width}
                                        color={palette.muted}
                                        opacity={0.45}
                                        className={`h-1 rounded-full ${width}`}
                                    />
                                ))}
                                <Block color={palette.accent} opacity={0.7} className="mt-1 h-1 w-1/2 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
