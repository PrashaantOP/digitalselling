{{-- Ribbon — do kono pe accent colour ke tirchhe ribbon, beech me naam, neeche gol seal. Award jaisa look. --}}
<style>
    .t-ribbon { position: absolute; inset: 0; padding: 4cqw 7cqw 3cqw; display: flex; flex-direction: column; align-items: center; text-align: center; background: #FFFDF8; }
    /* kone: accent ka tikon + uske peeche halka tikon */
    .t-ribbon::before, .t-ribbon::after { content: ''; position: absolute; width: 26cqw; height: 26cqw; background: var(--accent); }
    .t-ribbon::before { top: 0; left: 0; clip-path: polygon(0 0, 62% 0, 0 62%); }
    .t-ribbon::after { bottom: 0; right: 0; clip-path: polygon(100% 100%, 38% 100%, 100% 38%); }
    .t-ribbon .tint { position: absolute; width: 26cqw; height: 26cqw; background: var(--accent); opacity: .18; }
    .t-ribbon .tint.a { top: 0; left: 0; clip-path: polygon(0 0, 100% 0, 0 100%); }
    .t-ribbon .tint.b { bottom: 0; right: 0; clip-path: polygon(100% 100%, 0 100%, 100% 0); }
    .t-ribbon > * { position: relative; z-index: 1; }
    .t-ribbon .logo { height: 8cqw; }
    .t-ribbon .title { font-family: Georgia, 'Times New Roman', serif; font-size: 4.4cqw; font-weight: 700; letter-spacing: .04em; margin: 1.6cqw 0 0; line-height: 1.1; }
    .t-ribbon .eyebrow { margin-top: .6cqw; }
    .t-ribbon .lead { font-size: 1.7cqw; color: var(--muted); margin: 2.2cqw 0 0; }
    .t-ribbon .name { font-family: Georgia, 'Times New Roman', serif; font-size: 5.4cqw; font-style: italic; color: var(--accent); margin: .6cqw 0 0; max-width: 100%; }
    .t-ribbon .course { font-size: 2.7cqw; font-weight: 700; margin: .6cqw 0 0; }
    .t-ribbon .foot { margin-top: auto; width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 3cqw; }
    .t-ribbon .sig { text-align: left; }
    .t-ribbon .meta { text-align: right; padding-right: 9cqw; }
    .t-ribbon .seal { width: 11cqw; height: 11cqw; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: flex; flex-direction: column; align-items: center; justify-content: center;
        box-shadow: 0 0 0 .5cqw #FFFDF8, 0 0 0 .7cqw var(--accent); font-weight: 800; line-height: 1.1; }
    .t-ribbon .seal b { font-size: 2.6cqw; }
    .t-ribbon .seal span { font-size: .95cqw; letter-spacing: .18em; text-transform: uppercase; }
</style>

<div class="t-ribbon">
    <div class="tint a"></div>
    <div class="tint b"></div>

    @if ($design['logo'])
        <img class="logo" src="{{ $design['logo'] }}" alt="">
    @else
        <div class="logo-text">{{ $creatorName }}</div>
    @endif

    <div class="title">Certificate</div>
    <div class="eyebrow">of completion</div>
    <p class="lead">This is proudly presented to</p>
    <div class="name">{{ $studentName }}</div>
    <p class="lead">for successfully completing</p>
    <p class="course">{{ $courseTitle }}</p>

    <div class="foot">
        <div class="sig">
            @if ($design['signature'])<img class="sig-img" src="{{ $design['signature'] }}" alt="">@endif
            <div class="sig-line"></div>
            <div class="sig-name">{{ $design['signatory_name'] }}</div>
            <div class="small">{{ $design['signatory_title'] }}</div>
        </div>
        <div class="seal"><b>&#9733;</b><span>Certified</span></div>
        <div class="meta">
            <div class="sig-name">{{ $issued }}</div>
            <div class="small">Certificate no. <span class="mono">{{ $number }}</span></div>
            <div class="tiny">Verify at {{ preg_replace('#^https?://#', '', $verifyUrl) }}</div>
            <div class="tiny">Issued via {{ config('app.name') }}</div>
        </div>
    </div>
</div>
