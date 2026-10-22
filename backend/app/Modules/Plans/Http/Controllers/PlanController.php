<?php

namespace App\Modules\Plans\Http\Controllers;

use App\Modules\Plans\Models\Plan;
use App\Modules\Plans\Models\PlanFeature;
use App\Modules\Plans\Models\PlanPrice;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlanController
{
    public function index(): JsonResponse
    {
        $subCounts = DB::table('subscriptions')
            ->selectRaw('plan_id, count(*) as total')
            ->groupBy('plan_id')
            ->pluck('total', 'plan_id');

        $allFeatures = DB::table('features')->orderBy('key')->get(['id', 'key', 'name', 'kind']);

        $plans = Plan::query()
            ->where('status', 'active')
            ->with(['prices', 'features.feature'])
            ->orderBy('sort')
            ->get()
            ->map(function (Plan $plan) use ($subCounts, $allFeatures) {
                $featureMap = $plan->features->keyBy(fn ($row) => $row->feature?->key ?? '');

                $limits = $allFeatures
                    ->filter(fn ($f) => str_starts_with($f->key, 'limit.'))
                    ->map(function ($f) use ($featureMap) {
                        $row = $featureMap->get($f->key);

                        return [
                            'key' => $f->key,
                            'name' => $f->name,
                            'value' => $row ? (int) $row->value : 0,
                        ];
                    })->values();

                $features = $allFeatures
                    ->filter(fn ($f) => ! str_starts_with($f->key, 'limit.'))
                    ->map(function ($f) use ($featureMap) {
                        $row = $featureMap->get($f->key);
                        $val = $row ? (int) $row->value : 0;

                        return [
                            'key' => $f->key,
                            'name' => $f->name,
                            'value' => $val,
                            'enabled' => $val > 0,
                        ];
                    })->values();

                return [
                    'id' => $plan->id,
                    'code' => $plan->code,
                    'name' => $plan->name,
                    'status' => $plan->status,
                    'subscribers_count' => (int) ($subCounts[$plan->id] ?? 0),
                    'prices' => $plan->prices->map(fn ($price) => [
                        'cycle' => $price->cycle,
                        'amount_paise' => (int) $price->amount_paise,
                        'compare_at_paise' => $price->compare_at_paise ? (int) $price->compare_at_paise : null,
                        'trial_days' => (int) $price->trial_days,
                    ]),
                    'limits' => $limits,
                    'features' => $features,
                ];
            });

        return ApiResponse::ok($plans);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'code' => ['required', 'string', 'max:40'],
            'monthly_paise' => ['required', 'integer', 'min:0'],
            'annual_paise' => ['nullable', 'integer', 'min:0'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'limits' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
        ]);

        $code = Str::slug($data['code']);
        if (Plan::query()->where('code', $code)->exists()) {
            return ApiResponse::error('conflict.duplicate', 'A plan with that code already exists.', 422);
        }

        $maxSort = (int) Plan::query()->max('sort');
        $plan = Plan::query()->create([
            'code' => $code,
            'name' => $data['name'],
            'status' => 'active',
            'sort' => $maxSort + 1,
            'is_public' => true,
        ]);

        $trial = (int) ($data['trial_days'] ?? 14);
        PlanPrice::query()->create([
            'plan_id' => $plan->id,
            'cycle' => 'monthly',
            'amount_paise' => (int) $data['monthly_paise'],
            'compare_at_paise' => null,
            'trial_days' => $trial,
        ]);

        $annualPaise = isset($data['annual_paise']) ? (int) $data['annual_paise'] : (int) round($data['monthly_paise'] * 10);
        PlanPrice::query()->create([
            'plan_id' => $plan->id,
            'cycle' => 'annual',
            'amount_paise' => $annualPaise,
            'compare_at_paise' => (int) $data['monthly_paise'] * 12,
            'trial_days' => $trial,
        ]);

        $this->syncPlanFeatures($plan->id, $data['limits'] ?? [], $data['features'] ?? []);

        return ApiResponse::ok(['id' => $plan->id, 'code' => $plan->code], 201);
    }

    public function update(Request $request, string $code): JsonResponse
    {
        $plan = Plan::query()->where('code', $code)->first();
        if (! $plan) {
            return ApiResponse::error('resource.not_found', 'Plan not found.', 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'monthly_paise' => ['nullable', 'integer', 'min:0'],
            'annual_paise' => ['nullable', 'integer', 'min:0'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'limits' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
            'new_features' => ['nullable', 'array'],
            'removed_features' => ['nullable', 'array'],
        ]);

        if (isset($data['name'])) {
            $plan->name = $data['name'];
            $plan->save();
        }

        if (isset($data['monthly_paise'])) {
            $monthly = PlanPrice::query()->where('plan_id', $plan->id)->where('cycle', 'monthly')->first();
            if ($monthly) {
                $monthly->amount_paise = (int) $data['monthly_paise'];
                if (isset($data['trial_days'])) {
                    $monthly->trial_days = (int) $data['trial_days'];
                }
                $monthly->save();
            } else {
                PlanPrice::query()->create([
                    'plan_id' => $plan->id,
                    'cycle' => 'monthly',
                    'amount_paise' => (int) $data['monthly_paise'],
                    'trial_days' => (int) ($data['trial_days'] ?? 14),
                ]);
            }
        }

        if (isset($data['annual_paise'])) {
            $annual = PlanPrice::query()->where('plan_id', $plan->id)->whereIn('cycle', ['annual', 'yearly'])->first();
            if ($annual) {
                $annual->amount_paise = (int) $data['annual_paise'];
                $annual->save();
            } else {
                PlanPrice::query()->create([
                    'plan_id' => $plan->id,
                    'cycle' => 'annual',
                    'amount_paise' => (int) $data['annual_paise'],
                    'trial_days' => (int) ($data['trial_days'] ?? 14),
                ]);
            }
        }

        if (! empty($data['new_features']) && is_array($data['new_features'])) {
            foreach ($data['new_features'] as $nf) {
                $label = trim((string) ($nf['name'] ?? ''));
                if ($label === '') {
                    continue;
                }
                $key = trim((string) ($nf['key'] ?? '')) ?: 'module.'.Str::snake(preg_replace('/[^A-Za-z0-9 ]/', '', $label));
                $exists = DB::table('features')->where('key', $key)->first();
                if (! $exists) {
                    DB::table('features')->insert([
                        'id' => (string) Str::uuid7(),
                        'key' => $key,
                        'name' => $label,
                        'kind' => str_starts_with($key, 'limit.') ? 'limit' : 'flag',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                $data['features'][$key] = 1;
            }
        }

        if (! empty($data['removed_features']) && is_array($data['removed_features'])) {
            foreach ($data['removed_features'] as $remKey) {
                $fId = DB::table('features')->where('key', (string) $remKey)->value('id');
                if ($fId) {
                    PlanFeature::query()->where('plan_id', $plan->id)->where('feature_id', $fId)->update([
                        'value' => 0,
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        $this->syncPlanFeatures($plan->id, $data['limits'] ?? [], $data['features'] ?? []);

        return ApiResponse::ok(['code' => $plan->code, 'updated' => true]);
    }

    public function updateFeature(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:80'],
            'value' => ['required', 'integer'],
        ]);
        $plan = Plan::query()->where('code', $code)->first();
        $featureId = DB::table('features')->where('key', $data['key'])->value('id');
        if (! $plan || ! $featureId) {
            return ApiResponse::error('resource.not_found', 'Plan feature not found.', 404);
        }
        $updated = PlanFeature::query()->where('plan_id', $plan->id)->where('feature_id', $featureId)->update([
            'value' => $data['value'],
            'updated_at' => now(),
        ]);
        if ($updated === 0) {
            return ApiResponse::error('resource.not_found', 'Plan feature not found.', 404);
        }

        return ApiResponse::ok(['code' => $plan->code, 'key' => $data['key'], 'value' => $data['value']]);
    }

    /**
     * @param  array<string, int|numeric-string>  $limits
     * @param  array<string, int|bool|numeric-string>  $features
     */
    private function syncPlanFeatures(string $planId, array $limits, array $features): void
    {
        $all = array_merge($limits, $features);
        foreach ($all as $key => $val) {
            $featureId = DB::table('features')->where('key', (string) $key)->value('id');
            if (! $featureId) {
                continue;
            }
            $intVal = is_bool($val) ? ($val ? 1 : 0) : (int) $val;
            $existing = PlanFeature::query()->where('plan_id', $planId)->where('feature_id', $featureId)->first();
            if ($existing) {
                $existing->value = $intVal;
                $existing->save();
            } else {
                PlanFeature::query()->create([
                    'plan_id' => $planId,
                    'feature_id' => $featureId,
                    'value' => $intVal,
                ]);
            }
        }
    }
}
