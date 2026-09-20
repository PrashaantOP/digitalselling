<?php

namespace App\Http\Controllers;

/** Payment page: sirf products row (koi detail table nahi) — saara logic BaseProductController me. */
class PaymentPageController extends BaseProductController
{
    protected function type(): string { return 'payment_page'; }
    protected function param(): string { return 'paymentPage'; }
    protected function view(): string { return 'PaymentPages'; }
    protected function routeName(): string { return 'payment-pages'; }
}
