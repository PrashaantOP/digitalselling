<?php

namespace App\Services;

use App\Models\Buyer;
use App\Models\Customer;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Kharid/booking ke waqt buyer + us creator ka customer row — yahi EK jagah hai jahan ye bante/milte hain.
 *
 * Pehchaan email hai (lowercase). Phone unique hai par checkout pe verify nahi hota, isliye:
 *  - phone se kabhi koi row "milti" nahi — warna kisi aur ka number likh kar uski kharid mil jaati;
 *  - ek baar juda `customers.buyer_id` kabhi nahi badalta.
 */
class CustomerResolver
{
    private const PHONE_TAKEN = 'This mobile number is already linked to another email. Use that email, or enter a different number.';

    /**
     * @param  array{name?: ?string, email: string, phone: string}  $info
     * @return Customer `buyer` relation loaded; naya buyer bana ho to `$customer->buyer->wasRecentlyCreated` true
     */
    public function forPurchase(User $creator, array $info): Customer
    {
        $email = Str::lower(trim($info['email']));
        $phone = Phone::normalize($info['phone']);
        $name = trim((string) ($info['name'] ?? '')) ?: null;

        return DB::transaction(function () use ($creator, $email, $phone, $name) {
            $buyer = Buyer::where('email', $email)->lockForUpdate()->first();
            $phoneOwner = $phone ? Buyer::where('phone', $phone)->first() : null;
            $takenByOther = $phoneOwner && $phoneOwner->id !== $buyer?->id;

            if (! $buyer) {
                if ($takenByOther) {
                    throw ValidationException::withMessages(['phone' => self::PHONE_TAKEN]);
                }

                $buyer = Buyer::create(['email' => $email, 'name' => $name, 'phone' => $phone]);
            } elseif (! $buyer->phoneVerified() && $phone && $buyer->phone !== $phone) {
                // unverified phone checkout se badal sakta hai; verified sirf Account page se (SMS OTP ke baad)
                if ($takenByOther) {
                    throw ValidationException::withMessages(['phone' => self::PHONE_TAKEN]);
                }

                $buyer->forceFill(['phone' => $phone, 'phone_verified_at' => null])->save();
            }

            if ($name && $buyer->name !== $name) {
                $buyer->forceFill(['name' => $name])->save();
            }

            $customer = Customer::where('creator_id', $creator->id)->where('buyer_id', $buyer->id)->first();
            $customerPhone = $buyer->phone ?? $phone;

            if (! $customer) {
                // Bina buyer wali purani row jis pe yahi phone hai: phone unverified hai, isliye use is buyer se nahi jodte
                if (Customer::where('creator_id', $creator->id)->where('phone', $customerPhone)->exists()) {
                    throw ValidationException::withMessages(['phone' => 'This mobile number already has purchases on this store under different details. Please contact support.']);
                }

                $customer = Customer::create([
                    'creator_id' => $creator->id,
                    'buyer_id' => $buyer->id,
                    'name' => $name ?? $buyer->name,
                    'email' => $email,
                    'phone' => $customerPhone,
                ]);
            } else {
                $updates = ['name' => $name ?? $customer->name, 'email' => $email];

                // customers.phone buyer ke phone ki copy — creator ke store me wo number kisi aur row pe na ho tabhi
                if ($customer->phone !== $customerPhone
                    && ! Customer::where('creator_id', $creator->id)->where('phone', $customerPhone)->where('id', '!=', $customer->id)->exists()) {
                    $updates['phone'] = $customerPhone;
                }

                $customer->update($updates);
            }

            return $customer->setRelation('buyer', $buyer);
        });
    }
}
