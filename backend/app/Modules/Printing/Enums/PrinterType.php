<?php

namespace App\Modules\Printing\Enums;

enum PrinterType: string
{
    case THERMAL_58MM = 'thermal_58mm';
    case THERMAL_80MM = 'thermal_80mm';
    case LASER = 'laser';
    case LABEL = 'label';
}
