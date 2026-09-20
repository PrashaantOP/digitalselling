import { OrderStatusBadge, ProductTypeBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, Receipt, Search, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payments', href: '/dashboard/payments' }];

type ProductType = 'course' | 'event' | 'book' | 'locked_content' | 'payment_page' | 'booking';
type OrderStatus = 'pending' | 'success' | 'failed' | 'refunded';

interface TransactionRow {
    id: number;
    order_number: string;
    created_at: string;
    paid_at: string | null;
    buyer_name: string | null;
    buyer_email: string | null;
    buyer_phone: string;
    total_amount: string | number;
    net_payout_amount: string | number;
    status: OrderStatus;
    product: { id: number; title: string; type: ProductType } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PaymentsSummary {
    orders: number;
    gross: string | number;
    fees: string | number;
    net: string | number;
}

interface PaymentsIndexProps {
    transactions: Paginated<TransactionRow>;
    summary: PaymentsSummary;
    filters: { status: string | null; type: string | null; from: string | null; to: string | null; search: string | null };
}

const TYPE_TABS: { type: 'all' | ProductType; label: string }[] = [
    { type: 'all', label: 'All' },
    { type: 'course', label: 'Course' },
    { type: 'event', label: 'Event' },
    { type: 'locked_content', label: 'Locked Content' },
    { type: 'payment_page', label: 'Payment Page' },
    { type: 'booking', label: 'Booking' },
    { type: 'book', label: 'Book' },
];

export default function PaymentsIndex({ transactions, summary, filters }: PaymentsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');

    function updateFilters(overrides: Partial<typeof filters>) {
        router.get(
            '/dashboard/payments',
            {
                status: filters.status ?? undefined,
                type: filters.type ?? undefined,
                from: filters.from ?? undefined,
                to: filters.to ?? undefined,
                search: search || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        updateFilters({ search: search || undefined });
    }

    function goToPage(page: number) {
        router.get(
            '/dashboard/payments',
            { status: filters.status ?? undefined, type: filters.type ?? undefined, search: filters.search ?? undefined, page },
            { preserveState: true },
        );
    }

    function exportCsv() {
        const params = new URLSearchParams();
        if (filters.type) params.set('type', filters.type);
        if (filters.status) params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        window.location.href = `/dashboard/payments/export?${params.toString()}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Your sales, payout account and verification — all in one place.</p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Net Earned</CardTitle>
                            <div className="bg-success-muted text-success flex size-9 items-center justify-center rounded-xl">
                                <Wallet className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold tracking-tight">{formatCurrency(Number(summary.net))}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Gross Sales</CardTitle>
                            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                                <Receipt className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold tracking-tight">{formatCurrency(Number(summary.gross))}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Successful Orders</CardTitle>
                            <div className="bg-secondary/10 text-secondary flex size-9 items-center justify-center rounded-xl">
                                <Receipt className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold tracking-tight">{summary.orders.toLocaleString('en-IN')}</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="bg-muted flex w-full items-center gap-1 overflow-x-auto rounded-xl p-1 sm:w-auto">
                        {TYPE_TABS.map((tab) => {
                            const active = (filters.type ?? 'all') === tab.type;
                            return (
                                <button
                                    key={tab.type}
                                    onClick={() => updateFilters({ type: tab.type === 'all' ? undefined : tab.type })}
                                    className={cn(
                                        'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                                        active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        <form onSubmit={submitSearch} className="relative min-w-[220px]">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, phone, product..."
                                className="pl-9"
                            />
                        </form>
                        <Button variant="outline" onClick={exportCsv}>
                            <Download /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* Transactions table */}
                <Card className="overflow-hidden py-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Net Payout</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                                        No payments yet. Your sales will show up here.
                                    </TableCell>
                                </TableRow>
                            )}
                            {transactions.data.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{tx.buyer_name ?? 'Anonymous'}</p>
                                        <p className="text-muted-foreground text-xs">{tx.buyer_phone}</p>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">{tx.product?.title ?? 'Deleted product'}</TableCell>
                                    <TableCell>{tx.product && <ProductTypeBadge type={tx.product.type} />}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(Number(tx.total_amount))}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(Number(tx.net_payout_amount))}</TableCell>
                                    <TableCell className="text-center">
                                        <OrderStatusBadge status={tx.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination footer */}
                    <div className="flex flex-col items-center justify-between gap-3 border-t p-4 sm:flex-row">
                        <p className="text-muted-foreground text-sm">
                            Showing{' '}
                            <span className="text-foreground font-semibold">
                                {transactions.from ?? 0}-{transactions.to ?? 0}
                            </span>{' '}
                            of <span className="text-foreground font-semibold">{transactions.total}</span> transactions
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={transactions.current_page <= 1}
                                onClick={() => goToPage(transactions.current_page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={transactions.current_page >= transactions.last_page}
                                onClick={() => goToPage(transactions.current_page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
