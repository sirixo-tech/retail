<?php

namespace App\Modules\Printing\Enums;

enum TransportType: string
{
    case AGENT = 'agent';
    case BROWSER_RAW = 'browser_raw';
    case BROWSER_DIALOG = 'browser_dialog';
}
