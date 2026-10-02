{{-- Modern portrait — khada page, upar accent colour ka bada header (logo usi me), neeche bada sans-serif naam. --}}
<style>
    .t-portrait_modern { position: absolute; inset: 0; display: flex; flex-direction: column; }
    .t-portrait_modern .head { background: var(--accent); color: var(--accent-ink); padding: 8cqw 8cqw 7cqw; }
    .t-portrait_modern .logo-box { background: #fff; border-radius: 2cqw; padding: 2cqw; display: inline-flex; }
    .t-portrait_modern .logo { height: 11cqw; max-width: 34cqw; }
    .t-portrait_modern .logo-text { color: var(--accent-ink); }
    .t-portrait_modern .head .eyebrow { color: var(--accent-ink); opacity: .85; margin-top: 7cqw; }
    .t-portrait_modern .title { font-size: 9cqw; font-weight: 800; letter-spacing: -.03em; line-height: 1.02; margin: 1.2cqw 0 0; }
    .t-portrait_modern .body { flex: 1; min-height: 0; padding: 8cqw 8cqw 5cqw; display: flex; flex-direction: column; }
    .t-portrait_modern .lead { font-size: 2.6cqw; color: var(--muted); margin: 0; }
    .t-portrait_modern .name { font-size: 8.4cqw; font-weight: 800; letter-spacing: -.03em; margin: 1cqw 0 0; }
    .t-portrait_modern .bar { width: 14cqw; height: .8cqw; background: var(--accent); border-radius: 1cqw; margin: 4cqw 0; }
    .t-portrait_modern .course { font-size: 4.4cqw; font-weight: 700; letter-spacing: -.01em; margin: 1cqw 0 0; }
    .t-portrait_modern .by { font-size: 2.2cqw; color: var(--muted); margin: 2.4cqw 0 0; }
    .t-portrait_modern .foot { margin-top: auto; padding-top: 3cqw; display: flex; justify-content: space-between; align-items: flex-end; gap: 4cqw; }
    .t-portrait_modern .meta { text-align: right; }
</style>

<div class="t-portrait_modern">
    <div class="head">
        @if ($design['logo'])
            <div class="logo-box"><img class="logo" src="{{ $design['logo'] }}" alt=""></div>
        @else
            <div class="logo-text">{{ $creatorName }}</div>
        @endif
        <div class="eyebrow">Certificate of completion</div>
        <div class="title">Certificate</div>
    </div>

    <div class="body">
        <p class="lead">Awarded to</p>
        <div class="name">{{ $studentName }}</div>
        <div class="bar"></div>
        <p class="lead">for successfully completing</p>
        <p class="course">{{ $courseTitle }}</p>
        <p class="by">Issued by {{ $creatorName }}</p>

        <div class="foot">
            <div>
                @if ($design['signature'])<img class="sig-img" src="{{ $design['signature'] }}" alt="">@endif
                <div class="sig-line"></div>
                <div class="sig-name">{{ $design['signatory_name'] }}</div>
                <div class="small">{{ $design['signatory_title'] }}</div>
            </div>
            <div class="meta">
                <div class="sig-name">{{ $issued }}</div>
                <div class="small">No. <span class="mono">{{ $number }}</span></div>
                <div class="tiny">Verify at {{ preg_replace('#^https?://#', '', $verifyUrl) }}</div>
                <div class="tiny">Issued via {{ config('app.name') }}</div>
            </div>
        </div>
    </div>
</div>
