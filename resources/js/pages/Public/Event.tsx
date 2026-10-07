import { CheckoutCard, type CheckoutPricing, type CheckoutQuestion } from '@/components/public/checkout-card';
import {
    assetPath,
    PoliciesSection,
    PublicProductLayout,
    resolvePublicAccent,
    SectionLabel,
    type PublicCreator,
} from '@/components/public/public-product-layout';
import { VideoEmbed } from '@/components/public/video-embed';
import { CalendarDays, CalendarX, Clock, MapPin, Video } from 'lucide-react';
import { useState } from 'react';

type Product = CheckoutPricing & {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    button_text: string | null;
    theme: string | null;
    accent_color: string | null;
    terms_and_conditions: string | null;
    refund_policy: string | null;
    privacy_policy: string | null;
    cover_images: string[];
    checkout_questions: CheckoutQuestion[];
    // join link yahan kabhi nahi aata — sirf register hue buyer ko (email / portal)
    event: {
        mode: 'online' | 'in_person';
        starts_at: string | null;
        ends_at: string | null;
        venue_address: string | null;
        /** event khatam — registration band (server checkout bhi rokta hai) */
        ended: boolean;
    };
};

type Props = { product: Product; creator: PublicCreator; checkoutUrl: string };

// event ka samay hamesha IST me — creator aur buyer dono Bharat me
const TZ = 'Asia/Kolkata';
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

function whenText(starts: string | null, ends: string | null): { day: string; time: string } {
    if (!starts) return { day: 'Date to be announced', time: '' };

    const sameDay = ends && dayLabel(starts) === dayLabel(ends);
    const time = ends ? (sameDay ? `${timeLabel(starts)} – ${timeLabel(ends)} IST` : `${timeLabel(starts)} IST → ${dayLabel(ends)}, ${timeLabel(ends)} IST`) : `${timeLabel(starts)} IST`;

    return { day: dayLabel(starts), time };
}

/** /e/{slug} — event ka live page: kab, kahan, kitne ka; registration CheckoutCard se. */
export default function Event({ product, creator, checkoutUrl }: Props) {
    const event = product.event;
    const accent = resolvePublicAccent(product.accent_color);
    const covers = product.cover_images ?? [];
    const online = event.mode === 'online';
    const when = whenText(event.starts_at, event.ends_at);
    const descriptionText = product.description?.trim() || '<p>Tell people what happens at this event, who it is for and what they will take away.</p>';
    const [activeCover, setActiveCover] = useState(0);

    const rows = [
        { icon: CalendarDays, text: when.day },
        ...(when.time ? [{ icon: Clock, text: when.time }] : []),
        online ? { icon: Video, text: 'Online — the joining link is emailed after you register' } : { icon: MapPin, text: event.venue_address || 'In person' },
    ];

    return (
        <PublicProductLayout
            title={product.title}
            accent={accent}
            creator={creator}
            aside={
                event.ended ? (
                    <div className="rounded-2xl border border-[#E4E2DA] bg-white p-5 text-center shadow-sm">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#F0EFEA] text-[#6B6B78]">
                            <CalendarX className="size-6" />
                        </span>
                        <p className="mt-3 text-base font-bold text-[#14141B]">This event has ended</p>
                        <p className="mt-1 text-sm text-[#6B6B78]">
                            It took place on {when.day}. Registrations are closed.
                        </p>
                    </div>
                ) : (
                    <CheckoutCard
                        accent={accent}
                        pricing={product}
                        questions={product.checkout_questions}
                        cta={product.button_text || 'Register now'}
                        checkoutUrl={checkoutUrl}
                        shareText="Copy link — invite your network"
                        rows={rows}
                    />
                )
            }
        >
            <div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide text-white uppercase" style={{ background: accent }}>
                    {online ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />} {online ? 'Online event' : 'In-person event'}
                </span>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>
            </div>

            <VideoEmbed url={product.cover_video_url} accent={accent} />

            {covers.length > 0 && (
                <div className="relative overflow-hidden rounded-xl border border-[#E4E2DA] bg-white">
                    <div
                        onScroll={(e) => setActiveCover(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                        className="flex aspect-video snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
                    >
                        {covers.map((cover, i) => (
                            <img key={i} src={assetPath(cover)} alt="" className="size-full shrink-0 snap-center object-cover" />
                        ))}
                    </div>
                    {covers.length > 1 && (
                        <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {activeCover + 1} / {covers.length}
                        </span>
                    )}
                </div>
            )}

            {/* kab aur kahan — sabse zaroori baat, upar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">When</p>
                    <p className="mt-1 text-sm font-semibold">{when.day}</p>
                    {when.time && <p className="text-sm text-[#4B4B57]">{when.time}</p>}
                </div>
                <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">Where</p>
                    <p className="mt-1 text-sm font-semibold">{online ? 'Online' : 'In person'}</p>
                    <p className="text-sm break-words text-[#4B4B57]">{online ? 'Joining link is emailed after you register' : event.venue_address}</p>
                </div>
            </div>

            <div>
                <SectionLabel accent={accent}>About this event</SectionLabel>
                {/* description server pe Html::sanitize se guzar ke hi save hota hai */}
                <div className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: descriptionText }} />
            </div>

            <PoliciesSection accent={accent} product={product} />
        </PublicProductLayout>
    );
}
