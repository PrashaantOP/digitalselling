import { VideoEmbed } from '@/components/public/video-embed';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, FileText, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { assetUrl, firstError, send } from './api';
import { normalizeLesson, type Lesson, type QuizQuestion } from './types';
import { Field, INPUT, invalid, Notice, RichText, TEXTAREA, Toggle } from './ui';

const contentUrl = (lessonUuid: string) => `/dashboard/lessons/${lessonUuid}/content`;

/** Shared save plumbing: busy / error / "saved" flag for one editor. */
interface EditorProps {
    lesson: Lesson;
    /** called after a successful save — the parent remounts the editor so server-side file lists refresh */
    onSaved?: () => void;
    startSaved?: boolean;
}

function useSaver(lessonUuid: string, onSaved?: () => void, startSaved = false) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(startSaved);

    async function save(data: Record<string, unknown>, files = false) {
        setBusy(true);
        setError(null);
        setFieldErrors({});
        setSaved(false);
        const res = await send('put', contentUrl(lessonUuid), data, files);
        setBusy(false);
        if (res.ok) {
            setSaved(true);
            onSaved?.();
        } else {
            setFieldErrors(res.errors);
            setError(firstError(res.errors, 'Could not save this lesson.'));
        }
        return res.ok;
    }
    const touch = () => setSaved(false);
    return { busy, error, fieldErrors, saved, save, touch, setError };
}

function SaveRow({ busy, saved, error, onSave, disabled, label = 'Save content' }: { busy: boolean; saved: boolean; error: string | null; onSave: () => void; disabled?: boolean; label?: string }) {
    return (
        <div className="flex flex-col gap-2">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex items-center gap-3">
                <button type="button" onClick={onSave} disabled={busy || disabled} className="flex h-9 items-center gap-1.5 rounded-lg bg-cp-brand px-4 text-sm font-semibold text-white transition hover:bg-cp-brand-hover disabled:opacity-50">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {busy ? 'Saving…' : label}
                </button>
                {saved && !busy && (
                    <span role="status" className="text-xs font-medium text-cp-success-ink">
                        Content saved
                    </span>
                )}
            </div>
        </div>
    );
}

function FilePicker({ label, accept, files, onChange, multiple = true, hint }: { label: string; accept: string; files: File[]; onChange: (f: File[]) => void; multiple?: boolean; hint?: string }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-cp-line-strong bg-cp-surface-2 px-3 py-4 text-sm font-semibold text-cp-brand-ink hover:bg-cp-brand-soft">
                <Upload className="size-4" /> {label}
                <input type="file" accept={accept} multiple={multiple} aria-label={label} className="sr-only" onChange={(e) => e.target.files && onChange(multiple ? [...files, ...Array.from(e.target.files)] : Array.from(e.target.files).slice(0, 1))} />
            </label>
            {hint && <span className="text-[11px] text-cp-muted">{hint}</span>}
            {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-cp-canvas px-3 py-1.5 text-xs text-cp-ink">
                    <FileText className="size-3.5 shrink-0 text-cp-muted" /> <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-cp-red-ink">
                        <X className="size-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Video                                                              */
/* ------------------------------------------------------------------ */

function VideoEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const [url, setUrl] = useState(lesson.video?.video_url ?? '');
    const [notes, setNotes] = useState(lesson.video?.notes ?? '');
    const missing = url.trim() === '';
    return (
        <div className="flex flex-col gap-3">
            <Field label="Video URL" htmlFor={`video-url-${lesson.id}`} required error={s.fieldErrors.video_url} hint="YouTube, Vimeo or a direct .mp4 link.">
                <input id={`video-url-${lesson.id}`} value={url} onChange={(e) => (setUrl(e.target.value), s.touch())} placeholder="https://www.youtube.com/watch?v=…" className={cn(INPUT, invalid(s.fieldErrors.video_url))} />
            </Field>
            {/* link daalte hi student jaisa player preview */}
            <VideoEmbed url={url} accent="#4F46E5" />
            <Field label="Lesson notes" htmlFor={`video-notes-${lesson.id}`} hint="Shown under the video.">
                <textarea id={`video-notes-${lesson.id}`} rows={3} value={notes} onChange={(e) => (setNotes(e.target.value), s.touch())} className={TEXTAREA} />
            </Field>
            <SaveRow busy={s.busy} saved={s.saved} error={s.error} disabled={missing} onSave={() => s.save({ video_url: url.trim(), notes: notes.trim() || null })} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Text & images                                                      */
/* ------------------------------------------------------------------ */

function TextEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const text = normalizeLesson(lesson).text_content;
    const existing = text?.images ?? [];
    const [content, setContent] = useState(text?.content ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [removed, setRemoved] = useState<number[]>([]);
    return (
        <div className="flex flex-col gap-3">
            <Field label="Lesson text" htmlFor={`text-${lesson.id}`} error={s.fieldErrors.content}>
                <RichText id={`text-${lesson.id}`} value={content} onChange={(v) => (setContent(v), s.touch())} placeholder="Write the lesson…" />
            </Field>
            {existing.filter((i) => !removed.includes(i.id)).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {existing
                        .filter((i) => !removed.includes(i.id))
                        .map((img) => (
                            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-cp-canvas">
                                <img src={assetUrl(img.image_path)} alt="" className="size-full object-cover" />
                                <button type="button" aria-label="Remove image" onClick={() => (setRemoved([...removed, img.id]), s.touch())} className="absolute top-1 right-1 rounded-full bg-cp-surface/90 p-1 text-cp-red-ink shadow">
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        ))}
                </div>
            )}
            <FilePicker label="Add images" accept="image/*" files={files} onChange={(f) => (setFiles(f), s.touch())} hint="Up to 20 images · 5 MB each" />
            <SaveRow busy={s.busy} saved={s.saved} error={s.error} onSave={() => s.save({ content, images: files, remove_image_ids: removed }, true)} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Audio                                                              */
/* ------------------------------------------------------------------ */

function AudioEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const [url, setUrl] = useState(lesson.audio?.audio_url ?? '');
    const [file, setFile] = useState<File[]>([]);
    const [notes, setNotes] = useState(lesson.audio?.notes ?? '');
    return (
        <div className="flex flex-col gap-3">
            {lesson.audio?.audio_path && <Notice tone="info">An audio file is already uploaded. Upload a new one or paste a link to replace it.</Notice>}
            <FilePicker label="Upload audio file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" files={file} multiple={false} onChange={(f) => (setFile(f), s.touch())} hint="mp3, wav, m4a, aac or ogg · up to 50 MB" />
            <Field label="or Audio URL" htmlFor={`audio-url-${lesson.id}`} error={s.fieldErrors.audio_url}>
                <input id={`audio-url-${lesson.id}`} value={url} onChange={(e) => (setUrl(e.target.value), s.touch())} placeholder="https://…" className={cn(INPUT, invalid(s.fieldErrors.audio_url))} />
            </Field>
            <Field label="Lesson notes" htmlFor={`audio-notes-${lesson.id}`}>
                <textarea id={`audio-notes-${lesson.id}`} rows={3} value={notes} onChange={(e) => (setNotes(e.target.value), s.touch())} className={TEXTAREA} />
            </Field>
            <SaveRow
                busy={s.busy}
                saved={s.saved}
                error={s.error}
                onSave={() => s.save({ notes: notes.trim() || null, ...(file[0] ? { audio_file: file[0] } : url.trim() ? { audio_url: url.trim() } : {}) }, true)}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Notes / PDF                                                        */
/* ------------------------------------------------------------------ */

/** Player sirf PDF / txt dikha sakta hai (LessonNoteFile::viewKind) */
const readableInApp = (name: string) => /\.(pdf|txt)$/i.test(name);

function NotesEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const existing = lesson.notes?.files ?? [];
    const [allow, setAllow] = useState(lesson.notes?.allow_download ?? false);
    const [description, setDescription] = useState(lesson.notes?.description ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [removed, setRemoved] = useState<number[]>([]);

    // download band ho to learner sirf PDF / txt hi khol sakta hai (player me) — baaki files uske liye band rehti hain
    const blocked = allow ? [] : [...existing.filter((f) => !removed.includes(f.id)).map((f) => f.original_name), ...files.map((f) => f.name)].filter((name) => !readableInApp(name));

    return (
        <div className="flex flex-col gap-3">
            <Field label="Description" htmlFor={`notes-desc-${lesson.id}`}>
                <textarea id={`notes-desc-${lesson.id}`} rows={3} value={description} onChange={(e) => (setDescription(e.target.value), s.touch())} className={TEXTAREA} />
            </Field>
            {existing
                .filter((f) => !removed.includes(f.id))
                .map((f) => (
                    <div key={f.id} className="flex items-center gap-2 rounded-lg bg-cp-canvas px-3 py-1.5 text-xs text-cp-ink">
                        <FileText className="size-3.5 shrink-0 text-cp-muted" /> <span className="min-w-0 flex-1 truncate">{f.original_name}</span>
                        {!allow && !readableInApp(f.original_name) && <span className="shrink-0 rounded-full bg-cp-coral-soft px-2 py-0.5 text-[10px] font-semibold text-cp-coral-dark-ink">Learners can’t open</span>}
                        <button type="button" aria-label={`Remove ${f.original_name}`} onClick={() => (setRemoved([...removed, f.id]), s.touch())} className="text-cp-red-ink">
                            <X className="size-3.5" />
                        </button>
                    </div>
                ))}
            <FilePicker label="Add files" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" files={files} onChange={(f) => (setFiles(f), s.touch())} hint="PDF preferred — learners read it inside the lesson. Also doc, ppt, xls, txt or zip · up to 50 MB each" />
            <div className="flex items-center justify-between rounded-lg bg-cp-canvas px-3 py-2.5">
                <span className="text-sm text-cp-ink">Let learners download these files</span>
                <Toggle checked={allow} onChange={(v) => (setAllow(v), s.touch())} label="Allow download" />
            </div>
            <p className="text-xs text-cp-muted">{allow ? 'PDF and txt files also open inside the lesson. Other files are download-only.' : 'Learners read PDF and txt files inside the lesson, with no download button.'}</p>
            {blocked.length > 0 && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-cp-coral-line bg-cp-coral-soft p-3 text-xs text-cp-coral-strong-ink">
                    <AlertTriangle className="mt-px size-4 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-semibold">
                            Learners won’t be able to open {blocked.length === 1 ? 'this file' : `these ${blocked.length} files`}: <span className="font-normal break-words">{blocked.join(', ')}</span>
                        </p>
                        <p className="mt-0.5">Only PDF and txt files open inside the lesson. Upload a PDF instead, or turn on downloads.</p>
                    </div>
                </div>
            )}
            <SaveRow busy={s.busy} saved={s.saved} error={s.error} onSave={() => s.save({ allow_download: allow, description: description.trim() || null, files, remove_file_ids: removed }, true)} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Assignment                                                         */
/* ------------------------------------------------------------------ */

function AssignmentEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const [prompt, setPrompt] = useState(lesson.assignment?.assignment_prompt ?? '');
    const [allow, setAllow] = useState(lesson.assignment?.allow_file_upload ?? true);
    return (
        <div className="flex flex-col gap-3">
            <Field label="Assignment prompt" htmlFor={`prompt-${lesson.id}`} required error={s.fieldErrors.assignment_prompt}>
                <textarea id={`prompt-${lesson.id}`} rows={4} value={prompt} onChange={(e) => (setPrompt(e.target.value), s.touch())} placeholder="What should the student submit?" className={cn(TEXTAREA, invalid(s.fieldErrors.assignment_prompt))} />
            </Field>
            <div className="flex items-center justify-between rounded-lg bg-cp-canvas px-3 py-2.5">
                <span className="text-sm text-cp-ink">Allow file upload</span>
                <Toggle checked={allow} onChange={(v) => (setAllow(v), s.touch())} label="Allow file upload" />
            </div>
            <SaveRow busy={s.busy} saved={s.saved} error={s.error} disabled={prompt.trim() === ''} onSave={() => s.save({ assignment_prompt: prompt.trim(), allow_file_upload: allow })} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Quiz                                                               */
/* ------------------------------------------------------------------ */

interface OptionDraft {
    id?: number;
    text: string;
    is_correct: boolean;
}

function QuestionForm({ lessonUuid, question, onDone }: { lessonUuid: string; question?: QuizQuestion; onDone: () => void }) {
    const [text, setText] = useState(question?.question_text ?? '');
    const [type, setType] = useState<'single_choice' | 'multiple_choice'>(question?.type ?? 'single_choice');
    const [options, setOptions] = useState<OptionDraft[]>(question ? question.options.map((o) => ({ id: o.id, text: o.option_text ?? '', is_correct: o.is_correct })) : [{ text: '', is_correct: true }, { text: '', is_correct: false }]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const correct = options.filter((o) => o.is_correct).length;
    const problem = !text.trim()
        ? 'Write the question.'
        : options.some((o) => !o.text.trim())
          ? 'Every option needs text.'
          : correct < 1
            ? 'Mark at least one correct option.'
            : type === 'single_choice' && correct !== 1
              ? 'Single choice needs exactly one correct option.'
              : null;

    function toggleCorrect(i: number) {
        setOptions(options.map((o, j) => (type === 'single_choice' ? { ...o, is_correct: j === i } : j === i ? { ...o, is_correct: !o.is_correct } : o)));
    }

    async function submit() {
        if (problem) return;
        setBusy(true);
        setError(null);
        const payload = { question_text: text.trim(), type, options: options.map((o) => ({ ...(o.id ? { id: o.id } : {}), text: o.text.trim(), is_correct: o.is_correct })) };
        const res = question ? await send('put', `/dashboard/quiz-questions/${question.uuid}`, payload) : await send('post', `/dashboard/lessons/${lessonUuid}/quiz/questions`, payload);
        setBusy(false);
        if (res.ok) onDone();
        else setError(firstError(res.errors, 'Could not save the question.'));
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-cp-brand/30 bg-cp-surface-2 p-3">
            <Field label="Question" htmlFor={`q-text-${question?.id ?? 'new'}`} required>
                <textarea id={`q-text-${question?.id ?? 'new'}`} rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} className={TEXTAREA} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
                {([['single_choice', 'Single answer'], ['multiple_choice', 'Multiple answers']] as const).map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={cn('h-9 rounded-lg border text-xs font-semibold', type === k ? 'border-cp-brand bg-cp-surface text-cp-brand-ink' : 'border-cp-line bg-cp-surface text-cp-body')}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-[11px] text-cp-muted">Tick the correct {type === 'single_choice' ? 'answer' : 'answers'}.</span>
                {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <button type="button" role={type === 'single_choice' ? 'radio' : 'checkbox'} aria-checked={o.is_correct} aria-label={`Option ${i + 1} is correct`} onClick={() => toggleCorrect(i)} className={cn('flex size-6 shrink-0 items-center justify-center border', type === 'single_choice' ? 'rounded-full' : 'rounded-md', o.is_correct ? 'border-cp-success bg-cp-success text-white' : 'border-cp-line-strong bg-cp-surface text-transparent')}>
                            <Check className="size-3.5" />
                        </button>
                        <input aria-label={`Option ${i + 1}`} value={o.text} maxLength={500} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder={`Option ${i + 1}`} className={INPUT} />
                        <button type="button" aria-label={`Remove option ${i + 1}`} disabled={options.length <= 2} onClick={() => setOptions(options.filter((_, j) => j !== i))} className="rounded p-1.5 text-cp-red-ink hover:bg-cp-surface disabled:opacity-30">
                            <X className="size-4" />
                        </button>
                    </div>
                ))}
                {options.length < 8 && (
                    <button type="button" onClick={() => setOptions([...options, { text: '', is_correct: false }])} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-cp-line-strong text-xs font-semibold text-cp-brand-ink hover:bg-cp-surface">
                        <Plus className="size-3.5" /> Add option
                    </button>
                )}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex items-center gap-2">
                <button type="button" onClick={submit} disabled={busy || Boolean(problem)} className="flex h-9 items-center gap-1.5 rounded-lg bg-cp-brand px-4 text-sm font-semibold text-white hover:bg-cp-brand-hover disabled:opacity-50">
                    {busy && <Loader2 className="size-4 animate-spin" />} {question ? 'Update question' : 'Add question'}
                </button>
                <button type="button" onClick={onDone} disabled={busy} className="h-9 rounded-lg px-3 text-sm font-semibold text-cp-body hover:bg-cp-surface">
                    Cancel
                </button>
                {problem && <span className="text-[11px] text-cp-muted">{problem}</span>}
            </div>
        </div>
    );
}

function QuizEditor({ lesson, onSaved, startSaved }: EditorProps) {
    const s = useSaver(lesson.uuid, onSaved, startSaved);
    const quiz = lesson.quiz;
    const [title, setTitle] = useState(quiz?.title ?? lesson.title);
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const questions = quiz?.questions ?? [];

    async function remove(q: QuizQuestion) {
        setError(null);
        const res = await send('delete', `/dashboard/quiz-questions/${q.uuid}`);
        setConfirmId(null);
        if (!res.ok) setError(firstError(res.errors, 'Could not delete the question.'));
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                <Field label="Quiz title" htmlFor={`quiz-title-${lesson.id}`} required error={s.fieldErrors.title}>
                    <input id={`quiz-title-${lesson.id}`} value={title} maxLength={150} onChange={(e) => (setTitle(e.target.value), s.touch())} className={cn(INPUT, invalid(s.fieldErrors.title))} />
                </Field>
                <SaveRow busy={s.busy} saved={s.saved} error={s.error} disabled={title.trim() === '' || title.trim() === (quiz?.title ?? lesson.title)} label="Save title" onSave={() => s.save({ title: title.trim() })} />
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-cp-ink uppercase">Questions ({questions.length})</span>
                </div>
                {error && <Notice tone="error">{error}</Notice>}
                {questions.length === 0 && editing !== 'new' && <p className="rounded-lg border border-dashed border-cp-line p-4 text-center text-xs text-cp-muted">No questions yet. Add the first one — quizzes are auto-graded.</p>}
                {questions.map((q, i) =>
                    editing === q.id ? (
                        <QuestionForm key={q.id} lessonUuid={lesson.uuid} question={q} onDone={() => setEditing(null)} />
                    ) : (
                        <div key={q.id} className="rounded-lg border border-cp-line bg-cp-surface p-3">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-cp-ink">
                                    <span className="mr-1.5 text-cp-muted">{i + 1}.</span>
                                    {q.question_text}
                                </p>
                                <div className="flex shrink-0 items-center gap-0.5">
                                    <button type="button" aria-label={`Edit question ${i + 1}`} onClick={() => setEditing(q.id)} className="rounded p-1.5 text-cp-muted hover:bg-cp-surface-3 hover:text-cp-ink">
                                        <Pencil className="size-3.5" />
                                    </button>
                                    {confirmId === q.id ? (
                                        <button type="button" onClick={() => remove(q)} className="rounded bg-cp-red px-2 py-1 text-[11px] font-semibold text-white">
                                            Confirm delete
                                        </button>
                                    ) : (
                                        <button type="button" aria-label={`Delete question ${i + 1}`} onClick={() => setConfirmId(q.id)} className="rounded p-1.5 text-cp-muted hover:bg-cp-coral-soft hover:text-cp-coral-dark-ink">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <ul className="mt-2 flex flex-col gap-1">
                                {q.options.map((o) => (
                                    <li key={o.id} className={cn('flex items-center gap-2 text-xs', o.is_correct ? 'font-semibold text-cp-success-ink' : 'text-cp-subtle')}>
                                        <span className={cn('flex size-4 items-center justify-center rounded-full', o.is_correct ? 'bg-cp-success-soft' : 'bg-cp-surface-3')}>{o.is_correct && <Check className="size-3" />}</span>
                                        {o.option_text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ),
                )}
                {editing === 'new' ? (
                    <QuestionForm lessonUuid={lesson.uuid} onDone={() => setEditing(null)} />
                ) : (
                    <button type="button" onClick={() => setEditing('new')} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-cp-line-strong text-sm font-semibold text-cp-brand-ink hover:bg-cp-brand-soft">
                        <Plus className="size-4" /> Add question
                    </button>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Switch                                                             */
/* ------------------------------------------------------------------ */

export function LessonContentEditor(props: EditorProps): ReactNode {
    const lesson = normalizeLesson(props.lesson);
    switch (lesson.type) {
        case 'video':
            return <VideoEditor {...props} lesson={lesson} />;
        case 'text_image':
            return <TextEditor {...props} lesson={lesson} />;
        case 'audio':
            return <AudioEditor {...props} lesson={lesson} />;
        case 'notes_pdf':
            return <NotesEditor {...props} lesson={lesson} />;
        case 'assignment':
            return <AssignmentEditor {...props} lesson={lesson} />;
        case 'quiz':
            return <QuizEditor {...props} lesson={lesson} />;
        default:
            return null;
    }
}
