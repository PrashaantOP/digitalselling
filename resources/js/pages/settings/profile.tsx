import DeleteUser from '@/components/delete-user';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { Field, SavedNote, SaveButton, SettingsCard, TextInput } from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BadgeCheck, MailWarning, UserRound } from 'lucide-react';
import { type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Profile settings', href: '/settings/profile' }];

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const form = useForm({ name: auth.user.name, email: auth.user.email, current_password: '' });
    // email badla hai tabhi current password chahiye (server pe bhi yahi rule)
    const emailChanged = form.data.email.trim().toLowerCase() !== auth.user.email.toLowerCase();
    const unverified = mustVerifyEmail && auth.user.email_verified_at === null;

    function submit(e: FormEvent) {
        e.preventDefault();
        form.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                // naye values hi ab "saved" — Save button phir se band
                form.setDefaults({ name: form.data.name, email: form.data.email.trim().toLowerCase(), current_password: '' });
                form.setData('current_password', '');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                {unverified && (
                    <div className="flex flex-col gap-3 rounded-2xl bg-cp-warning-soft p-4 text-sm text-cp-warning-strong-ink ring-1 ring-cp-warning-line sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-start gap-2.5">
                            <MailWarning className="mt-0.5 size-5 shrink-0" />
                            <span>
                                <span className="font-semibold">Your email isn't verified yet.</span> Payouts and Plus payments need a verified email.
                            </span>
                        </span>
                        {status === 'verification-link-sent' ? (
                            <span className="shrink-0 font-semibold text-cp-success-strong-ink">New link sent — check your inbox.</span>
                        ) : (
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="h-9 shrink-0 rounded-lg bg-cp-surface px-3.5 text-sm font-semibold text-cp-warning-strong-ink shadow-sm ring-1 ring-cp-warning-line transition hover:bg-cp-warning-soft"
                            >
                                Resend verification email
                            </Link>
                        )}
                    </div>
                )}

                <SettingsCard icon={UserRound} title="Profile information" description="Your name shows on invoices and team pages. Sign-in codes and alerts go to your email.">
                    <div className="mb-6 flex items-center gap-4 rounded-xl bg-cp-canvas p-4">
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-cp-brand-soft text-lg font-bold text-cp-brand-ink ring-4 ring-cp-surface">
                            {initials(form.data.name || auth.user.name)}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-cp-ink">{form.data.name || auth.user.name}</p>
                            <p className="flex items-center gap-1.5 truncate text-sm text-cp-subtle">
                                {auth.user.email}
                                {!unverified && <BadgeCheck className="size-4 shrink-0 text-cp-success-ink" aria-label="Verified" />}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="grid gap-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field id="name" label="Full name" error={form.errors.name}>
                                <TextInput
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                    invalid={Boolean(form.errors.name)}
                                />
                            </Field>

                            <Field id="email" label="Email address" error={form.errors.email}>
                                <TextInput
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="you@example.com"
                                    invalid={Boolean(form.errors.email)}
                                />
                            </Field>
                        </div>

                        {(emailChanged || form.errors.current_password) && (
                            <div className="rounded-xl border border-cp-line bg-cp-surface-2 p-4">
                                <Field
                                    id="current_password"
                                    label="Current password"
                                    hint="Needed to change your email. We'll send a verification link to the new address."
                                    error={form.errors.current_password}
                                >
                                    <TextInput
                                        id="current_password"
                                        type="password"
                                        value={form.data.current_password}
                                        onChange={(e) => form.setData('current_password', e.target.value)}
                                        autoComplete="current-password"
                                        placeholder="Your current password"
                                        invalid={Boolean(form.errors.current_password)}
                                        className="sm:max-w-sm"
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="flex items-center gap-3 border-t border-cp-surface-3 pt-5">
                            <SaveButton processing={form.processing} disabled={!form.isDirty}>
                                Save changes
                            </SaveButton>
                            <SavedNote show={form.recentlySuccessful} />
                        </div>
                    </form>
                </SettingsCard>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
