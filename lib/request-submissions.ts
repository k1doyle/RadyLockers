import { canUseDatabaseRuntime, describeConfiguredDatabase, getConfiguredDatabaseUrl, getDatabaseMode } from '@/lib/database-config';

export const REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE =
  getDatabaseMode() === 'unsupported'
    ? `Live locker request submission is temporarily unavailable because this deployment is configured with ${describeConfiguredDatabase(getConfiguredDatabaseUrl())}, and no supported runtime database adapter is available. No request will be saved from this form right now.`
    : '';

export function areRequestSubmissionsAvailable() {
  return canUseDatabaseRuntime();
}
