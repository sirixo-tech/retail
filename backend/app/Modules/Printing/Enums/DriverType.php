<?php

namespace App\Modules\Printing\Enums;

enum DriverType: string
{
    case ESCPOS = 'escpos';
    case SYSTEM = 'system';
    case EPSON_EPOS = 'epson_epos';
    case STAR_WEBPRNT = 'star_webprnt';
    case SDK = 'sdk';
}
