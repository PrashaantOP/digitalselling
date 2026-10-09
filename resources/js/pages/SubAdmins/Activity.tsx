import { relativeTime, TeamShell } from '@/components/team/team-shell';
import { Link } from '@inertiajs/react';
import { History } from 'lucide-react';

interface Entry {
    id: number;
    action: string;
    subject: string | null;
    meta: Record<string, unknown> | null;
    actor: string | null;
    ip: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    prev_page_url: string | null;
    next_page_url: string | null;
}

const LABELS: Record<string, (e: Entry) => string> = {
    'member.invited': (e) => `invited ${e.subject} as ${String(e.meta?.role ?? '—')}`,
    'invite.resent': (e) => `resent the invite to ${e.subject}`,
    'invite.cancelled': (e) => `cancelled the invite for ${e.subject}`,
    'member.joined': (e) => `${e.subject} joined the team`,
    'member.removed': (e) => `removed ${e.subject}`,
    'member.role_changed': (e) => `changed ${e.subject}'s role from ${String(e.meta?.from ?? '—')} to ${String(e.meta?.to ?? '—')}`,
    'member.signed_in': (e) => `${e.subject} signed in`,
    'role.created': (e) => `created the role "${e.subject}"`,
    'role.updated': (e) => `updated the role "${e.subject}"`,
    'role.deleted': (e) => `deleted the role "${e.subject}"`,
};

const SELF_DESCRIBING = ['member.joined', 'member.signed_in'];

export default function TeamActivity({ entries }: { entries: Paginated<Entry> }) {
    return (
        <TeamShell active="activity" title="Activity" description="Who changed your team and when — invites, removals, role changes and team sign-ins.">
            <div className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
                {entries.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <History className="size-6 text-cp-muted" />
                        <p className="text-sm font-semibold text-cp-ink">No team activity yet</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-cp-line/60">
                        {entries.data.map((e) => {
                            const text = LABELS[e.action]?.(e) ?? e.action;
                            return (
                                <li key={e.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                                    <p className="text-sm text-cp-ink">
                                        {!SELF_DESCRIBING.includes(e.action) && <span className="font-semibold">{e.actor ?? 'Someone'} </span>}
                                        {text}
                                    </p>
                                    <span className="shrink-0 text-right text-xs text-cp-muted">
                                        {relativeTime(e.created_at)}
                                        {e.ip && <span className="block font-mono text-[10px]">{e.ip}</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {(entries.prev_page_url || entries.next_page_url) && (
                    <div className="flex justify-between border-t border-cp-line/60 px-5 py-3 text-xs font-semibold">
                        {entries.prev_page_url ? <Link href={entries.prev_page_url} className="text-cp-brand-ink">← Newer</Link> : <span />}
                        {entries.next_page_url ? <Link href={entries.next_page_url} className="text-cp-brand-ink">Older →</Link> : <span />}
                    </div>
                )}
            </div>
        </TeamShell>
    );
}
