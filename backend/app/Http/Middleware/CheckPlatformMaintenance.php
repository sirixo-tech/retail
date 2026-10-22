<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckPlatformMaintenance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Platform Super Admin routes, root ping, and public health endpoints are always exempt
        if (
            $request->is('/') ||
            $request->is('up') ||
            $request->is('api/v1/platform/*') ||
            $request->is('platform/*') ||
            $request->is('api/v1/auth/staff/login') ||
            $request->is('sanctum/csrf-cookie')
        ) {
            return $next($request);
        }

        // Check maintenance status (cached to minimize DB hits)
        $maintenance = Cache::remember('selfx_platform_maintenance_state', 15, function () {
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('platform_settings')) {
                    $setting = DB::table('platform_settings')->first(['maintenance_mode', 'maintenance_message', 'maintenance_until']);
                    if ($setting && ! empty($setting->maintenance_mode)) {
                        return [
                            'active' => true,
                            'message' => $setting->maintenance_message ?: 'The platform is undergoing scheduled maintenance. Please check back shortly.',
                            'until' => $setting->maintenance_until,
                        ];
                    }
                }
            } catch (\Throwable) {
                // Ignore DB error during migrations or tests
            }

            $config = Cache::get('selfx_platform_config_v1', []);
            if (! empty($config['general']['maintenance_mode'])) {
                return [
                    'active' => true,
                    'message' => $config['general']['maintenance_message'] ?? 'The platform is undergoing scheduled maintenance. Please check back shortly.',
                    'until' => $config['general']['maintenance_until'] ?? null,
                ];
            }
            return ['active' => false];
        });

        if (! empty($maintenance['active'])) {
            return response()->json([
                'error' => [
                    'code' => 'platform.maintenance_mode',
                    'message' => $maintenance['message'],
                    'maintenance_until' => $maintenance['until'],
                ],
            ], 503);
        }

        return $next($request);
    }
}
