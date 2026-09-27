<?php

namespace App\Services;

use App\Models\AvailabilityException;
use App\Models\Booking;
use App\Models\BookingServiceDetail;
use App\Models\CreatorAvailability;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Booking slots ka logic. Creator ke weekly hours (creator_availability) me se blocked dates,
 * pehle se bani bookings aur bahut paas ke slots hata ke khaali slots nikalta hai.
 *
 * Saare hisaab creator ke timezone me hote hain ("Monday 10 baje" creator ka Monday), DB me UTC.
 */
class SlotService
{
    /** Itne minute se kam baad shuru hone wala slot book nahi hota — creator ko taiyaari ka time. */
    public const MIN_NOTICE_MINUTES = 60;

    /** Payment pending booking itni der slot rok ke rakhti hai (paid flow ke liye). */
    public const HOLD_MINUTES = 15;

    /** Sabse lambi session (BookingServiceController max:480) — overlap dhoondhne ki window. */
    private const MAX_DURATION_MINUTES = 480;

    /**
     * Sirf pakki bookings: bina order wali (free / manual) ya jinka payment success ho gaya.
     * Payment pending/failed wale slot-holds creator ki list me nahi dikhne chahiye.
     */
    public static function confirmed(Builder $query): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->whereNull('order_id')
            ->orWhereHas('order', fn (Builder $o) => $o->where('status', 'success')));
    }

    public static function timezoneFor(int $creatorId): string
    {
        return CreatorAvailability::where('user_id', $creatorId)->value('timezone') ?? 'Asia/Kolkata';
    }

    /**
     * Ek din (creator ke timezone ki date, Y-m-d) ke khaali slots.
     *
     * @return list<array{start: string, label: string}>  start = ISO-8601 UTC
     */
    public function slots(int $creatorId, BookingServiceDetail $service, string $date): array
    {
        $tz = self::timezoneFor($creatorId);
        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, $tz);

        $hours = CreatorAvailability::where('user_id', $creatorId)->where('weekday', $day->dayOfWeek)->first();
        if (! $hours?->is_enabled || ! $hours->start_time || ! $hours->end_time) {
            return [];
        }

        $blocked = AvailabilityException::where('user_id', $creatorId)->where('is_blocked', true)->whereDate('date', $date)->exists();
        if ($blocked) {
            return [];
        }

        $open = $day->setTimeFromTimeString((string) $hours->start_time);
        $close = $day->setTimeFromTimeString((string) $hours->end_time);
        $length = max(5, (int) $service->duration_minutes);
        $earliest = CarbonImmutable::now()->addMinutes(self::MIN_NOTICE_MINUTES);
        $busy = $this->busyIntervals($creatorId, $open, $close);

        $slots = [];
        // aakhri slot tabhi jab poori session closing time se pehle khatam ho
        for ($start = $open; $start->addMinutes($length)->lte($close); $start = $start->addMinutes($length)) {
            $end = $start->addMinutes($length);

            if ($start->lt($earliest)) {
                continue;
            }

            foreach ($busy as [$busyStart, $busyEnd]) {
                if ($start->lt($busyEnd) && $end->gt($busyStart)) {
                    continue 2;
                }
            }

            $slots[] = ['start' => $start->utc()->toIso8601String(), 'label' => $start->format('g:i a')];
        }

        return $slots;
    }

    /** Ye exact slot abhi bhi khaali hai? (booking save karne se theek pehle, lock ke andar) */
    public function isAvailable(int $creatorId, BookingServiceDetail $service, string $slot): bool
    {
        $start = CarbonImmutable::parse($slot)->utc();
        $date = $start->setTimezone(self::timezoneFor($creatorId))->toDateString();

        return collect($this->slots($creatorId, $service, $date))
            ->contains(fn (array $s) => CarbonImmutable::parse($s['start'])->equalTo($start));
    }

    /**
     * Creator ki kisi bhi session ki bookings jo is window me time gherti hain.
     * Pending-payment booking bhi thodi der (HOLD_MINUTES) slot rokti hai, warna do log ek saath pay kar denge.
     *
     * @return list<array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function busyIntervals(int $creatorId, CarbonImmutable $from, CarbonImmutable $to): array
    {
        // query UTC me — Carbon ko doosre timezone me bhejne se local time format ho jaata
        return Booking::query()
            ->where('creator_id', $creatorId)
            ->whereIn('status', ['upcoming', 'completed'])
            ->where('scheduled_at', '<', $to->utc())
            ->where('scheduled_at', '>', $from->utc()->subMinutes(self::MAX_DURATION_MINUTES))
            ->where(fn (Builder $q) => $q
                ->whereNull('order_id')
                ->orWhereHas('order', fn (Builder $o) => $o
                    ->where('status', 'success')
                    ->orWhere(fn (Builder $p) => $p->where('status', 'pending')->where('created_at', '>=', now()->subMinutes(self::HOLD_MINUTES)))))
            ->get(['scheduled_at', 'duration_minutes'])
            ->map(function (Booking $b) {
                $start = CarbonImmutable::parse($b->scheduled_at);

                return [$start, $start->addMinutes($b->duration_minutes)];
            })
            ->all();
    }
}
