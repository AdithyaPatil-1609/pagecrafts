import EditorShell from '@/components/editor/EditorShell';

export default async function EditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ job?: string }>;
}) {
    const { projectId } = await params;
    const { job } = await searchParams;
    return <EditorShell projectId={projectId} jobId={job} />;
}