import { cn } from '@/lib/utils';
import { ImagePlus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assetUrl } from './api';
import { type CourseDetail, type SectionType, SECTION_LABELS } from './types';
import { INPUT, TEXTAREA, Toggle } from './ui';

/* ------------------------------------------------------------------ */
/*  Draft model                                                        */
/* ------------------------------------------------------------------ */

export interface DraftItem {
    key: string;
    id?: number;
    text?: string;
    question?: string;
    answer?: string;
    name?: string;
    message?: string;
    imagePath?: string | null;
    file?: File | null;
}

export interface SectionDraft {
    enabled: boolean;
    items: DraftItem[];
}

export type Drafts = Record<SectionType, SectionDraft>;

export const SECTION_ORDER: SectionType[] = ['instructions', 'benefits', 'gallery', 'faqs', 'testimonials', 'highlights'];

let seq = 0;
export const newKey = () => `new-${++seq}`;

export function draftFromDetail(type: SectionType, detail: CourseDetail | null): SectionDraft {
    if (!detail) return { enabled: false, items: [] };
    const d = detail as unknown as Record<string, unknown>;
    const rows: { id: number; is_enabled: boolean; [k: string]: unknown }[] = ((type === 'gallery' ? (d.gallery_items ?? d.galleryItems) : d[type]) ?? []) as never;
    const items: DraftItem[] = rows.map((r) => {
        const base = { key: `id-${r.id}`, id: r.id };
        if (type === 'faqs') return { ...base, question: String(r.question ?? ''), answer: String(r.answer ?? '') };
        if (type === 'testimonials') return { ...base, name: String(r.name ?? ''), message: String(r.message ?? ''), imagePath: (r.avatar_path as string | null) ?? null };
        if (type === 'gallery') return { ...base, imagePath: (r.image_path as string | null) ?? null };
        return { ...base, text: String(r.text ?? '') };
    });
    return { enabled: rows.length > 0 && rows.some((r) => r.is_enabled), items };
}

export function draftsFromDetail(detail: CourseDetail | null): Drafts {
    return Object.fromEntries(SECTION_ORDER.map((t) => [t, draftFromDetail(t, detail)])) as Drafts;
}

/** Stable string used for dirty-checking (Files can't be JSON'd, so they become a marker). */
export function draftSignature(d: SectionDraft): string {
    return JSON.stringify(d, (k, v) => (k === 'file' && v ? { file: (v as File).name, size: (v as File).size } : v));
}

export function sectionError(type: SectionType, d: SectionDraft): string | null {
    if (!d.enabled) return null;
    for (const [i, it] of d.items.entries()) {
        const n = i + 1;
        if (type === 'faqs' && (!it.question?.trim() || !it.answer?.trim())) return `FAQ #${n} needs a question and an answer.`;
        if (type === 'testimonials' && (!it.name?.trim() || !it.message?.trim())) return `Testimonial #${n} needs a name and a message.`;
        if (type === 'gallery' && !it.file && !it.imagePath) return `Gallery image #${n} is missing.`;
        if (['instructions', 'benefits', 'highlights'].includes(type) && !it.text?.trim()) return `${SECTION_LABELS[type]} item #${n} is empty.`;
    }
    return null;
}

export function draftPayload(type: SectionType, d: SectionDraft): { data: Record<string, unknown>; hasFiles: boolean } {
    let hasFiles = false;
    const items = d.items.map((it) => {
        const id = it.id !== undefined ? { id: it.id } : {};
        if (type === 'faqs') return { ...id, question: it.question?.trim() ?? '', answer: it.answer?.trim() ?? '' };
        if (type === 'testimonials') {
            if (it.file) hasFiles = true;
            return { ...id, name: it.name?.trim() ?? '', message: it.message?.trim() ?? '', ...(it.file ? { avatar: it.file } : {}) };
        }
        if (type === 'gallery') {
            if (it.file) hasFiles = true;
            return { ...id, ...(it.file ? { image: it.file } : {}) };
        }
        return { ...id, text: it.text?.trim() ?? '' };
    });
    return { data: { is_enabled: d.enabled, items }, hasFiles };
}

/* ------------------------------------------------------------------ */
/*  Editors                                                            */
/* ------------------------------------------------------------------ */

export function FileThumb({ file, path, className }: { file?: File | null; path?: string | null; className?: string }) {
    const [url, setUrl] = useState<string>(path ? assetUrl(path) : '');
    useEffect(() => {
        if (file && typeof URL.createObjectURL === 'function') {
            const u = URL.createObjectURL(file);
            setUrl(u);
            return () => URL.revokeObjectURL?.(u);
        }
        setUrl(path ? assetUrl(path) : '');
    }, [file, path]);
    return url ? <img src={url} alt="" className={cn('object-cover', className)} /> : <div className={cn('bg-[#ECEBE6]', className)} />;
}

function TextList({ type, draft, onChange }: { type: SectionType; draft: SectionDraft; onChange: (d: SectionDraft) => void }) {
    const [value, setValue] = useState('');
    const placeholder = { instructions: 'e.g. Watch lessons in order', benefits: 'e.g. 30-day transformation guaranteed', highlights: 'e.g. 12 hours of video' }[type as 'instructions'] ?? 'Add an item';

    function add() {
        const text = value.trim();
        if (!text) return;
        onChange({ ...draft, items: [...draft.items, { key: newKey(), text }] });
        setValue('');
    }

    return (
        <div className="flex flex-col gap-2">
            {draft.items.map((it) => (
                <div key={it.key} className="flex items-center gap-2 rounded-lg bg-[#F6F5F2] py-1 pr-1 pl-3">
                    <input
                        aria-label={`${SECTION_LABELS[type]} item`}
                        value={it.text ?? ''}
                        onChange={(e) => onChange({ ...draft, items: draft.items.map((x) => (x.key === it.key ? { ...x, text: e.target.value } : x)) })}
                        maxLength={255}
                        className="h-8 flex-1 bg-transparent text-sm text-[#14141B] outline-none"
                    />
                    <button type="button" aria-label="Remove item" onClick={() => onChange({ ...draft, items: draft.items.filter((x) => x.key !== it.key) })} className="rounded p-1.5 text-[#D93838] hover:bg-white">
                        <X className="size-4" />
                    </button>
                </div>
            ))}
            <div className="flex gap-2">
                <input
                    aria-label={`New ${SECTION_LABELS[type]} item`}
                    value={value}
                    maxLength={255}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                    className={INPUT}
                />
                <button type="button" onClick={add} disabled={!value.trim()} className="h-10 shrink-0 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#14141B] transition hover:bg-[#F6F5F2] disabled:opacity-50">
                    + Add
                </button>
            </div>
        </div>
    );
}

function FaqList({ draft, onChange }: { draft: SectionDraft; onChange: (d: SectionDraft) => void }) {
    const patch = (key: string, p: Partial<DraftItem>) => onChange({ ...draft, items: draft.items.map((x) => (x.key === key ? { ...x, ...p } : x)) });
    return (
        <div className="flex flex-col gap-3">
            {draft.items.map((it, i) => (
                <div key={it.key} className="flex flex-col gap-2 rounded-lg bg-[#F6F5F2] p-3">
                    <div className="flex items-center gap-2">
                        <input aria-label={`Question ${i + 1}`} value={it.question ?? ''} maxLength={255} onChange={(e) => patch(it.key, { question: e.target.value })} placeholder="Question" className={INPUT} />
                        <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => onChange({ ...draft, items: draft.items.filter((x) => x.key !== it.key) })} className="rounded p-1.5 text-[#D93838] hover:bg-white">
                            <X className="size-4" />
                        </button>
                    </div>
                    <textarea aria-label={`Answer ${i + 1}`} value={it.answer ?? ''} maxLength={5000} rows={2} onChange={(e) => patch(it.key, { answer: e.target.value })} placeholder="Answer" className={TEXTAREA} />
                </div>
            ))}
            <button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, { key: newKey(), question: '', answer: '' }] })} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#DAD8D0] text-sm font-semibold text-[#4F46E5] hover:bg-[#EEF2FF]">
                <Plus className="size-4" /> Add question
            </button>
        </div>
    );
}

function TestimonialList({ draft, onChange }: { draft: SectionDraft; onChange: (d: SectionDraft) => void }) {
    const patch = (key: string, p: Partial<DraftItem>) => onChange({ ...draft, items: draft.items.map((x) => (x.key === key ? { ...x, ...p } : x)) });
    return (
        <div className="flex flex-col gap-3">
            {draft.items.map((it, i) => (
                <div key={it.key} className="flex flex-col gap-2 rounded-lg bg-[#F6F5F2] p-3">
                    <div className="flex items-center gap-3">
                        <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white text-[#8A8A96] hover:text-[#4F46E5]">
                            {it.file || it.imagePath ? <FileThumb file={it.file} path={it.imagePath} className="size-11" /> : <ImagePlus className="size-4" />}
                            <input type="file" accept="image/*" aria-label={`Avatar ${i + 1}`} className="sr-only" onChange={(e) => e.target.files?.[0] && patch(it.key, { file: e.target.files[0] })} />
                        </label>
                        <input aria-label={`Name ${i + 1}`} value={it.name ?? ''} maxLength={150} onChange={(e) => patch(it.key, { name: e.target.value })} placeholder="Student name" className={INPUT} />
                        <button type="button" aria-label={`Remove testimonial ${i + 1}`} onClick={() => onChange({ ...draft, items: draft.items.filter((x) => x.key !== it.key) })} className="rounded p-1.5 text-[#D93838] hover:bg-white">
                            <X className="size-4" />
                        </button>
                    </div>
                    <textarea aria-label={`Message ${i + 1}`} value={it.message ?? ''} maxLength={2000} rows={2} onChange={(e) => patch(it.key, { message: e.target.value })} placeholder="What did they say?" className={TEXTAREA} />
                </div>
            ))}
            <button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, { key: newKey(), name: '', message: '' }] })} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#DAD8D0] text-sm font-semibold text-[#4F46E5] hover:bg-[#EEF2FF]">
                <Plus className="size-4" /> Add testimonial
            </button>
        </div>
    );
}

function GalleryGrid({ draft, onChange }: { draft: SectionDraft; onChange: (d: SectionDraft) => void }) {
    function addFiles(files: FileList | null) {
        if (!files?.length) return;
        const room = Math.max(0, 50 - draft.items.length);
        const added = Array.from(files)
            .slice(0, room)
            .map((file) => ({ key: newKey(), file }));
        onChange({ ...draft, items: [...draft.items, ...added] });
    }
    return (
        <div className="grid grid-cols-3 gap-2">
            {draft.items.map((it, i) => (
                <div key={it.key} className="group relative aspect-square overflow-hidden rounded-lg bg-[#F6F5F2]">
                    <FileThumb file={it.file} path={it.imagePath} className="size-full" />
                    <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => onChange({ ...draft, items: draft.items.filter((x) => x.key !== it.key) })} className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-[#D93838] shadow hover:bg-white">
                        <X className="size-3.5" />
                    </button>
                </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#DAD8D0] text-xs font-semibold text-[#4F46E5] hover:bg-[#EEF2FF]">
                <ImagePlus className="size-5" /> Add images
                <input type="file" accept="image/*" multiple aria-label="Add gallery images" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
        </div>
    );
}

export function SectionEditor({ type, draft, onChange, error }: { type: SectionType; draft: SectionDraft; onChange: (d: SectionDraft) => void; error?: string | null }) {
    return (
        <div className="rounded-xl border border-[#E4E2DA] bg-white p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold tracking-wide text-[#14141B] uppercase">{SECTION_LABELS[type]}</h3>
                <Toggle checked={draft.enabled} onChange={(enabled) => onChange({ ...draft, enabled })} label={`Show ${SECTION_LABELS[type]}`} />
            </div>
            {draft.enabled && (
                <div className="mt-3">
                    {type === 'faqs' ? <FaqList draft={draft} onChange={onChange} /> : type === 'testimonials' ? <TestimonialList draft={draft} onChange={onChange} /> : type === 'gallery' ? <GalleryGrid draft={draft} onChange={onChange} /> : <TextList type={type} draft={draft} onChange={onChange} />}
                    {error && (
                        <p role="alert" className="mt-2 text-xs text-[#D93838]">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
