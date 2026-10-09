import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Loader2, MessageSquareText } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Creator-side routes (routes/web.php → perm:courses.edit) */
export const submissionGradeUrl = (uuid: string) => `/dashboard/assignments/submissions/${uuid}/grade`;
export const submissionFileUrl = (uuid: string) => `/dashboard/assignments/submissions/${uuid}/file`;

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
    submitted: { label: 'Needs review', chip: 'bg-cp-warning-soft text-cp-warning-ink', dot: 'bg-amber-500 animate-pulse' },
    graded: { label: 'Graded', chip: 'bg-cp-success-soft text-cp-success-ink', dot: 'bg-cp-success' },
};

export function submissionStatusMeta(status: string) {
    return STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), chip: 'bg-cp-surface-3 text-cp-subtle', dot: 'bg-current' };
}

export function SubmissionStatusPill({ status }: { status: string }) {
    const meta = submissionStatusMeta(status);
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

const MAX_LENGTH = 5000;

/**
 * Feedback box for one assignment submission.
 * PUT /dashboard/assignments/submissions/{uuid}/grade  { grade_feedback }  → status becomes "graded".
 */
export function GradeForm({ submission, onSaved }: { submission: { id: number; uuid: string; status: string; grade_feedback: string | null }; onSaved?: () => void }) {
    const [value, setValue] = useState(submission.grade_feedback ?? '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // a different submission → start clean
    useEffect(() => {
        setSaved(false);
        setError(null);
    }, [submission.id]);

    // props refreshed after save → sync the box with what the server stored
    useEffect(() => {
        setValue(submission.grade_feedback ?? '');
    }, [submission.id, submission.grade_feedback]);

    const graded = submission.status === 'graded';
    const trimmed = value.trim();
    const unchanged = graded && trimmed === (submission.grade_feedback ?? '').trim();
    const canSave = trimmed.length > 0 && value.length <= MAX_LENGTH && !saving && !unchanged;

    function save() {
        if (!canSave) return;
        setSaving(true);
        setSaved(false);
        setError(null);
        router.put(
            submissionGradeUrl(submission.uuid),
            { grade_feedback: trimmed },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSaved(true);
                    onSaved?.();
                },
                onError: (errors) => setError(errors.grade_feedback ?? Object.values(errors)[0] ?? 'Could not save feedback. Please try again.'),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <label htmlFor={`feedback-${submission.id}`} className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-cp-ink uppercase">
                    <MessageSquareText className="size-3.5 text-cp-muted" /> Your feedback
                </label>
                <span className={cn('text-[11px]', value.length > MAX_LENGTH ? 'text-cp-red-ink' : 'text-cp-muted')}>
                    {value.length}/{MAX_LENGTH}
                </span>
            </div>
            <textarea
                id={`feedback-${submission.id}`}
                value={value}
                rows={4}
                onChange={(e) => {
                    setValue(e.target.value);
                    setSaved(false);
                    setError(null);
                }}
                placeholder="What worked well? What should the student improve?"
                className="w-full resize-y rounded-lg border border-cp-line bg-cp-surface px-3 py-2 text-sm text-cp-ink shadow-sm outline-none placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15"
            />
            {error && (
                <span role="alert" className="text-xs text-cp-red-ink">
                    {error}
                </span>
            )}
            <div className="flex items-center gap-3">
                <Button onClick={save} disabled={!canSave} size="sm" className="text-white bg-cp-brand hover:bg-cp-brand-hover">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {saving ? 'Saving…' : graded ? 'Update feedback' : 'Save & mark graded'}
                </Button>
                {saved && !saving && (
                    <span role="status" className="text-xs font-medium text-cp-success-ink">
                        Feedback saved
                    </span>
                )}
            </div>
        </div>
    );
}
