import { Hero } from "@/components/landing/Hero";
import { ValueProps } from "@/components/landing/ValueProps";

export default function LandingPage() {
    return (
        <main className="flex flex-1 flex-col items-center">
            <Hero />
            <ValueProps />
        </main>
    );
}