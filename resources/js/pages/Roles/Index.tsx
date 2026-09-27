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
            {flash?.success && <p className="rounded-xl bg-[#E6F6EC] px-4 py-3 text-sm font-medium text-[#059669]">{flash.success}</p>}
            {error && <p className="rounded-xl bg-[#FFEDE8] px-4 py-3 text-sm font-medium text-[#C2410C]">{error}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roles.map((r) => (
                    <article key={r.uuid} className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="flex items-center gap-2 text-base font-semibold text-[#14141B]">
                                    <ShieldCheck className="size-4 text-[#4F46E5]" /> {r.name}
                                </h3>
                                {r.is_template && <span className="mt-1 inline-block rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">Ready-made</span>}
                            </div>
                            <span className="text-xs font-medium text-[#8A8A96]">
                                {r.members} member{r.members === 1 ? '' : 's'}
                            </span>
                        </div>
                        {r.description && <p className="mt-2 text-xs text-[#6B6B78]">{r.description}</p>}
                        <p className="mt-3 text-xs text-[#8A8A96]">
                            <span className="font-semibold text-[#14141B]">Access: </span>
                            {summary(r.permissions)}
                        </p>
                        <div className="flex-1" />
                        <div className="mt-4 flex items-center justify-end gap-1 border-t border-[#E4E2DA]/70 pt-3">
                            <button type="button" onClick={() => setEditing(r)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#4B4B57] hover:bg-[#F6F5F2]">
                                <Pencil className="size-3.5" /> Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(r)}
                                disabled={r.members > 0}
                                title={r.members > 0 ? 'Move members to another role first' : 'Delete role'}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#C2410C] hover:bg-[#FFEDE8] disabled:cursor-not-allowed disabled:opacity-40"
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
            <aside className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl">
                <form onSubmit={submit} className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                        <span className="text-base font-semibold text-[#14141B]">{role ? `Edit ${role.name}` : 'New role'}</span>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[#8A8A96] hover:bg-[#F0EFEA]">
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-5 p-6">
                        <label className="flex flex-col gap-1.5">
                            <span className={LABEL}>Role name</span>
                            <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="e.g. Community manager" className={INPUT} />
                            {errors.name && <span className="text-xs text-[#D93838]">{errors.name}</span>}
                        </label>

                        <div>
                            <span className={LABEL}>Permissions</span>
                            <table className="mt-2 w-full text-sm">
                                <thead>
                                    <tr className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                        <th className="py-2 text-left">Area</th>
                                        {ABILITIES.map((a) => (
                                            <th key={a.key} className="w-16 py-2 text-center">
                                                {a.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E2DA]/60">
                                    {matrix.map((m) => (
                                        <tr key={m.module}>
                                            <td className="py-2.5 font-medium text-[#14141B]">{m.label}</td>
                                            {ABILITIES.map((a) => (
                                                <td key={a.key} className="py-2.5 text-center">
                                                    {m.abilities.includes(a.key) ? (
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`${a.label} ${m.label}`}
                                                            checked={perms.has(`${m.module}.${a.key}`)}
                                                            onChange={(e) => toggle(m.module, a.key, e.target.checked)}
                                                            className={cn('size-4', a.key === 'delete' ? 'accent-[#C2410C]' : 'accent-[#4F46E5]')}
                                                        />
                                                    ) : (
                                                        <span className="text-[#D5D3CB]">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {errors.permissions && <span className="text-xs text-[#D93838]">{errors.permissions}</span>}
                        </div>

                        {hasDelete && <p className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">This role can permanently delete products. Only give it to people you fully trust.</p>}
                        <p className="rounded-lg bg-[#F6F5F2] px-3 py-2 text-xs text-[#6B6B78]">Payout account, KYC, billing, referral earnings and your team can never be given to a role.</p>
                    </div>

                    <div className="mt-auto flex justify-end gap-2 border-t border-[#E4E2DA] p-5">
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
