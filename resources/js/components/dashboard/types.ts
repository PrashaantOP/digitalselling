export interface Kpi {
    value: number;
    previous: number;
    change: number | null;
}

export interface DashboardStats {
    revenue: Kpi;
    sales: Kpi;
    visits: Kpi;
    visitors: Kpi;
    conversion: Kpi;
    aov: Kpi;
}

export interface ChartPoint {
    day: string;
    revenue: number;
    sales: number;
    visits: number;
}

export interface TypeRevenue {
    type: string;
    revenue: number;
    sales: number;
}

export interface TopProduct {
    id: number;
    title: string;
    type: string;
    revenue: number;
    sales: number;
}

export interface Balance {
    earned: number;
    available: number;
    in_process: number;
    paid_out: number;
}

export type ChartMetric = 'revenue' | 'sales' | 'visits';

export const productTypeLabels: Record<string, string> = {
    course: 'Courses',
    event: 'Events',
    book: 'E-books',
    locked_content: 'Locked content',
    payment_page: 'Payment pages',
    booking: '1:1 sessions',
};

export function shortDate(day: string) {
    return new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
