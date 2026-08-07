import 'server-only';
import { redact } from './credentials';

export interface DeployEvent {
    step: string;
    outcome: 'started' | 'ok' | 'failed';
    projectId?: string;
    siteId?: string;
    ms?: number;
    error?: string;
}

export function deployLog(event: DeployEvent): void {
    const line = redact(
        JSON.stringify({ at: new Date().toISOString(), scope: 'deploy', ...event }),
    );

    if (event.outcome === 'failed') console.error(line);
    else console.log(line);
}

export async function step<T>(
    name: string,
    context: { projectId?: string; siteId?: string },
    work: () => Promise<T>,
): Promise<T> {
    const started = Date.now();
    deployLog({ ...context, step: name, outcome: 'started' });

    try {
        const result = await work();
        deployLog({ ...context, step: name, outcome: 'ok', ms: Date.now() - started });
        return result;
    } catch (error) {
        deployLog({
            ...context,
            step: name,
            outcome: 'failed',
            ms: Date.now() - started,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}