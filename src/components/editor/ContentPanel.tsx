'use client';

export default function ContentPanel() {
    return (
        <div className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Your content</h2>
            {['Site title', 'Tagline', 'About'].map((label) => (
                <label key={label} className="block">
                    <span className="mb-1 block text-sm">{label}</span>
                    <input className="w-full rounded border border-border px-2 py-1 text-sm" />
                </label>
            ))}
        </div>
    );
}