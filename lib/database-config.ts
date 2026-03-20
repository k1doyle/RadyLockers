import path from 'path';

const DEFAULT_SQLITE_DATABASE_URL = 'file:./data/rady-lockers.db';
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function getConfiguredDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_SQLITE_DATABASE_URL;
}

export function isPostgresDatabaseUrl(databaseUrl = getConfiguredDatabaseUrl()) {
  return databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
}

export function isLocalSqliteDatabaseUrl(databaseUrl = getConfiguredDatabaseUrl()) {
  return databaseUrl.startsWith('file:') || !URL_SCHEME_PATTERN.test(databaseUrl);
}

export function canUseLocalSqliteRuntime(databaseUrl = getConfiguredDatabaseUrl()) {
  return isLocalSqliteDatabaseUrl(databaseUrl) && !process.env.VERCEL;
}

export function resolveLocalSqlitePath(databaseUrl = getConfiguredDatabaseUrl()) {
  if (!isLocalSqliteDatabaseUrl(databaseUrl)) return null;

  const dbFile = databaseUrl.startsWith('file:') ? databaseUrl.slice(5) : databaseUrl;
  return path.resolve(process.cwd(), dbFile);
}

export function describeConfiguredDatabase(databaseUrl = getConfiguredDatabaseUrl()) {
  if (isPostgresDatabaseUrl(databaseUrl)) return 'a Postgres connection string';
  if (isLocalSqliteDatabaseUrl(databaseUrl)) {
    return process.env.VERCEL ? 'a local SQLite path on Vercel' : 'a local SQLite path';
  }

  return 'a non-file database URL';
}
