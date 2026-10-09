import { Field, SaveButton, SettingsCard, TextInput } from '@/layouts/settings/layout';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useRef } from 'react';

/** Account band karna — settings ke Profile page ka "danger zone". Server pending payout ho to mana karta hai (password field pe error). */
export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <SettingsCard icon={Trash2} title="Delete account" tone="bg-cp-danger-soft text-cp-danger-ink" description="Close your account and take your store offline." className="ring-cp-danger-line-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm text-cp-subtle">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-cp-danger-ink" />
                    Your store, products and buyer access stop working. Make sure all your earnings have been paid out first.
                </p>

                <Dialog>
                    <DialogTrigger asChild>
                        <button
                            type="button"
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-cp-danger-line bg-cp-surface px-4 text-sm font-semibold text-cp-danger-ink transition hover:bg-cp-danger-soft"
                        >
                            <Trash2 className="size-4" /> Delete account
                        </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl sm:max-w-md">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-cp-danger-soft text-cp-danger-ink">
                            <AlertTriangle className="size-5" />
                        </span>
                        <DialogTitle className="text-lg font-bold text-cp-ink">Delete your account?</DialogTitle>
                        <DialogDescription className="text-sm text-cp-subtle">
                            Your store goes offline and your products can no longer be bought. Enter your password to confirm.
                        </DialogDescription>

                        <Form
                            method="delete"
                            action={route('profile.destroy')}
                            options={{ preserveScroll: true }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="grid gap-5"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <Field id="delete_password" label="Password" error={errors.password}>
                                        <TextInput
                                            id="delete_password"
                                            type="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Your password"
                                            autoComplete="current-password"
                                            invalid={Boolean(errors.password)}
                                        />
                                    </Field>

                                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                        <DialogClose asChild>
                                            <SaveButton type="button" tone="outline" onClick={() => resetAndClearErrors()}>
                                                Cancel
                                            </SaveButton>
                                        </DialogClose>
                                        <SaveButton tone="danger" processing={processing}>
                                            Delete account
                                        </SaveButton>
                                    </div>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </SettingsCard>
    );
}
