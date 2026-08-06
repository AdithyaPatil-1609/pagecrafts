export function Hero() {
    return (
        <section className="w-full px-6 pt-20 pb-14 sm:pt-28 sm:pb-20">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Describe it. Publish it. It&apos;s yours.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                    Tell us what you want and we build the website. Change anything just by
                    asking. When you like it, one tap puts it online at your own address.
                </p>
                <a
                    href="#sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    Start building — free
                </a>
                <p className="text-sm text-muted-foreground">
                    Building and editing are free. You pay Rs 249 only when you are ready to
                    go live.
                </p>
            </div>
        </section>
    );
}