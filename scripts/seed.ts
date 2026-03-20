import { getDb } from '../lib/db';
import { LOCKER_TYPE } from '../lib/data';

const db = getDb();

function reset() {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM assignments;
    DELETE FROM lockers;
    DELETE FROM sqlite_sequence WHERE name IN ('audit_logs','assignments','lockers');
  `);
}

function seed() {
  reset();

  const insertLocker = db.prepare(`
    INSERT INTO lockers (
      locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
      active_combo_index, notes, disabled_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  insertLocker.run('OM-101', 'Rady Courtyard East', LOCKER_TYPE, 'AVAILABLE', '12-24-08', '31-10-22', '19-05-33', '27-11-02', '15-30-09', 2, 'Near faculty entrance.', null, now, now);
  insertLocker.run('OM-102', 'Rady Courtyard East', LOCKER_TYPE, 'ASSIGNED', '14-28-09', '06-18-31', '22-04-16', '11-25-07', '32-17-01', 3, null, null, now, now);
  insertLocker.run('OM-201', 'Rady Patio West', LOCKER_TYPE, 'PENDING_RETURN', '21-09-14', '16-03-27', '30-11-05', '08-26-18', '13-32-06', 5, 'Flag for facilities review after next return.', null, now, now);
  insertLocker.run('OM-202', 'Rady Patio West', LOCKER_TYPE, 'DISABLED', '10-22-04', '25-07-15', '02-19-31', '28-12-08', '17-29-03', 1, null, 'Door hinge repair request opened.', now, now);

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

seed();
console.log('Seeded rady-lockers.db with demo lockers, requests, and audit data.');
