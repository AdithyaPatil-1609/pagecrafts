import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// An address that does not exist (R4 D14).
//
// Without this file an unknown URL renders Next's built-in 404, which is unstyled and says
// only "This page could not be found". A mistyped or stale link is the most ordinary failure
// there is, and it is the one most likely to be somebody's first sight of the product.
export default function NotFound() {
    return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <p className="text-sm font-medium text-muted-foreground">404</p>

            <h1 className="text-2xl font-semibold text-foreground">
                There is nothing at this address
            </h1>

            <p className="text-sm text-muted-foreground">
                The link may be out of date, or the page may have been moved. Nothing of yours has
                been deleted — your sites are still on your dashboard.
            </p>

            <Link href="/" className={`${buttonVariants({ variant: 'default' })} mt-2`}>
                Go to the dashboard
            </Link>
        </main>
    );
}
