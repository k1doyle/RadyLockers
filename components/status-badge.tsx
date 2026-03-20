import { cn, formatStatus } from '@/lib/utils';

const styles: Record<string, string> = {
  AVAILABLE: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
  ASSIGNED: 'border border-blue-200 bg-blue-50 text-blue-800',
  PENDING_RETURN: 'border border-amber-200 bg-amber-50 text-amber-800',
  RETURNED: 'border border-teal-200 bg-teal-50 text-teal-800',
  OVERDUE: 'border border-rose-200 bg-rose-50 text-rose-800',
  DISABLED: 'border border-slate-300 bg-slate-100 text-slate-700',
  SUBMITTED: 'border border-cyan-200 bg-cyan-50 text-cyan-800',
  UNDER_REVIEW: 'border border-indigo-200 bg-indigo-50 text-indigo-800',
  CLOSED: 'border border-slate-300 bg-slate-100 text-slate-700',
  WAITLISTED: 'border border-orange-200 bg-orange-50 text-orange-800',
  DECLINED: 'border border-rose-200 bg-rose-50 text-rose-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        styles[status] ?? 'bg-slate-100 text-slate-700',
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
