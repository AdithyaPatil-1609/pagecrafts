import { describe, expect, it } from 'vitest';
import { generateSpike, Budget } from '../../evals/spike/pipeline';
import type { SpikeResult } from '../../evals/spike/pipeline';
import { reportFor, indexFor } from '../../evals/spike/report';
import { setGateway } from '@/lib/ai/gateway';
import { MockGateway } from '@/lib/ai/gateway/mock';

describe('spike evaluation pipeline & reporting with partial results', () => {
    it('returns partial results when a run fails after profile/plan stages', async () => {
        class FailingMockGateway extends MockGateway {
            private count = 0;
            override async complete(req: Parameters<MockGateway['complete']>[0]) {
                this.count++;
                if (this.count >= 4) {
                    throw new Error('Fill stage mock failure');
                }
                return super.complete(req);
            }
        }

        setGateway(new FailingMockGateway());
        const budget = new Budget(10);

        const result = await generateSpike({
            vertical: 'restaurant',
            prompt: 'Italian restaurant in downtown',
            hasTemplate: false,
            mode: 'full',
            budget,
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('Fill stage mock failure');
        expect(result.partial).toBeDefined();
        expect(result.partial?.profile).toBeDefined();
        expect(result.partial?.profile?.artDirection).toBeDefined();
        expect(result.partial?.sections).toBeDefined();
        expect(result.partial?.sections?.length).toBeGreaterThan(0);
    });

    it('reports recipe, art direction, and sections when composition is missing on failed run', () => {
        const mockFailedResult: SpikeResult = {
            vertical: 'boutique',
            prompt: 'High-end fashion boutique',
            hasTemplate: true,
            mode: 'full',
            ok: false,
            error: 'Failed to fill section 6',
            calls: [],
            requests: 5,
            modelTimeMs: 1200,
            wallClockMs: 1500,
            partial: {
                profile: {
                    slug: 'boutique',
                    label: 'Boutique',
                    aliases: [],
                    recipe: [
                        { type: 'hero', required: true, note: 'Stylish hero' },
                        { type: 'gallery', required: false },
                    ],
                    artDirection: {
                        themeId: 'warm-editorial',
                        motionId: 'editorial',
                        radiusId: 'soft',
                        spacingId: 'airy',
                        imageryId: 'warm-natural',
                    },
                    vocabulary: {},
                    imageQueries: [],
                },
                sections: [
                    {
                        id: 's_01',
                        type: 'hero',
                        variant: 'hero-split',
                        brief: 'Hero section',
                        visible: true,
                        locked: false,
                        source: 'ai',
                        props: {},
                    },
                ],
            },
        };

        const report = reportFor(mockFailedResult);
        expect(report).toContain('## FAILED');
        expect(report).toContain('Failed to fill section 6');
        expect(report).toContain('### Recipe');
        expect(report).toContain('hero (required) — Stylish hero');
        expect(report).toContain('### Art direction');
        expect(report).toContain('theme **warm-editorial**');
        expect(report).toContain('### Sections (1)');
        expect(report).toContain('`hero` / `hero-split` — Hero section');

        const index = indexFor([mockFailedResult]);
        expect(index).toContain('| boutique | yes | FAILED | 1 | warm-editorial | editorial |');
    });
});
