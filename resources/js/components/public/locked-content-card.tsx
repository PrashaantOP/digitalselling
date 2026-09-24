import { FileText, Image as ImageIcon, Lock, MessageSquareText, PlayCircle } from 'lucide-react';

/* Locked content ka "band" card — editor preview aur public page dono me same. Asli content kabhi nahi, sirf ginti. */

export const LOCKED_CATEGORIES = [
    { value: 'other', label: 'Other' },
    { value: 'photos', label: 'Photos' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'documents', label: 'Documents' },
    { value: 'templates', label: 'Templates' },
    { value: 'software', label: 'Software' },
] as const;

export type LockedCategory = (typeof LOCKED_CATEGORIES)[number]['value'];

export const categoryLabel = (value: string | null | undefined) => LOCKED_CATEGORIES.find((c) => c.value === value)?.label ?? 'Other';

export type LockedSummary = { has_message: boolean; has_video: boolean; image_count: number; file_count: number };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 images · 1 video · 2 files · message" */
export function lockedSummaryText(s: LockedSummary) {
    return [
        s.image_count > 0 && plural(s.image_count, 'image'),
        s.has_video && '1 video',
        s.file_count > 0 && plural(s.file_count, 'file'),
        s.has_message && 'message',
    ]
        .filter(Boolean)
        .join(' · ');
}

export function LockedContentCard({ accent, summary }: { accent: string; summary: LockedSummary }) {
    const chips = [
        summary.image_count > 0 && { icon: ImageIcon, text: plural(summary.image_count, 'image') },
        summary.has_video && { icon: PlayCircle, text: 'Video' },
        summary.file_count > 0 && { icon: FileText, text: plural(summary.file_count, 'file') },
        summary.has_message && { icon: MessageSquareText, text: 'Private message' },
    ].filter(Boolean) as { icon: typeof Lock; text: string }[];
    // blurred tiles bas "kuch hai" ka feel dete hain — asli images yahan kabhi nahi aati
    const tiles = Math.min(6, Math.max(3, summary.image_count + summary.file_count));

    return (
        <div className="overflow-hidden rounded-2xl border border-[#E4E2DA] bg-white">
            <div className="relative p-3">
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: tiles }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-lg"
                            style={{ background: `linear-gradient(135deg, ${accent}${i % 2 ? '26' : '14'}, #E4E2DA)` }}
                        />
                    ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-md">
                    <span className="flex size-12 items-center justify-center rounded-full text-white shadow-lg" style={{ background: accent }}>
                        <Lock className="size-5" />
                    </span>
                    <p className="text-sm font-bold text-[#14141B]">Unlock to view</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#E4E2DA] px-4 py-3">
                {chips.length > 0 ? (
                    chips.map((chip) => (
                        <span
                            key={chip.text}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F5F2] px-2.5 py-1 text-xs font-semibold text-[#4B4B57]"
                        >
                            <chip.icon className="size-3.5" style={{ color: accent }} /> {chip.text}
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-[#8A8A96]">Hidden content will appear here</span>
                )}
            </div>
        </div>
    );
}
