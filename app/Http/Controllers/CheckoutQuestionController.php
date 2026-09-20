<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CheckoutQuestion;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared — checkout pe extra sawaal (text/phone/email/number/dropdown). */
class CheckoutQuestionController extends Controller
{
    use RespondsFlexibly;

    private function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:150'],
            'field_type' => ['required', Rule::in(['text', 'phone', 'email', 'number', 'dropdown'])],
            'options' => ['required_if:field_type,dropdown', 'nullable', 'array', 'min:1', 'max:20'],
            'options.*' => ['string', 'max:100'],
            'is_required' => ['sometimes', 'boolean'],
        ];
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate($this->rules());
        $data['options'] = $data['field_type'] === 'dropdown' ? array_values($data['options']) : null;

        $question = $product->checkoutQuestions()->create($data + [
            'sort_order' => (int) $product->checkoutQuestions()->max('sort_order') + 1,
        ]);

        return $this->done($request, 'Question added.', ['question' => $question], null, 201);
    }

    public function update(Request $request, CheckoutQuestion $checkoutQuestion)
    {
        $data = $request->validate($this->rules());
        $data['options'] = $data['field_type'] === 'dropdown' ? array_values($data['options']) : null;

        $checkoutQuestion->update($data);

        return $this->done($request, 'Question updated.', ['question' => $checkoutQuestion]);
    }

    public function destroy(Request $request, CheckoutQuestion $checkoutQuestion)
    {
        $checkoutQuestion->delete();

        return $this->done($request, 'Question deleted.');
    }
}
