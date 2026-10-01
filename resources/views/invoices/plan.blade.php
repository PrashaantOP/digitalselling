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
    $pct = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $seller = $invoice->seller ?? [];
    $issuedAt = ($invoice->paid_at ?? $invoice->created_at)?->copy()->setTimezone('Asia/Kolkata');
    $period = fn ($d) => $d?->copy()->setTimezone('Asia/Kolkata')->format('d M Y');
    $rate = (float) $invoice->gst_rate;
    $igst = (float) $invoice->igst_amount > 0;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Invoice {{ $invoice->invoice_number }}</title>
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
        .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; background: #E6F6EC; color: #059669; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #8A8A96; background: #F6F5F2; padding: 10px 12px; }
        td { padding: 12px; border-bottom: 1px solid #F0EFEA; vertical-align: top; }
        .totals { margin-left: auto; width: 320px; margin-top: 16px; }
        .totals div { display: flex; justify-content: space-between; padding: 6px 12px; }
        .totals .grand { border-top: 1px solid #E4E2DA; margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 700; }
        .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E4E2DA; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 640px) {
            .sheet { padding: 24px 16px; border-radius: 0; }
            .head, .parties, .foot { grid-template-columns: 1fr; flex-direction: column; }
            .right { text-align: left; }
            td.right, th.right, .totals .right { text-align: right; }
            .totals { width: 100%; }
        }
        @media print {
            @page { size: A4; margin: 14mm; }
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; border-radius: 0; }
            th, .chip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
                <h1>Tax Invoice</h1>
                <div class="muted small">Invoice no. <span class="strong" style="color:#14141B">{{ $invoice->invoice_number }}</span></div>
                <div class="muted small">Date {{ $issuedAt?->format('d M Y') }}</div>
            </div>
            <div class="right">
                <div class="strong" style="font-size:16px">{{ $seller['name'] ?? config('app.name') }}</div>
                @if (! empty($seller['legal_name']) && $seller['legal_name'] !== ($seller['name'] ?? null))
                    <div class="small">{{ $seller['legal_name'] }}</div>
                @endif
                @if (! empty($seller['address']))<div class="muted small">{{ $seller['address'] }}</div>@endif
                @if (! empty($seller['state']))<div class="muted small">{{ $seller['state'] }}</div>@endif
                @if (! empty($seller['email']))<div class="muted small">{{ $seller['email'] }}</div>@endif
                @if (! empty($seller['gstin']))<div class="small">GSTIN: <span class="strong">{{ $seller['gstin'] }}</span></div>@endif
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="label">Billed to</div>
                <div class="strong">{{ $invoice->billing_name ?: 'Creator' }}</div>
                @if ($invoice->billing_email)<div class="small">{{ $invoice->billing_email }}</div>@endif
                @if ($invoice->billing_state)<div class="small muted">Place of supply: {{ $invoice->billing_state }}</div>@endif
                @if ($invoice->billing_gstin)<div class="small">GSTIN: <span class="strong">{{ $invoice->billing_gstin }}</span></div>@endif
            </div>
            <div class="right">
                <div class="label">Payment</div>
                <span class="chip">Paid</span>
                @if ($issuedAt)<div class="small" style="margin-top:6px">{{ $issuedAt->format('d M Y, h:i A') }}</div>@endif
                @if ($invoice->purchase?->gateway_payment_id)<div class="small muted">Ref {{ $invoice->purchase->gateway_payment_id }}</div>@endif
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    @if ($invoice->sac_code)<th style="width:90px">SAC</th>@endif
                    <th class="right" style="width:160px">Taxable value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="strong">{{ $invoice->description ?: 'Pro plan' }}</div>
                        @if ($invoice->period_start && $invoice->period_end)
                            <div class="small muted">{{ $period($invoice->period_start) }} – {{ $period($invoice->period_end) }}</div>
                        @endif
                        @if ((float) $invoice->credit_applied > 0)
                            <div class="small muted">Referral credit of {{ $money($invoice->credit_applied) }} applied as a discount</div>
                        @endif
                    </td>
                    @if ($invoice->sac_code)<td>{{ $invoice->sac_code }}</td>@endif
                    <td class="right">{{ $money($invoice->taxable_amount ?? $invoice->amount) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            @if ($invoice->taxable_amount !== null)
                <div><span class="muted">Taxable value</span><span>{{ $money($invoice->taxable_amount) }}</span></div>
                @if ($igst)
                    <div><span class="muted">IGST ({{ $pct($rate) }}%)</span><span>{{ $money($invoice->igst_amount) }}</span></div>
                @else
                    <div><span class="muted">CGST ({{ $pct($rate / 2) }}%)</span><span>{{ $money($invoice->cgst_amount) }}</span></div>
                    <div><span class="muted">SGST ({{ $pct($rate / 2) }}%)</span><span>{{ $money($invoice->sgst_amount) }}</span></div>
                @endif
            @endif
            <div class="grand"><span>Total paid</span><span>{{ $money($invoice->amount) }}</span></div>
        </div>

        <div class="foot small muted">
            <div>This is a computer-generated invoice and does not require a signature.</div>
            <div class="right">Thank you for being on Pro.</div>
        </div>
    </div>

    @if ($autoPrint)
        <script nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
    @endif
</body>
</html>
