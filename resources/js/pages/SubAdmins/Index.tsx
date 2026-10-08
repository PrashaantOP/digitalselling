import { BTN_PRIMARY, expiresIn, INPUT, LABEL, PasswordAction, relativeTime, TeamShell } from '@/components/team/team-shell';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import { Mail, MoreHorizontal, RefreshCw, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

interface Member {
    uuid: string;
    name: string | null;
    email: string;
    role: string | null;
    status: 'invited' | 'active';
    invited_at: string | null;
    invite_expires_at: string | null;
    accepted_at: string | null;
    last_active_at: string | null;
    two_factor: boolean;
}

interface Props {
    members: Member[];
    roles: { uuid: string; name: string; is_template: boolean }[];
    seats: { used: number; limit: number; plan: 'free' | 'plus' };
}

type Action = { kind: 'invite' } | { kind: 'role'; member: Member } | { kind: 'remove'; member: Member } | null;

export default function TeamMembers({ members, roles, seats }: Props) {
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;
    const [action, setAction] = useState<Action>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const full = seats.used >= seats.limit;

    function openInvite() {
        setEmail('');
        setRole(roles[0]?.name ?? '');
        setAction({ kind: 'invite' });
    }

    function resend(m: Member) {
        setMenuFor(null);
        router.post(`/dashboard/sub-admins/${m.uuid}/resend`, {}, { preserveScroll: true });
    }

    return (
        <TeamShell
            active="members"
            title="Team"
            description="Give people access to help run your store. They never see or change payouts, KYC, billing or your team."
            action={
                <button type="button" onClick={openInvite} disabled={full} className={BTN_PRIMARY}>
                    <UserPlus className="size-4" /> Invite member
                </button>
            }
        >
            {flash?.success && <p className="rounded-xl bg-[#E6F6EC] px-4 py-3 text-sm font-medium text-[#059669]">{flash.success}</p>}

            {/* seats */}
            <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                        <Users className="size-5" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-[#14141B]">
                            {seats.used} of {seats.limit} seat{seats.limit === 1 ? '' : 's'} used
                        </p>
                        <p className="text-xs text-[#8A8A96]">Pending invites count as a seat. {seats.plan === 'plus' ? 'Plus includes 5 seats.' : 'Free includes 1 seat.'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-[#ECEBE6]">
                        <div className={cn('h-full rounded-full', full ? 'bg-[#B46E00]' : 'bg-[#4F46E5]')} style={{ width: `${Math.min(100, (seats.used / seats.limit) * 100)}%` }} />
                    </div>
                    {full && seats.plan !== 'plus' && (
                        <Link href="/dashboard/settings/billing" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                            Upgrade for 5 seats
                        </Link>
                    )}
                </div>
            </div>

            {/* members */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                {members.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                            <UserPlus className="size-5" />
                        </span>
                        <p className="text-sm font-semibold text-[#14141B]">No team members yet</p>
                        <p className="max-w-sm text-xs text-[#8A8A96]">Invite a manager, editor or support person. You choose exactly what they can see and do with roles.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                <th className="px-5 py-3">Member</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Last active</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E2DA]/60">
                            {members.map((m) => (
                                <tr key={m.uuid}>
                                    <td className="px-5 py-3.5">
                                        <p className="font-semibold text-[#14141B]">{m.name ?? 'Invited'}</p>
                                        <p className="text-xs text-[#8A8A96]">{m.email}</p>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-xs font-semibold text-[#4F46E5]">{m.role ?? 'No role'}</span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {m.status === 'active' ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F6EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                                                <ShieldCheck className="size-3" /> Active · 2-step on
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-[#FFF4DB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B46E00]">
                                                Invited · expires {expiresIn(m.invite_expires_at)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-[#6B6B78]">{m.status === 'active' ? relativeTime(m.last_active_at) : '—'}</td>
                                    <td className="relative px-5 py-3.5 text-right">
                                        <button
                                            type="button"
                                            aria-label={`Actions for ${m.email}`}
                                            onClick={() => setMenuFor(menuFor === m.uuid ? null : m.uuid)}
                                            className="rounded-lg p-1.5 text-[#8A8A96] hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                        >
                                            <MoreHorizontal className="size-4" />
                                        </button>
                                        {menuFor === m.uuid && (
                                            <div className="absolute right-5 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[#E4E2DA] bg-white p-1 text-left shadow-lg">
                                                <button type="button" onClick={() => { setMenuFor(null); setRole(m.role ?? ''); setAction({ kind: 'role', member: m }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F6F5F2]">
                                                    <ShieldCheck className="size-4 text-[#8A8A96]" /> Change role
                                                </button>
                                                {m.status === 'invited' && (
                                                    <button type="button" onClick={() => resend(m)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F6F5F2]">
                                                        <RefreshCw className="size-4 text-[#8A8A96]" /> Resend invite
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => { setMenuFor(null); setAction({ kind: 'remove', member: m }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#C2410C] hover:bg-[#FFEDE8]">
                                                    <UserMinus className="size-4" /> {m.status === 'invited' ? 'Cancel invite' : 'Remove access'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-[#8A8A96]">
                <Mail className="size-3.5" /> Invite links work once and expire after 7 days. Team members always sign in with a code from their email.
            </p>

            {/* invite */}
            <PasswordAction
                open={action?.kind === 'invite'}
                onClose={() => setAction(null)}
                title="Invite a team member"
                body="They'll get an email with a link to join your store."
                url="/dashboard/sub-admins"
                method="post"
                data={{ email, role }}
                ready={Boolean(email.trim() && role)}
                confirmLabel="Send invite"
                fields={(errors) => (
                    <>
                        <label className="flex flex-col gap-1.5">
                            <span className={LABEL}>Email</span>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className={INPUT} />
                            {errors.email && <span className="text-xs text-[#D93838]">{errors.email}</span>}
                        </label>
                        <RoleSelect roles={roles} value={role} onChange={setRole} error={errors.role} />
                    </>
                )}
            />

            {/* role change */}
            <PasswordAction
                open={action?.kind === 'role'}
                onClose={() => setAction(null)}
                title="Change role"
                body={action?.kind === 'role' ? `What ${action.member.name ?? action.member.email} can see and do changes right away.` : undefined}
                url={action?.kind === 'role' ? `/dashboard/sub-admins/${action.member.uuid}/role` : '#'}
                method="put"
                data={{ role }}
                ready={Boolean(role)}
                confirmLabel="Save role"
                fields={(errors) => <RoleSelect roles={roles} value={role} onChange={setRole} error={errors.role} />}
            />

            {/* remove */}
            <PasswordAction
                open={action?.kind === 'remove'}
                onClose={() => setAction(null)}
                title={action?.kind === 'remove' && action.member.status === 'invited' ? 'Cancel this invite?' : 'Remove access?'}
                body={
                    action?.kind === 'remove'
                        ? action.member.status === 'invited'
                            ? `The invite link sent to ${action.member.email} will stop working.`
                            : `${action.member.name ?? action.member.email} is signed out everywhere immediately and can't open your dashboard again.`
                        : undefined
                }
                url={action?.kind === 'remove' ? `/dashboard/sub-admins/${action.member.uuid}` : '#'}
                method="delete"
                confirmLabel={action?.kind === 'remove' && action.member.status === 'invited' ? 'Cancel invite' : 'Remove'}
                tone="danger"
            />
        </TeamShell>
    );
}

function RoleSelect({ roles, value, onChange, error }: { roles: Props['roles']; value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Role</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
                <option value="" disabled>
                    Choose a role
                </option>
                {roles.map((r) => (
                    <option key={r.uuid} value={r.name}>
                        {r.name}
                        {r.is_template ? ' (ready-made)' : ''}
                    </option>
                ))}
            </select>
            <span className="text-[11px] text-[#8A8A96]">
                Manage what each role can do in the{' '}
                <Link href="/dashboard/roles" className="font-semibold text-[#4F46E5] hover:underline">
                    Roles
                </Link>{' '}
                tab.
            </span>
            {error && <span className="text-xs text-[#D93838]">{error}</span>}
        </label>
    );
}
