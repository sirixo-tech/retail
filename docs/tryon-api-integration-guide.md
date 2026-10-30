# Virtual AI Try-On Integration Guide

> **Audience:** Try-On Software Development Team  
> **Platform:** SelfX Retail & E-Commerce Suite  
> **Version:** 2.0  
> **Last Updated:** October 2026

---

## 1. Executive Summary & Architecture

The SelfX platform features a built-in **Virtual AI Try-On Studio** across both the **Customer Storefront** (where customers try on clothes on web/mobile) and the **Tenant Console** (`/integrations/tryon`, where store owners configure their Try-On engine and sync 3D/AI garment catalogs).

To integrate your Try-On software with SelfX, your service must expose **3 REST API endpoints**. SelfX acts as a secure backend proxy—your API credentials and internal endpoints are kept strictly confidential on our backend and are never exposed to public browsers.

```
┌─────────────────────────────────┐
│     Customer Storefront UI      │  (Interactive Modal: selects size/model,
│  (Next.js App on Web / Mobile)  │   captures photo, views fitting preview)
└────────────────┬────────────────┘
                 │  POST /api/v1/public/stores/{slug}/tryon/generate
                 ▼
┌─────────────────────────────────┐
│       SelfX Backend Proxy       │  (Handles tenancy, rate limits, audit logs,
│     (Laravel REST Service)      │   injects API keys & forwards inference)
└────────────────┬────────────────┘
                 │  POST /api/v1/tryon/generate (with Bearer Token / API Key)
                 ▼
┌─────────────────────────────────┐
│   Your Try-On Inference Engine  │  (Runs diffusion/warp models on GPU,
│  (FastAPI / Flask / Node.js)    │   generates photorealistic try-on result)
└─────────────────────────────────┘
```

---

## 2. Credentials & Connection Parameters

To connect your software, provide the following to the SelfX administrator:

| Parameter | Type | Example | Description |
|---|---|---|---|
| **API Base URL** | `string` | `https://tryon-engine.yourdomain.com` | Publicly accessible HTTPS URL of your service (no trailing slash). |
| **API Key / Secret Token** | `string` | `sk_live_tryon_9f82d7...` | Secret token used to authenticate requests from SelfX. |
| **Model / Version Name** | `string` | `VTON-Diffusion-v2.1` | *(Optional)* Model identifier displayed in system logs. |

### Authentication Protocol
Every request from the SelfX backend to your server will include authentication headers:
```http
Authorization: Bearer <API_KEY>
X-API-Key: <API_KEY>
Content-Type: application/json
Accept: application/json
```
Your service should validate either the `Authorization: Bearer` header or the `X-API-Key` header.

---

## 3. Required API Endpoints Specification

Your Try-On service must implement the following three endpoints:

### Endpoint 1: Health & Connectivity Ping
Used by the SelfX console when the store administrator clicks **"Test Connection"**.

* **Method:** `GET`
* **Route:** `/api/v1/health`
* **Timeout:** 8 seconds

#### Expected Response (`200 OK`)
```json
{
  "status": "ok",
  "version": "v1.5-diffusion",
  "gpu_status": "active",
  "cuda_devices_available": 1,
  "service": "Virtual Try-On Neural Service"
}
```

* **Minimum Required Fields:** `"status": "ok"` or HTTP status code `200`.

---

### Endpoint 2: Virtual Try-On Generation (Inference)
Called in real time when a customer clicks **"✨ Generate Virtual Fitting"** in the storefront.

* **Method:** `POST`
* **Route:** `/api/v1/tryon/generate`
* **Timeout:** 25 seconds *(Recommended inference time: < 3 to 5 seconds)*

#### Request Body Sent by SelfX (`application/json`)
```json
{
  "garment_id": "TRYON-SHIRT-01",
  "garment_name": "Italian Cotton Mandarin Oxford Shirt",
  "garment_cutout_url": "https://cdn.example.com/products/shirt-cutout.png",
  "garment_category": "upper_body",
  "user_image": "https://cdn.example.com/models/female_studio_01.jpg",
  "selected_size": "M",
  "selected_color": "Sky Blue"
}
```

#### Field Specifications:

| Field | Type | Required? | Details |
|---|---|---|---|
| `garment_id` | `string` | No | Unique SKU or database identifier of the garment. |
| `garment_name` | `string` | No | Display name of the product. |
| `garment_cutout_url` | `string (URL)` | **Yes** | High-resolution transparent PNG cutout of the clothing item. |
| `garment_category` | `string (enum)` | **Yes** | One of: `"upper_body"`, `"lower_body"`, `"dress"`, `"outerwear"`. |
| `user_image` | `string` | **Yes** | Either a public HTTPS image URL **OR** a base64 Data URI (`data:image/jpeg;base64,...`) of the person. |
| `selected_size` | `string` | No | Selected clothing size: `"XS"`, `"S"`, `"M"`, `"L"`, `"XL"`, `"XXL"`. |
| `selected_color` | `string` | No | Selected color variant (e.g. `"Navy"`, `"Emerald Green"`). |

#### Expected Response from Your Service (`200 OK`)
```json
{
  "output_image_url": "https://cdn.example.com/tryon-results/job_98432a1b.png",
  "model": "Selfx-VTON-Diffusion-v2",
  "processing_time_ms": 1420
}
```

> **Note on Flexibility:** SelfX automatically parses any of the following response keys:
> - `output_image_url`
> - `image`
> - `data.image_url`

#### Error Response (`4xx` / `5xx`)
If processing fails (e.g., face/body not detected in user image):
```json
{
  "error": {
    "code": "TRYON_POSE_NOT_DETECTED",
    "message": "Full upper body could not be detected in user photo. Please ensure a clear front-facing pose."
  }
}
```

---

### Endpoint 3: Fashion Catalog Sync (Optional but Recommended)
Called when the administrator clicks **"Sync Fashion Items"** in the Tenant Console to automatically populate the retail store catalog with Try-On compatible products.

* **Method:** `GET`
* **Route:** `/api/v1/fashion/items`
* **Timeout:** 15 seconds

#### Expected Response (`200 OK`)
```json
{
  "data": [
    {
      "sku": "TRYON-SHIRT-01",
      "remote_id": "garment_prod_101",
      "name": "Italian Cotton Mandarin Oxford Shirt",
      "category": "Men's Fashion",
      "price_paise": 149900,
      "mrp_paise": 249900,
      "stock": 45,
      "image": "https://cdn.example.com/products/shirt-main.jpg",
      "tryon_category": "upper_body",
      "tryon_cutout_url": "https://cdn.example.com/products/shirt-cutout.png",
      "fabric": "100% Giza Cotton",
      "fit_type": "Slim Fit",
      "gender": "men",
      "sizes": ["S", "M", "L", "XL", "XXL"],
      "colors": ["Sky Blue", "Crisp White", "Navy"]
    },
    {
      "sku": "TRYON-DRESS-02",
      "remote_id": "garment_prod_102",
      "name": "Emerald Floral Wrap Cocktail Dress",
      "category": "Women's Fashion",
      "price_paise": 219900,
      "mrp_paise": 349900,
      "stock": 30,
      "image": "https://cdn.example.com/products/dress-main.jpg",
      "tryon_category": "dress",
      "tryon_cutout_url": "https://cdn.example.com/products/dress-cutout.png",
      "fabric": "Georgette Silk",
      "fit_type": "A-Line Wrap",
      "gender": "women",
      "sizes": ["XS", "S", "M", "L", "XL"],
      "colors": ["Emerald Green", "Wine Red"]
    }
  ]
}
```

*Note: `price_paise` and `mrp_paise` are in Indian Paise (e.g. `₹1,499.00` = `149900`).*

---

## 4. Garment Asset & Image Guidelines

For photorealistic fittings and accurate garment warping:

1. **Cutout Transparency:**
   * Garments in `tryon_cutout_url` must be **PNG format with a clean alpha channel** (transparent background).
   * No shadows, hangers, mannequins, or background artifacts.
2. **Resolution:**
   * Minimum: `800 x 800` pixels.
   * Recommended: `1024 x 1024` or `1024 x 1536` pixels (aspect ratio 2:3 or 1:1).
3. **Garment Categories Supported:**
   * `upper_body`: Shirts, t-shirts, tops, blouses, hoodies, sweaters.
   * `lower_body`: Trousers, jeans, shorts, skirts.
   * `dress`: Gowns, one-pieces, kurtis, jumpsuits, dresses.
   * `outerwear`: Jackets, blazers, overcoats, cardigans.

---

## 5. Output Image Format & Delivery

The generated try-on result (`output_image_url`) should:
* Be delivered as an **HTTPS URL** (hosted on an S3/GCS bucket or CDN) accessible publicly without expiring immediately (minimum 7-day TTL recommended).
* Format: **PNG** or **JPEG / WebP** at `85%+` quality.
* Maintain the person's original resolution and lighting environment with the garment seamlessly draped, warped, and color-matched.

---

## 6. cURL Verification Examples

Your developer can test their service using these cURL commands before handing over the credentials:

### 1. Test Health Ping
```bash
curl -X GET "https://tryon-engine.yourdomain.com/api/v1/health" \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY"
```

### 2. Test Try-On Inference
```bash
curl -X POST "https://tryon-engine.yourdomain.com/api/v1/tryon/generate" \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "garment_id": "TEST-SHIRT-01",
    "garment_name": "Test Linen Shirt",
    "garment_cutout_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80",
    "garment_category": "upper_body",
    "user_image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
    "selected_size": "M",
    "selected_color": "White"
  }'
```

### 3. Test Catalog Sync
```bash
curl -X GET "https://tryon-engine.yourdomain.com/api/v1/fashion/items" \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY"
```

---

## 7. Deliverables Checklist for the Teammate

Please share the following with the platform lead:

- [ ] **API Base URL** (e.g. `https://tryon.yourdomain.com`)
- [ ] **API Key / Secret Token**
- [ ] Confirmation that `/api/v1/health` responds with HTTP 200
- [ ] Confirmation that `/api/v1/tryon/generate` accepts the request JSON and returns `output_image_url`
- [ ] Confirmation of average inference latency (e.g., ~1.5s on NVIDIA T4 / A10G)
- [ ] *(Optional)* Link to catalog sync endpoint `/api/v1/fashion/items`
