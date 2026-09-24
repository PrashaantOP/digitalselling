import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { assetUrl, firstError, send } from './api';
import { type Drafts, SECTION_ORDER, SectionEditor, type SectionDraft, sectionError } from './sections';
import { type CourseItem, type FormState, type SectionType } from './types';
import { Field, INPUT, invalid, Notice, PanelTitle, RichText } from './ui';

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Cover images / video                                               */
/* ------------------------------------------------------------------ */

function CoverUploader({ productId, images, videoUrl, onVideoChange, videoError }: { productId: number; images: CourseItem['cover_images']; videoUrl: string; onVideoChange: (v: string) => void; videoError?: string }) {
    const [busy, setBusy] = useState<number | 'upload' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    async function upload(list: FileList | File[] | null) {
        const files = Array.from(list ?? []);
        if (files.length === 0) return;
        if (files.some((f) => !f.type.startsWith('image/'))) return setError('Only image files can be uploaded.');
        if (files.some((f) => f.size > MAX_BYTES)) return setError('Each image must be 5 MB or smaller.');
        if (images.length + files.length > MAX_IMAGES) return setError(`You can add up to ${MAX_IMAGES} cover images (${MAX_IMAGES - images.length} left).`);

        setError(null);
        setBusy('upload');
        const res = await send('post', `/dashboard/products/${productId}/cover-images`, { images: files }, true);
        setBusy(null);
        if (!res.ok) setError(firstError(res.errors, 'Upload failed. Please try again.'));
        if (input.current) input.current.value = '';
    }

    async function remove(id: number) {
        setBusy(id);
        setError(null);
        const res = await send('delete', `/dashboard/cover-images/${id}`);
        setBusy(null);
        if (!res.ok) setError(firstError(res.errors, 'Could not remove the image.'));
    }

    return (
        <div className="flex flex-col gap-3">
            {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {images.map((img, i) => (
                        <div key={img.id} className="group relative aspect-video overflow-hidden rounded-lg bg-[#F6F5F2]">
                            <img src={assetUrl(img.image_path)} alt={`Cover ${i + 1}`} className="size-full object-cover" />
                            <button
                                type="button"
                                aria-label={`Remove cover image ${i + 1}`}
                                disabled={busy !== null}
                                onClick={() => remove(img.id)}
                                className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-[#D93838] shadow hover:bg-white disabled:opacity-50"
                            >
                                {busy === img.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {images.length < MAX_IMAGES && (
                <label
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        upload(e.dataTransfer.files);
                    }}
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition',
                        dragging ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#DAD8D0] bg-[#FAF9F5] hover:bg-[#F6F5F2]',
                    )}
                >
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">{busy === 'upload' ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}</span>
                    <span className="text-sm text-[#14141B]">
                        <span className="font-semibold text-[#4F46E5]">Upload</span> or drag &amp; drop
                    </span>
                    <input ref={input} type="file" accept="image/*" multiple aria-label="Upload cover images" disabled={busy !== null} className="sr-only" onChange={(e) => upload(e.target.files)} />
                </label>
            )}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex items-center gap-3 text-[11px] font-medium text-[#8A8A96]">
                <span className="h-px flex-1 bg-[#E4E2DA]" /> OR <span className="h-px flex-1 bg-[#E4E2DA]" />
            </div>

            <Field label="Video link" htmlFor="cover_video_url" error={videoError} hint="A video link replaces the images on your course page.">
                <input id="cover_video_url" value={videoUrl} onChange={(e) => onVideoChange(e.target.value)} placeholder="Add a video link (YouTube, Vimeo…)" className={cn(INPUT, invalid(videoError))} />
            </Field>
            <p className="text-[11px] text-[#8A8A96]">1280 × 720 (16:9) recommended · up to 5 MB each · up to {MAX_IMAGES} images shown as a carousel</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Tab                                                                */
/* ------------------------------------------------------------------ */

export function PageTab({
    item,
    form,
    setField,
    errors,
    drafts,
    setDraft,
}: {
    item: CourseItem;
    form: FormState;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    errors: Record<string, string>;
    drafts: Drafts;
    setDraft: (type: SectionType, draft: SectionDraft) => void;
}) {
    return (
        <div className="flex flex-col gap-7">
            <PanelTitle>Tell us about your course</PanelTitle>

            <Field label="Course title" htmlFor="course_title" required counter={`${form.title.length}/150`} error={errors.title}>
                <input id="course_title" value={form.title} maxLength={150} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Figma for Beginners" className={cn(INPUT, invalid(errors.title))} />
            </Field>

            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">Cover images</span>
                <CoverUploader productId={item.id} images={item.cover_images} videoUrl={form.cover_video_url} onVideoChange={(v) => setField('cover_video_url', v)} videoError={errors.cover_video_url} />
            </div>

            <Field label="Description" htmlFor="course_description" counter={`${form.description.length}/20000`} error={errors.description}>
                <RichText id="course_description" value={form.description} onChange={(v) => setField('description', v)} placeholder="Tell learners what they will gain from this course, what they will miss if they don't enroll, and why now is the right time to join." error={Boolean(errors.description)} />
            </Field>

            <Field label="Button text" htmlFor="button_text" required counter={`${form.button_text.length}/30`} error={errors.button_text}>
                <input id="button_text" value={form.button_text} maxLength={30} onChange={(e) => setField('button_text', e.target.value)} placeholder="Enroll now" className={cn(INPUT, invalid(errors.button_text))} />
            </Field>

            <div className="flex flex-col gap-3">
                <PanelTitle>Optional sections</PanelTitle>
                {SECTION_ORDER.map((type) => (
                    <SectionEditor key={type} type={type} draft={drafts[type]} onChange={(d) => setDraft(type, d)} error={sectionError(type, drafts[type])} />
                ))}
            </div>
        </div>
    );
}
