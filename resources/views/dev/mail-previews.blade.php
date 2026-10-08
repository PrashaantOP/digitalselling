<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Email previews</title>
<style>
body { margin: 0; font: 14px/1.5 -apple-system, 'Segoe UI', Roboto, sans-serif; background: #f6f5f2; color: #14141b; display: flex; min-height: 100vh; }
nav { width: 260px; flex-shrink: 0; background: #fff; border-right: 1px solid #e4e2da; padding: 16px; overflow-y: auto; height: 100vh; position: sticky; top: 0; box-sizing: border-box; }
nav h1 { font-size: 15px; margin: 0 0 12px; }
nav a { display: block; padding: 7px 10px; border-radius: 8px; color: #4b4b57; text-decoration: none; font-size: 13px; }
nav a:hover { background: #f6f5f2; }
nav a.on { background: #eef0ff; color: #4338ca; font-weight: 700; }
main { flex: 1; padding: 20px; display: flex; gap: 20px; align-items: flex-start; overflow-x: auto; }
.frame { background: #fff; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; flex-shrink: 0; }
.frame p { margin: 0; padding: 8px 12px; font-size: 12px; color: #8a8a96; border-bottom: 1px solid #f0efea; display: flex; justify-content: space-between; }
.frame a { color: #4f46e5; font-weight: 600; text-decoration: none; }
iframe { border: 0; display: block; height: calc(100vh - 80px); }
</style>
</head>
<body>
<nav>
<h1>Email previews</h1>
@foreach ($mails as $key => $label)
<a href="?mail={{ $key }}" @class(['on' => $key === $current])>{{ $label }}</a>
@endforeach
</nav>
<main>
<div class="frame"><p><span>Phone · 375px</span></p><iframe src="/dev/mails/{{ $current }}" width="375"></iframe></div>
<div class="frame"><p><span>Desktop · 680px</span><span><a href="/dev/mails/{{ $current }}" target="_blank">Open</a> · <a href="/dev/mails/{{ $current }}?text=1" target="_blank">Plain text</a></span></p><iframe src="/dev/mails/{{ $current }}" width="680"></iframe></div>
</main>
</body>
</html>
