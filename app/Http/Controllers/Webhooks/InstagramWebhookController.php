<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\AutodmLog;
use App\Models\AutodmRule;
use Illuminate\Http\Request;

/**
 * Meta (Instagram) webhook:
 *   GET  /webhooks/instagram  — subscription verify (hub.challenge)
 *   POST /webhooks/instagram  — comment events; keyword match => AutodmLog
 *
 * IMPORTANT (schema gaps — abhi ke liye TODO):
 *  1) Instagram account -> creator mapping ka koi column nahi hai (IG OAuth connect flow baad me). Isliye abhi sirf
 *     wahi rules match hote hain jinme `instagram_post_id` set hai. "Saari posts" wale rules (post id null) tabhi
 *     kaam karenge jab ownerForAccount() implement ho.
 *  2) DM asli me bhejne ke liye creator ka IG access token chahiye (store nahi hota). Abhi sirf log banta hai (dm_sent=false).
 */
class InstagramWebhookController extends Controller
{
    /** GET — Meta setup ke waqt */
    public function verify(Request $request)
    {
        $token = (string) config('services.instagram.verify_token');

        if ($request->query('hub_mode') === 'subscribe' && $token !== '' && hash_equals($token, (string) $request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200)->header('Content-Type', 'text/plain');
        }

        abort(403);
    }

    public function handle(Request $request)
    {
        $secret = (string) config('services.instagram.app_secret');
        $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);

        abort_unless($secret !== '' && hash_equals($expected, (string) $request->header('X-Hub-Signature-256')), 400, 'Invalid signature');

        foreach ((array) $request->input('entry', []) as $entry) {
            $ownerId = $this->ownerForAccount($entry['id'] ?? null);

            foreach ((array) ($entry['changes'] ?? []) as $change) {
                if (($change['field'] ?? null) !== 'comments') {
                    continue;
                }

                $value = $change['value'] ?? [];
                $text = (string) ($value['text'] ?? '');
                $mediaId = $value['media']['id'] ?? null;

                if ($text === '' || ! $mediaId) {
                    continue;
                }

                $rules = AutodmRule::where('is_active', true)
                    ->where(function ($q) use ($mediaId, $ownerId) {
                        $q->where('instagram_post_id', $mediaId);
                        if ($ownerId) {
                            $q->orWhere(fn ($w) => $w->whereNull('instagram_post_id')->where('user_id', $ownerId));
                        }
                    })->get();

                foreach ($rules as $rule) {
                    if (mb_stripos($text, $rule->trigger_keyword) === false) {
                        continue;
                    }

                    AutodmLog::create([
                        'rule_id' => $rule->id,
                        'instagram_username' => $value['from']['username'] ?? 'unknown',
                        'comment_text' => mb_substr($text, 0, 1000),
                        'dm_sent' => false, // TODO: Graph API se DM bhejo (queued job) aur success pe true karo
                        'triggered_at' => now(),
                    ]);
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /** TODO: IG business account id -> creator (user id). */
    private function ownerForAccount(?string $accountId): ?int
    {
        return null;
    }
}
