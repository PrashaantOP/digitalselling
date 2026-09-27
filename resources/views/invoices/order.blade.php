@php
    // Indian grouping (1,23,456.00) — number_format sirf western grouping deta hai
    $money = function ($v) {
        $v = round((float) $v, 2);
        [$int, $dec] = explode('.', number_format(abs($v), 2, '.', ''));
        if (strlen($int) > 3) {
            $int = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', substr($int, 0, -3)) . ',' . substr($int, -3);
        }
        return ($v < 0 ? '−' : '') . '₹' . $int . '.' . $dec;
    };
    $issuedAt = $order->paid_at ?? $order->created_at;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #F6F5F2; color: #14141B; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .toolbar { max-width: 800px; margin: 24px auto 0; padding: 0 16px; display: flex; justify-content: flex-end; gap: 8px; }
        .btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid #E4E2DA; background: #fff; color: #14141B; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .btn-primary { background: #4F46E5; border-color: #4F46E5; color: #fff; }
        .sheet { max-width: 800px; margin: 16px auto 40px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 40px; }
        .head { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid #E4E2DA; }
        h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
        .muted { color: #8A8A96; }
        .small { font-size: 12px; }
        .right { text-align: right; }
        .label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8A8A96; margin-bottom: 6px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 0; }
        .strong { font-weight: 600; }
        .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .chip-paid { background: #E6F6EC; color: #059669; }
        .chip-refunded { background: #F0EFEA; color: #6B6B78; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8A8A96; background: #F6F5F2; padding: 10px 12px; }
        td { padding: 12px; border-bottom: 1px solid #F0EFEA; vertical-align: top; }
        .totals { margin-left: auto; width: 300px; margin-top: 16px; }
        .totals div { display: flex; justify-content: space-between; padding: 6px 12px; }
        .totals .grand { border-top: 1px solid #E4E2DA; margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 700; }
        .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E4E2DA; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 640px) {
            .sheet { padding: 24px 16px; border-radius: 0; }
            .head, .parties, .foot { grid-template-columns: 1fr; flex-direction: column; }
            .totals { width: 100%; }
        }
        @media print {
            @page { size: A4; margin: 14mm; }
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; border-radius: 0; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .chip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" class="btn" onclick="window.close()">Close</button>
        <button type="button" class="btn btn-primary" onclick="window.print()">Download PDF</button>
    </div>

    <div class="sheet">
        <div class="head">
            <div>
                <h1>Invoice</h1>
                <div class="muted small">Invoice no. <span class="strong" style="color:#14141B">{{ $order->order_number }}</span></div>
                <div class="muted small">Date {{ $issuedAt?->format('d M Y') }}</div>
            </div>
            <div class="right">
                <div class="strong" style="font-size:16px">{{ $seller['name'] }}</div>
                @if ($seller['legal_name'] && $seller['legal_name'] !== $seller['name'])
                    <div class="small">{{ $seller['legal_name'] }}</div>
                @endif
                @if ($seller['email'])<div class="muted small">{{ $seller['email'] }}</div>@endif
                @if ($seller['phone'])<div class="muted small">{{ $seller['phone'] }}</div>@endif
                @if ($seller['gstin'])<div class="small">GSTIN: <span class="strong">{{ $seller['gstin'] }}</span></div>@endif
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="label">Billed to</div>
                <div class="strong">{{ $order->buyer_name ?: 'Customer' }}</div>
                @if ($order->buyer_email)<div class="small">{{ $order->buyer_email }}</div>@endif
                @if ($order->buyer_phone)<div class="small">{{ $order->buyer_phone }}</div>@endif
                @if ($order->buyer_state)<div class="small muted">{{ $order->buyer_state }}</div>@endif
                @if ($order->buyer_gstin)<div class="small">GSTIN: <span class="strong">{{ $order->buyer_gstin }}</span></div>@endif
            </div>
            <div class="right">
                <div class="label">Payment</div>
                <span class="chip {{ $order->status === 'refunded' ? 'chip-refunded' : 'chip-paid' }}">{{ $order->status === 'refunded' ? 'Refunded' : 'Paid' }}</span>
                @if ($order->paid_at)<div class="small" style="margin-top:6px">{{ $order->paid_at->format('d M Y, h:i A') }}</div>@endif
                @if ($order->payment_gateway)<div class="small muted">via {{ ucfirst($order->payment_gateway) }}</div>@endif
                @if ($order->gateway_payment_id)<div class="small muted">Ref {{ $order->gateway_payment_id }}</div>@endif
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="right" style="width:160px">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="strong">{{ $order->product?->title ?? 'Deleted product' }}</div>
                        @if ($typeLabel)<div class="small muted">{{ $typeLabel }}</div>@endif
                    </td>
                    <td class="right">{{ $money($order->base_amount) }}</td>
                </tr>
                @foreach ($order->addonItems as $addon)
                    <tr>
                        <td>
                            <div>{{ $addon->addonProduct?->title ?? 'Add-on' }}</div>
                            <div class="small muted">Add-on</div>
                        </td>
                        <td class="right">{{ $money($addon->price) }}</td>
                    </tr>
                @endforeach
                @if ($order->addonItems->isEmpty() && (float) $order->addon_amount > 0)
                    <tr>
                        <td>Add-ons</td>
                        <td class="right">{{ $money($order->addon_amount) }}</td>
                    </tr>
                @endif
            </tbody>
        </table>

        <div class="totals">
            <div><span class="muted">Subtotal</span><span>{{ $money((float) $order->base_amount + (float) $order->addon_amount) }}</span></div>
            @if ((float) $order->discount_amount > 0)
                <div><span class="muted">Discount{{ $order->coupon?->code ? ' (' . $order->coupon->code . ')' : '' }}</span><span>{{ $money(-1 * (float) $order->discount_amount) }}</span></div>
            @endif
            <div class="grand"><span>Total paid</span><span>{{ $money($order->total_amount) }}</span></div>
        </div>

        <div class="foot small muted">
            <div>This is a computer-generated invoice and does not require a signature.</div>
            <div class="right">Thank you for your purchase.</div>
        </div>
    </div>

    @if ($autoPrint)
        <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
    @endif
</body>
</html>
