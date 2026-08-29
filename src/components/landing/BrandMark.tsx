import { cn } from "@/lib/utils";

export const BRAND_LOCKUP_SRC = "/brand/pagecrafts-lockup.png";
export const BRAND_NAME = "PageCrafts";

/** Official PageCrafts lockup: PC monogram, wordmark, and tagline. */
export function BrandMark({
    className,
    size = "header",
}: {
    className?: string;
    size?: "header" | "sidebar";
}) {
    return (
        <span className={cn("inline-flex items-center", className)}>
            {/* Native img so the lockup works in every shell without extra layout wrappers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={BRAND_LOCKUP_SRC}
                alt={BRAND_NAME}
                width={496}
                height={161}
                className={cn(
                    // The lockup is gold; every other pixel on a cinematic
                    // screen is monochrome. Desaturating in CSS keeps the
                    // official asset intact while letting it sit in the
                    // palette instead of fighting it.
                    "w-auto max-w-none bg-transparent object-contain object-left",
                    "[filter:grayscale(1)_brightness(1.7)_contrast(0.95)]",
                    size === "sidebar" ? "h-14" : "h-11",
                )}
            />
        </span>
    );
}
