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
    $ist = fn ($d, $format = 'd M Y') => $d?->copy()->setTimezone('Asia/Kolkata')->format($format);
    $method = $settlement->payoutMethod;
    $destination = $method ? ($method->type === 'upi' ? $method->upi_id : 'Bank account ending ' . substr((string) $method->account_number, -4) . ' · ' . $method->ifsc) : null;
    $statusLabel = ['pending' => 'Transfer pending', 'processing' => 'Transfer in progress', 'paid' => 'Paid', 'failed' => 'Failed'][$settlement->status] ?? ucfirst($settlement->status);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Settlement {{ $settlement->number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #F6F5F2; color: #14141B; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .toolbar { max-width: 860px; margin: 24px auto 0; padding: 0 16px; display: flex; justify-content: flex-end; gap: 8px; }
        .btn { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid #E4E2DA; background: #fff; color: #14141B; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #4F46E5; border-color: #4F46E5; color: #fff; }
        .sheet { max-width: 860px; margin: 16px auto 40px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 40px; }
        .head { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid #E4E2DA; }
        h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
        .muted { color: #8A8A96; }
        .small { font-size: 12px; }
        .right { text-align: right; }
        .label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8A8A96; margin-bottom: 6px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 0; }
        .strong { font-weight: 600; }
        .scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 560px; }
        th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8A8A96; background: #F6F5F2; padding: 10px 12px; }
        td { padding: 10px 12px; border-bottom: 1px solid #F0EFEA; vertical-align: top; font-size: 13px; }
        .totals { margin-left: auto; width: 340px; margin-top: 16px; }
        .totals div { display: flex; justify-content: space-between; gap: 16px; padding: 6px 12px; }
        .totals .grand { border-top: 1px solid #E4E2DA; margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 700; }
        .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E4E2DA; }
        @media (max-width: 640px) {
            .sheet { padding: 24px 16px; border-radius: 0; }
            .head { flex-direction: column; }
            .parties { grid-template-columns: 1fr; }
            .head .right, .parties .right { text-align: left; }
            .totals { width: 100%; }
        }
        @media print {
            @page { size: A4; margin: 14mm; }
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; border-radius: 0; }
            table { min-width: 0; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
                <h1>Settlement statement</h1>
                <div class="muted small">Settlement no. <span class="strong" style="color:#14141B">{{ $settlement->number }}</span></div>
                <div class="muted small">Created {{ $ist($settlement->created_at) }}</div>
            </div>
            <div class="right">
                <div class="strong" style="font-size:16px">{{ config('billing.seller.name') }}</div>
                @if (config('billing.seller.legal_name'))<div class="small">{{ config('billing.seller.legal_name') }}</div>@endif
                @if (config('billing.seller.gstin'))<div class="small">GSTIN: <span class="strong">{{ config('billing.seller.gstin') }}</span></div>@endif
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="label">Paid to</div>
                <div class="strong">{{ $creatorName }}</div>
                @if ($destination)<div class="small">{{ $destination }}</div>@endif
            </div>
            <div class="right">
                <div class="label">Transfer</div>
                <div class="strong">{{ $statusLabel }}</div>
                @if ($settlement->status === 'paid')
                    <div class="small">{{ $ist($settlement->processed_at, 'd M Y, h:i A') }}</div>
                    @if ($settlement->reference_number)<div class="small muted">UTR {{ $settlement->reference_number }}</div>@endif
                @endif
                @if ($settlement->period_start)
                    <div class="small muted">Sales from {{ $ist($settlement->period_start) }} to {{ $ist($settlement->period_end) }}</div>
                @endif
            </div>
        </div>

        <div class="scroll">
            <table>
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Item</th>
                        <th>Paid on</th>
                        <th class="right">Sale</th>
                        <th class="right">Commission</th>
                        <th class="right">Net</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($orders as $order)
                        <tr>
                            <td>{{ $order->order_number }}</td>
                            <td>{{ $order->product?->title ?? 'Deleted product' }}</td>
                            <td>{{ $ist($order->paid_at) }}</td>
                            <td class="right">{{ $money($order->total_amount) }}</td>
                            <td class="right">{{ $money($order->platform_fee) }}</td>
                            <td class="right">{{ $money($order->net_payout_amount) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="muted">No orders in this settlement.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="totals">
            <div><span class="muted">Gross sales</span><span>{{ $money($settlement->gross_amount) }}</span></div>
            <div><span class="muted">Platform commission</span><span>{{ $money(-1 * (float) $settlement->commission_amount) }}</span></div>
            @foreach ($adjustments as $adjustment)
                <div><span class="muted">{{ $adjustment['label'] }} — {{ $adjustment['reason'] }}</span><span>{{ $money($adjustment['amount']) }}</span></div>
            @endforeach
            <div class="grand"><span>Net settled</span><span>{{ $money($settlement->net_amount) }}</span></div>
        </div>

        <div class="foot small muted">This is a computer-generated statement and does not require a signature.</div>
    </div>
</body>
</html>
