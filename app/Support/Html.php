<?php

namespace App\Support;

use DOMDocument;
use DOMNode;
use DOMText;

/**
 * Creator ka rich text -> safe HTML.
 *
 * resources/js/components/course-editor/ui.tsx ka sanitizeHtml() sirf editor ka
 * formatting helper hai — attacker editor use hi nahi karta, seedha API pe PUT karta hai.
 * Asli security boundary ye class hai, isliye allowlist dono jagah same rakhna zaroori hai.
 */
class Html
{
    private const ALLOWED = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p'];

    /** Inka content bhi hatana hai, sirf tag nahi. */
    private const DROPPED = ['script', 'style', 'iframe', 'object', 'embed'];

    public static function sanitize(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        // Purane plain-text descriptions me tags nahi hote — inhe seedha DOM me daalne se
        // line breaks gir jaate hain, isliye ui.tsx ke toEditorHtml() jaisa paragraph banao.
        if (! preg_match('/<\/?[a-z][^>]*>/i', $html)) {
            return self::fromPlainText($html);
        }

        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);

        $doc->loadHTML(
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' . $html,
            LIBXML_NONET
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $body = $doc->getElementsByTagName('body')->item(0);

        if (! $body) {
            return '';
        }

        $out = '';

        foreach ($body->childNodes as $node) {
            $out .= self::walk($node);
        }

        return trim($out);
    }

    private static function fromPlainText(string $text): string
    {
        $paragraphs = preg_split('/\R{2,}/', trim($text));

        return collect($paragraphs)
            ->map(fn ($p) => '<p>' . preg_replace('/\R/', '<br>', htmlspecialchars($p, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')) . '</p>')
            ->implode('');
    }

    private static function walk(DOMNode $node): string
    {
        if ($node instanceof DOMText) {
            return htmlspecialchars($node->textContent, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        if ($node->nodeType !== XML_ELEMENT_NODE) {
            return '';
        }

        $tag = strtolower($node->nodeName);

        if (in_array($tag, self::DROPPED, true)) {
            return '';
        }

        $inner = '';

        foreach ($node->childNodes as $child) {
            $inner .= self::walk($child);
        }

        // contentEditable DIV emit karta hai; baaki unknown tags unwrap ho jaate hain
        if ($tag === 'div') {
            $tag = 'p';
        }

        if (! in_array($tag, self::ALLOWED, true)) {
            return $inner;
        }

        return $tag === 'br' ? '<br>' : "<{$tag}>{$inner}</{$tag}>";
    }
}
