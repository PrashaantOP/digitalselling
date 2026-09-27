<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\BaseProductController;
use App\Http\Controllers\Controller;
use App\Mail\BookingConfirmedMail;
use App\Mail\NewBookingMail;
use App\Models\AvailabilityException;
use App\Models\Booking;
use App\Models\BookingResponse;
use App\Models\CheckoutQuestion;
use App\Models\CreatorAvailability;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use App\Services\SlotService;
use App\Support\CalendarLink;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Public booking page: /book/{username}
 * Abhi sirf free sessions book hote hain — paid sessions dikhte hain par payment pipeline
 * (OrderService / Razorpay) banne tak unka button band hai.
 */
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

    /**
     * Customer se poochne wale extra sawaal. Email/phone upar ke fixed fields hain aur
     * GSTIN/State booking pe nahi maangte — isliye ye list me nahi aate.
     */
    private function customQuestions(Product $product): Collection
    {
        return $product->checkoutQuestions
            ->where('is_enabled', true)
            ->reject(fn (CheckoutQuestion $q) => in_array($q->field_type, BaseProductController::LOCKED_FIELD_TYPES, true)
                || $q->isState()
                || preg_match('/gstin/i', $q->label))
            ->sortBy('sort_order')
            ->values();
    }

    private static function isFree(Product $product): bool
    {
        return $product->pricing_type === 'free';
    }

    public function show(string $username)
    {
        $creator = $this->creator($username);

        $services = Product::with(['bookingServiceDetail', 'checkoutQuestions'])
            ->where('creator_id', $creator->id)->where('type', 'booking')->where('status', 'published')
            ->whereHas('bookingServiceDetail', fn ($q) => $q->where('is_active', true))
            ->oldest()
            ->get()
            ->map(fn (Product $p) => $p->only(['id', 'title', 'slug', 'pricing_type', 'price', 'has_discount', 'discounted_price', 'button_text'])
                + [
                    'description' => str($p->description)->stripTags()->squish()->limit(220)->toString(),
                    'duration_minutes' => $p->bookingServiceDetail->duration_minutes,
                    'bookable' => self::isFree($p),
                    'questions' => $this->customQuestions($p)->map->only(['id', 'label', 'field_type', 'options', 'is_required'])->values(),
                ]);

        abort_if($services->isEmpty(), 404);

        $timezone = SlotService::timezoneFor($creator->id);

        return Inertia::render('Public/BookingPage', [
            'creator' => $creator->only(['name', 'username', 'avatar']),
            'services' => $services,
            'timezone' => $timezone,
            // date strip pe band din pehle se grey dikhen — har din ke liye slots API call na karni pade
            'availableWeekdays' => CreatorAvailability::where('user_id', $creator->id)->where('is_enabled', true)->pluck('weekday')->map(fn ($d) => (int) $d)->values(),
            'blockedDates' => AvailabilityException::where('user_id', $creator->id)->where('is_blocked', true)
                ->whereBetween('date', [now($timezone)->toDateString(), now($timezone)->addDays(60)->toDateString()])
                ->pluck('date')->map(fn ($d) => $d->toDateString())->values(),
        ]);
    }

    /** GET /book/{username}/slots?service={slug}&date=YYYY-MM-DD */
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

    /** POST /book/{username}/{serviceSlug} — free session ki booking turant confirm. */
    public function store(Request $request, string $username, string $serviceSlug, SlotService $slots)
    {
        $creator = $this->creator($username);
        $product = $this->service($creator, $serviceSlug)->load('checkoutQuestions');
        $service = $product->bookingServiceDetail;

        abort_unless(self::isFree($product), 422, 'Online payment for sessions is coming soon.');

        $questions = $this->customQuestions($product);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'slot' => ['required', 'date'],
            'answers' => ['nullable', 'array'],
            // answers.{question_id} — required sawaal server pe bhi zaroori, dropdown me sirf diye gaye options
            ...$questions->mapWithKeys(fn (CheckoutQuestion $q) => ["answers.{$q->id}" => array_filter([
                $q->is_required ? 'required' : 'nullable',
                'string',
                'max:255',
                $q->field_type === 'dropdown' ? Rule::in($q->options ?? []) : null,
                $q->field_type === 'email' ? 'email' : null,
                $q->field_type === 'number' ? 'numeric' : null,
            ])])->all(),
        ], [], $questions->mapWithKeys(fn (CheckoutQuestion $q) => ["answers.{$q->id}" => $q->label])->all());

        // TODO (Auth module): phone OTP verification check

        $booking = DB::transaction(function () use ($creator, $service, $data, $slots, $questions) {
            // isi creator ki dusri simultaneous booking ko wait karao — double booking se bachne ke liye
            User::whereKey($creator->id)->lockForUpdate()->first();

            if (! $slots->isAvailable($creator->id, $service, $data['slot'])) {
                throw ValidationException::withMessages(['slot' => 'Sorry, this slot was just taken. Please pick another.']);
            }

            $customer = Customer::updateOrCreate(
                ['creator_id' => $creator->id, 'phone' => $data['phone']],
                ['name' => $data['name'], 'email' => $data['email']],
            );

            $booking = Booking::create([
                'booking_service_id' => $service->id,
                'creator_id' => $creator->id,
                'customer_id' => $customer->id,
                'order_id' => null, // free — SlotService::confirmed() isse turant pakki booking maanta hai
                'scheduled_at' => CarbonImmutable::parse($data['slot'])->utc(),
                'duration_minutes' => $service->duration_minutes,
                'meeting_link' => $service->default_meeting_link,
                'status' => 'upcoming',
            ]);

            foreach ($questions as $question) {
                $answer = trim((string) ($data['answers'][$question->id] ?? ''));
                if ($answer !== '') {
                    BookingResponse::create(['booking_id' => $booking->id, 'question_label' => $question->label, 'answer' => $answer]);
                }
            }

            return $booking;
        });

        $booking->load(['customer', 'responses']);
        $timezone = SlotService::timezoneFor($creator->id);
        $calendarUrl = CalendarLink::google(
            "{$product->title} with {$creator->name}",
            $booking->scheduled_at,
            $booking->duration_minutes,
            $booking->meeting_link ? "Join: {$booking->meeting_link}" : null,
            $booking->meeting_link,
        );

        $this->sendEmails($booking, $product, $creator, $timezone, $calendarUrl);

        return response()->json([
            'booking' => [
                'scheduled_at' => $booking->scheduled_at->toIso8601String(),
                'duration_minutes' => $booking->duration_minutes,
                'session' => $product->title,
                'meeting_link' => $booking->meeting_link,
                'calendar_url' => $calendarUrl,
                'email' => $booking->customer->email,
            ],
        ], 201);
    }

    /** Mail fail ho to booking fail nahi honi chahiye — sirf report karo. */
    private function sendEmails(Booking $booking, Product $product, User $creator, string $timezone, string $calendarUrl): void
    {
        try {
            Mail::to($booking->customer->email)->send(new BookingConfirmedMail($booking, $product->title, $creator->name, $timezone, $calendarUrl));
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            Mail::to($creator->email)->send(new NewBookingMail($booking, $product->title, $timezone));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
