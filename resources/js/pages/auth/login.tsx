import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Form, Head, Link } from '@inertiajs/react';
import { Gift, LoaderCircle } from 'lucide-react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

// landing jaisa input look
const field = 'h-11 rounded-xl bg-white px-4 shadow-none';

export default function Login({ status, canResetPassword }: LoginProps) {
    return (
        <AuthLayout title="Welcome back" description="Log in to manage your store, products and payouts.">
            <Head title="Log in" />

            {status && (
                <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">{status}</div>
            )}

            <Form method="post" action={route('login')} resetOnSuccess={['password']} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className={field}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Your password"
                                    className={field}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox id="remember" name="remember" tabIndex={3} />
                                <Label htmlFor="remember" className="font-normal text-slate-600">
                                    Keep me logged in
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25"
                                tabIndex={4}
                                disabled={processing}
                            >
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Log in
                            </Button>
                        </div>

                        <Link
                            href={route('register')}
                            tabIndex={5}
                            className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3.5 text-sm ring-1 ring-blue-100 transition hover:ring-blue-300"
                        >
                            <Gift className="size-5 shrink-0 text-blue-600" />
                            <span className="text-slate-700">
                                New here? <span className="font-semibold text-blue-700">Create a store & get 90 days of Pro free →</span>
                            </span>
                        </Link>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
