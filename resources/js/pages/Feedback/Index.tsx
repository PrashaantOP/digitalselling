import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Bug, CheckCircle2, ImagePlus, Lightbulb, Loader2, MessageSquareReply, X } from 'lucide-react';
import { useRef, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Bug report or feature request', href: '/dashboard/feedback' }];

interface Report {
    uuid: string;
    type: 'bug' | 'feature';
    title: string;
    details: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    admin_note: string | null;
    by: string | null;
    has_screenshot: boolean;
    created_at: string | null;
}

const STATUS: Record<Report['status'], { label: string; tone: string }> = {
    open: { label: 'Received', tone: 'bg-cp-brand-soft text-cp-brand-hover-ink' },
    in_progress: { label: 'In progress', tone: 'bg-cp-amber-soft text-cp-amber-ink' },
    resolved: { label: 'Resolved', tone: 'bg-cp-success-soft text-cp-success-ink' },
    closed: { label: 'Closed', tone: 'bg-cp-surface-3 text-cp-subtle' },
};

const INPUT = 'w-full rounded-lg border border-cp-line-strong bg-cp-surface px-3 text-sm text-cp-ink outline-none transition placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Dashboard → Bug report or feature request. Bhejo, aur apni purani reports ka haal dekho. */
export default function FeedbackIndex({ reports }: { reports: Report[] }) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const fileInput = useRef<HTMLInputElement>(null);
    const form = useForm<{ type: 'bug' | 'feature'; title: string; details: string; page_url: string; screenshot: File | null }>({
        type: 'bug',
        title: '',
        details: '',
        page_url: typeof document !== 'undefined' ? document.referrer.replace(window.location.origin, '').slice(0, 500) : '',
        screenshot: null,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/dashboard/feedback', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset('title', 'details', 'screenshot'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bug report or feature request" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Bug report or feature request</h1>
                        <p className="text-sm text-cp-muted">Tell us what broke or what would make your experience better. Our team reads every message.</p>
                    </div>

                    {flash?.success && (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-cp-success-soft p-3.5 text-[13px] font-semibold text-cp-success-ink">
                            <CheckCircle2 className="size-4 shrink-0" /> {flash.success}
                        </div>
                    )}

                    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl bg-cp-surface p-5 shadow-sm">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What is this?">
                            {[
                                { value: 'bug' as const, label: 'Report a bug', hint: 'Something isn’t working', icon: Bug, tone: 'bg-cp-coral-soft text-cp-coral-dark-ink' },
                                { value: 'feature' as const, label: 'Request a feature', hint: 'An idea or improvement', icon: Lightbulb, tone: 'bg-cp-amber-soft text-cp-amber-ink' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.data.type === option.value}
                                    onClick={() => form.setData('type', option.value)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                                        form.data.type === option.value ? 'border-cp-brand bg-cp-brand-soft' : 'border-cp-line hover:bg-cp-canvas',
                                    )}
                                >
                                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', option.tone)}>
                                        <option.icon className="size-5" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-bold text-cp-ink">{option.label}</span>
                                        <span className="block text-xs text-cp-subtle">{option.hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div>
                            <label htmlFor="fb-title" className="text-xs font-semibold text-cp-body">
                                {form.data.type === 'bug' ? 'What went wrong?' : 'What would you like?'}
                            </label>
                            <input
                                id="fb-title"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                maxLength={150}
                                placeholder={form.data.type === 'bug' ? 'e.g. Avatar upload does nothing on the Store page' : 'e.g. Let me schedule a product to publish later'}
                                className={cn(INPUT, 'mt-1 h-10')}
                            />
                            {form.errors.title && <p className="mt-1 text-xs font-medium text-cp-coral-dark-ink">{form.errors.title}</p>}
                        </div>

                        <div>
                            <label htmlFor="fb-details" className="text-xs font-semibold text-cp-body">
                                Details
                            </label>
                            <textarea
                                id="fb-details"
                                value={form.data.details}
                                onChange={(e) => form.setData('details', e.target.value)}
                                rows={6}
                                maxLength={5000}
                                placeholder={form.data.type === 'bug' ? 'What did you do, what did you expect, and what happened instead?' : 'How would it help you and your buyers?'}
                                className={cn(INPUT, 'mt-1 py-2.5 leading-relaxed')}
                            />
                            {form.errors.details && <p className="mt-1 text-xs font-medium text-cp-coral-dark-ink">{form.errors.details}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => form.setData('screenshot', e.target.files?.[0] ?? null)} />
                            {form.data.screenshot ? (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-cp-canvas px-3 py-2 text-xs font-medium text-cp-ink">
                                    <ImagePlus className="size-4 shrink-0 text-cp-brand-ink" /> <span className="truncate">{form.data.screenshot.name}</span>
                                    <button
                                        type="button"
                                        aria-label="Remove screenshot"
                                        onClick={() => {
                                            form.setData('screenshot', null);
                                            if (fileInput.current) fileInput.current.value = '';
                                        }}
                                        className="text-cp-muted hover:text-cp-ink"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </span>
                            ) : (
                                <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-cp-line bg-cp-surface px-3 text-sm font-medium text-cp-body hover:bg-cp-canvas">
                                    <ImagePlus className="size-4" /> Add a screenshot (optional)
                                </button>
                            )}
                            {form.errors.screenshot && <p className="text-xs font-medium text-cp-coral-dark-ink">{form.errors.screenshot}</p>}
                        </div>

                        <div>
                            <Button type="submit" disabled={form.processing || !form.data.title.trim() || form.data.details.trim().length < 10} className="text-white bg-cp-brand hover:bg-cp-brand-hover">
                                {form.processing && <Loader2 className="size-4 animate-spin" />} Send {form.data.type === 'bug' ? 'report' : 'request'}
                            </Button>
                        </div>
                    </form>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-sm font-bold text-cp-ink">Your reports</h2>
                        {reports.length === 0 && <p className="rounded-xl bg-cp-surface p-5 text-center text-sm text-cp-muted shadow-sm">Nothing sent yet.</p>}
                        {reports.map((r) => (
                            <article key={r.uuid} className="rounded-xl bg-cp-surface p-4 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 font-semibold text-cp-subtle">
                                        {r.type === 'bug' ? <Bug className="size-3.5" /> : <Lightbulb className="size-3.5" />} {r.type === 'bug' ? 'Bug' : 'Feature'}
                                    </span>
                                    <span className={cn('rounded-full px-2 py-0.5 font-semibold', STATUS[r.status].tone)}>{STATUS[r.status].label}</span>
                                    <span className="text-cp-muted">
                                        {date(r.created_at)}
                                        {r.by ? ` · ${r.by}` : ''}
                                    </span>
                                    {r.has_screenshot && (
                                        <a href={`/dashboard/feedback/${r.uuid}/screenshot`} target="_blank" rel="noreferrer" className="font-semibold text-cp-brand-ink hover:underline">
                                            Screenshot
                                        </a>
                                    )}
                                </div>
                                <p className="mt-2 text-sm font-semibold text-cp-ink">{r.title}</p>
                                <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-cp-body">{r.details}</p>
                                {r.admin_note && (
                                    <div className="mt-3 flex gap-2 rounded-lg bg-cp-brand-soft p-3 text-sm text-cp-ink">
                                        <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-cp-brand-ink" />
                                        <p className="whitespace-pre-line">
                                            <span className="font-semibold text-cp-brand-hover-ink">Our team: </span>
                                            {r.admin_note}
                                        </p>
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
