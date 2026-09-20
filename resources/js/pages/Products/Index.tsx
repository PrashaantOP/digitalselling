import { ProductStatusBadge, ProductTypeBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    Calendar,
    CalendarDays,
    ChevronDown,
    Edit,
    GraduationCap,
    Lock,
    MoreVertical,
    Plus,
    Search,
    ShoppingBag,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Products', href: '/dashboard/products' }];

type ProductType = 'course' | 'event' | 'book' | 'locked_content' | 'payment_page' | 'booking';

interface ProductRow {
    id: number;
    title: string;
    type: ProductType;
    coverImage: string | null;
    price: number;
    pricingType: 'fixed' | 'customer_decides' | 'free';
    salesCount: number;
    revenueTotal: number;
    status: 'draft' | 'unpublished' | 'published';
    createdAt: string;
    editUrl: string;
    analyticsUrl: string;
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
    filters: { type: string | null; search: string | null };
}

const CREATE_OPTIONS: { type: ProductType; label: string; icon: typeof GraduationCap; storeUrl: string }[] = [
    { type: 'course', label: 'Online Course', icon: GraduationCap, storeUrl: '/dashboard/courses' },
    { type: 'book', label: 'Digital E-Book', icon: BookOpen, storeUrl: '/dashboard/books' },
    { type: 'event', label: 'Live Workshop / Event', icon: Calendar, storeUrl: '/dashboard/events' },
    { type: 'locked_content', label: 'Locked Media & Files', icon: Lock, storeUrl: '/dashboard/locked-content' },
    { type: 'payment_page', label: 'Payment Checkout Page', icon: ShoppingBag, storeUrl: '/dashboard/payment-pages' },
    { type: 'booking', label: '1:1 Coaching Booking', icon: CalendarDays, storeUrl: '/dashboard/bookings/sessions' },
];

const FILTER_TABS: { type: 'all' | ProductType; label: string }[] = [
    { type: 'all', label: 'All Products' },
    { type: 'course', label: 'Courses' },
    { type: 'book', label: 'E-books' },
    { type: 'event', label: 'Events' },
    { type: 'locked_content', label: 'Locked Content' },
    { type: 'payment_page', label: 'Payment Pages' },
    { type: 'booking', label: '1:1 Bookings' },
];

export default function ProductsIndex({ products, counts, filters }: ProductsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');

    function applyFilter(type: string | null) {
        router.get('/dashboard/products', { type: type ?? undefined, search: search || undefined }, { preserveState: true, replace: true });
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        applyFilter(filters.type);
    }

    function createProduct(storeUrl: string) {
        // Backend creates an untitled draft and redirects straight to its edit page
        // (matches how "+ Create Course" etc. behave in the type-specific index pages).
        router.post(storeUrl);
    }

    function goToPage(page: number) {
        router.get('/dashboard/products', { type: filters.type ?? undefined, search: filters.search ?? undefined, page }, { preserveState: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Manage, edit, and publish your courses, e-books, live events, and 1:1 bookings.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <form onSubmit={submitSearch} className="relative min-w-[220px] flex-1 sm:flex-initial">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title..." className="pl-9" />
                        </form>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <Plus /> Create Product <ChevronDown className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {CREATE_OPTIONS.map((opt) => (
                                    <DropdownMenuItem key={opt.type} onClick={() => createProduct(opt.storeUrl)}>
                                        <opt.icon className="size-4" />
                                        {opt.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="bg-muted flex w-full items-center gap-1 overflow-x-auto rounded-xl p-1">
                    {FILTER_TABS.map((tab) => {
                        const active = (filters.type ?? 'all') === tab.type;
                        return (
                            <button
                                key={tab.type}
                                onClick={() => applyFilter(tab.type === 'all' ? null : tab.type)}
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                    active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-xs',
                                        active ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground',
                                    )}
                                >
                                    {counts[tab.type] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <Card className="overflow-hidden py-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Pricing</TableHead>
                                <TableHead>Sales & Revenue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                                        No products in this category yet. Click "Create Product" to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                            {products.data.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex min-w-[220px] items-center gap-3">
                                            <div className="bg-muted flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                                                {product.coverImage ? (
                                                    <img src={product.coverImage} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <BookOpen className="text-muted-foreground size-5" />
                                                )}
                                            </div>
                                            <Link href={product.editUrl} className="hover:text-primary truncate font-semibold">
                                                {product.title}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <ProductTypeBadge type={product.type} />
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {product.pricingType === 'free'
                                            ? 'Free'
                                            : product.pricingType === 'customer_decides'
                                              ? 'Flexible'
                                              : formatCurrency(product.price)}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-semibold">{formatCurrency(product.revenueTotal)}</p>
                                        <p className="text-muted-foreground text-xs">{product.salesCount} sales</p>
                                    </TableCell>
                                    <TableCell>
                                        <ProductStatusBadge status={product.status} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{product.createdAt}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" asChild title="Analytics">
                                                <Link href={product.analyticsUrl}>
                                                    <BarChart3 className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" asChild title="Edit">
                                                <Link href={product.editUrl}>
                                                    <Edit className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" title="More">
                                                <MoreVertical className="size-4" />
                                            </Button>
                                        </div>
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
                                {products.from ?? 0}-{products.to ?? 0}
                            </span>{' '}
                            of <span className="text-foreground font-semibold">{products.total}</span> products
                        </p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" disabled={products.current_page <= 1} onClick={() => goToPage(products.current_page - 1)}>
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={products.current_page >= products.last_page}
                                onClick={() => goToPage(products.current_page + 1)}
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
