import 'server-only';

import { withRoute } from '@/lib/kernel/with-route';
import { ok } from '@/lib/errors/respond';
import { request } from '@/lib/contracts/schemas/ai';
import { classify } from '@/lib/ai/classify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute({
    auth: 'required',
    limit: 'ai',
    schema: request.classify,
    handler: async ({ body }) => {
        const { data } = await classify(body.text);
        return ok(data);
    },
});