<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Course page ke 6 optional sections ka ek generic controller:
 *   instructions | benefits | faqs | testimonials | highlights | gallery
 *
 * Body:
 *   is_enabled : bool                  (section on/off — sab items pe apply, jab tak item apna flag na bheje)
 *   items      : [{id?, is_enabled?, ...fields}]   (poori list, top→bottom — missing ids delete ho jaate hain)
 * Testimonials me `avatar`, gallery me `image` file (multipart) aa sakti hai.
 */
class CourseSectionController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    /** type => [relation, text fields => rule, file field (request) => db column] */
    private const SECTIONS = [
        'instructions' => ['relation' => 'instructions', 'fields' => ['text' => 'required|string|max:255']],
        'benefits' => ['relation' => 'benefits', 'fields' => ['text' => 'required|string|max:255']],
        'highlights' => ['relation' => 'highlights', 'fields' => ['text' => 'required|string|max:255']],
        'faqs' => ['relation' => 'faqs', 'fields' => ['question' => 'required|string|max:255', 'answer' => 'required|string|max:5000']],
        'testimonials' => ['relation' => 'testimonials', 'fields' => ['name' => 'required|string|max:150', 'message' => 'required|string|max:2000'], 'file' => ['avatar', 'avatar_path']],
        'gallery' => ['relation' => 'galleryItems', 'fields' => [], 'file' => ['image', 'image_path'], 'file_required' => true],
    ];

    public function update(Request $request, Product $course, string $type)
    {
        $cfg = self::SECTIONS[$type] ?? abort(404);

        $detail = $course->courseDetail;
        abort_unless($detail, 422, 'Course details are missing for this product.');

        $rules = [
            'is_enabled' => ['sometimes', 'boolean'],
            'items' => ['present', 'array', 'max:50'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.is_enabled' => ['sometimes', 'boolean'],
        ];
        foreach ($cfg['fields'] as $field => $rule) {
            $rules["items.*.$field"] = explode('|', $rule);
        }
        if (isset($cfg['file'])) {
            $rules['items.*.' . $cfg['file'][0]] = ['nullable', 'image', 'max:5120'];
        }

        $data = $request->validate($rules);

        $relation = $detail->{$cfg['relation']}();
        $existing = $relation->get()->keyBy('id');
        $keep = [];

        DB::transaction(function () use ($request, $data, $cfg, $relation, $existing, &$keep) {
            foreach (array_values($data['items']) as $i => $item) {
                $model = ! empty($item['id']) && $existing->has($item['id']) ? $existing[$item['id']] : $relation->getRelated()->newInstance();

                foreach (array_keys($cfg['fields']) as $field) {
                    $model->{$field} = $item[$field];
                }

                if (isset($cfg['file'])) {
                    [$requestKey, $column] = $cfg['file'];
                    if ($request->hasFile("items.$i.$requestKey")) {
                        $this->deletePublic($model->{$column});
                        $model->{$column} = $this->putPublic($request->file("items.$i.$requestKey"), 'course');
                    } elseif (! empty($cfg['file_required']) && ! $model->{$column}) {
                        throw ValidationException::withMessages(["items.$i.$requestKey" => 'An image is required.']);
                    }
                }

                $model->course_id = $relation->getParent()->id;
                $model->is_enabled = $item['is_enabled'] ?? ($data['is_enabled'] ?? $model->is_enabled ?? true);
                $model->sort_order = $i;
                $model->save();

                $keep[] = $model->id;
            }

            foreach ($existing->except($keep) as $gone) {
                if (isset($cfg['file'])) {
                    $this->deletePublic($gone->{$cfg['file'][1]});
                }
                $gone->delete();
            }
        });

        return $this->done($request, ucfirst($type) . ' saved.', [
            'items' => $detail->{$cfg['relation']}()->orderBy('sort_order')->get(),
        ]);
    }
}
