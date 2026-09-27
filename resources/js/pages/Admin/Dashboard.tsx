import { Card, money, PageHeader } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';
import { ArrowRight, BadgeCheck, Banknote, Wallet } from 'lucide-react';

interface Props {
    stats: {
        creators_total: number;
        creators_active: number;
        creators_suspended: number;
        creators_new_this_month: number;
        gmv: number;
        gmv_this_month: number;
        commission: number;
        commission_this_month: number;
        orders: number;
    };
    queues: { kyc_pending: number; payout_unverified: number; settlements_pending: number; settlements_pending_amount: number };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
    );
}

export default function AdminDashboard({ stats, queues }: Props) {
    const queueCards = [
        { href: '/admin/kyc', label: 'KYC waiting for review', count: queues.kyc_pending, icon: BadgeCheck, tone: 'bg-amber-50 text-amber-700' },
        { href: '/admin/payout-methods', label: 'Payout methods to verify', count: queues.payout_unverified, icon: Wallet, tone: 'bg-sky-50 text-sky-700' },
        {
            href: '/admin/settlements',
            label: 'Settlements to pay',
            count: queues.settlements_pending,
            sub: money(queues.settlements_pending_amount),
            icon: Banknote,
            tone: 'bg-indigo-50 text-indigo-700',
        },
    ];

    return (
        <AdminLayout title="Dashboard">
            <PageHeader title="Dashboard" description="The whole platform at a glance, plus the work waiting on you." />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {queueCards.map((q) => (
                    <Link key={q.href} href={q.href} className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm">
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${q.tone}`}>
                            <q.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl font-bold text-slate-900">{q.count}</p>
                            <p className="truncate text-xs text-slate-500">
                                {q.label}
                                {q.sub && ` · ${q.sub}`}
                            </p>
                        </div>
                        <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="GMV (all time)" value={money(stats.gmv)} sub={`${money(stats.gmv_this_month)} this month`} />
                <Stat label="Platform commission" value={money(stats.commission)} sub={`${money(stats.commission_this_month)} this month`} />
                <Stat label="Paid orders" value={stats.orders.toLocaleString('en-IN')} />
                <Stat label="Creators" value={stats.creators_total.toLocaleString('en-IN')} sub={`+${stats.creators_new_this_month} this month`} />
            </div>

            <Card title="Creator accounts">
                <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                    <div className="p-4">
                        <p className="text-lg font-bold text-slate-900">{stats.creators_active}</p>
                        <p className="text-xs text-slate-500">Active</p>
                    </div>
                    <div className="p-4">
                        <p className="text-lg font-bold text-rose-600">{stats.creators_suspended}</p>
                        <p className="text-xs text-slate-500">Suspended</p>
                    </div>
                    <div className="p-4">
                        <p className="text-lg font-bold text-slate-900">{stats.creators_new_this_month}</p>
                        <p className="text-xs text-slate-500">Joined this month</p>
                    </div>
                </div>
            </Card>
        </AdminLayout>
    );
}
