#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const STAGED = process.argv.includes("--staged");

const SKIP_DIRS = ["node_modules/", ".next/", "dist/", "coverage/", "supabase/.temp/"];

const SKIP_FILES = [
    "scripts/scan-secrets.mjs",
    "package-lock.json",
    ".env.example",
];

const SKIP_EXT = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".pdf", ".woff", ".woff2", ".ttf", ".zip", ".lock",
];

const PLACEHOLDER = /^(your|my|the|some|example|sample|placeholder|changeme|replace|dummy|fake|test|xxx+|\.\.\.|<)/i;

const PATTERNS = [
    { name: "Google / Gemini API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: "Groq API key", re: /\bgsk_[0-9A-Za-z]{40,}\b/ },
    { name: "Cerebras API key", re: /\bcsk-[0-9a-z]{40,}\b/ },
    { name: "GitHub token", re: /\b(?:gh[pousr]_[0-9A-Za-z]{36,}|github_pat_[0-9A-Za-z_]{40,})\b/ },
    { name: "Sentry auth token", re: /\bsntry[su]_[0-9A-Za-z_-]{40,}\b/ },
    { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
];

const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}\b/g;

const ASSIGNMENT =
    /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|SERVICE_ROLE)[A-Z0-9_]*)\s*[:=]\s*["']?([^\s"',;]{24,})["']?/g;

function tracked() {
    const args = STAGED
        ? ["diff", "--cached", "--name-only", "--diff-filter=ACM"]
        : ["ls-files"];

    return execFileSync("git", args, { encoding: "utf8" })
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function contents(path) {
    try {
        if (STAGED) {
            return execFileSync("git", ["show", `:${path}`], {
                encoding: "utf8",
                maxBuffer: 32 * 1024 * 1024,
            });
        }

        return readFileSync(path, "utf8");
    } catch {
        return "";
    }
}

function skip(path) {
    if (SKIP_FILES.includes(path)) return true;
    if (SKIP_DIRS.some((dir) => path.startsWith(dir))) return true;
    if (SKIP_EXT.some((ext) => path.toLowerCase().endsWith(ext))) return true;

    return false;
}

function serviceRoleJwt(text) {
    const hits = [];

    for (const match of text.matchAll(JWT)) {
        try {
            const payload = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));

            if (payload.role === "service_role") hits.push(match[0]);
        } catch {
            continue;
        }
    }

    return hits;
}

function looksLikeSecret(value) {
    if (PLACEHOLDER.test(value)) return false;
    if (/[()]/.test(value)) return false;
    if (value.includes("process.env")) return false;
    if (!/[0-9]/.test(value)) return false;
    if (!/[A-Za-z]/.test(value)) return false;
    if (/^\$\{?[A-Z_]+\}?$/.test(value)) return false;
    if (new Set(value).size < 8) return false;

    return true;
}

function lineOf(text, index) {
    return text.slice(0, index).split("\n").length;
}

function redact(value) {
    return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
}

const findings = [];

for (const path of tracked()) {
    if (skip(path)) continue;

    const text = contents(path);

    if (!text || text.includes("\u0000")) continue;

    for (const { name, re } of PATTERNS) {
        const match = re.exec(text);

        if (match) {
            findings.push({ path, line: lineOf(text, match.index), name, value: match[0] });
        }
    }

    for (const jwt of serviceRoleJwt(text)) {
        findings.push({
            path,
            line: lineOf(text, text.indexOf(jwt)),
            name: "Supabase service_role JWT",
            value: jwt,
        });
    }

    for (const match of text.matchAll(ASSIGNMENT)) {
        if (looksLikeSecret(match[2])) {
            findings.push({
                path,
                line: lineOf(text, match.index),
                name: `assigned to ${match[1]}`,
                value: match[2],
            });
        }
    }
}

if (findings.length === 0) {
    console.log(`secret scan: clean (${STAGED ? "staged changes" : "tracked files"})`);
    process.exit(0);
}

console.error("");
console.error("BLOCKED: something that looks like a live credential is in your changes.");
console.error("");

for (const finding of findings) {
    console.error(`  ${finding.path}:${finding.line}`);
    console.error(`    ${finding.name} -> ${redact(finding.value)}`);
}

console.error("");
console.error("Move it to .env.local (which is gitignored) and rotate the key -- once a");
console.error("secret has been committed, treat it as public even if you amend the commit.");
console.error("");

process.exit(1);
