import { randomBytes, createCipheriv } from "node:crypto";
import { createInterface } from "node:readline";

const mode = process.argv[2];

function generateKey() {
  const key = randomBytes(32).toString("base64");
  process.stdout.write(`SECRET_MASTER_KEY=${key}\n`);
  process.stderr.write("\nAdd that line to .env.local and to Vercel. Never commit it.\n");
}

function seal(plaintext) {
  const key = Buffer.from(process.env.SECRET_MASTER_KEY ?? "", "base64");

  if (key.length !== 32) {
    process.stderr.write("SECRET_MASTER_KEY must be 32 bytes, base64 encoded.\n");
    process.stderr.write("Run: node scripts/seal-secret.mjs --generate-key\n");
    process.exit(1);
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const sealed = [
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(".");

  process.stdout.write(`${sealed}\n`);
}

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => chunks.push(line));
    rl.on("close", () => resolve(chunks.join("\n")));
  });
}

if (mode === "--generate-key") {
  generateKey();
} else if (mode === "--seal") {
  const plaintext = await readStdin();

  if (!plaintext.trim()) {
    process.stderr.write("Nothing to seal. Pipe the secret in on stdin.\n");
    process.exit(1);
  }

  seal(plaintext.trim());
} else {
  process.stderr.write("Usage:\n");
  process.stderr.write("  node scripts/seal-secret.mjs --generate-key\n");
  process.stderr.write("  echo -n 'the-secret' | SECRET_MASTER_KEY=... node scripts/seal-secret.mjs --seal\n");
  process.exit(1);
}
