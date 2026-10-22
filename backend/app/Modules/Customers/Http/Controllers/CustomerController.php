<?php

namespace App\Modules\Customers\Http\Controllers;

use App\Modules\Customers\Actions\PostLoyalty;
use App\Modules\Plans\Support\Entitlement;
use App\Support\ApiResponse;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerController
{
    public function __construct(private Entitlement $entitlements)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $term = trim((string) $request->query('q', ''));
        $rows = DB::table('customers')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->when($term !== '', function ($query) use ($term) {
                $query->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', '%'.$term.'%')->orWhere('phone_e164', 'like', '%'.$term.'%');
                });
            })
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'name', 'phone_e164', 'khata_balance_paise']);

        return ApiResponse::ok($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
        ]);
        $tenantId = (string) $request->session()->get('tenant_id');
        $phone = preg_replace('/\D+/', '', $data['phone']) ?? '';
        $existing = DB::table('customers')->where('tenant_id', $tenantId)->where('phone_e164', $phone)->whereNull('deleted_at')->first();
        if ($existing) {
            return ApiResponse::ok(['id' => $existing->id, 'name' => $existing->name, 'phone_e164' => $existing->phone_e164]);
        }

        $id = (string) Str::uuid7();
        DB::table('customers')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'phone_e164' => $phone,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'name' => $data['name'], 'phone_e164' => $phone], 201);
    }

    public function export(Request $request): \Illuminate\Http\Response
    {
        $rows = DB::table('customers')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['name', 'phone_e164', 'khata_balance_paise', 'loyalty_points']);
        $csv = "name,phone,khata_balance_paise,loyalty_points\n";
        foreach ($rows as $row) {
            $csv .= '"'.str_replace('"', '""', $row->name).'",'.$row->phone_e164.','.(int) $row->khata_balance_paise.','.(int) $row->loyalty_points."\n";
        }

        return response($csv, 200, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request): JsonResponse
    {
        $data = $request->validate([
            'csv' => ['required', 'string', 'max:20000'],
        ]);
        $lines = preg_split('/\r\n|\n|\r/', trim($data['csv'])) ?: [];
        $lines = array_values(array_filter($lines, fn ($line) => trim($line) !== ''));
        if ($lines === []) {
            return ApiResponse::error('validation.failed', 'The list is empty.', 422);
        }
        if (count($lines) > 201) {
            return ApiResponse::error('validation.failed', 'Import at most 200 customers at a time.', 422);
        }
        $start = 0;
        $header = strtolower(str_replace(' ', '', $lines[0]));
        if (str_contains($header, 'name') && str_contains($header, 'phone')) {
            $start = 1;
        }
        $tenantId = (string) $request->session()->get('tenant_id');
        $created = 0;
        $skipped = 0;
        $invalid = 0;
        $report = [];
        $seen = [];
        for ($index = $start; $index < count($lines); $index++) {
            $parts = str_getcsv($lines[$index]);
            $name = trim((string) ($parts[0] ?? ''));
            $phone = preg_replace('/\D+/', '', (string) ($parts[1] ?? '')) ?? '';
            $lineNo = $index + 1;
            if ($name === '' || strlen($phone) < 10 || strlen($phone) > 15) {
                $invalid++;
                $report[] = ['line' => $lineNo, 'status' => 'invalid', 'phone' => $phone, 'message' => 'Name and a 10-digit mobile are required.'];
                continue;
            }
            if (isset($seen[$phone]) || DB::table('customers')->where('tenant_id', $tenantId)->where('phone_e164', $phone)->whereNull('deleted_at')->exists()) {
                $skipped++;
                $seen[$phone] = true;
                $report[] = ['line' => $lineNo, 'status' => 'skipped', 'phone' => $phone, 'message' => 'That mobile is already a customer.'];
                continue;
            }
            $seen[$phone] = true;
            DB::table('customers')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenantId,
                'name' => $name,
                'phone_e164' => $phone,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $created++;
            $report[] = ['line' => $lineNo, 'status' => 'created', 'phone' => $phone, 'message' => null];
        }

        return ApiResponse::ok([
            'created' => $created,
            'skipped' => $skipped,
            'invalid' => $invalid,
            'rows' => $report,
        ]);
    }

    public function sales(Request $request, string $customer): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        $owns = DB::table('customers')->where('id', $customer)->where('tenant_id', $tenantId)->exists();
        if (! $owns) {
            return ApiResponse::error('resource.not_found', 'Customer not found.', 404);
        }
        $sales = DB::table('sales')->where('tenant_id', $tenantId)->where('customer_id', $customer)->orderByDesc('created_at')->get(['id', 'number', 'total_paise', 'status', 'created_at']);

        return ApiResponse::ok($sales);
    }

    public function show(Request $request, string $customer): JsonResponse
    {
        $row = $this->customer($request, $customer);
        if ($row instanceof JsonResponse) {
            return $row;
        }
        $addresses = DB::table('customer_addresses')->where('customer_id', $row->id)->orderBy('created_at')->get(['id', 'line1', 'city', 'pincode']);
        $entries = DB::table('khata_entries')->where('customer_id', $row->id)->orderByDesc('created_at')->limit(20)->get(['id', 'direction', 'amount_paise', 'note', 'created_at']);

        $earned = (int) DB::table('loyalty_entries')
            ->leftJoin('sales', 'sales.id', '=', 'loyalty_entries.sale_id')
            ->where('loyalty_entries.customer_id', $row->id)
            ->where('loyalty_entries.direction', 'earn')
            ->where(function ($query) {
                $query->whereNull('sales.id')->orWhere('sales.status', '!=', 'voided');
            })
            ->sum('loyalty_entries.points');
        $loyalty = DB::table('loyalty_entries')->where('customer_id', $row->id)->orderByDesc('created_at')->limit(20)->get(['id', 'direction', 'points', 'created_at']);

        return ApiResponse::ok([
            'id' => $row->id,
            'name' => $row->name,
            'phone_e164' => $row->phone_e164,
            'khata_balance_paise' => (int) $row->khata_balance_paise,
            'loyalty_points' => (int) $row->loyalty_points,
            'loyalty_tier' => PostLoyalty::tier($earned),
            'addresses' => $addresses,
            'khata' => $entries,
            'loyalty' => $loyalty,
            'feedback' => DB::table('customer_feedback')->where('customer_id', $row->id)->orderByDesc('created_at')->limit(10)->get(['id', 'rating', 'comment', 'created_at']),
        ]);
    }

    public function address(Request $request, string $customer): JsonResponse
    {
        $row = $this->customer($request, $customer);
        if ($row instanceof JsonResponse) {
            return $row;
        }
        $data = $request->validate([
            'line1' => ['required', 'string', 'max:180'],
            'city' => ['nullable', 'string', 'max:80'],
            'pincode' => ['nullable', 'string', 'max:12'],
        ]);
        $id = (string) Str::uuid7();
        DB::table('customer_addresses')->insert([
            'id' => $id,
            'tenant_id' => $row->tenant_id,
            'customer_id' => $row->id,
            'line1' => $data['line1'],
            'city' => $data['city'] ?? null,
            'pincode' => $data['pincode'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id], 201);
    }

    public function khata(Request $request, string $customer): JsonResponse
    {
        $row = $this->customer($request, $customer);
        if ($row instanceof JsonResponse) {
            return $row;
        }
        if (! $this->entitlements->allows((string) $row->tenant_id, 'module.khata')) {
            return ApiResponse::error('entitlement.module_disabled', 'Khata is not on this plan.', 403);
        }
        $data = $request->validate([
            'direction' => ['required', 'in:charge,collect'],
            'amount_paise' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:160'],
        ]);
        $balance = (int) $row->khata_balance_paise;
        $next = $data['direction'] === 'charge' ? $balance + $data['amount_paise'] : $balance - $data['amount_paise'];
        if ($next < 0) {
            return ApiResponse::error('validation.failed', 'A collection cannot be more than the amount due.', 422);
        }
        DB::transaction(function () use ($row, $data, $next, $request) {
            DB::table('customers')->where('id', $row->id)->update([
                'khata_balance_paise' => $next,
                'updated_at' => now(),
            ]);
            $entryId = (string) Str::uuid7();
            DB::table('khata_entries')->insert([
                'id' => $entryId,
                'tenant_id' => $row->tenant_id,
                'customer_id' => $row->id,
                'direction' => $data['direction'],
                'amount_paise' => $data['amount_paise'],
                'note' => $data['note'] ?? null,
                'sale_id' => null,
                'created_at' => now(),
            ]);
            AuditLog::write((string) $row->tenant_id, $request->user()->id, 'khata.'.$data['direction'], $entryId);
        });

        return ApiResponse::ok(['khata_balance_paise' => $next]);
    }

    public function feedback(Request $request, string $customer): JsonResponse
    {
        $row = $this->customer($request, $customer);
        if ($row instanceof JsonResponse) {
            return $row;
        }
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:240'],
        ]);
        $id = (string) Str::uuid7();
        DB::table('customer_feedback')->insert([
            'id' => $id,
            'tenant_id' => $row->tenant_id,
            'customer_id' => $row->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'created_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id], 201);
    }

    public function segments(Request $request): JsonResponse
    {
        $rows = DB::table('customer_segments')
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return ApiResponse::ok($rows);
    }

    public function storeSegment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);
        $tenantId = (string) $request->session()->get('tenant_id');
        if (DB::table('customer_segments')->where('tenant_id', $tenantId)->where('name', $data['name'])->exists()) {
            return ApiResponse::error('validation.failed', 'That segment already exists.', 422);
        }
        $id = (string) Str::uuid7();
        DB::table('customer_segments')->insert([
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::ok(['id' => $id, 'name' => $data['name']], 201);
    }

    public function showSegment(Request $request, string $segment): JsonResponse
    {
        $row = DB::table('customer_segments')->where('id', $segment)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Segment not found.', 404);
        }
        $members = DB::table('customer_segment_members')
            ->join('customers', 'customers.id', '=', 'customer_segment_members.customer_id')
            ->where('customer_segment_members.segment_id', $row->id)
            ->orderBy('customers.name')
            ->get(['customers.id', 'customers.name', 'customers.phone_e164']);

        return ApiResponse::ok(['id' => $row->id, 'name' => $row->name, 'customers' => $members]);
    }

    public function attachSegment(Request $request, string $segment): JsonResponse
    {
        $row = DB::table('customer_segments')->where('id', $segment)->where('tenant_id', $request->session()->get('tenant_id'))->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Segment not found.', 404);
        }
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
        ]);
        $customer = $this->customer($request, $data['customer_id']);
        if ($customer instanceof JsonResponse) {
            return $customer;
        }
        $exists = DB::table('customer_segment_members')->where('segment_id', $row->id)->where('customer_id', $customer->id)->exists();
        if (! $exists) {
            DB::table('customer_segment_members')->insert([
                'segment_id' => $row->id,
                'customer_id' => $customer->id,
                'created_at' => now(),
            ]);
        }

        return ApiResponse::ok(['segment_id' => $row->id, 'customer_id' => $customer->id]);
    }

    private function customer(Request $request, string $customer): \stdClass|JsonResponse
    {
        $row = DB::table('customers')
            ->where('id', $customer)
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->whereNull('deleted_at')
            ->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Customer not found.', 404);
        }

        return $row;
    }
}
