import { OwnerPreviewBanner } from '@/components/store-page/owner-preview-banner';
import { StorePageView } from '@/components/store-page/store-page-view';
import { assetUrl, brandHex, type StoreButton, type StoreProduct, type StoreSocial, type StoreTheme } from '@/components/store-page/types';
import { Head } from '@inertiajs/react';

interface StoreProps {
    creator: { name: string; username: string; avatar: string | null };
    store: {
        display_name: string | null;
        bio: string | null;
        avatar: string | null;
        column_layout?: 'single' | 'double';
        sensitive_content_warning?: boolean;
        meta_title?: string | null;
        meta_description?: string | null;
    };
    appearance?: { theme?: StoreTheme; brand_color?: string | null; font_family?: string | null; custom_background_path?: string | null } | null;
    socialLinks?: StoreSocial[];
    headerButtons?: StoreButton[];
    products?: StoreProduct[];
    ownerPreview?: boolean;
}

/** GET /{username} — creator ka link-in-bio store. Design dashboard ke live preview jaisa hi (same component). */
export default function Store({ creator, store, appearance, socialLinks = [], headerButtons = [], products = [], ownerPreview = false }: StoreProps) {
    const name = store.display_name || creator.name || creator.username;
    const avatar = assetUrl(store.avatar) ?? assetUrl(creator.avatar);
    const description = store.meta_description || store.bio || `Shop ${name}'s products and book 1:1 sessions.`;

    return (
        <>
            <Head title={store.meta_title || name}>
                <meta name="description" content={description} />
                <meta property="og:title" content={store.meta_title || name} />
                <meta property="og:description" content={description} />
                {avatar && <meta property="og:image" content={avatar} />}
            </Head>
            {ownerPreview && <OwnerPreviewBanner />}
            <StorePageView
                mode="live"
                data={{
                    displayName: name,
                    username: creator.username,
                    bio: store.bio ?? '',
                    avatarUrl: avatar,
                    isLive: !ownerPreview,
                    theme: appearance?.theme ?? 'classic',
                    brandColor: brandHex(appearance?.brand_color),
                    fontFamily: appearance?.font_family ?? null,
                    backgroundUrl: assetUrl(appearance?.custom_background_path),
                    columnLayout: store.column_layout ?? 'single',
                    sensitive: !!store.sensitive_content_warning,
                    socials: socialLinks,
                    buttons: headerButtons,
                    products,
                }}
            />
        </>
    );
}
