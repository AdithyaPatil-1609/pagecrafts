import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCipheriv, randomBytes } from 'node:crypto';

function seal(plain: string, key: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

describe('deploy credentials', () => {
    const key = randomBytes(32);

    beforeEach(() => {
        vi.resetModules();
        process.env.SECRET_MASTER_KEY = key.toString('base64');
        process.env.HOSTING_DEPLOY_CREDENTIAL = seal('super-secret-token', key);
    });

    it('unlocks the stored credential', async () => {
        const { readDeployCredential } = await import('@/lib/deploy/credentials');
        expect(readDeployCredential()).toBe('super-secret-token');
    });

    it('removes the credential from text', async () => {
        const { readDeployCredential, redact } = await import('@/lib/deploy/credentials');
        readDeployCredential();
        expect(redact('failed with super-secret-token')).toBe('failed with [redacted]');
    });

    it('fails loudly when nothing is configured', async () => {
        process.env.HOSTING_DEPLOY_CREDENTIAL = '';
        const { readDeployCredential } = await import('@/lib/deploy/credentials');
        expect(() => readDeployCredential()).toThrow(/not configured/);
    });
});