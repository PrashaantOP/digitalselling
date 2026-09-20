import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ProductStatus = 'draft' | 'unpublished' | 'published';
export type OrderStatus = 'pending' | 'success' | 'failed' | 'refunded';

const PRODUCT_STATUS_STYLES: Record<ProductStatus, string> = {
    published: 'bg-success-muted text-success border-transparent',
    unpublished: 'bg-muted text-muted-foreground border-transparent',
    draft: 'bg-accent text-accent-foreground border-transparent',
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
    success: 'bg-success-muted text-success border-transparent',
    pending: 'bg-secondary/15 text-secondary border-transparent',
    failed: 'bg-destructive/10 text-destructive border-transparent',
    refunded: 'bg-muted text-muted-foreground border-transparent',
};

const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
    published: 'Published',
    unpublished: 'Unpublished',
    draft: 'Draft',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
    success: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    refunded: 'Refunded',
};

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
    return (
        <Badge className={cn('gap-1.5 font-semibold', PRODUCT_STATUS_STYLES[status], className)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {PRODUCT_STATUS_LABEL[status]}
        </Badge>
    );
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
    return <Badge className={cn('font-semibold', ORDER_STATUS_STYLES[status], className)}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
    course: 'Course',
    event: 'Event',
    book: 'E-Book',
    locked_content: 'Locked Content',
    payment_page: 'Payment Page',
    booking: '1:1 Booking',
};

export function ProductTypeBadge({ type, className }: { type: string; className?: string }) {
    return (
        <Badge variant="outline" className={cn('font-medium', className)}>
            {PRODUCT_TYPE_LABEL[type] ?? type}
        </Badge>
    );
}
