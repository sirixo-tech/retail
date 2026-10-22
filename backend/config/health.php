<?php

return [

    /*
    | Required check names. A failure among these makes /health/ready return 503.
    | Local default is the database only, so the API is usable before Redis and
    | Typesense are running. Production sets the full list.
    */
    'required' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('HEALTH_REQUIRED', 'database')),
    ))),

    'typesense_url' => env('TYPESENSE_URL', 'http://127.0.0.1:8108'),

];
