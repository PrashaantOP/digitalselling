import { Head, useForm } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { type FormEvent } from 'react';

export function AdminAuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <>
            <Head title={`${title} · Admin`} />
            <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
                <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <ShieldCheck className="size-6" />
                    </span>
                    <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                    <div className="mt-6">{children}</div>
                </div>
            </main>
        </>
    );
}

export const INPUT = 'h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15';

export default function AdminLogin() {
    const form = useForm({ email: '', password: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/admin/login', { onFinish: () => form.reset('password') });
    }

    return (
        <AdminAuthShell title="Platform admin" subtitle="Restricted area. Every sign-in is logged.">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">Email</span>
                    <input type="email" required autoFocus autoComplete="username" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className={INPUT} />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">Password</span>
                    <input type="password" required autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className={INPUT} />
                </label>
                {(form.errors.email || form.errors.password) && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{form.errors.email ?? form.errors.password}</p>
                )}
                <button type="submit" disabled={form.processing} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                    {form.processing && <Loader2 className="size-4 animate-spin" />}
                    Continue
                </button>
                <p className="text-center text-[11px] text-slate-400">We'll email you a 6-digit code to finish signing in.</p>
            </form>
        </AdminAuthShell>
    );
}
