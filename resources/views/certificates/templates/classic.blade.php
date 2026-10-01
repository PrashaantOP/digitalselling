{{-- Classic — serif, beech me, double border. Formal look. --}}
<style>
    .t-classic { position: absolute; inset: 0; padding: 2.4cqw; font-family: Georgia, 'Times New Roman', serif; }
    .t-classic .frame { height: 100%; border: .28cqw solid var(--ink); padding: .9cqw; }
    .t-classic .inner { height: 100%; border: .12cqw solid var(--accent); padding: 3cqw 6cqw 2.4cqw; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .t-classic .logo, .t-classic .logo-text { margin-bottom: 1.8cqw; }
    /* logo upar, footer neeche, beech ka hissa dono ke beech me centre */
    .t-classic .eyebrow { margin-top: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .t-classic .lead { font-size: 1.9cqw; color: var(--muted); margin: 1.6cqw 0 0; font-style: italic; }
    .t-classic .name { font-size: 5.6cqw; font-style: italic; margin: 1.2cqw 0 0; padding: 0 3cqw 1cqw; border-bottom: .14cqw solid var(--accent); max-width: 100%; }
    .t-classic .course { font-size: 3cqw; font-weight: 700; margin: .9cqw 0 0; }
    .t-classic .foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; gap: 4cqw; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .t-classic .sig { text-align: left; }
    .t-classic .meta { text-align: right; }
</style>

<div class="t-classic">
    <div class="frame">
        <div class="inner">
            @if ($design['logo'])
                <img class="logo" src="{{ $design['logo'] }}" alt="">
            @else
                <div class="logo-text">{{ $creatorName }}</div>
            @endif

            <div class="eyebrow">Certificate of completion</div>
            <p class="lead">This certifies that</p>
            <div class="name">{{ $studentName }}</div>
            <p class="lead">has successfully completed</p>
            <p class="course">{{ $courseTitle }}</p>

            <div class="foot">
                <div class="sig">
                    @if ($design['signature'])<img class="sig-img" src="{{ $design['signature'] }}" alt="">@endif
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $design['signatory_name'] }}</div>
                    <div class="small">{{ $design['signatory_title'] }}</div>
                </div>
                <div class="meta">
                    <div class="sig-name">{{ $issued }}</div>
                    <div class="small">Certificate no. <span class="mono">{{ $number }}</span></div>
                    <div class="tiny">Verify at {{ preg_replace('#^https?://#', '', $verifyUrl) }}</div>
                    <div class="tiny">Issued via {{ config('app.name') }}</div>
                </div>
            </div>
        </div>
    </div>
</div>
