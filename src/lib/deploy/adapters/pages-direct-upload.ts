import 'server-only';
import { extname, basename } from 'node:path';
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
 * Hash formula matches wrangler: blake3(base64(contents) + extension).hex.slice(0, 32).
 */

const MAX_BUCKET_BYTES = 50 * 1024 * 1024;
const MAX_BUCKET_FILES = 100;
const QUICK_MS = 45_000;
const UPLOAD_MS = 180_000;
/** Special Pages config files travel on the deployment form, not the asset store. */
const FORM_ONLY = new Set(['_headers', '_redirects', '_routes.json']);

interface PreparedFile {
    path: string;
    hash: string;
    base64: string;
    contentType: string;
    sizeInBytes: number;
    bytes: Buffer;
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
            bytes,
        };
    });
}

function isAbort(error: unknown): boolean {
    return (
        (error instanceof Error && error.name === 'TimeoutError') ||
        (error instanceof Error && error.name === 'AbortError') ||
        (typeof DOMException !== 'undefined' &&
            error instanceof DOMException &&
            (error.name === 'TimeoutError' || error.name === 'AbortError'))
    );
}

async function parseCf<T>(res: Response): Promise<T> {
    const payload = (await res.json().catch(() => null)) as CfEnvelope<T> | null;
    if (!res.ok || !payload?.success) {
        const err = payload?.errors?.[0];
        const message = err
            ? `${err.message}${err.code ? ` (${err.code})` : ''}`
            : res.statusText;
        throw new HostingError(redact(String(message)), res.status);
    }
    return payload.result;
}

async function apiFetch(
    path: string,
    init: RequestInit & { token: string; timeoutMs?: number },
): Promise<Response> {
    const { token, timeoutMs = QUICK_MS, body, method = 'GET', headers: extra } = init;
    const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        ...(extra as Record<string, string> | undefined),
    };
    if (body !== undefined && !(body instanceof FormData)) {
        headers['content-type'] = 'application/json';
    }

    try {
        return await fetch(`${deployConfig().apiBase}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : body,
            cache: 'no-store',
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        if (isAbort(error)) {
            throw new HostingError('Host upload timed out. Try publishing again.', 504);
        }
        throw error;
    }
}

async function apiJson<T>(
    path: string,
    init: RequestInit & { token: string; timeoutMs?: number },
): Promise<T> {
    return parseCf<T>(await apiFetch(path, init));
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
    const assets = prepared.filter((f) => !FORM_ONLY.has(basename(f.path)));
    const formOnly = prepared.filter((f) => FORM_ONLY.has(basename(f.path)));

    const manifest = Object.fromEntries(
        assets.map((file) => [`/${file.path}`, file.hash]),
    );

    const jwt = await uploadToken(projectName);

    // Always upload every asset. Skipping via check-missing can "succeed" with a
    // deployment that references hashes that never landed (empty origin → 522).
    const buckets = bucketFiles(assets);
    const concurrency = 3;
    for (let i = 0; i < buckets.length; i += concurrency) {
        const batch = buckets.slice(i, i + concurrency);
        await Promise.all(
            batch.map((bucket) =>
                apiJson('/pages/assets/upload', {
                    method: 'POST',
                    token: jwt,
                    timeoutMs: UPLOAD_MS,
                    body: JSON.stringify(
                        bucket.map((file) => ({
                            key: file.hash,
                            value: file.base64,
                            metadata: { contentType: file.contentType },
                            base64: true,
                        })),
                    ),
                }),
            ),
        );
    }

    try {
        await apiJson('/pages/assets/upsert-hashes', {
            method: 'POST',
            token: jwt,
            body: JSON.stringify({ hashes: assets.map((f) => f.hash) }),
        });
    } catch {
        // Soft-fail like wrangler.
    }

    // Wrangler appends a plain JSON string — a Blob/File part can 500 the create call.
    const form = new FormData();
    form.append('manifest', JSON.stringify(manifest));
    form.append('branch', 'main');
    for (const file of formOnly) {
        form.append(
            basename(file.path),
            new File([Uint8Array.from(file.bytes)], basename(file.path)),
        );
    }

    const res = await apiFetch(
        accountPath(`/pages/projects/${projectName}/deployments`),
        {
            method: 'POST',
            token: readDeployCredential(),
            timeoutMs: UPLOAD_MS,
            body: form,
        },
    );

    const deployment = await parseCf<{
        id: string;
        url?: string;
        latest_stage?: { name?: string; status?: string };
    }>(res);
    if (!deployment.id) {
        throw new HostingError('Host created a deployment without an id.', 502);
    }

    await waitForDeployment(projectName, deployment.id);

    return {
        commitSha:
            deployment.id.slice(0, 8) ||
            /https:\/\/([0-9a-f]{8})\./.exec(deployment.url ?? '')?.[1] ||
            'deployed',
    };
}

async function waitForDeployment(projectName: string, deploymentId: string): Promise<void> {
    const token = readDeployCredential();
    let latest: { name?: string; status?: string } | undefined;

    for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8_000)));
        try {
            const deployment = await apiJson<{
                latest_stage?: { name?: string; status?: string };
            }>(accountPath(`/pages/projects/${projectName}/deployments/${deploymentId}`), {
                method: 'GET',
                token,
            });
            latest = deployment.latest_stage;
            if (
                latest?.name === 'deploy' &&
                (latest.status === 'success' || latest.status === 'failure')
            ) {
                break;
            }
        } catch {
            // Transient read failures — keep polling like wrangler.
        }
    }

    if (latest?.name === 'deploy' && latest.status === 'success') return;

    if (latest?.name === 'deploy' && latest.status === 'failure') {
        throw new HostingError(
            'Host rejected the deployment after upload. Try publishing again.',
            502,
        );
    }

    // Do not claim success when we never saw a successful deploy stage — that left
    // empty Pages projects answering 522 while we told the UI to verify DNS.
    throw new HostingError(
        'Host did not confirm the deployment finished. Try publishing again.',
        504,
    );
}
