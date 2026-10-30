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

        $htmlBody = $this->formatBodyHtml($bodyText);

        $buttonHtml = '';
        if ($actionUrl) {
            $buttonHtml = <<<HTML
            <div style="margin:28px 0 20px 0; text-align:center;">
                <a href="{$actionUrl}" target="_blank" style="display:inline-block; background-color:#ea580c; background-image:linear-gradient(135deg, #ea580c 0%, #f97316 100%); color:#ffffff !important; font-weight:700; font-size:14px; text-decoration:none; padding:13px 34px; border-radius:10px; box-shadow:0 4px 14px rgba(234,88,12,0.35); letter-spacing:0.2px;">
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
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding:32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px; background-color:#ffffff; border-radius:16px; border:1px solid #fed7aa; overflow:hidden; box-shadow:0 8px 24px -4px rgba(234,88,12,0.1), 0 4px 8px -2px rgba(0,0,0,0.03);">
                    <!-- Premium Executive Orange Header -->
                    <tr>
                        <td style="background-color:#ea580c; background-image:linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #f97316 100%); padding:26px 32px; border-bottom:3px solid #c2410c;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <span style="font-size:20px; font-weight:800; letter-spacing:-0.5px; color:#ffffff; display:block; line-height:24px;">
                                            {$storeName}
                                        </span>
                                        <span style="display:block; font-size:10px; color:#ffedd5; margin-top:4px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase;">
                                            Enterprise Retail Platform &bull; {$platformName}
                                        </span>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span style="display:inline-block; background-color:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:#ffffff; font-size:10px; font-weight:700; text-transform:uppercase; padding:5px 12px; border-radius:9999px; letter-spacing:0.8px; white-space:nowrap;">
                                            Official Notice
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Body Content -->
                    <tr>
                        <td style="padding:32px 32px 28px 32px;">
                            <h1 style="margin:0 0 16px 0; font-size:19px; font-weight:800; color:#0f172a; letter-spacing:-0.4px; line-height:26px;">
                                {$subject}
                            </h1>
                            <div style="height:3px; width:44px; background-color:#ea580c; border-radius:2px; margin-bottom:22px;"></div>
                            {$htmlBody}
                            {$buttonHtml}
                            <div style="margin-top:24px; padding:12px 16px; background-color:#fffaf5; border:1px solid #fed7aa; border-radius:8px; font-size:12px; color:#7c2d12; line-height:18px; text-align:center;">
                                Questions or updates regarding this notification? Simply reply directly to this email.
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#fafaf9; padding:22px 32px; border-top:1px solid #f1f5f9; text-align:center;">
                            <p style="margin:0 0 6px 0; font-size:11px; font-weight:600; color:#9a3412; letter-spacing:0.3px;">
                                &#128274; Verified Secure Retail Transaction &bull; {$platformName}
                            </p>
                            <p style="margin:0; font-size:11px; line-height:18px; color:#94a3b8;">
                                Sent by {$platformName} automated notifications on behalf of {$storeName}.<br>
                                &copy; {$year} {$storeName}. All rights reserved.
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
     * Format raw multiline text into structured paragraphs, details cards, and sign-offs.
     */
    private function formatBodyHtml(string $bodyText): string
    {
        $rawParagraphs = preg_split("/\n\s*\n/", trim($bodyText));
        $htmlOutput = '';

        foreach ($rawParagraphs as $para) {
            $lines = array_values(array_filter(array_map('trim', explode("\n", $para)), fn ($l) => $l !== ''));
            if (empty($lines)) {
                continue;
            }

            // Check if this block is a sign-off (e.g. "Thank you,\ns-mart Team" or "Warm regards,\n...")
            if (count($lines) <= 3 && preg_match('/^(thank you|warm regards|sincerely|best regards|regards),?$/i', $lines[0])) {
                $closing = htmlspecialchars($lines[0], ENT_QUOTES, 'UTF-8');
                $sender = isset($lines[1]) ? htmlspecialchars(implode(' ', array_slice($lines, 1)), ENT_QUOTES, 'UTF-8') : '';
                $htmlOutput .= "<div style=\"margin:24px 0 6px 0; padding-top:16px; border-top:1px dashed #fed7aa; font-size:14px; color:#64748b; line-height:22px;\">";
                $htmlOutput .= "{$closing}";
                if ($sender !== '') {
                    $htmlOutput .= "<br><strong style=\"color:#0f172a; font-size:14px;\">{$sender}</strong>";
                }
                $htmlOutput .= '</div>';
                continue;
            }

            // Group lines inside this paragraph into Key: Value sequences and standard text sequences
            $groups = [];
            $currentGroup = [];
            $currentIsKv = null;

            foreach ($lines as $line) {
                $isKv = (bool) preg_match('/^([A-Za-z0-9\s#\-_]{2,32}):\s*(.+)$/u', $line);
                if ($currentIsKv === null) {
                    $currentIsKv = $isKv;
                    $currentGroup[] = $line;
                } elseif ($currentIsKv === $isKv) {
                    $currentGroup[] = $line;
                } else {
                    $groups[] = ['is_kv' => $currentIsKv, 'lines' => $currentGroup];
                    $currentIsKv = $isKv;
                    $currentGroup = [$line];
                }
            }
            if (! empty($currentGroup)) {
                $groups[] = ['is_kv' => $currentIsKv, 'lines' => $currentGroup];
            }

            foreach ($groups as $grp) {
                if ($grp['is_kv']) {
                    $htmlOutput .= '<div style="margin:16px 0; background-color:#fffaf5; border:1px solid #fed7aa; border-left:4px solid #ea580c; border-radius:10px; padding:12px 18px;">';
                    $htmlOutput .= '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">';
                    $count = count($grp['lines']);
                    foreach ($grp['lines'] as $idx => $kvLine) {
                        preg_match('/^([A-Za-z0-9\s#\-_]{2,32}):\s*(.+)$/u', $kvLine, $m);
                        $label = htmlspecialchars(trim($m[1]), ENT_QUOTES, 'UTF-8');
                        $valRaw = trim($m[2]);
                        $valEscaped = htmlspecialchars($valRaw, ENT_QUOTES, 'UTF-8');

                        if (stripos($label, 'OTP') !== false) {
                            $valHtml = "<span style=\"display:inline-block; background-color:#ffedd5; border:1px dashed #ea580c; color:#c2410c; font-size:16px; font-weight:800; letter-spacing:2.5px; padding:3px 10px; border-radius:6px; font-family:monospace, monospace;\">{$valEscaped}</span>";
                        } elseif (stripos($label, 'Amount') !== false || stripos($label, 'Total') !== false || stripos($label, 'Paid') !== false) {
                            $valHtml = "<strong style=\"color:#ea580c; font-size:14px; font-weight:700;\">{$valEscaped}</strong>";
                        } else {
                            $valHtml = "<span style=\"color:#0f172a; font-weight:600;\">{$valEscaped}</span>";
                        }

                        $borderStyle = ($idx < $count - 1) ? 'border-bottom:1px solid #ffedd5;' : '';
                        $htmlOutput .= '<tr>';
                        $htmlOutput .= "<td style=\"padding:8px 0; width:36%; color:#9a3412; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; vertical-align:top; {$borderStyle}\">{$label}</td>";
                        $htmlOutput .= "<td style=\"padding:8px 0 8px 14px; vertical-align:top; {$borderStyle}\">{$valHtml}</td>";
                        $htmlOutput .= '</tr>';
                    }
                    $htmlOutput .= '</table></div>';
                } else {
                    $pContent = implode('<br>', array_map(fn ($l) => htmlspecialchars($l, ENT_QUOTES, 'UTF-8'), $grp['lines']));
                    $htmlOutput .= "<p style=\"margin:0 0 14px 0; font-size:14px; line-height:22px; color:#334155;\">{$pContent}</p>";
                }
            }
        }

        return $htmlOutput;
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
