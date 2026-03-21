import { AdminShell } from '@/components/admin-shell';
import { AdminLockerManagementSections } from '@/components/admin-locker-management-sections';
import { requireAdmin } from '@/lib/auth';
import { canUseDatabaseRuntime, describeConfiguredDatabase, getConfiguredDatabaseUrl } from '@/lib/database-config';

export default async function AdminLockersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const adminDataAvailable = canUseDatabaseRuntime();
  const imported = typeof params.imported === 'string' ? params.imported : '';
  const importError = typeof params.importError === 'string' ? params.importError : '';

  if (!adminDataAvailable) {
    return (
      <AdminShell currentSection="lockers">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Locker Management</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Admin data is temporarily unavailable</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This deployment is configured with {describeConfiguredDatabase(getConfiguredDatabaseUrl())}, but no supported runtime database adapter is available. The page is rendering safely, but live locker inventory, requests, exports, and admin updates are unavailable in this environment until database access is configured correctly.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell currentSection="lockers">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Locker Management</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Import inventory and add lockers</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Use these tools for one-off locker setup tasks without crowding the daily operations dashboard.
          </p>
        </div>

        <div className="mt-8">
          <AdminLockerManagementSections imported={imported} importError={importError} />
        </div>
      </div>
    </AdminShell>
  );
}
