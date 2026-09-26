import { Head } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { HomeFooter } from './home-footer';
import { HomeNavbar } from './home-navbar';

/** Landing, product aur legal pages ka common frame — hamesha light blue-white, app ke dark mode se independent. */
export function HomeShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <>
            <Head title={title}>
                <meta name="description" content={description} />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="home-page home-light relative min-h-screen overflow-x-clip bg-white font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
                {/* top blue wash — absolute layer taaki sticky navbar root ka direct child rahe */}
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-225 bg-linear-to-b from-blue-50/80 via-white to-white" />
                <HomeNavbar />
                <main className="relative">{children}</main>
                <HomeFooter />
            </div>
        </>
    );
}
