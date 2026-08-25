import 'server-only';
import { extname } from 'node:path';
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { PublishFile } from '@/lib/contracts/deploy';
import { deployConfig } from '../config';
import { readDeployCredential, redact } from '../credentials';
import { HostingError } from './hosting-error';
import { accountPath } from './cloudflare-client';

/**
 * Cloudflare Pages Direct Upload — same flow wrangler uses, without shelling out.
 *
 * Vercel serverless never ships a complete wrangler tree (NFT traces the bin entry and
 * drops wrangler-dist/cli.js), so `execFile(wrangler…)` fails after auth succeeds.
 * Hitting the Pages asset + deployment APIs keeps publish inside a normal fetch path.
 *
 * Hash formula matches wrangler: blake3(base64(contents) + extension).hex.slice(0, 32).
 * Use @noble/hashes (not blake3-wasm) — Turbopack cannot resolve blake3-wasm's ./node.js.
 */

const MAX_BUCKET_BYTES = 50 * 1024 * 1024;
const MAX_BUCKET_FILES = 100;
const FETCH_MS = 45_000;

interface PreparedFile {
    path: string;
    hash: string;
    base64: string;
    contentType: string;
    sizeInBytes: number;
}

interface CfEnvelope<T> {
    success: boolean;
    result: T;
    errors?: { code: number; message: string }[];
}

export function pagesAssetHash(bytes: Buffer, filePath: string): string {
    const extension = extname(filePath).replace(/^\./, '');
    const payload = bytes.toString('base64') + extension;
    return bytesToHex(blake3(Buffer.from(payload, 'utf8'))).slice(0, 32);
}

export function pagesContentType(filePath: string): string {
    const ext = extname(filePath).slice(1).toLowerCase();
    const types: Record<string, string> = {
        html: 'text/html; charset=utf-8',
        htm: 'text/html; charset=utf-8',
        css: 'text/css; charset=utf-8',
        js: 'text/javascript; charset=utf-8',
        mjs: 'text/javascript; charset=utf-8',
        json: 'application/json',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        ico: 'image/x-icon',
        woff: 'font/woff',
        woff2: 'font/woff2',
        txt: 'text/plain; charset=utf-8',
        xml: 'application/xml',
        map: 'application/json',
    };
    return types[ext] ?? 'application/octet-stream';
}

function normalizePath(path: string): string {
    return path.replace(/^\/+/, '').split('\\').join('/');
}

function prepareFiles(files: PublishFile[]): PreparedFile[] {
    return files.map((file) => {
        const path = normalizePath(file.path);
        const bytes =
            file.encoding === 'base64'
                ? Buffer.from(file.content, 'base64')
                : Buffer.from(file.content, 'utf8');
        return {
            path,
            hash: pagesAssetHash(bytes, path),
            base64: bytes.toString('base64'),
            contentType: pagesContentType(path),
            sizeInBytes: bytes.byteLength,
        };
    });
}

async function parseCf<T>(res: Response): Promise<T> {
    const payload = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
    if (!res.ok || !payload?.success) {
        const message = payload?.errors?.[0]?.message ?? res.statusText;
        throw new HostingError(redact(String(message)), res.status);
    }
    return payload.result;
}

async function apiJson<T>(
    path: string,
    init: RequestInit & { token: string },
): Promise<T> {
    const { token, body, method = 'GET', headers: extra } = init;
    const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        ...(extra as Record<string, string> | undefined),
    };
    // Do not send content-type on GET — some Cloudflare edge paths stall on it.
    if (body !== undefined) {
        headers['content-type'] = 'application/json';
    }

    const res = await fetch(`${deployConfig().apiBase}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : body,
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_MS),
    });
    return parseCf<T>(res);
}

async function uploadToken(projectName: string): Promise<string> {
    const result = await apiJson<{ jwt: string }>(
        accountPath(`/pages/projects/${projectName}/upload-token`),
        {
            method: 'GET',
            token: readDeployCredential(),
        },
    );
    if (!result?.jwt) {
        throw new HostingError('Host did not return an upload token.', 502);
    }
    return result.jwt;
}

function bucketFiles(files: PreparedFile[]): PreparedFile[][] {
    const missing = [...files].sort((a, b) => b.sizeInBytes - a.sizeInBytes);
    const buckets: { files: PreparedFile[]; remaining: number }[] = [
        { files: [], remaining: MAX_BUCKET_BYTES },
    ];

    for (const file of missing) {
        let placed = false;
        for (const bucket of buckets) {
            if (
                bucket.remaining >= file.sizeInBytes &&
                bucket.files.length < MAX_BUCKET_FILES
            ) {
                bucket.files.push(file);
                bucket.remaining -= file.sizeInBytes;
                placed = true;
                break;
            }
        }
        if (!placed) {
            buckets.push({
                files: [file],
                remaining: MAX_BUCKET_BYTES - file.sizeInBytes,
            });
        }
    }

    return buckets.map((b) => b.files).filter((files) => files.length > 0);
}

/**
 * Upload static files and create a Pages production deployment.
 * Returns a short id suitable for `commitSha` (deployment id or preview hash).
 */
export async function pushPagesDirectUpload(
    projectName: string,
    files: PublishFile[],
): Promise<{ commitSha: string }> {
    if (files.length === 0) {
        throw new HostingError('No files to publish.', 400);
    }

    const prepared = prepareFiles(files);
    const manifest = Object.fromEntries(
        prepared.map((file) => [`/${file.path}`, file.hash]),
    );

    const jwt = await uploadToken(projectName);

    const missingRaw = await apiJson<unknown>('/pages/assets/check-missing', {
        method: 'POST',
        token: jwt,
        body: JSON.stringify({ hashes: prepared.map((f) => f.hash) }),
    });
    const missing = Array.isArray(missingRaw)
        ? missingRaw.filter((h): h is string => typeof h === 'string')
        : prepared.map((f) => f.hash);

    const toUpload = prepared.filter((f) => missing.includes(f.hash));

    for (const bucket of bucketFiles(toUpload)) {
        await apiJson('/pages/assets/upload', {
            method: 'POST',
            token: jwt,
            body: JSON.stringify(
                bucket.map((file) => ({
                    key: file.hash,
                    value: file.base64,
                    metadata: { contentType: file.contentType },
                    base64: true,
                })),
            ),
        });
    }

    try {
        await apiJson('/pages/assets/upsert-hashes', {
            method: 'POST',
            token: jwt,
            body: JSON.stringify({ hashes: prepared.map((f) => f.hash) }),
        });
    } catch {
        // Same soft-fail as wrangler: upload already succeeded; cache update is best-effort.
    }

    const form = new FormData();
    form.append(
        'manifest',
        new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
    );
    form.append('branch', 'main');

    const res = await fetch(
        `${deployConfig().apiBase}${accountPath(`/pages/projects/${projectName}/deployments`)}`,
        {
            method: 'POST',
            headers: {
                authorization: `Bearer ${readDeployCredential()}`,
            },
            body: form,
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_MS),
        },
    );

    const deployment = await parseCf<{ id: string; url?: string }>(res);
    const short =
        deployment.id?.slice(0, 8) ??
        /https:\/\/([0-9a-f]{8})\./.exec(deployment.url ?? '')?.[1] ??
        'deployed';

    return { commitSha: short };
}
