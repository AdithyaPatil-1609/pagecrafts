import { Globe, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const PROPS = [
    {
        icon: Sparkles,
        title: "Never a technical word",
        body: "No code, no accounts to connect, nothing to install. You describe what you want in plain English.",
    },
    {
        icon: ShieldCheck,
        title: "You stay in charge",
        body: "Every change is shown to you first, and a version is saved before it happens. You cannot lose your work by exploring.",
    },
    {
        icon: Globe,
        title: "A real site, at a real address",
        body: "Publishing gives you a live website we host and renew for you. It is yours, and it lasts.",
    },
];

export function ValueProps() {
    return (
        <section id="how-it-works" className="relative z-10 w-full scroll-mt-24 px-6 pb-24">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-10">
                <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    How it works
                </h2>
                <div className="grid w-full gap-5 sm:grid-cols-3">
                    {PROPS.map(({ icon: Icon, title, body }) => (
                        <Card key={title} className="h-full rounded-2xl bg-card/60 backdrop-blur-sm">
                            <CardContent className="flex flex-col gap-3 p-7">
                                <span
                                    aria-hidden
                                    className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-accent"
                                >
                                    <Icon className="size-5 text-primary" strokeWidth={1.75} />
                                </span>
                                <CardTitle className="mt-1 text-lg">{title}</CardTitle>
                                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
