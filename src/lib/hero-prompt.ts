import { MAX_CLASSIFY_CHARS } from "@/lib/contracts";

/** Site ideas the prompt bar types on a loop — name, place, what they do. */
export const PROMPT_PHRASES = [
    "a bakery with ordering",
    "a clinic in Pune",
    "a gym",
    "a sweets shop in Indiranagar",
    "a yoga studio with class times",
] as const;

export type TypewriterPhase = "type" | "hold" | "delete";

export interface TypewriterState {
    index: number;
    length: number;
    phase: TypewriterPhase;
}

export const TYPEWRITER_MS = {
    type: 64,
    hold: 1300,
    delete: 42,
} as const;

export function initialTypewriter(): TypewriterState {
    return { index: 0, length: 0, phase: "type" };
}

export function currentPhrase(state: TypewriterState, phrases: readonly string[] = PROMPT_PHRASES): string {
    return phrases[state.index] ?? phrases[0] ?? "";
}

export function typedPrompt(state: TypewriterState, phrases: readonly string[] = PROMPT_PHRASES): string {
    return currentPhrase(state, phrases).slice(0, state.length);
}

export function typewriterDelay(state: TypewriterState): number {
    return TYPEWRITER_MS[state.phase];
}

export function stepTypewriter(
    state: TypewriterState,
    phrases: readonly string[] = PROMPT_PHRASES,
): TypewriterState {
    const phrase = currentPhrase(state, phrases);
    const count = phrases.length || 1;

    if (state.phase === "type") {
        if (state.length >= phrase.length) return { ...state, phase: "hold" };
        return { ...state, length: state.length + 1 };
    }

    if (state.phase === "hold") {
        return { ...state, phase: "delete" };
    }

    if (state.phase === "delete") {
        if (state.length <= 0) {
            return {
                index: (state.index + 1) % count,
                length: 0,
                phase: "type",
            };
        }
        return { ...state, length: state.length - 1 };
    }

    return { ...state, phase: "type" };
}

export function promptQuery(value: string, fallback: string, max = MAX_CLASSIFY_CHARS): string {
    return (value.trim() || fallback).slice(0, max);
}
