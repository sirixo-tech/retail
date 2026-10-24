<?php

namespace App\Console\Commands;

use App\Modules\Inventory\Models\StoreItem;
use App\Services\ImageUploadService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;

class MigrateImagesToR2 extends Command
{
    protected $signature = 'images:migrate-to-r2';

    protected $description = 'Migrate stored base64 product images to cloud storage (R2/S3)';

    public function handle(ImageUploadService $imageService): int
    {
        $this->info('Starting base64 image migration to cloud storage...');

        $count = 0;
        $failed = 0;

        StoreItem::withoutTenancy()
            ->whereNotNull('image')
            ->where('image', 'like', 'data:image%')
            ->chunk(100, function ($items) use ($imageService, &$count, &$failed) {
                foreach ($items as $item) {
                    try {
                        $parts = explode(',', $item->image);
                        if (count($parts) < 2) {
                            continue;
                        }

                        $decoded = base64_decode($parts[1]);
                        $temp = tmpfile();
                        fwrite($temp, $decoded);
                        $meta = stream_get_meta_data($temp);

                        $file = new UploadedFile($meta['uri'], 'image.jpg', 'image/jpeg', null, true);
                        $urls = $imageService->uploadProductImage($file, $item->id);

                        $item->update([
                            'image_url' => $urls['image_url'],
                            'image' => null,
                        ]);

                        $count++;
                        $this->line("Migrated: {$item->sku}");
                    } catch (\Throwable $e) {
                        $failed++;
                        $this->error("Failed to migrate {$item->sku}: {$e->getMessage()}");
                    }
                }
            });

        $this->info("Migration completed. Successfully migrated: {$count}, Failed: {$failed}.");

        return self::SUCCESS;
    }
}
