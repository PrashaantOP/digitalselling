<?php

namespace App\Services;

/** CSV / JSON / Aiken / GIFT quiz text ko normalized questions me badalta hai. */
class QuizParser
{
    public array $errors = [];

    public function parse(string $format, ?string $raw): array
    {
        $this->errors = [];
        $raw = trim((string) $raw);

        if ($raw === '') {
            return [];
        }

        return match ($format) {
            'json' => $this->fromJson($raw),
            'csv' => $this->fromCsv($raw),
            'aiken' => $this->fromAiken($raw),
            'gift' => $this->fromGift($raw),
            default => [],
        };
    }

    private function norm(string $question, array $options, array $correct): ?array
    {
        $question = trim($question);
        $options = array_values(array_filter(array_map('trim', $options), fn ($o) => $o !== ''));

        if ($question === '' || count($options) < 2) {
            $this->errors[] = "Skipped: '{$question}' (need at least 2 options).";
            return null;
        }

        $options = array_slice($options, 0, 8);
        $correct = array_values(array_unique(array_filter($correct, fn ($i) => isset($options[$i]))));

        if (! $correct) {
            $this->errors[] = "Skipped: '{$question}' (no correct answer marked).";
            return null;
        }

        $type = count($correct) === 1 ? 'single_choice' : 'multiple_choice';

        return [
            'question_text' => mb_substr($question, 0, 2000),
            'type' => $type,
            'options' => array_map(fn ($text, $i) => [
                'text' => mb_substr($text, 0, 500),
                'is_correct' => in_array($i, $correct, true),
            ], $options, array_keys($options)),
        ];
    }

    private function fromJson(string $raw): array
    {
        $decoded = json_decode($raw, true);

        if (is_assoc_array_fallback($decoded)) {
            $decoded = [$decoded];
        }

        if (! is_array($decoded)) {
            $this->errors[] = 'Invalid JSON.';
            return [];
        }

        $out = [];
        foreach ($decoded as $row) {
            if (! is_array($row)) {
                continue;
            }
            $q = $row['question'] ?? $row['question_text'] ?? '';
            $opts = $row['options'] ?? [];
            if (is_string($opts)) {
                $opts = explode('|', $opts);
            }
            $correct = $row['correct'] ?? $row['correct_indexes'] ?? $row['answer'] ?? [];
            $correct = is_array($correct) ? array_map('intval', $correct) : [(int) $correct];
            if ($n = $this->norm((string) $q, array_map('strval', (array) $opts), $correct)) {
                $out[] = $n;
            }
        }

        return $out;
    }

    private function fromCsv(string $raw): array
    {
        $out = [];
        foreach (preg_split('/\r\n|\r|\n/', $raw) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $cols = str_getcsv($line);
            // question, option1..4, correctIndex (0-based; "A/B/C/D" bhi chalega)
            $q = array_shift($cols);
            $last = trim((string) end($cols));
            $correct = [];
            if (preg_match('/^[A-Da-d]$/', $last)) {
                $correct = [ord(strtoupper($last)) - ord('A')];
                array_pop($cols);
            } elseif (is_numeric($last) && count($cols) > 2) {
                $correct = [(int) $last];
                array_pop($cols);
            }
            if ($n = $this->norm((string) $q, $cols, $correct ?: [0])) {
                $out[] = $n;
            }
        }

        return $out;
    }

    private function fromAiken(string $raw): array
    {
        // Aiken: question line, "A. opt" lines, "ANSWER: B"
        $out = [];
        $blocks = preg_split('/\n\s*\n/', $raw);
        foreach ($blocks as $block) {
            $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $block))));
            if (! $lines) {
                continue;
            }
            $answer = null;
            $opts = [];
            $q = array_shift($lines);
            foreach ($lines as $line) {
                if (preg_match('/^ANSWER\s*:\s*([A-H])/i', $line, $m)) {
                    $answer = ord(strtoupper($m[1])) - ord('A');
                } elseif (preg_match('/^[A-H][.)]\s*(.+)$/i', $line, $m)) {
                    $opts[] = $m[1];
                }
            }
            if ($n = $this->norm($q, $opts, $answer === null ? [] : [$answer])) {
                $out[] = $n;
            }
        }

        return $out;
    }

    private function fromGift(string $raw): array
    {
        // Simplified GIFT: "Question { =correct ~wrong ~wrong }"
        $out = [];
        preg_match_all('/([^{}\n][^{]*)\{([^}]+)\}/', $raw, $m, PREG_SET_ORDER);
        foreach ($m as $match) {
            $q = trim($match[1]);
            $opts = [];
            $correct = [];
            foreach (preg_split('/(?=[=~])/', $match[2]) as $piece) {
                $piece = trim($piece);
                if ($piece === '') {
                    continue;
                }
                $isCorrect = str_starts_with($piece, '=');
                $text = trim(ltrim($piece, '=~'));
                if ($text === '') {
                    continue;
                }
                if ($isCorrect) {
                    $correct[] = count($opts);
                }
                $opts[] = $text;
            }
            if ($n = $this->norm($q, $opts, $correct)) {
                $out[] = $n;
            }
        }

        if (! $out) {
            $this->errors[] = 'No GIFT questions found. Use: Question { =correct ~wrong }.';
        }

        return $out;
    }
}

if (! function_exists('is_assoc_array_fallback')) {
    function is_assoc_array_fallback(mixed $v): bool
    {
        return is_array($v) && array_keys($v) !== range(0, count($v) - 1);
    }
}
