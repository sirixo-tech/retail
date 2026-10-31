<?php

namespace App\Modules\Pos\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliveryDeskController
{
    public function publicMessages(Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:64'],
        ]);
        $order = $this->orderByNumber($data['number']);
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }

        return ApiResponse::ok([
            'order_id' => $order->id,
            'partner_name' => $order->delivery_staff_name,
            'messages' => $this->messagesFor((string) $order->id),
        ]);
    }

    public function publicSend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:64'],
            'body' => ['required', 'string', 'max:1000'],
        ]);
        $order = $this->orderByNumber($data['number']);
        if (! $order) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }
        $body = trim($data['body']);
        if ($body === '') {
            return ApiResponse::error('validation.failed', 'Write a message first.', 422);
        }
        $this->insertMessage($order, 'customer', (string) ($order->customer_name ?: 'Customer'), $body);

        return ApiResponse::ok(['messages' => $this->messagesFor((string) $order->id)]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        if ($scope instanceof JsonResponse) {
            return $scope;
        }
        [$tenantId, $staffId, $mineOnly] = $scope;
        $orders = $this->deliveryQuery($tenantId, $mineOnly ? $staffId : null)->get();
        $start = now()->startOfDay();
        $mine = fn ($order) => ! $mineOnly || $this->assignedTo($order, $staffId);

        $assigned = $orders->filter(fn ($order) => $mine($order) && ! in_array($order->status, ['delivered', 'picked_up', 'cancelled', 'rejected'], true));
        $onRoad = $assigned->filter(fn ($order) => $order->delivery_status === 'out_for_delivery' || $order->status === 'out_for_delivery');
        $deliveredToday = $orders->filter(function ($order) use ($mine, $start) {
            return $mine($order)
                && in_array($order->status, ['delivered', 'picked_up'], true)
                && $order->updated_at >= $start;
        });
        $collect = $assigned->filter(fn ($order) => in_array($order->payment_method, ['cod', 'pay_at_store'], true) && $order->payment_status !== 'captured')
            ->sum(fn ($order) => (int) $order->total_paise);

        return ApiResponse::ok([
            'mine_only' => $mineOnly,
            'assigned' => $assigned->count(),
            'on_road' => $onRoad->count(),
            'delivered_today' => $deliveredToday->count(),
            'collect_paise' => (int) $collect,
            'orders' => $assigned->sortByDesc('created_at')->take(12)->map(fn ($order) => $this->orderCard($order))->values(),
        ]);
    }

    public function inbox(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        if ($scope instanceof JsonResponse) {
            return $scope;
        }
        [$tenantId, $staffId, $mineOnly] = $scope;
        $orders = $this->deliveryQuery($tenantId, $mineOnly ? $staffId : null)
            ->where('fulfillment', 'delivery')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get();
        $ids = $orders->pluck('id');
        $latest = DB::table('delivery_messages')
            ->whereIn('order_id', $ids)
            ->orderByDesc('created_at')
            ->get()
            ->unique('order_id')
            ->keyBy('order_id');

        $threads = $orders->map(function ($order) use ($latest) {
            $message = $latest->get($order->id);

            return [
                'order_id' => (string) $order->id,
                'number' => (string) $order->number,
                'customer_name' => $order->customer_name ?: 'Customer',
                'customer_phone' => $order->customer_phone,
                'status' => $order->status,
                'delivery_status' => $order->delivery_status,
                'total_paise' => (int) $order->total_paise,
                'payment_method' => $order->payment_method,
                'has_messages' => $message !== null,
                'last_message' => $message->body ?? null,
                'last_sender' => $message->sender ?? null,
                'last_at' => $message->created_at ?? null,
            ];
        })->sortByDesc(function ($row) {
            $hasMsg = ! empty($row['has_messages']) ? '1' : '0';
            $isLive = in_array($row['status'], ['out_for_delivery', 'ready', 'packing', 'placed'], true) ? '1' : '0';
            return $hasMsg . '_' . $isLive . '_' . ($row['last_at'] ?? $row['number'] ?? '');
        })->values();

        return ApiResponse::ok($threads);
    }

    public function thread(Request $request, string $order): JsonResponse
    {
        $row = $this->staffOrder($request, $order);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        return ApiResponse::ok([
            'order' => $this->orderCard($row),
            'messages' => $this->messagesFor((string) $row->id),
        ]);
    }

    public function reply(Request $request, string $order): JsonResponse
    {
        $row = $this->staffOrder($request, $order);
        if ($row instanceof JsonResponse) {
            return $row;
        }
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);
        $body = trim($data['body']);
        if ($body === '') {
            return ApiResponse::error('validation.failed', 'Write a message first.', 422);
        }
        $name = (string) ($request->user()?->name ?: ($row->delivery_staff_name ?: 'Delivery partner'));
        $this->insertMessage($row, 'partner', $name, $body);

        return ApiResponse::ok(['messages' => $this->messagesFor((string) $row->id)]);
    }

    public function settings(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request);
        if (! $tenantId || ! $request->user()) {
            return ApiResponse::error('auth.unauthorized', 'Active tenant session required.', 401);
        }
        $row = DB::table('delivery_partner_settings')->where('user_id', $request->user()->id)->first();

        return ApiResponse::ok($this->settingsPayload($row));
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request);
        if (! $tenantId || ! $request->user()) {
            return ApiResponse::error('auth.unauthorized', 'Active tenant session required.', 401);
        }
        $data = $request->validate([
            'share_phone' => ['required', 'boolean'],
            'notify_new_order' => ['required', 'boolean'],
            'notify_chat' => ['required', 'boolean'],
            'vehicle' => ['nullable', 'string', 'max:40'],
            'note' => ['nullable', 'string', 'max:240'],
        ]);
        $now = now();
        DB::table('delivery_partner_settings')->updateOrInsert(
            ['user_id' => $request->user()->id],
            [
                'tenant_id' => $tenantId,
                'share_phone' => $data['share_phone'],
                'notify_new_order' => $data['notify_new_order'],
                'notify_chat' => $data['notify_chat'],
                'vehicle' => $data['vehicle'] ?? null,
                'note' => $data['note'] ?? null,
                'updated_at' => $now,
                'created_at' => $now,
            ],
        );

        return ApiResponse::ok($this->settingsPayload(DB::table('delivery_partner_settings')->where('user_id', $request->user()->id)->first()));
    }

    private function orderByNumber(string $number): ?object
    {
        return DB::table('orders')->where('number', $number)->orWhere('id', $number)->first();
    }

    /**
     * @return array{0: string, 1: ?string, 2: bool}|JsonResponse
     */
    private function scope(Request $request): array|JsonResponse
    {
        $tenantId = $this->tenantId($request);
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Active tenant session required.', 401);
        }
        $profile = DB::table('staff_profiles')->where('user_id', $request->user()?->id)->where('tenant_id', $tenantId)->first();
        $role = strtolower((string) (DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $request->user()?->id)
            ->where('model_has_roles.tenant_id', $tenantId)
            ->value('roles.name') ?? ''));
        $mineOnly = $role === 'delivery';

        return [$tenantId, $profile?->id ? (string) $profile->id : (string) $request->user()?->id, $mineOnly];
    }

    private function deliveryQuery(string $tenantId, ?string $staffId)
    {
        $query = DB::table('orders')->where('tenant_id', $tenantId)->whereIn('fulfillment', ['delivery', 'pickup']);
        if ($staffId) {
            $query->where(function ($inner) use ($staffId) {
                $inner->where('delivery_staff_id', $staffId);
            });
        }

        return $query;
    }

    private function assignedTo(object $order, ?string $staffId): bool
    {
        return $staffId !== null && (string) $order->delivery_staff_id === $staffId;
    }

    private function staffOrder(Request $request, string $orderId): \stdClass|JsonResponse
    {
        $scope = $this->scope($request);
        if ($scope instanceof JsonResponse) {
            return $scope;
        }
        [$tenantId, $staffId, $mineOnly] = $scope;
        $order = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->where(function ($query) use ($orderId) {
                $query->where('id', $orderId)
                    ->orWhere('number', $orderId);
            })
            ->first();

        if (! $order || ($mineOnly && ! $this->assignedTo($order, $staffId))) {
            return ApiResponse::error('resource.not_found', 'Order not found.', 404);
        }

        return $order;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function messagesFor(string $orderId): array
    {
        return DB::table('delivery_messages')
            ->where('order_id', $orderId)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'sender' => $row->sender,
                'sender_name' => $row->sender_name,
                'body' => $row->body,
                'created_at' => $row->created_at,
            ])
            ->all();
    }

    private function insertMessage(object $order, string $sender, string $name, string $body): void
    {
        DB::table('delivery_messages')->insert([
            'id' => (string) Str::uuid7(),
            'tenant_id' => $order->tenant_id,
            'store_id' => $order->store_id,
            'order_id' => $order->id,
            'sender' => $sender,
            'sender_name' => $name,
            'body' => $body,
            'created_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function orderCard(object $order): array
    {
        $address = null;
        if (! empty($order->address_snapshot)) {
            $address = is_string($order->address_snapshot) ? json_decode($order->address_snapshot, true) : (array) $order->address_snapshot;
        }

        return [
            'id' => (string) $order->id,
            'number' => (string) $order->number,
            'customer_name' => (string) ($order->customer_name ?: 'Customer'),
            'customer_phone' => (string) ($order->customer_phone ?: ''),
            'status' => (string) ($order->status ?: 'placed'),
            'fulfillment' => (string) ($order->fulfillment ?: 'delivery'),
            'delivery_status' => (string) ($order->delivery_status ?: 'unassigned'),
            'total_paise' => (int) $order->total_paise,
            'payment_method' => (string) ($order->payment_method ?: 'cod'),
            'payment_status' => (string) ($order->payment_status ?: 'pending'),
            'address' => $address,
            'order_notes' => (string) ($order->order_notes ?: ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(?object $row): array
    {
        return [
            'share_phone' => (bool) ($row->share_phone ?? true),
            'notify_new_order' => (bool) ($row->notify_new_order ?? true),
            'notify_chat' => (bool) ($row->notify_chat ?? true),
            'vehicle' => $row->vehicle ?? '',
            'note' => $row->note ?? '',
        ];
    }

    private function tenantId(Request $request): ?string
    {
        $tenantId = $request->session()->get('tenant_id');
        if (! $tenantId && $request->user()) {
            $tenantId = DB::table('staff_profiles')->where('user_id', $request->user()->id)->value('tenant_id');
        }

        return $tenantId ? (string) $tenantId : null;
    }
}
