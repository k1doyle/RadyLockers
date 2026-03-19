import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { AuditLogRow, AssignmentRow, LockerRow, LockerStatus } from '@/lib/data';

const rootDir = process.cwd();
const defaultDbFile = process.env.VERCEL ? '/tmp/rady-lockers.db' : './data/rady-lockers.db';
const dbFile = process.env.DATABASE_URL?.replace('file:', '') || defaultDbFile;
const resolvedDbPath = path.resolve(rootDir, dbFile);
const schemaPath = path.join(rootDir, 'db', 'schema.sql');

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
const db = new Database(resolvedDbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

function seedDemoDataIfNeeded() {
  if (!process.env.VERCEL) {
    return;
  }

  const existingLockerCount = db.prepare(`SELECT COUNT(*) as count FROM lockers`).get() as { count: number };
  if (existingLockerCount.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const insertLocker = db.prepare(`
    INSERT INTO lockers (
      locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
      active_combo_index, notes, disabled_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLocker.run('OM-101', 'Rady Courtyard East', 'OUTDOOR_METAL_COMBINATION', 'AVAILABLE', '12-24-08', '31-10-22', '19-05-33', '27-11-02', '15-30-09', 2, 'Near faculty entrance.', null, now, now);
  insertLocker.run('OM-102', 'Rady Courtyard East', 'OUTDOOR_METAL_COMBINATION', 'ASSIGNED', '14-28-09', '06-18-31', '22-04-16', '11-25-07', '32-17-01', 3, null, null, now, now);
  insertLocker.run('OM-201', 'Rady Patio West', 'OUTDOOR_METAL_COMBINATION', 'PENDING_RETURN', '21-09-14', '16-03-27', '30-11-05', '08-26-18', '13-32-06', 5, 'Flag for facilities review after next return.', null, now, now);
  insertLocker.run('OM-202', 'Rady Patio West', 'OUTDOOR_METAL_COMBINATION', 'DISABLED', '10-22-04', '25-07-15', '02-19-31', '28-12-08', '17-29-03', 1, null, 'Door hinge repair request opened.', now, now);

  const lockers = db.prepare(`SELECT locker_id, locker_number FROM lockers ORDER BY locker_id ASC`).all() as Array<{ locker_id: number; locker_number: string }>;
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (
      student_name, ucsd_email, pid_or_student_id, program, requested_quarter, request_status, assigned_locker_id,
      assignment_start_date, assignment_end_date, returned_date, return_verified_by, renewal_requested, notes,
      fee_model, amount_charged, refundable_amount, refund_status, refund_date, payment_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run('Ariana Patel', 'arpatel@ucsd.edu', 'A12345678', 'Full-Time MBA', 'Spring 2026', 'SUBMITTED', null, null, null, null, null, 0, 'Would like a locker close to the courtyard entrance.', 'FLAT_25_NON_REFUNDABLE', 25, 0, 'NOT_APPLICABLE', null, null, now, now);
  insertAssignment.run('Daniel Kim', 'dkim@ucsd.edu', 'A16789012', 'Master of Finance', 'Spring 2026', 'ASSIGNED', lockers[1].locker_id, '2026-03-30', '2026-06-12', null, null, 0, 'Orientation week assignment.', 'DEPOSIT_50_WITH_25_REFUND', 50, 25, 'PENDING', null, 'Paid by department card terminal.', now, now);
  insertAssignment.run('Sophia Ramirez', 'sramirez@ucsd.edu', 'A19876543', 'FlexWeekend MBA', 'Winter 2026', 'CLOSED', lockers[2].locker_id, '2026-01-06', '2026-03-20', '2026-03-18', 'Maria Staff', 1, 'Returned empty; combo advanced pending approval.', 'DEPOSIT_50_WITH_25_REFUND', 50, 25, 'COMPLETED', '2026-03-19', 'Refund processed in office.', now, now);

  const assignments = db.prepare(`SELECT request_id FROM assignments ORDER BY request_id ASC`).all() as Array<{ request_id: number }>;
  const insertAudit = db.prepare(`INSERT INTO audit_logs (action, actor, details, locker_id, assignment_id, created_at) VALUES (?, 'system', ?, ?, ?, ?)`);
  insertAudit.run('SEED_ASSIGNMENT', `Assigned ${lockers[1].locker_number} to Daniel Kim.`, lockers[1].locker_id, assignments[1].request_id, now);
  insertAudit.run('SEED_RETURN', `Recorded return workflow for ${lockers[2].locker_number}.`, lockers[2].locker_id, assignments[2].request_id, now);
  insertAudit.run('SEED_NOTE', `${lockers[0].locker_number} is available for next assignment.`, lockers[0].locker_id, null, now);
}

seedDemoDataIfNeeded();

export { db };

export function createAuditLog(action: string, details: string, lockerId?: number, assignmentId?: number) {
  db.prepare(
    `INSERT INTO audit_logs (action, actor, details, locker_id, assignment_id) VALUES (?, 'admin', ?, ?, ?)`,
  ).run(action, details, lockerId ?? null, assignmentId ?? null);
}

export function getDashboardData(filters: { search?: string; status?: string; quarter?: string; location?: string }) {
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
  ).all(...params) as Array<LockerRow & {
    latest_request_id: number | null;
    latest_student_name: string | null;
    latest_ucsd_email: string | null;
    latest_program: string | null;
    latest_requested_quarter: string | null;
    latest_request_status: string | null;
  }>;

  const requests = db.prepare(
    `SELECT * FROM assignments WHERE request_status IN ('SUBMITTED','UNDER_REVIEW') ORDER BY created_at ASC`,
  ).all() as AssignmentRow[];

  const metrics = db.prepare(`SELECT status, COUNT(*) as count FROM lockers GROUP BY status`).all() as Array<{ status: string; count: number }>;
  const locations = db.prepare(`SELECT DISTINCT location FROM lockers ORDER BY location ASC`).all() as Array<{ location: string }>;

  return { lockers, requests, metrics, locations };
}

export function getLockerDetail(lockerId: number) {
  const locker = db.prepare(`SELECT * FROM lockers WHERE locker_id = ?`).get(lockerId) as LockerRow | undefined;
  if (!locker) return null;
  const assignments = db.prepare(`SELECT * FROM assignments WHERE assigned_locker_id = ? ORDER BY created_at DESC`).all(lockerId) as AssignmentRow[];
  const auditLogs = db.prepare(`SELECT * FROM audit_logs WHERE locker_id = ? ORDER BY created_at DESC`).all(lockerId) as AuditLogRow[];
  return { locker, assignments, auditLogs };
}

export function getRequestDetail(requestId: number) {
  return db.prepare(`SELECT * FROM assignments WHERE request_id = ?`).get(requestId) as AssignmentRow | undefined;
}

export function getAvailableLockers() {
  return db.prepare(`
    SELECT * FROM lockers
    WHERE status IN ('AVAILABLE','RETURNED')
      AND NOT EXISTS (
        SELECT 1 FROM assignments
        WHERE assigned_locker_id = lockers.locker_id
          AND request_status = 'ASSIGNED'
      )
    ORDER BY location ASC, locker_number ASC
  `).all() as LockerRow[];
}

export function getCurrentAssignmentsExport() {
  return db.prepare(
    `SELECT a.*, l.locker_number, l.location, l.status AS locker_status, l.active_combo_index
     FROM assignments a
     LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
     WHERE a.request_status = 'ASSIGNED'
     ORDER BY a.student_name ASC`,
  ).all();
}

export function getHistoryExport() {
  return db.prepare(
    `SELECT a.*, l.locker_number, l.location
     FROM assignments a
     LEFT JOIN lockers l ON l.locker_id = a.assigned_locker_id
     ORDER BY a.requested_quarter DESC, a.student_name ASC`,
  ).all();
}

export function getAllLockers() {
  return db.prepare(`SELECT * FROM lockers ORDER BY location ASC, locker_number ASC`).all() as LockerRow[];
}
