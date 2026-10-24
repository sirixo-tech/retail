<?php

namespace App\Modules\Printing\Enums;

enum PrintJobStatus: string
{
    case QUEUED = 'queued';
    case PRINTED = 'printed';
    case FAILED = 'failed';
}
