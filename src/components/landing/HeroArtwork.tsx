/**
 * Decorative hero: a glowing layout assembling itself.
 * Presentational only — hidden from assistive tech.
 */

export function HeroArtwork() {
    return (
        <div aria-hidden className="hero-blueprint w-full max-w-2xl">
            <span className="hero-pane absolute left-[8%] top-[12%] h-[28%] w-[52%] rounded-2xl float-b" />
            <span className="hero-pane-amber absolute right-[10%] top-[18%] h-[42%] w-[28%] rounded-2xl float-a" />
            <span className="hero-pane absolute bottom-[14%] left-[10%] h-[22%] w-[30%] rounded-xl float-c" />
            <span className="hero-pane-amber absolute bottom-[16%] left-[44%] h-[20%] w-[22%] rounded-xl" />
            <span className="hero-pane absolute bottom-[18%] right-[12%] h-[16%] w-[24%] rounded-lg" />
        </div>
    );
}
