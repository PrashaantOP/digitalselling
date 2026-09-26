import { cn } from '@/lib/utils';
import { Play, Video } from 'lucide-react';
import { useState } from 'react';

/*
 * Cover video link (YouTube / Vimeo / .mp4) ko thumbnail + play button me badalta hai.
 * Player sirf click pe load hota hai — page fast rehta hai aur koi third-party script
 * pehle se nahi chalti. Public page aur editor ka live preview dono isi component se bante hain.
 */

export type ParsedVideo =
    | { provider: 'youtube'; id: string }
    | { provider: 'vimeo'; id: string }
    | { provider: 'file'; id: string }
    | null;

// youtu.be/ID · watch?v=ID · /embed/ID · /shorts/ID · /live/ID
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d{5,})/i;

export function parseVideoUrl(url: string | null | undefined): ParsedVideo {
    const clean = url?.trim();
    // sirf http/https — javascript: / data: URLs kabhi iframe ya <video> me nahi jaane chahiye
    if (!clean || !/^https?:\/\//i.test(clean)) return null;

    const youtube = clean.match(YOUTUBE_RE);
    if (youtube) return { provider: 'youtube', id: youtube[1] };

    const vimeo = clean.match(VIMEO_RE);
    if (vimeo) return { provider: 'vimeo', id: vimeo[1] };

    if (/\.(mp4|webm|ogg)(\?[^#]*)?$/i.test(clean)) return { provider: 'file', id: clean };

    return null;
}

/** YouTube ka asli play badge (red rounded rect + white triangle). */
function YouTubeBadge() {
    return (
        <svg
            viewBox="0 0 68 48"
            aria-hidden="true"
            className="h-[15%] max-h-14 min-h-8 w-auto drop-shadow-lg transition duration-200 group-hover:scale-110"
        >
            <path
                d="M66.52 7.74a8.08 8.08 0 0 0-5.68-5.72C55.79.99 34 .99 34 .99s-21.79 0-26.84 1.03a8.08 8.08 0 0 0-5.68 5.72A84.5 84.5 0 0 0 .5 24a84.5 84.5 0 0 0 .98 16.26 8.08 8.08 0 0 0 5.68 5.72C12.21 47 34 47 34 47s21.79 0 26.84-1.02a8.08 8.08 0 0 0 5.68-5.72A84.5 84.5 0 0 0 67.5 24a84.5 84.5 0 0 0-.98-16.26Z"
                fill="#FF0000"
            />
            <path d="M27.2 34.4 45.6 24 27.2 13.6Z" fill="#fff" />
        </svg>
    );
}

export function VideoEmbed({ url, accent = '#4F46E5', className }: { url: string | null | undefined; accent?: string; className?: string }) {
    const video = parseVideoUrl(url);
    // id se compare — URL badalte hi player apne aap band ho jaata hai (editor me live typing)
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [lowResId, setLowResId] = useState<string | null>(null);

    const frame = 'relative aspect-video w-full overflow-hidden rounded-xl border border-[#E4E2DA]';

    // Unsupported link — sirf link dikha do, kuch embed mat karo
    if (!video) {
        const clean = url?.trim();
        if (!clean) return null;
        return (
            <div className={cn(frame, 'flex items-center justify-center gap-2 bg-[#F6F5F2] text-sm text-[#6B6B78]', className)}>
                <Video className="size-5 shrink-0" style={{ color: accent }} />
                <a href={clean} target="_blank" rel="noreferrer" className="max-w-[70%] truncate underline-offset-2 hover:underline">
                    {clean}
                </a>
            </div>
        );
    }

    if (video.provider === 'file') {
        return (
            <div className={cn(frame, 'bg-black', className)}>
                <video src={video.id} controls playsInline className="absolute inset-0 size-full object-contain" />
            </div>
        );
    }

    if (playingId === video.id) {
        const src =
            video.provider === 'youtube'
                ? `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`
                : `https://player.vimeo.com/video/${video.id}?autoplay=1`;

        return (
            <div className={cn(frame, 'bg-black', className)}>
                <iframe
                    src={src}
                    title={video.provider === 'youtube' ? 'YouTube video player' : 'Vimeo video player'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 size-full border-0"
                />
            </div>
        );
    }

    // maxresdefault har video pe nahi hota — 404 aaye to hqdefault pe gir jao
    const thumb =
        lowResId === video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`;

    return (
        <button
            type="button"
            onClick={() => setPlayingId(video.id)}
            aria-label="Play video"
            className={cn(frame, 'group block bg-[#0A0A12]', className)}
        >
            {video.provider === 'youtube' ? (
                <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    onError={() => setLowResId(video.id)}
                    className="absolute inset-0 size-full object-cover transition duration-300 group-hover:opacity-90"
                />
            ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-[#1A1A24] to-[#0A0A12]" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
                {video.provider === 'youtube' ? (
                    <YouTubeBadge />
                ) : (
                    <span
                        className="flex size-16 items-center justify-center rounded-full text-white shadow-lg transition duration-200 group-hover:scale-110"
                        style={{ background: accent }}
                    >
                        <Play className="size-7 fill-current" />
                    </span>
                )}
            </span>
        </button>
    );
}
