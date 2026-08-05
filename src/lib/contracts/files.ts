export type FileType = 'text' | 'binary';

export interface VFile {
    content: string;
    dirty: boolean;
    type: FileType;
}

export interface TreeNode {
    name: string;
    path: string;
    kind: 'file' | 'dir';
    children?: TreeNode[];
}