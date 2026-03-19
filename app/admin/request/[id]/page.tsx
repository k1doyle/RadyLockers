import Link from 'next/link';
import { notFound } from 'next/navigation';
import { assignLocker } from '@/app/actions';
import { AdminShell } from '@/components/admin-shell';
import { StatusBadge } from '@/components/status-badge';
import { requireAdmin } from '@/lib/auth';
import { getAvailableLockers, getRequestDetail } from '@/lib/db';
import { formatAdminDate, formatStatus } from '@/lib/utils';

export default async function RequestReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const error = typeof query.error === 'string' ? query.error : '';
  const request = getRequestDetail(Number(id));
  if (!request) notFound();

  const availableLockers = getAvailableLockers();
  const hasAvailableLockers = availableLockers.length > 0;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/admin" className="text-sm font-medium text-brand-blue">← Back to dashboard</Link>
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Request Review</p>
              <h1 className="mt-2 text-3xl font-semibold text-brand-navy">{request.student_name}</h1>
              <p className="mt-2 text-sm text-slate-500">{request.ucsd_email} · {request.program}</p>
            </div>
            <StatusBadge status={request.request_status} />
          </div>

          {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <h2 className="text-lg font-semibold text-slate-900">Student details</h2>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="font-medium text-slate-500">Student ID</dt>
                  <dd>{request.pid_or_student_id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Requested quarter</dt>
                  <dd>{request.requested_quarter}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Requested rental period</dt>
                  <dd>{request.renewal_requested ? 'One Academic Quarter, with possible renewal request' : 'One Academic Quarter'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Submitted</dt>
                  <dd>{formatAdminDate(request.created_at)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Notes</dt>
                  <dd>{request.notes || 'No notes submitted.'}</dd>
                </div>
              </dl>
            </div>

            <form action={assignLocker} className="rounded-2xl border border-slate-200 p-5">
              <input type="hidden" name="request_id" value={request.request_id} />
              <h2 className="text-lg font-semibold text-brand-navy">Assign locker</h2>
              <p className="mt-2 text-sm text-slate-500">Only lockers without an active assignment can be selected and assigned.</p>
              {!hasAvailableLockers ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No lockers are currently available to assign. Return to the dashboard after a locker is marked available.
                </p>
              ) : null}
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <label className="block font-medium">
                  Locker
                  <select name="locker_id" required disabled={!hasAvailableLockers} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-500">
                    <option value="">Select a locker</option>
                    {availableLockers.map((locker) => (
                      <option key={locker.locker_id} value={locker.locker_id}>
                        {locker.locker_number} · {locker.location} · combo slot {locker.active_combo_index}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-medium">
                  Assignment start date
                  <input type="date" name="assignment_start_date" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                </label>
                <label className="block font-medium">
                  Assignment end date
                  <input type="date" name="assignment_end_date" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                </label>
                <label className="block font-medium">
                  Fee model
                  <select name="fee_model" defaultValue={request.fee_model} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                    <option value="FLAT_25_NON_REFUNDABLE">{formatStatus('FLAT_25_NON_REFUNDABLE')}</option>
                    <option value="DEPOSIT_50_WITH_25_REFUND">{formatStatus('DEPOSIT_50_WITH_25_REFUND')}</option>
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block font-medium">
                    Amount charged
                    <input type="number" name="amount_charged" defaultValue={request.amount_charged} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  </label>
                  <label className="block font-medium">
                    Refundable amount
                    <input type="number" name="refundable_amount" defaultValue={request.refundable_amount} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  </label>
                </div>
                <label className="block font-medium">
                  Payment notes
                  <textarea name="payment_notes" defaultValue={request.payment_notes ?? undefined} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                </label>
                <button disabled={!hasAvailableLockers} className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Assign locker</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
