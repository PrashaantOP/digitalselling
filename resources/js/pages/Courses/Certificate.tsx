import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Check, CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Courses', href: '/dashboard/courses' },
    { title: 'Certificate design', href: '/dashboard/courses/certificate' },
];

interface Props {
    settings: {
        template: string;
        accent_color: string | null;
        signatory_name: string | null;
        signatory_title: string | null;
        has_logo: boolean;
        has_signature: boolean;
    };
    /** defaults lagne ke baad jo asal me certificate pe aa raha hai */
    resolved: { accent: string; logo: string | null; signature: string | null; signatory_name: string; signatory_title: string };
    templates: { key: string; label: string; orientation: 'landscape' | 'portrait' }[];
    previewUrl: string;
}

const TEMPLATE_HINT: Record<string, string> = {
    classic: 'Serif, centred, double border',
    modern: 'Colour band with a bold name',
    minimal: 'White, left-aligned, lots of space',
    ribbon: 'Corner ribbons with a seal',
    portrait: 'Tall page, serif, double border',
    portrait_modern: 'Tall page with a colour header',
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** text ke fields ka wahi roop jo server pe jaata hai — "kuch badla ya nahi" isi se tay hota hai */
const fieldsKey = (accent: string | null, name: string, title: string) => JSON.stringify([accent, name.trim(), title.trim()]);

const INPUT = 'h-10 w-full rounded-lg border border-cp-line-strong bg-cp-surface px-3 text-sm text-cp-ink outline-none transition placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';

/** Dashboard → Courses → Certificate design. Ek design, creator ke saare courses ke certificates pe. */
export default function CertificateDesign({ settings, resolved, templates, previewUrl }: Props) {
    const { can } = useCan();
    const editable = can('courses.edit');

    const [template, setTemplate] = useState(settings.template);
    // Template chunna sirf preview hai — "Save design" dabane par hi lagta hai (ye har issued certificate badal deta hai)
    const [savedTemplate, setSavedTemplate] = useState(settings.template);
    const [accent, setAccent] = useState<string | null>(settings.accent_color);
    const [name, setName] = useState(settings.signatory_name ?? '');
    const [title, setTitle] = useState(settings.signatory_title ?? '');
    const [logo, setLogo] = useState<File | null>(null);
    const [signature, setSignature] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [removeSignature, setRemoveSignature] = useState(false);
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});
    // save ke baad iframe ko naye logo/signature ke saath dobara load karne ke liye
    const [version, setVersion] = useState(0);

    // preview form ki abhi ki values se — typing ke har akshar pe nahi, thoda ruk kar
    const [debounced, setDebounced] = useState({ template, accent, name, title });
    useEffect(() => {
        const t = window.setTimeout(() => setDebounced({ template, accent, name, title }), 350);
        return () => window.clearTimeout(t);
    }, [template, accent, name, title]);

    const previewSrc = useMemo(() => {
        const params = new URLSearchParams({ template: debounced.template, v: String(version) });
        if (debounced.accent) params.set('accent_color', debounced.accent);
        if (debounced.name.trim()) params.set('signatory_name', debounced.name.trim());
        if (debounced.title.trim()) params.set('signatory_title', debounced.title.trim());

        return `${previewUrl}?${params.toString()}`;
    }, [debounced, previewUrl, version]);

    // jo server pe save ho chuka hai — isse alag ho tabhi auto-save chalta hai
    const savedKey = useRef(fieldsKey(settings.accent_color, settings.signatory_name ?? '', settings.signatory_title ?? ''));
    // naya save purane ko cancel karta hai — purane ka jawab status na bigade
    const request = useRef(0);

    const key = fieldsKey(accent, name, title);
    const dirty = key !== savedKey.current || logo !== null || signature !== null || removeLogo || removeSignature;
    const templateDirty = template !== savedTemplate;
    const orientation = templates.find((t) => t.key === template)?.orientation ?? 'landscape';

    /** withTemplate: true sirf "Save design" button se — auto-save purana (saved) template hi bhejta hai. */
    const save = useCallback((withTemplate: boolean) => {
        const id = ++request.current;
        const sentTemplate = withTemplate ? template : savedTemplate;
        const images = logo !== null || signature !== null || removeLogo || removeSignature;
        setStatus('saving');

        router.post(
            '/dashboard/courses/certificate',
            {
                _method: 'put',
                template: sentTemplate,
                accent_color: accent,
                signatory_name: name.trim() || null,
                signatory_title: title.trim() || null,
                ...(logo ? { logo } : {}),
                ...(signature ? { signature } : {}),
                remove_logo: removeLogo && !logo,
                remove_signature: removeSignature && !signature,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (id !== request.current) return;
                    savedKey.current = key;
                    setSavedTemplate(sentTemplate);
                    // reject hui file ka error tab tak dikhe jab tak nayi file na aaye (beech ka text auto-save use na mitaye)
                    setErrors((prev) => (images ? {} : Object.fromEntries(Object.entries(prev).filter(([field]) => field === 'logo' || field === 'signature'))));
                    setStatus('saved');
                    setLogo(null);
                    setSignature(null);
                    setRemoveLogo(false);
                    setRemoveSignature(false);
                    if (images) setVersion((v) => v + 1);
                },
                onError: (errs) => {
                    if (id !== request.current) return;
                    const found = errs as Record<string, string>;
                    setErrors(found);
                    setStatus('error');
                    // galat file dobara na bheji jaye — warna har agla auto-save bhi usi pe atkega
                    if (found.logo) setLogo(null);
                    if (found.signature) setSignature(null);
                },
            },
        );
    }, [template, savedTemplate, accent, name, title, logo, signature, removeLogo, removeSignature, key]);

    // Auto-save: koi bhi badlav ho, 700ms ruk kar save (typing ke beech me nahi)
    useEffect(() => {
        if (!editable || !dirty) return;
        const t = window.setTimeout(() => save(false), 700);
        return () => window.clearTimeout(t);
    }, [editable, dirty, save]);

    // "Saved" thodi der dikhe, phir wapas shaant
    useEffect(() => {
        if (status !== 'saved') return;
        const t = window.setTimeout(() => setStatus('idle'), 4000);
        return () => window.clearTimeout(t);
    }, [status]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Certificate design" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-24 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Certificate design</h1>
                        <p className="text-sm text-cp-muted">One design for every course that has certificates turned on. It carries your logo and name — students share it as yours.</p>
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                save(true);
                            }}
                            className="flex flex-col gap-5"
                        >
                            <fieldset disabled={!editable} className="flex flex-col gap-5 disabled:opacity-70">
                                {/* Template */}
                                <section className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-cp-ink">Template</h2>
                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1" role="radiogroup" aria-label="Template">
                                        {templates.map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                role="radio"
                                                aria-checked={template === t.key}
                                                onClick={() => setTemplate(t.key)}
                                                className={cn(
                                                    'flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition',
                                                    template === t.key ? 'border-cp-brand bg-cp-brand-soft' : 'border-cp-line bg-cp-surface hover:bg-cp-canvas',
                                                )}
                                            >
                                                <span>
                                                    <span className="flex items-center gap-1.5 text-sm font-bold text-cp-ink">
                                                        {t.label}
                                                        {t.key === savedTemplate && <span className="rounded-full bg-cp-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-cp-success-ink">In use</span>}
                                                    </span>
                                                    <span className="block text-[11px] text-cp-subtle">{TEMPLATE_HINT[t.key]}</span>
                                                </span>
                                                {template === t.key && <Check className="size-4 shrink-0 text-cp-brand-ink" />}
                                            </button>
                                        ))}
                                    </div>
                                    <p className={cn('mt-3 text-xs', templateDirty ? 'font-semibold text-cp-amber-ink' : 'text-cp-muted')}>
                                        {templateDirty
                                            ? 'Previewing only. Click “Save design” to use this template — it changes every certificate, including ones already issued.'
                                            : 'Picking a template only previews it. It is applied when you click “Save design”.'}
                                    </p>
                                </section>

                                {/* Colour */}
                                <section className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-cp-ink">Accent colour</h2>
                                    <div className="mt-3 flex items-center gap-3">
                                        <input
                                            type="color"
                                            aria-label="Accent colour"
                                            value={accent ?? resolved.accent}
                                            onChange={(e) => setAccent(e.target.value.toUpperCase())}
                                            className="size-10 shrink-0 cursor-pointer rounded-lg border border-cp-line-strong bg-cp-surface p-1"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-mono text-sm font-semibold text-cp-ink">{accent ?? resolved.accent}</p>
                                            <p className="text-xs text-cp-muted">{accent ? 'Custom colour for certificates' : "Using your store's brand colour"}</p>
                                        </div>
                                        {accent && (
                                            <button type="button" onClick={() => setAccent(null)} className="text-xs font-semibold text-cp-subtle hover:text-cp-ink">
                                                Use store colour
                                            </button>
                                        )}
                                    </div>
                                    {errors.accent_color && <p className="mt-2 text-xs font-medium text-cp-coral-dark-ink">{errors.accent_color}</p>}
                                </section>

                                {/* Logo + signature */}
                                <section className="flex flex-col gap-4 rounded-xl bg-cp-surface p-5 shadow-sm">
                                    <ImageField
                                        label="Logo"
                                        hint={settings.has_logo ? 'Your certificate logo.' : 'No certificate logo yet — your store picture is used. Upload one to replace it.'}
                                        current={removeLogo ? null : settings.has_logo ? resolved.logo : null}
                                        file={logo}
                                        onFile={(f) => {
                                            setLogo(f);
                                            setRemoveLogo(false);
                                        }}
                                        onRemove={settings.has_logo ? () => setRemoveLogo(true) : undefined}
                                        error={errors.logo}
                                    />
                                    <ImageField
                                        label="Signature"
                                        hint="A photo or scan of your signature on a white or transparent background."
                                        current={removeSignature ? null : resolved.signature}
                                        file={signature}
                                        onFile={(f) => {
                                            setSignature(f);
                                            setRemoveSignature(false);
                                        }}
                                        onRemove={settings.has_signature ? () => setRemoveSignature(true) : undefined}
                                        error={errors.signature}
                                    />
                                </section>

                                {/* Signatory */}
                                <section className="flex flex-col gap-3 rounded-xl bg-cp-surface p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-cp-ink">Signed by</h2>
                                    <div>
                                        <label htmlFor="signatory_name" className="text-xs font-semibold text-cp-body">
                                            Name
                                        </label>
                                        <input id="signatory_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={resolved.signatory_name} className={cn(INPUT, 'mt-1')} />
                                        {errors.signatory_name && <p className="mt-1 text-xs font-medium text-cp-coral-dark-ink">{errors.signatory_name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="signatory_title" className="text-xs font-semibold text-cp-body">
                                            Designation
                                        </label>
                                        <input id="signatory_title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Instructor" className={cn(INPUT, 'mt-1')} />
                                        {errors.signatory_title && <p className="mt-1 text-xs font-medium text-cp-coral-dark-ink">{errors.signatory_title}</p>}
                                    </div>
                                </section>
                            </fieldset>

                            {!editable && <p className="text-xs text-cp-muted">You can view this design but not change it.</p>}
                        </form>

                        {/* Live preview */}
                        <div className="flex flex-col gap-3 rounded-xl bg-cp-solid p-4 shadow-sm xl:sticky xl:top-6">
                            <div>
                                <p className="text-[13px] font-semibold text-white">Preview</p>
                                <p className="text-[11px] text-white/50">A sample student and course. The real certificate carries their name, your course title and a verify link.</p>
                            </div>
                            <div className={cn('overflow-hidden rounded-lg bg-cp-surface', orientation === 'portrait' && 'mx-auto w-full max-w-[520px]')} style={{ aspectRatio: orientation === 'portrait' ? '210 / 297' : '297 / 210' }}>
                                <iframe key={previewSrc} src={previewSrc} title="Certificate preview" className="size-full border-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Neeche chipka hua bar — Store page jaisa: baayein Save, daayein auto-save ka haal */}
            {editable && (
                <div className="fixed right-0 bottom-(--mobile-nav-offset,0px) left-0 z-40 border-t border-cp-line bg-cp-surface/95 backdrop-blur-md transition-[bottom] duration-200 lg:bottom-0 lg:left-[288px]">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6">
                        <Button type="button" onClick={() => save(true)} disabled={status === 'saving'} className="text-white bg-cp-brand hover:bg-cp-brand-hover">
                            {status === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                            {status === 'saving' ? 'Saving…' : 'Save design'}
                        </Button>
                        <SaveIndicator status={status} dirty={dirty} templateDirty={templateDirty} />
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function SaveIndicator({ status, dirty, templateDirty }: { status: SaveStatus; dirty: boolean; templateDirty: boolean }) {
    if (status === 'saving') {
        return (
            <span role="status" className="flex items-center gap-1.5 text-xs font-medium text-cp-muted">
                <Loader2 className="size-3.5 animate-spin" /> Saving changes…
            </span>
        );
    }
    if (status === 'error') {
        return (
            <span role="alert" className="flex items-center gap-1.5 text-xs font-medium text-cp-coral-dark-ink">
                <AlertTriangle className="size-3.5" /> Could not save — check the fields above
            </span>
        );
    }
    if (dirty) {
        return <span className="text-xs font-medium text-cp-muted">Unsaved changes…</span>;
    }
    if (templateDirty) {
        return <span className="text-xs font-semibold text-cp-amber-ink">Template not saved — click Save design</span>;
    }

    return (
        <span role="status" className="flex items-center gap-1.5 text-xs font-medium text-cp-success-ink">
            <CheckCircle2 className="size-3.5" /> {status === 'saved' ? 'All changes saved' : 'Changes save automatically'}
        </span>
    );
}

function ImageField({
    label,
    hint,
    current,
    file,
    onFile,
    onRemove,
    error,
}: {
    label: string;
    hint: string;
    /** jo abhi save hai uska URL */
    current: string | null;
    file: File | null;
    onFile: (file: File | null) => void;
    onRemove?: () => void;
    error?: string;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [localUrl, setLocalUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setLocalUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setLocalUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = localUrl ?? current;

    return (
        <div>
            <h2 className="text-sm font-bold text-cp-ink">{label}</h2>
            <p className="mt-0.5 text-xs text-cp-muted">{hint}</p>
            <div className="mt-3 flex items-center gap-3">
                <span className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-cp-line-strong bg-cp-surface-2">
                    {shown ? <img src={shown} alt="" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="size-5 text-cp-line-stronger" />}
                </span>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => input.current?.click()}
                        className="inline-flex h-9 items-center rounded-lg border border-cp-line bg-cp-surface px-3 text-sm font-medium text-cp-body transition hover:bg-cp-canvas"
                    >
                        {shown ? 'Replace' : 'Upload'}
                    </button>
                    {file ? (
                        <button type="button" onClick={() => onFile(null)} className="inline-flex h-9 items-center px-2 text-sm font-medium text-cp-subtle hover:text-cp-ink">
                            Undo
                        </button>
                    ) : (
                        current &&
                        onRemove && (
                            <button type="button" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`} className="inline-flex h-9 items-center gap-1 px-2 text-sm font-medium text-cp-coral-dark-ink hover:underline">
                                <Trash2 className="size-3.5" /> Remove
                            </button>
                        )
                    )}
                </div>
                <input
                    ref={input}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                        onFile(e.target.files?.[0] ?? null);
                        e.target.value = '';
                    }}
                />
            </div>
            <p className="mt-2 text-[11px] text-cp-muted">PNG, JPG or WebP, up to 2 MB.</p>
            {error && <p className="mt-1 text-xs font-medium text-cp-coral-dark-ink">{error}</p>}
        </div>
    );
}
