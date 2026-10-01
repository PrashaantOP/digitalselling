{{-- Modern — baayin taraf accent colour ki patti (logo usi me), daayin taraf bada sans-serif naam. --}}
<style>
    .t-modern { position: absolute; inset: 0; display: grid; grid-template-columns: 27% 1fr; }
    .t-modern .band { background: var(--accent); color: var(--accent-ink); padding: 4cqw 3cqw; display: flex; flex-direction: column; justify-content: space-between; }
    .t-modern .logo-box { background: #fff; border-radius: 1.4cqw; padding: 1.4cqw; display: inline-flex; align-self: flex-start; }
    .t-modern .logo { height: 8cqw; max-width: 18cqw; }
    .t-modern .logo-text { font-size: 2.4cqw; color: var(--accent-ink); }
    .t-modern .band .by { font-size: 1.25cqw; opacity: .8; }
    .t-modern .band .by b { display: block; font-size: 1.7cqw; opacity: 1; overflow-wrap: anywhere; }
    .t-modern .body { padding: 5cqw 5cqw 3.4cqw; display: flex; flex-direction: column; min-width: 0; }
    .t-modern .lead { font-size: 1.7cqw; color: var(--muted); margin: 2.6cqw 0 0; }
    .t-modern .name { font-size: 6cqw; font-weight: 800; letter-spacing: -.03em; margin: .6cqw 0 0; }
    .t-modern .bar { width: 9cqw; height: .5cqw; background: var(--accent); border-radius: 1cqw; margin: 2cqw 0 0; }
    .t-modern .course { font-size: 2.9cqw; font-weight: 700; margin: .6cqw 0 0; letter-spacing: -.01em; }
    .t-modern .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 3cqw; }
    .t-modern .meta { text-align: right; }
</style>

<div class="t-modern">
    <div class="band">
        @if ($design['logo'])
            <div class="logo-box"><img class="logo" src="{{ $design['logo'] }}" alt=""></div>
        @else
            <div class="logo-text">{{ $creatorName }}</div>
        @endif
        <div class="by">Issued by<b>{{ $creatorName }}</b></div>
    </div>

    <div class="body">
        <div class="eyebrow">Certificate of completion</div>
        <p class="lead">Awarded to</p>
        <div class="name">{{ $studentName }}</div>
        <div class="bar"></div>
        <p class="lead">for successfully completing</p>
        <p class="course">{{ $courseTitle }}</p>

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
