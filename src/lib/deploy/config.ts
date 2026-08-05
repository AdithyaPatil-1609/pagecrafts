import 'server-only';

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

export const deployConfig = {
    apiBase: required('HOSTING_API_BASE'),
    accountId: required('HOSTING_ACCOUNT_ID'),
    credentialKeyId: required('HOSTING_CREDENTIAL_KEY_ID'),
    rootDomain: process.env.PAGECRAFT_ROOT_DOMAIN ?? 'pagecraft.in',
};