import { readFileSync } from 'node:fs';
import { createCipheriv, randomBytes } from 'node:crypto';

const path = process.argv[2];
const key = Buffer.from(process.env.SECRET_MASTER_KEY ?? '', 'base64');

if (!path) {
    console.error('usage: tsx scripts/seal-credential.ts <path-to-file>');
    process.exit(1);
}

if (key.length !== 32) {
    console.error('SECRET_MASTER_KEY must be a base64-encoded 32-byte key');
    process.exit(1);
}

const plain = readFileSync(path, 'utf8').trim();
console.error(`sealing ${plain.length} characters`);

const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

console.log([iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.'));