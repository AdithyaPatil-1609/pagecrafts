import { randomUUID } from 'node:crypto';
import { publish } from '@/lib/deploy/publish';

const name = process.argv[2] ?? 'Publish Spike';

const files = [
    {
        path: 'index.html',
        encoding: 'utf-8' as const,
        content: `<!doctype html>
<html><head><meta charset="utf-8"><title>${name}</title>
<link rel="stylesheet" href="styles.css"></head>
<body><h1>${name}</h1><p>Published by PageCraft.</p></body></html>`,
    },
    {
        path: 'styles.css',
        encoding: 'utf-8' as const,
        content: 'body { font-family: system-ui; margin: 3rem; } h1 { color: #4f46e5; }',
    },
];

const started = Date.now();
const at = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

publish(
    { projectId: 'spike', projectName: name, files, idempotencyKey: randomUUID() },
    (state) => console.log(`${at().padStart(7)}  ${state}`),
)
    .then((result) => {
        console.log('');
        console.log('commit :', result.commitSha);
        console.log('state  :', result.state);
        console.log('url    :', result.liveUrl ?? '(not verified within 90s)');
    })
    .catch((err) => {
        console.error('publish failed:', err.message);
        process.exit(1);
    });