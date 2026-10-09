import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { HomeFooter } from './home-footer';
import { HomeNavbar } from './home-navbar';

/** Landing, product aur legal pages ka common frame — hamesha light blue-white, app ke dark mode se independent. */
export function HomeShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    const { name, ziggy } = usePage<SharedData>().props;
    // WhatsApp / Facebook / X pe link share karne pe dikhne wali image — poora (absolute) URL chahiye
    const shareImage = `${ziggy.url.replace(/\/$/, '')}/images/brand/creatorpro-og.png`;

    return (
        <>
            <Head title={title}>
                <meta name="description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={name} />
                <meta property="og:title" content={`${title} · ${name}`} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={shareImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:image" content={shareImage} />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="home-page home-light relative min-h-dvh overflow-x-clip bg-white font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
                {/* top blue wash — absolute layer taaki sticky navbar root ka direct child rahe */}
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-225 bg-linear-to-b from-blue-50/80 via-white to-white" />
                <HomeNavbar />
                <main className="relative">{children}</main>
                <HomeFooter />
            </div>
        </>
    );
}
