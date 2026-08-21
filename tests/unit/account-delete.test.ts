import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const authenticateWithPassword = vi.fn();
const deleteAccount = vi.fn();

const supabase = { auth: { getUser } };

vi.mock('@/lib/auth/session', () => ({
    requireUser: async () => ({
        userId: 'u1',
        email: 'someone@pagecraft.in',
        supabase,
    }),
    supabaseRoute: async () => supabase,
}));

vi.mock('@/lib/auth/password-check', () => ({
    authenticateWithPassword: (...args: unknown[]) => authenticateWithPassword(...args),
}));

vi.mock('@/lib/data/account', () => ({
    deleteAccount: (...args: unknown[]) => deleteAccount(...args),
    getAccount: async () => ({}),
}));

import { DELETE } from '@/app/api/v1/account/route';

function request(body: unknown) {
    return new Request('http://localhost/api/v1/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as never;
}

async function del(body: unknown = {}) {
    const response = await DELETE(request(body), { params: Promise.resolve({}) } as never);
    return { status: response.status, payload: await response.json() };
}

const withPassword = { data: { user: { identities: [{ provider: 'email' }] } } };
const googleOnly = { data: { user: { identities: [{ provider: 'google' }] } } };

beforeEach(() => {
    getUser.mockReset();
    authenticateWithPassword.mockReset();
    deleteAccount.mockReset();
    deleteAccount.mockResolvedValue(undefined);
});

describe('DELETE /api/v1/account', () => {
    it('refuses to delete a password account when no password is given', async () => {
        getUser.mockResolvedValue(withPassword);

        const { status, payload } = await del({});

        expect(status).toBe(401);
        expect(payload.error.code).toBe('unauthorized');
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('refuses when the password is wrong, and says so without deleting', async () => {
        getUser.mockResolvedValue(withPassword);
        authenticateWithPassword.mockResolvedValue({ ok: false, reason: 'bad' });

        const { status, payload } = await del({ password: 'not-the-one' });

        expect(status).toBe(401);
        expect(payload.error.message).toMatch(/password/i);
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('deletes once the password checks out', async () => {
        getUser.mockResolvedValue(withPassword);
        authenticateWithPassword.mockResolvedValue({ ok: true, user: { id: 'u1' } });

        const { status, payload } = await del({ password: 'the-right-one' });

        expect(status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(deleteAccount).toHaveBeenCalledWith('u1');
    });

    // Signing in with Google never sets a password. Demanding one would leave those people
    // unable to close their own account, which is worse than the risk it guards against.
    it('does not demand a password from an account that has never had one', async () => {
        getUser.mockResolvedValue(googleOnly);

        const { status } = await del({});

        expect(status).toBe(200);
        expect(authenticateWithPassword).not.toHaveBeenCalled();
        expect(deleteAccount).toHaveBeenCalledWith('u1');
    });

    it('checks the password against Supabase, not against anything the client sent', async () => {
        getUser.mockResolvedValue(withPassword);
        authenticateWithPassword.mockResolvedValue({ ok: true, user: { id: 'u1' } });

        await del({ password: 'the-right-one', email: 'someone-else@example.com' });

        const [opts] = authenticateWithPassword.mock.calls[0] as [{ email: string }];

        expect(opts.email).toBe('someone@pagecraft.in');
    });
});
