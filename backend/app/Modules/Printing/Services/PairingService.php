<?php

namespace App\Modules\Printing\Services;

use App\Modules\Printing\Models\PairingSession;
use App\Modules\Printing\Models\Printer;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use RuntimeException;

class PairingService
{
    /**
     * Start a new pairing session by generating a 4-digit code valid for 5 minutes.
     */
    public function initiatePairing(string $storeId, string $agentFingerprint): PairingSession
    {
        // Expire older pending sessions for this store/fingerprint
        PairingSession::query()
            ->where('store_id', $storeId)
            ->where('agent_fingerprint', $agentFingerprint)
            ->where('status', 'pending')
            ->update([
                'status' => 'expired',
            ]);

        // Generate cryptographically secure 4-digit code (0000 - 9999)
        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        return PairingSession::create([
            'id' => (string) Str::uuid7(),
            'code' => $code,
            'store_id' => $storeId,
            'agent_fingerprint' => $agentFingerprint,
            'device_token' => null,
            'status' => 'pending',
            'expires_at' => now()->addMinutes(5),
            'created_at' => now(),
        ]);
    }

    /**
     * Validate the 4-digit code entered by staff/POS and issue a device_token.
     * Enforces rate limiting of 5 attempts per IP per hour.
     *
     * @return array{success: bool, device_token: string, session_id: string}
     */
    public function submitPairingCode(string $code, string $storeId, ?string $clientIp = null, ?string $printerId = null): array
    {
        $ip = $clientIp ?? 'unknown';
        $throttleKey = 'printer_pairing:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw new RuntimeException("Too many pairing attempts. Please retry in {$seconds} seconds.");
        }

        // Clean up expired pending sessions
        PairingSession::query()
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        $session = PairingSession::query()
            ->where('code', trim($code))
            ->where('store_id', $storeId)
            ->where('status', 'pending')
            ->where('expires_at', '>=', now())
            ->first();

        if (!$session) {
            RateLimiter::hit($throttleKey, 3600); // 1 hour decay
            throw new RuntimeException('Invalid or expired 4-digit pairing code.');
        }

        // Generate device token
        $deviceToken = (string) Str::uuid();

        $session->update([
            'status' => 'completed',
            'device_token' => $deviceToken,
            'completed_at' => now(),
        ]);

        RateLimiter::clear($throttleKey);

        // If a specific printer was indicated or exists for this store/fingerprint, link token
        if ($printerId) {
            Printer::query()
                ->where('id', $printerId)
                ->where('store_id', $storeId)
                ->update(['device_token' => $deviceToken, 'status' => 'online', 'last_heartbeat_at' => now()]);
        }

        return [
            'success' => true,
            'device_token' => $deviceToken,
            'session_id' => $session->id,
            'agent_fingerprint' => $session->agent_fingerprint,
        ];
    }

    /**
     * Validate a device_token for agent transport.
     */
    public function validateDeviceToken(string $deviceToken, string $storeId): bool
    {
        $printerExists = Printer::query()
            ->where('store_id', $storeId)
            ->where('device_token', $deviceToken)
            ->exists();

        if ($printerExists) {
            return true;
        }

        return PairingSession::query()
            ->where('store_id', $storeId)
            ->where('device_token', $deviceToken)
            ->where('status', 'completed')
            ->exists();
    }
}
