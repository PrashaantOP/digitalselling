import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { ArrowRight, ExternalLink, Info, Loader2, Rocket, Save, Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { DeviceToggle, SaveStatusPill, type Device } from './ui';
import type { SaveStatus } from './use-auto-save';

type Status = 'draft' | 'unpublished' | 'published';

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-[#FFF4DB] text-[#B46E00]' },
    published: { label: 'Published', cls: 'bg-[#E6F6EC] text-[#059669]' },
    unpublished: { label: 'Unpublished', cls: 'bg-[#F0EFEA] text-[#6B6B78]' },
};

/**
 * Product editor ka full-bleed split layout — bayein form (top bar, scroll body, Save/Publish bar),
 * dayein dark grid pe live preview. Book aur Locked content editors dono isi shell me chalte hain.
 */
export function EditorShell({
    headTitle,
    title,
    status,
    backHref,
    backLabel,
    heading,
    children,
    publishError,
    saveStatus,
    onSaveDraft,
    onPublish,
    publishing,
    device,
    onDeviceChange,
    publicUrl,
    preview,
    tip,
}: {
    headTitle: string;
    title: string;
    status: Status;
    backHref: string;
    backLabel: string;
    heading: string;
    children: ReactNode;
    publishError: string | null;
    saveStatus: SaveStatus;
    onSaveDraft: () => void;
    onPublish: () => void;
    publishing: boolean;
    device: Device;
    onDeviceChange: (d: Device) => void;
    publicUrl: string;
    preview: ReactNode;
    tip: string;
}) {
    const statusMeta = STATUS_BADGE[status] ?? STATUS_BADGE.draft;

    return (
        <div className="h-screen overflow-hidden bg-white">
            <Head title={headTitle} />

            {/* full-bleed split — left is the form, right is the dark preview */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
                {/* LEFT — editor */}
                <section className="flex min-h-0 w-full flex-col overflow-hidden border-r border-[#E4E2DA] bg-white lg:w-[520px] lg:shrink-0">
                    {/* top bar */}
                    <div className="flex items-center justify-between border-b border-[#E4E2DA] px-4 py-3 md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit(backHref)}
                                aria-label={backLabel}
                                className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F6F5F2] hover:text-[#14141B]"
                            >
                                <X className="size-5" />
                            </button>
                            <h2 className="truncate text-[13px] font-semibold tracking-wider text-[#14141B] uppercase">{title}</h2>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase', statusMeta.cls)}>
                            {statusMeta.label}
                        </span>
                    </div>

                    {/* scrollable form body */}
                    <div className="flex-1 [scrollbar-width:none] overflow-y-auto px-4 py-5 md:px-6 md:py-6 [&::-webkit-scrollbar]:hidden">
                        <div className="mx-auto flex max-w-[440px] flex-col gap-5">
                            <h1 className="text-xl font-bold tracking-tight text-[#14141B]">{heading}</h1>

                            {children}

                            {publishError && (
                                <div className="flex items-start gap-2 rounded-lg border border-[#FFEDE8] bg-[#FFF6F1] p-3 text-[12px] font-semibold text-[#C2410C]">
                                    <Info className="mt-px size-4 shrink-0" />
                                    {publishError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* bottom action bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E2DA] bg-white px-4 py-3 md:px-6">
                        <div className="flex items-center gap-2 text-[11px] text-[#8A8A96]">
                            <SaveStatusPill status={saveStatus} />
                            <span>All changes saved automatically</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={onSaveDraft}
                                disabled={saveStatus === 'saving'}
                                className="border-[#E4E2DA] text-[#4B4B57] hover:bg-[#F6F5F2]"
                            >
                                <Save className="size-4" /> Save draft
                            </Button>
                            <Button onClick={onPublish} disabled={publishing} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                                {publishing ? 'Publishing…' : 'Publish'} <ArrowRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* RIGHT — preview */}
                <section
                    className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0A0A12]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                >
                    {/* preview header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 md:px-6">
                        <div>
                            <p className="text-[13px] font-semibold text-white">Preview</p>
                            <p className="text-[11px] text-white/50">This is exactly what your visitors see.</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DeviceToggle device={device} onChange={onDeviceChange} />
                            {status === 'published' && (
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                                >
                                    <ExternalLink className="size-3.5" /> Open live
                                </a>
                            )}
                        </div>
                    </div>

                    {/* scrollable preview area */}
                    <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden p-4 md:p-6 xl:p-8">{preview}</div>

                    {/* helper tip */}
                    <div className="border-t border-white/5 px-4 py-2.5 md:px-6">
                        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                            <Sparkles className="size-3 text-[#FF6B4A]" />
                            {tip}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

/** Save ko flush karke publish endpoint hit karo; server ke validation messages se pehla dikhao. */
export function publishProduct(url: string, flush: () => void, setPublishing: (v: boolean) => void, setError: (msg: string | null) => void) {
    flush();
    setError(null);
    setPublishing(true);
    router.post(
        url,
        { status: 'published' },
        {
            preserveScroll: true,
            onError: (errors) => {
                const msgs = Object.values(errors as Record<string, string>).filter(Boolean);
                setError((msgs[0] as string) || 'Please fill the highlighted fields and try again.');
            },
            onFinish: () => setPublishing(false),
        },
    );
}
