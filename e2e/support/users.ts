export const SEEDED = {
    email: process.env.E2E_EMAIL ?? 'meera@pagecraft.test',
    password: process.env.E2E_PASSWORD ?? 'pagecraft-dev-123',
};

export const SECOND = {
    email: process.env.E2E_EMAIL_2 ?? 'arjun@pagecraft.test',
    password: process.env.E2E_PASSWORD_2 ?? 'pagecraft-dev-123',
};

/** Saved sessions, written once by auth.setup.ts and reused by every spec. */
export const STATE = {
    first: 'e2e/.auth/first.json',
    second: 'e2e/.auth/second.json',
};
