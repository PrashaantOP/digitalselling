import { CreateProductModal } from '@/components/dashboard/create-product-modal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCan } from '@/hooks/use-can';
import { useRefreshOnBack } from '@/hooks/use-refresh-on-back';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleDot,
    CreditCard,
    FileEdit,
    IndianRupee,
    LayoutGrid,
    Lock,
    MoreHorizontal,
    Package,
    PencilLine,
    Plus,
    Search,
    SearchX,
    GraduationCap,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Products', href: '/dashboard/products' }];
const BASE = '/dashboard/products';

type ProductType = 'course' | 'event' | 'book' | 'locked_content' | 'payment_page' | 'booking';
type ProductStatus = 'draft' | 'unpublished' | 'published';

interface ProductRow {
    id: number;
    uuid: string;
    title: string;
    type: ProductType;
    coverImage: string | null;
    price: number;
    discountedPrice: number | null;
    pricingType: 'fixed' | 'customer_decides' | 'free';
    // null = is team member ko bikri ke numbers dikhane ki permission nahi
    salesCount: number | null;
    revenueTotal: number | null;
    status: ProductStatus;
    createdAt: string;
    editUrl: string;
    typeUrl: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface ProductsIndexProps {
    products: Paginated<ProductRow>;
    counts: Record<'all' | ProductType, number>;
    statusCounts: Record<ProductStatus, number>;
    totals: { revenue: number; sales: number } | null;
    types: ProductType[];
    filters: { type: ProductType | null; status: ProductStatus | null; search: string | null };
}

/** Har type ka rang / icon — sidebar ke Apps & Tools jaisa, taaki pehchaan ek rahe */
const TYPE_META: Record<ProductType, { label: string; plural: string; icon: LucideIcon; tone: string; ring: string; module: string; listUrl: string }> = {
    course: { label: 'Course', plural: 'Courses', icon: GraduationCap, tone: 'bg-cp-brand-soft text-cp-brand-ink', ring: 'ring-cp-brand-line', module: 'courses', listUrl: '/dashboard/courses' },
    booking: { label: '1:1 Session', plural: '1:1 Sessions', icon: CalendarDays, tone: 'bg-cp-sky-soft text-cp-sky-ink', ring: 'ring-cp-sky-line', module: 'bookings', listUrl: '/dashboard/bookings/sessions' },
    event: { label: 'Event', plural: 'Events', icon: CalendarDays, tone: 'bg-cp-coral-soft text-cp-coral-dark-ink', ring: 'ring-cp-coral-line', module: 'events', listUrl: '/dashboard/events' },
    payment_page: { label: 'Payment Page', plural: 'Payment Pages', icon: CreditCard, tone: 'bg-cp-teal-soft text-cp-teal-ink', ring: 'ring-cp-teal-line', module: 'payment-pages', listUrl: '/dashboard/payment-pages' },
    book: { label: 'E-book', plural: 'E-books', icon: BookOpen, tone: 'bg-cp-warning-soft text-cp-warning-ink', ring: 'ring-cp-warning-line', module: 'books', listUrl: '/dashboard/books' },
    locked_content: { label: 'Locked Content', plural: 'Locked Content', icon: Lock, tone: 'bg-cp-accent-soft text-cp-accent-ink', ring: 'ring-cp-accent-line', module: 'locked-content', listUrl: '/dashboard/locked-content' },
};

const TYPE_ORDER: ProductType[] = ['course', 'booking', 'event', 'payment_page', 'book', 'locked_content'];

const STATUS_META: Record<ProductStatus, { label: string; chip: string; dot: string }> = {
    published: { label: 'Live', chip: 'bg-cp-success-soft text-cp-success-strong-ink', dot: 'bg-cp-success-bright' },
    draft: { label: 'Draft', chip: 'bg-cp-surface-3 text-cp-subtle', dot: 'bg-cp-faint' },
    unpublished: { label: 'Unpublished', chip: 'bg-cp-warning-soft text-cp-warning-ink', dot: 'bg-cp-warning-bright' },
};

const STATUS_TABS: { key: 'all' | ProductStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Live' },
    { key: 'draft', label: 'Drafts' },
    { key: 'unpublished', label: 'Unpublished' },
];

function StatusPill({ status }: { status: ProductStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.draft;

    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} />
            {meta.label}
        </span>
    );
}

function TypeChip({ type }: { type: ProductType }) {
    const meta = TYPE_META[type];

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', meta.tone)}>
            <meta.icon className="size-3" />
            {meta.label}
        </span>
    );
}

function Thumb({ product, className }: { product: ProductRow; className?: string }) {
    const meta = TYPE_META[product.type];
    const [broken, setBroken] = useState(false);

    return (
        <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl', product.coverImage && !broken ? 'bg-cp-surface-3' : meta.tone, className)}>
            {product.coverImage && !broken ? (
                <img src={product.coverImage} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
            ) : (
                <meta.icon className="size-5" />
            )}
        </span>
    );
}

function Price({ product }: { product: ProductRow }) {
    if (product.pricingType === 'free') return <span className="font-semibold text-cp-success-ink">Free</span>;

    if (product.pricingType === 'customer_decides') {
        return (
            <span className="flex flex-col">
                <span className="font-semibold text-cp-ink">Pay what you want</span>
                {product.price > 0 && <span className="text-xs text-cp-muted">from {formatCurrency(product.price)}</span>}
            </span>
        );
    }

    const onSale = product.discountedPrice !== null && product.discountedPrice > 0 && product.discountedPrice < product.price;

    return onSale ? (
        <span className="flex items-baseline gap-1.5">
            <span className="font-semibold text-cp-ink">{formatCurrency(product.discountedPrice!)}</span>
            <span className="text-xs text-cp-faint line-through">{formatCurrency(product.price)}</span>
        </span>
    ) : (
        <span className="font-semibold text-cp-ink">{formatCurrency(product.price)}</span>
    );
}

function RowActions({ product }: { product: ProductRow }) {
    const meta = TYPE_META[product.type];

    return (
        <div className="flex items-center justify-end gap-1.5">
            <Link
                href={product.editUrl}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cp-line bg-cp-surface px-3 text-xs font-semibold text-cp-ink transition hover:border-cp-brand hover:text-cp-brand-ink"
            >
                <PencilLine className="size-3.5" /> Edit
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={`More actions for ${product.title || 'product'}`}
                        className="flex size-8 items-center justify-center rounded-lg text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink"
                    >
                        <MoreHorizontal className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                        <Link href={product.editUrl}>
                            <FileEdit className="size-4" /> Open editor
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={product.typeUrl}>
                            <meta.icon className="size-4" /> Go to {meta.plural}
                        </Link>
                    </DropdownMenuItem>
                    <p className="px-2 pt-1 pb-1.5 text-[11px] leading-snug text-cp-muted">Publish, duplicate and delete live on the {meta.plural} page.</p>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default function ProductsIndex({ products, counts, statusCounts, totals, types, filters }: ProductsIndexProps) {
    // back/forward se lautne par list stale na rahe (naya draft ya duplicate turant dikhe)
    useRefreshOnBack(['products', 'counts', 'statusCounts', 'totals']);

    const { can } = useCan();
    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);

    const visibleTypes = TYPE_ORDER.filter((t) => types.includes(t));
    // kam se kam ek type banane ki permission ho tabhi "Create product"
    const canCreate = visibleTypes.some((t) => can(`${TYPE_META[t].module}.edit`));
    const hasFilters = Boolean(filters.type || filters.status || filters.search);
    const activeType = filters.type ?? 'all';
    const activeStatus = filters.status ?? 'all';
    const drafts = statusCounts.draft + statusCounts.unpublished;

    function visit(next: Partial<{ type: string | null; status: string | null; search: string | null; page: number }>) {
        const merged = { type: filters.type, status: filters.status, search: search.trim() || null, ...next };
        router.get(
            BASE,
            { type: merged.type || undefined, status: merged.status || undefined, search: merged.search || undefined, page: merged.page && merged.page > 1 ? merged.page : undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        visit({});
    }

    function clearFilters() {
        setSearch('');
        router.get(BASE, {}, { preserveState: true, replace: true });
    }

    const tiles = [
        { label: 'Total products', value: String(counts.all), sub: `${visibleTypes.filter((t) => counts[t] > 0).length} of ${visibleTypes.length} product types`, icon: Package, tone: 'bg-cp-brand-soft text-cp-brand-ink' },
        { label: 'Live', value: String(statusCounts.published), sub: 'Visible on your store', icon: CircleDot, tone: 'bg-cp-success-soft text-cp-success-ink' },
        { label: 'Drafts', value: String(drafts), sub: statusCounts.unpublished ? `${statusCounts.unpublished} unpublished` : 'Not on your store yet', icon: FileEdit, tone: 'bg-cp-surface-3 text-cp-subtle' },
        totals
            ? { label: 'Lifetime revenue', value: formatCurrency(totals.revenue), sub: `${totals.sales} sale${totals.sales === 1 ? '' : 's'} so far`, icon: IndianRupee, tone: 'bg-cp-warning-soft text-cp-warning-ink' }
            : { label: 'Product types', value: String(visibleTypes.length), sub: 'You can manage', icon: LayoutGrid, tone: 'bg-cp-warning-soft text-cp-warning-ink' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />
            <div className="relative isolate flex flex-1 flex-col overflow-x-clip bg-cp-canvas">
                {/* landing jaisa halka background — upar blue wash + grid, neeche fade */}
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-linear-to-b from-blue-50/70 to-transparent dark:from-indigo-500/10" />
                <div aria-hidden className="home-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] mask-[radial-gradient(ellipse_at_top,black_25%,transparent_70%)]" />

                <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* ---- header ---- */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Products</h1>
                                <span className="rounded-full bg-cp-surface px-2 py-0.5 text-[11px] font-semibold text-cp-subtle shadow-sm ring-1 ring-cp-line">{counts.all}</span>
                            </div>
                            <p className="mt-1 text-sm text-cp-muted">Everything you sell — courses, sessions, events, e-books and more — in one place.</p>
                        </div>
                        {canCreate && (
                            <Button onClick={() => setCreating(true)} className="h-10 w-full text-white bg-cp-brand px-4 font-semibold shadow-sm hover:bg-cp-brand-hover sm:w-auto">
                                <Plus className="size-4" /> Create product
                            </Button>
                        )}
                    </div>

                    {counts.all === 0 && !hasFilters ? (
                        /* ---- pehli baar: kya bana sakte ho ---- */
                        <section className="rounded-2xl bg-cp-surface p-6 shadow-sm ring-1 ring-cp-surface-3 md:p-10">
                            <div className="mx-auto max-w-xl text-center">
                                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cp-brand-soft text-cp-brand-ink">
                                    <Package className="size-7" />
                                </span>
                                <h2 className="mt-4 text-xl font-bold text-cp-ink">Create your first product</h2>
                                <p className="mt-1.5 text-sm text-cp-muted">Pick what you want to sell. You can add as many products as you like — each gets its own page and checkout.</p>
                            </div>
                            <div className="mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
                                {visibleTypes.map((type) => {
                                    const meta = TYPE_META[type];

                                    return (
                                        <Link
                                            key={type}
                                            href={meta.listUrl}
                                            className="group flex flex-col items-start gap-3 rounded-2xl border border-cp-surface-3 bg-cp-surface-2 p-4 transition hover:-translate-y-0.5 hover:border-cp-brand-line hover:bg-cp-surface hover:shadow-md"
                                        >
                                            <span className={cn('flex size-11 items-center justify-center rounded-xl', meta.tone)}>
                                                <meta.icon className="size-5" />
                                            </span>
                                            <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-cp-ink">
                                                {meta.plural}
                                                <ArrowRight className="size-4 text-cp-line-stronger transition group-hover:translate-x-0.5 group-hover:text-cp-brand-ink" />
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ) : (
                        <>
                            {/* ---- summary tiles ---- */}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {tiles.map((tile) => (
                                    <div key={tile.label} className="flex items-start gap-3 rounded-2xl bg-cp-surface p-4 shadow-sm ring-1 ring-cp-surface-3">
                                        <span className={cn('hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex', tile.tone)}>
                                            <tile.icon className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-cp-muted">{tile.label}</p>
                                            <p className="mt-0.5 truncate text-xl font-bold text-cp-ink tabular-nums">{tile.value}</p>
                                            <p className="mt-0.5 truncate text-[11px] text-cp-faint">{tile.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ---- filters ---- */}
                            <div className="flex flex-col gap-3 rounded-2xl bg-cp-surface p-3 shadow-sm ring-1 ring-cp-surface-3 md:p-4">
                                {/* phone pe side scroll, badi screen pe wrap */}
                                <div data-scroll-x className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 md:flex-wrap md:overflow-visible">
                                    <button
                                        type="button"
                                        onClick={() => visit({ type: null, page: 1 })}
                                        className={cn(
                                            'flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition',
                                            activeType === 'all' ? 'bg-cp-solid text-white' : 'bg-cp-canvas text-cp-body hover:bg-cp-surface-3',
                                        )}
                                    >
                                        All
                                        <span className={cn('rounded-full px-1.5 text-[11px]', activeType === 'all' ? 'bg-white/20' : 'bg-cp-surface text-cp-muted')}>{counts.all}</span>
                                    </button>
                                    {visibleTypes.map((type) => {
                                        const meta = TYPE_META[type];
                                        const active = activeType === type;

                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => visit({ type, page: 1 })}
                                                className={cn(
                                                    'flex h-9 shrink-0 items-center gap-2 rounded-full pr-3 pl-1.5 text-sm font-semibold transition',
                                                    active ? cn('bg-cp-surface text-cp-ink shadow-sm ring-2', meta.ring) : 'bg-cp-canvas text-cp-body hover:bg-cp-surface-3',
                                                )}
                                            >
                                                <span className={cn('flex size-6 items-center justify-center rounded-full', meta.tone)}>
                                                    <meta.icon className="size-3.5" />
                                                </span>
                                                {meta.plural}
                                                <span className={cn('rounded-full px-1.5 text-[11px]', active ? 'bg-cp-surface-3 text-cp-subtle' : 'bg-cp-surface text-cp-muted')}>{counts[type]}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <form onSubmit={submitSearch} className="relative w-full sm:max-w-sm">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cp-faint" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search products by title…"
                                            aria-label="Search products"
                                            className="h-10 w-full rounded-xl border border-cp-line bg-cp-surface-2 pr-9 pl-9 text-sm text-cp-ink outline-none placeholder:text-cp-faint focus:border-cp-brand focus:bg-cp-surface focus:ring-2 focus:ring-cp-brand/15"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearch('');
                                                    visit({ search: null, page: 1 });
                                                }}
                                                aria-label="Clear search"
                                                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-cp-faint hover:bg-cp-surface-3 hover:text-cp-ink"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        )}
                                    </form>

                                    <div data-scroll-x className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl bg-cp-canvas p-1">
                                        {STATUS_TABS.map((tab) => {
                                            const active = activeStatus === tab.key;
                                            const count = tab.key === 'all' ? counts.all : statusCounts[tab.key];

                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => visit({ status: tab.key === 'all' ? null : tab.key, page: 1 })}
                                                    className={cn(
                                                        'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                                                        active ? 'bg-cp-surface text-cp-ink shadow-sm' : 'text-cp-subtle hover:text-cp-ink',
                                                    )}
                                                >
                                                    {tab.key !== 'all' && <span className={cn('size-1.5 rounded-full', STATUS_META[tab.key].dot)} />}
                                                    {tab.label}
                                                    <span className="text-cp-faint">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ---- list ---- */}
                            <section className="overflow-hidden rounded-2xl bg-cp-surface shadow-sm ring-1 ring-cp-surface-3">
                                {products.data.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                                        <span className="flex size-12 items-center justify-center rounded-2xl bg-cp-canvas text-cp-muted">
                                            <SearchX className="size-6" />
                                        </span>
                                        <p className="mt-1 font-semibold text-cp-ink">No products match</p>
                                        <p className="text-sm text-cp-muted">Try another type, status or search word.</p>
                                        <button type="button" onClick={clearFilters} className="mt-2 text-sm font-semibold text-cp-brand-ink hover:underline">
                                            Clear filters
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* column heads — sirf badi screen pe */}
                                        <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px_120px_150px] items-center gap-4 border-b border-cp-surface-3 bg-cp-surface-2 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-cp-muted uppercase md:grid">
                                            <span>Product</span>
                                            <span>Price</span>
                                            <span>Sales</span>
                                            <span>Status</span>
                                            <span className="text-right">Actions</span>
                                        </div>

                                        <ul className="divide-y divide-cp-surface-3">
                                            {products.data.map((product) => (
                                                <li
                                                    key={product.id}
                                                    className="group grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-4 transition hover:bg-cp-surface-2 md:grid-cols-[minmax(0,1fr)_150px_150px_120px_150px] md:items-center md:gap-4 md:px-5 md:py-3.5"
                                                >
                                                    {/* product */}
                                                    <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                                                        <Thumb product={product} className="size-12" />
                                                        <div className="min-w-0">
                                                            <Link href={product.editUrl} className="block truncate font-semibold text-cp-ink transition group-hover:text-cp-brand-ink">
                                                                {product.title || 'Untitled'}
                                                            </Link>
                                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                <TypeChip type={product.type} />
                                                                <span className="text-[11px] text-cp-faint">Created {product.createdAt}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* phone pe: price + sales ek line me, status saath */}
                                                    <div className="col-span-2 grid grid-cols-3 gap-2 rounded-xl bg-cp-surface-2 p-2.5 text-sm md:contents">
                                                        <div className="md:block">
                                                            <p className="text-[10px] font-semibold tracking-wider text-cp-faint uppercase md:hidden">Price</p>
                                                            <Price product={product} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold tracking-wider text-cp-faint uppercase md:hidden">Sales</p>
                                                            {product.revenueTotal === null ? (
                                                                <span className="text-xs text-cp-faint">Hidden</span>
                                                            ) : (
                                                                <span className="flex flex-col">
                                                                    <span className="font-semibold text-cp-ink tabular-nums">{formatCurrency(product.revenueTotal)}</span>
                                                                    <span className="text-xs text-cp-muted">
                                                                        {product.salesCount} sale{product.salesCount === 1 ? '' : 's'}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-cp-faint uppercase md:hidden">Status</p>
                                                            <StatusPill status={product.status} />
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2 md:col-span-1">
                                                        <RowActions product={product} />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* pagination */}
                                        <div className="flex flex-col items-center justify-between gap-3 border-t border-cp-surface-3 px-5 py-3.5 sm:flex-row">
                                            <p className="text-sm text-cp-muted">
                                                Showing{' '}
                                                <span className="font-semibold text-cp-ink">
                                                    {products.from ?? 0}–{products.to ?? 0}
                                                </span>{' '}
                                                of <span className="font-semibold text-cp-ink">{products.total}</span>
                                            </p>
                                            {products.last_page > 1 && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={products.current_page <= 1}
                                                        onClick={() => visit({ page: products.current_page - 1 })}
                                                        aria-label="Previous page"
                                                        className="flex size-9 items-center justify-center rounded-lg border border-cp-line bg-cp-surface text-cp-body transition hover:border-cp-line-stronger disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <ChevronLeft className="size-4" />
                                                    </button>
                                                    <span className="px-2 text-sm font-semibold text-cp-ink tabular-nums">
                                                        {products.current_page} <span className="font-normal text-cp-faint">/ {products.last_page}</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={products.current_page >= products.last_page}
                                                        onClick={() => visit({ page: products.current_page + 1 })}
                                                        aria-label="Next page"
                                                        className="flex size-9 items-center justify-center rounded-lg border border-cp-line bg-cp-surface text-cp-body transition hover:border-cp-line-stronger disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <ChevronRight className="size-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </div>

            <CreateProductModal open={creating} onClose={() => setCreating(false)} />
        </AppLayout>
    );
}
