import { firstError, send } from '@/components/course-editor/api';
import { CourseTab } from '@/components/course-editor/course-tab';
import { PageTab } from '@/components/course-editor/page-tab';
import { CoursePreview, type Device } from '@/components/course-editor/preview';
import { type Drafts, draftPayload, draftsFromDetail, draftSignature, SECTION_ORDER, type SectionDraft, sectionError } from '@/components/course-editor/sections';
import { SettingsTab } from '@/components/course-editor/settings-tab';
import { type CourseItem, type FormState, formPayload, HEX_RE, normalizeItem, type SectionType, toFormState } from '@/components/course-editor/types';
import { Modal } from '@/components/course-editor/ui';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { Check, ExternalLink, Eye, Loader2, Monitor, Pencil, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'page' | 'course' | 'settings';
type Banner = { kind: 'success' | 'error'; text: string; link?: string } | null;

const TABS: { key: Tab; label: string }[] = [
    { key: 'page', label: 'Page details' },
    { key: 'course', label: 'Course' },
    { key: 'settings', label: 'Settings' },
];

const TAB_FIELDS: Record<Exclude<Tab, 'settings'>, string[]> = {
    page: ['title', 'description', 'cover_video_url', 'cover_type', 'button_text'],
    course: ['pricing_type', 'price', 'has_discount', 'discounted_price', 'access_type', 'access_days', 'certificate_enabled'],
};

const tabOf = (field: string): Tab => (TAB_FIELDS.page.includes(field) ? 'page' : TAB_FIELDS.course.includes(field) ? 'course' : 'settings');

const STATUS_CHIP: Record<CourseItem['status'], { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-[#FFF4DB] text-[#B46E00]' },
    published: { label: 'Live', cls: 'bg-[#E6F6EC] text-[#059669]' },
    unpublished: { label: 'Unpublished', cls: 'bg-[#F0EFEA] text-[#6B6B78]' },
};

function validateForm(f: FormState): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = 'Add a course title.';
    if (!f.button_text.trim()) e.button_text = 'Add the button text.';
    if (!f.slug.trim() || !/^[A-Za-z0-9_-]+$/.test(f.slug.trim())) e.slug = 'Add a page URL — letters, numbers and dashes only.';
    if (f.cover_video_url.trim()) {
        try {
            new URL(f.cover_video_url.trim());
        } catch {
            e.cover_video_url = 'Enter a valid video link (https://…).';
        }
    }
    if (f.pricing_type === 'fixed' && f.has_discount && Number(f.discounted_price) >= (Number(f.price) || 0)) e.discounted_price = 'Discounted price must be lower than the price.';
    if (f.access_type === 'days' && !(Number(f.access_days) >= 1 && Number(f.access_days) <= 3650)) e.access_days = 'Enter a number of days between 1 and 3650.';
    if (!HEX_RE.test(f.accent_color)) e.accent_color = 'Pick a valid colour.';
    return e;
}

export default function CourseEdit({ item: rawItem, publicUrl }: { item: CourseItem; publicUrl: string }) {
    const item = normalizeItem(rawItem);
    const [tab, setTab] = useState<Tab>('page');
    const [form, setForm] = useState<FormState>(() => toFormState(item));
    const [baseline, setBaseline] = useState(() => JSON.stringify(toFormState(item)));
    const [drafts, setDrafts] = useState<Drafts>(() => draftsFromDetail(normalizeItem(rawItem).course_detail));
    const [draftBase, setDraftBase] = useState<Record<SectionType, string>>(() => Object.fromEntries(SECTION_ORDER.map((t) => [t, draftSignature(draftsFromDetail(normalizeItem(rawItem).course_detail)[t])])) as Record<SectionType, string>);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [banner, setBanner] = useState<Banner>(null);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [device, setDevice] = useState<Device>('desktop');
    const [pane, setPane] = useState<'edit' | 'preview'>('edit');
    const [confirmClose, setConfirmClose] = useState(false);
    const resetQueue = useRef<Set<SectionType>>(new Set());
    const autoSaveStarted = useRef(false);
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const detail = item.course_detail;
    const formDirty = JSON.stringify(form) !== baseline;
    const dirtySections = useMemo(() => SECTION_ORDER.filter((t) => draftSignature(drafts[t]) !== draftBase[t]), [drafts, draftBase]);
    const dirty = formDirty || dirtySections.length > 0;
    const busy = saving || publishing;

    // a section was saved → the server sent fresh rows (with ids); adopt them as the new baseline
    useEffect(() => {
        // Do not consume the queue while the request is still in flight. Inertia
        // can render the old props during the save, which would undo the toggle.
        if (saving || resetQueue.current.size === 0) return;
        const fresh = draftsFromDetail(item.course_detail);
        const types = [...resetQueue.current];
        resetQueue.current.clear();
        setDrafts((d) => Object.fromEntries(SECTION_ORDER.map((t) => [t, types.includes(t) ? fresh[t] : d[t]])) as Drafts);
        setDraftBase((b) => Object.fromEntries(SECTION_ORDER.map((t) => [t, types.includes(t) ? draftSignature(fresh[t]) : b[t]])) as Record<SectionType, string>);
    }, [item, saving]);

    useEffect(() => {
        if (!dirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [dirty]);

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => (e[key] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
    }

    function setDraft(type: SectionType, draft: SectionDraft) {
        setDrafts((d) => ({ ...d, [type]: draft }));
    }

    function showErrors(next: Record<string, string>) {
        setErrors(next);
        const first = Object.keys(next)[0];
        if (first) setTab(tabOf(first));
    }

    /** Saves the main form + every changed optional section. Lesson/coupon/question edits save on their own. */
    async function saveAll(silent = false): Promise<boolean> {
        setBanner(null);

        if (formDirty) {
            const problems = validateForm(form);
            if (Object.keys(problems).length) {
                if (silent) return false;
                showErrors(problems);
                return false;
            }
        }
        const badSection = dirtySections.map((t) => sectionError(t, drafts[t])).find(Boolean);
        if (badSection) {
            if (silent) return false;
            setTab('page');
            setBanner({ kind: 'error', text: badSection });
            return false;
        }

        setSaving(true);
        let ok = true;

        if (formDirty) {
            const snapshot = JSON.stringify(form);
            const res = await send('put', `/dashboard/courses/${item.uuid}`, formPayload(form));
            if (res.ok) {
                setBaseline(snapshot);
                setErrors({});
            } else {
                ok = false;
                if (Object.keys(res.errors).length) showErrors(res.errors);
                else setBanner({ kind: 'error', text: 'Could not save your changes. Please try again.' });
            }
        }

        if (ok) {
            const sectionsToSave = silent ? dirtySections.filter((t) => !sectionError(t, drafts[t])) : dirtySections;
            for (const type of sectionsToSave) {
                const { data, hasFiles } = draftPayload(type, drafts[type]);
                resetQueue.current.add(type);
                const res = await send('put', `/dashboard/courses/${item.uuid}/sections/${type}`, data, hasFiles);
                if (!res.ok) {
                    resetQueue.current.delete(type);
                    setTab('page');
                    setBanner({ kind: 'error', text: firstError(res.errors, 'Could not save an optional section.') });
                    ok = false;
                    break;
                }
            }
        }

        setSaving(false);
        return ok;
    }

    useEffect(() => {
        if (!autoSaveStarted.current) {
            autoSaveStarted.current = true;
            return;
        }

        if (!dirty || busy) return;
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(() => {
            void saveAll(true);
        }, 900);

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [form, drafts, dirty, busy]);

    async function saveDraft() {
        if (!dirty) return setBanner({ kind: 'success', text: 'Everything is already saved.' });
        if (await saveAll()) setBanner({ kind: 'success', text: 'Changes saved.' });
    }

    async function setPublished(publish: boolean) {
        setPublishing(true);
        setBanner(null);
        if (publish && !(await saveAll())) return setPublishing(false);
        const res = await send('post', `/dashboard/courses/${item.uuid}/publish`, { status: publish ? 'published' : 'unpublished' });
        setPublishing(false);
        if (res.ok) {
            const liveUrl = publicUrl.replace(/\/[^/]*$/, `/${form.slug}`);
            setBanner({ kind: 'success', text: publish ? 'Your course is live.' : 'Course unpublished.', link: publish ? liveUrl : undefined });
        }
        else setBanner({ kind: 'error', text: firstError(res.errors, `Could not ${publish ? 'publish' : 'unpublish'} the course.`) });
    }

    function close() {
        if (dirty) setConfirmClose(true);
        else router.visit('/dashboard/courses');
    }

    const chip = STATUS_CHIP[item.status] ?? STATUS_CHIP.draft;
    const published = item.status === 'published';
    const tabHasError = (t: Tab) => Object.keys(errors).some((k) => tabOf(k) === t);

    return (
        <>
            <Head title={`${form.title.trim() || 'Untitled course'} · Edit course`} />
            <div className="fixed inset-0 z-40 flex bg-[#ECEBE6]">
                {/* ---------------- Editor panel ---------------- */}
                <section className={cn('flex h-full w-full flex-col border-r border-[#E4E2DA] bg-white lg:w-[520px] lg:shrink-0', pane === 'preview' && 'hidden lg:flex')}>
                    <header>
                        <div className="flex items-center gap-3 px-5 py-4">
                            <button type="button" onClick={close} aria-label="Close editor" className="rounded-lg p-1.5 text-[#4B4B57] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                                <X className="size-5" />
                            </button>
                            <h1 className="min-w-0 flex-1 truncate text-sm font-bold tracking-wide text-[#14141B] uppercase">{form.title.trim() || 'Untitled course'}</h1>
                            <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase', chip.cls)}>{chip.label}</span>
                            <button type="button" onClick={() => setPane('preview')} className="flex items-center gap-1 rounded-lg border border-[#E4E2DA] px-2.5 py-1 text-xs font-semibold text-[#14141B] lg:hidden">
                                <Eye className="size-3.5" /> Preview
                            </button>
                        </div>
                        <div role="tablist" className="flex gap-1 border-b border-[#E4E2DA] px-5">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    role="tab"
                                    type="button"
                                    aria-selected={tab === t.key}
                                    onClick={() => setTab(t.key)}
                                    className={cn('relative px-3 py-3 text-sm font-semibold transition-colors', tab === t.key ? 'text-[#14141B] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[#4F46E5]' : 'text-[#8A8A96] hover:text-[#14141B]')}
                                >
                                    {t.label}
                                    {tabHasError(t.key) && <span className="absolute top-2.5 -right-0.5 size-1.5 rounded-full bg-[#D93838]" aria-label="Has errors" />}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-6">
                        {/* all tabs stay mounted so unsaved edits survive tab switches */}
                        <div role="tabpanel" hidden={tab !== 'page'}>
                            <PageTab item={item} form={form} setField={setField} errors={errors} drafts={drafts} setDraft={setDraft} />
                        </div>
                        <div role="tabpanel" hidden={tab !== 'course'}>
                            {detail ? (
                                <CourseTab courseId={item.uuid} modules={detail.modules} liveClasses={detail.live_classes} form={form} setField={setField} errors={errors} />
                            ) : (
                                <p role="alert" className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">
                                    Course details are missing for this product. Please re-create the course.
                                </p>
                            )}
                        </div>
                        <div role="tabpanel" hidden={tab !== 'settings'}>
                            <SettingsTab productId={item.id} form={form} setField={setField} errors={errors} questions={item.checkout_questions} coupons={item.coupons} />
                        </div>
                    </div>

                    {banner && (
                        <div role={banner.kind === 'error' ? 'alert' : 'status'} className={cn('mx-5 mb-2 flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-xs font-medium', banner.kind === 'error' ? 'bg-[#FFEDE8] text-[#C2410C]' : 'bg-[#E6F6EC] text-[#059669]')}>
                            <span>
                                {banner.text}
                                {banner.link && (
                                    <a href={banner.link} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 font-bold underline">
                                        View live page <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </span>
                            <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss" className="shrink-0 rounded hover:bg-white/60">
                                <X className="size-3.5" />
                            </button>
                        </div>
                    )}

                    <footer className="flex items-center gap-3 border-t border-[#E4E2DA] bg-white px-5 py-3">
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium" data-testid="save-state">
                            {saving ? (
                                <span className="flex items-center gap-1.5 text-[#6B6B78]">
                                    <Loader2 className="size-3.5 animate-spin" /> Saving…
                                </span>
                            ) : dirty ? (
                                <span className="flex items-center gap-1.5 text-[#B46E00]">
                                    <span className="size-2 rounded-full bg-amber-500" /> Unsaved changes
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-[#059669]">
                                    <Check className="size-3.5" /> All saved
                                </span>
                            )}
                        </span>
                        {published ? (
                            <>
                                <button type="button" onClick={() => setPublished(false)} disabled={busy} className="h-10 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#4B4B57] transition hover:bg-[#F6F5F2] disabled:opacity-50">
                                    Unpublish
                                </button>
                                <button type="button" onClick={saveDraft} disabled={busy || !dirty} className="flex h-10 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-50">
                                    {saving && <Loader2 className="size-4 animate-spin" />} Save changes
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={saveDraft} disabled={busy} className="h-10 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#4B4B57] transition hover:bg-[#F6F5F2] disabled:opacity-50">
                                    Save draft
                                </button>
                                <button type="button" onClick={() => setPublished(true)} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-50">
                                    {publishing && <Loader2 className="size-4 animate-spin" />} Publish →
                                </button>
                            </>
                        )}
                    </footer>
                </section>

                {/* ---------------- Live preview (dark stage, like event edit) ---------------- */}
                <section
                    className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A12]', pane === 'edit' && 'hidden lg:flex')}
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 md:px-6">
                        <div>
                            <h2 className="text-[13px] font-semibold text-white">Preview</h2>
                            <p className="text-[11px] text-white/50">This is exactly what your visitors see.</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => setPane('edit')} className="mr-1 flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white lg:hidden">
                                <Pencil className="size-3.5" /> Edit
                            </button>
                            <div role="group" aria-label="Preview device" className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
                                <button type="button" onClick={() => setDevice('desktop')} aria-pressed={device === 'desktop'} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition', device === 'desktop' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white')}>
                                    <Monitor className="size-3.5" /> Desktop
                                </button>
                                <button type="button" onClick={() => setDevice('mobile')} aria-pressed={device === 'mobile'} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition', device === 'mobile' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white')}>
                                    <Smartphone className="size-3.5" /> Mobile
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="no-scrollbar flex min-h-0 flex-1 items-start justify-center overflow-hidden p-4 md:p-6 xl:p-8">
                        <CoursePreview form={form} detail={detail} coverImages={item.cover_images} checkoutQuestions={item.checkout_questions} drafts={drafts} device={device} host={window.location.host} />
                    </div>
                </section>
            </div>

            <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="Discard unsaved changes?">
                <p className="text-sm text-[#6B6B78]">You have changes that haven't been saved. If you leave now, they will be lost.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirmClose(false)} className="h-9 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#4B4B57] hover:bg-[#F6F5F2]">
                        Keep editing
                    </button>
                    <button type="button" onClick={() => router.visit('/dashboard/courses')} className="h-9 rounded-lg bg-[#D93838] px-4 text-sm font-semibold text-white hover:bg-[#B92D2D]">
                        Discard &amp; leave
                    </button>
                </div>
            </Modal>
        </>
    );
}
