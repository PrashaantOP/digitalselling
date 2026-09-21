import { cn } from '@/lib/utils';
import { Bold, Italic, List, Underline, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export const INPUT = 'h-10 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 disabled:cursor-not-allowed disabled:bg-[#F6F5F2]';
export const TEXTAREA = 'w-full resize-y rounded-lg border border-[#E4E2DA] bg-white px-3 py-2 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';
export const LABEL = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';
export const invalid = (has: unknown) => (has ? 'border-[#D93838] focus:border-[#D93838] focus:ring-[#D93838]/15' : '');

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */

export function Field({
    label,
    htmlFor,
    required,
    counter,
    hint,
    error,
    children,
}: {
    label: string;
    htmlFor?: string;
    required?: boolean;
    counter?: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label htmlFor={htmlFor} className={LABEL}>
                    {label} {required && <span className="text-[#D93838]">*</span>}
                </label>
                {counter && <span className="text-[11px] text-[#8A8A96]">{counter}</span>}
            </div>
            {children}
            {error ? (
                <span role="alert" className="text-xs text-[#D93838]">
                    {error}
                </span>
            ) : (
                hint && <span className="text-[11px] text-[#8A8A96]">{hint}</span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-[#059669]' : 'bg-[#DAD8D0]')}
        >
            <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Cards / headings                                                   */
/* ------------------------------------------------------------------ */

export function PanelTitle({ children }: { children: ReactNode }) {
    return <h2 className="text-xl font-bold tracking-tight text-[#14141B]">{children}</h2>;
}

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-xl border border-[#E4E2DA] bg-white p-4', className)}>
            {(title || action) && (
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        {title && <h3 className="text-[13px] font-bold tracking-wide text-[#14141B] uppercase">{title}</h3>}
                        {subtitle && <p className="mt-0.5 text-xs text-[#8A8A96]">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
    const tones = { error: 'bg-[#FFEDE8] text-[#C2410C]', success: 'bg-[#E6F6EC] text-[#059669]', info: 'bg-[#EEF2FF] text-[#4F46E5]' };
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg px-3 py-2 text-xs font-medium', tones[tone])}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div role="dialog" aria-modal="true" aria-label={title} className={cn('relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#14141B]">{title}</h3>
                    <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[#8A8A96] hover:bg-[#F0EFEA] hover:text-[#14141B]">
                        <X className="size-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={cn('rounded-md p-1.5 text-[#8A8A96] transition disabled:opacity-30', danger ? 'hover:bg-[#FFEDE8] hover:text-[#C2410C]' : 'hover:bg-[#F0EFEA] hover:text-[#14141B]')}
        >
            {children}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Rich text (B / I / U / bullets) — stores a tiny, sanitised HTML    */
/* ------------------------------------------------------------------ */

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P']);

/** Keep only basic formatting tags, strip every attribute, unwrap anything else. DIV → P (what contentEditable emits). */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as Element;
        const tag = el.tagName === 'DIV' ? 'P' : el.tagName;
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(tag)) return '';
        const inner = Array.from(el.childNodes).map(walk).join('');
        if (!ALLOWED.has(tag)) return inner;
        if (tag === 'BR') return '<br>';
        return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
    };
    const out = Array.from(doc.body.childNodes).map(walk).join('');
    return out.replace(/^(<br>|<p><\/p>|<p><br><\/p>)+$/, '');
}

/** Old plain-text descriptions (with \n) → paragraphs so the editor keeps their line breaks. */
export function toEditorHtml(value: string): string {
    if (!value) return '';
    if (/<\/?[a-z][^>]*>/i.test(value)) return sanitizeHtml(value);
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

export function RichText({ id, value, onChange, placeholder, error }: { id?: string; value: string; onChange: (html: string) => void; placeholder?: string; error?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const last = useRef<string | null>(null);

    // only touch the DOM when the value changed from outside (typing must keep the caret)
    useEffect(() => {
        if (ref.current && value !== last.current) {
            ref.current.innerHTML = toEditorHtml(value);
            last.current = value;
        }
    }, [value]);

    function exec(command: string) {
        ref.current?.focus();
        try {
            document.execCommand(command);
        } catch {
            /* unsupported in this browser */
        }
        emit();
    }

    function emit() {
        const html = sanitizeHtml(ref.current?.innerHTML ?? '');
        last.current = html;
        onChange(html);
    }

    const tools = [
        { cmd: 'bold', label: 'Bold', icon: Bold },
        { cmd: 'italic', label: 'Italic', icon: Italic },
        { cmd: 'underline', label: 'Underline', icon: Underline },
        { cmd: 'insertUnorderedList', label: 'Bulleted list', icon: List },
    ];

    return (
        <div className={cn('overflow-hidden rounded-lg border bg-white shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15', error ? 'border-[#D93838]' : 'border-[#E4E2DA]')}>
            <div className="flex items-center gap-0.5 border-b border-[#E4E2DA] bg-[#F6F5F2] px-2 py-1.5">
                {tools.map((t) => (
                    <button key={t.cmd} type="button" aria-label={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(t.cmd)} className="rounded p-1.5 text-[#4B4B57] hover:bg-white hover:text-[#14141B]">
                        <t.icon className="size-4" />
                    </button>
                ))}
            </div>
            <div
                id={id}
                ref={ref}
                role="textbox"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onInput={emit}
                onBlur={emit}
                className="min-h-[140px] px-3 py-2.5 text-sm text-[#14141B] outline-none empty:before:text-[#8A8A96] empty:before:content-[attr(data-placeholder)] [&_li]:ml-4 [&_ul]:list-disc [&_ul]:pl-2"
            />
        </div>
    );
}
