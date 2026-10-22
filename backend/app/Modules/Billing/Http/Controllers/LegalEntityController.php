<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\SimplePdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegalEntityController
{
    public function show(): JsonResponse
    {
        return ApiResponse::ok($this->row());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'legal_name' => ['required', 'string', 'max:160'],
            'trade_name' => ['nullable', 'string', 'max:160'],
            'cin' => ['nullable', 'string', 'max:25'],
            'pan' => ['nullable', 'string', 'max:10'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'sac' => ['nullable', 'string', 'max:6'],
            'address' => ['nullable', 'string', 'max:240'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'bank_account_name' => ['nullable', 'string', 'max:160'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],
            'bank_ifsc' => ['nullable', 'string', 'max:15'],
            'bank_branch' => ['nullable', 'string', 'max:100'],
            'bank_upi_id' => ['nullable', 'string', 'max:100'],
            'signatory_name' => ['nullable', 'string', 'max:120'],
            'signatory_designation' => ['nullable', 'string', 'max:100'],
            'invoice_prefix' => ['nullable', 'string', 'max:20'],
        ]);
        $gstin = strtoupper(trim((string) ($data['gstin'] ?? '')));
        if ($gstin !== '' && ! preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', $gstin)) {
            return ApiResponse::error('validation.failed', 'That GSTIN is not valid.', 422);
        }
        $pan = strtoupper(trim((string) ($data['pan'] ?? '')));
        if ($pan !== '' && ! preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/', $pan)) {
            return ApiResponse::error('validation.failed', 'That PAN is not valid.', 422);
        }
        $sac = trim((string) ($data['sac'] ?? ''));
        if ($sac !== '' && ! preg_match('/^[0-9]{4,6}$/', $sac)) {
            return ApiResponse::error('validation.failed', 'SAC is four to six digits.', 422);
        }

        $existing = DB::table('platform_settings')->first();
        $payload = [
            'legal_name' => $data['legal_name'],
            'trade_name' => $data['trade_name'] ?? null,
            'cin' => $data['cin'] ?? null,
            'pan' => $pan === '' ? null : $pan,
            'gstin' => $gstin === '' ? null : $gstin,
            'sac' => $sac === '' ? null : $sac,
            'address' => $data['address'] ?? null,
            'bank_name' => $data['bank_name'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_ifsc' => strtoupper(trim((string) ($data['bank_ifsc'] ?? ''))) ?: null,
            'bank_branch' => $data['bank_branch'] ?? null,
            'bank_upi_id' => $data['bank_upi_id'] ?? null,
            'signatory_name' => $data['signatory_name'] ?? null,
            'signatory_designation' => $data['signatory_designation'] ?? null,
            'invoice_prefix' => $data['invoice_prefix'] ?? 'SFX-',
            'updated_at' => now(),
        ];
        if ($existing) {
            DB::table('platform_settings')->where('id', $existing->id)->update($payload);
        } else {
            DB::table('platform_settings')->insert([
                'id' => (string) Str::uuid7(),
                ...$payload,
                'created_at' => now(),
            ]);
        }
        DB::table('billing_invoices')->update([
            'specimen' => $gstin === '',
            'updated_at' => now(),
        ]);

        return ApiResponse::ok($this->row());
    }

    public function pdf(Request $request, string $invoice): Response|JsonResponse
    {
        $row = DB::table('billing_invoices')
            ->where('id', $invoice)
            ->where('tenant_id', $request->session()->get('tenant_id'))
            ->first();
        if (! $row) {
            return ApiResponse::error('resource.not_found', 'Invoice not found.', 404);
        }
        $legal = DB::table('platform_settings')->first();
        $gstin = is_object($legal) ? $legal->gstin : null;
        $specimen = ! is_string($gstin) || $gstin === '';
        $rupees = fn (int $paise): string => number_format($paise / 100, 2, '.', '');
        $sac = is_object($legal) ? $legal->sac : null;
        $lines = [
            $specimen ? 'SelfX Retail' : (string) ($legal->legal_name ?? 'SelfX Retail'),
            $specimen ? 'GSTIN not saved' : 'GSTIN '.$gstin,
            $sac ? 'SAC '.$sac : 'SAC not set',
            is_object($legal) ? (string) ($legal->address ?? '') : '',
            'Invoice '.$row->number,
            'Period '.$row->period_start.' to '.$row->period_end,
            'Subtotal INR '.$rupees((int) $row->subtotal_paise),
            'CGST INR '.$rupees((int) $row->cgst_paise),
            'SGST INR '.$rupees((int) $row->sgst_paise),
            'Total INR '.$rupees((int) $row->total_paise),
        ];

        return response(SimplePdf::render(array_values(array_filter($lines, fn ($line) => $line !== '')), $specimen), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$row->number.'.pdf"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function row(): array
    {
        $legal = DB::table('platform_settings')->first();
        $gstin = $legal->gstin ?? null;

        return [
            'legal_name' => $legal->legal_name ?? null,
            'trade_name' => $legal->trade_name ?? null,
            'cin' => $legal->cin ?? null,
            'pan' => $legal->pan ?? null,
            'gstin' => $gstin,
            'sac' => $legal->sac ?? null,
            'address' => $legal->address ?? null,
            'bank_name' => $legal->bank_name ?? null,
            'bank_account_name' => $legal->bank_account_name ?? null,
            'bank_account_number' => $legal->bank_account_number ?? null,
            'bank_ifsc' => $legal->bank_ifsc ?? null,
            'bank_branch' => $legal->bank_branch ?? null,
            'bank_upi_id' => $legal->bank_upi_id ?? null,
            'signatory_name' => $legal->signatory_name ?? null,
            'signatory_designation' => $legal->signatory_designation ?? null,
            'invoice_prefix' => $legal->invoice_prefix ?? 'SFX-',
            'specimen' => ! is_string($gstin) || $gstin === '',
        ];
    }
}
