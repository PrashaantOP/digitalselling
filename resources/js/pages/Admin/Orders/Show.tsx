import { Badge, Card, dateTime, Field, money, PageHeader } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface Props {
    order: {
        uuid: string;
        order_number: string;
        status: string;
        buyer_name: string | null;
        buyer_email: string | null;
        buyer_phone: string | null;
        buyer_state: string | null;
        buyer_gstin: string | null;
        buyer_note: string | null;
        payment_gateway: string | null;
        gateway_order_id: string | null;
        gateway_payment_id: string | null;
        base_amount: number;
        discount_amount: number;
        addon_amount: number;
        total_amount: number;
        commission_rate: number;
        platform_fee: number;
        net_payout_amount: number;
        created_at: string | null;
        paid_at: string | null;
        product: { title: string; type: string } | null;
        creator: { uuid: string; name: string; email: string; username: string | null } | null;
        coupon: string | null;
        settlement: { uuid: string; number: string; status: string } | null;
        addons: { title: string | null; price: number }[];
        answers: { question: string | null; answer: string }[];
    };
}

export default function AdminOrderShow({ order: o }: Props) {
    return (
        <AdminLayout title={o.order_number}>
            <Link href="/admin/orders" className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-3.5" /> All orders
            </Link>
            <PageHeader title={o.order_number} description={o.product ? `${o.product.title} (${o.product.type.replace(/_/g, ' ')})` : 'Deleted product'} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Payment">
                    <dl className="divide-y divide-slate-100 px-5">
                        <Field label="Status">
                            <Badge value={o.status} label={o.status === 'success' ? 'Paid' : undefined} />
                        </Field>
                        <Field label="Base">{money(o.base_amount)}</Field>
                        {o.addon_amount > 0 && <Field label="Add-ons">{money(o.addon_amount)}</Field>}
                        {o.discount_amount > 0 && <Field label={`Discount${o.coupon ? ` (${o.coupon})` : ''}`}>− {money(o.discount_amount)}</Field>}
                        <Field label="Total paid">
                            <span className="font-bold">{money(o.total_amount)}</span>
                        </Field>
                        <Field label={`Platform fee (${o.commission_rate}%)`}>{money(o.platform_fee)}</Field>
                        <Field label="Creator net">{money(o.net_payout_amount)}</Field>
                        <Field label="Gateway">{o.payment_gateway ?? '—'}</Field>
                        <Field label="Payment ID">
                            <span className="font-mono text-xs">{o.gateway_payment_id ?? '—'}</span>
                        </Field>
                        <Field label="Created">{dateTime(o.created_at)}</Field>
                        <Field label="Paid">{dateTime(o.paid_at)}</Field>
                        <Field label="Settlement">
                            {o.settlement ? (
                                <Link href={`/admin/settlements/${o.settlement.uuid}`} className="text-indigo-600 hover:underline">
                                    {o.settlement.number} · {o.settlement.status}
                                </Link>
                            ) : (
                                'Not settled yet'
                            )}
                        </Field>
                    </dl>
                </Card>

                <div className="flex flex-col gap-5">
                    <Card title="Buyer">
                        <dl className="divide-y divide-slate-100 px-5">
                            <Field label="Name">{o.buyer_name ?? '—'}</Field>
                            <Field label="Email">{o.buyer_email ?? '—'}</Field>
                            <Field label="Phone">{o.buyer_phone ?? '—'}</Field>
                            {o.buyer_state && <Field label="State">{o.buyer_state}</Field>}
                            {o.buyer_gstin && <Field label="GSTIN">{o.buyer_gstin}</Field>}
                            {o.buyer_note && <Field label="Note">{o.buyer_note}</Field>}
                        </dl>
                    </Card>
                    <Card title="Creator" action={o.creator && <Link href={`/admin/creators/${o.creator.uuid}`} className="text-xs font-semibold text-indigo-600 hover:underline">Open creator</Link>}>
                        <dl className="divide-y divide-slate-100 px-5">
                            <Field label="Name">{o.creator?.name ?? '—'}</Field>
                            <Field label="Email">{o.creator?.email ?? '—'}</Field>
                        </dl>
                    </Card>
                    {(o.addons.length > 0 || o.answers.length > 0) && (
                        <Card title="Extras">
                            <dl className="divide-y divide-slate-100 px-5">
                                {o.addons.map((a, i) => (
                                    <Field key={`a${i}`} label={`Add-on: ${a.title ?? '—'}`}>
                                        {money(a.price)}
                                    </Field>
                                ))}
                                {o.answers.map((a, i) => (
                                    <Field key={`q${i}`} label={a.question ?? 'Question'}>
                                        {a.answer}
                                    </Field>
                                ))}
                            </dl>
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
