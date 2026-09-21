import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, ClipboardCheck, FileText, Headphones, ListChecks, Loader2, Pencil, Plus, Trash2, Video, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { firstError, send } from './api';
import { LessonContentEditor } from './lesson-content';
import { normalizeModules, type FormState, type Lesson, type LessonType, LESSON_TYPES, type LiveClass, type Module, type PricingType } from './types';
import { Card, Field, IconBtn, INPUT, invalid, Modal, Notice, PanelTitle, TEXTAREA, Toggle } from './ui';

const LESSON_ICONS: Record<LessonType, LucideIcon> = { video: Video, text_image: BookOpen, audio: Headphones, quiz: ListChecks, assignment: ClipboardCheck, notes_pdf: FileText };

/* ------------------------------------------------------------------ */
/*  Syllabus                                                           */
/* ------------------------------------------------------------------ */

type Doomed = { kind: 'module' | 'lesson'; id: number; title: string };

function Syllabus({ courseId, modules: rawModules }: { courseId: string; modules: Module[] }) {
    const modules = normalizeModules(rawModules);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [pickerFor, setPickerFor] = useState<number | null>(null);
    const [doomed, setDoomed] = useState<Doomed | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saves, setSaves] = useState<Record<number, number>>({});
    const pending = useRef<{ moduleId: number; known: number[] } | null>(null);

    // after "add lesson" the server refreshes the tree — open the lesson that just appeared
    useEffect(() => {
        const p = pending.current;
        if (!p) return;
        const fresh = modules.find((m) => m.id === p.moduleId)?.lessons.find((l) => !p.known.includes(l.id));
        if (fresh) {
            setExpanded(fresh.id);
            pending.current = null;
        }
    }, [modules]);

    async function run(action: () => Promise<{ ok: boolean; errors: Record<string, string> }>, fallback: string) {
        setBusy(true);
        setError(null);
        const res = await action();
        setBusy(false);
        if (!res.ok) setError(firstError(res.errors, fallback));
        return res.ok;
    }

    const addModule = () => run(() => send('post', `/dashboard/courses/${courseId}/modules`, { title: `Module ${modules.length + 1}` }), 'Could not add the module.');
    const renameModule = (m: Module, title: string) => title.trim() && title.trim() !== m.title && run(() => send('put', `/dashboard/modules/${m.id}`, { title: title.trim() }), 'Could not rename the module.');
    const renameLesson = (l: Lesson, title: string) => title.trim() && title.trim() !== l.title && run(() => send('put', `/dashboard/lessons/${l.id}`, { title: title.trim() }), 'Could not rename the lesson.');
    const patchLesson = (l: Lesson, patch: Partial<Pick<Lesson, 'is_published' | 'is_free_preview'>>) => run(() => send('put', `/dashboard/lessons/${l.id}`, patch), 'Could not update the lesson.');

    function moveModule(index: number, dir: -1 | 1) {
        const order = modules.map((m) => m.id);
        [order[index], order[index + dir]] = [order[index + dir], order[index]];
        return run(() => send('post', '/dashboard/modules/reorder', { order }), 'Could not reorder modules.');
    }

    function moveLesson(m: Module, index: number, dir: -1 | 1) {
        const list = [...m.lessons];
        [list[index], list[index + dir]] = [list[index + dir], list[index]];
        return run(() => send('post', '/dashboard/lessons/reorder', { items: list.map((l) => ({ id: l.id, module_id: m.id })) }), 'Could not reorder lessons.');
    }

    async function addLesson(moduleId: number, type: LessonType) {
        const meta = LESSON_TYPES.find((t) => t.key === type)!;
        pending.current = { moduleId, known: modules.find((m) => m.id === moduleId)?.lessons.map((l) => l.id) ?? [] };
        setPickerFor(null);
        const ok = await run(() => send('post', `/dashboard/modules/${moduleId}/lessons`, { title: `New ${meta.label.toLowerCase()} lesson`, type }), 'Could not add the lesson.');
        if (!ok) pending.current = null;
    }

    async function confirmDelete() {
        if (!doomed) return;
        const ok = await run(() => send('delete', doomed.kind === 'module' ? `/dashboard/modules/${doomed.id}` : `/dashboard/lessons/${doomed.id}`), `Could not delete the ${doomed.kind}.`);
        if (ok) {
            if (doomed.kind === 'lesson' && expanded === doomed.id) setExpanded(null);
            setDoomed(null);
        } else setDoomed(null);
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <Notice tone="error">{error}</Notice>}

            {modules.length === 0 && <p className="rounded-xl border border-dashed border-[#DAD8D0] bg-[#FAF9F5] p-5 text-center text-xs text-[#8A8A96]">Your syllabus is empty. Add a module, then add lessons to it.</p>}

            {modules.map((m, mi) => (
                <div key={m.id} className="rounded-xl border border-[#E4E2DA] bg-[#FAF9F5] p-3">
                    <div className="flex items-center gap-1">
                        <input
                            key={`${m.id}:${m.title}`}
                            aria-label={`Module ${mi + 1} title`}
                            defaultValue={m.title}
                            maxLength={150}
                            onBlur={(e) => renameModule(m, e.target.value)}
                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm font-semibold text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                        />
                        <IconBtn label={`Move module ${mi + 1} up`} disabled={busy || mi === 0} onClick={() => moveModule(mi, -1)}>
                            <ArrowUp className="size-4" />
                        </IconBtn>
                        <IconBtn label={`Move module ${mi + 1} down`} disabled={busy || mi === modules.length - 1} onClick={() => moveModule(mi, 1)}>
                            <ArrowDown className="size-4" />
                        </IconBtn>
                        <IconBtn label={`Delete module ${mi + 1}`} danger disabled={busy} onClick={() => setDoomed({ kind: 'module', id: m.id, title: m.title })}>
                            <X className="size-4" />
                        </IconBtn>
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                        {m.lessons.map((l, li) => {
                            const Icon = LESSON_ICONS[l.type] ?? FileText;
                            const open = expanded === l.id;
                            return (
                                <div key={l.id} className="rounded-lg border border-[#E4E2DA] bg-white">
                                    <div className="flex items-center gap-1 px-2 py-1.5">
                                        <button type="button" aria-label={open ? `Collapse ${l.title}` : `Expand ${l.title}`} aria-expanded={open} onClick={() => setExpanded(open ? null : l.id)} className="rounded p-1.5 text-[#8A8A96] hover:bg-[#F0EFEA]">
                                            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
                                        </button>
                                        <Icon className="size-4 shrink-0 text-[#4F46E5]" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#14141B]">{l.title}</span>
                                        <span className="hidden shrink-0 rounded bg-[#F0EFEA] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#6B6B78] uppercase sm:inline">{l.type.replace('_', ' ').replace('text image', 'text')}</span>
                                        <button
                                            type="button"
                                            aria-label={l.is_published ? `Unpublish ${l.title}` : `Publish ${l.title}`}
                                            disabled={busy}
                                            onClick={() => patchLesson(l, { is_published: !l.is_published })}
                                            className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase transition', l.is_published ? 'bg-[#E6F6EC] text-[#059669] hover:bg-[#D5F0DE]' : 'bg-[#F0EFEA] text-[#6B6B78] hover:bg-[#E6E4DC]')}
                                        >
                                            {l.is_published ? 'Published' : 'Draft'}
                                        </button>
                                        <IconBtn label={`Move ${l.title} up`} disabled={busy || li === 0} onClick={() => moveLesson(m, li, -1)}>
                                            <ArrowUp className="size-3.5" />
                                        </IconBtn>
                                        <IconBtn label={`Move ${l.title} down`} disabled={busy || li === m.lessons.length - 1} onClick={() => moveLesson(m, li, 1)}>
                                            <ArrowDown className="size-3.5" />
                                        </IconBtn>
                                        <IconBtn label={`Delete ${l.title}`} danger disabled={busy} onClick={() => setDoomed({ kind: 'lesson', id: l.id, title: l.title })}>
                                            <X className="size-3.5" />
                                        </IconBtn>
                                    </div>
                                    {open && (
                                        <div className="flex flex-col gap-4 border-t border-[#E4E2DA] p-4">
                                            <Field label="Lesson title" htmlFor={`lesson-title-${l.id}`}>
                                                <input key={`${l.id}:${l.title}`} id={`lesson-title-${l.id}`} defaultValue={l.title} maxLength={150} onBlur={(e) => renameLesson(l, e.target.value)} className={INPUT} />
                                            </Field>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center justify-between rounded-lg bg-[#F6F5F2] px-3 py-2.5">
                                                    <span className="text-xs font-medium text-[#14141B]">Published</span>
                                                    <Toggle checked={l.is_published} disabled={busy} onChange={(v) => patchLesson(l, { is_published: v })} label={`Published: ${l.title}`} />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-[#F6F5F2] px-3 py-2.5">
                                                    <span className="text-xs font-medium text-[#14141B]">Free preview</span>
                                                    <Toggle checked={l.is_free_preview} disabled={busy} onChange={(v) => patchLesson(l, { is_free_preview: v })} label={`Free preview: ${l.title}`} />
                                                </div>
                                            </div>
                                            <LessonContentEditor key={`${l.id}:${saves[l.id] ?? 0}`} lesson={l} startSaved={(saves[l.id] ?? 0) > 0} onSaved={() => setSaves((s) => ({ ...s, [l.id]: (s[l.id] ?? 0) + 1 }))} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button type="button" onClick={() => setPickerFor(m.id)} disabled={busy} className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] disabled:opacity-50">
                        <Plus className="size-3.5" /> Add lesson
                    </button>
                </div>
            ))}

            <button type="button" onClick={addModule} disabled={busy} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white text-sm font-semibold text-[#14141B] transition hover:bg-[#F6F5F2] disabled:opacity-50">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} New module
            </button>

            <Modal open={pickerFor !== null} onClose={() => setPickerFor(null)} title="Add a Lesson" wide>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {LESSON_TYPES.map((t) => {
                        const Icon = LESSON_ICONS[t.key];
                        return (
                            <button key={t.key} type="button" onClick={() => pickerFor !== null && addLesson(pickerFor, t.key)} className="flex items-start gap-3 rounded-xl border border-[#E4E2DA] p-4 text-left transition hover:border-[#4F46E5] hover:bg-[#F8F8FF]">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                                    <Icon className="size-5" />
                                </span>
                                <span>
                                    <span className="block text-base font-bold text-[#14141B]">{t.label}</span>
                                    <span className="mt-0.5 block text-xs text-[#6B6B78]">{t.hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Modal>

            <Modal open={doomed !== null} onClose={() => setDoomed(null)} title={`Delete this ${doomed?.kind ?? 'item'}?`}>
                <p className="text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{doomed?.title}</span>
                    {doomed?.kind === 'module' ? ' and all of its lessons will be permanently removed.' : ' and its content will be permanently removed.'}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setDoomed(null)} className="h-9 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#4B4B57] hover:bg-[#F6F5F2]">
                        Cancel
                    </button>
                    <button type="button" onClick={confirmDelete} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#D93838] px-4 text-sm font-semibold text-white hover:bg-[#B92D2D] disabled:opacity-50">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Live classes                                                       */
/* ------------------------------------------------------------------ */

/** ISO (UTC) from the server → value for <input type="datetime-local"> in the browser's zone */
function toLocalInput(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function LiveClassForm({ courseId, editing, onClose }: { courseId: string; editing: LiveClass | null; onClose: () => void }) {
    const [title, setTitle] = useState(editing?.title ?? '');
    const [description, setDescription] = useState(editing?.description ?? '');
    const [when, setWhen] = useState(editing ? toLocalInput(editing.scheduled_at) : '');
    const [minutes, setMinutes] = useState(String(editing?.duration_minutes ?? 60));
    const [link, setLink] = useState(editing?.join_link ?? '');
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const ok = title.trim() !== '' && when !== '' && Number(minutes) >= 5 && Number(minutes) <= 720;

    async function submit() {
        if (!ok) return;
        setBusy(true);
        setErrors({});
        const payload = { title: title.trim(), description: description.trim() || null, scheduled_at: when, duration_minutes: Number(minutes), join_link: link.trim() || null };
        const res = editing ? await send('put', `/dashboard/live-classes/${editing.id}`, payload) : await send('post', `/dashboard/courses/${courseId}/live-classes`, payload);
        setBusy(false);
        if (res.ok) onClose();
        else setErrors(res.errors);
    }

    return (
        <div className="flex flex-col gap-3">
            <Field label="Title" htmlFor="live-title" required error={errors.title}>
                <input id="live-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend doubt-clearing session" className={cn(INPUT, invalid(errors.title))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Date & time" htmlFor="live-when" required error={errors.scheduled_at}>
                    <input id="live-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={cn(INPUT, invalid(errors.scheduled_at))} />
                </Field>
                <Field label="Duration (min)" htmlFor="live-minutes" required error={errors.duration_minutes}>
                    <input id="live-minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} className={cn(INPUT, invalid(errors.duration_minutes))} />
                </Field>
            </div>
            <Field label="Join link" htmlFor="live-link" error={errors.join_link} hint="Only enrolled students can see this link.">
                <input id="live-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" className={cn(INPUT, invalid(errors.join_link))} />
            </Field>
            <Field label="Description" htmlFor="live-desc" error={errors.description}>
                <textarea id="live-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[#E4E2DA] px-4 text-sm font-semibold text-[#4B4B57] hover:bg-[#F6F5F2]">
                    Cancel
                </button>
                <button type="button" onClick={submit} disabled={!ok || busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white hover:bg-[#4338CA] disabled:opacity-50">
                    {busy && <Loader2 className="size-4 animate-spin" />} {editing ? 'Save changes' : 'Schedule class'}
                </button>
            </div>
        </div>
    );
}

function LiveClasses({ courseId, classes }: { courseId: string; classes: LiveClass[] }) {
    const [form, setForm] = useState<LiveClass | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function remove(c: LiveClass) {
        setError(null);
        const res = await send('delete', `/dashboard/live-classes/${c.id}`);
        if (!res.ok) setError(firstError(res.errors, 'Could not delete the live class.'));
    }

    return (
        <Card title="Live classes (optional)" subtitle="Weekend webinars, AMAs, doubt-clearing sessions — the join link unlocks for buyers.">
            <div className="flex flex-col gap-2">
                {error && <Notice tone="error">{error}</Notice>}
                {classes.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg bg-[#F6F5F2] px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#14141B]">{c.title}</p>
                            <p className="text-xs text-[#8A8A96]">
                                {new Date(c.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · {c.duration_minutes} min
                            </p>
                        </div>
                        <IconBtn label={`Edit ${c.title}`} onClick={() => setForm(c)}>
                            <Pencil className="size-3.5" />
                        </IconBtn>
                        <IconBtn label={`Delete ${c.title}`} danger onClick={() => remove(c)}>
                            <Trash2 className="size-3.5" />
                        </IconBtn>
                    </div>
                ))}
                <button type="button" onClick={() => setForm('new')} className="flex h-10 w-fit items-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white px-4 text-sm font-semibold text-[#14141B] hover:bg-[#F6F5F2]">
                    <Plus className="size-4" /> Set up a live class
                </button>
            </div>
            <Modal open={form !== null} onClose={() => setForm(null)} title={form && form !== 'new' ? 'Edit live class' : 'Set up a live class'}>
                {form !== null && <LiveClassForm key={form === 'new' ? 'new' : form.id} courseId={courseId} editing={form === 'new' ? null : form} onClose={() => setForm(null)} />}
            </Modal>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Tab                                                                */
/* ------------------------------------------------------------------ */

const PRICING: { key: PricingType; title: string; hint: string }[] = [
    { key: 'fixed', title: 'Fixed price', hint: 'Charge a one-time fixed amount' },
    { key: 'customer_decides', title: 'Customer decides', hint: 'Let buyers pay what they want' },
    { key: 'free', title: 'Free', hint: 'Allow access for free' },
];

export function CourseTab({
    courseId,
    modules,
    liveClasses,
    form,
    setField,
    errors,
}: {
    courseId: string;
    modules: Module[];
    liveClasses: LiveClass[];
    form: FormState;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    errors: Record<string, string>;
}) {
    const live = (liveClasses ?? []).map((c) => ({ ...c, scheduled_at: typeof (c as unknown as Record<string, unknown>).scheduled_at === 'string' ? c.scheduled_at : ((c as unknown as Record<string, unknown>).scheduledAt as string ?? c.scheduled_at) }));
    const price = Number(form.price) || 0;
    const discountProblem = form.has_discount && form.pricing_type === 'fixed' && form.discounted_price !== '' && Number(form.discounted_price) >= price ? 'Discounted price must be lower than the price.' : undefined;

    return (
        <div className="flex flex-col gap-7">
            <PanelTitle>Course syllabus</PanelTitle>
            <Syllabus courseId={courseId} modules={modules} />

            <LiveClasses courseId={courseId} classes={live} />

            <div className="flex flex-col gap-3">
                <PanelTitle>Pricing</PanelTitle>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pricing type">
                    {PRICING.map((p) => {
                        const active = form.pricing_type === p.key;
                        return (
                            <button key={p.key} type="button" role="radio" aria-checked={active} onClick={() => setField('pricing_type', p.key)} className={cn('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition', active ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E4E2DA] bg-white hover:bg-[#F6F5F2]')}>
                                <span className="flex w-full items-center justify-between gap-1 text-sm font-bold text-[#14141B]">
                                    {p.title}
                                    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#DAD8D0]')}>{active && <Check className="size-3" />}</span>
                                </span>
                                <span className="text-[11px] text-[#6B6B78]">{p.hint}</span>
                            </button>
                        );
                    })}
                </div>

                {form.pricing_type !== 'free' && (
                    <Field label={form.pricing_type === 'fixed' ? 'Price' : 'Price (optional)'} htmlFor="course_price" required={form.pricing_type === 'fixed'} error={errors.price}>
                        <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#8A8A96]">₹</span>
                            <input id="course_price" inputMode="decimal" value={form.price} onChange={(e) => setField('price', e.target.value.replace(/[^\d.]/g, ''))} placeholder="499" className={cn(INPUT, 'pl-7', invalid(errors.price))} />
                        </div>
                    </Field>
                )}

                {form.pricing_type === 'fixed' && (
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#14141B]">
                            <input type="checkbox" checked={form.has_discount} onChange={(e) => setField('has_discount', e.target.checked)} className="size-4 accent-[#4F46E5]" /> Offer discounted price
                        </label>
                        {form.has_discount && (
                            <Field label="Discounted price" htmlFor="discounted_price" error={errors.discounted_price ?? discountProblem}>
                                <div className="relative">
                                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#8A8A96]">₹</span>
                                    <input id="discounted_price" inputMode="decimal" value={form.discounted_price} onChange={(e) => setField('discounted_price', e.target.value.replace(/[^\d.]/g, ''))} className={cn(INPUT, 'pl-7', invalid(errors.discounted_price ?? discountProblem))} />
                                </div>
                            </Field>
                        )}
                    </>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <PanelTitle>Access &amp; certificate</PanelTitle>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Access type">
                    {([['lifetime', 'Lifetime access', 'Students keep access forever'], ['days', 'Limited access', 'Access expires after some days']] as const).map(([k, title, hint]) => {
                        const active = form.access_type === k;
                        return (
                            <button key={k} type="button" role="radio" aria-checked={active} onClick={() => setField('access_type', k)} className={cn('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition', active ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E4E2DA] bg-white hover:bg-[#F6F5F2]')}>
                                <span className="text-sm font-bold text-[#14141B]">{title}</span>
                                <span className="text-[11px] text-[#6B6B78]">{hint}</span>
                            </button>
                        );
                    })}
                </div>
                {form.access_type === 'days' && (
                    <Field label="Access duration (days)" htmlFor="access_days" required error={errors.access_days} hint="Between 1 and 3650 days.">
                        <input id="access_days" inputMode="numeric" value={form.access_days} onChange={(e) => setField('access_days', e.target.value.replace(/\D/g, ''))} placeholder="365" className={cn(INPUT, invalid(errors.access_days))} />
                    </Field>
                )}
                <div className="flex items-center justify-between rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                    <div>
                        <p className="text-sm font-bold text-[#14141B]">Certificate of completion</p>
                        <p className="text-xs text-[#6B6B78]">Issued automatically when a student finishes every lesson.</p>
                    </div>
                    <Toggle checked={form.certificate_enabled} onChange={(v) => setField('certificate_enabled', v)} label="Certificate of completion" />
                </div>
            </div>
        </div>
    );
}
