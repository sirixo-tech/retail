<?php

namespace Tests\Feature;

use App\Support\PlatformConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhoneSignInTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_sign_in_with_a_phone_code_and_email_still_works(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        $this->postJson('/api/v1/platform/tenants', [
            'owner_name' => 'Ananya Shah',
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'business_name' => 'Annapurna Stores',
            'phone' => '9876543210',
            'slug' => 'annapurna',
            'kind' => 'single_store',
            'plan_code' => 'starter',
        ])->assertCreated();
        $this->postJson('/api/v1/auth/platform/logout')->assertOk();

        $this->assertSame('9876543210', DB::table('users')->where('email', 'owner@annapurna.store')->value('phone_e164'));

        $methods = $this->getJson('/api/v1/public/auth/methods')->assertOk();
        $methods->assertJsonPath('data.email_password', true);
        $methods->assertJsonPath('data.phone_otp', true);

        $otp = $this->postJson('/api/v1/auth/phone/request', [
            'phone' => '9876543210',
            'purpose' => 'staff',
        ])->assertOk();
        $this->assertNotSame('', (string) $otp->json('data.code'));

        $this->postJson('/api/v1/auth/phone/verify', [
            'phone' => '9876543210',
            'code' => $otp->json('data.code'),
            'purpose' => 'staff',
        ])->assertOk()->assertJsonPath('data.kind', 'staff');

        $this->postJson('/api/v1/auth/staff/logout')->assertOk();
        $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'owner@annapurna.store',
            'password' => 'first-pass-1',
            'slug' => 'annapurna',
        ])->assertOk();
    }

    public function test_maps_key_comes_from_the_platform_and_demo_secrets_are_blank(): void
    {
        $this->seed();
        $this->postJson('/api/v1/auth/platform/login', [
            'email' => 'admin@selfx.test',
            'password' => 'password',
        ])->assertOk();
        PlatformConfig::put([
            'maps' => ['api_key' => 'maps-key-from-platform'],
            'sms' => ['api_key' => 'msg91_live_98a7bc65d43e21', 'enabled' => true],
        ]);

        $this->getJson('/api/v1/public/maps')->assertOk()->assertJsonPath('data.api_key', 'maps-key-from-platform');
        $this->getJson('/api/v1/platform/settings')
            ->assertOk()
            ->assertJsonPath('data.maps.api_key', 'maps-key-from-platform')
            ->assertJsonPath('data.sms.api_key', '');
    }

    public function test_store_id_branch_id_terminal_pin_and_kiosk_qr_counter_validation_flow(): void
    {
        $this->seed();
        $reg = $this->postJson('/api/v1/auth/register-tenant', [
            'business_name' => 'Sri Krishna Grand Mart',
            'owner_name' => 'Raghav Rao',
            'email' => 'raghav@krishnamart.in',
            'phone' => '9888777666',
            'password' => 'first-pass-1',
        ])->assertCreated();

        $storeId = (string) $reg->json('data.store_id');
        $branchId = (string) $reg->json('data.branch_id');
        $this->assertNotEmpty($storeId);
        $this->assertNotEmpty($branchId);

        // Login using store_id and branch_id instead of slug
        $login = $this->postJson('/api/v1/auth/staff/login', [
            'email' => 'raghav@krishnamart.in',
            'password' => 'first-pass-1',
            'store_id' => $storeId,
            'branch_id' => $branchId,
        ])->assertOk();

        $login->assertJsonPath('data.store_id', $storeId)
            ->assertJsonPath('data.branch_id', $branchId)
            ->assertJsonPath('data.current_store.store_id', $storeId)
            ->assertJsonPath('data.current_branch.branch_id', $branchId);

        $this->changeRequiredPassword();

        // Create a Kiosk terminal with a 4-digit PIN
        $kiosk = $this->postJson("/api/v1/stores/{$branchId}/terminals", [
            'name' => 'Entrance Self-Order Kiosk #1',
            'code' => 'K1',
            'kind' => 'kiosk',
            'pin' => '2580',
        ])->assertCreated();
        $kioskId = (string) $kiosk->json('data.id');
        $kiosk->assertJsonPath('data.kind', 'kiosk')
            ->assertJsonPath('data.has_pin', true);

        // Selecting Kiosk terminal without PIN or wrong PIN is rejected
        $this->postJson('/api/v1/auth/select-terminal', [
            'terminal_id' => $kioskId,
            'pin' => '0000',
        ])->assertStatus(401)->assertJsonPath('error.code', 'auth.invalid_pin');

        // Selecting Kiosk terminal with valid PIN succeeds
        $this->postJson('/api/v1/auth/select-terminal', [
            'terminal_id' => $kioskId,
            'pin' => '2580',
        ])->assertOk()->assertJsonPath('data.terminal_id', $kioskId);

        // Update Kiosk & QR Printing settings
        $this->putJson("/api/v1/stores/{$branchId}/kiosk-settings", [
            'kiosk_settings' => [
                'enabled' => true,
                'printing' => [
                    'auto_print_kiosk_slip' => true,
                    'print_validation_qr' => true,
                    'auto_print_counter_handover_receipt' => true,
                    'single_use_qr_redemption' => true,
                    'counter_stamp_text' => 'VERIFIED AT COUNTER #1',
                ],
            ],
        ])->assertOk()->assertJsonPath('data.kiosk_settings.printing.counter_stamp_text', 'VERIFIED AT COUNTER #1');

        // Create a store product to order on the Kiosk
        $itemRes = $this->postJson('/api/v1/catalog/own/products', [
            'store_id' => $branchId,
            'name' => 'Filter Coffee Powder 250g',
            'sku' => 'COF-250',
            'selling_price_paise' => 18000,
            'cost_paise' => 12000,
            'gst_bps' => 500,
            'opening_qty' => 25,
        ])->assertCreated();
        $storeItemId = (string) $itemRes->json('data.id');
        DB::table('store_items')->where('id', $storeItemId)->update(['online_visible' => true]);

        // Place a prepaid Kiosk order -> Receive Receipt #1 with QR code
        $kioskOrder = $this->postJson('/api/v1/kiosk/orders', [
            'branch_id' => $branchId,
            'terminal_id' => $kioskId,
            'order_type' => 'express_pickup',
            'payment_method' => 'upi_qr',
            'payment_captured' => true,
            'lines' => [
                ['store_item_id' => $storeItemId, 'qty' => 2],
            ],
        ])->assertCreated();

        $qrCode = (string) $kioskOrder->json('data.qr_code');
        $this->assertStringStartsWith('KSK-', $qrCode);
        $kioskOrder->assertJsonPath('data.kiosk_receipt.receipt_type', 'kiosk_order_slip')
            ->assertJsonPath('data.kiosk_receipt.payment_status', 'PREPAID');

        // Scan QR at Counter -> Verify all validations & receive Receipt #2 (Counter Handover Receipt)
        $scan = $this->postJson('/api/v1/kiosk/validate-qr', [
            'code' => $qrCode,
        ])->assertOk();

        $scan->assertJsonPath('data.validations.qr_authentic', true)
            ->assertJsonPath('data.validations.branch_matched', true)
            ->assertJsonPath('data.validations.payment_verified', true)
            ->assertJsonPath('data.validations.single_use_verified', true)
            ->assertJsonPath('data.receipt.receipt_type', 'counter_handover_receipt')
            ->assertJsonPath('data.receipt.stamp_text', 'VERIFIED AT COUNTER #1');

        // Scanning the same QR code a second time is blocked by single-use redemption lock
        $this->postJson('/api/v1/kiosk/validate-qr', [
            'code' => $qrCode,
        ])->assertStatus(409)->assertJsonPath('error.code', 'conflict.qr_already_redeemed');
    }
}
