<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Modules\Plans\Models\Plan;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Plans\Models\PlanPrice;
use App\Modules\Plans\Support\Entitlement;
use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BillingController
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function features(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $keys = [
            'module.customers', 'module.khata', 'module.loyalty', 'module.delivery',
            'module.offline_pos', 'module.ai_reports', 'module.reports_advanced',
        ];
        $flags = [];
        foreach ($keys as $key) {
            $flags[$key] = $this->entitlements->allows($tenantId, $key);
        }

        return ApiResponse::ok($flags);
    }

    public function subscription(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $row = $this->subscriptionRow($tenantId);
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'No subscription.', 404);
        }

        return ApiResponse::ok($this->present($row));
    }

    public function changePlan(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $data = $request->validate([
            'plan_code' => ['required', 'string', 'max:60'],
            'cycle' => ['nullable', 'in:monthly,annual,yearly'],
        ]);

        $plan = Plan::query()->where('code', $data['plan_code'])->where('status', 'active')->first();
        if (! $plan) {
            return ApiResponse::error('resource.not_found', 'Selected plan not found.', 404);
        }

        $wantedCycle = ($data['cycle'] ?? 'monthly') === 'yearly' ? 'annual' : ($data['cycle'] ?? 'monthly');
        $price = PlanPrice::query()->where('plan_id', $plan->id)->where('cycle', $wantedCycle)->first()
            ?? PlanPrice::query()->where('plan_id', $plan->id)->first();

        if (! $price) {
            return ApiResponse::error('resource.not_found', 'Plan pricing not configured.', 422);
        }

        $existing = DB::table('subscriptions')->where('tenant_id', $tenantId)->first();
        $now = now();
        $periodEnd = $wantedCycle === 'annual' ? $now->copy()->addYear() : $now->copy()->addMonth();

        if ($existing) {
            DB::table('subscriptions')->where('id', $existing->id)->update([
                'plan_id' => $plan->id,
                'plan_price_id' => $price->id,
                'status' => 'active',
                'current_period_start' => $now,
                'current_period_end' => $periodEnd,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('subscriptions')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenantId,
                'plan_id' => $plan->id,
                'plan_price_id' => $price->id,
                'status' => 'active',
                'current_period_start' => $now,
                'current_period_end' => $periodEnd,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        AuditLog::write($tenantId, $request->user()?->id, 'billing.plan_changed', $plan->code);

        $updated = $this->subscriptionRow($tenantId);

        return ApiResponse::ok($updated ? $this->present($updated) : ['plan_code' => $plan->code]);
    }

    public function usage(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $planId = DB::table('subscriptions')->where('tenant_id', $tenantId)->value('plan_id');

        return ApiResponse::ok([
            $this->meter($planId, 'limit.products', 'Products', DB::table('store_items')->where('tenant_id', $tenantId)->whereNull('deleted_at')->count()),
            $this->meter($planId, 'limit.staff', 'Staff', DB::table('staff_profiles')->where('tenant_id', $tenantId)->count()),
            $this->meter($planId, 'limit.stores', 'Stores', DB::table('stores')->where('tenant_id', $tenantId)->whereNull('deleted_at')->count()),
            $this->meter($planId, 'limit.orders_per_month', 'Online Orders / Month', DB::table('orders')->where('tenant_id', $tenantId)->where('created_at', '>=', now()->startOfMonth())->count()),
        ]);
    }

    public function invoices(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $rows = DB::table('billing_invoices')->where('tenant_id', $tenantId)->orderByDesc('period_start')->get();

        return ApiResponse::ok($rows);
    }

    public function utr(Request $request): JsonResponse
    {
        $data = $request->validate([
            'utr' => ['required', 'string', 'max:40'],
            'amount_paise' => ['required', 'integer', 'min:1'],
        ]);
        if (DB::table('billing_utrs')->where('utr', $data['utr'])->exists()) {
            return ApiResponse::error('conflict.duplicate', 'That UTR is already recorded.', 422);
        }
        $id = (string) Str::uuid7();
        DB::table('billing_utrs')->insert([
            'id' => $id,
            'tenant_id' => $request->session()->get('tenant_id'),
            'utr' => $data['utr'],
            'amount_paise' => $data['amount_paise'],
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id], 201);
    }

    public function issue(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $row = $this->subscriptionRow($tenantId);
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'No subscription.', 404);
        }
        if ((int) $row->amount_paise === 0) {
            return ApiResponse::error('billing.free', 'The Starter plan has no invoice.', 422);
        }

        $existing = DB::table('billing_invoices')
            ->where('subscription_id', $row->id)
            ->where('period_start', $row->current_period_start)
            ->first();
        if ($existing) {
            return ApiResponse::ok($existing);
        }

        $tax = (int) round(((int) $row->amount_paise) * 1800 / 10000);
        $cgst = intdiv($tax, 2);
        $id = (string) Str::uuid7();
        $count = DB::table('billing_invoices')->count() + 1;
        $gstin = DB::table('platform_settings')->value('gstin');
        DB::table('billing_invoices')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'subscription_id' => $row->id,
            'number' => 'SFX-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT),
            'status' => 'open',
            'subtotal_paise' => (int) $row->amount_paise,
            'cgst_paise' => $cgst,
            'sgst_paise' => $tax - $cgst,
            'total_paise' => (int) $row->amount_paise + $tax,
            'period_start' => $row->current_period_start,
            'period_end' => $row->current_period_end,
            'specimen' => ! is_string($gstin) || $gstin === '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(DB::table('billing_invoices')->where('id', $id)->first(), 201);
    }

    public function platformIndex(): JsonResponse
    {
        $rows = DB::table('subscriptions')
            ->join('tenants', 'tenants.id', '=', 'subscriptions.tenant_id')
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->join('plan_prices', 'plan_prices.id', '=', 'subscriptions.plan_price_id')
            ->orderByDesc('subscriptions.created_at')
            ->get([
                'subscriptions.id',
                'subscriptions.tenant_id',
                'tenants.name as tenant',
                'tenants.slug as tenant_slug',
                'plans.name as plan',
                'plans.code as plan_code',
                'subscriptions.status',
                'plan_prices.amount_paise',
                'plan_prices.cycle',
                'subscriptions.current_period_start',
                'subscriptions.current_period_end',
                'subscriptions.trial_ends_at',
            ]);

        return ApiResponse::ok($rows);
    }

    public function platformOverview(): JsonResponse
    {
        $invoices = DB::table('billing_invoices')
            ->leftJoin('tenants', 'tenants.id', '=', 'billing_invoices.tenant_id')
            ->orderByDesc('billing_invoices.created_at')
            ->get([
                'billing_invoices.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug',
            ]);

        $utrs = DB::table('billing_utrs')
            ->leftJoin('tenants', 'tenants.id', '=', 'billing_utrs.tenant_id')
            ->orderByDesc('billing_utrs.created_at')
            ->get([
                'billing_utrs.*',
                'tenants.name as tenant_name',
                'tenants.slug as tenant_slug',
            ]);

        $subs = DB::table('subscriptions')
            ->join('tenants', 'tenants.id', '=', 'subscriptions.tenant_id')
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->join('plan_prices', 'plan_prices.id', '=', 'subscriptions.plan_price_id')
            ->orderByDesc('subscriptions.created_at')
            ->get([
                'subscriptions.id',
                'tenants.name as tenant',
                'tenants.slug as tenant_slug',
                'plans.name as plan',
                'subscriptions.status',
                'plan_prices.amount_paise',
                'plan_prices.cycle',
                'subscriptions.current_period_end',
            ]);

        $paidInvoices = $invoices->where('status', 'paid');
        $pendingInvoices = $invoices->where('status', '!=', 'paid');
        $utrByInvoice = $utrs->keyBy('invoice_id');
        $enrichedInvoices = $invoices->map(function ($inv) use ($utrByInvoice) {
            $arr = (array) $inv;
            $arr['utr'] = $arr['utr'] ?? ($utrByInvoice[$inv->id]->utr ?? null);

            return $arr;
        })->values();

        $summary = [
            'total_invoiced_paise' => (int) $invoices->sum('total_paise'),
            'total_collected_paise' => (int) $paidInvoices->sum('total_paise'),
            'pending_amount_paise' => (int) $pendingInvoices->sum('total_paise'),
            'total_invoices' => $invoices->count(),
            'paid_invoices' => $paidInvoices->count(),
            'pending_invoices' => $pendingInvoices->count(),
            'open_invoices_count' => $invoices->where('status', 'open')->count(),
            'pending_utrs_count' => $utrs->count(),
            'pending_utrs_paise' => (int) $utrs->sum('amount_paise'),
            'active_subscriptions' => $subs->whereIn('status', ['active', 'trial'])->count(),
            'trial_subscriptions' => $subs->where('status', 'trial')->count(),
            'mrr_paise' => (int) $subs->whereIn('status', ['active', 'trial'])->sum('amount_paise'),
        ];

        return ApiResponse::ok([
            'invoices' => $enrichedInvoices,
            'utrs' => $utrs,
            'subscriptions' => $subs,
            'summary' => $summary,
            'stats' => $summary,
        ]);
    }

    public function platformLogs(Request $request): JsonResponse
    {
        $tenants = DB::table('tenants')->pluck('name', 'id');
        $users = DB::table('users')->pluck('email', 'id');

        $auditRows = DB::table('audit_logs')
            ->orderByDesc('created_at')
            ->limit(150)
            ->get()
            ->map(function ($r) use ($tenants, $users) {
                $sev = str_contains((string) $r->action, 'suspend') || str_contains((string) $r->action, 'void') ? 'warning' : 'info';

                return [
                    'id' => $r->id,
                    'severity' => $sev,
                    'level' => $sev,
                    'type' => 'audit',
                    'source' => 'audit',
                    'action' => (string) $r->action,
                    'tenant_id' => $r->tenant_id,
                    'tenant' => $r->tenant_id ? ($tenants[$r->tenant_id] ?? 'System') : 'Platform',
                    'actor' => $r->actor_id ? ($users[$r->actor_id] ?? 'System') : 'System',
                    'actor_kind' => $r->actor_kind ?? ($r->tenant_id ? 'staff' : 'platform'),
                    'actor_id' => $r->actor_id,
                    'ip' => $r->ip ?? '127.0.0.1',
                    'message' => $r->action.($r->subject_id ? ' ('.$r->subject_id.')' : ''),
                    'status' => 'resolved',
                    'occurred_at' => $r->created_at,
                    'created_at' => $r->created_at,
                ];
            });

        $notifRows = DB::table('notification_logs')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function ($n) use ($tenants) {
                $sev = $n->status === 'failed' ? 'critical' : ($n->status === 'not_configured' ? 'warning' : 'info');

                return [
                    'id' => $n->id,
                    'severity' => $sev,
                    'level' => $sev,
                    'type' => 'notification.'.$n->channel,
                    'source' => 'notification',
                    'action' => 'notification.'.$n->channel,
                    'tenant_id' => $n->tenant_id,
                    'tenant' => $n->tenant_id ? ($tenants[$n->tenant_id] ?? 'Tenant') : 'Platform',
                    'actor' => strtoupper((string) $n->channel),
                    'actor_kind' => 'system',
                    'actor_id' => null,
                    'ip' => '127.0.0.1',
                    'message' => $n->template.' — '.($n->detail ?: $n->status),
                    'status' => $n->status === 'sent' ? 'resolved' : 'unresolved',
                    'occurred_at' => $n->created_at,
                    'created_at' => $n->created_at,
                ];
            });

        $impersonationRows = DB::table('impersonation_tickets')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn ($imp) => [
                'id' => $imp->id,
                'admin_id' => $imp->admin_user_id,
                'admin_email' => $users[$imp->admin_user_id] ?? 'Super Admin',
                'tenant_id' => $imp->tenant_id,
                'tenant_name' => $tenants[$imp->tenant_id] ?? 'Tenant',
                'reason' => $imp->reason,
                'used_at' => $imp->used_at,
                'expires_at' => $imp->expires_at,
                'created_at' => $imp->created_at,
                'status' => $imp->used_at ? 'used' : (now()->greaterThan($imp->expires_at) ? 'expired' : 'active'),
            ]);

        $combined = $auditRows->concat($notifRows)->sortByDesc('occurred_at')->values();
        $last24h = now()->subDay()->toDateTimeString();
        $summary = [
            'total' => $combined->count(),
            'unresolved' => $combined->where('status', 'unresolved')->count(),
            'critical' => $combined->where('severity', 'critical')->count(),
            'last_24h' => $combined->filter(fn ($l) => (string) $l['occurred_at'] >= $last24h)->count(),
            'resolved' => $combined->where('status', 'resolved')->count(),
        ];

        return ApiResponse::ok([
            'logs' => $combined,
            'impersonation_logs' => $impersonationRows,
            'tenants' => DB::table('tenants')->orderBy('name')->get(['id', 'name', 'slug', 'status']),
            'summary' => $summary,
            'stats' => $summary,
        ]);
    }

    public function platformSettings(): JsonResponse
    {
        $legal = DB::table('platform_settings')->first();
        $pages = DB::table('cms_pages')->whereNull('tenant_id')->get(['id', 'slug', 'title', 'body', 'status']);
        $stored = Cache::get('selfx_platform_config_v1', []);
        $defaults = $this->defaultPlatformSettings();
        $merged = array_replace_recursive($defaults, is_array($stored) ? $stored : []);
        if (isset($stored['email_templates']) && is_array($stored['email_templates'])) {
            $merged['email_templates'] = $stored['email_templates'];
        }
        if (isset($stored['sms_templates']) && is_array($stored['sms_templates'])) {
            $merged['sms_templates'] = $stored['sms_templates'];
        }

        return ApiResponse::ok(array_merge($merged, [
            'legal' => $legal,
            'pages' => $pages,
            'config' => $merged,
        ]));
    }

    public function updatePlatformSettings(Request $request): JsonResponse
    {
        $incoming = $request->input('settings') ?? $request->input('config') ?? $request->all();
        if (! is_array($incoming)) {
            $incoming = [];
        }
        $existing = Cache::get('selfx_platform_config_v1', []);
        $defaults = $this->defaultPlatformSettings();
        $merged = array_replace_recursive(
            $defaults,
            is_array($existing) ? $existing : [],
            $incoming,
        );
        if (isset($incoming['email_templates']) && is_array($incoming['email_templates'])) {
            $merged['email_templates'] = $incoming['email_templates'];
        }
        if (isset($incoming['sms_templates']) && is_array($incoming['sms_templates'])) {
            $merged['sms_templates'] = $incoming['sms_templates'];
        }
        Cache::forever('selfx_platform_config_v1', $merged);
        Cache::forget('selfx_platform_maintenance_state');

        try {
            $mMode = ! empty($merged['general']['maintenance_mode']);
            $mMsg = $merged['general']['maintenance_message'] ?? null;
            $mUntil = $merged['general']['maintenance_until'] ?? null;
            $platformRow = DB::table('platform_settings')->first();
            if ($platformRow) {
                DB::table('platform_settings')->where('id', $platformRow->id)->update([
                    'maintenance_mode' => $mMode,
                    'maintenance_message' => $mMsg,
                    'maintenance_until' => $mUntil,
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('platform_settings')->insert([
                    'id' => (string) Str::uuid7(),
                    'maintenance_mode' => $mMode,
                    'maintenance_message' => $mMsg,
                    'maintenance_until' => $mUntil,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable) {
            // Ignore during migrations or unit tests
        }

        return ApiResponse::ok(array_merge($merged, [
            'config' => $merged,
            'saved' => true,
        ]));
    }

    public function uploadBrandingAsset(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:png,jpg,jpeg,svg,webp,ico', 'max:5120'],
            'type' => ['required', 'in:logo,favicon'],
        ]);

        $file = $request->file('file');
        $type = (string) $request->input('type');
        $ext = $file->getClientOriginalExtension() ?: ($type === 'favicon' ? 'ico' : 'png');
        $filename = "{$type}-" . time() . ".{$ext}";

        $brandingDir = public_path('branding');
        if (! file_exists($brandingDir)) {
            mkdir($brandingDir, 0755, true);
        }

        $file->move($brandingDir, $filename);
        $url = "/branding/{$filename}";

        if ($type === 'logo') {
            @copy("{$brandingDir}/{$filename}", public_path('logo.png'));
        } elseif ($type === 'favicon') {
            @copy("{$brandingDir}/{$filename}", public_path('favicon.png'));
            @copy("{$brandingDir}/{$filename}", public_path('favicon.ico'));
        }

        $existing = Cache::get('selfx_platform_config_v1', []);
        $defaults = $this->defaultPlatformSettings();
        $merged = array_replace_recursive($defaults, is_array($existing) ? $existing : []);
        if (! isset($merged['branding'])) {
            $merged['branding'] = [];
        }
        $merged['branding'][$type . '_url'] = $url;
        Cache::forever('selfx_platform_config_v1', $merged);

        return ApiResponse::ok([
            'url' => $url,
            'type' => $type,
            'filename' => $filename,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultPlatformSettings(): array
    {
        return [
            'branding' => [
                'logo_url' => '/logo.png',
                'favicon_url' => '/favicon.png',
            ],
            'general' => [
                'platform_name' => 'SelfX Retail Cloud',
                'logo_url' => '/logo.png',
                'favicon_url' => '/favicon.png',
                'support_email' => 'support@selfx.in',
                'support_phone' => '+91 80 4568 1200',
                'default_currency' => 'INR',
                'default_timezone' => 'Asia/Kolkata',
                'trial_days' => 14,
                'grace_period_days' => 7,
                'maintenance_mode' => false,
                'allow_self_registration' => true,
            ],
            'mail' => [
                'driver' => 'smtp',
                'host' => 'smtp.postmarkapp.com',
                'port' => 587,
                'username' => 'platform-mailer@selfx.in',
                'encryption' => 'tls',
                'from_address' => 'no-reply@selfx.in',
                'from_name' => 'SelfX Retail Cloud',
            ],
            'sms' => [
                'provider' => 'MSG91 Enterprise',
                'sender_id' => 'SELFXR',
                'api_key' => 'msg91_live_98a7bc65d43e21',
                'dlt_entity_id' => '1201159876543210001',
                'enabled' => true,
            ],
            'whatsapp' => [
                'provider' => 'Meta Cloud API',
                'phone_number_id' => '109823471293841',
                'business_account_id' => '998127364518273',
                'access_token' => 'EAAGm0PX4ZCpsBA...',
                'enabled' => true,
            ],
            'gateways' => [
                'stripe' => ['enabled' => true, 'publishable_key' => 'pk_live_51SelfXPlatform', 'secret_key' => 'sk_live_51SelfXPlatformSecret', 'webhook_secret' => 'whsec_stripe_platform', 'mode' => 'live', 'currency' => 'INR'],
                'razorpay' => ['enabled' => true, 'key_id' => 'rzp_live_SelfXPlatform01', 'key_secret' => 'rzp_sec_live_98a7bc65d43e21', 'webhook_secret' => 'whsec_rzp_platform', 'mode' => 'live', 'currency' => 'INR'],
                'phonepe' => ['enabled' => false, 'merchant_id' => 'SELFXONLINE', 'salt_key' => 'salt_key_live_phonepe', 'salt_index' => '1', 'mode' => 'sandbox', 'currency' => 'INR'],
                'paytm' => ['enabled' => false, 'mid' => 'SELFXR98172635', 'merchant_key' => 'paytm_sec_key_platform', 'website' => 'DEFAULT', 'mode' => 'sandbox', 'currency' => 'INR'],
                'cashfree' => ['enabled' => false, 'app_id' => 'CF_APP_SELFX_LIVE', 'secret_key' => 'cf_sec_key_platform', 'mode' => 'sandbox', 'currency' => 'INR'],
                'payu' => ['enabled' => false, 'merchant_key' => 'PAYU_SELFX_KEY', 'merchant_salt' => 'payu_salt_live_98a7bc', 'mode' => 'sandbox', 'currency' => 'INR'],
                'paypal' => ['enabled' => false, 'client_id' => 'AY_SELFX_PAYPAL_CLIENT', 'client_secret' => 'paypal_sec_platform', 'mode' => 'sandbox', 'currency' => 'USD'],
                'paystack' => ['enabled' => false, 'public_key' => 'pk_live_paystack_selfx', 'secret_key' => 'sk_live_paystack_selfx', 'mode' => 'sandbox', 'currency' => 'NGN'],
                'flutterwave' => ['enabled' => false, 'public_key' => 'FLWPUBK-selfx-live', 'secret_key' => 'FLWSECK-selfx-live', 'encryption_key' => 'flw_enc_key_98a', 'mode' => 'sandbox', 'currency' => 'USD'],
                'mollie' => ['enabled' => false, 'api_key' => 'live_mollie_selfx_platform', 'mode' => 'sandbox', 'currency' => 'EUR'],
                'dodopayments' => ['enabled' => false, 'api_key' => 'dodo_live_selfx_key', 'webhook_secret' => 'whsec_dodo_platform', 'mode' => 'sandbox', 'currency' => 'USD'],
                'bank_transfer' => ['enabled' => true, 'bank_name' => 'HDFC Bank Ltd', 'account_name' => 'SelfX Retail Technologies Pvt Ltd', 'account_number' => '50200087654321', 'ifsc' => 'HDFC0000240', 'mode' => 'live', 'currency' => 'INR', 'instructions' => 'Include your Tenant Subdomain and Invoice Number in NEFT/RTGS transaction remarks.'],
            ],
            'email_templates' => [
                [
                    'key' => 'tenant_welcome',
                    'name' => 'Tenant Onboarding & Provisioned Credentials',
                    'trigger' => 'Event: tenant.created',
                    'subject' => 'Welcome to {{platform_name}} — Your store {{tenant_name}} is live',
                    'body' => "Hello {{owner_name}},\n\nYour retail workspace ({{tenant_name}}) has been provisioned.\nLogin URL: {{console_url}}\nUsername: {{owner_email}}\n\nThank you,\n{{platform_name}} Team",
                    'active' => true,
                ],
                [
                    'key' => 'subscription_invoice',
                    'name' => 'GST Subscription Tax Invoice Issued',
                    'trigger' => 'Event: invoice.generated',
                    'subject' => 'Tax Invoice {{invoice_number}} for {{tenant_name}}',
                    'body' => "Hello {{owner_name}},\n\nYour GST subscription invoice {{invoice_number}} for {{amount}} has been generated.\nDue Date: {{due_date}}\n\nThank you,\n{{platform_name}} Billing",
                    'active' => true,
                ],
                [
                    'key' => 'subscription_renewal_reminder',
                    'name' => 'Subscription Renewal Reminder (T-7 Days)',
                    'trigger' => 'Event: subscription.renewing',
                    'subject' => 'Action Required: {{tenant_name}} subscription renews on {{renewal_date}}',
                    'body' => "Hello {{owner_name}},\n\nYour {{plan_name}} plan for {{tenant_name}} is scheduled for renewal on {{renewal_date}}.\n\nThank you,\n{{platform_name}} Billing",
                    'active' => true,
                ],
                [
                    'key' => 'payment_success',
                    'name' => 'Subscription Payment Confirmation',
                    'trigger' => 'Event: payment.received',
                    'subject' => 'Payment Confirmation for Invoice {{invoice_number}}',
                    'body' => "Hello {{owner_name}},\n\nWe have successfully received payment of {{amount}} for invoice {{invoice_number}}.\n\nYour subscription is now active through {{renewal_date}}.\n\nThank you,\n{{platform_name}} Billing",
                    'active' => true,
                ],
                [
                    'key' => 'trial_expiring',
                    'name' => 'Trial Period Expiration Alert (T-3 Days)',
                    'trigger' => 'Event: trial.expiring',
                    'subject' => 'Your {{platform_name}} free trial ends soon for {{tenant_name}}',
                    'body' => "Hello {{owner_name}},\n\nYour 14-day free trial for {{tenant_name}} will conclude on {{due_date}}.\n\nUpgrade to Pro or Enterprise at {{console_url}}/billing to ensure uninterrupted POS billing and cloud syncing.\n\nThank you,\n{{platform_name}} Team",
                    'active' => true,
                ],
                [
                    'key' => 'impersonation_notice',
                    'name' => 'Security Alert: Support Session Initiated',
                    'trigger' => 'Event: impersonation.started',
                    'subject' => 'Security Notice: Support session initiated on {{tenant_name}}',
                    'body' => "Hello {{owner_name}},\n\nA platform support administrator ({{admin_email}}) started a time-boxed support session on {{tenant_name}} for reason: {{reason}}.\n\nThank you,\n{{platform_name}} Security Operations",
                    'active' => true,
                ],
            ],
            'sms_templates' => [
                [
                    'key' => 'otp_delivery',
                    'name' => 'Order Delivery Verification OTP',
                    'dlt_template_id' => '1207168900011223344',
                    'content' => 'Your delivery verification code for order {{#var#}} at {{#var#}} is {{#var#}}. Do not share this code. - SELFXR',
                    'active' => true,
                ],
                [
                    'key' => 'pos_ebill',
                    'name' => 'POS Digital Receipt Link',
                    'dlt_template_id' => '1207168900055667788',
                    'content' => 'Thank you for shopping at {{#var#}}! Your bill {{#var#}} for Rs. {{#var#}} is ready: {{#var#}} - SELFXR',
                    'active' => true,
                ],
                [
                    'key' => 'khata_reminder',
                    'name' => 'Customer Khata Due Reminder',
                    'dlt_template_id' => '1207168900099001122',
                    'content' => 'Dear {{#var#}}, your credit balance of Rs. {{#var#}} at {{#var#}} is due. Kindly settle at the store or via UPI. - SELFXR',
                    'active' => true,
                ],
            ],
        ];
    }

    private function subscriptionRow(string $tenantId): ?object
    {
        return DB::table('subscriptions')
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->join('plan_prices', 'plan_prices.id', '=', 'subscriptions.plan_price_id')
            ->where('subscriptions.tenant_id', $tenantId)
            ->first([
                'subscriptions.*',
                'plans.name as plan_name',
                'plans.code as plan_code',
                'plan_prices.amount_paise',
                'plan_prices.cycle',
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(object $row): array
    {
        return [
            'id' => $row->id,
            'plan' => $row->plan_name,
            'plan_code' => $row->plan_code,
            'status' => $row->status,
            'cycle' => $row->cycle,
            'amount_paise' => (int) $row->amount_paise,
            'current_period_end' => $row->current_period_end,
            'trial_ends_at' => $row->trial_ends_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function meter(?string $planId, string $key, string $label, int $used): array
    {
        $limit = 0;
        if ($planId) {
            $value = PlanFeature::query()
                ->where('plan_id', $planId)
                ->whereHas('feature', fn ($query) => $query->where('key', $key))
                ->value('value');
            $limit = $value === null ? 0 : (int) $value;
        }

        return ['key' => $key, 'label' => $label, 'used' => $used, 'limit' => $limit];
    }
}
