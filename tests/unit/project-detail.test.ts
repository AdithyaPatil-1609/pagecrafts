import { describe, expect, it } from 'vitest';
import { asContentSchema } from '@/lib/content/schema';
import { getProject, listProjects } from '@/lib/data/projects';
import { fakeSupabase } from '../support/fake-supabase';

const PROJECT_ID = 'd96cedea-75e9-4cdc-a1c4-ee812a251a56';

const row = {
    id: PROJECT_ID,
    name: 'Freelancer',
    source_template_id: 'tmpl',
    content_json: { hero: { headline: 'Freelance services that deliver.' } },
    content_schema: {
        sections: [
            {
                key: 'hero',
                label: 'Hero',
                fields: [{ key: 'headline', label: 'Headline', type: 'text' }],
            },
        ],
    },
    site_meta: { title: 'Freelancer' },
    form_endpoint: null,
    updated_at: '2026-08-17T00:00:00.000Z',
};

describe('asContentSchema', () => {
    it('turns a missing or empty stored schema into sections: []', () => {
        expect(asContentSchema(null)).toEqual({ sections: [] });
        expect(asContentSchema({})).toEqual({ sections: [] });
        expect(asContentSchema({ sections: row.content_schema.sections }).sections).toHaveLength(1);
    });
});

describe('getProject', () => {
    it('still opens the project when the deployments embed cannot be resolved', async () => {
        const fake = fakeSupabase({
            projects: (query) => {
                if (query.select?.includes('deployments(')) {
                    return {
                        data: null,
                        error: {
                            message: "Could not find a relationship between 'projects' and 'deployments'",
                        },
                    };
                }
                return { data: row, error: null };
            },
        });

        const detail = await getProject(fake.client, PROJECT_ID);

        expect(detail.id).toBe(PROJECT_ID);
        expect(detail.name).toBe('Freelancer');
        expect(detail.contentSchema.sections[0]?.key).toBe('hero');
        expect(detail.status).toBe('draft');
        expect(fake.queries).toHaveLength(2);
    });

    it('still lists sites when the deployments embed cannot be resolved', async () => {
        const fake = fakeSupabase({
            projects: (query) => {
                if (query.select?.includes('deployments(')) {
                    return {
                        data: null,
                        error: { message: 'Could not find a relationship between projects and deployments' },
                    };
                }
                return { data: [row], error: null };
            },
        });

        const listed = await listProjects(fake.client, 'u1');

        expect(listed).toHaveLength(1);
        expect(listed[0]?.name).toBe('Freelancer');
    });
});
