import { StyleChooser } from "@/components/discovery/StyleChooser";

export default async function ChooseLookPage({
    params,
    searchParams,
}: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ job?: string }>;
}) {
    const { projectId } = await params;
    const { job } = await searchParams;
    return <StyleChooser projectId={projectId} jobId={job} />;
}
