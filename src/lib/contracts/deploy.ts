export type DeploymentState =
    | 'pending'
    | 'provisioning'
    | 'pushing'
    | 'enabling_hosting'
    | 'verifying'
    | 'live'
    | 'failed';

export interface Site {
    id: string;
    projectId: string;
    subdomain: string;
    url: string;
}

export interface Deployment {
    id: string;
    projectId: string;
    state: DeploymentState;
    liveUrl: string | null;
    commitSha: string | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PublishFile {
    path: string;
    content: string;
    encoding: 'utf-8' | 'base64';
}