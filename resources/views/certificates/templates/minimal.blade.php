{{-- Minimal — safed, upar ek patli accent line, baayin taraf se shuru; sajawat kam, jagah zyada. --}}
<style>
    .t-minimal { position: absolute; inset: 0; padding: 5cqw 6cqw 3.6cqw; display: flex; flex-direction: column; border-top: 1cqw solid var(--accent); }
    .t-minimal .top { display: flex; justify-content: space-between; align-items: center; gap: 3cqw; }
    .t-minimal .logo { height: 7cqw; max-width: 22cqw; }
    .t-minimal .lead { font-size: 1.7cqw; color: var(--muted); margin: 5cqw 0 0; }
    .t-minimal .name { font-size: 5.4cqw; font-weight: 600; letter-spacing: -.025em; margin: .6cqw 0 0; }
    .t-minimal .course { font-size: 2.6cqw; font-weight: 600; margin: .5cqw 0 0; color: var(--accent); }
    .t-minimal .lead.second { margin-top: 2.4cqw; }
    .t-minimal .foot { margin-top: auto; padding-top: 2cqw; border-top: .1cqw solid #E4E2DA; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3cqw; align-items: end; }
    .t-minimal .foot > div:nth-child(2) { text-align: center; }
    .t-minimal .foot > div:last-child { text-align: right; }
    .t-minimal .sig-line { display: none; }
</style>

<div class="t-minimal">
    <div class="top">
        @if ($design['logo'])
            <img class="logo" src="{{ $design['logo'] }}" alt="">
        @else
            <div class="logo-text">{{ $creatorName }}</div>
        @endif
        <div class="eyebrow">Certificate of completion</div>
    </div>

    <p class="lead">This certifies that</p>
    <div class="name">{{ $studentName }}</div>
    <p class="lead second">has successfully completed</p>
    <p class="course">{{ $courseTitle }}</p>

    <div class="foot">
        <div>
            @if ($design['signature'])<img class="sig-img" src="{{ $design['signature'] }}" alt="">@endif
            <div class="sig-name">{{ $design['signatory_name'] }}</div>
            <div class="small">{{ $design['signatory_title'] }}</div>
        </div>
        <div>
            <div class="sig-name">{{ $issued }}</div>
            <div class="small">Date of issue</div>
        </div>
        <div>
            <div class="small">No. <span class="mono">{{ $number }}</span></div>
            <div class="tiny">Verify at {{ preg_replace('#^https?://#', '', $verifyUrl) }}</div>
            <div class="tiny">Issued via {{ config('app.name') }}</div>
        </div>
    </div>
</div>
