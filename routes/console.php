<?php

use App\Support\PlanPricing;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 90-day Pro trial khatam → Free (15%). PlanPricing::effectivePlan() waise bhi expiry dekhta hai; ye DB ko saaf rakhta hai.
Artisan::command('plans:expire', function () {
    $this->info(PlanPricing::expireTrials() . ' trial(s) moved to Free.');
})->purpose('Downgrade creators whose Pro trial has ended');

Schedule::command('plans:expire')->daily();
