<?php

namespace App\Services;

use App\Mail\WeeklyDigestMail;
use App\Models\Enrollment;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * "Weekly digest" — har somvaar subah pichhle 7 din (somvaar–ravivaar) ka hisaab, sirf un creators ko jinhone
 * ye switch on kiya hai. Jis hafte kuch hua hi nahi (na sale, na naya student, na completion) us hafte mail nahi.
 */
class WeeklyDigest
{
    /** @return array{from: string, to: string, sales: int, revenue: float, earned: float, enrollments: int, completions: int, top: ?string} */
    public function stats(User $creator, Carbon $from, Carbon $to): array
    {
        $orders = Order::where('creator_id', $creator->id)->where('status', 'success')->whereBetween('paid_at', [$from, $to]);
        $courseEnrollments = fn () => Enrollment::whereHas('course.product', fn ($q) => $q->where('creator_id', $creator->id));

        $top = (clone $orders)->selectRaw('product_id, COUNT(*) as sold')->groupBy('product_id')->orderByDesc('sold')->with('product:id,title')->first();

        return [
            'from' => $from->format('j M'),
            'to' => $to->format('j M Y'),
            'sales' => (clone $orders)->count(),
            'revenue' => round((float) (clone $orders)->sum('total_amount'), 2),
            'earned' => round((float) (clone $orders)->sum('net_payout_amount'), 2),
            'enrollments' => $courseEnrollments()->whereBetween('created_at', [$from, $to])->count(),
            'completions' => $courseEnrollments()->whereBetween('completed_at', [$from, $to])->count(),
            'top' => $top?->product?->title,
        ];
    }

    /** Pichhla poora hafta (IST): last Monday 00:00 → Sunday 23:59. Kitne mail gaye, wo lautata hai. */
    public function sendAll(?Carbon $now = null): int
    {
        $now = ($now ?? now())->copy()->setTimezone('Asia/Kolkata');
        $from = $now->copy()->startOfWeek()->subWeek();
        $to = $from->copy()->endOfWeek();
        $sent = 0;

        $creators = User::where('role', 'creator')->where('status', 'active')
            ->whereHas('notificationPreference', fn ($q) => $q->where('weekly_digest', true))
            ->with('notificationPreference')->cursor();

        foreach ($creators as $creator) {
            if (! NotificationPreference::wants($creator, 'weekly_digest')) {
                continue;
            }

            $stats = $this->stats($creator, $from->copy()->utc(), $to->copy()->utc());

            if ($stats['sales'] === 0 && $stats['enrollments'] === 0 && $stats['completions'] === 0) {
                continue;
            }

            try {
                Mail::to($creator->email)->send(new WeeklyDigestMail($creator, $stats));
                $sent++;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $sent;
    }
}
