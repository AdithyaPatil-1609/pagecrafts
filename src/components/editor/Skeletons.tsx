function Bar({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export function TreeSkeleton() {
    return (
        <div className="space-y-2 p-3">
            <Bar className="h-3 w-4/5" />
            <Bar className="h-3 w-3/5" />
            <Bar className="h-3 w-2/3" />
        </div>
    );
}

export function PaneSkeleton() {
    return (
        <div className="space-y-3 p-4">
            <Bar className="h-3 w-3/4" />
            <Bar className="h-3 w-1/2" />
            <Bar className="h-3 w-2/3" />
            <Bar className="h-3 w-1/3" />
        </div>
    );
}