import { cn } from '@/lib/utils';
import { Check, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { firstError, send } from './api';
import { type CheckoutQuestion, type Coupon, DEFAULT_ACCENT, type FormState, HEX_RE, type ThemeKey } from './types';
import { Field, IconBtn, INPUT, invalid, Notice, PanelTitle, TEXTAREA, Toggle } from './ui';

const THEMES: { key: ThemeKey; title: string; hint: string }[] = [
    { key: 'default', title: 'Default', hint: 'Warm paper, ink text' },
    { key: 'light', title: 'Light', hint: 'Clean white' },
    { key: 'dark', title: 'Dark', hint: 'Ink background' },
];

const SWATCHES = ['#2563EB', '#059669', '#B91C1C', '#7C3AED', '#EA580C', '#DB2777'];

const FIELD_TYPES: { key: CheckoutQuestion['field_type']; label: string }[] = [
    { key: 'text', label: 'Text' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'number', label: 'Number' },
    { key: 'dropdown', label: 'Dropdown' },
];

/* ------------------------------------------------------------------ */
/*  Checkout questions                                                 */
/* ------------------------------------------------------------------ */

function QuestionRow({ productId, question, onCancel }: { productId: number; question: CheckoutQuestion | null; onCancel?: () => void }) {
    const [label, setLabel] = useState(question?.label ?? '');
    const [type, setType] = useState<CheckoutQuestion['field_type']>(question?.field_type ?? 'text');
    const [options, setOptions] = useState((question?.options ?? []).join('\n'));
    const [required, setRequired] = useState(question?.is_required ?? true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const optionList = options.split('\n').map((o) => o.trim()).filter(Boolean);
    const valid = label.trim() !== '' && (type !== 'dropdown' || optionList.length > 0);
    const dirty = !question || label.trim() !== question.label || type !== question.field_type || required !== question.is_required || (type === 'dropdown' && optionList.join('\n') !== (question.options ?? []).join('\n'));

    async function save() {
        if (!valid) return;
        setBusy(true);
        setError(null);
        const payload = { label: label.trim(), field_type: type, is_required: required, ...(type === 'dropdown' ? { options: optionList } : {}) };
        const res = question ? await send('put', `/dashboard/checkout-questions/${question.id}`, payload) : await send('post', `/dashboard/products/${productId}/checkout-questions`, payload);
        setBusy(false);
        if (res.ok) onCancel?.();
        else setError(firstError(res.errors, 'Could not save the question.'));
    }

    async function remove() {
        if (!question) return onCancel?.();
        setBusy(true);
        setError(null);
        const res = await send('delete', `/dashboard/checkout-questions/${question.id}`);
        setBusy(false);
        if (!res.ok) setError(firstError(res.errors, 'Could not delete the question.'));
    }

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-[#E4E2DA] bg-white p-3">
            <div className="flex items-center gap-2">
                <input aria-label="Question label" value={label} maxLength={150} onChange={(e) => setLabel(e.target.value)} placeholder="Question label" className={INPUT} />
                <select aria-label="Answer type" value={type} onChange={(e) => setType(e.target.value as CheckoutQuestion['field_type'])} className="h-10 shrink-0 rounded-lg border border-[#E4E2DA] bg-white px-2 text-sm text-[#14141B] outline-none focus:border-[#4F46E5]">
                    {FIELD_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>
            {type === 'dropdown' && <textarea aria-label="Dropdown options" rows={3} value={options} onChange={(e) => setOptions(e.target.value)} placeholder={'One option per line\nBeginner\nIntermediate'} className={TEXTAREA} />}
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#14141B]">
                    Required <Toggle checked={required} onChange={setRequired} label="Required" />
                </label>
                <span className="flex-1" />
                {dirty && (
                    <button type="button" onClick={save} disabled={!valid || busy} className="flex h-8 items-center gap-1 rounded-lg bg-[#4F46E5] px-3 text-xs font-semibold text-white hover:bg-[#4338CA] disabled:opacity-50">
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} {question ? 'Save' : 'Add'}
                    </button>
                )}
                <IconBtn label={question ? 'Delete question' : 'Cancel'} danger onClick={remove} disabled={busy}>
                    <X className="size-4" />
                </IconBtn>
            </div>
            {error && <Notice tone="error">{error}</Notice>}
        </div>
    );
}

function CheckoutQuestions({ productId, questions }: { productId: number; questions: CheckoutQuestion[] }) {
    const [adding, setAdding] = useState(false);
    return (
        <div className="flex flex-col gap-3">
            <PanelTitle>Checkout experience</PanelTitle>
            <p className="-mt-2 text-sm text-[#6B6B78]">Buyers sign in with phone OTP, then answer these questions before payment.</p>
            {questions.map((q) => (
                <QuestionRow key={`${q.id}:${q.label}:${q.field_type}:${q.is_required}:${(q.options ?? []).join('|')}`} productId={productId} question={q} />
            ))}
            {adding && <QuestionRow productId={productId} question={null} onCancel={() => setAdding(false)} />}
            {!adding && (
                <button type="button" onClick={() => setAdding(true)} className="w-fit text-sm font-semibold text-[#4F46E5] hover:underline">
                    + Add question
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Coupons                                                            */
/* ------------------------------------------------------------------ */

function isExpired(c: Coupon) {
    return Boolean(c.expires_at && new Date(c.expires_at).getTime() < Date.now());
}

function Coupons({ productId, coupons }: { productId: number; coupons: Coupon[] }) {
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState('');
    const [percent, setPercent] = useState('');
    const [limit, setLimit] = useState('');
    const [expires, setExpires] = useState('');
    const [busy, setBusy] = useState<number | 'new' | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const valid = /^[A-Za-z0-9_-]{3,30}$/.test(code) && Number(percent) >= 1 && Number(percent) <= 100;

    async function create() {
        if (!valid) return;
        setBusy('new');
        setErrors({});
        const res = await send('post', `/dashboard/products/${productId}/coupons`, {
            code: code.trim(),
            discount_percent: Number(percent),
            usage_limit: limit ? Number(limit) : null,
            expires_at: expires || null,
            is_active: true,
        });
        setBusy(null);
        if (res.ok) {
            setOpen(false);
            setCode('');
            setPercent('');
            setLimit('');
            setExpires('');
        } else setErrors(res.errors);
    }

    async function toggle(c: Coupon, is_active: boolean) {
        setBusy(c.id);
        setError(null);
        const res = await send('put', `/dashboard/coupons/${c.id}`, { code: c.code, discount_percent: Number(c.discount_percent), usage_limit: c.usage_limit, expires_at: c.expires_at, is_active });
        setBusy(null);
        if (!res.ok) setError(firstError(res.errors, 'Could not update the coupon.'));
    }

    async function remove(c: Coupon) {
        setBusy(c.id);
        setError(null);
        const res = await send('delete', `/dashboard/coupons/${c.id}`);
        setBusy(null);
        if (!res.ok) setError(firstError(res.errors, 'Could not delete the coupon.'));
    }

    return (
        <div className="flex flex-col gap-3">
            <PanelTitle>Discount coupons</PanelTitle>
            {error && <Notice tone="error">{error}</Notice>}
            {coupons.length === 0 && !open && <p className="rounded-xl border border-dashed border-[#DAD8D0] bg-[#FAF9F5] p-4 text-center text-xs text-[#8A8A96]">No coupons yet. Create one to run a launch offer.</p>}
            {coupons.map((c) => {
                const expired = isExpired(c);
                return (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-[#E4E2DA] bg-white px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-bold text-[#14141B]">
                                <span className="font-mono">{c.code}</span>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">{Number(c.discount_percent)}% off</span>
                                {expired && <span className="rounded-full bg-[#FFEDE8] px-2 py-0.5 text-[10px] font-bold text-[#C2410C]">Expired</span>}
                            </p>
                            <p className="text-xs text-[#8A8A96]">
                                {c.used_count}
                                {c.usage_limit ? ` / ${c.usage_limit}` : ''} used · {c.expires_at ? `expires ${new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'no expiry'}
                            </p>
                        </div>
                        <Toggle checked={c.is_active} disabled={busy === c.id || expired} onChange={(v) => toggle(c, v)} label={`Coupon ${c.code} active`} />
                        <IconBtn label={`Delete coupon ${c.code}`} danger disabled={busy === c.id} onClick={() => remove(c)}>
                            <Trash2 className="size-4" />
                        </IconBtn>
                    </div>
                );
            })}

            {open ? (
                <div className="flex flex-col gap-3 rounded-xl border border-[#4F46E5]/30 bg-[#F8F8FF] p-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Code" htmlFor="coupon_code" required error={errors.code}>
                            <input id="coupon_code" value={code} maxLength={30} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())} placeholder="LAUNCH20" className={cn(INPUT, 'font-mono', invalid(errors.code))} />
                        </Field>
                        <Field label="Discount %" htmlFor="coupon_percent" required error={errors.discount_percent}>
                            <input id="coupon_percent" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value.replace(/[^\d.]/g, ''))} placeholder="20" className={cn(INPUT, invalid(errors.discount_percent))} />
                        </Field>
                        <Field label="Usage limit" htmlFor="coupon_limit" error={errors.usage_limit} hint="Blank = unlimited">
                            <input id="coupon_limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} className={cn(INPUT, invalid(errors.usage_limit))} />
                        </Field>
                        <Field label="Expires" htmlFor="coupon_expires" error={errors.expires_at} hint="Blank = never">
                            <input id="coupon_expires" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={cn(INPUT, invalid(errors.expires_at))} />
                        </Field>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={create} disabled={!valid || busy === 'new'} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white hover:bg-[#4338CA] disabled:opacity-50">
                            {busy === 'new' && <Loader2 className="size-4 animate-spin" />} Create coupon
                        </button>
                        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-3 text-sm font-semibold text-[#4B4B57] hover:bg-white">
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-fit items-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white px-4 text-sm font-semibold text-[#14141B] hover:bg-[#F6F5F2]">
                    <Plus className="size-4" /> Create coupon
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Tab                                                                */
/* ------------------------------------------------------------------ */

export function SettingsTab({
    productId,
    form,
    setField,
    errors,
    questions,
    coupons,
}: {
    productId: number;
    form: FormState;
    setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    errors: Record<string, string>;
    questions: CheckoutQuestion[];
    coupons: Coupon[];
}) {
    const accentValid = HEX_RE.test(form.accent_color);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
                <PanelTitle>Theme and styling</PanelTitle>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
                    {THEMES.map((t) => {
                        const active = form.theme === t.key;
                        return (
                            <button key={t.key} type="button" role="radio" aria-checked={active} onClick={() => setField('theme', t.key)} className={cn('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition', active ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E4E2DA] bg-white hover:bg-[#F6F5F2]')}>
                                <span className="flex w-full items-center justify-between text-sm font-bold text-[#14141B]">
                                    {t.title}
                                    <span className={cn('flex size-4 items-center justify-center rounded-full border', active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#DAD8D0]')}>{active && <Check className="size-3" />}</span>
                                </span>
                                <span className="text-[11px] text-[#6B6B78]">{t.hint}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[#14141B]">Accent colour</span>
                    <div className="flex flex-wrap items-center gap-2.5">
                        {SWATCHES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Accent ${c}`}
                                aria-pressed={form.accent_color.toLowerCase() === c.toLowerCase()}
                                onClick={() => setField('accent_color', c)}
                                style={{ background: c }}
                                className={cn('flex size-9 items-center justify-center rounded-full text-white ring-offset-2 transition', form.accent_color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-[#14141B]' : 'hover:scale-105')}
                            >
                                {form.accent_color.toLowerCase() === c.toLowerCase() && <Check className="size-4" />}
                            </button>
                        ))}
                        <label className="relative size-9 cursor-pointer overflow-hidden rounded-md border border-[#E4E2DA]" style={{ background: accentValid ? form.accent_color : DEFAULT_ACCENT }}>
                            <input type="color" aria-label="Custom accent colour" value={accentValid ? form.accent_color : DEFAULT_ACCENT} onChange={(e) => setField('accent_color', e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                        </label>
                    </div>
                    <span className="text-[11px] text-[#8A8A96]">Used on your public course page for buttons and highlights.</span>
                    {errors.accent_color && <span className="text-xs text-[#D93838]">{errors.accent_color}</span>}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <PanelTitle>Page URL</PanelTitle>
                <Field label="Slug" htmlFor="course_slug" required error={errors.slug} hint="Required before you can publish. Lowercase letters, numbers and dashes only.">
                    <div className={cn('flex overflow-hidden rounded-lg border bg-white shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15', errors.slug ? 'border-[#D93838]' : 'border-[#E4E2DA]')}>
                        <span className="flex items-center border-r border-[#E4E2DA] bg-[#F6F5F2] px-3 text-sm text-[#6B6B78]">/c/</span>
                        <input
                            id="course_slug"
                            value={form.slug}
                            maxLength={150}
                            onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))}
                            placeholder="gym-training-course"
                            className="h-10 min-w-0 flex-1 px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
                        />
                    </div>
                </Field>
            </div>

            <CheckoutQuestions productId={productId} questions={questions} />

            <Coupons productId={productId} coupons={coupons} />

            <div className="flex flex-col gap-3">
                <PanelTitle>After purchase</PanelTitle>
                <Field label="Thank-you message" htmlFor="post_purchase_message" counter={`${form.post_purchase_message.length}/255`} error={errors.post_purchase_message}>
                    <input id="post_purchase_message" value={form.post_purchase_message} maxLength={255} onChange={(e) => setField('post_purchase_message', e.target.value)} placeholder="Thanks for enrolling! Check your email for access." className={cn(INPUT, invalid(errors.post_purchase_message))} />
                </Field>
            </div>

            <div className="flex flex-col gap-3">
                <PanelTitle>Policies</PanelTitle>
                {(
                    [
                        ['terms_and_conditions', 'Terms & conditions'],
                        ['refund_policy', 'Refund policy'],
                        ['privacy_policy', 'Privacy policy'],
                    ] as const
                ).map(([key, label]) => (
                    <Field key={key} label={label} htmlFor={key} error={errors[key]}>
                        <textarea id={key} rows={3} value={form[key]} onChange={(e) => setField(key, e.target.value)} className={cn(TEXTAREA, invalid(errors[key]))} />
                    </Field>
                ))}
            </div>

            <div className="flex flex-col gap-3">
                <PanelTitle>Tracking</PanelTitle>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Meta Pixel ID" htmlFor="fb_pixel_id" error={errors.fb_pixel_id}>
                        <input id="fb_pixel_id" value={form.fb_pixel_id} maxLength={50} onChange={(e) => setField('fb_pixel_id', e.target.value)} placeholder="1234567890" className={cn(INPUT, invalid(errors.fb_pixel_id))} />
                    </Field>
                    <Field label="Google Analytics ID" htmlFor="ga_tracking_id" error={errors.ga_tracking_id}>
                        <input id="ga_tracking_id" value={form.ga_tracking_id} maxLength={50} onChange={(e) => setField('ga_tracking_id', e.target.value)} placeholder="G-XXXXXXXXXX" className={cn(INPUT, invalid(errors.ga_tracking_id))} />
                    </Field>
                </div>
            </div>
        </div>
    );
}
