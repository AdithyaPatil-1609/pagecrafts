import 'server-only';
import { createDecipheriv } from 'node:crypto';

let cached: string | null = null;

export function readDeployCredential(): string {
    if (cached) return cached;

    const sealed = process.env.HOSTING_DEPLOY_CREDENTIAL ?? '';
    const key = Buffer.from(process.env.SECRET_MASTER_KEY ?? '', 'base64');

    if (!sealed || key.length !== 32) {
        throw new Error('Deploy credential is not configured');
    }

    const [iv, tag, data] = sealed.split('.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    cached =
        decipher.update(Buffer.from(data, 'base64'), undefined, 'utf8') +
        decipher.final('utf8');

    return cached;
}

export function redact(text: string): string {
    return cached ? text.split(cached).join('[redacted]') : text;
}