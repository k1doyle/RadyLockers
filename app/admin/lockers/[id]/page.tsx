import Link from 'next/link';
import { notFound } from 'next/navigation';
import { advanceCombo, closeAssignment, completeReturn, markPendingReturn, updateLocker } from '@/app/actions';
import { AdminShell } from '@/components/admin-shell';
import { TextAreaField, TextField } from '@/components/forms';
import { StatusBadge } from '@/components/status-badge';
import { lockerStatuses } from '@/lib/constants';
import { requireAdmin } from '@/lib/auth';
import { getLockerDetail } from '@/lib/db';
import { formatCurrency, formatFeeModel, formatStatus, getComboValue } from '@/lib/utils';

export default async function LockerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getLockerDetail(Number(id));
  if (!data) notFound();

  const { locker, assignments, auditLogs } = data;
  const activeAssignment = assignments.find((assignment) => assignment.request_status === 'ASSIGNED');
  const latestAssignment = assignments[0];

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-brand-blue">← Back to dashboard</Link>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Locker {locker.locker_number}</h1>
            <p className="mt-2 text-sm text-slate-500">{locker.location} · Outdoor metal combination locker</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={locker.status} />
            {locker.active_combo_index === 5 ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Combination 5: facilities review recommended</span> : null}
          </div>
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-brand-navy">Locker configuration</h2>
                  <p className="mt-2 text-sm text-slate-500">Admins can edit all preset combinations and the active combination index.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Active combination: <span className="font-semibold text-brand-navy">{getComboValue(locker)}</span>
                </div>
              </div>

              <form action={updateLocker} className="mt-6 grid gap-4 md:grid-cols-2">
                <input type="hidden" name="locker_id" value={locker.locker_id} />
                <TextField name="locker_number" label="Locker number" required defaultValue={locker.locker_number} />
                <TextField name="location" label="Location" required defaultValue={locker.location} />
                <label className="block text-sm font-medium text-slate-700">
                  Status
                  <select name="status" defaultValue={locker.status} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                    {lockerStatuses.map((status) => (
                      <option key={status} value={status}>{formatStatus(status)}</option>
                    ))}
                  </select>
                </label>
                <TextField name="active_combo_index" label="Active combo index" type="number" required defaultValue={locker.active_combo_index} />
                <TextField name="combo_1" label="Combination 1" required defaultValue={locker.combo_1} />
                <TextField name="combo_2" label="Combination 2" defaultValue={locker.combo_2} />
                <TextField name="combo_3" label="Combination 3" defaultValue={locker.combo_3} />
                <TextField name="combo_4" label="Combination 4" defaultValue={locker.combo_4} />
                <TextField name="combo_5" label="Combination 5" defaultValue={locker.combo_5} />
                <div className="md:col-span-2">
                  <TextAreaField name="notes" label="Notes" defaultValue={locker.notes} />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField name="disabled_reason" label="Disabled reason" defaultValue={locker.disabled_reason} />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white">Save locker updates</button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Assignment history</h2>
              <div className="mt-5 space-y-4">
                {assignments.length ? (
                  assignments.map((assignment) => (
                    <div key={assignment.request_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{assignment.student_name}</p>
                          <p className="text-sm text-slate-500">{assignment.ucsd_email} · {assignment.program}</p>
                        </div>
                        <StatusBadge status={assignment.request_status} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>Quarter: {assignment.requested_quarter}</p>
                        <p>Rental period: {assignment.requested_rental_period ?? 'Not provided'}</p>
                        <p>Fee model: {formatFeeModel(assignment.fee_model)}</p>
                        <p>Charged: {formatCurrency(assignment.amount_charged)}</p>
                        <p>Refundable: {formatCurrency(assignment.refundable_amount)}</p>
                        <p>Renewal requested: {assignment.renewal_requested ? 'Yes' : 'No'}</p>
                        <p>Returned: {assignment.returned_date ? new Date(assignment.returned_date).toLocaleDateString() : 'Not yet returned'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No assignment history yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Current workflow</h2>
              {activeAssignment ? (
                <div className="mt-5 space-y-5 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{activeAssignment.student_name}</p>
                    <p>{activeAssignment.requested_quarter}</p>
                    <p className="mt-2">Ends: {activeAssignment.assignment_end_date ? new Date(activeAssignment.assignment_end_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <form action={markPendingReturn} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <input type="hidden" name="request_id" value={activeAssignment.request_id} />
                    <input type="hidden" name="locker_id" value={locker.locker_id} />
                    <p className="font-semibold text-slate-900">Mark as pending return</p>
                    <button className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">Move to pending return</button>
                  </form>
                  <form action={closeAssignment} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <input type="hidden" name="request_id" value={activeAssignment.request_id} />
                    <input type="hidden" name="locker_id" value={locker.locker_id} />
                    <p className="font-semibold text-slate-900">Close assignment manually</p>
                    <button className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">Close assignment</button>
                  </form>
                </div>
              ) : latestAssignment ? (
                <form action={completeReturn} className="mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <input type="hidden" name="request_id" value={latestAssignment.request_id} />
                  <input type="hidden" name="locker_id" value={locker.locker_id} />
                  <p className="font-semibold text-slate-900">Complete return workflow</p>
                  <TextField name="return_verified_by" label="Verified by" required />
                  <label className="block text-sm font-medium text-slate-700">
                    Refund status
                    <select name="refund_status" defaultValue={latestAssignment.refund_status} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                      {['NOT_APPLICABLE', 'PENDING', 'COMPLETED', 'FORFEITED'].map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input type="checkbox" name="advance_combo" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                    Advance locker to the next preset combination
                  </label>
                  <button className="rounded-xl bg-brand-navy px-4 py-3 font-semibold text-white">Verify return and close</button>
                </form>
              ) : (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No assignment is connected to this locker yet.</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Combination workflow</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Advance the active combination only after staff verifies the locker is empty. Previous student combinations should not be reused for the next renter.
              </p>
              <form action={advanceCombo} className="mt-5">
                <input type="hidden" name="locker_id" value={locker.locker_id} />
                <button className="rounded-xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white">Advance combo position</button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Recent audit log</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                {auditLogs.length ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{log.action}</p>
                      <p className="mt-1">{log.details}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">No audit entries yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
