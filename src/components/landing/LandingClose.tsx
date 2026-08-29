import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function LandingClose() {
    return (
        <div data-reveal className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-ink">
                Ready when you are
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Tell us your business. We will build the site.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Just give us the name, the place, and what you do. Pick a look you like, and go
                live when you are happy with it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link
                    href="/new"
                    className={buttonVariants({
                        variant: "brand",
                        size: "xl",
                        className: "w-fit rounded-xl font-semibold",
                    })}
                >
                    Ask AI to build it
                    <ArrowRight aria-hidden />
                </Link>
                <Link
                    href="/templates"
                    className={buttonVariants({
                        variant: "outline-brand",
                        size: "xl",
                        className: "w-fit rounded-xl font-semibold",
                    })}
                >
                    Browse designs
                    <ArrowRight aria-hidden />
                </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
                PageCrafts — building is free. Going live on a PageCrafts address costs just Rs 199.
            </p>
        </div>
    );
}

