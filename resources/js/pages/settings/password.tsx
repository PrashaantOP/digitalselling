import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { Field, SavedNote, SaveButton, SettingsCard, TextInput } from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Check, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Password settings', href: '/settings/password' }];

/** Server ka rule (AppServiceProvider → Password::defaults): 10+ akshar, bade + chhote, number */
const RULES = [
    { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
    { label: 'Upper and lower case letters', test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
    { label: 'At least one number', test: (v: string) => /\d/.test(v) },
];

function PasswordInput({ id, value, onChange, autoComplete, placeholder, invalid, inputRef }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete: string;
    placeholder: string;
    invalid?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <TextInput
                id={id}
                ref={inputRef}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                placeholder={placeholder}
                invalid={invalid}
                className="pr-11"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-cp-muted transition hover:bg-cp-canvas hover:text-cp-ink"
            >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
}

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });

    const matches = form.data.password_confirmation.length > 0 && form.data.password === form.data.password_confirmation;

    function submit(e: FormEvent) {
        e.preventDefault();
        form.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: (errors) => {
                if (errors.password) {
                    form.reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errors.current_password) {
                    form.reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />

            <SettingsLayout>
                <SettingsCard icon={KeyRound} title="Change password" description="Use a long password you don't use anywhere else. Every other device gets signed out when you change it.">
                    <form onSubmit={submit} className="grid gap-5">
                        <Field id="current_password" label="Current password" error={form.errors.current_password}>
                            <PasswordInput
                                id="current_password"
                                inputRef={currentPasswordInput}
                                value={form.data.current_password}
                                onChange={(v) => form.setData('current_password', v)}
                                autoComplete="current-password"
                                placeholder="Your current password"
                                invalid={Boolean(form.errors.current_password)}
                            />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field id="password" label="New password" error={form.errors.password}>
                                <PasswordInput
                                    id="password"
                                    inputRef={passwordInput}
                                    value={form.data.password}
                                    onChange={(v) => form.setData('password', v)}
                                    autoComplete="new-password"
                                    placeholder="New password"
                                    invalid={Boolean(form.errors.password)}
                                />
                            </Field>

                            <Field
                                id="password_confirmation"
                                label="Confirm new password"
                                error={form.errors.password_confirmation}
                                hint={
                                    form.data.password_confirmation ? (
                                        <span className={cn('font-medium', matches ? 'text-cp-success-ink' : 'text-cp-warning-ink')}>{matches ? 'Passwords match' : "Doesn't match yet"}</span>
                                    ) : undefined
                                }
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    value={form.data.password_confirmation}
                                    onChange={(v) => form.setData('password_confirmation', v)}
                                    autoComplete="new-password"
                                    placeholder="Type it again"
                                    invalid={Boolean(form.errors.password_confirmation)}
                                />
                            </Field>
                        </div>

                        <ul className="grid gap-2 rounded-xl bg-cp-canvas p-4 sm:grid-cols-3">
                            {RULES.map((rule) => {
                                const ok = rule.test(form.data.password);

                                return (
                                    <li key={rule.label} className={cn('flex items-center gap-2 text-xs font-medium transition-colors', ok ? 'text-cp-success-strong-ink' : 'text-cp-muted')}>
                                        <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full transition-colors', ok ? 'bg-cp-success-bright text-white' : 'bg-cp-line text-transparent')}>
                                            <Check className="size-3" strokeWidth={3} />
                                        </span>
                                        {rule.label}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="flex flex-wrap items-center gap-3 border-t border-cp-surface-3 pt-5">
                            <SaveButton processing={form.processing} disabled={!form.data.current_password || !form.data.password || !form.data.password_confirmation}>
                                Update password
                            </SaveButton>
                            <SavedNote show={form.recentlySuccessful}>Password updated</SavedNote>
                        </div>
                    </form>
                </SettingsCard>

                <div className="flex items-start gap-3 rounded-2xl bg-cp-surface p-4 text-sm text-cp-subtle shadow-sm ring-1 ring-cp-surface-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cp-success-soft text-cp-success-ink">
                        <ShieldCheck className="size-[18px]" />
                    </span>
                    <p>
                        Changing your password signs out every other device and emails you an alert. You can also review where you're signed in under{' '}
                        <a href="/settings/security" className="font-semibold text-cp-brand-ink hover:underline">
                            Security
                        </a>
                        .
                    </p>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
