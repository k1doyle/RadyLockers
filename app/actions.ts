'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_COOKIE, requireAdmin, setAdminSessionCookie } from '@/lib/auth';
import { createAuditLog, db } from '@/lib/db';
import { FEE_MODELS, LOCKER_STATUSES, REFUND_STATUSES } from '@/lib/data';

const requestSchema = z.object({
  student_name: z.string().min(2),
  ucsd_email: z.string().email().refine((value) => value.endsWith('@ucsd.edu'), 'Use your UCSD email'),
  pid_or_student_id: z.string().min(6),
  program: z.string().min(2),
  requested_quarter: z.string().min(2),
  reason: z.string().optional(),
  acknowledged_terms: z.literal('on'),
});

function redirectWithError(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

function nextActiveComboIndex(currentIndex: number) {
  return currentIndex >= 5 ? 1 : currentIndex + 1;
}

export async function submitLockerRequest(formData: FormData) {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithError('/request', parsed.error.issues[0]?.message ?? 'Unable to submit request');
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO assignments (
      student_name, ucsd_email, pid_or_student_id, program, requested_quarter, request_status,
      notes, fee_model, amount_charged, refundable_amount, refund_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'SUBMITTED', ?, 'FLAT_25_NON_REFUNDABLE', 25, 0, 'NOT_APPLICABLE', ?, ?)
  `).run(
    data.student_name,
    data.ucsd_email,
    data.pid_or_student_id,
    data.program,
    data.requested_quarter,
    data.reason || null,
    now,
    now,
  );

  redirect('/request/confirmation');
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get('password') || '');

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    redirectWithError('/admin/login', 'Invalid password');
  }

  await setAdminSessionCookie();
  redirect('/admin');
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect('/');
}

export async function createLocker(formData: FormData) {
  await requireAdmin();
  const status = String(formData.get('status') || 'AVAILABLE');
  const activeComboIndex = Number(formData.get('active_combo_index') || 1);
  const now = new Date().toISOString();

  if (!LOCKER_STATUSES.includes(status as never)) {
    redirectWithError('/admin', 'Invalid locker status');
  }

  if (activeComboIndex < 1 || activeComboIndex > 5) {
    redirectWithError('/admin', 'Active combo index must be between 1 and 5');
  }

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
    activeComboIndex,
    String(formData.get('notes') || '').trim() || null,
    String(formData.get('disabled_reason') || '').trim() || null,
    now,
    now,
  );

  redirect('/admin');
}

export async function updateLocker(formData: FormData) {
  await requireAdmin();
  const lockerId = Number(formData.get('locker_id'));
  const status = String(formData.get('status') || 'AVAILABLE');
  const activeComboIndex = Number(formData.get('active_combo_index') || 1);
  const now = new Date().toISOString();

  if (!LOCKER_STATUSES.includes(status as never)) {
    redirectWithError(`/admin/lockers/${lockerId}`, 'Invalid locker status');
  }

  if (activeComboIndex < 1 || activeComboIndex > 5) {
    redirectWithError(`/admin/lockers/${lockerId}`, 'Active combo index must be between 1 and 5');
  }

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
    activeComboIndex,
    String(formData.get('notes') || '').trim() || null,
    String(formData.get('disabled_reason') || '').trim() || null,
    now,
    lockerId,
  );

  const locker = db.prepare(`SELECT locker_number FROM lockers WHERE locker_id = ?`).get(lockerId) as { locker_number: string } | undefined;
  if (!locker) {
    redirectWithError('/admin', 'Locker not found');
  }

  createAuditLog('UPDATE_LOCKER', `Updated locker ${locker.locker_number}.`, lockerId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function assignLocker(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const feeModel = String(formData.get('fee_model') || 'FLAT_25_NON_REFUNDABLE');
  const amountCharged = Number(formData.get('amount_charged') || 25);
  const refundableAmount = Number(formData.get('refundable_amount') || 0);
  const paymentNotes = String(formData.get('payment_notes') || '').trim() || null;
  const now = new Date().toISOString();

  if (!FEE_MODELS.includes(feeModel as never)) {
    redirectWithError(`/admin/request/${requestId}`, 'Invalid fee model');
  }

  const assign = db.transaction(() => {
    const locker = db.prepare(`SELECT locker_number, status FROM lockers WHERE locker_id = ?`).get(lockerId) as {
      locker_number: string;
      status: string;
    } | undefined;
    if (!locker) {
      throw new Error('Locker not found');
    }

    if (!['AVAILABLE', 'RETURNED'].includes(locker.status)) {
      throw new Error('Locker is not available for assignment');
    }

    const activeLockerAssignment = db.prepare(
      `SELECT request_id FROM assignments WHERE assigned_locker_id = ? AND request_status = 'ASSIGNED' LIMIT 1`,
    ).get(lockerId) as { request_id: number } | undefined;
    if (activeLockerAssignment) {
      throw new Error('This locker already has an active assignment');
    }

    const request = db.prepare(
      `SELECT request_status, student_name FROM assignments WHERE request_id = ?`,
    ).get(requestId) as { request_status: string; student_name: string } | undefined;
    if (!request) {
      throw new Error('Request not found');
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(request.request_status)) {
      throw new Error('This request is no longer assignable');
    }

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
    createAuditLog('ASSIGN_LOCKER', `Assigned locker ${locker.locker_number} to ${request.student_name}.`, lockerId, requestId);
  });

  try {
    assign();
  } catch (error) {
    redirectWithError(`/admin/request/${requestId}`, error instanceof Error ? error.message : 'Unable to assign locker');
  }

  redirect(`/admin/lockers/${lockerId}`);
}

export async function markPendingReturn(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  const assignment = db.prepare(
    `SELECT request_status FROM assignments WHERE request_id = ? AND assigned_locker_id = ?`,
  ).get(requestId, lockerId) as { request_status: string } | undefined;

  if (!assignment || assignment.request_status !== 'ASSIGNED') {
    redirectWithError(`/admin/lockers/${lockerId}`, 'Only active assignments can be moved to pending return');
  }

  db.prepare(`UPDATE lockers SET status = 'PENDING_RETURN', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
  createAuditLog('PENDING_RETURN', 'Marked locker pending return.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function completeReturn(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const refundStatus = String(formData.get('refund_status') || 'NOT_APPLICABLE');
  const shouldAdvance = formData.get('advance_combo') === 'on';
  const expectedComboIndex = Number(formData.get('expected_active_combo_index') || 0);
  const now = new Date().toISOString();

  if (!REFUND_STATUSES.includes(refundStatus as never)) {
    redirectWithError(`/admin/lockers/${lockerId}`, 'Invalid refund status');
  }

  const complete = db.transaction(() => {
    const assignment = db.prepare(
      `SELECT request_status FROM assignments WHERE request_id = ? AND assigned_locker_id = ?`,
    ).get(requestId, lockerId) as { request_status: string } | undefined;

    if (!assignment || assignment.request_status !== 'ASSIGNED') {
      throw new Error('Only active assignments can be returned');
    }

    const locker = db.prepare(
      `SELECT locker_number, active_combo_index, status FROM lockers WHERE locker_id = ?`,
    ).get(lockerId) as { locker_number: string; active_combo_index: number; status: string } | undefined;

    if (!locker) {
      throw new Error('Locker not found');
    }

    if (!['ASSIGNED', 'PENDING_RETURN', 'OVERDUE'].includes(locker.status)) {
      throw new Error('Locker is not in a returnable state');
    }

    if (expectedComboIndex !== locker.active_combo_index) {
      throw new Error('Locker combo index changed. Refresh the page before submitting again.');
    }

    const nextIndex = shouldAdvance ? nextActiveComboIndex(locker.active_combo_index) : locker.active_combo_index;
    const nextStatus = shouldAdvance ? 'AVAILABLE' : 'RETURNED';

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

    db.prepare(`
      UPDATE lockers
      SET status = ?, active_combo_index = ?, updated_at = ?
      WHERE locker_id = ?
    `).run(nextStatus, nextIndex, now, lockerId);

    createAuditLog(
      'COMPLETE_RETURN',
      `Closed assignment and ${shouldAdvance ? `advanced combo index to ${nextIndex}` : 'left the combo index unchanged'} for locker ${locker.locker_number}.`,
      lockerId,
      requestId,
    );
  });

  try {
    complete();
  } catch (error) {
    redirectWithError(`/admin/lockers/${lockerId}`, error instanceof Error ? error.message : 'Unable to complete return');
  }

  redirect(`/admin/lockers/${lockerId}`);
}

export async function advanceCombo(formData: FormData) {
  await requireAdmin();
  const lockerId = Number(formData.get('locker_id'));
  const expectedComboIndex = Number(formData.get('expected_active_combo_index') || 0);
  const now = new Date().toISOString();

  const advance = db.transaction(() => {
    const locker = db.prepare(`SELECT locker_number, active_combo_index, status FROM lockers WHERE locker_id = ?`).get(lockerId) as {
      locker_number: string;
      active_combo_index: number;
      status: string;
    } | undefined;

    if (!locker) {
      throw new Error('Locker not found');
    }

    if (!['RETURNED', 'AVAILABLE', 'DISABLED'].includes(locker.status)) {
      throw new Error('Do not advance combinations while a locker is assigned or awaiting return');
    }

    if (expectedComboIndex !== locker.active_combo_index) {
      throw new Error('Locker combo index changed. Refresh the page before submitting again.');
    }

    const nextIndex = nextActiveComboIndex(locker.active_combo_index);
    db.prepare(`UPDATE lockers SET active_combo_index = ?, status = ?, updated_at = ? WHERE locker_id = ?`).run(
      nextIndex,
      locker.status === 'RETURNED' ? 'AVAILABLE' : locker.status,
      now,
      lockerId,
    );

    createAuditLog('ADVANCE_COMBO', `Advanced combo position from ${locker.active_combo_index} to ${nextIndex}.`, lockerId);
  });

  try {
    advance();
  } catch (error) {
    redirectWithError(`/admin/lockers/${lockerId}`, error instanceof Error ? error.message : 'Unable to advance combo');
  }

  redirect(`/admin/lockers/${lockerId}`);
}

export async function closeAssignment(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  const assignment = db.prepare(
    `SELECT request_status FROM assignments WHERE request_id = ? AND assigned_locker_id = ?`,
  ).get(requestId, lockerId) as { request_status: string } | undefined;

  if (!assignment || assignment.request_status !== 'ASSIGNED') {
    redirectWithError(`/admin/lockers/${lockerId}`, 'Only active assignments can be closed');
  }

  db.prepare(`UPDATE assignments SET request_status = 'CLOSED', updated_at = ? WHERE request_id = ?`).run(now, requestId);
  db.prepare(`UPDATE lockers SET status = 'AVAILABLE', updated_at = ? WHERE locker_id = ?`).run(now, lockerId);
  createAuditLog('CLOSE_ASSIGNMENT', 'Closed assignment and made locker available.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}
