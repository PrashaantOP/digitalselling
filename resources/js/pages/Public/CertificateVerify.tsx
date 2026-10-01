import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { BadgeCheck, CircleSlash, SearchX, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Result {
    status: 'valid' | 'revoked' | 'not_found';
    student_name?: string | null;
    course_title?: string | null;
    creator_name?: string | null;
    issued_at?: string | null;
    revoked_at?: string | null;
}

const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

/**
 * /certificates aur /certificates/{number} — koi bhi (employer, college) certificate number se dekh sakta hai
 * ki wo asli hai ya nahi. Sirf naam, course, creator aur date dikhte hain.
 */
export default function CertificateVerify({ number, result }: { number: string | null; result: Result | null }) {
    const appName = usePage<SharedData>().props.name;
    const [value, setValue] = useState(number ?? '');

    function submit(e: FormEvent) {
        e.preventDefault();
        const clean = value.trim().toUpperCase();
        if (clean) window.location.href = `/certificates/${encodeURIComponent(clean)}`;
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-[#F6F5F2] px-4 py-10 text-[#14141B]">
            <Head title={number ? `Certificate ${number}` : 'Verify a certificate'}>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="mb-6 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">{appName.charAt(0)}</span>
                <span className="text-base font-bold">{appName}</span>
            </div>

            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2 text-[#4F46E5]">
                    <ShieldCheck className="size-5" />
                    <h1 className="text-lg font-bold tracking-tight text-[#14141B]">Verify a certificate</h1>
                </div>
                <p className="mt-1 text-sm text-[#6B6B78]">Enter the certificate number printed at the bottom of the certificate.</p>

                <form onSubmit={submit} className="mt-5 flex gap-2">
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label="Certificate number"
                        placeholder="CERT-XXXXXXXXXX"
                        maxLength={40}
                        className="h-11 min-w-0 flex-1 rounded-lg border border-[#DAD8D0] bg-white px-3 font-mono text-sm uppercase outline-none transition placeholder:font-sans placeholder:normal-case focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                    />
                    <button type="submit" disabled={value.trim() === ''} className="h-11 shrink-0 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-50">
                        Verify
                    </button>
                </form>

                {result?.status === 'valid' && (
                    <div className="mt-6 rounded-xl border border-[#BBE5CB] bg-[#F1FAF4] p-5">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#059669]">
                            <BadgeCheck className="size-5" /> This certificate is genuine
                        </p>
                        <Details result={result} number={number} />
                    </div>
                )}

                {result?.status === 'revoked' && (
                    <div className="mt-6 rounded-xl border border-[#F5C6B4] bg-[#FFF3EE] p-5">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#C2410C]">
                            <CircleSlash className="size-5" /> This certificate was revoked
                        </p>
                        <p className="mt-1 text-sm text-[#6B6B78]">It was issued, but the course creator withdrew it on {date(result.revoked_at)}. It is no longer valid.</p>
                        <Details result={result} number={number} />
                    </div>
                )}

                {result?.status === 'not_found' && (
                    <div className="mt-6 rounded-xl border border-[#E4E2DA] bg-[#FAFAF8] p-5">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#14141B]">
                            <SearchX className="size-5 text-[#8A8A96]" /> No certificate with this number
                        </p>
                        <p className="mt-1 text-sm text-[#6B6B78]">
                            We have no record of <span className="font-mono font-semibold text-[#14141B]">{number}</span>. Check the number for typos — if it still does not match, the certificate was not issued here.
                        </p>
                    </div>
                )}
            </div>

            <p className="mt-5 max-w-lg text-center text-xs text-[#8A8A96]">
                Certificates are issued by independent creators who teach on {appName}. This page only confirms that a certificate was issued and to whom.
            </p>
        </div>
    );
}

function Details({ result, number }: { result: Result; number: string | null }) {
    const rows = [
        ['Awarded to', result.student_name],
        ['Course', result.course_title],
        ['Issued by', result.creator_name],
        ['Date of issue', date(result.issued_at)],
        ['Certificate no.', number],
    ] as const;

    return (
        <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            {rows.map(([label, text]) => (
                <div key={label} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-[#8A8A96]">{label}</dt>
                    <dd className="min-w-0 text-right font-semibold break-words text-[#14141B]">{text ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}
