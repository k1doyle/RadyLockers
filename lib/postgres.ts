import fs from 'fs';
import path from 'path';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { getConfiguredDatabaseUrl, getDatabaseMode } from '@/lib/database-config';

declare global {
  var __radyPostgresPool: Pool | undefined;
  var __radyPostgresSchemaPromise: Promise<void> | undefined;
}

const schemaPath = path.join(process.cwd(), 'db', 'postgres-schema.sql');

function getPostgresPool() {
  if (getDatabaseMode() !== 'postgres') {
    throw new Error('Postgres pool requested without a Postgres DATABASE_URL configuration.');
  }

  if (!globalThis.__radyPostgresPool) {
    globalThis.__radyPostgresPool = new Pool({
      connectionString: getConfiguredDatabaseUrl(),
    });
  }

  return globalThis.__radyPostgresPool;
}

export async function ensurePostgresSchema() {
  if (!globalThis.__radyPostgresSchemaPromise) {
    globalThis.__radyPostgresSchemaPromise = (async () => {
      const pool = getPostgresPool();
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    })();
  }

  await globalThis.__radyPostgresSchemaPromise;
}

export async function postgresQuery<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensurePostgresSchema();
  return getPostgresPool().query<T>(text, values);
}

export async function postgresTransaction<T>(run: (client: PoolClient) => Promise<T>) {
  await ensurePostgresSchema();
  const pool = getPostgresPool();
  const client = await pool.connect();

  await client.query('BEGIN');

  try {
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
