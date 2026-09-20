<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingResponse;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use App\Services\SlotService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/** Public booking page: /book/{username} */
class BookingPageController extends Controller
{
    private function creator(string $username): User
    {
        return User::where('username', $username)->where('role', 'creator')->where('status', 'active')->firstOrFail();
    }

    private function service(User $creator, string $slug): Product
    {
        $product = Product::with('bookingServiceDetail')
            ->where('creator_id', $creator->id)->where('type', 'booking')->where('status', 'published')
            ->where('slug', $slug)->firstOrFail();

        abort_unless($product->bookingServiceDetail?->is_active, 404);

        return $product;
    }

    public function show(string $username)
    {
        $creator = $this->creator($username);

        $services = Product::with(['bookingServiceDetail', 'checkoutQuestions'])
            ->where('creator_id', $creator->id)->where('type', 'booking')->where('status', 'published')
            ->whereHas('bookingServiceDetail', fn ($q) => $q->where('is_active', true))
            ->get()
            ->map(fn (Product $p) => $p->only(['id', 'title', 'slug', 'description', 'pricing_type', 'price', 'has_discount', 'discounted_price', 'button_text'])
                + ['duration_minutes' => $p->bookingServiceDetail->duration_minutes]
                + ['checkout_questions' => $p->checkoutQuestions->sortBy('sort_order')->values()->map->only(['id', 'label', 'field_type', 'options', 'is_required'])]);

        abort_if($services->isEmpty(), 404);

        return Inertia::render('Public/BookingPage', [
            'creator' => $creator->only(['name', 'username', 'avatar']),
            'services' => $services,
            'timezone' => $creator->availabilities()->value('timezone') ?? 'Asia/Kolkata',
        ]);
    }

    /** GET /book/{username}/slots?service={slug}&date=YYYY-MM-DD  (axios) */
    public function availableSlots(Request $request, string $username, SlotService $slots)
    {
        $data = $request->validate([
            'service' => ['required', 'string'],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:yesterday', 'before:+120 days'],
        ]);

        $creator = $this->creator($username);
        $product = $this->service($creator, $data['service']);

        return response()->json([
            'date' => $data['date'],
            'slots' => $slots->slots($creator->id, $product->bookingServiceDetail, $data['date']),
        ]);
    }

    /** POST /book/{username}/{serviceSlug} — slot hold + pending order + Razorpay payload */
    public function store(Request $request, string $username, string $serviceSlug, SlotService $slots, OrderService $orders)
    {
        $creator = $this->creator($username);
        $product = $this->service($creator, $serviceSlug)->setRelation('creator', $creator);
        $service = $product->bookingServiceDetail;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'slot' => ['required', 'date'],
            'coupon_code' => ['nullable', 'string', 'max:30'],
            'answers' => ['nullable', 'array'],
        ]);

        // TODO (Auth module): phone OTP verification check

        $order = DB::transaction(function () use ($creator, $product, $service, $data, $slots, $orders) {
            // isi creator ki dusri simultaneous booking ko wait karao — double booking se bachne ke liye
            User::whereKey($creator->id)->lockForUpdate()->first();

            if (! $slots->isAvailable($creator->id, $service, $data['slot'])) {
                throw ValidationException::withMessages(['slot' => 'Sorry, this slot was just taken. Please pick another.']);
            }

            $order = $orders->createPending($product, [
                'name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone'],
            ], ['coupon_code' => $data['coupon_code'] ?? null, 'answers' => $data['answers'] ?? []]);

            $booking = Booking::create([
                'booking_service_id' => $service->id,
                'creator_id' => $creator->id,
                'customer_id' => $order->customer_id,
                'order_id' => $order->id,
                'scheduled_at' => Carbon::parse($data['slot'])->utc(),
                'duration_minutes' => $service->duration_minutes,
                'status' => 'upcoming',
            ]);

            foreach ($order->checkoutAnswers()->with('question:id,label')->get() as $answer) {
                BookingResponse::create([
                    'booking_id' => $booking->id,
                    'question_label' => $answer->question?->label ?? 'Question',
                    'answer' => $answer->answer,
                ]);
            }

            return $order;
        });

        return response()->json($orders->initiatePayment($order), 201);
    }
}
