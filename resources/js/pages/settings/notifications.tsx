import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Notifications', href: '/dashboard/settings/notifications' }];

type Key = 'payment_received' | 'course_enrollment' | 'course_completion' | 'weekly_digest';

const ITEMS: { key: Key; title: string; description: string }[] = [
    { key: 'course_enrollment', title: 'Course enrollment', description: 'Email me when someone enrolls in my course — paid or free.' },
    { key: 'course_completion', title: 'Course completion', description: 'Email me when a student finishes my course.' },
    { key: 'payment_received', title: 'Payment received', description: 'Email me for every other sale (e-books, events, pages…) and when a payout is sent to my bank.' },
    { key: 'weekly_digest', title: 'Weekly digest', description: 'Every Monday, a summary of last week’s sales, new students and completions.' },
];

/** Dashboard → Settings → Notifications. Har switch dabate hi save. */
export default function NotificationSettings({ preferences, email }: { preferences: Record<Key, boolean>; email: string }) {
    const [values, setValues] = useState(preferences);
    const [saving, setSaving] = useState<Key | null>(null);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!saved) return;
        const t = window.setTimeout(() => setSaved(false), 2500);
        return () => window.clearTimeout(t);
    }, [saved]);

    function toggle(key: Key) {
        const next = !values[key];
        setValues((v) => ({ ...v, [key]: next }));
        setSaving(key);
        setError(null);

        router.put(
            '/dashboard/settings/notifications',
            { [key]: next },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSaved(true),
                onError: () => {
                    // wapas pehle jaisa — screen jhooth na bole
                    setValues((v) => ({ ...v, [key]: !next }));
                    setError('Could not save. Please try again.');
                },
                onFinish: () => setSaving(null),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Notification preferences</h1>
                        <p className="flex flex-wrap items-center gap-1.5 text-sm text-[#8A8A96]">
                            <Mail className="size-4" /> Choose which emails you get at <span className="font-semibold text-[#4B4B57]">{email}</span>
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {ITEMS.map((item) => {
                            const on = values[item.key];

                            return (
                                <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-[#E4E2DA] bg-white p-4 shadow-sm">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#14141B]">{item.title}</p>
                                        <p className="mt-0.5 text-[13px] text-[#6B6B78]">{item.description}</p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={on}
                                        aria-label={item.title}
                                        onClick={() => toggle(item.key)}
                                        disabled={saving === item.key}
                                        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60', on ? 'bg-[#4F46E5]' : 'bg-[#DAD8D0]')}
                                    >
                                        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex min-h-5 items-center gap-2 text-xs font-medium">
                        {saving ? (
                            <span className="flex items-center gap-1.5 text-[#8A8A96]">
                                <Loader2 className="size-3.5 animate-spin" /> Saving…
                            </span>
                        ) : error ? (
                            <span role="alert" className="text-[#C2410C]">
                                {error}
                            </span>
                        ) : saved ? (
                            <span role="status" className="flex items-center gap-1.5 text-[#059669]">
                                <CheckCircle2 className="size-3.5" /> Saved
                            </span>
                        ) : (
                            <span className="text-[#8A8A96]">Changes save as soon as you flip a switch.</span>
                        )}
                    </div>

                    <p className="text-xs text-[#8A8A96]">
                        Security emails (new sign-ins, password or payout changes) and 1:1 booking emails are always sent — they can’t be turned off.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
