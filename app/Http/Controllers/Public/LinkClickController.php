<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreLinkClick;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Http\Request;

/** POST /track/click  {username, label} — storefront pe kisi button/link ka click record (analytics "top clicks"). */
class LinkClickController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:50'],
            'label' => ['required', 'string', 'max:150'],
        ]);

        $creatorId = User::where('username', $data['username'])->where('role', 'creator')->value('id');
        $store = $creatorId ? Store::where('user_id', $creatorId)->first() : null;

        if ($store) {
            $visitorId = Visitor::where('store_id', $store->id)->where('session_token', (string) $request->cookie('vt'))->value('id');

            StoreLinkClick::create(['store_id' => $store->id, 'visitor_id' => $visitorId, 'element_label' => $data['label']]);
        }

        return response()->noContent();
    }
}
