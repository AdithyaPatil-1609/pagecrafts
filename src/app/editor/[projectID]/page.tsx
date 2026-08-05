import EditorShell from '@/components/editor/EditorShell';

export default async function EditorPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;
    return <EditorShell projectId={projectId} />;
}