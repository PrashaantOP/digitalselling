import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, TeamShell } from '@/components/team/team-shell';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface RoleRow {
    uuid: string;
    name: string;
    is_template: boolean;
    description: string | null;
    permissions: string[];
    members: number;
}

type Ability = 'view' | 'edit' | 'delete';

interface Props {
    roles: RoleRow[];
    matrix: { module: string; label: string; abilities: Ability[] }[];
}

const ABILITIES: { key: Ability; label: string }[] = [
    { key: 'view', label: 'View' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
];

export default function TeamRoles({ roles, matrix }: Props) {
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;
    const [editing, setEditing] = useState<RoleRow | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);

    function remove(role: RoleRow) {
        if (!window.confirm(`Delete the "${role.name}" role?`)) return;
        setError(null);
        router.delete(`/dashboard/roles/${role.uuid}`, { preserveScroll: true, onError: (e) => setError(Object.values(e)[0] as string) });
    }

    const summary = (perms: string[]) =>
        matrix
            .filter((m) => perms.some((p) => p.startsWith(`${m.module}.`)))
            .map((m) => `${m.label}${perms.includes(`${m.module}.edit`) ? '' : ' (view)'}`)
            .join(', ') || 'No access yet';

    return (
        <TeamShell
            active="roles"
            title="Roles"
            description="A role decides what a team member can see and do. Payouts, KYC, billing and your team are always owner-only."
            action={
                <button type="button" onClick={() => setEditing('new')} className={BTN_PRIMARY}>
                    <Plus className="size-4" /> New role
                </button>
            }
        >
            {flash?.success && <p className="rounded-xl bg-cp-success-soft px-4 py-3 text-sm font-medium text-cp-success-ink">{flash.success}</p>}
            {error && <p className="rounded-xl bg-cp-coral-soft px-4 py-3 text-sm font-medium text-cp-coral-dark-ink">{error}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roles.map((r) => (
                    <article key={r.uuid} className="flex flex-col rounded-xl bg-cp-surface p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="flex items-center gap-2 text-base font-semibold text-cp-ink">
                                    <ShieldCheck className="size-4 text-cp-brand-ink" /> {r.name}
                                </h3>
                                {r.is_template && <span className="mt-1 inline-block rounded-full bg-cp-brand-soft px-2 py-0.5 text-[10px] font-semibold text-cp-brand-ink">Ready-made</span>}
                            </div>
                            <span className="text-xs font-medium text-cp-muted">
                                {r.members} member{r.members === 1 ? '' : 's'}
                            </span>
                        </div>
                        {r.description && <p className="mt-2 text-xs text-cp-subtle">{r.description}</p>}
                        <p className="mt-3 text-xs text-cp-muted">
                            <span className="font-semibold text-cp-ink">Access: </span>
                            {summary(r.permissions)}
                        </p>
                        <div className="flex-1" />
                        <div className="mt-4 flex items-center justify-end gap-1 border-t border-cp-line/70 pt-3">
                            <button type="button" onClick={() => setEditing(r)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-cp-body hover:bg-cp-canvas">
                                <Pencil className="size-3.5" /> Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(r)}
                                disabled={r.members > 0}
                                title={r.members > 0 ? 'Move members to another role first' : 'Delete role'}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-cp-coral-dark-ink hover:bg-cp-coral-soft disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash2 className="size-3.5" /> Delete
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            {editing && <RoleEditor key={editing === 'new' ? 'new' : editing.uuid} role={editing === 'new' ? null : editing} matrix={matrix} onClose={() => setEditing(null)} />}
        </TeamShell>
    );
}

function RoleEditor({ role, matrix, onClose }: { role: RoleRow | null; matrix: Props['matrix']; onClose: () => void }) {
    const [name, setName] = useState(role?.name ?? '');
    const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // edit/delete bina view ke bekaar — view apne aap; view hatao to baaki bhi hat jaaye
    function toggle(module: string, ability: Ability, on: boolean) {
        const next = new Set(perms);
        if (on) {
            next.add(`${module}.${ability}`);
            next.add(`${module}.view`);
        } else {
            next.delete(`${module}.${ability}`);
            if (ability === 'view') {
                next.delete(`${module}.edit`);
                next.delete(`${module}.delete`);
            }
        }
        setPerms(next);
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        const payload = { name: name.trim(), permissions: [...perms] };
        const options = { preserveScroll: true, onSuccess: onClose, onError: (e: Record<string, string>) => setErrors(e), onFinish: () => setSaving(false) };
        if (role) router.put(`/dashboard/roles/${role.uuid}`, payload, options);
        else router.post('/dashboard/roles', payload, options);
    }

    const hasDelete = [...perms].some((p) => p.endsWith('.delete'));

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
            <aside className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[520px] flex-col overflow-y-auto bg-cp-surface shadow-2xl">
                <form onSubmit={submit} className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-cp-line/70 px-6 py-4">
                        <span className="text-base font-semibold text-cp-ink">{role ? `Edit ${role.name}` : 'New role'}</span>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-cp-muted hover:bg-cp-surface-3">
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-5 p-6">
                        <label className="flex flex-col gap-1.5">
                            <span className={LABEL}>Role name</span>
                            <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="e.g. Community manager" className={INPUT} />
                            {errors.name && <span className="text-xs text-cp-red-ink">{errors.name}</span>}
                        </label>

                        <div>
                            <span className={LABEL}>Permissions</span>
                            <table className="mt-2 w-full text-sm">
                                <thead>
                                    <tr className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
                                        <th className="py-2 text-left">Area</th>
                                        {ABILITIES.map((a) => (
                                            <th key={a.key} className="w-16 py-2 text-center">
                                                {a.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cp-line/60">
                                    {matrix.map((m) => (
                                        <tr key={m.module}>
                                            <td className="py-2.5 font-medium text-cp-ink">{m.label}</td>
                                            {ABILITIES.map((a) => (
                                                <td key={a.key} className="py-2.5 text-center">
                                                    {m.abilities.includes(a.key) ? (
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`${a.label} ${m.label}`}
                                                            checked={perms.has(`${m.module}.${a.key}`)}
                                                            onChange={(e) => toggle(m.module, a.key, e.target.checked)}
                                                            className={cn('size-4', a.key === 'delete' ? 'accent-cp-coral-dark' : 'accent-cp-brand')}
                                                        />
                                                    ) : (
                                                        <span className="text-cp-line-strong">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {errors.permissions && <span className="text-xs text-cp-red-ink">{errors.permissions}</span>}
                        </div>

                        {hasDelete && <p className="rounded-lg bg-cp-coral-soft px-3 py-2 text-xs font-medium text-cp-coral-dark-ink">This role can permanently delete products. Only give it to people you fully trust.</p>}
                        <p className="rounded-lg bg-cp-canvas px-3 py-2 text-xs text-cp-subtle">Payout account, KYC, billing, referral earnings and your team can never be given to a role.</p>
                    </div>

                    <div className="mt-auto flex justify-end gap-2 border-t border-cp-line p-5">
                        <button type="button" onClick={onClose} className={BTN_GHOST}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || !name.trim()} className={hasDelete ? BTN_DANGER : BTN_PRIMARY}>
                            {saving && <Loader2 className="size-4 animate-spin" />}
                            {role ? 'Save role' : 'Create role'}
                        </button>
                    </div>
                </form>
            </aside>
        </>
    );
}
