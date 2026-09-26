import { EyeOff } from 'lucide-react';

// store offline hai aur owner khud dekh raha hai — public ko ye page 404 dikhta hai
export function OwnerPreviewBanner() {
    return (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950 shadow">
            <span className="inline-flex items-center gap-1.5">
                <EyeOff className="size-3.5" />
                Your store is offline — only you can see this page.
            </span>
            <a href="/dashboard/store" className="underline underline-offset-2 hover:no-underline">
                Go live from Store settings →
            </a>
        </div>
    );
}
