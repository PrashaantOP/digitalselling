import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    BadgeCheck,
    Check,
    Copy,
    Crown,
    Gift,
    IndianRupee,
    Info,
    Loader2,
    Mail,
    MessageCircle,
    Minus,
    Plus,
    Share2,
    ShoppingBag,
    Sparkles,
    UserPlus,
    Users,
    Wallet,
    Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Refer & Earn', href: '/dashboard/refer-earn' }];

type ReferralStatus = 'signed_up' | 'active' | 'earning';

interface ReferralRow {
    id: number;
    name: string;
    avatar: string | null;
    status: ReferralStatus;
    earned: number;
    joined_at: string | null;
    rewarded_at: string | null;
}

interface LedgerRow {
    id: number;
    type: 'earned' | 'redeemed';
    amount: string | number;
    description: string;
    created_at: string;
}

interface Props {
    code: string;
    link: string;
    reward: number;
    balance: { earned: number; redeemed: number; balance: number; monthly_price: number; months_available: number };
    blockedReason: 'paid_subscription' | null;
    planExpiresAt: string | null;
    stats: { total: number; active: number; rewarded: number };
    referrals: ReferralRow[];
    ledger: LedgerRow[];
}

const money = (value: number | string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

const shortDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_META: Record<ReferralStatus, { label: string; chip: string; icon: typeof UserPlus }> = {
    signed_up: { label: 'Signed up', chip: 'bg-[#F0EFEA] text-[#6B6B78]', icon: UserPlus },
    active: { label: 'Store live', chip: 'bg-[#E6F2FF] text-[#0284C7]', icon: Sparkles },
    earning: { label: 'Earned', chip: 'bg-[#E6F6EC] text-[#059669]', icon: BadgeCheck },
};

function StatTile({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-7 items-center justify-center rounded-lg', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
            <span className="mt-1 text-xs text-[#8A8A96]">{sub}</span>
        </div>
    );
}

export default function ReferralIndex({ code, link, reward, balance, blockedReason, planExpiresAt, stats, referrals, ledger }: Props) {
    const [copied, setCopied] = useState(false);
    const [months, setMonths] = useState(1);
    const [redeeming, setRedeeming] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => setMonths(Math.max(1, Math.min(balance.months_available, 1))), [balance.months_available]);
    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const shareText = `I'm selling my courses and sessions on Kiln — join with my link and get 90 days of Pro free: ${link}`;
    const canRedeem = balance.months_available >= 1 && !blockedReason;
    const cost = months * balance.monthly_price;

    function copyLink() {
        navigator.clipboard?.writeText(link);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    }

    function redeem() {
        if (!canRedeem || redeeming) return;
        setRedeeming(true);
        router.post(
            '/dashboard/refer-earn/redeem',
            { months },
            {
                preserveScroll: true,
                onSuccess: () => setNotice(`${months} month${months > 1 ? 's' : ''} of Pro added to your account.`),
                onFinish: () => setRedeeming(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Refer & Earn" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col gap-1 pt-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Refer &amp; Earn</h1>
                            <span className="rounded-full bg-[#FFF4DB] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#B46E00] uppercase">
                                {money(reward)} per referral
                            </span>
                        </div>
                        <p className="text-sm text-[#8A8A96]">
                            Share your link — when a creator you referred makes their first sale, you earn {money(reward)} in credit.
                        </p>
                    </div>

                    {notice && (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-[#E6F6EC] p-3.5 text-[13px] font-semibold text-[#059669]">
                            <Check className="size-4" /> {notice}
                        </div>
                    )}

                    {/* Hero — referral link */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#6D28D9] to-[#DB2777] p-5 text-white shadow-lg sm:p-7">
                        <span className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-3xl" />
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">
                                    <Gift className="size-3.5" /> Your referral link
                                </span>
                                <p className="mt-3 text-xl leading-snug font-extrabold tracking-tight text-balance sm:text-2xl lg:text-3xl">
                                    {money(reward)} for every successful referral
                                </p>
                                <p className="mt-1.5 max-w-lg text-sm text-white/75">
                                    Credit goes straight into your Pro subscription — {money(balance.monthly_price)} = 1 month of Pro.
                                </p>
                            </div>

                            <div className="flex w-full flex-col gap-2.5 lg:max-w-md">
                                <div className="flex items-center gap-2 rounded-xl bg-white/12 p-1.5 pl-3.5 ring-1 ring-white/20">
                                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/90">{link}</span>
                                    <button
                                        type="button"
                                        onClick={copyLink}
                                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-bold text-[#4F46E5] transition hover:bg-white/90"
                                    >
                                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg bg-black/15 px-2.5 py-1 font-mono text-xs tracking-widest">{code}</span>
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold transition hover:bg-white/25"
                                    >
                                        <MessageCircle className="size-3.5" /> WhatsApp
                                    </a>
                                    <a
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold transition hover:bg-white/25"
                                    >
                                        <Share2 className="size-3.5" /> Post
                                    </a>
                                    <a
                                        href={`mailto:?subject=${encodeURIComponent('Join me on Kiln')}&body=${encodeURIComponent(shareText)}`}
                                        className="flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold transition hover:bg-white/25"
                                    >
                                        <Mail className="size-3.5" /> Email
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatTile
                            label="Referrals"
                            value={String(stats.total)}
                            sub={`${stats.rewarded} made their first sale`}
                            icon={<Users className="size-3.5" />}
                            tone="bg-[#EEF2FF] text-[#4F46E5]"
                        />
                        <StatTile
                            label="Total earned"
                            value={money(balance.earned)}
                            sub={`${money(reward)} × ${stats.rewarded} referral${stats.rewarded === 1 ? '' : 's'}`}
                            icon={<Gift className="size-3.5" />}
                            tone="bg-[#FFF4DB] text-[#B46E00]"
                        />
                        <StatTile
                            label="Used for Pro"
                            value={money(balance.redeemed)}
                            sub="Applied to your subscription"
                            icon={<Crown className="size-3.5" />}
                            tone="bg-[#F1EAFE] text-[#7C3AED]"
                        />
                        <StatTile
                            label="Available"
                            value={money(balance.balance)}
                            sub={balance.months_available > 0 ? `Enough for ${balance.months_available} month${balance.months_available > 1 ? 's' : ''} of Pro` : 'Not enough to redeem yet'}
                            icon={<Wallet className="size-3.5" />}
                            tone="bg-[#E6F6EC] text-[#059669]"
                        />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        {/* Referral list */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                            <div className="border-b border-[#E4E2DA]/70 px-5 py-4 sm:px-6">
                                <h2 className="text-base font-semibold text-[#14141B]">Your referrals</h2>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">Signed up → store live → {money(reward)} on their first sale</p>
                            </div>

                            {referrals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                    <span className="flex size-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                                        <UserPlus className="size-7" />
                                    </span>
                                    <h3 className="text-lg font-semibold text-[#14141B]">No referrals yet</h3>
                                    <p className="max-w-sm text-sm text-[#8A8A96]">
                                        Send the link above to a creator. When they join and make their first sale, {money(reward)} lands in your
                                        account.
                                    </p>
                                    <Button onClick={copyLink} className="mt-1 bg-[#4F46E5] hover:bg-[#4338CA]">
                                        <Copy className="size-4" /> Copy your link
                                    </Button>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#E4E2DA]/50">
                                    {referrals.map((row) => {
                                        const meta = STATUS_META[row.status] ?? STATUS_META.signed_up;

                                        return (
                                            <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
                                                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF2FF] text-sm font-bold text-[#4F46E5]">
                                                    {row.avatar ? (
                                                        <img src={`/assets/${row.avatar}`} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        row.name.charAt(0).toUpperCase()
                                                    )}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-semibold text-[#14141B]">{row.name}</p>
                                                    <p className="text-xs text-[#8A8A96]">Joined {shortDate(row.joined_at)}</p>
                                                </div>
                                                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
                                                    <meta.icon className="size-3" /> {meta.label}
                                                </span>
                                                <span className="w-16 text-right text-[13px] font-bold text-[#14141B]">
                                                    {row.earned > 0 ? money(row.earned) : '—'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Redeem + how it works */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-[#F1EAFE] text-[#7C3AED]">
                                        <Crown className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold text-[#14141B]">Redeem for Pro</h3>
                                </div>
                                <p className="mt-2 text-xs text-[#8A8A96]">
                                    {money(balance.monthly_price)} = 1 month of Pro (10% commission). Anything left over stays in your balance.
                                </p>

                                {blockedReason === 'paid_subscription' ? (
                                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-[12px] font-medium text-[#B46E00]">
                                        <Info className="mt-px size-4 shrink-0" />
                                        Your paid Pro subscription is active — you can use this credit once it ends.
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F6F5F2] p-2">
                                            <button
                                                type="button"
                                                onClick={() => setMonths((m) => Math.max(1, m - 1))}
                                                disabled={months <= 1}
                                                aria-label="Fewer months"
                                                className="flex size-8 items-center justify-center rounded-md bg-white text-[#4B4B57] shadow-sm transition hover:text-[#14141B] disabled:opacity-40"
                                            >
                                                <Minus className="size-4" />
                                            </button>
                                            <span className="text-center">
                                                <span className="block text-lg font-bold text-[#14141B]">
                                                    {months} month{months > 1 ? 's' : ''}
                                                </span>
                                                <span className="text-[11px] text-[#8A8A96]">{money(cost)} credit</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setMonths((m) => Math.min(balance.months_available || 1, m + 1))}
                                                disabled={months >= balance.months_available}
                                                aria-label="More months"
                                                className="flex size-8 items-center justify-center rounded-md bg-white text-[#4B4B57] shadow-sm transition hover:text-[#14141B] disabled:opacity-40"
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        </div>

                                        <Button onClick={redeem} disabled={!canRedeem || redeeming} className="mt-3 w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                                            {redeeming ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                                            {redeeming ? 'Applying…' : 'Redeem now'}
                                        </Button>

                                        {!canRedeem && (
                                            <p className="mt-2 text-center text-[11px] text-[#8A8A96]">
                                                You can redeem once you reach {money(balance.monthly_price)} — you have {money(balance.balance)} so far.
                                            </p>
                                        )}
                                        {planExpiresAt && (
                                            <p className="mt-2 text-center text-[11px] text-[#8A8A96]">Your Pro runs until {shortDate(planExpiresAt)}.</p>
                                        )}
                                    </>
                                )}

                                <p className="mt-3 flex items-start gap-1.5 border-t border-[#E4E2DA]/70 pt-3 text-[11px] text-[#8A8A96]">
                                    <Info className="mt-px size-3.5 shrink-0" />
                                    Referral credit can only be used for Pro — it cannot be withdrawn to a bank account.
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-[#14141B]">How it works</h3>
                                <ol className="mt-4 flex flex-col gap-3.5">
                                    {[
                                        { icon: <Share2 className="size-4" />, tone: 'bg-[#EEF2FF] text-[#4F46E5]', text: 'Send your link to a creator.' },
                                        { icon: <UserPlus className="size-4" />, tone: 'bg-[#E6F2FF] text-[#0284C7]', text: 'They join and set up their store (90 days of Pro free).' },
                                        { icon: <ShoppingBag className="size-4" />, tone: 'bg-[#FFF4DB] text-[#B46E00]', text: 'They make their first successful sale.' },
                                        { icon: <IndianRupee className="size-4" />, tone: 'bg-[#E6F6EC] text-[#059669]', text: `${money(reward)} lands in your credit — ready for Pro.` },
                                    ].map((step, index) => (
                                        <li key={step.text} className="flex items-start gap-3">
                                            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', step.tone)}>{step.icon}</span>
                                            <span className="text-xs leading-relaxed text-[#6B6B78]">
                                                <span className="font-semibold text-[#14141B]">Step {index + 1}.</span> {step.text}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {ledger.length > 0 && (
                                <div className="rounded-xl bg-white p-5 shadow-sm">
                                    <h3 className="text-sm font-semibold text-[#14141B]">Credit history</h3>
                                    <ul className="mt-3 flex flex-col gap-2">
                                        {ledger.map((row) => (
                                            <li key={row.id} className="flex items-center gap-2.5 rounded-lg bg-[#F6F5F2]/60 p-2.5">
                                                <span
                                                    className={cn(
                                                        'flex size-7 shrink-0 items-center justify-center rounded-md',
                                                        row.type === 'earned' ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#F1EAFE] text-[#7C3AED]',
                                                    )}
                                                >
                                                    {row.type === 'earned' ? <Gift className="size-3.5" /> : <Crown className="size-3.5" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[12px] font-semibold text-[#14141B]">{row.description}</span>
                                                    <span className="text-[11px] text-[#8A8A96]">{shortDate(row.created_at)}</span>
                                                </span>
                                                <span className={cn('text-[13px] font-bold', row.type === 'earned' ? 'text-[#059669]' : 'text-[#7C3AED]')}>
                                                    {row.type === 'earned' ? '+' : '−'}
                                                    {money(row.amount)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
