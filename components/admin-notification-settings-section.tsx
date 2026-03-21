import { updateNotificationSettings } from '@/app/actions';
import type { NotificationConfig } from '@/lib/notifications';

export function AdminNotificationSettingsSection({
  requestNotificationConfig,
  assignmentNotificationConfig,
}: {
  requestNotificationConfig: NotificationConfig;
  assignmentNotificationConfig: NotificationConfig;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-brand-navy">Email notifications</h2>
      <p className="mt-2 text-sm text-slate-500">Manage the internal inboxes used for request alerts and assignment email copies.</p>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          Request inbox:{' '}
          <span className="font-medium text-slate-900">{requestNotificationConfig.effectiveRecipient ?? 'Not configured'}</span>
        </p>
        <p className="mt-2">
          Request source:{' '}
          <span className="font-medium text-slate-900">
            {requestNotificationConfig.source === 'admin'
              ? 'Admin setting'
              : requestNotificationConfig.source === 'environment'
                ? 'Environment fallback'
                : 'None'}
          </span>
        </p>
        <p className="mt-2">
          Assignment copy inbox:{' '}
          <span className="font-medium text-slate-900">{assignmentNotificationConfig.effectiveRecipient ?? 'Not configured'}</span>
        </p>
        <p className="mt-2">
          Assignment source:{' '}
          <span className="font-medium text-slate-900">
            {assignmentNotificationConfig.source === 'admin'
              ? 'Admin setting'
              : assignmentNotificationConfig.source === 'environment'
                ? 'Environment fallback'
                : assignmentNotificationConfig.source === 'request-setting'
                  ? 'Request inbox setting'
                  : assignmentNotificationConfig.source === 'request-environment'
                    ? 'Request inbox environment fallback'
                    : 'None'}
          </span>
        </p>
        <p className="mt-2">
          Delivery status:{' '}
          <span className="font-medium text-slate-900">
            {requestNotificationConfig.deliveryConfigured
              ? `SMTP configured${requestNotificationConfig.fromAddress ? ` (${requestNotificationConfig.fromAddress})` : ''}`
              : 'SMTP not configured'}
          </span>
        </p>
      </div>
      <form action={updateNotificationSettings} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Request notification inbox
            <input
              type="email"
              name="notification_email"
              defaultValue={requestNotificationConfig.savedRecipient ?? ''}
              placeholder={requestNotificationConfig.envRecipient ?? 'studentaffairs@ucsd.edu'}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>
          <p className="mt-2 text-sm text-slate-500">
            Leave blank to use <span className="font-medium text-slate-700">LOCKER_REQUEST_NOTIFICATION_EMAIL</span>.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Assignment copy inbox
            <input
              type="email"
              name="assignment_notification_email"
              defaultValue={assignmentNotificationConfig.savedRecipient ?? ''}
              placeholder={assignmentNotificationConfig.envRecipient ?? requestNotificationConfig.effectiveRecipient ?? 'gsa@ucsd.edu'}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </label>
          <p className="mt-2 text-sm text-slate-500">
            Leave blank to use <span className="font-medium text-slate-700">LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL</span>, then fall back to the request inbox if needed.
          </p>
        </div>
        <button className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white">Save email settings</button>
      </form>
    </section>
  );
}
