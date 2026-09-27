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
            // seeded State dropdown me hi 36 entries hain — 20 ka cap use save hone hi nahi deta tha
            'options' => ['required_if:field_type,dropdown', 'nullable', 'array', 'min:1', 'max:100'],
            'options.*' => ['string', 'max:100'],
            'is_required' => ['sometimes', 'boolean'],
            'is_enabled' => ['sometimes', 'boolean'],
        ];
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate($this->rules());
        // State ek hi hota hai (seeded) — dusra "State" dropdown banega to wo bhi locked ban jayega
        if ($data['field_type'] === 'dropdown' && $data['label'] === 'State') {
            abort_if($product->checkoutQuestions()->get()->contains->isState(), 422, 'State is already a checkout question.');
            $data['options'] = BaseProductController::INDIAN_STATES;
        }
        $data['options'] = $data['field_type'] === 'dropdown' ? array_values($data['options']) : null;

        $question = $product->checkoutQuestions()->create($data + [
            'sort_order' => (int) $product->checkoutQuestions()->max('sort_order') + 1,
        ]);

        return $this->done($request, 'Question added.', ['question' => $question], null, 201);
    }

    public function update(Request $request, CheckoutQuestion $checkoutQuestion)
    {
        $data = $request->validate($this->rules());
        // State: label, type aur states ki list fixed — sirf Show / Required creator ke haath me
        if ($checkoutQuestion->isState()) {
            $data['label'] = $checkoutQuestion->label;
            $data['field_type'] = 'dropdown';
            $data['options'] = BaseProductController::INDIAN_STATES;
        }
        // email/phone checkout pe hamesha collect hote hain — type badalna ya off karna allowed nahi
        if (in_array($checkoutQuestion->field_type, BaseProductController::LOCKED_FIELD_TYPES, true)) {
            $data['field_type'] = $checkoutQuestion->field_type;
            $data['is_required'] = true;
            $data['is_enabled'] = true;
        }
        $data['options'] = $data['field_type'] === 'dropdown' ? array_values($data['options']) : null;

        $checkoutQuestion->update($data);

        return $this->done($request, 'Question updated.', ['question' => $checkoutQuestion]);
    }

    public function destroy(Request $request, CheckoutQuestion $checkoutQuestion)
    {
        abort_if($checkoutQuestion->isState(), 422, 'State cannot be deleted. Turn it off instead.');
        abort_if(in_array($checkoutQuestion->field_type, BaseProductController::LOCKED_FIELD_TYPES, true), 422, 'Email and phone are always collected at checkout.');
        $checkoutQuestion->delete();

        return $this->done($request, 'Question deleted.');
    }
}
