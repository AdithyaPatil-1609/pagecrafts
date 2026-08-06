import type { DeployProvider } from '../provider';
import { githubPagesAdapter } from './github-pages';

export const deployProvider: DeployProvider = githubPagesAdapter;