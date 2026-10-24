# 🚀 SelfX Retail Production Enhancement - Complete Implementation Plan

**Version:** 1.0  
**Date:** October 2024  
**Target Completion:** 11 weeks (2.5-3 months)  
**Team Size:** 2 Senior Full-Stack Engineers

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Phase 1: Global Catalog Enhancement](#phase-1-global-catalog-enhancement)
4. [Phase 2: Compliance & Legal (India GST)](#phase-2-compliance--legal-india-gst)
5. [Phase 3: Advanced Inventory Management](#phase-3-advanced-inventory-management)
6. [Phase 4: Advanced Reporting](#phase-4-advanced-reporting)
7. [Phase 5: Production Hardening](#phase-5-production-hardening)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Success Metrics](#success-metrics)

---

## EXECUTIVE SUMMARY

### Current State
- **Core System:** 82% production-ready
- **Security:** ✅ Tenant isolation fully implemented and tested
- **Global Catalog:** 68% complete (schema excellent, UX needs enhancement)
- **Compliance:** ❌ Missing E-Invoice and GSTR reports (critical for India)
- **Inventory:** ⚠️ Basic features working, advanced features missing
- **Reporting:** 40% (basic reports only)
- **DevOps:** 55% (manual processes, limited monitoring)

### Target State
- **Overall System:** 95% production-ready
- **Global Catalog:** 95% (tenant-friendly, auto-sync, CDN)
- **Compliance:** 100% (E-Invoice, GSTR-1, GSTR-3B)
- **Inventory:** 90% (batch tracking, alerts, analytics)
- **Reporting:** 95% (P&L, cash flow, inventory analytics)
- **DevOps:** 90% (automated backups, monitoring, health checks)

### What's NOT Changing
✅ All working features remain untouched:
- Tenant isolation security
- POS core functionality
- Basic inventory management
- Multi-store operations
- Payment processing
- Customer management
- Loyalty programs
- Storefront (online sales)

### Implementation Approach
- **Iterative:** Build and deploy phase-by-phase
- **Non-breaking:** Zero downtime deployments
- **Tested:** Every feature fully tested before merge
- **Documented:** Code comments, API docs, runbooks

---

## PROJECT OVERVIEW

### Technology Stack
- **Backend:** Laravel 11.x (PHP 8.3), PostgreSQL 16
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Infrastructure:** Docker, Redis, Typesense
- **Storage:** Cloudflare R2 (or AWS S3)
- **Queue:** Laravel Horizon (Redis)
- **Search:** Typesense (full-text search)

### Directory Structure
```
/Users/surya/Desktop/retail/
├── backend/
│   ├── app/
│   │   ├── Console/Commands/
│   │   ├── Jobs/
│   │   ├── Modules/
│   │   │   ├── Catalog/
│   │   │   ├── Inventory/
│   │   │   ├── Pos/
│   │   │   └── ...
│   │   ├── Notifications/
│   │   ├── Observers/
│   │   └── Services/
│   ├── database/migrations/
│   └── tests/Feature/
├── frontend/
│   └── src/
│       ├── app/
│       └── components/
└── docs/
```

### Database Schema Additions
**New Tables:**
- `catalog_subscriptions` (product sync preferences)
- `e_invoices` (GST invoice records)
- `stock_alerts` (low stock notifications)
- `stock_batches` (batch/lot tracking)
- `sale_line_batches` (batch consumption tracking)

**Modified Tables:**
- `catalog.products`: Add `image_url`, `thumbnail_url`
- `store_items`: Add `image_url`, `enable_batch_tracking`
- `customers`: Add `gstin` (if not exists)
- `tenants`: Add `settings` JSONB (if not exists)

---

## PHASE 1: GLOBAL CATALOG ENHANCEMENT

**Duration:** 3 weeks | **Priority:** 🔴 Critical

### Overview
Make the global catalog tenant-friendly with advanced search, automatic product updates, and professional image management.

### Sprint 1.1: Tenant Catalog Browser UI (1 week)

#### Backend Tasks

**1.1.1 Enhance Catalog API** (`app/Modules/Catalog/Http/Controllers/CatalogController.php`)
- Modify `index()` method to support:
  - Pagination: `?page=1&per_page=50`
  - Search: `?q=milk` (searches name and description)
  - Filters: `?category_id=uuid&brand_id=uuid`
  - Price range: `?min_price_paise=1000&max_price_paise=100000`
  - Sorting: `?sort=name:asc`, `sort=price:desc`
- Response format:
  ```json
  {
    "data": [...products],
    "meta": {
      "current_page": 1,
      "per_page": 50,
      "total": 1234,
      "last_page": 25
    }
  }
  ```

**1.1.2 Add Database Indexes**
Create migration: `add_catalog_search_indexes.php`
```sql
CREATE INDEX idx_products_name_search ON catalog.products 
  USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_status_category ON catalog.products(status, category_id);
CREATE INDEX idx_products_brand ON catalog.products(brand_id);
CREATE INDEX idx_identifiers_normalized ON catalog.identifiers(value_normalised);
```

**1.1.3 Bulk Add Endpoint**
- Add `POST /api/v1/stores/{store}/items/bulk-from-catalog`
- Accept: `{ "master_product_ids": ["uuid1", "uuid2"], "margin_bps": 1500 }`
- Use existing `AddStoreItems::fromCatalog()` logic
- Return summary: `{ "added": 23, "skipped": [{ "id": "uuid", "reason": "..." }] }`

#### Frontend Tasks

**1.1.4 Create GlobalCatalogBrowser Component**
File: `frontend/src/components/catalog/GlobalCatalogBrowser.tsx`

Features:
- Search bar with debounced input (300ms delay)
- Filter sidebar:
  - Category dropdown (populated from API)
  - Brand dropdown (populated from API)
  - Price range slider (₹0 - ₹10,000)
- Product grid layout:
  - Grid: 1 col mobile, 2 col tablet, 4 col desktop
  - Product cards with checkbox for selection
  - Show: thumbnail, name, MRP, barcode, category badge
- Fixed bottom bar:
  - Selected count: "23 products selected"
  - "Add to Store" button
- Pagination controls
- Loading skeleton states
- Empty state: "No products found"

**1.1.5 Create ProductCard Component**
File: `frontend/src/components/catalog/ProductCard.tsx`

Features:
- Product image with fallback placeholder
- Name (max 2 lines, ellipsis)
- MRP display (formatted as ₹500.00)
- Primary barcode chip
- Category badge
- Checkbox overlay (top-right)
- Hover effect with description tooltip
- "Already Added" badge if in store

**1.1.6 Create Page Route**
File: `frontend/src/app/(dashboard)/catalog/browse/page.tsx`
- Server component for initial data
- Client component for filters/search
- Handle bulk add with confirmation modal
- Success/error toasts

**1.1.7 Add Navigation Link**
Update sidebar navigation:
- Label: "Browse Global Catalog"
- Icon: Shopping cart with plus
- Route: `/catalog/browse`

#### Testing Requirements
- Load 10,000 products → Search response < 300ms
- Select 50 products → Bulk add succeeds
- Empty catalog → Shows empty state
- Filters work in combination
- Pagination accurate
- Mobile responsive

#### Acceptance Criteria
✅ Tenant can browse global catalog with search and filters  
✅ Bulk selection and add works smoothly  
✅ Products already in store show "Already Added" badge  
✅ UI is responsive on mobile/tablet/desktop  
✅ Loading states provide good UX

---

### Sprint 1.2: Product Update Propagation (1 week)

#### Backend Tasks

**1.2.1 Create Catalog Subscriptions Table**
Migration: `create_catalog_subscriptions_table.php`
```sql
CREATE TABLE catalog_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    master_product_id UUID NOT NULL,
    store_item_id UUID NOT NULL,
    auto_update_price BOOLEAN DEFAULT false,
    auto_update_name BOOLEAN DEFAULT true,
    auto_update_description BOOLEAN DEFAULT true,
    auto_update_tax BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_item_id, master_product_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (master_product_id) REFERENCES catalog.products(id) ON DELETE CASCADE,
    FOREIGN KEY (store_item_id) REFERENCES store_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_catalog_subs_product ON catalog_subscriptions(master_product_id);
CREATE INDEX idx_catalog_subs_tenant ON catalog_subscriptions(tenant_id);
```

**1.2.2 Create Sync Job**
File: `app/Jobs/SyncStoreItemFromMasterJob.php`

Logic:
```php
public function __construct(
    private string $masterProductId,
    private array $changedFields
) {}

public function handle()
{
    $subscriptions = DB::table('catalog_subscriptions')
        ->where('master_product_id', $this->masterProductId)
        ->get();
    
    foreach ($subscriptions as $sub) {
        Tenant::acting($sub->tenant_id, function() use ($sub) {
            $item = StoreItem::find($sub->store_item_id);
            $master = Product::find($sub->master_product_id);
            
            // Update name (only if not customized)
            if ($sub->auto_update_name && in_array('name', $this->changedFields)) {
                if (empty($item->name_override)) {
                    $item->name_override = $master->name;
                }
            }
            
            // Update price (create new price entry)
            if ($sub->auto_update_price && in_array('reference_mrp_paise', $this->changedFields)) {
                $this->updatePrice($item, $master);
            }
            
            // Update tax rate
            if ($sub->auto_update_tax && in_array('tax_class_id', $this->changedFields)) {
                $taxClass = TaxClass::find($master->tax_class_id);
                $item->gst_bps = $taxClass->gst_bps ?? $item->gst_bps;
            }
            
            $item->save();
            
            // Update sync timestamp
            DB::table('catalog_subscriptions')
                ->where('id', $sub->id)
                ->update(['last_synced_at' => now()]);
        });
    }
}
```

**1.2.3 Create Product Observer**
File: `app/Modules/Catalog/Observers/ProductObserver.php`

```php
public function updated(Product $product)
{
    if ($product->status !== 'published') {
        return; // Only sync published products
    }
    
    $changedFields = array_keys($product->getDirty());
    $syncableFields = ['name', 'reference_mrp_paise', 'tax_class_id', 'description'];
    $needsSync = array_intersect($changedFields, $syncableFields);
    
    if (!empty($needsSync)) {
        dispatch(new SyncStoreItemFromMasterJob($product->id, $needsSync));
    }
}
```

**1.2.4 Register Observer**
In `app/Providers/AppServiceProvider.php`:
```php
use App\Modules\Catalog\Observers\ProductObserver;

public function boot()
{
    Product::observe(ProductObserver::class);
}
```

**1.2.5 Modify AddStoreItems**
Update `AddStoreItems::fromCatalog()` to create subscription:
```php
// After creating store_item
DB::table('catalog_subscriptions')->insert([
    'id' => Str::uuid7(),
    'tenant_id' => $store->tenant_id,
    'master_product_id' => $master->id,
    'store_item_id' => $item->id,
    'auto_update_name' => true,
    'auto_update_price' => false, // Tenant controls pricing
    'auto_update_tax' => true,
    'subscribed_at' => now(),
]);
```

**1.2.6 Add Subscription API**
Routes:
- `GET /api/v1/catalog/own/products/{item}/subscription`
- `POST /api/v1/catalog/own/products/{item}/subscription`

#### Frontend Tasks

**1.2.7 Product Settings Modal**
Component: `ProductSyncSettingsModal.tsx`

Features:
- Toggle: "Auto-update prices from global catalog"
- Toggle: "Auto-update product names"
- Toggle: "Auto-update tax rates"
- Info: Last synced timestamp
- Banner: "This product is linked to global catalog"

#### Testing Requirements
- Super admin updates MRP → 100 tenants sync within 5 minutes
- Tenant with auto_update_price=false → Price NOT updated
- Tenant with custom name → Name NOT overridden
- Verify queue processes jobs

#### Acceptance Criteria
✅ Products automatically sync when global catalog updates  
✅ Tenants can control sync preferences per product  
✅ Custom names/prices are preserved if tenant configured  
✅ Sync happens asynchronously via queue  
✅ Last sync timestamp visible to tenants

---

### Sprint 1.3: Media Management with CDN (1 week)

#### Backend Tasks

**1.3.1 Add Image Columns**
Migration: `add_catalog_images.php`
```sql
ALTER TABLE catalog.products 
    ADD COLUMN image_url VARCHAR(500),
    ADD COLUMN thumbnail_url VARCHAR(500),
    ADD COLUMN image_source VARCHAR(100);

ALTER TABLE store_items
    ADD COLUMN image_url VARCHAR(500);
```

**1.3.2 Configure R2 Storage**
Add to `config/filesystems.php`:
```php
'r2' => [
    'driver' => 's3',
    'key' => env('R2_ACCESS_KEY_ID'),
    'secret' => env('R2_SECRET_ACCESS_KEY'),
    'region' => 'auto',
    'bucket' => env('R2_BUCKET'),
    'endpoint' => env('R2_ENDPOINT'),
    'url' => env('R2_PUBLIC_URL'),
    'visibility' => 'public',
],
```

**1.3.3 Install Intervention Image**
```bash
composer require intervention/image
```

**1.3.4 Create Image Upload Service**
File: `app/Services/ImageUploadService.php`

```php
public function uploadProductImage(UploadedFile $file, string $productId): array
{
    // Optimize main image
    $image = Image::read($file->path())
        ->scale(width: 800)
        ->toWebp(85);
    
    $filename = "products/{$productId}/" . Str::uuid7() . ".webp";
    Storage::disk('r2')->put($filename, $image);
    
    // Create thumbnail
    $thumb = Image::read($file->path())
        ->scale(width: 200)
        ->toWebp(80);
    
    $thumbFilename = "products/{$productId}/thumb_" . Str::uuid7() . ".webp";
    Storage::disk('r2')->put($thumbFilename, $thumb);
    
    return [
        'image_url' => Storage::disk('r2')->url($filename),
        'thumbnail_url' => Storage::disk('r2')->url($thumbFilename),
    ];
}
```

**1.3.5 Update Catalog Controller**
Modify `CatalogController::store()`:
```php
$data = $request->validate([
    'name' => ['required', 'string', 'max:180'],
    'gtin' => ['required', 'string', 'max:80'],
    'image' => ['nullable', 'image', 'max:5120'], // 5MB
    // ...
]);

if ($request->hasFile('image')) {
    $urls = $this->imageService->uploadProductImage(
        $request->file('image'),
        $productId
    );
    $data['image_url'] = $urls['image_url'];
    $data['thumbnail_url'] = $urls['thumbnail_url'];
}
```

**1.3.6 Create Migration Command**
File: `app/Console/Commands/MigrateImagesToR2.php`

```php
public function handle()
{
    // Migrate base64 images to R2
    StoreItem::whereNotNull('image')
        ->where('image', 'like', 'data:image%')
        ->chunk(100, function($items) {
            foreach ($items as $item) {
                try {
                    $decoded = base64_decode(explode(',', $item->image)[1]);
                    $temp = tmpfile();
                    fwrite($temp, $decoded);
                    $meta = stream_get_meta_data($temp);
                    
                    $file = new UploadedFile($meta['uri'], 'image.jpg');
                    $urls = $this->imageService->uploadProductImage($file, $item->id);
                    
                    $item->update([
                        'image_url' => $urls['image_url'],
                        'image' => null, // Clear base64
                    ]);
                    
                    $this->info("Migrated: {$item->sku}");
                } catch (\Exception $e) {
                    $this->error("Failed: {$item->sku} - {$e->getMessage()}");
                }
            }
        });
}
```

#### Frontend Tasks

**1.3.7 Update Product Forms**
- Replace base64 input with file upload
- Add image preview
- Support drag-and-drop
- Show thumbnail in product cards

#### Testing Requirements
- Upload 1000 images → All in R2 with correct paths
- Image optimization: 2MB → < 100KB WebP
- CDN response time < 100ms
- Migration script processes 100 base64 images

#### Acceptance Criteria
✅ Images stored in cloud storage (R2/S3)  
✅ Automatic WebP conversion and optimization  
✅ Thumbnails generated automatically  
✅ CDN delivers images fast (< 100ms)  
✅ Migration script converts old base64 images

---

## PHASE 2: COMPLIANCE & LEGAL (INDIA GST)

**Duration:** 2 weeks | **Priority:** 🔴 Critical (India only)

### Overview
Implement mandatory GST compliance: E-Invoice generation and GSTR report generation for Indian tax filing.

### Sprint 2.1: E-Invoice Integration (1.5 weeks)

#### Backend Tasks

**2.1.1 Create E-Invoices Table**
Migration: `create_e_invoices_table.php`
```sql
CREATE TABLE e_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sale_id UUID NOT NULL UNIQUE,
    irn VARCHAR(64) UNIQUE NOT NULL,
    ack_no VARCHAR(20),
    ack_date TIMESTAMP,
    signed_invoice TEXT,
    signed_qr_code TEXT,
    status VARCHAR(20) DEFAULT 'generated',
    cancellation_date TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE INDEX idx_e_invoices_tenant ON e_invoices(tenant_id);
CREATE INDEX idx_e_invoices_irn ON e_invoices(irn);
```

**2.1.2 Add GSTIN to Customers**
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
CREATE INDEX idx_customers_gstin ON customers(gstin) WHERE gstin IS NOT NULL;
```

**2.1.3 Configure GST Portal**
Add to `config/services.php`:
```php
'gst_portal' => [
    'sandbox_url' => 'https://gsp.adaequare.com/test/enriched',
    'production_url' => 'https://gsp.adaequare.com/enriched',
    'client_id' => env('GST_CLIENT_ID'),
    'client_secret' => env('GST_CLIENT_SECRET'),
    'gstin' => env('GSTIN'),
    'username' => env('GST_USERNAME'),
    'password' => env('GST_PASSWORD'),
    'environment' => env('GST_ENVIRONMENT', 'sandbox'),
],
```

**2.1.4 Create E-Invoice Service**
File: `app/Services/EInvoiceService.php`

Methods:
- `generateEInvoice(Sale $sale): array`
- `buildInvoicePayload(Sale $sale): array`
- `authenticate(): string`
- `cancelEInvoice(string $irn, string $reason): array`

Logic:
```php
public function generateEInvoice(Sale $sale): array
{
    // Check if required
    if (!$this->requiresEInvoice($sale)) {
        return ['status' => 'not_required'];
    }
    
    // Authenticate
    $token = Cache::remember('gst_token', 3600 * 6, fn() => $this->authenticate());
    
    // Build payload
    $payload = $this->buildInvoicePayload($sale);
    
    // POST to GST portal
    $response = Http::withToken($token)
        ->timeout(30)
        ->retry(3, 2000)
        ->post(config('services.gst_portal.production_url') . '/ei/api/invoice', $payload);
    
    if ($response->successful()) {
        $data = $response->json();
        
        // Store IRN
        DB::table('e_invoices')->insert([
            'id' => Str::uuid7(),
            'tenant_id' => $sale->tenant_id,
            'sale_id' => $sale->id,
            'irn' => $data['Irn'],
            'ack_no' => $data['AckNo'],
            'ack_date' => $data['AckDt'],
            'signed_qr_code' => $data['SignedQRCode'],
            'status' => 'generated',
            'created_at' => now(),
        ]);
        
        return ['status' => 'success', 'irn' => $data['Irn']];
    }
    
    throw new EInvoiceException($response->body());
}

private function requiresEInvoice(Sale $sale): bool
{
    return $sale->total_paise >= 50000 
        && $sale->customer_id !== null
        && $sale->customer->gstin !== null;
}
```

**2.1.5 Create Background Job**
File: `app/Jobs/GenerateEInvoiceJob.php`

```php
public function __construct(private string $saleId) {}

public function handle()
{
    $sale = Sale::find($this->saleId);
    
    try {
        $result = app(EInvoiceService::class)->generateEInvoice($sale);
        Log::info('E-Invoice generated', ['sale_id' => $sale->id, 'irn' => $result['irn']]);
    } catch (\Exception $e) {
        Log::error('E-Invoice failed', ['sale_id' => $sale->id, 'error' => $e->getMessage()]);
        
        DB::table('e_invoices')->updateOrInsert(
            ['sale_id' => $sale->id],
            ['error_message' => $e->getMessage(), 'status' => 'failed']
        );
        
        throw $e; // Retry
    }
}

public $tries = 3;
public $backoff = [60, 300, 900];
```

**2.1.6 Integrate with POS**
Modify `CompleteCashSale::handle()`:
```php
// After creating sale
if ($this->requiresEInvoice($sale)) {
    dispatch(new GenerateEInvoiceJob($sale->id));
}
```

**2.1.7 Add API Endpoints**
Routes:
- `GET /api/v1/stores/{store}/sales/{sale}/e-invoice`
- `POST /api/v1/stores/{store}/sales/{sale}/e-invoice/regenerate`
- `POST /api/v1/stores/{store}/sales/{sale}/e-invoice/cancel`

#### Frontend Tasks

**2.1.8 Sale Detail Page Updates**
- Show IRN number prominently
- Display QR code from `signed_qr_code`
- Show status badges: Pending / Generated / Failed
- "Regenerate E-Invoice" button if failed
- "Cancel E-Invoice" button (within 24h only)

**2.1.9 Print Receipt Template**
- Include QR code (large, scannable)
- Display IRN and Ack No
- Include acknowledgment date
- GST-compliant format

#### Testing Requirements
- Generate 10 test invoices in GST sandbox
- Verify IRN format (64 characters)
- Test QR code scanning
- Test cancellation within 24 hours
- Test error handling (invalid GSTIN, network failure)

#### Acceptance Criteria
✅ E-Invoice auto-generates for B2B sales > ₹500  
✅ IRN and QR code stored in database  
✅ Receipt prints with QR code  
✅ Failed invoices can be regenerated  
✅ Cancellation works within 24 hours

---

### Sprint 2.2: GSTR-1 Report Generation (0.5 weeks)

#### Backend Tasks

**2.2.1 Create GSTR Report Service**
File: `app/Services/GSTRReportService.php`

Methods:
- `generateGSTR1(string $tenantId, string $month): array`
- `getB2BInvoices(Carbon $start, Carbon $end): array`
- `getB2CLargeInvoices($start, $end): array`
- `getB2CSmallSummary($start, $end): array`
- `getHSNSummary($start, $end): array`

Logic:
```php
public function generateGSTR1(string $tenantId, string $month): array
{
    return Tenant::acting($tenantId, function() use ($month) {
        $start = Carbon::parse($month)->startOfMonth();
        $end = Carbon::parse($month)->endOfMonth();
        
        return [
            'gstin' => $this->getGSTIN($tenantId),
            'fp' => $month,
            'b2b' => $this->getB2BInvoices($start, $end),
            'b2cl' => $this->getB2CLargeInvoices($start, $end),
            'b2cs' => $this->getB2CSmallSummary($start, $end),
            'hsn' => $this->getHSNSummary($start, $end),
        ];
    });
}
```

**2.2.2 Create Controller**
File: `app/Http/Controllers/GSTRReportController.php`

Routes:
- `GET /api/v1/reports/gstr1/{month}` - Download JSON
- `GET /api/v1/reports/gstr1/{month}/preview` - View summary

#### Frontend Tasks

**2.2.3 Create GSTR Report Page**
File: `frontend/src/app/(dashboard)/reports/gstr/page.tsx`

Features:
- Month picker (last 12 months)
- "Generate Preview" button
- Summary cards: B2B count/value, B2C summary, HSN count
- Tables: B2B invoices, B2C summary, HSN summary
- "Download GSTR-1 JSON" button

#### Testing Requirements
- Generate GSTR-1 for test month with 100+ sales
- Verify JSON structure matches GST portal format
- Test upload to GST sandbox (if possible)
- Verify calculations (tax amounts, totals)

#### Acceptance Criteria
✅ GSTR-1 JSON generated monthly  
✅ JSON format matches GST portal schema  
✅ All sales categorized correctly (B2B/B2C)  
✅ HSN summary accurate  
✅ Downloadable for portal upload

---

## PHASE 3: ADVANCED INVENTORY MANAGEMENT

**Duration:** 2 weeks | **Priority:** 🟡 High

### Overview
Production-grade inventory features: automated alerts and batch/lot tracking for FMCG/pharmacy compliance.

### Sprint 3.1: Automated Stock Alerts (1 week)

#### Backend Tasks

**3.1.1 Create Stock Alerts Table**
Migration: `create_stock_alerts_table.php`
```sql
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_id UUID,
    alert_type VARCHAR(50),
    item_count INT,
    items JSONB,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by UUID NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_stock_alerts_tenant ON stock_alerts(tenant_id, created_at DESC);
```

**3.1.2 Create Check Low Stock Job**
File: `app/Jobs/CheckLowStockJob.php`

```php
public function handle()
{
    Tenant::eachTenant(function(Tenant $tenant) {
        $lowStock = DB::table('store_items')
            ->join('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
            ->where('store_items.tenant_id', $tenant->id)
            ->where('store_items.track_stock', true)
            ->whereNotNull('store_items.reorder_point')
            ->whereRaw('stock_balances.qty <= store_items.reorder_point')
            ->get();
        
        if ($lowStock->isNotEmpty()) {
            $this->createAlert($tenant, $lowStock);
            $this->notifyOwners($tenant, $lowStock);
        }
    });
}
```

**3.1.3 Create Notification**
File: `app/Notifications/LowStockAlert.php`

Channels: `mail`, `database`

Email template:
```
Subject: Low Stock Alert - {count} items need reordering

Hi {name},

The following items are running low in {store}:

- {sku}: {name} ({current_qty} left, reorder at {reorder_point})

View Details: {link}
```

**3.1.4 Schedule Job**
In `app/Console/Kernel.php`:
```php
$schedule->job(new CheckLowStockJob())
    ->dailyAt('08:00')
    ->onOneServer();

$schedule->job(new CheckCriticalStockJob())
    ->everyFourHours()
    ->onOneServer();
```

**3.1.5 Add API Endpoints**
Routes:
- `GET /api/v1/inventory/alerts`
- `POST /api/v1/inventory/alerts/{alert}/acknowledge`
- `POST /api/v1/inventory/alerts/{alert}/generate-po`

#### Frontend Tasks

**3.1.6 Dashboard Widget**
Component: `LowStockWidget.tsx`
- Card showing count of low stock items
- Red badge if items > 0
- Click to view details

**3.1.7 Alerts Page**
File: `frontend/src/app/(dashboard)/inventory/alerts/page.tsx`
- List of alerts with filters
- Item details expandable
- Acknowledge button
- Generate PO button

#### Testing Requirements
- Set reorder_point=10, qty=5 → Alert generated
- Email sent to owner
- 100 items low → Alert shows all 100
- Acknowledge functionality works

#### Acceptance Criteria
✅ Daily job checks all tenants' stock  
✅ Alerts generated for low stock items  
✅ Email notifications sent to owners  
✅ Dashboard shows alert count  
✅ Tenants can acknowledge alerts

---

### Sprint 3.2: Batch/Lot Tracking (1 week)

#### Backend Tasks

**3.2.1 Create Stock Batches Tables**
Migration: `create_stock_batches_table.php`
```sql
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_item_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    supplier_id UUID,
    purchase_id UUID,
    qty_purchased DECIMAL(14,3) NOT NULL,
    qty_remaining DECIMAL(14,3) NOT NULL,
    cost_paise BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_item_id, batch_number)
);

CREATE INDEX idx_batches_expiry ON stock_batches(expiry_date) WHERE status = 'active';

CREATE TABLE sale_line_batches (
    id UUID PRIMARY KEY,
    sale_line_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    qty DECIMAL(14,3) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**3.2.2 Add Batch Tracking Flag**
```sql
ALTER TABLE store_items 
    ADD COLUMN IF NOT EXISTS enable_batch_tracking BOOLEAN DEFAULT false;
```

**3.2.3 Create Batch Management Service**
File: `app/Services/BatchManagementService.php`

Methods:
- `allocateBatch(StoreItem $item, float $qty, string $method = 'FEFO'): array`
- `createBatch(StoreItem $item, array $data): string`
- `checkNearExpiry(string $tenantId, int $days = 30): Collection`
- `markExpired(): int`

FEFO allocation logic:
```php
public function allocateBatch(StoreItem $item, float $qty, string $method = 'FEFO'): array
{
    $batches = DB::table('stock_batches')
        ->where('store_item_id', $item->id)
        ->where('status', 'active')
        ->where('qty_remaining', '>', 0)
        ->when($method === 'FEFO', fn($q) => 
            $q->orderBy('expiry_date', 'asc')
        )
        ->get();
    
    $allocated = [];
    $remaining = $qty;
    
    foreach ($batches as $batch) {
        if ($remaining <= 0) break;
        
        $allocate = min($batch->qty_remaining, $remaining);
        $allocated[] = [
            'batch_id' => $batch->id,
            'qty' => $allocate,
            'expiry_date' => $batch->expiry_date,
        ];
        
        $remaining -= $allocate;
    }
    
    if ($remaining > 0) {
        throw new InsufficientStockException();
    }
    
    return $allocated;
}
```

**3.2.4 Integrate with POS**
Modify `CompleteCashSale::handle()`:
```php
foreach ($lines as $line) {
    $item = StoreItem::find($line['store_item_id']);
    
    if ($item->enable_batch_tracking) {
        $batches = $this->batchService->allocateBatch($item, $line['qty'], 'FEFO');
        
        foreach ($batches as $batch) {
            // Record consumption
            DB::table('sale_line_batches')->insert([...]);
            
            // Deduct from batch
            DB::table('stock_batches')
                ->where('id', $batch['batch_id'])
                ->decrement('qty_remaining', $batch['qty']);
        }
    }
}
```

**3.2.5 Create Expiry Check Job**
File: `app/Jobs/CheckExpiringStockJob.php`

Schedule: Daily at 9 AM

**3.2.6 Add API Endpoints**
Routes:
- `POST /api/v1/inventory/items/{item}/batches`
- `GET /api/v1/inventory/items/{item}/batches`
- `GET /api/v1/inventory/batches/expiring`
- `POST /api/v1/inventory/batches/{batch}/mark-expired`

#### Frontend Tasks

**3.2.7 Batch List Page**
File: `frontend/src/app/(dashboard)/inventory/batches/page.tsx`
- Table: SKU, Name, Batch #, Mfg Date, Expiry, Qty, Status
- Filters: Active / Expiring Soon / Expired
- Color coding by expiry (red < 7 days, yellow < 30 days)

**3.2.8 Add Batch Modal**
- Form for manual batch creation
- Fields: Batch number, Mfg date, Expiry date, Qty
- Validation: Expiry > Mfg date

#### Testing Requirements
- Buy 100 units batch A (expires Dec), 50 units batch B (expires Nov)
- Sell 30 → Should deplete batch B first (FEFO)
- Verify sale_line_batches records
- Batch expires → Status = 'expired'
- Alert 30 days before expiry

#### Acceptance Criteria
✅ Batch tracking optional per product  
✅ FIFO/FEFO allocation working  
✅ Expiry date monitoring  
✅ Alerts for near-expiry items  
✅ Batch consumption tracked in sales

---

## PHASE 4: ADVANCED REPORTING

**Duration:** 2 weeks | **Priority:** 🟡 High

### Sprint 4.1: Financial Reports (1 week)

#### Backend Tasks

**4.1.1 Create Financial Report Service**
File: `app/Services/FinancialReportService.php`

Methods:
- `profitAndLoss(string $tenantId, Carbon $start, Carbon $end): array`
- `cashFlow(string $tenantId, Carbon $start, Carbon $end): array`
- `balanceSheet(string $tenantId, Carbon $asOfDate): array`

P&L logic:
```php
public function profitAndLoss(string $tenantId, Carbon $start, Carbon $end): array
{
    return Tenant::acting($tenantId, function() use ($start, $end) {
        // Revenue
        $revenue = DB::table('sales')
            ->whereBetween('created_at', [$start, $end])
            ->where('status', '!=', 'voided')
            ->sum('total_paise');
        
        // Cost of Goods Sold
        $cogs = DB::table('sale_lines')
            ->join('sales', 'sale_lines.sale_id', '=', 'sales.id')
            ->join('store_items', 'sale_lines.store_item_id', '=', 'store_items.id')
            ->whereBetween('sales.created_at', [$start, $end])
            ->selectRaw('SUM(sale_lines.qty * store_items.cost_paise) as total')
            ->value('total');
        
        // Operating Expenses
        $expenses = DB::table('expenses')
            ->whereBetween('expense_date', [$start, $end])
            ->sum('amount_paise');
        
        // Salaries
        $salaries = DB::table('staff_salaries')
            ->whereBetween('salary_month', [$start, $end])
            ->sum('amount_paise');
        
        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $expenses - $salaries;
        
        return [
            'revenue' => $revenue,
            'cogs' => $cogs,
            'gross_profit' => $grossProfit,
            'gross_margin_percent' => $revenue > 0 ? ($grossProfit / $revenue) * 100 : 0,
            'operating_expenses' => $expenses,
            'staff_costs' => $salaries,
            'net_profit' => $netProfit,
            'net_margin_percent' => $revenue > 0 ? ($netProfit / $revenue) * 100 : 0,
        ];
    });
}
```

Cash flow logic:
```php
public function cashFlow(string $tenantId, Carbon $start, Carbon $end): array
{
    // Inflows
    $salesCash = DB::table('payments')
        ->where('payment_method', 'cash')
        ->whereBetween('created_at', [$start, $end])
        ->sum('amount_paise');
    
    // Outflows
    $purchases = DB::table('purchases')
        ->whereBetween('created_at', [$start, $end])
        ->sum('total_paise');
    
    return [
        'inflows' => ['sales_cash' => $salesCash, 'total' => ...],
        'outflows' => ['purchases' => $purchases, 'total' => ...],
        'net_cash_flow' => $inflows - $outflows,
    ];
}
```

**4.1.2 Add API Endpoints**
Routes:
- `GET /api/v1/reports/profit-loss?start=2024-01-01&end=2024-12-31`
- `GET /api/v1/reports/cash-flow?start=2024-01-01&end=2024-12-31`

#### Frontend Tasks

**4.1.3 Financial Dashboard**
File: `frontend/src/app/(dashboard)/reports/financials/page.tsx`

Features:
- Date range picker
- P&L Statement card
- Cash Flow card
- Charts: Revenue vs Profit trend
- Export to PDF/Excel

#### Testing Requirements
- Generate P&L for test tenant
- Verify calculations manually
- Export to Excel works

#### Acceptance Criteria
✅ P&L statement generated accurately  
✅ Cash flow report shows inflows/outflows  
✅ Charts visualize trends  
✅ Export functionality works

---

### Sprint 4.2: Inventory Reports (1 week)

#### Backend Tasks

**4.2.1 Add Inventory Analytics Methods**
In `app/Services/InventoryReportService.php`:

Methods:
- `deadStockAnalysis(string $tenantId, int $days = 90): array`
- `stockAgingReport(string $tenantId): array`
- `shrinkageReport(string $tenantId, Carbon $start, Carbon $end): array`
- `fastMovingItems(string $tenantId, int $limit = 50): array`
- `slowMovingItems(string $tenantId, int $limit = 50): array`

Dead stock logic:
```php
public function deadStockAnalysis(string $tenantId, int $days = 90): array
{
    $cutoff = now()->subDays($days);
    
    $deadStock = DB::table('store_items')
        ->leftJoin('sale_lines', 'store_items.id', '=', 'sale_lines.store_item_id')
        ->leftJoin('sales', function($join) use ($cutoff) {
            $join->on('sale_lines.sale_id', '=', 'sales.id')
                 ->where('sales.created_at', '>=', $cutoff);
        })
        ->join('stock_balances', 'store_items.id', '=', 'stock_balances.store_item_id')
        ->where('store_items.tenant_id', $tenantId)
        ->whereNull('sales.id')
        ->where('stock_balances.qty', '>', 0)
        ->select([
            'store_items.sku',
            'store_items.name_override',
            'stock_balances.qty',
            DB::raw('stock_balances.qty * store_items.cost_paise as blocked_value'),
        ])
        ->get();
    
    return [
        'items' => $deadStock,
        'total_blocked_value' => $deadStock->sum('blocked_value'),
    ];
}
```

**4.2.2 Add API Endpoints**
Routes:
- `GET /api/v1/reports/inventory/dead-stock?days=90`
- `GET /api/v1/reports/inventory/aging`
- `GET /api/v1/reports/inventory/shrinkage?start=...&end=...`
- `GET /api/v1/reports/inventory/fast-moving?limit=50`

#### Frontend Tasks

**4.2.3 Inventory Analytics Page**
File: `frontend/src/app/(dashboard)/reports/inventory/page.tsx`

Tabs:
- Dead Stock (with action buttons: Discount / Clearance)
- Stock Aging (with chart)
- Shrinkage (with trends)
- Fast/Slow Moving

#### Testing Requirements
- Dead stock: Item with no sales in 90 days
- Aging: Batch created 120 days ago shows correctly
- Shrinkage: Stock adjustments logged

#### Acceptance Criteria
✅ Dead stock report accurate  
✅ Stock aging shows age brackets  
✅ Shrinkage calculates lost value  
✅ Fast/slow moving lists helpful

---

## PHASE 5: PRODUCTION HARDENING

**Duration:** 2 weeks | **Priority:** 🟢 Medium

### Sprint 5.1: Monitoring & Observability (1 week)

#### Backend Tasks

**5.1.1 Create Health Check Endpoint**
File: `app/Http/Controllers/HealthController.php`

Route: `GET /health`

Checks:
- Database connection
- Redis connection
- Typesense connection
- Disk space
- Queue status

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-10-23T10:00:00Z",
  "checks": {
    "database": {"status": "ok", "message": "Connected"},
    "redis": {"status": "ok", "message": "Connected"},
    "typesense": {"status": "ok"},
    "storage": {"status": "ok", "message": "Disk usage: 45%"},
    "queue": {"status": "warning", "message": "3 failed jobs"}
  }
}
```

**5.1.2 Add Structured Logging**
Configure in `config/logging.php`:
```php
'structured' => [
    'driver' => 'monolog',
    'handler' => StreamHandler::class,
    'formatter' => JsonFormatter::class,
],
```

Add context in `AppServiceProvider`:
```php
Log::shareContext([
    'app_name' => config('app.name'),
    'environment' => app()->environment(),
    'tenant_id' => session('tenant_id'),
]);
```

**5.1.3 Create Performance Monitoring Middleware**
File: `app/Http/Middleware/PerformanceMonitoring.php`

Track:
- Request duration
- Memory usage
- Log slow requests (> 1 second)
- Add headers: `X-Response-Time`, `X-Memory-Usage`

**5.1.4 Add Metrics Collection**
File: `app/Services/MetricsService.php`

Methods:
- `track(string $metric, float $value, array $tags = []): void`
- `timing(string $operation, Closure $callback)`

Usage:
```php
$this->metrics->track('sales.completed', 1, ['store' => $storeId]);
$this->metrics->timing('catalog.search', fn() => $this->search($query));
```

#### Testing Requirements
- Hit /health → All checks pass
- Slow request → Warning logged
- Metrics stored in Redis

#### Acceptance Criteria
✅ Health check endpoint operational  
✅ Structured logging implemented  
✅ Slow requests logged with context  
✅ Metrics tracked for key operations

---

### Sprint 5.2: Backup & Disaster Recovery (1 week)

#### Backend Tasks

**5.2.1 Create Backup Script**
File: `scripts/backup.sh`

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQL dump
pg_dump $DB_DATABASE -U $DB_USERNAME -h $DB_HOST \
    --format=custom \
    --file="${BACKUP_DIR}/retail_${DATE}.dump"

# Compress
gzip "${BACKUP_DIR}/retail_${DATE}.dump"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/retail_${DATE}.dump.gz" \
    "s3://${S3_BACKUP_BUCKET}/database/" \
    --storage-class STANDARD_IA

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.dump.gz" -mtime +30 -delete

echo "Backup completed: retail_${DATE}.dump.gz"
```

**5.2.2 Configure Cron**
```bash
# Full backup daily at 2 AM
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1

# Incremental backup every 4 hours
0 */4 * * * /app/scripts/incremental-backup.sh >> /var/log/backup.log 2>&1
```

**5.2.3 Create Restore Test Script**
File: `scripts/test-restore.sh`

Logic:
- Download latest backup from S3
- Restore to test database
- Verify record counts
- Run smoke tests
- Cleanup

**5.2.4 Create Backup Monitoring Job**
File: `app/Jobs/CheckBackupStatusJob.php`

Check:
- Last backup timestamp
- If > 26 hours → Alert DevOps
- Send to Slack webhook

Schedule: Daily at 4 AM

**5.2.5 Document Disaster Recovery**
File: `docs/disaster-recovery.md`

Scenarios:
1. Database corruption
2. Full server failure
3. Data center outage

RTO: 4 hours  
RPO: 4 hours (incremental backups)

#### Testing Requirements
- Run backup script → File uploaded to S3
- Restore test → Data verified
- Simulate 26h gap → Alert triggered
- Full DR drill successful

#### Acceptance Criteria
✅ Automated daily backups  
✅ Backups stored off-site (S3)  
✅ Restore tested weekly  
✅ Monitoring alerts if backup fails  
✅ DR runbook documented

---

## TESTING STRATEGY

### Unit Tests
- **Target Coverage:** 80%
- **Focus Areas:**
  - Services: `BatchManagementService`, `EInvoiceService`
  - Calculations: GSTR reports, P&L
  - Utilities: Image optimization, GTIN normalization

### Integration Tests
- **API Endpoints:** All new routes
- **Database:** Migrations run cleanly
- **Queue Jobs:** Process correctly
- **External APIs:** GST portal (sandbox)

### Feature Tests
- **User Flows:**
  - Browse catalog → Add products → See in store
  - Generate E-Invoice → View IRN and QR
  - Low stock alert → Acknowledge
  - Create batch → Sell → Verify FEFO

### Performance Tests
- **Load Testing:**
  - 1000 concurrent users on POS
  - Catalog search with 10,000 products < 300ms
  - Batch allocation < 50ms
- **Tools:** Apache JMeter, k6

### Security Tests
- **Tenant Isolation:** Cross-tenant access attempts
- **Authentication:** Token validation
- **Input Validation:** SQL injection, XSS
- **Tools:** OWASP ZAP

### Manual Testing
- **E2E Scenarios:**
  - Complete sale with E-Invoice
  - Generate GSTR-1 and upload
  - Batch expiry workflow
  - Financial report generation

---

## DEPLOYMENT PLAN

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, feature)
- [ ] Database migrations reviewed
- [ ] Backup verified and tested
- [ ] Environment variables documented
- [ ] API documentation updated
- [ ] Runbooks created

### Deployment Strategy: Blue-Green

**Phase 1: Staging Deployment**
1. Deploy to staging environment
2. Run full test suite
3. Manual QA testing
4. Performance testing
5. Security scan

**Phase 2: Canary Release (5% traffic)**
1. Deploy to 5% of production servers
2. Monitor for 24 hours
3. Check error rates, performance
4. Rollback if issues

**Phase 3: Gradual Rollout**
1. Week 1: 25% traffic
2. Week 2: 50% traffic
3. Week 3: 100% traffic

**Phase 4: Monitor**
- Health check dashboard
- Error rate monitoring
- Performance metrics
- User feedback

### Rollback Plan
1. Revert code deployment
2. Roll back database migrations (if needed)
3. Clear caches
4. Notify team

### Database Migration Strategy
- **Zero Downtime:** Use additive changes only
- **Backward Compatible:** Old code works with new schema
- **Data Migrations:** Run in batches, monitor progress

---

## SUCCESS METRICS

### Technical Metrics
| Metric | Baseline | Target | Phase |
|--------|----------|--------|-------|
| API Response Time (p95) | 500ms | 200ms | All |
| Database Query Time | 100ms | 50ms | All |
| Queue Processing Time | 60s | 10s | All |
| Error Rate | 2% | < 0.5% | All |
| Test Coverage | 45% | 80% | All |
| Uptime | 95% | 99.5% | Phase 5 |

### Business Metrics
| Metric | Target | Phase |
|--------|--------|-------|
| Catalog Products Added | 10,000+ | Phase 1 |
| E-Invoices Generated | 100% of B2B sales | Phase 2 |
| Low Stock Alerts Sent | Daily | Phase 3 |
| Reports Generated | 50/month | Phase 4 |
| Backup Success Rate | 100% | Phase 5 |

### User Experience Metrics
| Metric | Target | Phase |
|--------|--------|-------|
| Catalog Search Time | < 300ms | Phase 1 |
| POS Sale Completion | < 10s | Phase 3 |
| Report Generation | < 5s | Phase 4 |
| Mobile Responsiveness | 100% | All |

---

## RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GST API integration delays | Medium | High | Start Phase 2 early, use sandbox extensively |
| R2/S3 cost overrun | Low | Medium | Set budget alerts, optimize image sizes |
| Performance degradation | Medium | High | Load test after each phase, optimize queries |
| Data migration failures | Medium | Medium | Phased migration, keep base64 as fallback |
| Backup restore failures | Low | Critical | Weekly restore testing, multiple backup locations |
| Queue worker downtime | Medium | Medium | Multiple workers, auto-restart, monitoring |

---

## TEAM ASSIGNMENTS

### Backend Engineer 1
- Phase 1: Catalog API, Subscriptions, Image Upload
- Phase 2: E-Invoice Service, GSTR Reports
- Phase 3: Batch Management, Stock Alerts
- Phase 5: Backup Scripts, Monitoring

### Backend Engineer 2
- Phase 1: Product Observer, Sync Jobs
- Phase 2: GST Portal Integration
- Phase 3: Alert Jobs, Notifications
- Phase 4: Financial Reports, Inventory Analytics

### Frontend Engineer (Shared)
- Phase 1: Catalog Browser, Product Cards
- Phase 2: GSTR UI, E-Invoice Display
- Phase 3: Alerts Dashboard, Batch Management
- Phase 4: Report Dashboards, Charts

### DevOps
- Infrastructure setup (R2, Redis, Queue workers)
- CI/CD pipeline configuration
- Monitoring setup (Sentry, logs)
- Backup automation
- Deployment orchestration

---

## TIMELINE OVERVIEW

```
Week 1-3:   Phase 1 - Global Catalog Enhancement
Week 4-5:   Phase 2 - GST Compliance
Week 6-7:   Phase 3 - Advanced Inventory
Week 8-9:   Phase 4 - Advanced Reporting
Week 10-11: Phase 5 - Production Hardening
Week 12:    Buffer / Final Testing / Documentation
```

**Milestones:**
- End of Week 3: Global Catalog Complete
- End of Week 5: GST Compliant
- End of Week 7: Inventory Features Complete
- End of Week 9: Reporting Complete
- End of Week 11: Production Ready

---

## MAINTENANCE & SUPPORT

### Post-Launch (Week 12+)
- **Week 12-13:** Bug fixes from production feedback
- **Week 14-16:** Performance tuning
- **Week 17+:** Feature enhancements based on usage

### Ongoing Maintenance
- **Daily:** Monitor health checks, error logs
- **Weekly:** Review failed jobs, backup status
- **Monthly:** Performance review, cost optimization
- **Quarterly:** Security audit, dependency updates

### Support Model
- **Level 1:** User issues (store owners)
- **Level 2:** Technical issues (bugs, errors)
- **Level 3:** Infrastructure issues (DevOps)

### Documentation Updates
- API documentation (OpenAPI spec)
- User manuals (store owners, super admin)
- Developer docs (setup, architecture)
- Runbooks (deployment, DR)

---

## APPENDIX

### A. Environment Variables

**New Variables to Add:**
```env
# R2/S3 Storage
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=retail-products
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.yourdomain.com

# GST Portal
GST_CLIENT_ID=
GST_CLIENT_SECRET=
GSTIN=
GST_USERNAME=
GST_PASSWORD=
GST_ENVIRONMENT=sandbox

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=

# Backup
S3_BACKUP_BUCKET=retail-backups
S3_BACKUP_REGION=us-east-1
```

### B. Database Migrations Order
1. `add_catalog_search_indexes`
2. `create_catalog_subscriptions_table`
3. `add_catalog_images`
4. `create_e_invoices_table`
5. `add_gstin_to_customers`
6. `create_stock_alerts_table`
7. `create_stock_batches_table`
8. `add_batch_tracking_to_store_items`

### C. Queue Configuration

**Horizon Configuration:**
```php
// config/horizon.php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'processes' => 10,
            'tries' => 3,
        ],
    ],
],
```

**Queue Priorities:**
- **high:** E-Invoice generation, payment processing
- **default:** Stock alerts, product sync
- **low:** Reports, analytics, cleanup

### D. Composer Dependencies

**New Packages:**
```json
{
  "require": {
    "intervention/image": "^3.0",
    "league/flysystem-aws-s3-v3": "^3.0"
  }
}
```

### E. Useful Commands

```bash
# Run migrations
php artisan migrate

# Migrate images to R2
php artisan images:migrate-to-r2

# Check low stock manually
php artisan app:check-low-stock

# Generate GSTR-1 for testing
php artisan gstr:generate {tenant-id} 2024-10

# Test backup
./scripts/test-restore.sh

# Run tests
php artisan test --parallel

# Queue worker
php artisan queue:work --queue=high,default,low

# Horizon dashboard
php artisan horizon
# Visit: http://localhost/horizon
```

---

## CONCLUSION

This implementation plan provides a comprehensive roadmap to enhance your SelfX Retail system from 82% to 95% production readiness. The plan:

✅ **Preserves all working features** (zero breaking changes)  
✅ **Follows industry best practices** (testing, deployment, monitoring)  
✅ **Addresses critical gaps** (GST compliance, inventory, reporting)  
✅ **Provides production hardening** (backups, monitoring, health checks)  
✅ **Includes detailed acceptance criteria** for every feature  
✅ **Offers realistic timelines** (11 weeks with 2 engineers)

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Start with Phase 1: Global Catalog Enhancement
4. Deploy phase-by-phase with testing
5. Monitor and iterate based on feedback

**Questions or Changes?**
- Adjust priorities based on business needs
- Scale team size to change timeline
- Add/remove features as needed
- Customize for your specific market

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2024  
**Prepared For:** SelfX Retail Development Team  
**Prepared By:** AI Implementation Planning Assistant
