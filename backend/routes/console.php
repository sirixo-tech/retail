<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('stock:release-reservations')->hourly();
Schedule::command('reports:aggregate-daily')->dailyAt('00:20');
Schedule::command('reports:send-schedules')->dailyAt('07:00');
