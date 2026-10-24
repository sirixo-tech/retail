<?php

namespace App\Modules\Printing\Data;

class BlockTemplate
{
    /**
     * @param array<object> $blocks
     * @param int $paperWidth
     * @param string $locale
     */
    public function __construct(
        public array $blocks = [],
        public int $paperWidth = 80,
        public string $locale = 'en',
    ) {}

    public static function fromArray(array $data): self
    {
        $blocks = $data['blocks'] ?? [];
        $objectBlocks = array_map(fn ($b) => is_array($b) ? (object) $b : $b, $blocks);
        $width = (int) ($data['paper_width_mm'] ?? $data['width_mm'] ?? $data['paperWidth'] ?? 80);
        $locale = (string) ($data['locale'] ?? 'en');

        return new self($objectBlocks, $width, $locale);
    }

    public static function fromJson(string $json): self
    {
        return self::fromArray(json_decode($json, true) ?: []);
    }

    public function toArray(): array
    {
        return [
            'paper_width_mm' => $this->paperWidth,
            'locale' => $this->locale,
            'blocks' => array_map(fn ($b) => is_object($b) ? (array) $b : $b, $this->blocks),
        ];
    }
}
