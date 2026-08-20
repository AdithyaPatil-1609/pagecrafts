const FALLBACK = "/";

export function safeNext(value: string | null | undefined): string {
    if (!value) return FALLBACK;
    if (!value.startsWith("/")) return FALLBACK;
    if (value.startsWith("//")) return FALLBACK;
    if (value.includes("\\")) return FALLBACK;

    return value;
}
