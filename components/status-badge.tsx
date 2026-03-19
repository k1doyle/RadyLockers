import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PENDING_RETURN: 'bg-amber-100 text-amber-800',
  RETURNED: 'bg-violet-100 text-violet-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  DISABLED: 'bg-slate-200 text-slate-700',
  SUBMITTED: 'bg-sky-100 text-sky-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  CLOSED: 'bg-slate-200 text-slate-700',
  WAITLISTED: 'bg-orange-100 text-orange-700',
  DECLINED: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        styles[status] ?? 'bg-slate-100 text-slate-700',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
