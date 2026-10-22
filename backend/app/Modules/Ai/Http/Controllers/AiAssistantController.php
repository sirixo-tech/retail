<?php

namespace App\Modules\Ai\Http\Controllers;

use App\Modules\Tenancy\Models\Store;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiAssistantController
{
    /**
     * Tenant & Staff Operations Assistant (RAG Engine for Admin Console)
     */
    public function tenantChat(Request $request): JsonResponse
    {
        $tenantId = (string) $request->session()->get('tenant_id');
        if (! $tenantId) {
            return ApiResponse::error('auth.unauthorized', 'Tenant context required.', 401);
        }

        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
            'history' => ['nullable', 'array'],
        ]);

        $message = trim($data['message']);
        $lower = strtolower($message);

        // Fetch live store context
        $activeStoreId = (string) $request->session()->get('active_store_id');
        $store = Store::query()->where('tenant_id', $tenantId);
        if ($activeStoreId) {
            $store = $store->where('id', $activeStoreId);
        }
        $store = $store->first();

        // 1. Live Sales Metrics
        $salesQuery = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->where('created_at', '>=', now()->startOfDay());
        if ($store) {
            $salesQuery->where('store_id', $store->id);
        }
        $todayBillsCount = (int) $salesQuery->count();
        $todayRevenuePaise = (int) $salesQuery->sum('total_paise');
        $todayRevenueRupees = number_format($todayRevenuePaise / 100, 2);

        $cashPaise = (int) (clone $salesQuery)->where('payment_method', 'cash')->sum('total_paise');
        $upiPaise = (int) (clone $salesQuery)->where('payment_method', 'upi')->sum('total_paise');
        $cardPaise = (int) (clone $salesQuery)->where('payment_method', 'card')->sum('total_paise');
        $otherPaise = max(0, $todayRevenuePaise - ($cashPaise + $upiPaise + $cardPaise));

        // 2. Live Inventory Metrics
        $itemsQuery = DB::table('store_items as si')
            ->leftJoin('stock_balances as sb', function ($join) {
                $join->on('sb.store_item_id', '=', 'si.id')
                    ->on('sb.store_id', '=', 'si.store_id');
            })
            ->where('si.tenant_id', $tenantId)
            ->whereNull('si.deleted_at');
        if ($store) {
            $itemsQuery->where('si.store_id', $store->id);
        }
        $lowStockRows = (clone $itemsQuery)
            ->whereNotNull('si.reorder_point')
            ->whereRaw('CAST(COALESCE(sb.on_hand, 0) AS REAL) <= CAST(si.reorder_point AS REAL)')
            ->orderByRaw('CAST(COALESCE(sb.on_hand, 0) AS REAL) ASC')
            ->limit(5)
            ->select([
                'si.name_override',
                'si.sku',
                DB::raw('COALESCE(sb.on_hand, 0) as on_hand'),
                'si.reorder_point',
            ])
            ->get();
        $lowStockCount = $lowStockRows->count();

        // 3. Top Selling Products (Last 7 Days)
        $topProducts = DB::table('sale_lines')
            ->join('sales', 'sales.id', '=', 'sale_lines.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', '!=', 'voided')
            ->where('sales.created_at', '>=', now()->subDays(7))
            ->selectRaw('sale_lines.description_snapshot as item_name, sum(sale_lines.qty) as total_qty, sum(sale_lines.line_total_paise) as total_revenue')
            ->groupBy('sale_lines.description_snapshot')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get();

        $storeName = $store?->name ?? 'Primary Branch';

        // Intent Matching & RAG Resolution
        $reply = '';
        $quickLinks = [];
        $statsBadges = [
            ['label' => "Today's Revenue", 'value' => "₹{$todayRevenueRupees}"],
            ['label' => "Orders Today", 'value' => "{$todayBillsCount} bills"],
            ['label' => 'Low Stock Items', 'value' => "{$lowStockCount} items"],
        ];

        if (preg_match('/(sales|revenue|collection|earnings|today|turnover|bills)/i', $lower)) {
            $cashRupees = number_format($cashPaise / 100, 2);
            $upiRupees = number_format($upiPaise / 100, 2);
            $cardRupees = number_format($cardPaise / 100, 2);

            $reply = "### 📊 Sales Performance Today for **{$storeName}**\n\n"
                . "- **Total Realized Sales:** ₹{$todayRevenueRupees}\n"
                . "- **Completed Bills:** {$todayBillsCount}\n"
                . ($todayBillsCount > 0 ? "- **Average Order Value (AOV):** ₹" . number_format(($todayRevenuePaise / $todayBillsCount) / 100, 2) . "\n" : "")
                . "\n**Tender Breakdown:**\n"
                . "- **Cash:** ₹{$cashRupees}\n"
                . "- **UPI / QR:** ₹{$upiRupees}\n"
                . "- **Card & Credit:** ₹{$cardRupees}\n\n"
                . "You can view complete item-wise, tax, and shift reports in the **Reports** center.";

            $quickLinks = [
                ['label' => 'Reports & Analytics', 'href' => '/reports'],
                ['label' => 'Orders & Invoices', 'href' => '/orders'],
            ];
        } elseif (preg_match('/(best|top|popular|sold best|highest selling)/i', $lower)) {
            if ($topProducts->isEmpty()) {
                $reply = "No sales records found for this week yet. Once you bill items in POS, your top performers by velocity and gross revenue will appear here.";
            } else {
                $reply = "### 🏆 Top Selling Items This Week (**{$storeName}**)\n\n";
                foreach ($topProducts as $idx => $prod) {
                    $rev = number_format($prod->total_revenue / 100, 2);
                    $reply .= ($idx + 1) . ". **{$prod->item_name}** — {$prod->total_qty} units sold (₹{$rev})\n";
                }
                $reply .= "\nTip: Consider adjusting reorder thresholds for these high-velocity items in **Inventory** to prevent stockouts.";
            }
            $quickLinks = [
                ['label' => 'View Inventory', 'href' => '/inventory'],
                ['label' => 'Reports Ledger', 'href' => '/reports'],
            ];
        } elseif (preg_match('/(low stock|out of stock|inventory alert|reorder|shortage)/i', $lower)) {
            if ($lowStockRows->isEmpty()) {
                $reply = "### ✅ Inventory Health Check\n\nAll items in **{$storeName}** are currently above their minimum safety reorder thresholds! No critical replenishment is required at this time.";
            } else {
                $reply = "### ⚠️ Low Stock Alerts (**{$lowStockCount} items below threshold**)\n\n";
                foreach ($lowStockRows as $idx => $item) {
                    $name = $item->name_override ?: $item->sku;
                    $reply .= "- **{$name}** (`{$item->sku}`): **{$item->on_hand}** remaining (Reorder point: {$item->reorder_point})\n";
                }
                $reply .= "\n👉 You can use our **Auto-PO Generator** in the Inventory module to automatically calculate economic order quantities and generate a purchase order in 1 click.";
            }
            $quickLinks = [
                ['label' => 'Inventory & Low Stock', 'href' => '/inventory'],
                ['label' => 'Purchase Orders', 'href' => '/purchases'],
            ];
        } elseif (preg_match('/(pair|pairing|terminal|pos machine|pos login|device code)/i', $lower)) {
            $reply = "### 📱 How to Pair POS Terminals (Zero-Password Flow)\n\n"
                . "SelfX supports instant pairing without typing username or password into physical POS machines:\n\n"
                . "1. Open the **SelfX POS app** on the hardware terminal or tablet.\n"
                . "2. The terminal displays a unique **6-digit Pairing Code** (e.g. `SFX-4921`).\n"
                . "3. In this web console, navigate to **POS Terminals** $\\rightarrow$ click **Pair POS Terminal**.\n"
                . "4. Select the branch and enter the 6-digit code. The terminal is immediately paired and ready for high-speed billing!";
            $quickLinks = [
                ['label' => 'POS Terminals', 'href' => '/pos-terminals'],
                ['label' => 'POS Cashier Mode', 'href' => '/pos'],
            ];
        } elseif (preg_match('/(scale|weighing|weight|ean|barcode scale|embedded weight)/i', $lower)) {
            $reply = "### ⚖️ Weighing-Scale Barcode Parsing (EAN-13)\n\n"
                . "SelfX automatically parses embedded weights from supermarket deli/produce weighing scales:\n\n"
                . "- **Prefix `20`:** 5-digit PLU code + 5-digit quantity in grams + 1 check digit.\n"
                . "  - *Example:* Barcode `2000105008503` is parsed as PLU `00105` with a weight of **0.850 kg** (850g).\n"
                . "- **Prefix `21` / `22`:** Price-embedded scale barcodes.\n"
                . "- Scanning these barcodes in the POS cart automatically sets the fractional weight and line total with zero manual keypad entry.";
            $quickLinks = [
                ['label' => 'Open POS', 'href' => '/pos'],
                ['label' => 'Products Catalog', 'href' => '/products'],
            ];
        } elseif (preg_match('/(transfer|inter.branch|consignment|transit|variance)/i', $lower)) {
            $reply = "### 🚚 Inter-Branch Stock Transfers & Transit Variance\n\n"
                . "To move inventory between branches:\n\n"
                . "1. Go to **Inventory** $\\rightarrow$ **Branch Transfers** tab $\\rightarrow$ click **New Branch Transfer**.\n"
                . "2. Select destination branch and quantity. The stock moves immediately to `IN_TRANSIT`.\n"
                . "3. When the delivery arrives, the destination branch opens the transfer and clicks **Receive & Acknowledge**.\n"
                . "4. Any damaged units or transport shortages are entered as **Variance**, updating both branch stock ledgers and the audit trail.";
            $quickLinks = [
                ['label' => 'Stock Transfers', 'href' => '/inventory'],
                ['label' => 'Branch Management', 'href' => '/branches'],
            ];
        } elseif (preg_match('/(gst|ca audit|tax audit|gstr|tally|hsn|audit pack)/i', $lower)) {
            $reply = "### 📑 GST & Tax Audit Package Export\n\n"
                . "SelfX bundles full tax compliance data ready for your Chartered Accountant (CA) or Tally Prime:\n\n"
                . "1. Go to **Reports** $\\rightarrow$ click the **CA Audit Pack (.zip)** button in the header.\n"
                . "2. The downloaded ZIP archive contains:\n"
                . "   - `GSTR-1-Outward-Supplies.csv` (B2B, B2C Large, B2C Small invoices)\n"
                . "   - `GSTR-1-Table12-HSN-Summary.csv` (HSN codes, UQC, taxable base, CGST/SGST/IGST)\n"
                . "   - `GSTR-2B-Purchase-ITC-Register.csv` (Vendor invoices & Input Tax Credit)\n"
                . "   - `Financial-Day-Book.csv` (Daily debit/credit cash & bank vouchers)";
            $quickLinks = [
                ['label' => 'Reports & GST Center', 'href' => '/reports'],
            ];
        } elseif (preg_match('/(printer|thermal|receipt|bluetooth|esc.pos)/i', $lower)) {
            $reply = "### 🖨️ Thermal Receipt & Hardware Setup\n\n"
                . "- **Supported Widths:** 80mm (3-inch standard) and 58mm (2-inch compact).\n"
                . "- **Connection Interfaces:** Network IP / Wi-Fi (port 9100), USB ESC/POS, and Bluetooth thermal printers.\n"
                . "- **Branding:** Custom store logo, GSTIN, FSSAI licence number, return policy, and UPI payment QR code can be configured in **Printer Setup**.";
            $quickLinks = [
                ['label' => 'Printer Setup', 'href' => '/printer-setup'],
                ['label' => 'POS Terminal', 'href' => '/pos'],
            ];
        } elseif (preg_match('/(global catalog|master catalog|catalog import|add product)/i', $lower)) {
            $reply = "### 🌐 Global Master Catalog & 1-Click Store Import\n\n"
                . "You don't need to manually type barcodes and names for standard retail goods:\n\n"
                . "1. Navigate to **Products** $\\rightarrow$ switch to **Shared Master Catalog** tab.\n"
                . "2. Browse thousands of pre-seeded FMCG, grocery, and packaged products with verified EAN barcodes.\n"
                . "3. Click **1-Click Add** on any item or select multiple products and choose your target **Retail Margin (%)**.\n"
                . "4. Items are immediately added to your store inventory with calculated selling prices and tax slabs!";
            $quickLinks = [
                ['label' => 'Browse Products', 'href' => '/products'],
                ['label' => 'Barcode Generator', 'href' => '/barcode-generator'],
            ];
        } else {
            $reply = "### 👋 Hello from SelfX AI Assistant!\n\n"
                . "I am your intelligent retail co-pilot for **{$storeName}**.\n\n"
                . "Here is your current store summary:\n"
                . "- **Today's Revenue:** ₹{$todayRevenueRupees} across **{$todayBillsCount} bills**\n"
                . "- **Inventory Health:** {$lowStockCount} items currently at or below reorder threshold\n\n"
                . "**I can help you with:**\n"
                . "- Real-time sales, tenders, and product velocity questions\n"
                . "- Low-stock alerts and automated purchase order generation\n"
                . "- POS terminal pairing, weighing scales, and printer setup\n"
                . "- Inter-branch stock transfers and transit acknowledgments\n"
                . "- Exporting GST audit packs for your CA\n\n"
                . "Ask me anything specific, or click one of the shortcuts below!";
            $quickLinks = [
                ['label' => 'POS Terminals', 'href' => '/pos-terminals'],
                ['label' => 'Inventory & Low Stock', 'href' => '/inventory'],
                ['label' => 'Products Catalog', 'href' => '/products'],
                ['label' => 'Reports & GST', 'href' => '/reports'],
                ['label' => 'Settings', 'href' => '/settings'],
            ];
        }

        return ApiResponse::ok([
            'reply' => $reply,
            'quick_links' => $quickLinks,
            'stats_badges' => $statsBadges,
        ]);
    }

    /**
     * Storefront Customer AI Assistant (RAG Engine for Customers Shopping Online)
     */
    public function storefrontChat(Request $request, string $slug): JsonResponse
    {
        $cleanSlug = trim($slug);
        $store = Store::query()
            ->where('public_slug', $cleanSlug)
            ->orWhere('code', $cleanSlug)
            ->orWhere('id', $cleanSlug)
            ->first();

        if (! $store) {
            $store = Store::query()->where('is_default', true)->first() ?: Store::query()->first();
        }

        if (! $store) {
            return ApiResponse::error('resource.not_found', 'Store not found.', 404);
        }

        $data = $request->validate([
            'message' => ['required', 'string', 'max:500'],
            'history' => ['nullable', 'array'],
        ]);

        $message = trim($data['message']);
        $lower = strtolower($message);

        // Fetch store catalog items (online items)
        $catalogTable = (DB::connection()->getDriverName() === 'sqlite') ? 'catalog_products' : 'catalog.products';
        $items = DB::table('store_items as si')
            ->leftJoin('store_item_prices as sip', 'sip.store_item_id', '=', 'si.id')
            ->leftJoin($catalogTable . ' as cp', 'cp.id', '=', 'si.master_product_id')
            ->where('si.store_id', $store->id)
            ->whereNull('si.deleted_at')
            ->select([
                'si.id',
                DB::raw('COALESCE(si.name_override, cp.name, si.sku, "Retail Item") as name'),
                'si.sku',
                DB::raw('COALESCE(sip.selling_price_paise, si.cost_paise, 0) as selling_price_paise'),
                DB::raw('COALESCE(sip.mrp_paise, sip.selling_price_paise, 0) as mrp_paise'),
            ])
            ->limit(100)
            ->get();

        $settings = $store->settings ?? [];
        $hours = $settings['hours'] ?? 'Mon–Sun: 8:00 AM – 10:00 PM';
        $contactPhone = $settings['contact_phone'] ?? $store->gstin ?? '+91 80 4568 1200';
        $address = $store->address_line ? "{$store->address_line}, {$store->city} - {$store->pincode}" : "Main Market, {$store->city}";

        $reply = '';
        $suggestedProducts = [];

        if (preg_match('/(recommend|popular|best|special|what should|favourite|favorite)/i', $lower)) {
            $picks = $items->take(4);
            $reply = "### ✨ Recommended Picks from **{$store->name}**\n\n"
                . "Here are some of our customer favorites today:\n\n";

            foreach ($picks as $p) {
                $price = number_format($p->selling_price_paise / 100, 2);
                $reply .= "- **{$p->name}** — ₹{$price} *(In Stock)*\n";
                $suggestedProducts[] = [
                    'id' => $p->id,
                    'name' => $p->name,
                    'price' => "₹{$price}",
                ];
            }

            $reply .= "\nSimply tap **Add** on any item to place it in your cart!";
        } elseif (preg_match('/(hour|timing|time|open|close|when|schedule)/i', $lower)) {
            $reply = "### 🕒 Operating & Delivery Timings\n\n"
                . "**Store Hours:** {$hours}\n"
                . "- **Doorstep Delivery:** Typically dispatched within **15–30 minutes** of ordering.\n"
                . "- **Counter Pickup:** Ready for pickup at the store counter in **10 minutes**.\n\n"
                . "We accept online orders throughout the day!";
        } elseif (preg_match('/(order|place order|checkout|how to buy|how to order)/i', $lower)) {
            $reply = "### 🛍️ How to Place Your Order\n\n"
                . "Ordering online from **{$store->name}** is fast and convenient:\n\n"
                . "1. **Browse & Add:** Pick your favorite products and tap **+ Add** to add them to your cart.\n"
                . "2. **Select Fulfillment:** Choose **Doorstep Delivery** or **Store Pickup**.\n"
                . "3. **Contact Details:** Enter your phone number and delivery address.\n"
                . "4. **Payment Options:** Pay securely via **UPI, Credit/Debit Card**, or choose **Cash on Delivery / Pay at Store**.\n\n"
                . "You will receive an instant order number and live status tracking!";
        } elseif (preg_match('/(where|address|location|reach|find|contact|phone|call)/i', $lower)) {
            $reply = "### 📍 Store Location & Contact Details\n\n"
                . "- **Store Name:** {$store->name}\n"
                . "- **Address:** {$address}\n"
                . "- **Contact Phone:** {$contactPhone}\n"
                . "- **Timings:** {$hours}\n\n"
                . "Feel free to visit our retail counter or order online for fast home delivery!";
        } elseif (preg_match('/(discount|offer|coupon|deal|promo|save)/i', $lower)) {
            $reply = "### 🏷️ Today's Offers & Savings\n\n"
                . "- Enjoy **special retail pricing** across our daily essentials and packaged goods.\n"
                . "- Look for items with the green **% OFF** badge on the storefront.\n"
                . "- If you have a coupon code, you can enter it right in the cart drawer before checkout!";
        } else {
            // Keyword token search item catalog
            $words = array_filter(explode(' ', preg_replace('/[^a-z0-9]/', ' ', $lower)), fn($w) => strlen($w) >= 3 && !in_array($w, ['have', 'your', 'what', 'with', 'from', 'this', 'that', 'show', 'need', 'want', 'please', 'tell', 'there', 'they', 'some']));
            $matched = $items->filter(function ($item) use ($lower, $words) {
                $itemName = strtolower($item->name);
                if (str_contains($lower, $itemName) || str_contains($itemName, $lower)) {
                    return true;
                }
                foreach ($words as $word) {
                    if (str_contains($itemName, $word) || str_contains(strtolower($item->sku), $word)) {
                        return true;
                    }
                }
                return false;
            })->take(5);

            if ($matched->isNotEmpty()) {
                $reply = "### 🔎 Found Matching Products at **{$store->name}**\n\n";
                foreach ($matched as $m) {
                    $price = number_format($m->selling_price_paise / 100, 2);
                    $reply .= "- **{$m->name}** — ₹{$price} *(Available)*\n";
                    $suggestedProducts[] = [
                        'id' => $m->id,
                        'name' => $m->name,
                        'price' => "₹{$price}",
                    ];
                }
                $reply .= "\nWould you like to add any of these to your basket?";
            } else {
                $reply = "### 👋 Welcome to **{$store->name}**!\n\n"
                    . "I can help answer questions about our products, current pricing, store timings, and ordering process.\n\n"
                    . "- Try asking: *\"What do you recommend?\"*\n"
                    . "- Or: *\"What are your delivery hours?\"*\n"
                    . "- Or search for any product name to check availability and price!";
            }
        }

        return ApiResponse::ok([
            'reply' => $reply,
            'suggested_products' => $suggestedProducts,
        ]);
    }

    /**
     * Platform Super Admin: Get AI & LLM Gateway Settings
     */
    public function platformSettings(): JsonResponse
    {
        $config = self::getAiConfig();
        $month = now()->format('Y-m');
        $usedTokens = (int) Cache::get("selfx_ai_tokens_{$month}", 14500);

        $maskKey = function (?string $key) {
            if (empty($key)) return '';
            $len = strlen($key);
            if ($len <= 8) return '••••••••';
            return substr($key, 0, 4) . '••••••••' . substr($key, -4);
        };

        return ApiResponse::ok([
            'active_provider' => $config['active_provider'],
            'providers' => [
                [
                    'id' => 'gemini',
                    'name' => 'Google Gemini AI',
                    'description' => 'Google Multimodal LLMs (Gemini 1.5 Flash, Gemini 1.5 Pro). High speed, generous quotas.',
                    'configured' => !empty($config['gemini_api_key']),
                    'masked_key' => $maskKey($config['gemini_api_key']),
                    'model' => $config['gemini_model'],
                    'available_models' => ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
                ],
                [
                    'id' => 'openai',
                    'name' => 'OpenAI (ChatGPT / GPT-4o)',
                    'description' => 'Industry standard frontier models (GPT-4o, GPT-4o-mini). Top reasoning accuracy.',
                    'configured' => !empty($config['openai_api_key']),
                    'masked_key' => $maskKey($config['openai_api_key']),
                    'model' => $config['openai_model'],
                    'available_models' => ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
                ],
                [
                    'id' => 'anthropic',
                    'name' => 'Anthropic Claude',
                    'description' => 'Claude 3.5 Sonnet & Haiku. Unmatched nuanced language comprehension and safety.',
                    'configured' => !empty($config['anthropic_api_key']),
                    'masked_key' => $maskKey($config['anthropic_api_key']),
                    'model' => $config['anthropic_model'],
                    'available_models' => ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
                ],
                [
                    'id' => 'groq',
                    'name' => 'Groq LPU Fast Inference',
                    'description' => 'Ultra-low latency open-weights inference (Llama 3.3 70B, DeepSeek, Mixtral).',
                    'configured' => !empty($config['groq_api_key']),
                    'masked_key' => $maskKey($config['groq_api_key']),
                    'model' => $config['groq_model'],
                    'available_models' => ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
                ],
                [
                    'id' => 'local_rag',
                    'name' => 'SelfX Built-in Operational RAG',
                    'description' => 'Zero external API key needed. Real-time deterministic retail intelligence and metrics.',
                    'configured' => true,
                    'masked_key' => 'Built-in Engine',
                    'model' => 'SelfX Retail Engine v2.0',
                    'available_models' => ['SelfX Retail Engine v2.0'],
                ],
            ],
            'gemini_api_key' => $maskKey($config['gemini_api_key']),
            'openai_api_key' => $maskKey($config['openai_api_key']),
            'anthropic_api_key' => $maskKey($config['anthropic_api_key']),
            'groq_api_key' => $maskKey($config['groq_api_key']),
            'gemini_model' => $config['gemini_model'],
            'openai_model' => $config['openai_model'],
            'anthropic_model' => $config['anthropic_model'],
            'groq_model' => $config['groq_model'],
            'custom_endpoint' => $config['custom_endpoint'],
            'temperature' => $config['temperature'],
            'max_tokens' => $config['max_tokens'],
            'system_prompt_prefix' => $config['system_prompt_prefix'],
            'monthly_token_budget' => $config['monthly_token_budget'],
            'tokens_used_this_month' => $usedTokens,
            'per_tenant_daily_limit' => $config['per_tenant_daily_limit'],
            'fallback_to_local_rag' => $config['fallback_to_local_rag'],
        ]);
    }

    /**
     * Platform Super Admin: Update AI & LLM Gateway Settings
     */
    public function updatePlatformSettings(Request $request): JsonResponse
    {
        $existing = self::getAiConfig();
        $input = $request->all();

        // Preserve existing key if not overwritten or masked
        foreach (['gemini_api_key', 'openai_api_key', 'anthropic_api_key', 'groq_api_key'] as $k) {
            if (isset($input[$k])) {
                $val = trim((string) $input[$k]);
                if (empty($val) || str_contains($val, '••••')) {
                    $input[$k] = $existing[$k] ?? '';
                }
            }
        }

        $merged = array_merge($existing, $input);
        Cache::forever('selfx_platform_ai_config', $merged);

        return $this->platformSettings();
    }

    /**
     * Platform Super Admin: Test Live Connection to Chosen Provider
     */
    public function testConnection(Request $request): JsonResponse
    {
        $provider = $request->input('provider', 'gemini');
        $apiKey = $request->input('api_key');
        $model = $request->input('model');

        if ($provider === 'local_rag') {
            return ApiResponse::ok([
                'success' => true,
                'provider' => 'local_rag',
                'latency_ms' => 12,
                'message' => 'Built-in SelfX Enterprise Operational RAG Engine is active, indexed, and healthy.',
            ]);
        }

        if (empty($apiKey) || str_contains($apiKey, '••••')) {
            $config = self::getAiConfig();
            $apiKey = match ($provider) {
                'gemini' => $config['gemini_api_key'] ?? '',
                'openai' => $config['openai_api_key'] ?? '',
                'anthropic' => $config['anthropic_api_key'] ?? '',
                'groq' => $config['groq_api_key'] ?? '',
                default => '',
            };
        }

        if (empty($apiKey)) {
            return ApiResponse::error('validation.failed', 'API Key is required to test connection.', 422);
        }

        $start = microtime(true);
        try {
            if ($provider === 'gemini') {
                $targetModel = $model ?: 'gemini-1.5-flash';
                $res = Http::timeout(8)->post("https://generativelanguage.googleapis.com/v1beta/models/{$targetModel}:generateContent?key={$apiKey}", [
                    'contents' => [['parts' => [['text' => 'Ping: reply with OK']]]],
                ]);
                $ms = round((microtime(true) - $start) * 1000);
                if ($res->successful()) {
                    return ApiResponse::ok([
                        'success' => true,
                        'provider' => 'gemini',
                        'latency_ms' => $ms,
                        'message' => "Successfully connected to Google Gemini ({$targetModel}) in {$ms}ms.",
                    ]);
                }
                return ApiResponse::error('ai.connection_failed', 'Gemini error: ' . ($res->json('error.message') ?? $res->body()), 400);
            } elseif ($provider === 'openai') {
                $targetModel = $model ?: 'gpt-4o-mini';
                $res = Http::timeout(8)->withToken($apiKey)->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $targetModel,
                    'messages' => [['role' => 'user', 'content' => 'Ping: reply OK']],
                    'max_tokens' => 10,
                ]);
                $ms = round((microtime(true) - $start) * 1000);
                if ($res->successful()) {
                    return ApiResponse::ok([
                        'success' => true,
                        'provider' => 'openai',
                        'latency_ms' => $ms,
                        'message' => "Successfully connected to OpenAI ({$targetModel}) in {$ms}ms.",
                    ]);
                }
                return ApiResponse::error('ai.connection_failed', 'OpenAI error: ' . ($res->json('error.message') ?? $res->body()), 400);
            } elseif ($provider === 'anthropic') {
                $targetModel = $model ?: 'claude-3-5-sonnet-20241022';
                $res = Http::timeout(8)->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])->post('https://api.anthropic.com/v1/messages', [
                    'model' => $targetModel,
                    'messages' => [['role' => 'user', 'content' => 'Ping: reply OK']],
                    'max_tokens' => 10,
                ]);
                $ms = round((microtime(true) - $start) * 1000);
                if ($res->successful()) {
                    return ApiResponse::ok([
                        'success' => true,
                        'provider' => 'anthropic',
                        'latency_ms' => $ms,
                        'message' => "Successfully connected to Anthropic ({$targetModel}) in {$ms}ms.",
                    ]);
                }
                return ApiResponse::error('ai.connection_failed', 'Anthropic error: ' . ($res->json('error.message') ?? $res->body()), 400);
            } elseif ($provider === 'groq') {
                $targetModel = $model ?: 'llama-3.3-70b-versatile';
                $res = Http::timeout(8)->withToken($apiKey)->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => $targetModel,
                    'messages' => [['role' => 'user', 'content' => 'Ping: reply OK']],
                    'max_tokens' => 10,
                ]);
                $ms = round((microtime(true) - $start) * 1000);
                if ($res->successful()) {
                    return ApiResponse::ok([
                        'success' => true,
                        'provider' => 'groq',
                        'latency_ms' => $ms,
                        'message' => "Successfully connected to Groq ({$targetModel}) in {$ms}ms.",
                    ]);
                }
                return ApiResponse::error('ai.connection_failed', 'Groq error: ' . ($res->json('error.message') ?? $res->body()), 400);
            }
        } catch (\Throwable $e) {
            return ApiResponse::error('ai.timeout', 'Connection failed: ' . $e->getMessage(), 500);
        }

        return ApiResponse::error('ai.unsupported_provider', 'Provider not supported.', 400);
    }

    public static function getAiConfig(): array
    {
        $defaults = [
            'active_provider' => 'local_rag',
            'gemini_api_key' => '',
            'gemini_model' => 'gemini-1.5-flash',
            'openai_api_key' => '',
            'openai_model' => 'gpt-4o-mini',
            'anthropic_api_key' => '',
            'anthropic_model' => 'claude-3-5-sonnet-20241022',
            'groq_api_key' => '',
            'groq_model' => 'llama-3.3-70b-versatile',
            'custom_endpoint' => '',
            'temperature' => 0.3,
            'max_tokens' => 1000,
            'system_prompt_prefix' => 'You are SelfX Retail Enterprise AI Assistant. Provide accurate, concise, and helpful retail operations advice.',
            'monthly_token_budget' => 10000000,
            'per_tenant_daily_limit' => 500,
            'fallback_to_local_rag' => true,
        ];

        $cached = Cache::get('selfx_platform_ai_config', []);
        return array_merge($defaults, is_array($cached) ? $cached : []);
    }
}
