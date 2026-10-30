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

        return is_array($stored) ? $stored : [];
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
        $platformName = htmlspecialchars($variables['platform_name'] ?? 'SelfX Retail', ENT_QUOTES, 'UTF-8');
        $storeName = htmlspecialchars($variables['store_name'] ?? $platformName, ENT_QUOTES, 'UTF-8');
        $actionUrl = ! empty($variables['action_url']) ? htmlspecialchars((string) $variables['action_url'], ENT_QUOTES, 'UTF-8') : null;
        $actionLabel = ! empty($variables['action_label']) ? htmlspecialchars((string) $variables['action_label'], ENT_QUOTES, 'UTF-8') : 'View Details';
        $paragraphs = array_filter(explode("\n", $bodyText), fn ($p) => trim($p) !== '');

        $htmlBody = '';
        foreach ($paragraphs as $p) {
            $escaped = htmlspecialchars(trim($p), ENT_QUOTES, 'UTF-8');
            $htmlBody .= "<p style=\"margin:0 0 14px 0; font-size:14px; line-height:22px; color:#334155;\">{$escaped}</p>";
        }

        $buttonHtml = '';
        if ($actionUrl) {
            $buttonHtml = <<<HTML
            <div style="margin:26px 0 18px 0; text-align:center;">
                <a href="{$actionUrl}" target="_blank" style="display:inline-block; background-color:#0f172a; color:#ffffff; font-weight:600; font-size:13px; text-decoration:none; padding:12px 28px; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    {$actionLabel} &rarr;
                </a>
            </div>
HTML;
        }

        $year = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding:32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px; background-color:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#0f172a; padding:24px 32px; border-bottom:1px solid #1e293b;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="font-size:18px; font-weight:800; letter-spacing:-0.5px; color:#ffffff;">
                                            {$storeName}
                                        </span>
                                        <span style="display:block; font-size:11px; color:#94a3b8; margin-top:2px; font-weight:500;">
                                            Enterprise Retail Platform &bull; {$platformName}
                                        </span>
                                    </td>
                                    <td align="right">
                                        <span style="display:inline-block; background-color:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:10px; font-weight:700; text-transform:uppercase; padding:4px 10px; border-radius:9999px; letter-spacing:0.5px;">
                                            Official Notice
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 18px 0; font-size:18px; font-weight:700; color:#0f172a; letter-spacing:-0.3px;">
                                {$subject}
                            </h1>
                            {$htmlBody}
                            {$buttonHtml}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc; padding:20px 32px; border-top:1px solid #f1f5f9; text-align:center;">
                            <p style="margin:0; font-size:11px; line-height:18px; color:#94a3b8;">
                                Sent by {$platformName} automated notifications on behalf of {$storeName}.<br>
                                &copy; {$year} {$platformName}. All rights reserved.
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
