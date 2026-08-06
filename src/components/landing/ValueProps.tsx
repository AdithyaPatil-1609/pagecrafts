import { Card, CardContent, CardTitle } from "@/components/ui/card";

const PROPS = [
    {
        title: "Never a technical word",
        body: "No code, no accounts to connect, nothing to install. You describe what you want in plain English.",
    },
    {
        title: "You stay in charge",
        body: "Every change is shown to you first, and a version is saved before it happens. You cannot lose your work by exploring.",
    },
    {
        title: "A real site, at a real address",
        body: "Publishing gives you a live website we host and renew for you. It is yours, and it lasts.",
    },
];

export function ValueProps() {
    return (
        <section className="w-full px-6 pb-16">
            <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
                {PROPS.map((p) => (
                    <Card key={p.title} className="h-full">
                        <CardContent className="flex flex-col gap-2 p-6">
                            <CardTitle className="text-base">{p.title}</CardTitle>
                            <p className="text-sm leading-6 text-muted-foreground">{p.body}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}