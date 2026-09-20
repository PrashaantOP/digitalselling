<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared — Course/Event/Book/LockedContent/PaymentPage/Booking sab ke coupons. */
class CouponController extends Controller
{
    use RespondsFlexibly;

    private function rules(int $productId, ?int $ignore = null): array
    {
        return [
            'code' => ['required', 'alpha_dash', 'min:3', 'max:30',
                Rule::unique('coupons', 'code')->where('product_id', $productId)->ignore($ignore)],
            'discount_percent' => ['required', 'numeric', 'min:1', 'max:100'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate($this->rules($product->id));
        $data['code'] = strtoupper($data['code']);

        return $this->done($request, 'Coupon created.', ['coupon' => $product->coupons()->create($data)], null, 201);
    }

    public function update(Request $request, Coupon $coupon)
    {
        $data = $request->validate($this->rules($coupon->product_id, $coupon->id));
        $data['code'] = strtoupper($data['code']);

        $coupon->update($data);

        return $this->done($request, 'Coupon updated.', ['coupon' => $coupon]);
    }

    public function destroy(Request $request, Coupon $coupon)
    {
        $coupon->delete();

        return $this->done($request, 'Coupon deleted.');
    }
}
