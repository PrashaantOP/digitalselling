import { cn } from '@/lib/utils';
import { Award, BookOpen, Check, ChevronDown, ClipboardCheck, Clock, FileText, Headphones, ListChecks, Lock, Play, Video, type LucideIcon } from 'lucide-react';
import { assetUrl } from './api';
import { type Drafts, FileThumb } from './sections';
import { type CheckoutQuestion, type CourseDetail, DEFAULT_ACCENT, type FormState, HEX_RE, type ThemeKey } from './types';
import { sanitizeHtml, toEditorHtml } from './ui';

const LESSON_ICONS: Record<string, LucideIcon> = {
    video: Video,
    text_image: BookOpen,
    audio: Headphones,
    quiz: ListChecks,
    assignment: ClipboardCheck,
    notes_pdf: FileText,
};

export type Device = 'desktop' | 'mobile';

const THEMES: Record<ThemeKey, { page: string; text: string; muted: string; card: string; border: string; input: string }> = {
    default: { page: '#FAF9F5', text: '#14141B', muted: '#6B6B78', card: '#FFFFFF', border: '#E4E2DA', input: '#FFFFFF' },
    light: { page: '#FFFFFF', text: '#14141B', muted: '#6B6B78', card: '#F7F7F8', border: '#E8E8EC', input: '#FFFFFF' },
    dark: { page: '#14141B', text: '#F6F5F2', muted: '#A1A1B0', card: '#1E1E28', border: '#2E2E3C', input: '#14141B' },
};

const money = (n: number | string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);

interface Props {
    form: FormState;
    detail: CourseDetail | null;
    coverImages: { id: number; image_path: string }[];
    checkoutQuestions: CheckoutQuestion[];
    drafts: Drafts;
    device: Device;
    host: string;
}

export function CoursePreview({ form, detail, coverImages, checkoutQuestions, drafts, device, host }: Props) {
    const t = THEMES[form.theme] ?? THEMES.default;
    const accent = HEX_RE.test(form.accent_color) ? form.accent_color : DEFAULT_ACCENT;
    const mobile = device === 'mobile';

    const modules = (detail?.modules ?? []).map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.is_published) })).filter((m) => m.lessons.length > 0);
    const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);

    const price = Number(form.price) || 0;
    const discounted = form.pricing_type === 'fixed' && form.has_discount && Number(form.discounted_price) > 0 && Number(form.discounted_price) < price;
    const shownPrice = form.pricing_type === 'free' ? 'Free' : form.pricing_type === 'customer_decides' ? 'Pay what you want' : money(discounted ? form.discounted_price : price);
    const cta = form.button_text.trim() || 'Enroll now';
    const accessText = form.access_type === 'days' ? `${form.access_days || '—'} days access` : 'Lifetime access';
    const on = (k: keyof Drafts) => drafts[k].enabled && drafts[k].items.length > 0;
    const description = sanitizeHtml(toEditorHtml(form.description));

    const label = (text: string) => (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {text}
        </h3>
    );

    const main = (
        <div className="flex min-w-0 flex-col gap-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words" style={{ color: t.text }}>
                    {form.title.trim() || 'Untitled course'}
                </h1>
            </div>

            {(coverImages.length > 0 || form.cover_video_url.trim()) && (
                <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${t.border}` }}>
                    {form.cover_video_url.trim() ? (
                        <div className="flex aspect-video items-center justify-center gap-2 text-sm" style={{ background: t.card, color: t.muted }}>
                            <Play className="size-5" style={{ color: accent }} /> <span className="max-w-[70%] truncate">{form.cover_video_url}</span>
                        </div>
                    ) : (
                        <div className="relative">
                            <img src={assetUrl(coverImages[0].image_path)} alt="" className="aspect-video w-full object-cover" />
                            {coverImages.length > 1 && <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">1 / {coverImages.length}</span>}
                        </div>
                    )}
                </div>
            )}

            <div>
                {label('About the course')}
                {description ? (
                    <div className="text-[15px] leading-relaxed [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc" style={{ color: t.text }} dangerouslySetInnerHTML={{ __html: description }} />
                ) : (
                    <p className="text-[15px] leading-relaxed" style={{ color: t.muted }}>
                        Tell learners what they will gain from this course, what they will miss if they don't enroll, and why now is the right time to join.
                    </p>
                )}
            </div>

            {on('highlights') && (
                <div>
                    {label('Highlights')}
                    <div className="flex flex-wrap gap-2">
                        {drafts.highlights.items.map((h) => (
                            <span key={h.key} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${accent}1A`, color: accent }}>
                                {h.text || '…'}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {(on('benefits') || form.certificate_enabled) && (
                <div>
                    {label('What you get')}
                    <ul className="flex flex-col gap-2.5">
                        {(on('benefits') ? drafts.benefits.items : []).map((b) => (
                            <li key={b.key} className="flex items-center gap-3 text-[15px]" style={{ color: t.text }}>
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                                    <Check className="size-3" />
                                </span>
                                {b.text || '…'}
                            </li>
                        ))}
                        {form.certificate_enabled && (
                            <li className="flex items-center gap-3 text-[15px]" style={{ color: t.text }}>
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                                    <Award className="size-3" />
                                </span>
                                Certificate of completion
                            </li>
                        )}
                    </ul>
                </div>
            )}

            <div>
                {label('Course content')}
                {modules.length === 0 ? (
                    <p className="rounded-xl p-4 text-sm" style={{ border: `1px dashed ${t.border}`, color: t.muted }}>
                        No published lessons yet — publish at least one lesson to show your syllabus.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {modules.map((m, i) => (
                            <div key={m.id} className="overflow-hidden rounded-xl" style={{ background: t.card, border: `1px solid ${t.border}` }}>
                                <div className="px-4 py-3 text-sm font-bold" style={{ color: t.text, borderBottom: `1px solid ${t.border}` }}>
                                    Module {i + 1}: {m.title}
                                </div>
                                {m.lessons.map((l) => {
                                    const Icon = LESSON_ICONS[l.type] ?? FileText;
                                    return (
                                        <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{ color: t.text }}>
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: t.page, color: t.muted }}>
                                                <Icon className="size-3" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase" style={{ border: `1px solid ${t.border}`, color: l.is_free_preview ? accent : t.muted }}>
                                                {l.is_free_preview ? 'Free preview' : (
                                                    <>
                                                        <Lock className="size-2.5" /> Locked
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(detail?.live_classes.length ?? 0) > 0 && (
                <div>
                    {label('Live classes')}
                    <div className="flex flex-col gap-2">
                        {detail!.live_classes.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text }}>
                                <Video className="size-4 shrink-0" style={{ color: accent }} />
                                <span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span>
                                <span className="text-xs" style={{ color: t.muted }}>
                                    {new Date(c.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {on('instructions') && (
                <div>
                    {label('Instructions')}
                    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]" style={{ color: t.text }}>
                        {drafts.instructions.items.map((i) => (
                            <li key={i.key}>{i.text || '…'}</li>
                        ))}
                    </ul>
                </div>
            )}

            {on('gallery') && (
                <div>
                    {label('Gallery')}
                    <div className={cn('grid gap-2', mobile ? 'grid-cols-2' : 'grid-cols-3')}>
                        {drafts.gallery.items.map((g) => (
                            <FileThumb key={g.key} file={g.file} path={g.imagePath} className="aspect-square w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            )}

            {on('testimonials') && (
                <div>
                    {label('Testimonials')}
                    <div className="flex flex-col gap-3">
                        {drafts.testimonials.items.map((x) => (
                            <div key={x.key} className="rounded-xl p-4" style={{ background: t.card, border: `1px solid ${t.border}` }}>
                                <p className="text-sm" style={{ color: t.text }}>
                                    “{x.message || '…'}”
                                </p>
                                <p className="mt-2 text-xs font-bold" style={{ color: t.muted }}>
                                    — {x.name || 'Student'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {on('faqs') && (
                <div>
                    {label('FAQ')}
                    <div className="flex flex-col gap-2">
                        {drafts.faqs.items.map((f) => (
                            <div key={f.key} className="rounded-xl px-4 py-3" style={{ background: t.card, border: `1px solid ${t.border}` }}>
                                <div className="flex items-center justify-between gap-2 text-sm font-semibold" style={{ color: t.text }}>
                                    {f.question || 'Question'} <ChevronDown className="size-4 shrink-0" style={{ color: t.muted }} />
                                </div>
                                {f.answer && (
                                    <p className="mt-1.5 text-sm" style={{ color: t.muted }}>
                                        {f.answer}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const fakeInput = (text: string, prefix?: string) => (
        <div className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm" style={{ background: t.input, border: `1px solid ${t.border}`, color: t.muted }}>
            {prefix && <span className="pr-2" style={{ borderRight: `1px solid ${t.border}` }}>{prefix}</span>}
            {text}
        </div>
    );

    const side = (
        <aside className="flex flex-col gap-3 rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text }}>
            <div className="flex items-center gap-2.5 text-sm">
                <Video className="size-4" style={{ color: t.muted }} /> {lessonCount} {lessonCount === 1 ? 'in-depth lesson' : 'in-depth lessons'}
            </div>
            <div className="flex items-center gap-2.5 text-sm">
                <Clock className="size-4" style={{ color: t.muted }} /> {accessText}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{shownPrice}</span>
                {discounted && (
                    <span className="text-sm line-through" style={{ color: t.muted }}>
                        {money(price)}
                    </span>
                )}
            </div>
            <p className="text-xs" style={{ color: t.muted }}>
                Access to this purchase will be sent to this email
            </p>
            {fakeInput('Full name')}
            {fakeInput('Email address')}
            {fakeInput('Phone number', '+91')}
            {/* email/phone upar hamesha dikhte hain; baaki sirf tab jab creator ne on rakha ho */}
            {checkoutQuestions
                .filter((q) => q.is_enabled && !['email', 'phone'].includes(q.field_type))
                .map((q) => (
                    <div key={q.id}>{fakeInput(`${q.label}${q.is_required ? '' : ' (optional)'}`)}</div>
                ))}
            <button type="button" disabled className="flex h-12 w-full cursor-not-allowed items-center justify-between rounded-lg px-4 text-sm font-extrabold tracking-wide text-white uppercase opacity-90" style={{ background: accent }}>
                <span className="truncate">{cta}</span>
                <span className="shrink-0">{form.pricing_type === 'customer_decides' ? '' : `${shownPrice} →`}</span>
            </button>
        </aside>
    );

    return (
        <div className={cn('mx-auto flex h-[min(720px,calc(100vh-150px))] w-full transition-all', mobile ? 'max-w-[390px]' : 'max-w-[1040px]')}>
            <div className={cn('flex h-full w-full flex-col overflow-hidden shadow-xl', mobile ? 'rounded-[2.5rem] border-[10px] border-[#14141B]' : 'rounded-xl border border-[#DAD8D0]')} style={{ background: t.page }}>
                {mobile ? (
                    <div className="mx-auto my-1 h-1.5 w-20 rounded-full bg-[#14141B]/80" />
                ) : (
                    <div className="flex items-center gap-2 bg-[#2A2A35] px-4 py-3">
                        <span className="size-3 rounded-full bg-[#FF5F57]" />
                        <span className="size-3 rounded-full bg-[#FEBC2E]" />
                        <span className="size-3 rounded-full bg-[#28C840]" />
                        <span data-testid="preview-url" className="mx-auto max-w-[60%] truncate rounded-md bg-[#14141B] px-4 py-1 text-[11px] text-[#C9C9D4]">
                            {host}/c/{form.slug || 'your-course'}
                        </span>
                    </div>
                )}
                <div className="h-1" style={{ background: accent }} />
                <div className={cn('no-scrollbar min-h-0 flex-1 overflow-y-auto p-6', mobile ? 'flex flex-col gap-6' : 'grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 p-8')}>
                    {mobile ? (
                        <>
                            {main}
                            {side}
                        </>
                    ) : (
                        <>
                            {main}
                            <div className="sticky top-4">{side}</div>
                        </>
                    )}
                </div>
                <div className="h-6" />
            </div>
        </div>
    );
}

