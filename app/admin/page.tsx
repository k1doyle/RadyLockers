import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';
import { MetricCard } from '@/components/metric-card';
import { StatusBadge } from '@/components/status-badge';
import { lockerStatuses, quarters } from '@/lib/constants';
import { requireAdmin } from '@/lib/auth';
import { canUseDatabaseRuntime, describeConfiguredDatabase, getConfiguredDatabaseUrl } from '@/lib/database-config';
import { getDashboardData } from '@/lib/queries';
import { formatStatus } from '@/lib/utils';

function formatPacificDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(value));
}

function getDaysLeft(value: string | Date) {
  const pacificDateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
  const getPacificMidnight = (date: Date) => {
    const parts = pacificDateFormatter.formatToParts(date);
    const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
    const month = Number(parts.find((part) => part.type === 'month')?.value ?? 1);
    const day = Number(parts.find((part) => part.type === 'day')?.value ?? 1);

    return Date.UTC(year, month - 1, day);
  };

  return Math.ceil((getPacificMidnight(new Date(value)) - getPacificMidnight(new Date())) / (1000 * 60 * 60 * 24));
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const adminDataAvailable = canUseDatabaseRuntime();
  const filterSearch = typeof params.search === 'string' ? params.search : '';
  const filterStatus = typeof params.status === 'string' ? params.status : '';
  const filterQuarter = typeof params.quarter === 'string' ? params.quarter : '';
  const filterTiming = typeof params.timing === 'string' ? params.timing : '';
  const requestedPage = Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  if (!adminDataAvailable) {
    return (
      <AdminShell currentSection="dashboard">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Rady Locker Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Admin data is temporarily unavailable</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This deployment is configured with {describeConfiguredDatabase(getConfiguredDatabaseUrl())}, but no supported runtime database adapter is available. The page is rendering safely, but live locker inventory, requests, exports, and admin updates are unavailable in this environment until database access is configured correctly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  const [{ lockers, requests, metrics, totalLockers, currentPage, pageSize }] = await Promise.all([
    getDashboardData({
      search: filterSearch,
      status: filterStatus,
      quarter: filterQuarter,
      location: '',
      page,
      pageSize: 25,
    }),
  ]);
  const metricMap = new Map(metrics.map((entry) => [entry.status, entry.count]));
  const endingSoonCount = lockers.filter((locker) => {
    if (!locker.latest_assignment_end_date) return false;
    const daysLeft = getDaysLeft(locker.latest_assignment_end_date);
    return daysLeft >= 0 && daysLeft <= 14;
  }).length;
  const dueTodayCount = lockers.filter((locker) => {
    if (!locker.latest_assignment_end_date) return false;
    return getDaysLeft(locker.latest_assignment_end_date) === 0;
  }).length;
  const overdueCount = lockers.filter((locker) => {
    if (!locker.latest_assignment_end_date) return false;
    return getDaysLeft(locker.latest_assignment_end_date) < 0;
  }).length;
  const filteredLockers = lockers.filter((locker) => {
    if (!filterTiming) return true;
    if (!locker.latest_assignment_end_date) return false;

    const daysLeft = getDaysLeft(locker.latest_assignment_end_date);

    if (filterTiming === 'ending-soon') return daysLeft >= 1 && daysLeft <= 14;
    if (filterTiming === 'due-today') return daysLeft === 0;
    if (filterTiming === 'overdue') return daysLeft < 0;

    return true;
  });
  const filteredLockerCount = filteredLockers.length;
  const totalPages = Math.max(1, Math.ceil(totalLockers / pageSize));
  const showingStart = filteredLockerCount ? 1 : 0;
  const showingEnd = filteredLockerCount;
  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (filterSearch) search.set('search', filterSearch);
    if (filterStatus) search.set('status', filterStatus);
    if (filterQuarter) search.set('quarter', filterQuarter);
    if (filterTiming) search.set('timing', filterTiming);
    if (nextPage > 1) search.set('page', String(nextPage));
    const query = search.toString();
    return query ? `/admin?${query}` : '/admin';
  };

  return (
    <AdminShell currentSection="dashboard">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Rady Locker Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Locker inventory and request queue</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Monitor locker availability, review student requests, assign lockers, and manage return workflow from one place.
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

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <MetricCard label="Available lockers" value={metricMap.get('AVAILABLE') ?? 0} description="Ready for assignment." tone="border-emerald-200" />
          <MetricCard label="Assigned lockers" value={metricMap.get('ASSIGNED') ?? 0} description="Currently checked out." tone="border-blue-200" />
          <MetricCard label="Pending return" value={metricMap.get('PENDING_RETURN') ?? 0} description="Awaiting return verification." tone="border-amber-200" />
          <MetricCard label="Due today" value={dueTodayCount} description="Return deadline is today." tone="border-amber-300" />
          <MetricCard label="Overdue" value={overdueCount} description="Past the return deadline." tone="border-rose-200" />
          <MetricCard label="Ending soon" value={endingSoonCount} description="Due within 14 days on this page." tone="border-amber-300" />
          <MetricCard label="Disabled lockers" value={metricMap.get('DISABLED') ?? 0} description="Unavailable for use." tone="border-slate-300" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-navy">Locker inventory</h2>
                <p className="mt-2 text-sm text-slate-500">Search by locker number, student, email, or program.</p>
              </div>
            </div>
            <form className="mt-6 grid gap-4 md:grid-cols-4">
              <input name="search" defaultValue={filterSearch} placeholder="Search lockers or students" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              <select name="status" defaultValue={filterStatus} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All statuses</option>
                {lockerStatuses.map((status) => (
                  <option key={status} value={status}>{formatStatus(status)}</option>
                ))}
              </select>
              <select name="quarter" defaultValue={filterQuarter} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All quarters</option>
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>{quarter}</option>
                ))}
              </select>
              <select name="timing" defaultValue={filterTiming} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                <option value="">All return timing</option>
                <option value="ending-soon">Ending soon</option>
                <option value="due-today">Due today</option>
                <option value="overdue">Overdue</option>
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
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Current student</th>
                    <th className="py-3 pr-4 font-medium">Return due</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLockers.length ? (
                    filteredLockers.map((locker) => {
                      const daysLeft = locker.latest_assignment_end_date ? getDaysLeft(locker.latest_assignment_end_date) : null;
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const isEndingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
                      const returnDueText = daysLeft === null ? null : daysLeft === 0 ? 'Due today' : daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'day left' : 'days left'}` : `Past due by ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'day' : 'days'}`;

                      return (
                        <tr key={locker.locker_id}>
                          <td className="py-4 pr-4 font-semibold text-brand-navy">{locker.locker_number}</td>
                          <td className="py-4 pr-4"><StatusBadge status={locker.status} /></td>
                          <td className="py-4 pr-4 text-slate-600">{locker.latest_student_name ?? '—'}</td>
                          <td className="py-4 pr-4 text-slate-600">
                            <div className="space-y-1">
                              <p>{locker.latest_requested_quarter ?? '—'}</p>
                              {isOverdue ? (
                                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
                                  Overdue
                                </span>
                              ) : isEndingSoon ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                  Ending Soon
                                </span>
                              ) : null}
                              {locker.latest_assignment_end_date ? (
                                <>
                                  <p className="text-xs text-slate-500">Ends {formatPacificDate(locker.latest_assignment_end_date)}</p>
                                  {returnDueText ? <p className="text-xs text-slate-500">{returnDueText}</p> : null}
                                </>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4">
                            <Link href={`/admin/lockers/${locker.locker_id}`} className="font-medium text-brand-blue">
                              View details
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        No lockers matched the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>Showing {showingStart}-{showingEnd} of {filteredLockerCount} lockers</p>
              <div className="flex items-center gap-3">
                {currentPage > 1 ? (
                  <Link href={buildPageHref(currentPage - 1)} className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700">
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-300">Previous</span>
                )}
                <span className="font-medium text-slate-700">Page {currentPage} of {totalPages}</span>
                {currentPage < totalPages ? (
                  <Link href={buildPageHref(currentPage + 1)} className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700">
                    Next
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-300">Next</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Open requests</h2>
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
                      <Link
                        href={`/admin/request/${request.request_id}`}
                        className="mt-4 inline-flex items-center rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13233c]"
                      >
                        Review Request
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No open requests at the moment.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
