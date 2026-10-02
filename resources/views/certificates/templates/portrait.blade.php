{{-- Classic portrait — khada page, serif, double border, sab kuch beech me. Frame karke taangne layak. --}}
<style>
    .t-portrait { position: absolute; inset: 0; padding: 3.4cqw; font-family: Georgia, 'Times New Roman', serif; }
    .t-portrait .frame { height: 100%; border: .4cqw solid var(--ink); padding: 1.2cqw; }
    .t-portrait .inner { height: 100%; border: .16cqw solid var(--accent); padding: 7cqw 7cqw 4.5cqw; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .t-portrait .title { font-size: 8.4cqw; font-weight: 700; letter-spacing: .03em; line-height: 1.05; margin: 6cqw 0 0; }
    .t-portrait .eyebrow { margin-top: 1.4cqw; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .t-portrait .rule { width: 14cqw; height: .3cqw; background: var(--accent); margin: 5cqw 0 0; }
    .t-portrait .lead { font-size: 2.7cqw; color: var(--muted); font-style: italic; margin: 5cqw 0 0; }
    .t-portrait .name { font-size: 8cqw; font-style: italic; margin: 1.6cqw 0 0; padding: 0 3cqw 1.6cqw; border-bottom: .2cqw solid var(--accent); max-width: 100%; }
    .t-portrait .lead.second { margin-top: 4cqw; }
    .t-portrait .course { font-size: 4.4cqw; font-weight: 700; margin: 1.4cqw 0 0; }
    .t-portrait .sig { margin-top: auto; display: flex; flex-direction: column; align-items: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .t-portrait .foot { width: 100%; margin-top: 5cqw; padding-top: 2.4cqw; border-top: .12cqw solid #E4E2DA; display: flex; justify-content: space-between; align-items: flex-end; gap: 4cqw; text-align: left;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .t-portrait .foot > div:last-child { text-align: right; }
</style>

<div class="t-portrait">
    <div class="frame">
        <div class="inner">
            @if ($design['logo'])
                <img class="logo" src="{{ $design['logo'] }}" alt="">
            @else
                <div class="logo-text">{{ $creatorName }}</div>
            @endif

            <div class="title">Certificate</div>
            <div class="eyebrow">of completion</div>
            <div class="rule"></div>

            <p class="lead">This certifies that</p>
            <div class="name">{{ $studentName }}</div>
            <p class="lead second">has successfully completed</p>
            <p class="course">{{ $courseTitle }}</p>

            <div class="sig">
                @if ($design['signature'])<img class="sig-img" src="{{ $design['signature'] }}" alt="">@endif
                <div class="sig-line"></div>
                <div class="sig-name">{{ $design['signatory_name'] }}</div>
                <div class="small">{{ $design['signatory_title'] }}</div>
            </div>

            <div class="foot">
                <div>
                    <div class="sig-name">{{ $issued }}</div>
                    <div class="small">Certificate no. <span class="mono">{{ $number }}</span></div>
                </div>
                <div>
                    <div class="tiny">Verify at {{ preg_replace('#^https?://#', '', $verifyUrl) }}</div>
                    <div class="tiny">Issued via {{ config('app.name') }}</div>
                </div>
            </div>
        </div>
    </div>
</div>
