<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageUploadService
{
    private ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver());
    }

    /**
     * Upload and optimize product image and thumbnail.
     *
     * @return array{image_url: string, thumbnail_url: string}
     */
    public function uploadProductImage(UploadedFile|string $file, string $productId): array
    {
        $diskName = $this->resolveDisk();
        $disk = Storage::disk($diskName);

        $sourcePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        // Process main image
        $image = $this->manager->read($sourcePath);
        $image->scaleDown(width: 800);
        $imageEncoded = (string) $image->toWebp(85);

        $uuid = (string) Str::uuid7();
        $filename = "products/{$productId}/{$uuid}.webp";
        $disk->put($filename, $imageEncoded, 'public');

        // Process thumbnail
        $thumb = $this->manager->read($sourcePath);
        $thumb->scaleDown(width: 200);
        $thumbEncoded = (string) $thumb->toWebp(80);

        $thumbFilename = "products/{$productId}/thumb_{$uuid}.webp";
        $disk->put($thumbFilename, $thumbEncoded, 'public');

        return [
            'image_url' => $disk->url($filename),
            'thumbnail_url' => $disk->url($thumbFilename),
        ];
    }

    private function resolveDisk(): string
    {
        if (config('filesystems.disks.r2.key') && config('filesystems.disks.r2.endpoint')) {
            return 'r2';
        }

        return 'public';
    }
}
