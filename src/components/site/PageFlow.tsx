"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SiteScene } from "@/components/site/SiteScene";

const SLIDE_ORDER = ["/", "/signin", "/new", "/templates", "/choose", "/sites", "/assistant", "/settings"];

function slideIndex(path: string): number {
    if (path.startsWith("/editor")) return -1;
    if (path.startsWith("/choose")) return SLIDE_ORDER.indexOf("/choose");
    const exact = SLIDE_ORDER.indexOf(path);
    return exact;
}

export function PageFlow({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const rootRef = useRef<HTMLDivElement>(null);
    const previous = useRef(pathname);
    const quiet = pathname.startsWith("/editor");
    const landing = pathname === "/";

    const dir = useMemo(() => {
        const from = slideIndex(previous.current);
        const to = slideIndex(pathname);
        if (from < 0 || to < 0 || from === to) return "in";
        return to > from ? "forward" : "back";
    }, [pathname]);

    useEffect(() => {
        previous.current = pathname;
    }, [pathname]);

    useEffect(() => {
        document.documentElement.classList.toggle("deck-snap", landing);
        return () => document.documentElement.classList.remove("deck-snap");
    }, [landing]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const nodes = () => Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !("IntersectionObserver" in window)) {
            nodes().forEach((el) => el.classList.add("is-in"));
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add("is-in");
                    io.unobserve(entry.target);
                }
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
        );

        nodes().forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [pathname]);

    return (
        <>
            <SiteAtmosphere quiet={quiet} />
            <SiteScene quiet={quiet} soft={!landing && !quiet} />
            <div aria-hidden className="site-frost" />
            <div
                key={pathname}
                ref={rootRef}
                data-dir={dir}
                className="page-flow relative z-[1] flex min-h-full flex-1 flex-col"
            >
                {children}
            </div>
        </>
    );
}

function SiteAtmosphere({ quiet }: { quiet: boolean }) {
    const glow = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (quiet) return;
        const el = glow.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (window.matchMedia("(pointer: coarse)").matches) {
            el.style.display = "none";
            return;
        }

        let x = -400;
        let y = -400;
        let cx = -400;
        let cy = -400;
        let raf = 0;

        const onMove = (e: MouseEvent) => {
            x = e.clientX - 140;
            y = e.clientY - 140;
        };
        const tick = () => {
            cx += (x - cx) * 0.12;
            cy += (y - cy) * 0.12;
            el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
            raf = requestAnimationFrame(tick);
        };

        window.addEventListener("mousemove", onMove, { passive: true });
        raf = requestAnimationFrame(tick);
        return () => {
            window.removeEventListener("mousemove", onMove);
            cancelAnimationFrame(raf);
        };
    }, [quiet]);

    return (
        <div aria-hidden className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", quiet && "opacity-40")}>
            <span className="site-blob bloom-blue -left-24 top-[-10%] size-[40rem]" />
            <span
                className="site-blob bloom-sky -right-16 top-[-8%] size-[34rem] opacity-90"
                style={{ animationDelay: "-6s" }}
            />
            <span
                className="site-blob bloom-amber -right-10 bottom-[-18%] size-[28rem] opacity-50"
                style={{ animationDelay: "-8s" }}
            />
            <span
                className="site-blob bloom-blue left-[38%] top-[48%] size-[20rem] opacity-40"
                style={{ animationDuration: "28s" }}
            />
            <LightRibbons />
            <div className="site-grid" />
            <div className="site-grain" />
            {!quiet && <div ref={glow} className="site-cursor hidden md:block" />}
        </div>
    );
}

function LightRibbons() {
    return (
        <svg
            className="site-ribbons"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
        >
            <defs>
                <linearGradient id="pc-ribbon-blue" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--bloom-blue)" stopOpacity="0" />
                    <stop offset="45%" stopColor="var(--bloom-blue)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="var(--bloom-sky)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pc-ribbon-amber" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bloom-amber)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--bloom-amber)" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="var(--mix-gold)" stopOpacity="0" />
                </linearGradient>
                <filter id="pc-ribbon-blur" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="7" />
                </filter>
            </defs>
            <g className="site-ribbon-drift" filter="url(#pc-ribbon-blur)">
                <path
                    d="M-120 210 C 260 40, 640 90, 980 250 S 1360 430, 1620 190"
                    stroke="url(#pc-ribbon-blue)"
                    strokeWidth="2.4"
                />
                <path
                    d="M-80 520 C 340 640, 740 480, 1120 660 S 1500 740, 1700 540"
                    stroke="url(#pc-ribbon-amber)"
                    strokeWidth="1.9"
                />
                <path
                    d="M 160 -50 C 460 200, 760 110, 1040 310 S 1340 70, 1540 230"
                    stroke="url(#pc-ribbon-blue)"
                    strokeWidth="1.5"
                    opacity="0.7"
                />
                <path
                    d="M-40 780 C 380 690, 780 840, 1180 710 S 1480 650, 1720 800"
                    stroke="url(#pc-ribbon-amber)"
                    strokeWidth="1.3"
                    opacity="0.55"
                />
            </g>
        </svg>
    );
}
