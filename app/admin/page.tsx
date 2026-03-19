import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';
import { MetricCard } from '@/components/metric-card';
import { StatusBadge } from '@/components/status-badge';
import { createLocker } from '@/app/actions';
import { lockerStatuses, quarters } from '@/lib/constants';
import { requireAdmin } from '@/lib/auth';
import { getDashboardData } from '@/lib/queries';
import { formatStatus } from '@/lib/utils';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { lockers, requests, metrics, locations } = getDashboardData({
    search: typeof params.search === 'string' ? params.search : '',
    status: typeof params.status === 'string' ? params.status : '',
    quarter: typeof params.quarter === 'string' ? params.quarter : '',
    location: typeof params.location === 'string' ? params.location : '',
  });
  const metricMap = new Map(metrics.map((entry) => [entry.status, entry.count]));

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Operations Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Outdoor locker inventory</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Manage locker supply, assign requests, process returns, rotate combination positions, and export operational data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/api/export/current" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              Export current CSV
            </Link>
            <Link href="/api/export/history" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              Export history CSV
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Available lockers" value={metricMap.get('AVAILABLE') ?? 0} description="Ready for assignment this quarter." />
          <MetricCard label="Assigned lockers" value={metricMap.get('ASSIGNED') ?? 0} description="Currently occupied by active students." />
          <MetricCard label="Pending return" value={metricMap.get('PENDING_RETURN') ?? 0} description="Awaiting empty-check verification and closeout." />
          <MetricCard label="Disabled lockers" value={metricMap.get('DISABLED') ?? 0} description="Unavailable pending facilities or staff review." />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-navy">Locker inventory</h2>
                <p className="mt-2 text-sm text-slate-500">Search by locker number, student, email, location, or program.</p>
              </div>
            </div>
            <form className="mt-6 grid gap-4 md:grid-cols-4">
              <input name="search" defaultValue={typeof params.search === 'string' ? params.search : ''} placeholder="Search lockers or students" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              <select name="status" defaultValue={typeof params.status === 'string' ? params.status : ''} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All statuses</option>
                {lockerStatuses.map((status) => (
                  <option key={status} value={status}>{formatStatus(status)}</option>
                ))}
              </select>
              <select name="quarter" defaultValue={typeof params.quarter === 'string' ? params.quarter : ''} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All quarters</option>
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>{quarter}</option>
                ))}
              </select>
              <select name="location" defaultValue={typeof params.location === 'string' ? params.location : ''} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All locations</option>
                {locations.map((entry) => (
                  <option key={entry.location} value={entry.location}>{entry.location}</option>
                ))}
              </select>
              <div className="md:col-span-4 flex gap-3">
                <button className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white">Apply filters</button>
                <Link href="/admin" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Clear</Link>
              </div>
            </form>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-3 pr-4 font-medium">Locker</th>
                    <th className="py-3 pr-4 font-medium">Location</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Current student</th>
                    <th className="py-3 pr-4 font-medium">Quarter</th>
                    <th className="py-3 pr-4 font-medium">Combo index</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lockers.map((locker) => (
                    <tr key={locker.locker_id}>
                      <td className="py-4 pr-4 font-semibold text-brand-navy">{locker.locker_number}</td>
                      <td className="py-4 pr-4 text-slate-600">{locker.location}</td>
                      <td className="py-4 pr-4"><StatusBadge status={locker.status} /></td>
                      <td className="py-4 pr-4 text-slate-600">{locker.latest_student_name ?? '—'}</td>
                      <td className="py-4 pr-4 text-slate-600">{locker.latest_requested_quarter ?? '—'}</td>
                      <td className="py-4 pr-4 text-slate-600">
                        {locker.active_combo_index}
                        {locker.active_combo_index === 5 ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Review</span> : null}
                      </td>
                      <td className="py-4">
                        <Link href={`/admin/lockers/${locker.locker_id}`} className="font-medium text-brand-blue">
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Open student requests</h2>
              <div className="mt-5 space-y-4">
                {requests.length ? (
                  requests.map((request) => (
                    <div key={request.request_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{request.student_name}</p>
                          <p className="text-sm text-slate-500">{request.ucsd_email}</p>
                        </div>
                        <StatusBadge status={request.request_status} />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{request.program} · {request.requested_quarter}</p>
                      <Link href={`/admin/request/${request.request_id}`} className="mt-3 inline-flex text-sm font-medium text-brand-blue">
                        Review request
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No open requests at the moment.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Create locker</h2>
              <form action={createLocker} className="mt-5 space-y-4">
                <input name="locker_number" placeholder="Locker number" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <input name="location" placeholder="Location" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input name="combo_1" placeholder="Combo 1" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input name="combo_2" placeholder="Combo 2" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input name="combo_3" placeholder="Combo 3" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input name="combo_4" placeholder="Combo 4" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input name="combo_5" placeholder="Combo 5" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input name="active_combo_index" type="number" min="1" max="5" defaultValue="1" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                </div>
                <select name="status" defaultValue="AVAILABLE" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  {lockerStatuses.map((status) => (
                    <option key={status} value={status}>{formatStatus(status)}</option>
                  ))}
                </select>
                <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <textarea name="disabled_reason" placeholder="Disabled reason if applicable" className="min-h-20 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <button className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white">Create locker</button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
