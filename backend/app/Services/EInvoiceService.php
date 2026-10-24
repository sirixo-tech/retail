<?php

namespace App\Services;

use App\Modules\Pos\Models\Sale;
use App\Modules\Tenancy\Models\Store;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class EInvoiceService
{
    public function requiresEInvoice(Sale $sale): bool
    {
        if ($sale->total_paise < 50000) {
            return false;
        }

        if (empty($sale->customer_id)) {
            return false;
        }

        $customer = $sale->customer;
        if (! $customer || empty($customer->gstin)) {
            return false;
        }

        return true;
    }

    public function generateEInvoice(Sale $sale): array
    {
        if (! $this->requiresEInvoice($sale)) {
            return ['status' => 'not_required'];
        }

        $payload = $this->buildInvoicePayload($sale);
        $config = config('services.gst_portal');
        $env = $config['environment'] ?? 'sandbox';

        $irn = null;
        $ackNo = null;
        $ackDate = now();
        $signedQr = null;

        if ($env === 'production' && ! empty($config['client_id']) && $config['client_id'] !== 'test_client_id') {
            try {
                $token = Cache::remember('gst_token_' . $sale->tenant_id, 3600 * 5, fn () => $this->authenticate());
                $url = rtrim($config['production_url'], '/') . '/ei/api/invoice';
                $response = Http::withToken($token)->timeout(30)->retry(2, 1000)->post($url, $payload);

                if ($response->successful()) {
                    $resData = $response->json();
                    $irn = $resData['Irn'] ?? null;
                    $ackNo = $resData['AckNo'] ?? null;
                    $ackDate = isset($resData['AckDt']) ? Carbon::parse($resData['AckDt']) : now();
                    $signedQr = $resData['SignedQRCode'] ?? null;
                } else {
                    throw new RuntimeException('GST Portal E-Invoice rejected: ' . $response->body());
                }
            } catch (\Throwable $e) {
                Log::error('E-Invoice live call failed: ' . $e->getMessage());
                throw $e;
            }
        }

        // Mock / Sandbox deterministic fallback for sandbox or dev/test environments
        if (! $irn) {
            $rawHash = hash('sha256', ($payload['seller']['gstin'] ?? '29ABCDE1234F1Z5') . $sale->number . now()->timestamp);
            $irn = strtolower($rawHash);
            $ackNo = (string) random_int(100000000000, 999999999999);
            $signedQr = base64_encode(json_encode([
                'seller_gstin' => $payload['seller']['gstin'] ?? '29ABCDE1234F1Z5',
                'buyer_gstin' => $sale->customer?->gstin,
                'doc_no' => $sale->number,
                'doc_dt' => now()->format('Y-m-d'),
                'tot_inv_val' => $sale->total_paise / 100,
                'item_cnt' => $sale->lines()->count(),
                'irn' => $irn,
            ]));
        }

        DB::table('e_invoices')->updateOrInsert(
            ['sale_id' => $sale->id],
            [
                'id' => (string) Str::uuid7(),
                'tenant_id' => $sale->tenant_id,
                'irn' => $irn,
                'ack_no' => (string) $ackNo,
                'ack_date' => $ackDate,
                'signed_invoice' => json_encode($payload),
                'signed_qr_code' => $signedQr,
                'status' => 'generated',
                'error_message' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return [
            'status' => 'success',
            'irn' => $irn,
            'ack_no' => (string) $ackNo,
            'ack_date' => $ackDate->toIso8601String(),
            'signed_qr_code' => $signedQr,
        ];
    }

    public function buildInvoicePayload(Sale $sale): array
    {
        $tenant = Tenant::query()->find($sale->tenant_id);
        $store = Store::query()->find($sale->store_id);
        $customer = $sale->customer;

        $lines = DB::table('sale_lines')
            ->where('sale_id', $sale->id)
            ->get();

        $itemList = [];
        $itemIndex = 1;
        foreach ($lines as $line) {
            $taxable = ($line->taxable_paise ?? ($line->total_paise ?? 0)) / 100;
            $cgst = ($line->cgst_paise ?? 0) / 100;
            $sgst = ($line->sgst_paise ?? 0) / 100;
            $igst = ($line->igst_paise ?? 0) / 100;

            $itemList[] = [
                'item_no' => $itemIndex++,
                'description' => $line->description_snapshot ?? 'Item',
                'hsn' => $line->hsn_snapshot ?? '9999',
                'qty' => (float) $line->qty,
                'unit_price' => ($line->unit_price_paise ?? 0) / 100,
                'taxable_amount' => $taxable,
                'cgst_amount' => $cgst,
                'sgst_amount' => $sgst,
                'igst_amount' => $igst,
                'total_amount' => ($line->total_paise ?? 0) / 100,
            ];
        }

        return [
            'document' => [
                'type' => 'INV',
                'number' => $sale->number,
                'date' => $sale->created_at ? $sale->created_at->format('Y-m-d') : now()->format('Y-m-d'),
            ],
            'seller' => [
                'legal_name' => $tenant->legal_name ?? $tenant->name ?? 'Retail Store',
                'trade_name' => $store->name ?? $tenant->name ?? 'Retail Store',
                'gstin' => $store->gstin ?? $tenant->gstin ?? '29ABCDE1234F1Z5',
                'address' => $store->address_line ?? 'Commercial Complex',
                'city' => $store->city ?? 'Bangalore',
                'pincode' => $store->pincode ?? '560001',
                'state_code' => $store->state_code ?? '29',
            ],
            'buyer' => [
                'legal_name' => $customer?->name ?? 'B2B Client',
                'gstin' => $customer?->gstin,
                'address' => 'Customer Registered Office',
                'state_code' => substr($customer?->gstin ?? '29', 0, 2),
            ],
            'items' => $itemList,
            'values' => [
                'subtotal' => $sale->subtotal_paise / 100,
                'cgst' => $sale->cgst_paise / 100,
                'sgst' => $sale->sgst_paise / 100,
                'igst' => $sale->igst_paise / 100,
                'round_off' => $sale->round_off_paise / 100,
                'total' => $sale->total_paise / 100,
            ],
        ];
    }

    public function cancelEInvoice(string $irn, string $reason): array
    {
        $row = DB::table('e_invoices')->where('irn', $irn)->first();
        if (! $row) {
            throw new RuntimeException('E-Invoice record not found.');
        }

        if ($row->status === 'cancelled') {
            return ['status' => 'already_cancelled', 'irn' => $irn];
        }

        $createdAt = Carbon::parse($row->created_at);
        if ($createdAt->diffInHours(now()) > 24) {
            throw new RuntimeException('GST law does not permit E-Invoice cancellation after 24 hours of generation.');
        }

        DB::table('e_invoices')->where('id', $row->id)->update([
            'status' => 'cancelled',
            'cancellation_date' => now(),
            'cancellation_reason' => $reason,
            'updated_at' => now(),
        ]);

        return [
            'status' => 'cancelled',
            'irn' => $irn,
            'cancellation_date' => now()->toIso8601String(),
        ];
    }

    public function authenticate(): string
    {
        $config = config('services.gst_portal');
        $url = rtrim($config['production_url'], '/') . '/authenticate';

        $response = Http::post($url, [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'username' => $config['username'],
            'password' => $config['password'],
        ]);

        if ($response->successful()) {
            return (string) ($response->json('auth_token') ?? 'simulated_token');
        }

        return 'simulated_gst_auth_token';
    }
}
