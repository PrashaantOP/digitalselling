import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';

type Props =
    | { invalid: true }
    | { invalid: false; email: string; creatorName: string | null; role: string | null; hasAccount: boolean };

const field = 'h-11 rounded-xl bg-white px-4 shadow-none';

export default function AcceptInvite(props: Props) {
    const form = useForm({ name: '', password: '', password_confirmation: '' });

    if (props.invalid) {
        return (
            <AuthLayout title="This invite link doesn't work" description="It may have expired (links last 7 days), already been used, or been cancelled.">
                <Head title="Invite expired" />
                <p className="text-sm text-slate-600">Ask the store owner to send you a new invitation.</p>
                <TextLink href={route('login')} className="mt-6 inline-block text-sm">
                    Go to log in
                </TextLink>
            </AuthLayout>
        );
    }

    const url = window.location.pathname;

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post(url, { onFinish: () => form.reset('password', 'password_confirmation') });
    }

    return (
        <AuthLayout
            title={`Join ${props.creatorName ?? 'the'} team`}
            description={`You've been invited${props.role ? ` as ${props.role}` : ''}. ${props.hasAccount ? 'Enter your password to join.' : 'Set up your account to join.'}`}
        >
            <Head title="Accept invitation" />

            <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input value={props.email} disabled className={field} />
                </div>

                {!props.hasAccount && (
                    <div className="grid gap-2">
                        <Label htmlFor="name">Your name</Label>
                        <Input id="name" required autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className={field} />
                        <InputError message={form.errors.name} />
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="password">{props.hasAccount ? 'Your password' : 'Create a password'}</Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        autoComplete={props.hasAccount ? 'current-password' : 'new-password'}
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        className={field}
                    />
                    <InputError message={form.errors.password} />
                </div>

                {!props.hasAccount && (
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            className={field}
                        />
                    </div>
                )}

                <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={form.processing}>
                    {form.processing && <LoaderCircle className="size-4 animate-spin" />}
                    Join team
                </Button>
            </form>
        </AuthLayout>
    );
}
