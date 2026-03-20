'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_COOKIE } from '@/lib/auth';
import { FEE_MODELS, LOCKER_STATUSES, REFUND_STATUSES } from '@/lib/data';
import { rentalPeriods } from '@/lib/constants';
import { areRequestSubmissionsAvailable, REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE } from '@/lib/request-submissions';

const requestSchema = z.object({
  student_name: z.string().min(2),
  ucsd_email: z.string().email().refine((value) => value.endsWith('@ucsd.edu'), 'Use your UCSD email'),
  pid_or_student_id: z.string().min(6),
  program: z.string().min(2),
  requested_quarter: z.string().min(2),
  requested_rental_period: z.enum(rentalPeriods),
  reason: z.string().optional(),
  acknowledged_terms: z.literal('on'),
});

export async function submitLockerRequest(formData: FormData) {
  if (!areRequestSubmissionsAvailable()) {
    redirect(`/request?notice=${encodeURIComponent(REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE)}`);
  }

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/request?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Unable to submit request')}`);
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const renewalRequested = data.requested_rental_period === 'One Academic Quarter, with possible renewal request' ? 1 : 0;
  const { db } = await import('@/lib/db');

  db.prepare(`
    INSERT INTO assignments (
      student_name, ucsd_email, pid_or_student_id, program, requested_quarter, request_status,
      renewal_requested, notes, fee_model, amount_charged, refundable_amount, refund_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, 'DEPOSIT_50_WITH_25_REFUND', 50, 25, 'PENDING', ?, ?)
  `).run(
    data.student_name,
    data.ucsd_email,
    data.pid_or_student_id,
    data.program,
    data.requested_quarter,
    renewalRequested,
    data.reason || null,
    now,
    now,
  );

  redirect('/request/confirmation');
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get('password') || '');

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    redirect('/admin/login?error=Invalid password');
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  redirect('/admin');
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect('/');
}

export async function createLocker(formData: FormData) {
  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  if (!LOCKER_STATUSES.includes(status as never)) redirect('/admin');
  const { db } = await import('@/lib/db');

  db.prepare(`
    INSERT INTO lockers (
      locker_number, location, locker_type, status, combo_1, combo_2, combo_3, combo_4, combo_5,
      active_combo_index, notes, disabled_reason, created_at, updated_at
    ) VALUES (?, ?, 'OUTDOOR_METAL_COMBINATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(formData.get('locker_number') || '').trim(),
    String(formData.get('location') || '').trim(),
    status,
    String(formData.get('combo_1') || '').trim(),
    String(formData.get('combo_2') || '').trim(),
    String(formData.get('combo_3') || '').trim(),
    String(formData.get('combo_4') || '').trim(),
    String(formData.get('combo_5') || '').trim(),
    Number(formData.get('active_combo_index') || 1),
    String(formData.get('notes') || '').trim() || null,
    String(formData.get('disabled_reason') || '').trim() || null,
    now,
    now,
  );

  redirect('/admin');
}

export async function updateLocker(formData: FormData) {
  const lockerId = Number(formData.get('locker_id'));
  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');

  db.prepare(`
    UPDATE lockers
    SET locker_number = ?, location = ?, status = ?, combo_1 = ?, combo_2 = ?, combo_3 = ?, combo_4 = ?, combo_5 = ?,
        active_combo_index = ?, notes = ?, disabled_reason = ?, updated_at = ?
    WHERE locker_id = ?
  `).run(
    String(formData.get('locker_number') || '').trim(),
    String(formData.get('location') || '').trim(),
    status,
    String(formData.get('combo_1') || '').trim(),
    String(formData.get('combo_2') || '').trim(),
    String(formData.get('combo_3') || '').trim(),
    String(formData.get('combo_4') || '').trim(),
    String(formData.get('combo_5') || '').trim(),
    Number(formData.get('active_combo_index') || 1),
    String(formData.get('notes') || '').trim() || null,
    String(formData.get('disabled_reason') || '').trim() || null,
    now,
    lockerId,
  );

  const locker = db.prepare(`SELECT locker_number FROM lockers WHERE locker_id = ?`).get(lockerId) as { locker_number: string };
  createAuditLog('UPDATE_LOCKER', `Updated locker ${locker.locker_number}.`, lockerId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function assignLocker(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const feeModel = String(formData.get('fee_model') || 'FLAT_25_NON_REFUNDABLE');
  const amountCharged = Number(formData.get('amount_charged') || 25);
  const refundableAmount = Number(formData.get('refundable_amount') || 0);
  const paymentNotes = String(formData.get('payment_notes') || '').trim() || null;
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');

  if (!FEE_MODELS.includes(feeModel as never)) redirect(`/admin/request/${requestId}`);

  db.prepare(`
    UPDATE assignments
    SET request_status = 'ASSIGNED', assigned_locker_id = ?, assignment_start_date = ?, assignment_end_date = ?,
        fee_model = ?, amount_charged = ?, refundable_amount = ?, refund_status = ?, payment_notes = ?, updated_at = ?
    WHERE request_id = ?
  `).run(
    lockerId,
    String(formData.get('assignment_start_date') || '') || null,
    String(formData.get('assignment_end_date') || '') || null,
    feeModel,
    amountCharged,
    refundableAmount,
    refundableAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
    paymentNotes,
    now,
    requestId,
  );

  db.prepare(`UPDATE lockers SET status = 'ASSIGNED', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);

  const locker = db.prepare(`SELECT locker_number FROM lockers WHERE locker_id = ?`).get(lockerId) as { locker_number: string };
  const assignment = db.prepare(`SELECT student_name FROM assignments WHERE request_id = ?`).get(requestId) as { student_name: string };
  createAuditLog('ASSIGN_LOCKER', `Assigned locker ${locker.locker_number} to ${assignment.student_name}.`, lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function markPendingReturn(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');

  db.prepare(`UPDATE lockers SET status = 'PENDING_RETURN', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
  createAuditLog('PENDING_RETURN', 'Marked locker pending return.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function completeReturn(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const refundStatus = String(formData.get('refund_status') || 'NOT_APPLICABLE');
  const shouldAdvance = formData.get('advance_combo') === 'on';
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');

  if (!REFUND_STATUSES.includes(refundStatus as never)) redirect(`/admin/lockers/${lockerId}`);

  const locker = db.prepare(`SELECT locker_number, active_combo_index FROM lockers WHERE locker_id = ?`).get(lockerId) as {
    locker_number: string;
    active_combo_index: number;
  };
  const nextIndex = shouldAdvance ? Math.min(locker.active_combo_index + 1, 5) : locker.active_combo_index;

  db.prepare(`
    UPDATE assignments
    SET request_status = 'CLOSED', returned_date = ?, return_verified_by = ?, refund_status = ?, refund_date = ?, updated_at = ?
    WHERE request_id = ?
  `).run(
    now,
    String(formData.get('return_verified_by') || '').trim(),
    refundStatus,
    refundStatus === 'COMPLETED' ? now : null,
    now,
    requestId,
  );

  db.prepare(`UPDATE lockers SET status = 'RETURNED', active_combo_index = ?, updated_at = ? WHERE locker_id = ?`).run(nextIndex, now, lockerId);
  createAuditLog('COMPLETE_RETURN', `Closed assignment and ${shouldAdvance ? 'advanced' : 'retained'} combo index for locker ${locker.locker_number}.`, lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function advanceCombo(formData: FormData) {
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');
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

  createAuditLog('ADVANCE_COMBO', `Advanced combo position from ${locker.active_combo_index} to ${nextIndex}.`, lockerId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function closeAssignment(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  const { createAuditLog, db } = await import('@/lib/db');

  db.prepare(`UPDATE assignments SET request_status = 'CLOSED', updated_at = ? WHERE request_id = ?`).run(now, requestId);
  db.prepare(`UPDATE lockers SET status = 'AVAILABLE', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
  createAuditLog('CLOSE_ASSIGNMENT', 'Closed assignment and made locker available.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}
