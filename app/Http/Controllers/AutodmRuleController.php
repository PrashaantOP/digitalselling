<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\AutodmRule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AutodmRuleController extends Controller
{
    use RespondsFlexibly;

    private function rules(): array
    {
        return [
            'trigger_keyword' => ['required', 'string', 'max:100'],
            'dm_message' => ['required', 'string', 'max:1000'],
            'instagram_post_id' => ['nullable', 'string', 'max:100'], // null = saari posts
            'linked_product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('creator_id', $this->tid())],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function index()
    {
        return Inertia::render('Autodm/Index', [
            'rules' => AutodmRule::with('linkedProduct:id,title')->withCount('logs')
                ->withCount(['logs as sent_count' => fn ($q) => $q->where('dm_sent', true)])
                ->where('user_id', $this->tid())->latest()->get(),
            'products' => \App\Models\Product::where('creator_id', $this->tid())->where('status', 'published')->get(['id', 'title', 'type']),
            'recentLogs' => \App\Models\AutodmLog::whereHas('rule', fn ($q) => $q->where('user_id', $this->tid()))
                ->latest('triggered_at')->limit(20)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $rule = AutodmRule::create($request->validate($this->rules()) + ['user_id' => $this->tid()]);

        return $this->done($request, 'AutoDM rule created.', ['rule' => $rule], null, 201);
    }

    public function update(Request $request, AutodmRule $rule)
    {
        $rule->update($request->validate($this->rules()));

        return $this->done($request, 'AutoDM rule updated.', ['rule' => $rule]);
    }

    public function destroy(Request $request, AutodmRule $rule)
    {
        $rule->delete();

        return $this->done($request, 'AutoDM rule deleted.');
    }
}
