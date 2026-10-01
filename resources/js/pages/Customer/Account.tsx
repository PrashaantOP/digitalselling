import { CodeInput, FIELD, GHOST, PRIMARY } from '@/components/customer/code-input';
import CustomerLayout from '@/layouts/customer-layout';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { BadgeCheck, Info, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Props {
    account: { name: string | null; email: string; phone: string | null; phone_verified: boolean };
    /** jis number pe SMS code gaya hai (abhi confirm hona baaki) */
    pendingPhone: string | null;
    resendIn: number;
}

/** /me/account — naam, aur mobile number confirm karna taaki usse bhi login ho sake. */
export default function Account({ account, pendingPhone }: Props) {
    const name = useForm({ name: account.name ?? '' });
    const phone = useForm({ phone: account.phone_verified ? '' : (account.phone ?? '') });
    const code = useForm({ code: '' });
    const [editing, setEditing] = useState(!account.phone_verified);

    function saveName(e: FormEvent) {
        e.preventDefault();
        name.put('/me/account', { preserveScroll: true });
    }

    function sendCode(e: FormEvent) {
        e.preventDefault();
        phone.post('/me/account/phone', { preserveScroll: true });
    }

    function verify(e: FormEvent) {
        e.preventDefault();
        code.post('/me/account/phone/verify', {
            preserveScroll: true,
            onSuccess: () => {
                code.reset();
                setEditing(false);
            },
            onError: () => code.reset('code'),
        });
    }

    return (
        <CustomerLayout title="Account">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Account</h1>
                <p className="mt-1 text-sm text-[#8A8A96]">How you sign in and what appears on your certificates.</p>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <section className="rounded-xl bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold">Your details</h2>
                    <form onSubmit={saveName} className="mt-4 flex flex-col gap-3">
                        <label htmlFor="name" className="text-sm font-semibold">
                            Name
                        </label>
                        <input id="name" value={name.data.name} onChange={(e) => name.setData('name', e.target.value)} required maxLength={150} className={FIELD} />
                        <p className="text-xs text-[#8A8A96]">Printed on certificates you earn from now on. Certificates already issued keep the name they were issued with.</p>
                        {name.errors.name && <p className="text-xs font-medium text-[#C2410C]">{name.errors.name}</p>}

                        <label className="mt-2 text-sm font-semibold">Email</label>
                        <p className="rounded-lg bg-[#F6F5F2] px-3 py-2.5 text-sm text-[#4B4B57]">{account.email}</p>
                        <p className="text-xs text-[#8A8A96]">You can always sign in with a code sent to this email.</p>

                        <button type="submit" disabled={name.processing || name.data.name.trim() === (account.name ?? '')} className={cn(GHOST, 'mt-1 w-fit')}>
                            {name.processing && <Loader2 className="size-4 animate-spin" />} Save name
                        </button>
                    </form>
                </section>

                <section className="rounded-xl bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold">Mobile sign-in</h2>

                    {account.phone_verified && !editing ? (
                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#E6F6EC] px-3 py-2.5">
                                <span className="flex items-center gap-2 text-sm font-semibold text-[#059669]">
                                    <BadgeCheck className="size-4" /> {account.phone}
                                </span>
                                <span className="text-xs font-semibold text-[#059669]">Verified</span>
                            </div>
                            <p className="text-sm text-[#6B6B78]">You can sign in with this number — we'll text you a code.</p>
                            <button type="button" onClick={() => setEditing(true)} className={cn(GHOST, 'w-fit')}>
                                Change number
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-xs font-medium text-[#B46E00]">
                                <Info className="mt-px size-4 shrink-0" />
                                {account.phone_verified
                                    ? 'Your current number keeps working until the new one is confirmed.'
                                    : 'Confirm your number once to sign in with it. Until then, sign in with your email.'}
                            </div>

                            <form onSubmit={sendCode} className="mt-4 flex flex-col gap-3">
                                <label htmlFor="phone" className="text-sm font-semibold">
                                    Mobile number
                                </label>
                                <div className="flex gap-2">
                                    <input id="phone" type="tel" value={phone.data.phone} onChange={(e) => phone.setData('phone', e.target.value)} required placeholder="98765 43210" className={FIELD} />
                                    <button type="submit" disabled={phone.processing || phone.data.phone.trim() === ''} className={cn(GHOST, 'h-11 shrink-0 border-[#4F46E5] text-[#4F46E5]')}>
                                        {phone.processing ? <Loader2 className="size-4 animate-spin" /> : 'Send code'}
                                    </button>
                                </div>
                                {phone.errors.phone && (
                                    <p role="alert" className="text-xs font-medium text-[#C2410C]">
                                        {phone.errors.phone}
                                    </p>
                                )}
                            </form>

                            {pendingPhone && (
                                <form onSubmit={verify} className="mt-5 flex flex-col gap-3 border-t border-[#E4E2DA] pt-5">
                                    <p className="text-sm text-[#6B6B78]">
                                        Enter the code we texted to <span className="font-semibold text-[#14141B]">{pendingPhone}</span>.
                                    </p>
                                    <CodeInput value={code.data.code} onChange={(value) => code.setData('code', value)} autoFocus={false} />
                                    {code.errors.code && (
                                        <p role="alert" className="text-xs font-medium text-[#C2410C]">
                                            {code.errors.code}
                                        </p>
                                    )}
                                    <button type="submit" disabled={code.processing || code.data.code.length !== 6} className={PRIMARY}>
                                        {code.processing && <Loader2 className="size-4 animate-spin" />} Confirm number
                                    </button>
                                </form>
                            )}

                            {account.phone_verified && (
                                <button type="button" onClick={() => setEditing(false)} className="mt-4 text-xs font-semibold text-[#6B6B78] hover:text-[#14141B]">
                                    Keep my current number
                                </button>
                            )}
                        </>
                    )}
                </section>
            </div>
        </CustomerLayout>
    );
}
