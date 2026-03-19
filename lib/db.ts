import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { AuditLogRow, AssignmentRow, LockerRow, LockerStatus } from '@/lib/data';

const rootDir = process.cwd();
const dbFile = process.env.DATABASE_URL?.replace('file:', '') || './data/rady-lockers.db';
const resolvedDbPath = path.resolve(rootDir, dbFile);
const schemaPath = path.join(rootDir, 'db', 'schema.sql');

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
const db = new Database(resolvedDbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

function withTimestamp(fields: Record<string, unknown>) {
  return { ...fields, updated_at: new Date().toISOString() };
}

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
  return db.prepare(`SELECT * FROM lockers WHERE status IN ('AVAILABLE','RETURNED') ORDER BY location ASC, locker_number ASC`).all() as LockerRow[];
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
