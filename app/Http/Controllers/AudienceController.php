<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\Customer;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AudienceController extends Controller
{
    use RespondsFlexibly;

    public function index(Request $request)
    {
        return Inertia::render('Audience/Index', [
            'tab' => 'customers',
            'customers' => $this->customers($request)->latest('joined_at')->paginate(20)->withQueryString(),
            'filters' => $request->only('search'),
        ]);
    }

    public function visitors(Request $request)
    {
        $store = StoreController::storeFor($this->tid());

        return Inertia::render('Audience/Index', [
            'tab' => 'visitors',
            'visitors' => Visitor::where('store_id', $store->id)
                ->when($request->query('search'), fn ($q, $v) => $q->where(fn ($s) => $s->where('name', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
                ->latest('last_seen_at')->paginate(20)->withQueryString(),
            'filters' => $request->only('search'),
        ]);
    }

    public function export(Request $request)
    {
        $type = $request->query('type') === 'visitors' ? 'visitors' : 'customers';

        return response()->streamDownload(function () use ($type, $request) {
            $out = fopen('php://output', 'w');

            if ($type === 'customers') {
                fputcsv($out, ['Name', 'Email', 'Phone', 'Orders', 'Total spent', 'First purchase', 'Joined']);
                $this->customers($request)->orderBy('id')->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $c) {
                        fputcsv($out, [$c->name, $c->email, $c->phone, $c->total_orders, $c->total_spent, $c->first_purchase_at, $c->joined_at]);
                    }
                });
            } else {
                $store = StoreController::storeFor($this->tid());
                fputcsv($out, ['Name', 'Phone', 'Customer', 'Visits', 'Pages', 'Country', 'City', 'Device', 'Browser', 'First seen', 'Last seen']);
                Visitor::where('store_id', $store->id)->orderBy('id')->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $v) {
                        fputcsv($out, [$v->name, $v->phone, $v->is_customer ? 'yes' : 'no', $v->visits_count, $v->pages_count, $v->country, $v->city, $v->device, $v->browser, $v->first_seen_at, $v->last_seen_at]);
                    }
                });
            }
            fclose($out);
        }, "audience-{$type}-" . now()->format('Ymd') . '.csv', ['Content-Type' => 'text/csv']);
    }

    private function customers(Request $request)
    {
        return Customer::where('creator_id', $this->tid())
            ->when($request->query('search'), fn ($q, $v) => $q->where(fn ($s) => $s
                ->where('name', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")));
    }
}
