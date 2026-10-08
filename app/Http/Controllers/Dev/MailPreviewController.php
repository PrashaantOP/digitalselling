<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Support\MailPreviews;
use Illuminate\Http\Request;

/**
 * /dev/mails — saare emails ek jagah, phone (375px) aur desktop dono size me. Sirf APP_ENV=local
 * (routes/web.php me tabhi register hota hai). Sample data MailPreviews se — DB me kuch nahi likhta.
 */
class MailPreviewController extends Controller
{
    public function index(Request $request)
    {
        $mails = MailPreviews::all();
        $current = array_key_exists((string) $request->query('mail'), $mails) ? (string) $request->query('mail') : array_key_first($mails);

        return response()->view('dev.mail-previews', [
            'mails' => collect($mails)->map(fn ($m) => $m['label']),
            'current' => $current,
        ]);
    }

    public function show(Request $request, string $mail)
    {
        $preview = MailPreviews::all()[$mail] ?? abort(404);
        $mailable = ($preview['make'])();

        if ($request->boolean('text') && $mailable instanceof \Illuminate\Mail\Mailable) {
            return response('<pre style="white-space: pre-wrap; font: 13px/1.5 monospace; padding: 16px;">' . e($mailable->render() ? $this->text($mailable) : '') . '</pre>');
        }

        return response($mailable->render());
    }

    /** Plain-text version (jo text-only mail apps dikhate hain). */
    private function text(\Illuminate\Mail\Mailable $mailable): string
    {
        $content = $mailable->content();

        return (string) app(\Illuminate\Mail\Markdown::class)->renderText($content->markdown, array_merge($mailable->buildViewData(), $content->with));
    }
}
