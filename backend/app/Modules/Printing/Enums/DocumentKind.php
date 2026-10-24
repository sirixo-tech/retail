<?php

namespace App\Modules\Printing\Enums;

enum DocumentKind: string
{
    case RECEIPT = 'receipt';
    case LABEL = 'label';
    case PICK_LIST = 'pick_list';
    case DELIVERY_NOTE = 'delivery_note';
    case INVOICE_PDF = 'invoice_pdf';
    case REPORT_PDF = 'report_pdf';
}
