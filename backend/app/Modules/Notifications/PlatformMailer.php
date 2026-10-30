<?php

namespace App\Modules\Notifications;

use App\Support\PlatformConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PlatformMailer
{
    /**
     * Check if outbound SMTP mailer is properly configured.
     */
    public function isConfigured(): bool
    {
        $mail = PlatformConfig::all()['mail'] ?? [];
        $host = trim((string) ($mail['host'] ?? ''));
        $from = trim((string) ($mail['from_address'] ?? ''));

        return $host !== '' && $from !== '';
    }

    /**
     * Get platform company / operations alert email address.
     */
    public function getCompanyNotificationEmail(): string
    {
        $all = PlatformConfig::all();
        $companyEmail = trim((string) ($all['general']['company_email'] ?? ''));
        if ($companyEmail !== '' && filter_var($companyEmail, FILTER_VALIDATE_EMAIL)) {
            return $companyEmail;
        }
        $supportEmail = trim((string) ($all['general']['support_email'] ?? ''));
        if ($supportEmail !== '' && filter_var($supportEmail, FILTER_VALIDATE_EMAIL)) {
            return $supportEmail;
        }
        $fromAddress = trim((string) ($all['mail']['from_address'] ?? ''));
        if ($fromAddress !== '' && filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            return $fromAddress;
        }

        return 'contact@sirixo.com';
    }

    /**
     * Dynamically apply platform SMTP configuration to Laravel Mail manager.
     */
    public function applyConfig(): bool
    {
        $mail = PlatformConfig::all()['mail'] ?? [];
        $host = trim((string) ($mail['host'] ?? ''));
        $from = trim((string) ($mail['from_address'] ?? ''));

        if ($host === '' || $from === '') {
            return false;
        }

        $encryption = strtolower(trim((string) ($mail['encryption'] ?? 'tls')));
        $scheme = $encryption === 'ssl' ? 'smtps' : null;

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $host,
            'mail.mailers.smtp.port' => (int) ($mail['port'] ?? 587),
            'mail.mailers.smtp.username' => $mail['username'] ?? null,
            'mail.mailers.smtp.password' => $mail['password'] ?? null,
            'mail.mailers.smtp.scheme' => $scheme,
            'mail.from.address' => $from,
            'mail.from.name' => $mail['from_name'] ?? 'SelfX Retail',
        ]);

        return true;
    }

    /**
     * Retrieve all configured email templates.
     *
     * @return list<array<string, mixed>>
     */
    public function templates(): array
    {
        $stored = PlatformConfig::all()['email_templates'] ?? [];
        $billing = app(\App\Modules\Billing\Http\Controllers\BillingController::class);
        $defaults = $billing->defaultPlatformSettings()['email_templates'] ?? [];

        if (! is_array($stored) || empty($stored)) {
            return $defaults;
        }

        $existingKeys = array_column($stored, 'key');
        foreach ($defaults as $dtpl) {
            if (! in_array($dtpl['key'], $existingKeys, true)) {
                $stored[] = $dtpl;
            }
        }

        return $stored;
    }

    /**
     * Find a specific template by key.
     *
     * @return array<string, mixed>|null
     */
    public function findTemplate(string $key): ?array
    {
        foreach ($this->templates() as $tpl) {
            if (is_array($tpl) && ($tpl['key'] ?? '') === $key) {
                return $tpl;
            }
        }

        return null;
    }

    /**
     * Send an email using an active template with variable replacement and HTML envelope.
     *
     * @param  array<string, mixed>  $variables
     * @return array{status: string, detail: string}
     */
    public function sendTemplate(
        string $templateKey,
        string $to,
        array $variables = [],
        ?string $tenantId = null,
        ?string $referenceId = null
    ): array {
        $to = trim($to);
        if ($to === '' || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['status' => 'failed', 'detail' => 'Invalid recipient email address.'];
        }

        $tpl = $this->findTemplate($templateKey);
        if (! $tpl) {
            return ['status' => 'not_found', 'detail' => "Template '{$templateKey}' is not registered."];
        }

        if (isset($tpl['active']) && ! $tpl['active']) {
            $this->logNotification($tenantId, $templateKey, 'disabled', $referenceId, "Template disabled by Super Admin ({$to})");

            return ['status' => 'disabled', 'detail' => "Email template '{$templateKey}' is currently disabled in Super Admin."];
        }

        if (! $this->applyConfig()) {
            $this->logNotification($tenantId, $templateKey, 'not_configured', $referenceId, "SMTP not configured ({$to})");

            return ['status' => 'not_configured', 'detail' => 'Outbound SMTP mailer is not configured by Super Admin.'];
        }

        // Default system variables
        $variables['platform_name'] = $variables['platform_name'] ?? 'SelfX Retail';
        $variables['year'] = $variables['year'] ?? date('Y');
        $variables['recipient_email'] = $to;

        // Perform variable replacement in subject and body
        $subject = $this->interpolate((string) ($tpl['subject'] ?? 'Notification from SelfX'), $variables);
        $bodyText = $this->interpolate((string) ($tpl['body'] ?? ''), $variables);

        // Build responsive HTML email template
        $htmlContent = $this->buildHtmlEnvelope($subject, $bodyText, $variables);

        try {
            Mail::html($htmlContent, function ($message) use ($to, $subject): void {
                $message->to($to)->subject($subject);
            });

            $this->logNotification($tenantId, $templateKey, 'sent', $referenceId, "Delivered to {$to}");

            return ['status' => 'sent', 'detail' => "Email delivered successfully to {$to}."];
        } catch (\Throwable $e) {
            Log::warning('Outbound mail dispatch failed', [
                'template' => $templateKey,
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            $this->logNotification($tenantId, $templateKey, 'failed', $referenceId, mb_substr($e->getMessage(), 0, 240));

            return ['status' => 'failed', 'detail' => 'Mail delivery refused by server: '.$e->getMessage()];
        }
    }

    /**
     * Replace {{variable}} tags in template strings.
     *
     * @param  array<string, mixed>  $variables
     */
    public function interpolate(string $text, array $variables): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/', function ($matches) use ($variables) {
            $key = $matches[1];

            return isset($variables[$key]) ? (string) $variables[$key] : $matches[0];
        }, $text) ?? $text;
    }

    /**
     * Wrap raw text content in a responsive, industry-standard HTML email envelope.
     *
     * @param  array<string, mixed>  $variables
     */
    private function buildHtmlEnvelope(string $subject, string $bodyText, array $variables): string
    {
        $platformName = htmlspecialchars($variables['platform_name'] ?? 'SelfX Retail Cloud', ENT_QUOTES, 'UTF-8');
        $storeRaw = $variables['store_name'] ?? $variables['tenant_name'] ?? $platformName;
        $storeName = htmlspecialchars($storeRaw, ENT_QUOTES, 'UTF-8');
        $storeInitial = strtoupper(mb_substr(strip_tags((string) $storeRaw), 0, 1, 'UTF-8')) ?: 'S';
        $actionUrl = ! empty($variables['action_url']) ? htmlspecialchars((string) $variables['action_url'], ENT_QUOTES, 'UTF-8') : null;
        $actionLabel = ! empty($variables['action_label']) ? htmlspecialchars((string) $variables['action_label'], ENT_QUOTES, 'UTF-8') : 'View Details';

        // Badge Pill Label Determination
        $subjectLower = mb_strtolower($subject, 'UTF-8');
        if (str_contains($subjectLower, 'delivered')) {
            $badgeLabel = 'Order Delivered';
        } elseif (str_contains($subjectLower, 'confirmed') || str_contains($subjectLower, 'placed')) {
            $badgeLabel = 'Order Confirmed';
        } elseif (str_contains($subjectLower, 'dispatched') || str_contains($subjectLower, 'out for delivery') || str_contains($subjectLower, 'ready for pickup')) {
            $badgeLabel = 'Out For Delivery';
        } elseif (str_contains($subjectLower, 'accepted') || str_contains($subjectLower, 'prepared') || str_contains($subjectLower, 'processing')) {
            $badgeLabel = 'Order In Progress';
        } elseif (str_contains($subjectLower, 'cancel') || str_contains($subjectLower, 'refund')) {
            $badgeLabel = 'Order Update';
        } elseif (str_contains($subjectLower, 'invoice')) {
            $badgeLabel = 'Tax Invoice';
        } elseif (str_contains($subjectLower, 'payment') || str_contains($subjectLower, 'revenue')) {
            $badgeLabel = 'Payment Confirmed';
        } elseif (str_contains($subjectLower, 'welcome')) {
            $badgeLabel = 'Welcome';
        } elseif (str_contains($subjectLower, 'security') || str_contains($subjectLower, 'alert') || str_contains($subjectLower, 'notice')) {
            $badgeLabel = 'System Notice';
        } else {
            $badgeLabel = 'Official Notice';
        }

        // Reference ID detection (Order Number, Invoice Number, etc.)
        $referenceId = $variables['order_number'] ?? $variables['invoice_number'] ?? null;
        if (! $referenceId && preg_match('/(#(?:ON|ORD|INV|SFX)-[A-Za-z0-9\-]+)/i', $subject.' '.$bodyText, $mRef)) {
            $referenceId = $mRef[1];
        }
        if ($referenceId) {
            $referenceId = str_starts_with((string) $referenceId, '#') ? (string) $referenceId : '#'.$referenceId;
        }

        // Intelligent parsing of body text
        $rawLines = array_filter(array_map('trim', explode("\n", $bodyText)), fn ($l) => $l !== '');
        $cleanParagraphs = [];
        $keyValueRows = [];
        $signOffs = [];
        $otpCode = null;

        $kvPattern = '/^(Fulfillment|Delivery Address|Shipping Address|Order Number|Total Amount|Total Paid|Payment Method|Loyalty Points|Loyalty Points Earned|Reason|Refund Status|Due Date|Due \/ Expiry Date|Expiry Date|Next Renewal Date|Renewal Date|Invoice Number|Login URL|Username|Selected Plan|Merchant|Owner Name|Owner Contact|Registered At|Next Billing Renewal Date|Store|Amount|Amount Received|Amount Paid|Workspace|Support Admin|Upgrade URL|Cancellation Reason):\s*(.+)$/i';
        $otpPattern = '/^(Verification OTP|Delivery Code|OTP|Pickup OTP):\s*([0-9A-Za-z\s\-]+)$/i';
        $signOffPattern = '/^(Thank you[,.]?$|Warm regards[,.]?$|Sincerely[,.]?$|Best regards[,.]?$|Regards[,.]?$|.+ Team$|Customer Care$|Platform Operations$|Platform Finance$|Platform Security Operations$|.+ Billing$)/i';

        foreach ($rawLines as $line) {
            if (preg_match($otpPattern, $line, $mOtp)) {
                $otpCode = trim($mOtp[2]);
            } elseif (preg_match($kvPattern, $line, $mKv)) {
                $keyValueRows[] = [
                    'key' => trim($mKv[1]),
                    'value' => trim($mKv[2]),
                ];
            } elseif (preg_match($signOffPattern, $line)) {
                $signOffs[] = $line;
            } else {
                $cleanParagraphs[] = $line;
            }
        }

        // Render Paragraphs
        $renderedParagraphs = '';
        foreach ($cleanParagraphs as $idx => $p) {
            $escaped = htmlspecialchars($p, ENT_QUOTES, 'UTF-8');
            if ($idx === 0 && (str_starts_with($p, 'Hello') || str_starts_with($p, 'Dear') || str_starts_with($p, 'Platform'))) {
                $renderedParagraphs .= "<p style=\"margin:0 0 14px 0; font-size:15px; font-weight:700; color:#0f172a; line-height:22px;\">{$escaped}</p>";
            } else {
                $renderedParagraphs .= "<p style=\"margin:0 0 14px 0; font-size:14px; line-height:24px; color:#334155;\">{$escaped}</p>";
            }
        }

        // Render Reference Status Indicator Strip
        $statusStripHtml = '';
        if ($referenceId) {
            $escapedRef = htmlspecialchars($referenceId, ENT_QUOTES, 'UTF-8');
            $statusStripHtml = <<<HTML
            <div style="background-color:#fff7ed; border:1px solid #ffedd5; border-radius:12px; padding:12px 18px; margin-bottom:22px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="font-size:12px; font-weight:700; color:#c2410c;">
                            <span style="display:inline-block; width:8px; height:8px; background-color:#ea580c; border-radius:50%; margin-right:6px; vertical-align:middle;"></span>
                            {$badgeLabel}
                        </td>
                        <td align="right" style="font-size:13px; font-family:'Courier New',Courier,monospace; font-weight:800; color:#ea580c;">
                            {$escapedRef}
                        </td>
                    </tr>
                </table>
            </div>
HTML;
        }

        // Render Key-Value Specifications Card
        $keyValueHtml = '';
        if (! empty($keyValueRows)) {
            $kvCount = count($keyValueRows);
            $rowsHtml = '';
            foreach ($keyValueRows as $i => $row) {
                $k = htmlspecialchars($row['key'], ENT_QUOTES, 'UTF-8');
                $valRaw = $row['value'];
                $isLast = ($i === $kvCount - 1);
                $border = $isLast ? '' : 'border-bottom:1px solid #f1f5f9;';

                // Format amounts or links
                if (preg_match('/(Amount|Paid|Total|Price|Fee)/i', $row['key'])) {
                    $vHtml = '<strong style="color:#ea580c; font-size:14px; font-weight:800;">'.htmlspecialchars($valRaw, ENT_QUOTES, 'UTF-8').'</strong>';
                } elseif (str_starts_with($valRaw, 'http://') || str_starts_with($valRaw, 'https://')) {
                    $vEscaped = htmlspecialchars($valRaw, ENT_QUOTES, 'UTF-8');
                    $vHtml = "<a href=\"{$vEscaped}\" target=\"_blank\" style=\"color:#ea580c; text-decoration:underline; font-weight:600; word-break:break-all;\">{$vEscaped}</a>";
                } else {
                    $vHtml = '<span style="color:#0f172a; font-weight:600;">'.htmlspecialchars($valRaw, ENT_QUOTES, 'UTF-8').'</span>';
                }

                $rowsHtml .= <<<HTML
                <tr>
                    <td style="padding:10px 0; {$border} font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; vertical-align:top; width:38%;">
                        {$k}
                    </td>
                    <td align="right" style="padding:10px 0; {$border} font-size:13px; vertical-align:top;">
                        {$vHtml}
                    </td>
                </tr>
HTML;
            }

            $keyValueHtml = <<<HTML
            <div style="background-color:#fafafa; border:1px solid #f1f5f9; border-radius:14px; padding:6px 20px; margin:22px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    {$rowsHtml}
                </table>
            </div>
HTML;
        }

        // Render Security Verification OTP Card
        $otpHtml = '';
        if ($otpCode) {
            $escapedOtp = htmlspecialchars($otpCode, ENT_QUOTES, 'UTF-8');
            $otpHtml = <<<HTML
            <div style="background-color:#fff7ed; border:1.5px dashed #ea580c; border-radius:14px; padding:20px 24px; text-align:center; margin:24px 0;">
                <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#c2410c; margin-bottom:8px;">
                    Delivery / Collection Verification Code
                </div>
                <div style="font-family:'Courier New',Courier,monospace; font-size:32px; font-weight:900; letter-spacing:8px; color:#ea580c;">
                    {$escapedOtp}
                </div>
                <div style="font-size:11px; color:#9a3412; margin-top:8px;">
                    Share this one-time security code with the partner upon package arrival
                </div>
            </div>
HTML;
        }

        // Render Primary CTA Action Button
        $buttonHtml = '';
        if ($actionUrl) {
            $buttonHtml = <<<HTML
            <div style="margin:28px 0 22px 0; text-align:center;">
                <a href="{$actionUrl}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #f97316 0%, #ea580c 100%); background-color:#ea580c; color:#ffffff !important; font-weight:700; font-size:14px; text-decoration:none; padding:13px 36px; border-radius:12px; box-shadow:0 4px 14px rgba(234,88,12,0.35); letter-spacing:0.3px;">
                    {$actionLabel} &rarr;
                </a>
            </div>
HTML;
        }

        // Render Sign-Offs
        $signOffHtml = '';
        if (! empty($signOffs)) {
            $lines = '';
            foreach ($signOffs as $s) {
                $lines .= '<p style="margin:0 0 4px 0; font-size:13px; color:#64748b; line-height:20px; font-weight:500;">'.htmlspecialchars($s, ENT_QUOTES, 'UTF-8').'</p>';
            }
            $signOffHtml = "<div style=\"margin-top:20px;\">{$lines}</div>";
        }

        // Render Support Box
        $supportHtml = <<<HTML
        <div style="margin-top:26px; background-color:#fffaf5; border:1px solid #ffedd5; border-radius:14px; padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="vertical-align:top; width:28px; padding-top:2px;">
                        <span style="display:inline-block; width:22px; height:22px; background-color:#ffedd5; border-radius:50%; text-align:center; line-height:22px; font-size:12px;">💬</span>
                    </td>
                    <td style="font-size:12px; color:#7c2d12; line-height:19px;">
                        <strong style="color:#431407; font-size:12.5px;">Need help with this order?</strong><br>
                        Track live progress online, download your tax invoice, or reply directly to this email to reach {$storeName} customer support.
                    </td>
                </tr>
            </table>
        </div>
HTML;

        $year = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; padding:36px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px; background-color:#ffffff; border-radius:20px; border:1px solid #fed7aa; overflow:hidden; box-shadow:0 10px 25px -5px rgba(234,88,12,0.08), 0 8px 10px -6px rgba(0,0,0,0.02);">
                    <!-- Header (Enterprise Orange Gradient) -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%); background-color:#ea580c; padding:24px 32px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="width:44px; height:44px; background-color:#ffffff; border-radius:12px; text-align:center; vertical-align:middle; box-shadow:0 4px 6px -1px rgba(0,0,0,0.15);">
                                                    <span style="font-size:22px; font-weight:900; color:#ea580c; line-height:1; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">{$storeInitial}</span>
                                                </td>
                                                <td style="padding-left:14px; vertical-align:middle;">
                                                    <span style="font-size:19px; font-weight:800; letter-spacing:-0.4px; color:#ffffff; display:block; line-height:1.2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                                                        {$storeName}
                                                    </span>
                                                    <span style="display:block; font-size:11px; color:rgba(255,255,255,0.92); margin-top:2px; font-weight:600; letter-spacing:0.2px;">
                                                        Enterprise Retail Platform &bull; {$platformName}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span style="display:inline-block; background-color:rgba(255,255,255,0.22); border:1px solid rgba(255,255,255,0.35); color:#ffffff; font-size:10px; font-weight:800; text-transform:uppercase; padding:5px 12px; border-radius:9999px; letter-spacing:0.8px;">
                                            {$badgeLabel}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding:34px 32px 28px 32px;">
                            <h1 style="margin:0 0 16px 0; font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.4px; line-height:1.35;">
                                {$subject}
                            </h1>
                            {$statusStripHtml}
                            {$renderedParagraphs}
                            {$keyValueHtml}
                            {$otpHtml}
                            {$buttonHtml}
                            {$signOffHtml}
                            {$supportHtml}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc; padding:24px 32px; border-top:1px solid #f1f5f9; text-align:center;">
                            <p style="margin:0 0 6px 0; font-size:11px; line-height:18px; color:#94a3b8;">
                                Sent securely by <strong style="color:#64748b;">{$platformName}</strong> automated notifications on behalf of <strong style="color:#64748b;">{$storeName}</strong>.
                            </p>
                            <p style="margin:0; font-size:11px; line-height:18px; color:#cbd5e1;">
                                &copy; {$year} {$platformName}. Enterprise Retail Cloud Infrastructure.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }

    /**
     * Record entry in notification_logs table.
     */
    private function logNotification(?string $tenantId, string $template, string $status, ?string $referenceId, string $detail): void
    {
        if (! $tenantId) {
            return;
        }

        try {
            DB::table('notification_logs')->insert([
                'id' => (string) Str::uuid7(),
                'tenant_id' => $tenantId,
                'channel' => 'email',
                'template' => $template,
                'status' => $status,
                'reference_id' => $referenceId,
                'detail' => mb_substr($detail, 0, 240),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to write notification_log', ['error' => $e->getMessage()]);
        }
    }
}
