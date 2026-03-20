import path from 'path';

const DEFAULT_SQLITE_DATABASE_URL = 'file:./data/rady-lockers.db';
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
export type DatabaseMode = 'sqlite' | 'postgres' | 'unsupported';

export function getConfiguredDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_SQLITE_DATABASE_URL;
}

export function isPostgresDatabaseUrl(databaseUrl = getConfiguredDatabaseUrl()) {
  return databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
}

export function isLocalSqliteDatabaseUrl(databaseUrl = getConfiguredDatabaseUrl()) {
  return databaseUrl.startsWith('file:') || !URL_SCHEME_PATTERN.test(databaseUrl);
}

export function getDatabaseMode(databaseUrl = getConfiguredDatabaseUrl()): DatabaseMode {
  if (isPostgresDatabaseUrl(databaseUrl)) return 'postgres';
  if (isLocalSqliteDatabaseUrl(databaseUrl)) {
    return process.env.VERCEL ? 'unsupported' : 'sqlite';
  }

  return 'unsupported';
}

export function canUseLocalSqliteRuntime(databaseUrl = getConfiguredDatabaseUrl()) {
  return getDatabaseMode(databaseUrl) === 'sqlite';
}

export function canUseDatabaseRuntime(databaseUrl = getConfiguredDatabaseUrl()) {
  return getDatabaseMode(databaseUrl) !== 'unsupported';
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
