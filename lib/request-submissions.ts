import { canUseLocalSqliteRuntime, describeConfiguredDatabase, getConfiguredDatabaseUrl, isPostgresDatabaseUrl } from '@/lib/database-config';

export const REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE =
  isPostgresDatabaseUrl()
    ? 'Live locker request submission is temporarily unavailable because this deployment is configured with a Postgres database URL, but request persistence is still implemented only for the local SQLite workflow. No request will be saved from this form right now.'
    : `Live locker request submission is temporarily unavailable because this deployment is configured with ${describeConfiguredDatabase(getConfiguredDatabaseUrl())}, and local SQLite persistence is not available here. No request will be saved from this form right now.`;

export function areRequestSubmissionsAvailable() {
  return canUseLocalSqliteRuntime();
}
