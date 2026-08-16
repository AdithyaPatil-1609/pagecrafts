import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// The copy audit, as a test (R2 D19, UI Spec §7.18).
//
// Two rules, both of which have already been broken in shipped code:
//
//   · No encoding damage. A mojibake sequence reached a live user-facing string at R3 D15,
//     and this sweep found worse — a regex named NUL that was matching U+FFFD, the
//     replacement character an editor leaves behind when it saves a byte it cannot decode.
//     It let a real NUL byte through the path validator for as long as it had existed.
//   · No technical words, and never "something went wrong". That phrase was in four
//     customer-facing strings; it names nothing and offers nothing, which is precisely what
//     §7.18 is written against.
//
// Run over the source rather than over a list of strings somebody maintains, because the
// point is to catch the next one — a copy rule nobody can break by accident is a copy rule.

const SURFACES = [
    "src/components",
    "src/app",
    "src/lib/api/messages.ts",
    "src/lib/auth/landing-errors.ts",
    "src/lib/deploy/failure.ts",
    "src/lib/discovery",
];

// The whole tree, for the encoding sweep — a mangled byte is a defect wherever it is, and
// a comment today is a user-facing string after somebody moves it.
const ALL = ["src", "supabase", "docs"];

function walk(target: string, out: string[] = []): string[] {
    let info;
    try {
        info = statSync(target);
    } catch {
        return out;
    }
    if (info.isFile()) {
        out.push(target.replace(/\\/g, "/"));
        return out;
    }
    for (const entry of readdirSync(target)) {
        walk(join(target, entry), out);
    }
    return out;
}

function sources(roots: string[], extensions: string[]): string[] {
    return roots
        .flatMap((root) => walk(join(process.cwd(), root)))
        .filter((f) => extensions.some((e) => f.endsWith(e)))
        .map((f) => f.slice(process.cwd().replace(/\\/g, "/").length + 1));
}

describe("no encoding damage anywhere in the source", () => {
    // Sequences that only occur when UTF-8 bytes were decoded as latin-1 or cp1252, plus
    // the replacement character itself and a stray byte-order mark.
    const DAMAGE: [RegExp, string][] = [
        [/�/, "U+FFFD replacement character — a byte the editor could not decode"],
        [/â€/, "â€ — a curly quote or dash mangled through latin-1"],
        [/Ã[ -¿]/, "Ã + high byte — an accented letter mangled through latin-1"],
        [/﻿/, "a byte-order mark loose in the file"],
    ];

    it("has none of the sequences that mean a file was saved in the wrong encoding", () => {
        const offenders: string[] = [];

        for (const file of sources(ALL, [".ts", ".tsx", ".sql", ".md", ".json", ".yaml"])) {
            const text = readFileSync(join(process.cwd(), file), "utf8");
            for (const [pattern, why] of DAMAGE) {
                const at = text.search(pattern);
                if (at === -1) continue;
                // This file names the sequences in order to look for them.
                if (file.endsWith("tests/unit/copy-audit.test.ts")) continue;
                offenders.push(`${file}:${text.slice(0, at).split("\n").length} — ${why}`);
            }
        }

        expect(offenders).toEqual([]);
    });

    it("catches the damage it is written for", () => {
        // The sweep has to be able to fail. The NUL regex it found was literally `/<U+FFFD>/`
        // in the source, and a pattern that misses that is decoration.
        const [replacement] = DAMAGE;
        expect("const NUL = /�/;").toMatch(replacement![0]);
        expect("const NUL = /\\0/;").not.toMatch(replacement![0]);
    });
});

describe("customer-facing copy says something (UI Spec §7.18)", () => {
    // Words that belong in a log, not on a screen. `error` and `failed` are deliberately
    // absent — "we could not save that" is fine and "the publish failed" is honest; what is
    // banned is the machinery leaking out.
    const JARGON = new RegExp(
        [
            "something went wrong",
            "oops",
            "whoops",
            "\\bnull\\b",
            "\\bundefined\\b",
            "\\bNaN\\b",
            "\\bJSON\\b",
            "\\bUUID\\b",
            "\\bendpoint\\b",
            "\\bpayload\\b",
            "\\bstack trace\\b",
            "\\bexception\\b",
            "\\bdatabase\\b",
            "\\bHTTP\\b",
            "\\b[45]\\d\\d error\\b",
        ].join("|"),
        "i",
    );

    /** Prose, as opposed to a class list, URL, import path or identifier. */
    function isProse(value: string): boolean {
        if (/^(https?:|\/|\.|@|#|data:|use )/.test(value)) return false;
        if (/^[a-z0-9:[\]\-/. ]+$/.test(value) && (value.match(/-/g) ?? []).length >= 2) return false;
        return value.includes(" ") && /[a-z]{3}/.test(value);
    }

    function withoutComments(text: string): string {
        return text
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "")
            .replace(/\s\/\/\s.*$/gm, "");
    }

    it("never uses a technical word in a string or a line of visible text", () => {
        const offenders: string[] = [];
        const literal = /(?<![\w$])(?:"([^"\\\n]{12,}?)"|'([^'\\\n]{12,}?)')/g;
        // Newlines allowed inside the text. An earlier version excluded them, and so missed
        // the copy in global-error.tsx — a paragraph wrapped over two lines, opening with
        // the exact phrase this test exists to ban. The one screen a person sees when
        // everything else has failed, and the audit walked straight past it.
        const jsxText = />\s*([A-Z][^<>{}]{14,}?)\s*</g;

        for (const file of sources(SURFACES, [".ts", ".tsx"])) {
            // Route handlers answer machines as well as people; their messages are checked
            // by the contract tests against the documented envelope.
            if (file.includes("/api/") || file.includes("/styleguide")) continue;

            const text = withoutComments(readFileSync(join(process.cwd(), file), "utf8"));

            for (const pattern of [literal, jsxText]) {
                pattern.lastIndex = 0;
                for (const match of text.matchAll(pattern)) {
                    const value = (match[1] ?? match[2] ?? "").trim();
                    if (!value || !isProse(value)) continue;
                    const hit = value.match(JARGON);
                    if (hit) offenders.push(`${file} — "${value.slice(0, 80)}" contains "${hit[0]}"`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    it("catches the phrase it is written for", () => {
        // Four customer-facing strings opened with this before D19.
        expect("Something went wrong on our side. Please try again.").toMatch(JARGON);
        expect("We could not finish that just now. Try again in a moment.").not.toMatch(JARGON);
    });
});
