import { AdminShell } from '@/components/admin-shell';
import { AdminNotificationSettingsSection } from '@/components/admin-notification-settings-section';
import { requireAdmin } from '@/lib/auth';
import { canUseDatabaseRuntime, describeConfiguredDatabase, getConfiguredDatabaseUrl } from '@/lib/database-config';
import {
  getLockerAssignmentNotificationConfig,
  getLockerRequestNotificationConfig,
} from '@/lib/notifications';

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const adminDataAvailable = canUseDatabaseRuntime();
  const settingsSaved = typeof params.settingsSaved === 'string' ? params.settingsSaved : '';
  const settingsError = typeof params.settingsError === 'string' ? params.settingsError : '';

  if (!adminDataAvailable) {
    return (
      <AdminShell currentSection="notifications">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Notification Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Admin data is temporarily unavailable</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This deployment is configured with {describeConfiguredDatabase(getConfiguredDatabaseUrl())}, but no supported runtime database adapter is available. The page is rendering safely, but live locker inventory, requests, exports, and admin updates are unavailable in this environment until database access is configured correctly.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const [requestNotificationConfig, assignmentNotificationConfig] = await Promise.all([
    getLockerRequestNotificationConfig(),
    getLockerAssignmentNotificationConfig(),
  ]);

  return (
    <AdminShell currentSection="notifications">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Notification Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-navy">Email inboxes and delivery settings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Manage the internal inboxes used for request alerts and assignment email copies.
          </p>
        </div>

        {settingsSaved ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{settingsSaved}</div> : null}
        {settingsError ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{settingsError}</div> : null}

        <div className="mt-8">
          <AdminNotificationSettingsSection
            requestNotificationConfig={requestNotificationConfig}
            assignmentNotificationConfig={assignmentNotificationConfig}
          />
        </div>
      </div>
    </AdminShell>
  );
}
