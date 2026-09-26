import { Form, Head, Link } from '@inertiajs/react';
import { Gift, LoaderCircle } from 'lucide-react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

// landing jaisa input look
const field = 'h-11 rounded-xl bg-white px-4 shadow-none';

export default function Register() {
    return (
        <AuthLayout title="Create your store" description="Start selling in minutes — no card required.">
            <Head title="Register" />

            {/* trial PlanPricing::trialAttributes() se register pe lagta hai */}
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm text-white shadow-lg shadow-blue-600/20">
                <Gift className="mt-0.5 size-5 shrink-0" />
                <p>
                    <span className="font-semibold">Your account starts with 90 days of Pro.</span>{' '}
                    <span className="text-blue-100">Only 10% commission on sales — gateway charges included.</span>
                </p>
            </div>

            <Form
                method="post"
                action={route('register')}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Your name"
                                    className={field}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    className={field}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <PasswordInput
                                        id="password"
                                        required
                                        tabIndex={3}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Create password"
                                        className={field}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirm password</Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        tabIndex={4}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Repeat password"
                                        className={field}
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25"
                                tabIndex={5}
                            >
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Create my free store
                            </Button>

                            <p className="text-center text-xs leading-relaxed text-slate-500">
                                By signing up you agree to our{' '}
                                <Link href="/terms" className="font-medium text-blue-700 hover:underline">
                                    Terms
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy-policy" className="font-medium text-blue-700 hover:underline">
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <TextLink href={route('login')} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
