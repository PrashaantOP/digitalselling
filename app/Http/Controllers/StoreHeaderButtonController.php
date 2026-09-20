<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\StoreHeaderButton;
use Illuminate\Http\Request;

class StoreHeaderButtonController extends Controller
{
    use RespondsFlexibly;

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'url' => ['required', 'url', 'max:500'],
            'icon' => ['nullable', 'string', 'max:50'],
        ]);

        $store = StoreController::storeFor($this->tid());

        $button = $store->headerButtons()->create($data + [
            'sort_order' => (int) $store->headerButtons()->max('sort_order') + 1,
        ]);

        return $this->done($request, 'Button added.', ['button' => $button], null, 201);
    }

    public function destroy(Request $request, StoreHeaderButton $headerButton)
    {
        $headerButton->delete();

        return $this->done($request, 'Button removed.');
    }
}
