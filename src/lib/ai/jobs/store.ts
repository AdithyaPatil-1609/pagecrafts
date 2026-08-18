import type { Job, JobStore } from './types';

/** In-memory until the jobs table lands on D9; swapping it is this one file. */
class MemoryJobStore implements JobStore {
    private readonly jobs = new Map<string, Job>();

    async create(job: Job): Promise<Job> {
        this.jobs.set(job.id, job);
        return job;
    }

    async get(id: string): Promise<Job | undefined> {
        return this.jobs.get(id);
    }

    async update(id: string, patch: Partial<Job>): Promise<Job | undefined> {
        const current = this.jobs.get(id);
        if (!current) return undefined;
        const next = { ...current, ...patch };
        this.jobs.set(id, next);
        return next;
    }

    async listByProject(projectId: string): Promise<Job[]> {
        return [...this.jobs.values()]
            .filter((job) => job.projectId === projectId)
            .sort((a, b) => a.startedAt - b.startedAt);
    }
}

let instance: JobStore = new MemoryJobStore();

export function jobStore(): JobStore {
    return instance;
}

export function setJobStore(next: JobStore | null): void {
    instance = next ?? new MemoryJobStore();
}

let counter = 0;
export function nextJobId(): string {
    counter += 1;
    return `job_${counter}`;
}
