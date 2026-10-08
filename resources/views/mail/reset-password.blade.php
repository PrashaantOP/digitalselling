<x-mail::message audience="security" :preheader="'Reset link — it expires in ' . $minutes . ' minutes'">
<x-mail::badge tone="warning">Password reset</x-mail::badge>

# Reset your password

Hi {{ $name ?: 'there' }}, we got a request to reset the password for your account.

<x-mail::button :url="$url">
Choose a new password
</x-mail::button>

This link expires in **{{ $minutes }} minutes** and works once.

<small>If you didn't ask for this, you can ignore this email — your password stays the same.</small>

<x-slot:subcopy>
If the button doesn't work, copy this link into your browser: <span class="break-all">[{{ $url }}]({{ $url }})</span>
</x-slot:subcopy>
</x-mail::message>
