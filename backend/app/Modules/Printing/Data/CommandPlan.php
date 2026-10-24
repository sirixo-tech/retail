<?php

namespace App\Modules\Printing\Data;

class CommandPlan
{
    /**
     * @param string $format 'escpos' | 'html' | 'pdf'
     * @param string $data Base64 encoded payload or raw string
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public string $format,
        public string $data,
        public array $metadata = [],
    ) {}

    public function toArray(): array
    {
        return [
            'format' => $this->format,
            'data' => $this->data,
            'metadata' => $this->metadata,
        ];
    }

    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_UNESCAPED_SLASHES);
    }
}
