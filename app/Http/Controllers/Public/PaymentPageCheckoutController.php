<?php

namespace App\Http\Controllers\Public;

class PaymentPageCheckoutController extends BaseProductCheckoutController
{
    protected function type(): string { return 'payment_page'; }
    protected function view(): string { return 'PaymentPage'; }
}
