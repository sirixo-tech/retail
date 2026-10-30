<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MarketingSuiteSeeder extends Seeder
{
    public function run(): void
    {
        // Get all tenants or insert demo templates for all tenants
        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {
            $this->seedTenantMarketing($tenant->id);
        }
    }

    public function seedTenantMarketing(string $tenantId): void
    {
        $now = now();

        // 1. Marketing Segments
        $segments = [
            [
                'name' => 'All Store Customers',
                'description' => 'Every registered customer and online store buyer across all branches.',
                'rules' => ['type' => 'all'],
            ],
            [
                'name' => 'Online Store Buyers',
                'description' => 'Customers who have placed at least one online delivery or pickup order.',
                'rules' => ['purchased_online' => true, 'min_orders' => 1],
            ],
            [
                'name' => 'VIP & High Spenders',
                'description' => 'Top valued customers who spent over ₹2,000 at your store.',
                'rules' => ['min_spend_paise' => 200000],
            ],
            [
                'name' => 'Inactive Customers (30+ Days)',
                'description' => 'Past buyers who have not shopped or ordered in the last 30 days.',
                'rules' => ['days_since_last_order' => 30],
            ],
            [
                'name' => 'Frequent Shoppers (3+ Orders)',
                'description' => 'Loyal repeat shoppers with 3 or more completed visits/orders.',
                'rules' => ['min_orders' => 3],
            ],
        ];

        foreach ($segments as $seg) {
            DB::table('marketing_segments')->updateOrInsert(
                ['tenant_id' => $tenantId, 'name' => $seg['name']],
                [
                    'id' => DB::table('marketing_segments')->where('tenant_id', $tenantId)->where('name', $seg['name'])->value('id') ?? (string) Str::uuid7(),
                    'description' => $seg['description'],
                    'rules' => json_encode($seg['rules']),
                    'estimated_count' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        // 2. Marketing Templates (SMS, WhatsApp, Email)
        $templates = [
            // WhatsApp Templates
            [
                'channel' => 'whatsapp',
                'name' => 'Weekend Flash Sale Announcement',
                'category' => 'promotional',
                'subject' => null,
                'content' => "🌟 *Exclusive Flash Sale at {{store_name}}!* 🌟\n\nHello {{customer_name}},\n\nEnjoy *flat 20% OFF* on all fashion & groceries this weekend! Use coupon code *WEEKEND20* at checkout.\n\nShop our live collection now:\n👉 {{store_url}}\n\nOffer valid till Sunday midnight. Happy Shopping!",
                'variables' => ['customer_name', 'store_name', 'store_url', 'discount_code'],
                'meta_payload' => [
                    'button_text' => 'Shop Live Store',
                    'cta_url' => '{{store_url}}',
                ],
            ],
            [
                'channel' => 'whatsapp',
                'name' => 'We Miss You! Special Comeback Voucher',
                'category' => 'win_back',
                'subject' => null,
                'content' => "👋 Hi {{customer_name}},\n\nIt's been a while since your last visit to *{{store_name}}*! We've added fresh arrivals and new items.\n\nHere is a special comeback gift: *₹150 OFF* on your next order with code *WELCOMEBACK*.\n\nOrder online for express pickup or delivery:\n👉 {{store_url}}",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'meta_payload' => [
                    'button_text' => 'Claim ₹150 Voucher',
                    'cta_url' => '{{store_url}}',
                ],
            ],
            [
                'channel' => 'whatsapp',
                'name' => 'Festive Mega Offer & Free Delivery',
                'category' => 'festive',
                'subject' => null,
                'content' => "🎉 *Celebrate Festivals with {{store_name}}!* 🎉\n\nDear {{customer_name}},\n\nGet *Free Home Delivery* + exciting discounts on top products this season.\n\nBrowse trending specials now:\n{{store_url}}\n\nValid for limited orders today only!",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'meta_payload' => [
                    'button_text' => 'Browse Festive Offers',
                    'cta_url' => '{{store_url}}',
                ],
            ],

            // SMS Templates
            [
                'channel' => 'sms',
                'name' => 'Flash Sale Promo SMS (DLT Approved)',
                'category' => 'promotional',
                'subject' => null,
                'content' => "Dear {{customer_name}}, enjoy 20% OFF on all items at {{store_name}}! Use code FLASH20 on {{store_url}}. Hurry, offer valid today! SelfX",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'meta_payload' => [
                    'dlt_template_id' => '17071618294029182',
                    'sender_id' => 'SELFXR',
                ],
            ],
            [
                'channel' => 'sms',
                'name' => 'Loyalty Reward Points Reminder SMS',
                'category' => 'loyalty_rewards',
                'subject' => null,
                'content' => "Hello {{customer_name}}, you have unclaimed reward points waiting at {{store_name}}! Redeem on your next order: {{store_url}}. SelfX",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'meta_payload' => [
                    'dlt_template_id' => '17071618294029183',
                    'sender_id' => 'SELFXR',
                ],
            ],

            // Email Templates
            [
                'channel' => 'email',
                'name' => 'VIP Customer Exclusive Weekend Showcase',
                'category' => 'promotional',
                'subject' => '✨ Exclusive VIP Invitation from {{store_name}} — Up to 25% OFF',
                'content' => "<h2>Hello {{customer_name}},</h2><p>As one of our most valued shoppers at <strong>{{store_name}}</strong>, we invite you to an exclusive members-only weekend preview!</p><p>Explore our latest online catalog with guaranteed express counter pickup and home delivery.</p><div style='text-align: center; margin: 24px 0;'><a href='{{store_url}}' style='background: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;'>Visit Online Store &rarr;</a></div><p>Best regards,<br>{{store_name}} Team</p>",
                'variables' => ['customer_name', 'store_name', 'store_url'],
                'meta_payload' => [
                    'header_image_url' => 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
                ],
            ],
        ];

        foreach ($templates as $tpl) {
            DB::table('marketing_templates')->updateOrInsert(
                ['tenant_id' => $tenantId, 'name' => $tpl['name']],
                [
                    'id' => DB::table('marketing_templates')->where('tenant_id', $tenantId)->where('name', $tpl['name'])->value('id') ?? (string) Str::uuid7(),
                    'channel' => $tpl['channel'],
                    'category' => $tpl['category'],
                    'subject' => $tpl['subject'],
                    'content' => $tpl['content'],
                    'variables' => json_encode($tpl['variables']),
                    'meta_payload' => json_encode($tpl['meta_payload']),
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
