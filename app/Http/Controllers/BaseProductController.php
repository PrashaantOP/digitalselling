<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Course / Event / Book / LockedContent / PaymentPage / Booking-session — sab `products` table pe based hain,
 * isliye list/create/edit/update/publish/duplicate/delete ka common logic yahan hai.
 * Subclass sirf batata hai: type, route param, Inertia folder, detail-table ke rules.
 */
abstract class BaseProductController extends Controller
{
    use RespondsFlexibly;

    /** products.type value */
    abstract protected function type(): string;

    /** route param name (bindings.php me bind hua hai) e.g. 'course' */
    abstract protected function param(): string;

    /** Inertia page folder e.g. 'Courses' => Courses/Index, Courses/Edit */
    abstract protected function view(): string;

    /** route-name prefix e.g. 'courses' => courses.edit */
    abstract protected function routeName(): string;

    /** Detail model class (CourseDetail etc.) ya null (payment_page) */
    protected function detailModel(): ?string
    {
        return null;
    }

    /** Product hasOne relation name e.g. 'courseDetail' */
    protected function detailRelation(): ?string
    {
        return null;
    }

    /** Detail table ke validation rules (keys = column names) */
    protected function detailRules(Product $product): array
    {
        return [];
    }

    /** Draft banate waqt detail row ke default values (NOT NULL columns ke liye) */
    protected function detailDefaults(): array
    {
        return [];
    }

    /** edit page ke liye eager-load */
    protected function editRelations(): array
    {
        return array_filter([
            $this->detailRelation(),
            'coverImages',
            'coupons',
            'checkoutQuestions',
            'addons.addonProduct:id,title,type,price',
        ]);
    }

    /** Publish se pehle extra checks — error messages ka array return karo */
    protected function publishProblems(Product $product): array
    {
        return [];
    }

    /**
     * Index listing me extra withCount (subclass opt-in).
     * e.g. EventController => ['eventRegistrations as registrations_count']
     */
    protected function listCounts(): array
    {
        return [];
    }

    protected function afterStoreRedirect(Product $product): ?string
    {
        return route($this->routeName() . '.edit', $this->routeIdentifier($product));
    }

    /** Dashboard route identifier. Product types can opt into UUID URLs. */
    protected function routeIdentifier(Product $product): int|string
    {
        return $product->id;
    }

    protected function routeIdentifierColumn(): string
    {
        return 'id';
    }

    protected function item(Request $request): Product
    {
        $item = $request->route($this->param());

        // Route bindings normally provide the scoped Product model. When the
        // route cache is active, however, a binding can occasionally arrive
        // as its raw route value. Resolve it here as a safe fallback so edit,
        // publish and update actions continue to work in both cases.
        if ($item instanceof Product) {
            return $item;
        }

        return Product::query()
            ->where('creator_id', $this->tid())
            ->where('type', $this->type())
            ->where($this->routeIdentifierColumn(), $item)
            ->firstOrFail();
    }

    // ------------------------------------------------------------------ actions

    public function index(Request $request)
    {
        $base = Product::where('creator_id', $this->tid())->where('type', $this->type());

        $query = (clone $base)
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->query('search'), fn ($q, $v) => $q->where('title', 'like', "%{$v}%"))
            ->with(array_filter([$this->detailRelation()]));

        if ($counts = $this->listCounts()) {
            $query->withCount($counts);
        }

        $items = $query->latest()->paginate(12)->withQueryString();

        return Inertia::render($this->view() . '/Index', [
            'items' => $items,
            'counts' => (clone $base)->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'pricing_type' => ['nullable', Rule::in(['fixed', 'customer_decides', 'free'])],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product = DB::transaction(function () use ($data) {
            $product = Product::create([
                'creator_id' => $this->tid(),
                'type' => $this->type(),
                'title' => $data['title'],
                'slug' => $this->uniqueSlug($data['title']),
                'status' => 'draft',
                'pricing_type' => $data['pricing_type'] ?? 'fixed',
                'price' => $data['price'] ?? 0,
            ]);

            if ($model = $this->detailModel()) {
                $model::create(['product_id' => $product->id] + $this->detailDefaults());
            }

            return $product;
        });

        return $this->done($request, 'Draft created.', ['id' => $product->id, 'slug' => $product->slug], $this->afterStoreRedirect($product), 201);
    }

    public function edit(Request $request)
    {
        $product = $this->item($request)->load($this->editRelations());

        return Inertia::render($this->view() . '/Edit', [
            'item' => $product,
            'publicUrl' => $this->publicUrl($product),
        ]);
    }

    public function update(Request $request)
    {
        $product = $this->item($request);
        $rules = $this->commonRules($product) + $this->detailRules($product);

        $data = $request->validate($rules);

        if (($data['pricing_type'] ?? $product->pricing_type) === 'free') {
            $data['price'] = 0;
            $data['has_discount'] = false;
            $data['discounted_price'] = null;
        }

        DB::transaction(function () use ($product, $data, $request) {
            $product->update(Arr::except($data, array_keys($this->detailRules($product))));

            if ($relation = $this->detailRelation()) {
                $detailData = Arr::only($data, array_keys($this->detailRules($product)));
                if ($detailData) {
                    $this->saveDetail($product, $detailData, $request);
                }
            }
        });

        return $this->done($request, 'Saved.', ['item' => $product->fresh($this->editRelations())]);
    }

    /** Subclass override kar sakti hai (file uploads etc.) */
    protected function saveDetail(Product $product, array $detailData, Request $request): void
    {
        $product->{$this->detailRelation()}()->updateOrCreate(['product_id' => $product->id], $detailData);
    }

    public function publish(Request $request)
    {
        $product = $this->item($request);
        $status = $request->validate(['status' => ['nullable', Rule::in(['published', 'unpublished'])]])['status'] ?? 'published';

        if ($status === 'published') {
            $problems = $this->basicPublishProblems($product) + $this->publishProblems($product);

            if ($problems) {
                throw ValidationException::withMessages(['publish' => array_values($problems)]);
            }
        }

        $product->update([
            'status' => $status,
            'published_at' => $status === 'published' ? ($product->published_at ?? now()) : $product->published_at,
        ]);

        return $this->done($request, $status === 'published' ? 'Published.' : 'Unpublished.', ['status' => $status]);
    }

    public function duplicate(Request $request)
    {
        $copy = $this->duplicateProduct($this->item($request));

        return $this->done($request, 'Duplicated.', ['id' => $copy->id], $this->afterStoreRedirect($copy), 201);
    }

    public function destroy(Request $request)
    {
        $this->item($request)->delete(); // soft delete — purane orders safe rehte hain

        return $this->done($request, 'Deleted.', [], route($this->routeName() . '.index'));
    }

    // ------------------------------------------------------------------ helpers

    protected function commonRules(Product $product): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            // slug public URL me use hota hai (/c/{slug}) => globally unique rakha hai
            'slug' => ['sometimes', 'required', 'alpha_dash', 'max:150', Rule::unique('products', 'slug')->ignore($product->id)],
            'description' => ['nullable', 'string', 'max:20000'],
            'cover_type' => ['nullable', Rule::in(['image', 'video'])],
            'cover_video_url' => ['nullable', 'url', 'max:500'],
            'pricing_type' => ['sometimes', Rule::in(['fixed', 'customer_decides', 'free'])],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:10000000'],
            'has_discount' => ['sometimes', 'boolean'],
            'discounted_price' => array_merge(['nullable', 'numeric', 'min:0'], request()->has('price') ? ['lt:price'] : []),
            'button_text' => ['sometimes', 'required', 'string', 'max:30'],
            'theme' => ['nullable', 'string', 'max:30'],
            'accent_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'post_purchase_message' => ['nullable', 'string', 'max:255'],
            'terms_and_conditions' => ['nullable', 'string', 'max:20000'],
            'refund_policy' => ['nullable', 'string', 'max:20000'],
            'privacy_policy' => ['nullable', 'string', 'max:20000'],
            'fb_pixel_id' => ['nullable', 'string', 'max:50'],
            'ga_tracking_id' => ['nullable', 'string', 'max:50'],
        ];
    }

    private function basicPublishProblems(Product $product): array
    {
        $p = [];

        if (blank($product->title)) {
            $p['title'] = 'Add a title before publishing.';
        }
        if ($product->pricing_type === 'fixed' && (float) $product->price <= 0) {
            $p['price'] = 'Set a price greater than 0 (or choose Free).';
        }

        return $p;
    }

    protected function uniqueSlug(string $title): string
    {
        $base = Str::slug(Str::limit($title, 60, '')) ?: 'item';
        $slug = $base;

        while (Product::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . Str::lower(Str::random(4));
        }

        return $slug;
    }

    protected function publicUrl(Product $product): string
    {
        $prefix = ['course' => 'c', 'event' => 'e', 'book' => 'b', 'locked_content' => 'l', 'payment_page' => 'p'][$product->type] ?? null;

        return $prefix
            ? url("/{$prefix}/{$product->slug}")
            : url('/book/' . ($product->creator->username ?? ''));
    }

    /** Product + detail + checkout questions + addons ki copy (naya draft). Content-heavy types override karte hain. */
    protected function duplicateProduct(Product $source): Product
    {
        return DB::transaction(function () use ($source) {
            // NOTE: uuid ko replicate NAHI karna — products.uuid unique hai.
            // Neeche naya uuid generate hota hai, warna duplicate save par
            // "Duplicate entry ... for key 'products_uuid_unique'" aata hai.
            $copy = $source->replicate(['uuid', 'sales_count', 'revenue_total', 'views_count', 'published_at']);
            $copy->title = Str::limit($source->title, 135, '') . ' (Copy)';
            $copy->slug = $this->uniqueSlug($copy->title);
            $copy->uuid = (string) Str::uuid();
            $copy->status = 'draft';
            $copy->sales_count = 0;
            $copy->revenue_total = 0;
            $copy->views_count = 0;
            $copy->published_at = null;
            $copy->save();

            if ($relation = $this->detailRelation()) {
                if ($detail = $source->{$relation}) {
                    $newDetail = $detail->replicate();
                    $newDetail->product_id = $copy->id;
                    if (isset($newDetail->total_lessons)) {
                        $newDetail->total_lessons = 0;
                    }
                    $newDetail->save();
                }
            }

            foreach ($source->checkoutQuestions as $q) {
                $c = $q->replicate();
                $c->product_id = $copy->id;
                $c->save();
            }
            foreach ($source->addons as $a) {
                $c = $a->replicate();
                $c->product_id = $copy->id;
                $c->save();
            }

            return $copy;
        });
    }
}
