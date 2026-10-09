import { useAppearance, type Appearance as Mode } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { SettingsCard } from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Check, Info, Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Appearance settings', href: '/settings/appearance' }];

const OPTIONS: { value: Mode; label: string; description: string; icon: LucideIcon }[] = [
    { value: 'light', label: 'Light', description: 'Bright and clear', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Easier at night', icon: Moon },
    { value: 'system', label: 'System', description: 'Follow your device', icon: Monitor },
];

/** Chhota sa dashboard ka namoona — chuna hua look kaisa dikhega (light-island: dark mode me bhi namoona ke rang fixed) */
function Preview({ mode }: { mode: Mode }) {
    const pane = (dark: boolean) => (
        <div className={cn('flex h-full flex-1 gap-1.5 p-2', dark ? 'bg-[#0F0F14]' : 'bg-cp-canvas')}>
            <div className={cn('w-1/4 rounded-md', dark ? 'bg-[#17171E]' : 'bg-cp-surface')} />
            <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3 rounded-sm bg-cp-brand" />
                <div className={cn('flex-1 rounded-md', dark ? 'bg-[#17171E]' : 'bg-cp-surface')} />
                <div className="flex gap-1.5">
                    <div className={cn('h-3 flex-1 rounded-sm', dark ? 'bg-[#2C2C37]' : 'bg-cp-line')} />
                    <div className={cn('h-3 flex-1 rounded-sm', dark ? 'bg-[#2C2C37]' : 'bg-cp-line')} />
                </div>
            </div>
        </div>
    );

    return <div className="light-island flex h-24 overflow-hidden rounded-lg ring-1 ring-black/5">{mode === 'system' ? <>{pane(false)}{pane(true)}</> : pane(mode === 'dark')}</div>;
}

export default function Appearance() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <SettingsCard icon={Palette} title="Appearance" description="Choose how your dashboard looks on this device." tone="bg-cp-accent-soft text-cp-accent-ink">
                    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
                        {OPTIONS.map((option) => {
                            const active = appearance === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => updateAppearance(option.value)}
                                    className={cn(
                                        'relative flex flex-col gap-3 rounded-2xl border p-3 text-left transition',
                                        active ? 'border-cp-brand bg-cp-surface-2 ring-2 ring-cp-brand/20' : 'border-cp-line bg-cp-surface hover:border-cp-line-stronger',
                                    )}
                                >
                                    <Preview mode={option.value} />
                                    <span className="flex items-center gap-2.5">
                                        <span className={cn('flex size-8 items-center justify-center rounded-lg', active ? 'bg-cp-brand text-white' : 'bg-cp-canvas text-cp-subtle')}>
                                            <option.icon className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-cp-ink">{option.label}</span>
                                            <span className="block text-xs text-cp-muted">{option.description}</span>
                                        </span>
                                        {active && (
                                            <span className="flex size-5 items-center justify-center rounded-full bg-cp-brand text-white">
                                                <Check className="size-3" strokeWidth={3} />
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="mt-4 flex items-start gap-2 rounded-xl bg-cp-canvas p-3.5 text-xs text-cp-subtle">
                        <Info className="mt-px size-4 shrink-0 text-cp-muted" />
                        Saved on this browser only. Dark mode applies to your dashboard — your store, checkout and buyer emails always look the way you designed them.
                    </p>
                </SettingsCard>
            </SettingsLayout>
        </AppLayout>
    );
}
