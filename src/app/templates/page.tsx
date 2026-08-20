import Link from "next/link";

import { TemplatesSlide } from "@/components/deck/TemplatesSlide";

type Params = Record<string, string | string[] | undefined>;

export default async function TemplatesPage({
    searchParams,
}: {
    searchParams: Promise<Params>;
}) {
    const params = await searchParams;

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-8">
            <Link
                href="/#build"
                className="w-fit rounded-md font-mono text-[11px] uppercase tracking-[0.22em] text-bloom-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                ← Back to Build
            </Link>
            <TemplatesSlide params={params} />
        </main>
    );
}
