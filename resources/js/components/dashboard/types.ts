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

/** SettlementService::balanceFor() se aata hai — auto-settlement ka paisa-kahan-hai view. */
export interface Balance {
    lifetime_earned: number;
    settled: number;
    in_transit: number;
    clearing: number;
    ready: number;
    blocked_reason: 'kyc' | 'payout_method' | null;
}

/** amount = creator ki kamai (net_payout_amount) — KPI / Top products jaisa */
export interface RecentOrder {
    uuid: string;
    buyer_name: string | null;
    product: string | null;
    amount: number;
    paid_at: string | null;
}

/** DashboardController::plusOffer() — sirf Free owner ke liye, warna null */
export interface PlusOffer {
    current_rate: number;
    plus_rate: number;
    monthly_price: number;
    saved_last_30: number;
    team_seats: number;
}

export type ChartMetric = 'revenue' | 'sales' | 'visits';

/** chart / sparkline me trend tabhi dikhao jab kam se kam 2 din ka data ho — ek spike graph nahi, glitch lagta hai */
export function hasTrend(series: number[]) {
    return series.filter((v) => v > 0).length >= 2;
}

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
