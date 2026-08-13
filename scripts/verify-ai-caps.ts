import { AI_IN_FLIGHT_MAX } from '@/lib/limits/config';

interface Args {
    url: string;
    cookie: string;
    requests: number;
    confirm: boolean;
}

function args(argv: string[]): Args {
    const value = (name: string) =>
        argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

    return {
        url: value('url') ?? process.env.AI_LOAD_TEST_URL ?? '',
        cookie: value('cookie') ?? process.env.AI_LOAD_TEST_COOKIE ?? '',
        requests: Number(value('requests') ?? 10),
        confirm: argv.includes('--confirm'),
    };
}

async function main(): Promise<void> {
    const options = args(process.argv.slice(2));
    if (!options.confirm) {
        throw new Error(
            'This dispatches real generations. Re-run with --confirm against a dedicated beta test project.',
        );
    }
    if (!options.url || !options.cookie) {
        throw new Error('Set AI_LOAD_TEST_URL and AI_LOAD_TEST_COOKIE (or pass --url and --cookie).');
    }
    if (!Number.isInteger(options.requests) || options.requests <= AI_IN_FLIGHT_MAX) {
        throw new Error(`--requests must be an integer greater than ${AI_IN_FLIGHT_MAX}.`);
    }

    const started = Date.now();
    const responses = await Promise.all(Array.from({ length: options.requests }, async (_, index) => {
        const response = await fetch(options.url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                cookie: options.cookie,
                'x-pagecraft-load-test': 'r5-d18',
            },
            body: JSON.stringify({
                prompt: `D18 cap verification ${index + 1}: a family dental clinic in Koramangala`,
            }),
        });
        return {
            status: response.status,
            retryAfter: response.headers.get('retry-after'),
        };
    }));

    const counts = new Map<number, number>();
    for (const response of responses) {
        counts.set(response.status, (counts.get(response.status) ?? 0) + 1);
    }

    const accepted = counts.get(202) ?? 0;
    const throttled = counts.get(429) ?? 0;
    const serverErrors = responses.filter((response) => response.status >= 500);
    const missingRetryAfter = responses.filter(
        (response) => response.status === 429 && !response.retryAfter,
    );

    console.table([...counts].map(([status, count]) => ({ status, count })));
    console.log(`elapsed_ms=${Date.now() - started}`);
    console.log(`configured_in_flight_max=${AI_IN_FLIGHT_MAX}`);

    if (serverErrors.length) throw new Error(`${serverErrors.length} request(s) returned 5xx.`);
    if (accepted > AI_IN_FLIGHT_MAX) {
        throw new Error(`${accepted} jobs were accepted; cap is ${AI_IN_FLIGHT_MAX}.`);
    }
    if (throttled === 0) throw new Error('No request was throttled under concurrent load.');
    if (missingRetryAfter.length) {
        throw new Error(`${missingRetryAfter.length} throttled response(s) omitted Retry-After.`);
    }

    console.log('PASS: concurrent load stayed inside the cap and every refusal was actionable.');
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
