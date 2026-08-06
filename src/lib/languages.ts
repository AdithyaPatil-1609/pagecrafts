import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import type { Extension } from '@codemirror/state';

const BY_EXTENSION: Record<string, () => Extension> = {
    html: html,
    htm: html,
    css: css,
    js: javascript,
    mjs: javascript,
    json: json,
};

export function extensionOf(path: string): string {
    const name = path.split('/').pop() ?? '';
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function languageFor(path: string): Extension[] {
    const make = BY_EXTENSION[extensionOf(path)];
    return make ? [make()] : [];
}