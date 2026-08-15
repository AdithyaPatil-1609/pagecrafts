import 'server-only';

export interface DeployConfig {
    apiBase: string;
    accountId: string;
    credentialKeyId: string;
    rootDomain: string;
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

export function deployConfig(): DeployConfig {
    return {
        apiBase: required('HOSTING_API_BASE'),
        accountId: required('HOSTING_ACCOUNT_ID'),
        credentialKeyId: required('HOSTING_CREDENTIAL_KEY_ID'),
        rootDomain: process.env.PAGECRAFT_ROOT_DOMAIN ?? 'pagecraft.in',
    };
}
