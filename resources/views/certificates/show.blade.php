{{--
    Course certificate — printable page (browser ka "Save as PDF"). Data CertificateService::viewData() / sampleData() se.
    Sheet A4 landscape ke ratio me hai aur andar ka sab kuch container units (cqw) me — phone, iframe preview aur
    print teeno me wahi dikhta hai. Design $design['template'] se chunta hai.
--}}
@php
    $embedded = $embedded ?? false; // settings page ka iframe preview: toolbar nahi
    $issued = $issuedAt?->copy()->setTimezone('Asia/Kolkata')->format('j F Y');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Certificate {{ $number }}</title>
    <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; }
        body { background: {{ $embedded ? '#FFFFFF' : '#F6F5F2' }}; color: #14141B; font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .toolbar { max-width: 1100px; margin: 24px auto 0; padding: 0 16px; display: flex; justify-content: flex-end; gap: 8px; }
        .btn { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid #E4E2DA; background: #fff; color: #14141B; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #4F46E5; border-color: #4F46E5; color: #fff; }
        .page { max-width: {{ $embedded ? 'none' : '1100px' }}; margin: {{ $embedded ? '0' : '16px auto 40px' }}; padding: {{ $embedded ? '0' : '0 16px' }}; }

        /* A4 landscape sheet; andar ke sizes cqw me (1cqw = sheet ki chaudai ka 1%) */
        .cert { --accent: {{ $design['accent'] }}; --accent-ink: {{ $design['accent_ink'] }}; --ink: #14141B; --muted: #6B6B78;
            position: relative; width: 100%; aspect-ratio: 297 / 210; container-type: inline-size; background: #fff; color: var(--ink); overflow: hidden;
            box-shadow: {{ $embedded ? 'none' : '0 1px 3px rgba(0,0,0,.08)' }}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cert img { display: block; max-width: 100%; }
        .cert .logo { height: 9cqw; max-width: 26cqw; object-fit: contain; }
        .cert .logo-text { font-size: 2.6cqw; font-weight: 700; letter-spacing: -.01em; }
        .cert .eyebrow { font-size: 1.35cqw; font-weight: 700; letter-spacing: .32em; text-transform: uppercase; color: var(--accent); }
        .cert .name { overflow-wrap: anywhere; line-height: 1.1; }
        .cert .course { overflow-wrap: anywhere; line-height: 1.2; }
        .cert .sig-img { height: 6cqw; max-width: 22cqw; object-fit: contain; }
        .cert .sig-line { width: 22cqw; border-top: .12cqw solid var(--ink); }
        .cert .sig-name { font-size: 1.6cqw; font-weight: 700; margin-top: .7cqw; }
        .cert .small { font-size: 1.25cqw; color: var(--muted); }
        .cert .tiny { font-size: 1.05cqw; color: var(--muted); }
        .cert .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        /* radd / sample ka watermark — poore sheet pe tirchha */
        .cert .stamp { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 5; }
        .cert .stamp span { transform: rotate(-22deg); font-size: 15cqw; font-weight: 800; letter-spacing: .08em; line-height: 1; }
        .cert .stamp.revoked span { color: rgba(194, 65, 12, .22); border: .8cqw solid rgba(194, 65, 12, .22); padding: 1cqw 4cqw; border-radius: 2cqw; }
        .cert .stamp.sample span { color: rgba(20, 20, 27, .06); }

        @media print {
            @page { size: A4 landscape; margin: 0; }
            body { background: #fff; }
            .toolbar { display: none; }
            .page { max-width: none; margin: 0; padding: 0; }
            .cert { box-shadow: none; width: 100vw; height: 100vh; aspect-ratio: auto; }
        }
    </style>
</head>
<body>
    @unless ($embedded)
        <div class="toolbar">
            <button type="button" class="btn" onclick="window.close()">Close</button>
            <button type="button" class="btn btn-primary" onclick="window.print()">Download PDF</button>
        </div>
    @endunless

    <div class="page">
        <div class="cert">
            @if ($revoked)
                <div class="stamp revoked"><span>REVOKED</span></div>
            @elseif ($sample)
                <div class="stamp sample"><span>SAMPLE</span></div>
            @endif

            @include('certificates.templates.' . $design['template'])
        </div>
    </div>
</body>
</html>
