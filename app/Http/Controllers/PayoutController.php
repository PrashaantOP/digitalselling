<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Order;
use App\Models\Payout;
use App\Models\PayoutMethod;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PayoutController extends Controller
{
    use RespondsFlexibly;

    private const MIN_PAYOUT = 100;

    /** available = successful orders ka net - (pending + processing + paid payouts) */
    public static function balance(int $creatorId): array
    {
        $earned = (float) Order::where('creator_id', $creatorId)->where('status', 'success')->sum('net_payout_amount');
        $reserved = (float) Payout::where('user_id', $creatorId)->whereIn('status', ['pending', 'processing', 'paid'])->sum('amount');

        return [
            'earned' => $earned,
            'paid_out' => (float) Payout::where('user_id', $creatorId)->where('status', 'paid')->sum('amount'),
            'in_process' => (float) Payout::where('user_id', $creatorId)->whereIn('status', ['pending', 'processing'])->sum('amount'),
            'available' => max(round($earned - $reserved, 2), 0),
        ];
    }

    public function index()
    {
        $owner = \App\Support\Tenant::creator();

        return Inertia::render('Payouts/Index', [
            'balance' => self::balance($owner->id),
            'payouts' => Payout::with('payoutMethod')->where('user_id', $owner->id)->latest('requested_at')->paginate(15),
            'methods' => PayoutMethod::where('user_id', $owner->id)->get(),
            'kycStatus' => $owner->kycVerification?->status ?? 'not_started',
            'minPayout' => self::MIN_PAYOUT,
        ]);
    }

    public function store(Request $request)
    {
        $owner = \App\Support\Tenant::creator();

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:' . self::MIN_PAYOUT],
            'payout_method_id' => ['required', 'integer'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        if ($owner->kycVerification?->status !== 'verified') {
            throw ValidationException::withMessages(['amount' => 'Complete KYC verification before requesting a payout.']);
        }

        $method = PayoutMethod::where('user_id', $owner->id)->findOrFail($data['payout_method_id']);

        $payout = DB::transaction(function () use ($owner, $data, $method) {
            User::whereKey($owner->id)->lockForUpdate()->first(); // double-request race se bachne ke liye

            if ($data['amount'] > self::balance($owner->id)['available']) {
                throw ValidationException::withMessages(['amount' => 'Amount exceeds your available balance.']);
            }

            return Payout::create([
                'user_id' => $owner->id,
                'payout_method_id' => $method->id,
                'amount' => $data['amount'],
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'requested_at' => now(),
            ]);
        });

        return $this->done($request, 'Payout requested.', ['payout' => $payout], null, 201);
    }
}
