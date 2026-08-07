import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroArtwork } from "@/components/landing/HeroArtwork";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
    return (
        <section className="flex flex-col">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Build your business{" "}
                {/* The reference break, but only where the line actually fits. */}
                <br className="hidden lg:inline" />
                website in <span className="brand-text">minutes</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                Pick a ready-made design, make it yours with a few clicks, and go live.
                Your site, your name — no developer required.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                    href="#sign-in"
                    className={buttonVariants({
                        variant: "brand",
                        size: "xl",
                        className: "rounded-xl font-semibold",
                    })}
                >
                    Start building — it&apos;s free
                    <ArrowRight aria-hidden />
                </a>
                <Link
                    href="/templates"
                    className={buttonVariants({
                        variant: "outline-brand",
                        size: "xl",
                        className: "rounded-xl font-semibold",
                    })}
                >
                    Browse templates
                </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
                Building and editing are free. You pay Rs 249 only when you go live.
            </p>

            <HeroArtwork />
        </section>
    );
}
