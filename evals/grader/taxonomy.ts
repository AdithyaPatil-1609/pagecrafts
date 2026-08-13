import type { AutoGrade, GenerationOutcome, HumanGrade, FailureStage } from './index';

export type Symptom =
    | 'blank-field'
    | 'missing-required-section'
    | 'wrong-category'
    | 'forbidden-section'
    | 'variant-repetition'
    | 'generic-copy'
    | 'schema-rejection'
    | 'provider-error'
    | 'timeout';

export interface Cluster {
    stage: string;
    symptom: Symptom;
    count: number;
    verticals: string[];
    /**
     * The actual bad output, not a description of it. On D12 you rewrite a
     * prompt to fix a symptom; having the real output beside you is the
     * difference between fixing the problem and fixing your idea of the problem.
     */
    exampleOutput: string;
    /** count × impact — the ranking the day's one tuning slot is spent against. */
    score: number;
}

/**
 * How badly the symptom damages the page the user is shown.
 * A missing hero is fatal; a defensible neighbouring category is a diagnostic.
 */
const IMPACT: Record<Symptom, number> = {
    'provider-error': 5,
    timeout: 5,
    'schema-rejection': 4,
    'missing-required-section': 4,
    'blank-field': 4,
    'forbidden-section': 3,
    'generic-copy': 3,
    'variant-repetition': 2,
    'wrong-category': 1,
};

export interface GradedRun {
    grade: AutoGrade;
    outcome: GenerationOutcome;
    human?: HumanGrade;
}

/** Reads the provider's own words rather than guessing from the stage. */
function symptomForError(error: string): Symptom {
    const e = error.toLowerCase();
    if (/timed out|timeout|etimedout|abort/.test(e)) return 'timeout';
    if (/failed validation|schema|parse|json|unexpected token/.test(e)) return 'schema-rejection';
    return 'provider-error';
}

function snippet(text: string, max = 600): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Every symptom one run exhibits. A run can carry more than one. */
export function symptomsOf(run: GradedRun): Array<{ symptom: Symptom; stage: string; example: string }> {
    const { grade, outcome, human } = run;
    const found: Array<{ symptom: Symptom; stage: string; example: string }> = [];

    if (!outcome.completed) {
        found.push({
            symptom: symptomForError(outcome.error),
            stage: outcome.failureStage,
            example: snippet(outcome.error),
        });
        return found;
    }

    const sectionsOf = (ids: string[]) => snippet(
        JSON.stringify(
            outcome.composition.sections
                .filter((s) => ids.some((id) => id.startsWith(s.id)))
                .map((s) => ({ id: s.id, type: s.type, props: s.props })),
        ),
    );

    if (grade.blankFields.length > 0) {
        found.push({
            symptom: 'blank-field',
            stage: 'fill',
            example: `${grade.blankFields.join(', ')} → ${sectionsOf(grade.blankFields)}`,
        });
    }

    if (grade.missingSections.length > 0) {
        found.push({
            symptom: 'missing-required-section',
            stage: 'plan',
            example: `expected ${grade.missingSections.join(', ')}; planned `
                + outcome.composition.sections.map((s) => s.type).join(', '),
        });
    }

    if (grade.forbiddenSections.length > 0) {
        found.push({
            symptom: 'forbidden-section',
            stage: 'plan',
            example: `unwanted ${grade.forbiddenSections.join(', ')}; planned `
                + outcome.composition.sections.map((s) => s.type).join(', '),
        });
    }

    if (!grade.variantsDistinct) {
        found.push({
            symptom: 'variant-repetition',
            stage: 'plan',
            example: outcome.composition.sections
                .map((s) => `${s.type}:${s.variant}`).join(' · '),
        });
    }

    if (!grade.categoryCorrect) {
        found.push({
            symptom: 'wrong-category',
            stage: 'classify',
            example: `got "${outcome.category}"`,
        });
    }

    // Human judgement, folded in only where a person actually read the copy.
    if (human && human.copySensible !== null && human.copySensible <= 2) {
        found.push({
            symptom: 'generic-copy',
            stage: 'fill',
            example: human.notes || snippet(JSON.stringify(outcome.composition.sections[0]?.props ?? {})),
        });
    }

    return found;
}

/** Clusters sorted by count × impact, descending. */
export function clusterFailures(runs: GradedRun[]): Cluster[] {
    const byKey = new Map<string, Cluster>();

    for (const run of runs) {
        for (const { symptom, stage, example } of symptomsOf(run)) {
            const key = `${stage}::${symptom}`;
            const existing = byKey.get(key);

            if (existing) {
                existing.count += 1;
                existing.verticals.push(run.grade.vertical);
                existing.score = existing.count * IMPACT[symptom];
            } else {
                byKey.set(key, {
                    stage,
                    symptom,
                    count: 1,
                    verticals: [run.grade.vertical],
                    exampleOutput: example,
                    score: IMPACT[symptom],
                });
            }
        }
    }

    return [...byKey.values()].sort((a, b) => b.score - a.score || b.count - a.count);
}

/**
 * D12 has one day. The top three clusters go into it and nothing else does —
 * capping the list is what stops D11 overrunning into D12's slot.
 */
export function topThree(clusters: Cluster[]): Cluster[] {
    return clusters.slice(0, 3);
}

export interface StageTally {
    stage: FailureStage | string;
    failures: number;
}

/** Where generations die, most-fatal stage first. */
export function failuresByStage(runs: GradedRun[]): StageTally[] {
    const counts = new Map<string, number>();
    for (const run of runs) {
        if (run.outcome.completed) continue;
        const stage = run.outcome.failureStage;
        counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([stage, failures]) => ({ stage, failures }))
        .sort((a, b) => b.failures - a.failures);
}
