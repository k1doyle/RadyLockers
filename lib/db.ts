import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { QueryResultRow } from 'pg';
import {
  type AssignmentRow,
  type AuditLogRow,
  type FeeModel,
  type LockerRow,
  type LockerStatus,
  type RefundStatus,
} from '@/lib/data';
import { getDatabaseMode, describeConfiguredDatabase, getConfiguredDatabaseUrl, resolveLocalSqlitePath } from '@/lib/database-config';
import { ensurePostgresSchema, postgresQuery, postgresTransaction } from '@/lib/postgres';
import {
  STANDARD_FEE_MODEL,
  STANDARD_REFUNDABLE_DEPOSIT,
  STANDARD_TOTAL_COST,
} from '@/lib/policy';

type DashboardFilters = {
  search?: string;
  status?: string;
  quarter?: string;
  location?: string;
};

type DashboardLockerRow = LockerRow & {
  latest_request_id: number | null;
  latest_student_name: string | null;
  latest_ucsd_email: string | null;
  latest_program: string | null;
  latest_requested_quarter: string | null;
  latest_request_status: string | null;
};

type DashboardMetricRow = {
  status: string;
  count: number;
};

type DashboardLocationRow = {
  location: string;
};

type LockerExportRow = Record<string, string | number | null>;

type CreateAssignmentRequestInput = {
  student_name: string;
  ucsd_email: string;
  pid_or_student_id: string;
  program: string;
  requested_quarter: string;
  requested_rental_period: string;
  renewal_requested: number;
  notes: string | null;
  fee_model: FeeModel;
  amount_charged: number;
  refundable_amount: number;
  refund_status: RefundStatus;
  created_at: string;
  updated_at: string;
};

type CreateLockerInput = {
  locker_number: string;
  location: string;
  status: string;
  combo_1: string;
  combo_2: string;
  combo_3: string;
  combo_4: string;
  combo_5: string;
  active_combo_index: number;
  notes: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
};

type BulkCreateLockerInput = CreateLockerInput[];

type UpdateLockerInput = Omit<CreateLockerInput, 'created_at'> & {
  locker_id: number;
  updated_at: string;
};

type AssignLockerInput = {
  request_id: number;
  locker_id: number;
  assignment_start_date: string | null;
  assignment_end_date: string | null;
  fee_model: string;
  amount_charged: number;
  refundable_amount: number;
  payment_notes: string | null;
  updated_at: string;
};

type CompleteReturnInput = {
  request_id: number;
  locker_id: number;
  return_verified_by: string;
  refund_status: string;
  should_advance: boolean;
  now: string;
};

type LockerComboRow = {
  active_combo_index: number;
  combo_1: string;
  combo_2: string;
  combo_3: string;
  combo_4: string;
  combo_5: string;
};

const rootDir = process.cwd();
const sqliteSchemaPath = path.join(rootDir, 'db', 'schema.sql');
const configuredDatabaseUrl = getConfiguredDatabaseUrl();
const databaseMode = getDatabaseMode(configuredDatabaseUrl);

let sqliteDb: Database.Database | null = null;
const lockerNumberCollator = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base',
});

function unsupportedDatabaseError() {
  return new Error(
    `Database access is unavailable because DATABASE_URL is configured as ${describeConfiguredDatabase(configuredDatabaseUrl)}.`,
  );
}

function compareLockerNumbers(a: string, b: string) {
  const comparison = lockerNumberCollator.compare(a, b);
  if (comparison !== 0) return comparison;
  return a.localeCompare(b, 'en-US');
}

function sortLockersNaturally<T extends { locker_number: string; location: string }>(lockers: T[]) {
  return [...lockers].sort((a, b) => {
    const lockerComparison = compareLockerNumbers(a.locker_number, b.locker_number);
    if (lockerComparison !== 0) return lockerComparison;
    return a.location.localeCompare(b.location, 'en-US');
  });
}

function normalizeTimestamp(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeInteger(value: unknown, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return fallback;
}

function getActiveComboValue(locker: LockerComboRow) {
  const combos = [locker.combo_1, locker.combo_2, locker.combo_3, locker.combo_4, locker.combo_5];
  return combos[locker.active_combo_index - 1] || locker.combo_1;
}

function getRequestedRentalPeriod(renewalRequested: number) {
  return renewalRequested ? 'One Academic Quarter, with possible renewal request' : 'One Academic Quarter';
}

function mapLockerRow(row: Record<string, unknown>): LockerRow {
  return {
    locker_id: normalizeInteger(row.locker_id),
    locker_number: String(row.locker_number ?? ''),
    location: String(row.location ?? ''),
    locker_type: String(row.locker_type ?? ''),
    status: String(row.status ?? 'AVAILABLE') as LockerStatus,
    combo_1: String(row.combo_1 ?? ''),
    combo_2: String(row.combo_2 ?? ''),
    combo_3: String(row.combo_3 ?? ''),
    combo_4: String(row.combo_4 ?? ''),
    combo_5: String(row.combo_5 ?? ''),
    active_combo_index: normalizeInteger(row.active_combo_index, 1),
    notes: row.notes == null ? null : String(row.notes),
    disabled_reason: row.disabled_reason == null ? null : String(row.disabled_reason),
    created_at: normalizeTimestamp(row.created_at) ?? new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) ?? new Date(0).toISOString(),
  };
}

function mapAssignmentRow(row: Record<string, unknown>): AssignmentRow {
  const renewalRequested = normalizeInteger(row.renewal_requested);

  return {
    request_id: normalizeInteger(row.request_id),
    student_name: String(row.student_name ?? ''),
    ucsd_email: String(row.ucsd_email ?? ''),
    pid_or_student_id: String(row.pid_or_student_id ?? ''),
    program: String(row.program ?? ''),
    requested_quarter: String(row.requested_quarter ?? ''),
    requested_rental_period: row.requested_rental_period == null ? getRequestedRentalPeriod(renewalRequested) : String(row.requested_rental_period),
    request_status: String(row.request_status ?? 'SUBMITTED') as AssignmentRow['request_status'],
    assigned_locker_id: row.assigned_locker_id == null ? null : normalizeInteger(row.assigned_locker_id),
    assignment_start_date: normalizeTimestamp(row.assignment_start_date),
    assignment_end_date: normalizeTimestamp(row.assignment_end_date),
    returned_date: normalizeTimestamp(row.returned_date),
    return_verified_by: row.return_verified_by == null ? null : String(row.return_verified_by),
    renewal_requested: renewalRequested,
    notes: row.notes == null ? null : String(row.notes),
    fee_model: String(row.fee_model ?? STANDARD_FEE_MODEL) as FeeModel,
    amount_charged: normalizeInteger(row.amount_charged, STANDARD_TOTAL_COST),
    refundable_amount: normalizeInteger(row.refundable_amount, STANDARD_REFUNDABLE_DEPOSIT),
    refund_status: String(row.refund_status ?? 'PENDING') as RefundStatus,
    refund_date: normalizeTimestamp(row.refund_date),
    payment_notes: row.payment_notes == null ? null : String(row.payment_notes),
    created_at: normalizeTimestamp(row.created_at) ?? new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) ?? new Date(0).toISOString(),
  };
}

function mapAuditLogRow(row: Record<string, unknown>): AuditLogRow {
  return {
    id: normalizeInteger(row.id),
    action: String(row.action ?? ''),
    actor: String(row.actor ?? ''),
    details: String(row.details ?? ''),
    created_at: normalizeTimestamp(row.created_at) ?? new Date(0).toISOString(),
    locker_id: row.locker_id == null ? null : normalizeInteger(row.locker_id),
    assignment_id: row.assignment_id == null ? null : normalizeInteger(row.assignment_id),
  };
}

function mapDashboardLockerRow(row: Record<string, unknown>): DashboardLockerRow {
  const locker = mapLockerRow(row);

  return {
    ...locker,
    latest_request_id: row.latest_request_id == null ? null : normalizeInteger(row.latest_request_id),
    latest_student_name: row.latest_student_name == null ? null : String(row.latest_student_name),
    latest_ucsd_email: row.latest_ucsd_email == null ? null : String(row.latest_ucsd_email),
    latest_program: row.latest_program == null ? null : String(row.latest_program),
    latest_requested_quarter: row.latest_requested_quarter == null ? null : String(row.latest_requested_quarter),
    latest_request_status: row.latest_request_status == null ? null : String(row.latest_request_status),
  };
}

function mapExportRow(row: Record<string, unknown>): LockerExportRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value == null) return [key, null];
      if (value instanceof Date) return [key, value.toISOString()];
      return [key, value as string | number];
    }),
  );
}

function ensureSqliteSchema(db: Database.Database) {
  db.exec(fs.readFileSync(sqliteSchemaPath, 'utf8'));

  const assignmentColumns = db.pragma(`table_info(assignments)`) as Array<{ name: string }>;
  if (!assignmentColumns.some((column) => column.name === 'requested_rental_period')) {
    db.prepare(`ALTER TABLE assignments ADD COLUMN requested_rental_period TEXT`).run();
    db.prepare(`
      UPDATE assignments
      SET requested_rental_period = CASE
        WHEN renewal_requested = 1 THEN 'One Academic Quarter, with possible renewal request'
        ELSE 'One Academic Quarter'
      END
      WHERE requested_rental_period IS NULL
    `).run();
  }
}

export function getSqliteDb() {
  if (databaseMode !== 'sqlite') {
    throw unsupportedDatabaseError();
  }

  if (!sqliteDb) {
    const resolvedDbPath = resolveLocalSqlitePath(configuredDatabaseUrl);

    if (!resolvedDbPath) {
      throw unsupportedDatabaseError();
    }

    fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
    sqliteDb = new Database(resolvedDbPath);
    sqliteDb.pragma('foreign_keys = ON');
    ensureSqliteSchema(sqliteDb);
  }

  return sqliteDb;
}

export async function ensureDatabaseSchema() {
  if (databaseMode === 'sqlite') {
    getSqliteDb();
    return;
  }

  if (databaseMode === 'postgres') {
    await ensurePostgresSchema();
    return;
  }

  throw unsupportedDatabaseError();
}

export function isDatabaseReady() {
  return databaseMode === 'sqlite' || databaseMode === 'postgres';
}

export async function createAuditLog(action: string, details: string, lockerId?: number, assignmentId?: number) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(
      `INSERT INTO audit_logs (action, actor, details, locker_id, assignment_id) VALUES (?, 'admin', ?, ?, ?)`,
    ).run(action, details, lockerId ?? null, assignmentId ?? null);
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresQuery(
      `INSERT INTO audit_logs (action, actor, details, locker_id, assignment_id) VALUES ($1, 'admin', $2, $3, $4)`,
      [action, details, lockerId ?? null, assignmentId ?? null],
    );
    return;
  }

  throw unsupportedDatabaseError();
}

export async function getAppSetting(settingKey: string): Promise<string | null> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const row = db.prepare(`SELECT setting_value FROM app_settings WHERE setting_key = ?`).get(settingKey) as { setting_value: string | null } | undefined;
    return row?.setting_value ?? null;
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<{ setting_value: string | null }>(
      `SELECT setting_value FROM app_settings WHERE setting_key = $1`,
      [settingKey],
    );
    return result.rows[0]?.setting_value ?? null;
  }

  throw unsupportedDatabaseError();
}

export async function upsertAppSetting(settingKey: string, settingValue: string | null, updatedAt: string) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(`
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
    `).run(settingKey, settingValue, updatedAt);
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresQuery(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_at = EXCLUDED.updated_at`,
      [settingKey, settingValue, updatedAt],
    );
    return;
  }

  throw unsupportedDatabaseError();
}

export async function createAssignmentRequest(input: CreateAssignmentRequestInput) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(`
      INSERT INTO assignments (
        student_name, ucsd_email, pid_or_student_id, program, requested_quarter, requested_rental_period, request_status,
        renewal_requested, notes, fee_model, amount_charged, refundable_amount, refund_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.student_name,
      input.ucsd_email,
      input.pid_or_student_id,
      input.program,
      input.requested_quarter,
      input.requested_rental_period,
      input.renewal_requested,
      input.notes,
      input.fee_model,
      input.amount_charged,
      input.refundable_amount,
      input.refund_status,
      input.created_at,
      input.updated_at,
    );
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresQuery(
      `INSERT INTO assignments (
        student_name, ucsd_email, pid_or_student_id, program, requested_quarter, requested_rental_period, request_status,
        renewal_requested, notes, fee_model, amount_charged, refundable_amount, refund_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED', $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        input.student_name,
        input.ucsd_email,
        input.pid_or_student_id,
        input.program,
        input.requested_quarter,
        input.requested_rental_period,
        input.renewal_requested,
        input.notes,
        input.fee_model,
        input.amount_charged,
        input.refundable_amount,
        input.refund_status,
        input.created_at,
        input.updated_at,
      ],
    );
    return;
  }

  throw unsupportedDatabaseError();
}

export async function createLockerRecord(input: CreateLockerInput) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(`
      INSERT INTO lockers (
        locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
        active_combo_index, notes, disabled_reason, created_at, updated_at
      ) VALUES (?, ?, 'OUTDOOR_METAL_COMBINATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.locker_number,
      input.location,
      input.status,
      input.combo_1,
      input.combo_2,
      input.combo_3,
      input.combo_4,
      input.combo_5,
      input.active_combo_index,
      input.notes,
      input.disabled_reason,
      input.created_at,
      input.updated_at,
    );
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresQuery(
      `INSERT INTO lockers (
        locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
        active_combo_index, notes, disabled_reason, created_at, updated_at
      ) VALUES ($1, $2, 'OUTDOOR_METAL_COMBINATION', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        input.locker_number,
        input.location,
        input.status,
        input.combo_1,
        input.combo_2,
        input.combo_3,
        input.combo_4,
        input.combo_5,
        input.active_combo_index,
        input.notes,
        input.disabled_reason,
        input.created_at,
        input.updated_at,
      ],
    );
    return;
  }

  throw unsupportedDatabaseError();
}

export async function createLockerRecordsBulk(inputs: BulkCreateLockerInput) {
  if (!inputs.length) return 0;

  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const insertLocker = db.prepare(`
      INSERT INTO lockers (
        locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
        active_combo_index, notes, disabled_reason, created_at, updated_at
      ) VALUES (?, ?, 'OUTDOOR_METAL_COMBINATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((records: BulkCreateLockerInput) => {
      for (const input of records) {
        insertLocker.run(
          input.locker_number,
          input.location,
          input.status,
          input.combo_1,
          input.combo_2,
          input.combo_3,
          input.combo_4,
          input.combo_5,
          input.active_combo_index,
          input.notes,
          input.disabled_reason,
          input.created_at,
          input.updated_at,
        );
      }
    });

    transaction(inputs);
    return inputs.length;
  }

  if (databaseMode === 'postgres') {
    await postgresTransaction(async (client) => {
      for (const input of inputs) {
        await client.query(
          `INSERT INTO lockers (
            locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
            active_combo_index, notes, disabled_reason, created_at, updated_at
          ) VALUES ($1, $2, 'OUTDOOR_METAL_COMBINATION', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            input.locker_number,
            input.location,
            input.status,
            input.combo_1,
            input.combo_2,
            input.combo_3,
            input.combo_4,
            input.combo_5,
            input.active_combo_index,
            input.notes,
            input.disabled_reason,
            input.created_at,
            input.updated_at,
          ],
        );
      }
    });

    return inputs.length;
  }

  throw unsupportedDatabaseError();
}

export async function updateLockerRecord(input: UpdateLockerInput) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(`
      UPDATE lockers
      SET locker_number = ?, location = ?, status = ?, combo_1 = ?, combo_2 = ?, combo_3 = ?, combo_4 = ?, combo_5 = ?,
          active_combo_index = ?, notes = ?, disabled_reason = ?, updated_at = ?
      WHERE locker_id = ?
    `).run(
      input.locker_number,
      input.location,
      input.status,
      input.combo_1,
      input.combo_2,
      input.combo_3,
      input.combo_4,
      input.combo_5,
      input.active_combo_index,
      input.notes,
      input.disabled_reason,
      input.updated_at,
      input.locker_id,
    );

    const locker = db.prepare(`SELECT locker_number FROM lockers WHERE locker_id = ?`).get(input.locker_id) as { locker_number: string };
    return locker.locker_number;
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<{ locker_number: string }>(
      `UPDATE lockers
       SET locker_number = $1, location = $2, status = $3, combo_1 = $4, combo_2 = $5, combo_3 = $6, combo_4 = $7, combo_5 = $8,
           active_combo_index = $9, notes = $10, disabled_reason = $11, updated_at = $12
       WHERE locker_id = $13
       RETURNING locker_number`,
      [
        input.locker_number,
        input.location,
        input.status,
        input.combo_1,
        input.combo_2,
        input.combo_3,
        input.combo_4,
        input.combo_5,
        input.active_combo_index,
        input.notes,
        input.disabled_reason,
        input.updated_at,
        input.locker_id,
      ],
    );

    return result.rows[0]?.locker_number ?? input.locker_number;
  }

  throw unsupportedDatabaseError();
}

export async function assignLockerRecord(input: AssignLockerInput) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE assignments
        SET request_status = 'ASSIGNED', assigned_locker_id = ?, assignment_start_date = ?, assignment_end_date = ?,
            fee_model = ?, amount_charged = ?, refundable_amount = ?, refund_status = ?, payment_notes = ?, updated_at = ?
        WHERE request_id = ?
      `).run(
        input.locker_id,
        input.assignment_start_date,
        input.assignment_end_date,
        input.fee_model,
        input.amount_charged,
        input.refundable_amount,
        input.refundable_amount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
        input.payment_notes,
        input.updated_at,
        input.request_id,
      );

      db.prepare(`UPDATE lockers SET status = 'ASSIGNED', updated_at = ? WHERE locker_id = ?`).run(input.updated_at, input.locker_id);

      const locker = db.prepare(`
        SELECT locker_number, location, active_combo_index, combo_1, combo_2, combo_3, combo_4, combo_5
        FROM lockers
        WHERE locker_id = ?
      `).get(input.locker_id) as {
        locker_number: string;
        location: string;
        active_combo_index: number;
        combo_1: string;
        combo_2: string;
        combo_3: string;
        combo_4: string;
        combo_5: string;
      };
      const assignment = db.prepare(`SELECT student_name, ucsd_email FROM assignments WHERE request_id = ?`).get(input.request_id) as {
        student_name: string;
        ucsd_email: string;
      };

      return {
        locker_number: locker.locker_number,
        location: locker.location,
        combo_value: getActiveComboValue(locker),
        student_name: assignment.student_name,
        ucsd_email: assignment.ucsd_email,
      };
    });

    return transaction();
  }

  if (databaseMode === 'postgres') {
    return postgresTransaction(async (client) => {
      await client.query(
        `UPDATE assignments
         SET request_status = 'ASSIGNED', assigned_locker_id = $1, assignment_start_date = $2, assignment_end_date = $3,
             fee_model = $4, amount_charged = $5, refundable_amount = $6, refund_status = $7, payment_notes = $8, updated_at = $9
         WHERE request_id = $10`,
        [
          input.locker_id,
          input.assignment_start_date,
          input.assignment_end_date,
          input.fee_model,
          input.amount_charged,
          input.refundable_amount,
          input.refundable_amount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
          input.payment_notes,
          input.updated_at,
          input.request_id,
        ],
      );

      await client.query(`UPDATE lockers SET status = 'ASSIGNED', updated_at = $1 WHERE locker_id = $2`, [input.updated_at, input.locker_id]);

      const lockerResult = await client.query<{
        locker_number: string;
        location: string;
        active_combo_index: number;
        combo_1: string;
        combo_2: string;
        combo_3: string;
        combo_4: string;
        combo_5: string;
      }>(
        `SELECT locker_number, location, active_combo_index, combo_1, combo_2, combo_3, combo_4, combo_5 FROM lockers WHERE locker_id = $1`,
        [input.locker_id],
      );
      const assignmentResult = await client.query<{ student_name: string; ucsd_email: string }>(
        `SELECT student_name, ucsd_email FROM assignments WHERE request_id = $1`,
        [input.request_id],
      );
      const locker = lockerResult.rows[0];
      const assignment = assignmentResult.rows[0];

      return {
        locker_number: locker?.locker_number ?? '',
        location: locker?.location ?? '',
        combo_value: locker ? getActiveComboValue(locker) : '',
        student_name: assignment?.student_name ?? '',
        ucsd_email: assignment?.ucsd_email ?? '',
      };
    });
  }

  throw unsupportedDatabaseError();
}

export async function markPendingReturnRecord(requestId: number, lockerId: number, now: string) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.prepare(`UPDATE lockers SET status = 'PENDING_RETURN', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresQuery(`UPDATE lockers SET status = 'PENDING_RETURN', updated_at = $1 WHERE locker_id = $2`, [now, lockerId]);
    return;
  }

  throw unsupportedDatabaseError();
}

export async function completeReturnRecord(input: CompleteReturnInput) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const transaction = db.transaction(() => {
      const locker = db.prepare(`SELECT locker_number, active_combo_index FROM lockers WHERE locker_id = ?`).get(input.locker_id) as {
        locker_number: string;
        active_combo_index: number;
      };
      const nextIndex = input.should_advance ? Math.min(locker.active_combo_index + 1, 5) : locker.active_combo_index;

      db.prepare(`
        UPDATE assignments
        SET request_status = 'CLOSED', returned_date = ?, return_verified_by = ?, refund_status = ?, refund_date = ?, updated_at = ?
        WHERE request_id = ?
      `).run(
        input.now,
        input.return_verified_by,
        input.refund_status,
        input.refund_status === 'COMPLETED' ? input.now : null,
        input.now,
        input.request_id,
      );

      db.prepare(`UPDATE lockers SET status = 'RETURNED', active_combo_index = ?, updated_at = ? WHERE locker_id = ?`).run(
        nextIndex,
        input.now,
        input.locker_id,
      );

      return {
        locker_number: locker.locker_number,
        previous_index: locker.active_combo_index,
        next_index: nextIndex,
      };
    });

    return transaction();
  }

  if (databaseMode === 'postgres') {
    return postgresTransaction(async (client) => {
      const lockerResult = await client.query<{ locker_number: string; active_combo_index: number }>(
        `SELECT locker_number, active_combo_index FROM lockers WHERE locker_id = $1`,
        [input.locker_id],
      );
      const locker = lockerResult.rows[0];
      const nextIndex = input.should_advance ? Math.min(normalizeInteger(locker?.active_combo_index, 1) + 1, 5) : normalizeInteger(locker?.active_combo_index, 1);

      await client.query(
        `UPDATE assignments
         SET request_status = 'CLOSED', returned_date = $1, return_verified_by = $2, refund_status = $3, refund_date = $4, updated_at = $5
         WHERE request_id = $6`,
        [
          input.now,
          input.return_verified_by,
          input.refund_status,
          input.refund_status === 'COMPLETED' ? input.now : null,
          input.now,
          input.request_id,
        ],
      );

      await client.query(
        `UPDATE lockers SET status = 'RETURNED', active_combo_index = $1, updated_at = $2 WHERE locker_id = $3`,
        [nextIndex, input.now, input.locker_id],
      );

      return {
        locker_number: locker?.locker_number ?? '',
        previous_index: normalizeInteger(locker?.active_combo_index, 1),
        next_index: nextIndex,
      };
    });
  }

  throw unsupportedDatabaseError();
}

export async function advanceComboRecord(lockerId: number, now: string) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const transaction = db.transaction(() => {
      const locker = db.prepare(`SELECT active_combo_index, status FROM lockers WHERE locker_id = ?`).get(lockerId) as {
        active_combo_index: number;
        status: string;
      };
      const nextIndex = Math.min(locker.active_combo_index + 1, 5);

      db.prepare(`UPDATE lockers SET active_combo_index = ?, status = ?, updated_at = ? WHERE locker_id = ?`).run(
        nextIndex,
        locker.status === 'RETURNED' ? 'AVAILABLE' : locker.status,
        now,
        lockerId,
      );

      return {
        previous_index: locker.active_combo_index,
        next_index: nextIndex,
      };
    });

    return transaction();
  }

  if (databaseMode === 'postgres') {
    return postgresTransaction(async (client) => {
      const lockerResult = await client.query<{ active_combo_index: number; status: string }>(
        `SELECT active_combo_index, status FROM lockers WHERE locker_id = $1`,
        [lockerId],
      );
      const locker = lockerResult.rows[0];
      const previousIndex = normalizeInteger(locker?.active_combo_index, 1);
      const nextIndex = Math.min(previousIndex + 1, 5);

      await client.query(
        `UPDATE lockers SET active_combo_index = $1, status = $2, updated_at = $3 WHERE locker_id = $4`,
        [nextIndex, locker?.status === 'RETURNED' ? 'AVAILABLE' : locker?.status ?? 'AVAILABLE', now, lockerId],
      );

      return {
        previous_index: previousIndex,
        next_index: nextIndex,
      };
    });
  }

  throw unsupportedDatabaseError();
}

export async function closeAssignmentRecord(requestId: number, lockerId: number, now: string) {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    db.transaction(() => {
      db.prepare(`UPDATE assignments SET request_status = 'CLOSED', updated_at = ? WHERE request_id = ?`).run(now, requestId);
      db.prepare(`UPDATE lockers SET status = 'AVAILABLE', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
    })();
    return;
  }

  if (databaseMode === 'postgres') {
    await postgresTransaction(async (client) => {
      await client.query(`UPDATE assignments SET request_status = 'CLOSED', updated_at = $1 WHERE request_id = $2`, [now, requestId]);
      await client.query(`UPDATE lockers SET status = 'AVAILABLE', updated_at = $1 WHERE locker_id = $2`, [now, lockerId]);
    });
    return;
  }

  throw unsupportedDatabaseError();
}

export async function getDashboardData(filters: DashboardFilters): Promise<{
  lockers: DashboardLockerRow[];
  requests: AssignmentRow[];
  metrics: DashboardMetricRow[];
  locations: DashboardLocationRow[];
}> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const clauses: string[] = [];
    const params: Array<string | LockerStatus> = [];

    if (filters.status) {
      clauses.push('l.status = ?');
      params.push(filters.status as LockerStatus);
    }

    if (filters.location) {
      clauses.push('l.location = ?');
      params.push(filters.location);
    }

    if (filters.search) {
      clauses.push(`(
        l.locker_number LIKE ? OR
        l.location LIKE ? OR
        EXISTS (
          SELECT 1 FROM assignments a2
          WHERE a2.assigned_locker_id = l.locker_id
            AND (
              a2.student_name LIKE ? OR
              a2.ucsd_email LIKE ? OR
              a2.program LIKE ?
            )
        )
      )`);
      const token = `%${filters.search}%`;
      params.push(token, token, token, token, token);
    }

    if (filters.quarter) {
      clauses.push('EXISTS (SELECT 1 FROM assignments a3 WHERE a3.assigned_locker_id = l.locker_id AND a3.requested_quarter = ?)');
      params.push(filters.quarter);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const lockers = db.prepare(
      `SELECT l.*,
        a.request_id AS latest_request_id,
        a.student_name AS latest_student_name,
        a.ucsd_email AS latest_ucsd_email,
        a.program AS latest_program,
        a.requested_quarter AS latest_requested_quarter,
        a.request_status AS latest_request_status
      FROM lockers l
      LEFT JOIN assignments a ON a.request_id = (
        SELECT a1.request_id FROM assignments a1 WHERE a1.assigned_locker_id = l.locker_id ORDER BY a1.created_at DESC LIMIT 1
      )
      ${where}
      ORDER BY l.location ASC, l.locker_number ASC`,
    ).all(...params) as Record<string, unknown>[];

    const requests = db.prepare(
      `SELECT * FROM assignments WHERE request_status IN ('SUBMITTED','UNDER_REVIEW') ORDER BY created_at ASC`,
    ).all() as Record<string, unknown>[];

    const metrics = db.prepare(`SELECT status, COUNT(*) as count FROM lockers GROUP BY status`).all() as Record<string, unknown>[];
    const locations = db.prepare(`SELECT DISTINCT location FROM lockers ORDER BY location ASC`).all() as Record<string, unknown>[];

    return {
      lockers: sortLockersNaturally(lockers.map(mapDashboardLockerRow)),
      requests: requests.map(mapAssignmentRow),
      metrics: metrics.map((entry) => ({ status: String(entry.status), count: normalizeInteger(entry.count) })),
      locations: locations.map((entry) => ({ location: String(entry.location) })),
    };
  }

  if (databaseMode === 'postgres') {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const pushParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.status) {
      clauses.push(`l.status = ${pushParam(filters.status)}`);
    }

    if (filters.location) {
      clauses.push(`l.location = ${pushParam(filters.location)}`);
    }

    if (filters.search) {
      const token = `%${filters.search}%`;
      const p1 = pushParam(token);
      const p2 = pushParam(token);
      const p3 = pushParam(token);
      const p4 = pushParam(token);
      const p5 = pushParam(token);
      clauses.push(`(
        l.locker_number ILIKE ${p1} OR
        l.location ILIKE ${p2} OR
        EXISTS (
          SELECT 1 FROM assignments a2
          WHERE a2.assigned_locker_id = l.locker_id
            AND (
              a2.student_name ILIKE ${p3} OR
              a2.ucsd_email ILIKE ${p4} OR
              a2.program ILIKE ${p5}
            )
        )
      )`);
    }

    if (filters.quarter) {
      clauses.push(`EXISTS (SELECT 1 FROM assignments a3 WHERE a3.assigned_locker_id = l.locker_id AND a3.requested_quarter = ${pushParam(filters.quarter)})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [lockersResult, requestsResult, metricsResult, locationsResult] = await Promise.all([
      postgresQuery<QueryResultRow>(
        `SELECT l.*,
          a.request_id AS latest_request_id,
          a.student_name AS latest_student_name,
          a.ucsd_email AS latest_ucsd_email,
          a.program AS latest_program,
          a.requested_quarter AS latest_requested_quarter,
          a.request_status AS latest_request_status
        FROM lockers l
        LEFT JOIN assignments a ON a.request_id = (
          SELECT a1.request_id FROM assignments a1 WHERE a1.assigned_locker_id = l.locker_id ORDER BY a1.created_at DESC LIMIT 1
        )
        ${where}
        ORDER BY l.location ASC, l.locker_number ASC`,
        params,
      ),
      postgresQuery<QueryResultRow>(
        `SELECT * FROM assignments WHERE request_status IN ('SUBMITTED','UNDER_REVIEW') ORDER BY created_at ASC`,
      ),
      postgresQuery<QueryResultRow>(
        `SELECT status, COUNT(*)::int AS count FROM lockers GROUP BY status`,
      ),
      postgresQuery<QueryResultRow>(
        `SELECT DISTINCT location FROM lockers ORDER BY location ASC`,
      ),
    ]);

    return {
      lockers: sortLockersNaturally(lockersResult.rows.map((row) => mapDashboardLockerRow(row as Record<string, unknown>))),
      requests: requestsResult.rows.map((row) => mapAssignmentRow(row as Record<string, unknown>)),
      metrics: metricsResult.rows.map((entry) => ({ status: String(entry.status), count: normalizeInteger(entry.count) })),
      locations: locationsResult.rows.map((entry) => ({ location: String(entry.location) })),
    };
  }

  throw unsupportedDatabaseError();
}

export async function getLockerDetail(lockerId: number): Promise<{
  locker: LockerRow;
  assignments: AssignmentRow[];
  auditLogs: AuditLogRow[];
} | null> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const locker = db.prepare(`SELECT * FROM lockers WHERE locker_id = ?`).get(lockerId) as Record<string, unknown> | undefined;
    if (!locker) return null;

    const assignments = db.prepare(`SELECT * FROM assignments WHERE assigned_locker_id = ? ORDER BY created_at DESC`).all(lockerId) as Record<string, unknown>[];
    const auditLogs = db.prepare(`SELECT * FROM audit_logs WHERE locker_id = ? ORDER BY created_at DESC`).all(lockerId) as Record<string, unknown>[];

    return {
      locker: mapLockerRow(locker),
      assignments: assignments.map(mapAssignmentRow),
      auditLogs: auditLogs.map(mapAuditLogRow),
    };
  }

  if (databaseMode === 'postgres') {
    const [lockerResult, assignmentsResult, auditLogsResult] = await Promise.all([
      postgresQuery<QueryResultRow>(`SELECT * FROM lockers WHERE locker_id = $1`, [lockerId]),
      postgresQuery<QueryResultRow>(`SELECT * FROM assignments WHERE assigned_locker_id = $1 ORDER BY created_at DESC`, [lockerId]),
      postgresQuery<QueryResultRow>(`SELECT * FROM audit_logs WHERE locker_id = $1 ORDER BY created_at DESC`, [lockerId]),
    ]);

    const locker = lockerResult.rows[0];
    if (!locker) return null;

    return {
      locker: mapLockerRow(locker as Record<string, unknown>),
      assignments: assignmentsResult.rows.map((row) => mapAssignmentRow(row as Record<string, unknown>)),
      auditLogs: auditLogsResult.rows.map((row) => mapAuditLogRow(row as Record<string, unknown>)),
    };
  }

  throw unsupportedDatabaseError();
}

export async function getRequestDetail(requestId: number): Promise<AssignmentRow | undefined> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const row = db.prepare(`SELECT * FROM assignments WHERE request_id = ?`).get(requestId) as Record<string, unknown> | undefined;
    return row ? mapAssignmentRow(row) : undefined;
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<QueryResultRow>(`SELECT * FROM assignments WHERE request_id = $1`, [requestId]);
    const row = result.rows[0];
    return row ? mapAssignmentRow(row as Record<string, unknown>) : undefined;
  }

  throw unsupportedDatabaseError();
}

export async function getAvailableLockers(): Promise<LockerRow[]> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const rows = db.prepare(`SELECT * FROM lockers WHERE status IN ('AVAILABLE','RETURNED') ORDER BY location ASC, locker_number ASC`).all() as Record<string, unknown>[];
    return sortLockersNaturally(rows.map(mapLockerRow));
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<QueryResultRow>(
      `SELECT * FROM lockers WHERE status IN ('AVAILABLE','RETURNED') ORDER BY location ASC, locker_number ASC`,
    );
    return sortLockersNaturally(result.rows.map((row) => mapLockerRow(row as Record<string, unknown>)));
  }

  throw unsupportedDatabaseError();
}

export async function getCurrentAssignmentsExport(): Promise<LockerExportRow[]> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const rows = db.prepare(
      `SELECT a.*, l.locker_number, l.location, l.status AS locker_status, l.active_combo_index
       FROM assignments a
       LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
       WHERE a.request_status = 'ASSIGNED'
       ORDER BY a.student_name ASC`,
    ).all() as Record<string, unknown>[];

    return rows.map(mapExportRow);
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<QueryResultRow>(
      `SELECT a.*, l.locker_number, l.location, l.status AS locker_status, l.active_combo_index
       FROM assignments a
       LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
       WHERE a.request_status = 'ASSIGNED'
       ORDER BY a.student_name ASC`,
    );

    return result.rows.map((row) => mapExportRow(row as Record<string, unknown>));
  }

  throw unsupportedDatabaseError();
}

export async function getHistoryExport(): Promise<LockerExportRow[]> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const rows = db.prepare(
      `SELECT a.*, l.locker_number, l.location
       FROM assignments a
       LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
       ORDER BY a.requested_quarter DESC, a.student_name ASC`,
    ).all() as Record<string, unknown>[];

    return rows.map(mapExportRow);
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<QueryResultRow>(
      `SELECT a.*, l.locker_number, l.location
       FROM assignments a
       LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
       ORDER BY a.requested_quarter DESC, a.student_name ASC`,
    );

    return result.rows.map((row) => mapExportRow(row as Record<string, unknown>));
  }

  throw unsupportedDatabaseError();
}

export async function getAllLockers(): Promise<LockerRow[]> {
  if (databaseMode === 'sqlite') {
    const db = getSqliteDb();
    const rows = db.prepare(`SELECT * FROM lockers ORDER BY location ASC, locker_number ASC`).all() as Record<string, unknown>[];
    return sortLockersNaturally(rows.map(mapLockerRow));
  }

  if (databaseMode === 'postgres') {
    const result = await postgresQuery<QueryResultRow>(`SELECT * FROM lockers ORDER BY location ASC, locker_number ASC`);
    return sortLockersNaturally(result.rows.map((row) => mapLockerRow(row as Record<string, unknown>)));
  }

  throw unsupportedDatabaseError();
}
