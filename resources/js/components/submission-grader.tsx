import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Loader2, MessageSquareText } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Creator-side routes (routes/web.php → perm:courses.edit) */
export const submissionGradeUrl = (id: number) => `/dashboard/assignments/submissions/${id}/grade`;
export const submissionFileUrl = (id: number) => `/dashboard/assignments/submissions/${id}/file`;

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
    submitted: { label: 'Needs review', chip: 'bg-[#FFF4DB] text-[#B46E00]', dot: 'bg-amber-500 animate-pulse' },
    graded: { label: 'Graded', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
};

export function submissionStatusMeta(status: string) {
    return STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' };
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
 * PUT /dashboard/assignments/submissions/{id}/grade  { grade_feedback }  → status becomes "graded".
 */
export function GradeForm({ submission, onSaved }: { submission: { id: number; status: string; grade_feedback: string | null }; onSaved?: () => void }) {
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
            submissionGradeUrl(submission.id),
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
                <label htmlFor={`feedback-${submission.id}`} className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                    <MessageSquareText className="size-3.5 text-[#8A8A96]" /> Your feedback
                </label>
                <span className={cn('text-[11px]', value.length > MAX_LENGTH ? 'text-[#D93838]' : 'text-[#8A8A96]')}>
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
                className="w-full resize-y rounded-lg border border-[#E4E2DA] bg-white px-3 py-2 text-sm text-[#14141B] shadow-sm outline-none placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
            />
            {error && (
                <span role="alert" className="text-xs text-[#D93838]">
                    {error}
                </span>
            )}
            <div className="flex items-center gap-3">
                <Button onClick={save} disabled={!canSave} size="sm" className="bg-[#4F46E5] hover:bg-[#4338CA]">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {saving ? 'Saving…' : graded ? 'Update feedback' : 'Save & mark graded'}
                </Button>
                {saved && !saving && (
                    <span role="status" className="text-xs font-medium text-[#059669]">
                        Feedback saved
                    </span>
                )}
            </div>
        </div>
    );
}
