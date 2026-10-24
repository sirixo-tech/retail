<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gst_portal' => [
        'sandbox_url' => env('GST_SANDBOX_URL', 'https://gsp.adaequare.com/test/enriched'),
        'production_url' => env('GST_PRODUCTION_URL', 'https://gsp.adaequare.com/enriched'),
        'client_id' => env('GST_CLIENT_ID', 'test_client_id'),
        'client_secret' => env('GST_CLIENT_SECRET', 'test_client_secret'),
        'gstin' => env('GSTIN', '29ABCDE1234F1Z5'),
        'username' => env('GST_USERNAME', 'test_user'),
        'password' => env('GST_PASSWORD', 'test_password'),
        'environment' => env('GST_ENVIRONMENT', 'sandbox'),
    ],

];
