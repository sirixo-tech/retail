<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowStockAlert extends Notification
{
    use Queueable;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(public array $data)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'low_stock',
            'item_count' => $this->data['item_count'] ?? 0,
            'items' => $this->data['items'] ?? [],
            'title' => 'Low Stock Warning',
            'message' => ($this->data['item_count'] ?? 0) . ' item(s) are running below their reorder points.',
        ];
    }
}
