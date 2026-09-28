import { OwnerPreviewBanner } from '@/components/store-page/owner-preview-banner';
import { WebappView } from '@/components/webapp/webapp-view';
import { type WebappData } from '@/components/webapp/types';
import { Head } from '@inertiajs/react';

type Props = WebappData & { ownerPreview?: boolean };

/**
 * GET /w/{username} — creator ki web app. Design creator ke chune hue theme se aata hai
 * (Dashboard → Web App), aur ye page installable PWA bhi hai (manifest + SW blade se judte hain).
 */
export default function Webapp({ ownerPreview = false, ...data }: Props) {
    const title = data.store.meta_title || `${data.store.display_name} — Web App`;
    const description = data.store.meta_description || data.store.bio || `Courses, sessions and more from ${data.store.display_name}.`;

    return (
        <>
            <Head title={title}>
                <meta name="description" content={description} head-key="description" />
                <meta name="theme-color" content={data.brandColor} head-key="theme-color" />
                <meta property="og:title" content={title} head-key="og:title" />
                <meta property="og:description" content={description} head-key="og:description" />
            </Head>

            {ownerPreview && <OwnerPreviewBanner />}
            <WebappView data={data} />
        </>
    );
}
