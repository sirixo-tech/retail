<?php

namespace App\Modules\Orders\Actions;

use App\Modules\Catalog\Models\Product;
use App\Modules\Inventory\Actions\ReserveStock;
use App\Modules\Inventory\Models\StoreItem;
use App\Modules\Plans\Support\Entitlement;
use App\Modules\Tenancy\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PlaceOrder
{
    public function __construct(private ReserveStock $reservations, private InvoiceOrder $invoices, private Entitlement $entitlements)
    {
    }

    /** @var array<string, list<string>> */
    public const EDGES = [
        'placed' => ['accepted', 'rejected'],
        'accepted' => ['packing', 'cancelled'],
        'packing' => ['ready', 'cancelled'],
        'ready' => ['out_for_delivery', 'ready_for_pickup', 'cancelled'],
        'out_for_delivery' => ['delivered'],
        'ready_for_pickup' => ['picked_up'],
    ];

    /**
     * @param  list<array{store_item_id: string, qty: float|int|string}>  $lines
     * @return array<string, mixed>
     */
    public function place(
        Store $store,
        string $name,
        string $phone,
        string $fulfillment,
        array $lines,
        ?string $pincode = null,
        string $paymentMethod = 'pay_at_store',
        ?string $couponCode = null,
        ?array $addressData = null
    ): array
    {
        if (! in_array($fulfillment, ['pickup', 'delivery'], true)) {
            throw new RuntimeException('Choose pickup or delivery.');
        }
        $this->entitlements->assertOrders($store->tenant_id);

        return DB::transaction(function () use ($store, $name, $phone, $fulfillment, $lines, $pincode, $paymentMethod, $couponCode, $addressData) {
            $built = [];
            $subtotal = 0;
            foreach ($lines as $line) {
                $item = StoreItem::query()
                    ->where('store_id', $store->id)
                    ->where('online_visible', true)
                    ->find($line['store_item_id']);
                if (! $item) {
                    throw new RuntimeException('An item is not available online.');
                }
                $qty = (float) $line['qty'];
                $price = DB::table('store_item_prices')->where('store_item_id', $item->id)->orderByDesc('starts_at')->first();
                if (! $price || $qty <= 0) {
                    throw new RuntimeException('An item has no price.');
                }
                $lineTotal = (int) round(((int) $price->selling_price_paise) * $qty);
                $subtotal += $lineTotal;
                $masterName = $item->master_product_id
                    ? Product::query()->where('id', $item->master_product_id)->value('name')
                    : null;
                $built[] = [$item, $qty, (int) $price->selling_price_paise, $item->name_override ?: ($masterName ?: $item->sku)];
            }

            $fee = 0;
            $onlineSettings = $store->settings['online_store'] ?? [];
            $checkoutSettings = $onlineSettings['checkout'] ?? [];
            $shippingSettings = $onlineSettings['shipping'] ?? [];
            $shippingMethods = $onlineSettings['shippingMethods'] ?? [];
            $firstShippingMethod = !empty($shippingMethods) && is_array($shippingMethods) ? ($shippingMethods[0] ?? null) : null;

            if ($fulfillment === 'delivery') {
                $serviceableLocations = is_array($onlineSettings['serviceableLocations'] ?? null)
                    ? array_values(array_filter($onlineSettings['serviceableLocations'], fn ($loc) => is_array($loc) && ($loc['enabled'] ?? true) !== false))
                    : [];
                $matchedServiceable = null;
                $cleanPin = trim((string) ($pincode ?? ''));
                $cleanAddr = mb_strtolower(trim((string) ($addressData['address'] ?? '')));

                if (! empty($serviceableLocations)) {
                    foreach ($serviceableLocations as $loc) {
                        $locPin = trim((string) ($loc['pincode'] ?? ''));
                        $locName = mb_strtolower(trim((string) ($loc['name'] ?? '')));
                        if (
                            ($locPin !== '' && strcasecmp($locPin, $cleanPin) === 0) ||
                            ($locPin !== '' && $cleanAddr !== '' && str_contains($cleanAddr, mb_strtolower($locPin))) ||
                            ($locName !== '' && $cleanAddr !== '' && str_contains($cleanAddr, $locName)) ||
                            ($locName !== '' && $cleanPin !== '' && strcasecmp($locName, $cleanPin) === 0)
                        ) {
                            $matchedServiceable = $loc;
                            break;
                        }
                    }

                    if (! $matchedServiceable) {
                        $labels = array_map(
                            fn ($loc) => trim(($loc['name'] ?? '') . (! empty($loc['pincode']) ? ' (' . $loc['pincode'] . ')' : '')),
                            array_slice($serviceableLocations, 0, 6)
                        );
                        throw new RuntimeException(
                            'Delivery is only available for registered store locations: ' . implode(', ', array_filter($labels)) . '. Please enter a registered location/PIN or choose Pay in store.'
                        );
                    }
                }

                $zone = DB::table('delivery_zones')
                    ->where('store_id', $store->id)
                    ->where('pincode', $pincode)
                    ->first();
                if ($matchedServiceable) {
                    $freeThreshold = (int) (($shippingSettings['freeDeliveryAbove'] ?? ($firstShippingMethod['freeAboveAmount'] ?? ($checkoutSettings['freeDeliveryAbove'] ?? 0))) * 100);
                    $locFee = (int) round(((float) ($matchedServiceable['deliveryFee'] ?? ($shippingSettings['standardDeliveryFee'] ?? 0))) * 100);
                    $fee = ($freeThreshold > 0 && $subtotal >= $freeThreshold) ? 0 : $locFee;
                } elseif ($zone) {
                    $fee = (int) $zone->charge_paise;
                } elseif (empty($shippingSettings) && empty($shippingMethods)) {
                    throw new RuntimeException('We do not deliver to that pincode.');
                } else {
                    $freeThreshold = (int) (($shippingSettings['freeDeliveryAbove'] ?? ($firstShippingMethod['freeAboveAmount'] ?? ($checkoutSettings['freeDeliveryAbove'] ?? 0))) * 100);
                    $defaultDeliveryFee = (int) (($shippingSettings['standardDeliveryFee'] ?? ($firstShippingMethod['feeAmount'] ?? ($checkoutSettings['deliveryFee'] ?? 35))) * 100);
                    $fee = ($freeThreshold > 0 && $subtotal >= $freeThreshold) ? 0 : $defaultDeliveryFee;
                }
            }

            // Packaging fee if configured by tenant
            $packagingFee = 0;
            if ($fulfillment === 'delivery' && !empty($shippingSettings['enablePackagingFee'])) {
                $packagingFee = (int) (($shippingSettings['packagingFee'] ?? ($checkoutSettings['packagingFee'] ?? 0)) * 100);
            }

            // Calculate GST based on tenant tax settings
            $taxSettings = $onlineSettings['taxSettings'] ?? [];
            $taxRates = $onlineSettings['taxRates'] ?? [];
            $firstTaxRate = !empty($taxRates) && is_array($taxRates) ? ($taxRates[0] ?? null) : null;
            $cgstPct = (float) ($taxSettings['defaultCgstPct'] ?? ($firstTaxRate['cgstPct'] ?? 2.5));
            $sgstPct = (float) ($taxSettings['defaultSgstPct'] ?? ($firstTaxRate['sgstPct'] ?? 2.5));
            $totalGstPct = $cgstPct + $sgstPct;
            $inclusive = ($taxSettings['inclusiveInMrp'] ?? ($firstTaxRate['inclusiveInMrp'] ?? true)) !== false;

            $cgstPaise = 0;
            $sgstPaise = 0;
            $totalGstPaise = 0;
            $netSubtotalPaise = $subtotal;
            if ($totalGstPct > 0) {
                if ($inclusive) {
                    $netSubtotalPaise = (int) round($subtotal / (1 + $totalGstPct / 100));
                    $totalGstPaise = $subtotal - $netSubtotalPaise;
                    $cgstPaise = (int) round($totalGstPaise * ($cgstPct / $totalGstPct));
                    $sgstPaise = $totalGstPaise - $cgstPaise;
                } else {
                    $cgstPaise = (int) round($subtotal * ($cgstPct / 100));
                    $sgstPaise = (int) round($subtotal * ($sgstPct / 100));
                    $totalGstPaise = $cgstPaise + $sgstPaise;
                }
            }

            $discount = $this->discount($store->tenant_id, $subtotal, $couponCode);
            $loyaltyProgram = is_array($onlineSettings['loyalty'] ?? null) ? $onlineSettings['loyalty'] : [];
            $loyaltyDiscount = 0;
            $loyaltyCustomerId = null;
            $redeemPoints = (int) ($addressData['loyalty_points'] ?? 0);
            if (($loyaltyProgram['enabled'] ?? false) && $redeemPoints > 0) {
                $digits = substr(preg_replace('/\D+/', '', $phone) ?? '', -10);
                $loyaltyCustomerId = $digits !== ''
                    ? DB::table('customers')->where('tenant_id', $store->tenant_id)->where('phone_e164', $digits)->value('id')
                    : null;
                if ($loyaltyCustomerId) {
                    $balance = (int) DB::table('customers')->where('id', $loyaltyCustomerId)->value('loyalty_points');
                    $paisePerPoint = max(1, (int) ($loyaltyProgram['redeemPaisePerPoint'] ?? $loyaltyProgram['redeem_paise_per_point'] ?? 100));
                    $minPoints = max(0, (int) ($loyaltyProgram['minRedeemPoints'] ?? $loyaltyProgram['min_redeem_points'] ?? 1));
                    $maxPercent = min(100, max(1, (int) ($loyaltyProgram['maxRedeemPercent'] ?? $loyaltyProgram['max_redeem_percent'] ?? 50)));
                    $redeemPoints = min($redeemPoints, $balance);
                    if ($redeemPoints >= $minPoints) {
                        $cap = (int) floor($subtotal * ($maxPercent / 100));
                        $loyaltyDiscount = min($cap, $redeemPoints * $paisePerPoint);
                        $redeemPoints = (int) floor($loyaltyDiscount / $paisePerPoint);
                        $loyaltyDiscount = $redeemPoints * $paisePerPoint;
                    } else {
                        $redeemPoints = 0;
                    }
                }
            }
            $discount += $loyaltyDiscount;
            $count = DB::table('orders')->where('tenant_id', $store->tenant_id)->count() + 1;
            $orderId = (string) Str::uuid7();
            $orderNumber = 'ON-'.str_pad((string) $count, 6, '0', STR_PAD_LEFT);
            $pickupQr = 'SELFX-ORD-' . strtoupper(Str::random(8));

            $lat = isset($addressData['latitude']) && is_numeric($addressData['latitude']) ? (float) $addressData['latitude'] : null;
            $lng = isset($addressData['longitude']) && is_numeric($addressData['longitude']) ? (float) $addressData['longitude'] : null;
            $liveLocUrl = $addressData['live_location_url'] ?? ($lat && $lng ? "https://www.google.com/maps?q={$lat},{$lng}" : null);
            $orderNotes = $addressData['special_instructions'] ?? ($addressData['order_notes'] ?? null);

            $snapshotArray = [
                'name' => $name,
                'phone' => $phone,
                'email' => $addressData['email'] ?? null,
                'address' => $addressData['address'] ?? ($addressData['address_line'] ?? null),
                'city' => $addressData['city'] ?? $store->city,
                'pincode' => $pincode ?? ($addressData['pincode'] ?? null),
                'landmark' => $addressData['landmark'] ?? null,
                'latitude' => $lat,
                'longitude' => $lng,
                'live_location_url' => $liveLocUrl,
                'special_instructions' => $orderNotes,
                'delivery_slot' => $addressData['delivery_slot'] ?? null,
                'customer_auth_mode' => $addressData['customer_auth_mode'] ?? 'guest',
                'cgst_paise' => $cgstPaise,
                'sgst_paise' => $sgstPaise,
                'cgst_pct' => $cgstPct,
                'sgst_pct' => $sgstPct,
                'is_tax_inclusive' => $inclusive,
                'packaging_fee_paise' => $packagingFee,
                'upi_utr' => $addressData['upi_utr'] ?? ($addressData['utr'] ?? null),
                'payment_submethod' => $addressData['payment_submethod'] ?? ($paymentMethod === 'upi_qr' ? 'static_qr' : null),
            ];

            $finalTotal = $inclusive
                ? max(0, $subtotal - $discount + $fee + $packagingFee)
                : max(0, $subtotal + $totalGstPaise - $discount + $fee + $packagingFee);

            $resolvedPaymentMethod = in_array($paymentMethod, ['upi_qr', 'upi'], true) ? 'upi' : $paymentMethod;
            $initialPaymentStatus = in_array($paymentMethod, ['upi_qr', 'upi'], true)
                ? (! empty($addressData['upi_utr']) ? 'awaiting_verification' : 'unpaid')
                : 'unpaid';

            DB::table('orders')->insert([
                'id' => $orderId,
                'tenant_id' => $store->tenant_id,
                'store_id' => $store->id,
                'number' => $orderNumber,
                'status' => 'placed',
                'fulfillment' => $fulfillment,
                'customer_name' => $name,
                'customer_phone' => $phone,
                'address_snapshot' => json_encode($snapshotArray),
                'subtotal_paise' => $subtotal,
                'delivery_fee_paise' => $fee,
                'discount_paise' => $discount,
                'total_paise' => $finalTotal,
                'payment_status' => $initialPaymentStatus,
                'payment_method' => $resolvedPaymentMethod,
                'pickup_qr' => $pickupQr,
                'delivery_status' => $fulfillment === 'delivery' ? 'unassigned' : 'not_applicable',
                'latitude' => $lat,
                'longitude' => $lng,
                'live_location_url' => $liveLocUrl,
                'order_notes' => $orderNotes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach ($built as [$item, $qty, $unit, $name]) {
                DB::table('order_lines')->insert([
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'store_item_id' => $item->id,
                    'name_snapshot' => $name,
                    'qty' => $qty,
                    'unit_price_paise' => $unit,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->event($orderId, null, 'placed', null, null);
            app(\App\Modules\Notifications\SmsGateway::class)->record(
                $store->tenant_id,
                'order.placed',
                'Online order placed: '.$orderNumber.($fulfillment === 'delivery' ? ' (Delivery with Live GPS)' : ' (Pay in store pickup)'),
                $phone,
                'Your order '.$orderNumber.' at '.$store->name.' is placed.',
                $orderId,
            );
            $this->applyLoyalty($store, $name, $phone, $orderId, $finalTotal, $loyaltyProgram, $loyaltyCustomerId, $redeemPoints);
            try {
                app(\App\Modules\Integrations\IntegrationNotifier::class)->orderPlaced($store, $orderNumber, $finalTotal, $name, $phone);
            } catch (\Throwable) {
            }

            return $this->present(DB::table('orders')->where('id', $orderId)->first());
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function transition(string $tenantId, string $orderId, string $to, ?string $actorId, ?string $otp = null): array
    {
        $this->reservations->releaseExpired();

        return DB::transaction(function () use ($tenantId, $orderId, $to, $actorId, $otp) {
            $order = DB::table('orders')->where('id', $orderId)->where('tenant_id', $tenantId)->lockForUpdate()->first();
            if (! $order) {
                throw new RuntimeException('resource.not_found');
            }
            $allowed = self::EDGES[$order->status] ?? [];
            if (! in_array($to, $allowed, true)) {
                throw new RuntimeException('conflict.transition');
            }
            if ($order->fulfillment === 'pickup' && $to === 'out_for_delivery') {
                throw new RuntimeException('conflict.transition');
            }
            if ($order->fulfillment === 'delivery' && $to === 'ready_for_pickup') {
                throw new RuntimeException('conflict.transition');
            }
            if ($to === 'accepted') {
                $this->reservations->reserve($order);
            }
            if (in_array($to, ['rejected', 'cancelled'], true)) {
                $this->reservations->release($order->id);
            }
            DB::table('orders')->where('id', $order->id)->update(['status' => $to, 'updated_at' => now()]);
            $this->event($order->id, $order->status, $to, $actorId, null);
            $oneTimeCode = null;
            if ($to === 'out_for_delivery') {
                $oneTimeCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                DB::table('deliveries')->updateOrInsert(
                    ['order_id' => $order->id],
                    [
                        'id' => (string) Str::uuid7(),
                        'otp_hash' => hash_hmac('sha256', $oneTimeCode, (string) config('app.key')),
                        'otp_attempts' => 0,
                        'status' => 'assigned',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
                app(\App\Modules\Notifications\SmsGateway::class)->record(
                    $tenantId,
                    'delivery.otp',
                    'Delivery code was not sent by SMS.',
                    (string) ($order->customer_phone ?? ''),
                    'Your delivery code for order '.$order->number.' is '.$oneTimeCode.'.',
                    $order->id,
                );
            }
            if ($to === 'delivered') {
                $this->checkOtp($order->id, (string) $otp);
                DB::table('deliveries')->where('order_id', $order->id)->update(['status' => 'delivered', 'updated_at' => now()]);
            }
            if ($this->invoices->applies($order, $to)) {
                $this->invoices->create($order);
            }

            $payload = $this->present(DB::table('orders')->where('id', $order->id)->first());
            if ($oneTimeCode) {
                $payload['delivery_otp'] = $oneTimeCode;
            }

            return $payload;
        });
    }

    private function checkOtp(string $orderId, string $otp): void
    {
        $delivery = DB::table('deliveries')->where('order_id', $orderId)->first();
        if (! $delivery) {
            throw new RuntimeException('conflict.transition');
        }
        if ((int) $delivery->otp_attempts >= 5) {
            throw new RuntimeException('auth.locked');
        }
        $hash = hash_hmac('sha256', $otp, (string) config('app.key'));
        if (! hash_equals($delivery->otp_hash, $hash)) {
            DB::table('deliveries')->where('order_id', $orderId)->update([
                'otp_attempts' => (int) $delivery->otp_attempts + 1,
                'updated_at' => now(),
            ]);
            throw new RuntimeException('auth.invalid_code');
        }
    }

    private function discount(string $tenantId, int $subtotal, ?string $code): int
    {
        $code = strtoupper(trim((string) $code));
        if ($code === '') {
            return 0;
        }
        $coupon = DB::table('coupons')->where('tenant_id', $tenantId)->where('code', $code)->lockForUpdate()->first();
        if (! $coupon || $coupon->status !== 'active') {
            throw new RuntimeException('That coupon is not valid.');
        }
        if ($coupon->expires_at && now()->startOfDay()->gt($coupon->expires_at)) {
            throw new RuntimeException('That coupon has expired.');
        }
        if ($coupon->max_redemptions !== null && (int) $coupon->redeemed_count >= (int) $coupon->max_redemptions) {
            throw new RuntimeException('That coupon has been used up.');
        }
        $off = $coupon->kind === 'percent'
            ? intdiv($subtotal * (int) $coupon->value, 100)
            : (int) $coupon->value;
        $off = min($off, $subtotal);
        DB::table('coupons')->where('id', $coupon->id)->update([
            'redeemed_count' => (int) $coupon->redeemed_count + 1,
            'updated_at' => now(),
        ]);

        return $off;
    }

    /**
     * @param  array<string, mixed>  $program
     */
    private function applyLoyalty(Store $store, string $name, string $phone, string $orderId, int $totalPaise, array $program, ?string $customerId, int $redeemPoints): void
    {
        if (! ($program['enabled'] ?? false)) {
            return;
        }
        $digits = substr(preg_replace('/\D+/', '', $phone) ?? '', -10);
        if (strlen($digits) < 10) {
            return;
        }
        if (! $customerId) {
            $customerId = DB::table('customers')->where('tenant_id', $store->tenant_id)->where('phone_e164', $digits)->value('id');
        }
        if (! $customerId) {
            $customerId = (string) Str::uuid7();
            DB::table('customers')->insert([
                'id' => $customerId,
                'tenant_id' => $store->tenant_id,
                'name' => $name,
                'phone_e164' => $digits,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        if ($redeemPoints > 0) {
            DB::table('customers')->where('id', $customerId)->decrement('loyalty_points', $redeemPoints);
            DB::table('loyalty_entries')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $store->tenant_id,
                'customer_id' => $customerId,
                'sale_id' => $orderId,
                'direction' => 'redeem',
                'points' => $redeemPoints,
                'created_at' => now(),
            ]);
        }
        $spend = max(1, (int) ($program['earnRupeesPerPoint'] ?? $program['earn_rupees_per_point'] ?? 100));
        $earned = intdiv(max(0, $totalPaise), $spend * 100);
        if ($earned > 0 && ! DB::table('loyalty_entries')->where('sale_id', $orderId)->where('direction', 'earn')->exists()) {
            DB::table('customers')->where('id', $customerId)->increment('loyalty_points', $earned);
            DB::table('loyalty_entries')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $store->tenant_id,
                'customer_id' => $customerId,
                'sale_id' => $orderId,
                'direction' => 'earn',
                'points' => $earned,
                'created_at' => now(),
            ]);
        }
    }

    private function event(string $orderId, ?string $from, string $to, ?string $actorId, ?string $note): void
    {
        DB::table('order_status_events')->insert([
            'id' => (string) Str::uuid7(),
            'order_id' => $orderId,
            'from_status' => $from,
            'to_status' => $to,
            'actor_id' => $actorId,
            'note' => $note,
            'created_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(object $order): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status,
            'fulfillment' => $order->fulfillment,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'total_paise' => (int) $order->total_paise,
            'subtotal_paise' => (int) ($order->subtotal_paise ?? $order->total_paise),
            'delivery_fee_paise' => (int) ($order->delivery_fee_paise ?? 0),
            'discount_paise' => (int) ($order->discount_paise ?? 0),
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'pickup_qr' => $order->pickup_qr ?? null,
            'delivery_status' => $order->delivery_status ?? null,
            'latitude' => $order->latitude ?? null,
            'longitude' => $order->longitude ?? null,
            'live_location_url' => $order->live_location_url ?? null,
            'order_notes' => $order->order_notes ?? null,
            'address_snapshot' => is_string($order->address_snapshot) ? json_decode($order->address_snapshot, true) : $order->address_snapshot,
            'sale_id' => $order->sale_id,
            'created_at' => $order->created_at,
        ];
    }
}
