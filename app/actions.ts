'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_COOKIE } from '@/lib/auth';
import { FEE_MODELS, LOCKER_STATUSES, REFUND_STATUSES } from '@/lib/data';
import { rentalPeriods } from '@/lib/constants';
import { areRequestSubmissionsAvailable, REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE } from '@/lib/request-submissions';
import {
  advanceComboRecord,
  assignLockerRecord,
  closeAssignmentRecord,
  completeReturnRecord,
  createAssignmentRequest,
  createAuditLog,
  createLockerRecord,
  markPendingReturnRecord,
  updateLockerRecord,
} from '@/lib/db';

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

  await createAssignmentRequest({
    student_name: data.student_name,
    ucsd_email: data.ucsd_email,
    pid_or_student_id: data.pid_or_student_id,
    program: data.program,
    requested_quarter: data.requested_quarter,
    requested_rental_period: data.requested_rental_period,
    renewal_requested: renewalRequested,
    notes: data.reason || null,
    fee_model: 'DEPOSIT_50_WITH_25_REFUND',
    amount_charged: 50,
    refundable_amount: 25,
    refund_status: 'PENDING',
    created_at: now,
    updated_at: now,
  });

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

  await createLockerRecord({
    locker_number: String(formData.get('locker_number') || '').trim(),
    location: String(formData.get('location') || '').trim(),
    status,
    combo_1: String(formData.get('combo_1') || '').trim(),
    combo_2: String(formData.get('combo_2') || '').trim(),
    combo_3: String(formData.get('combo_3') || '').trim(),
    combo_4: String(formData.get('combo_4') || '').trim(),
    combo_5: String(formData.get('combo_5') || '').trim(),
    active_combo_index: Number(formData.get('active_combo_index') || 1),
    notes: String(formData.get('notes') || '').trim() || null,
    disabled_reason: String(formData.get('disabled_reason') || '').trim() || null,
    created_at: now,
    updated_at: now,
  });

  redirect('/admin');
}

export async function updateLocker(formData: FormData) {
  const lockerId = Number(formData.get('locker_id'));
  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  const lockerNumber = await updateLockerRecord({
    locker_id: lockerId,
    locker_number: String(formData.get('locker_number') || '').trim(),
    location: String(formData.get('location') || '').trim(),
    status,
    combo_1: String(formData.get('combo_1') || '').trim(),
    combo_2: String(formData.get('combo_2') || '').trim(),
    combo_3: String(formData.get('combo_3') || '').trim(),
    combo_4: String(formData.get('combo_4') || '').trim(),
    combo_5: String(formData.get('combo_5') || '').trim(),
    active_combo_index: Number(formData.get('active_combo_index') || 1),
    notes: String(formData.get('notes') || '').trim() || null,
    disabled_reason: String(formData.get('disabled_reason') || '').trim() || null,
    updated_at: now,
  });
  await createAuditLog('UPDATE_LOCKER', `Updated locker ${lockerNumber}.`, lockerId);
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

  if (!FEE_MODELS.includes(feeModel as never)) redirect(`/admin/request/${requestId}`);

  const assignment = await assignLockerRecord({
    request_id: requestId,
    locker_id: lockerId,
    assignment_start_date: String(formData.get('assignment_start_date') || '') || null,
    assignment_end_date: String(formData.get('assignment_end_date') || '') || null,
    fee_model: feeModel,
    amount_charged: amountCharged,
    refundable_amount: refundableAmount,
    payment_notes: paymentNotes,
    updated_at: now,
  });

  await createAuditLog('ASSIGN_LOCKER', `Assigned locker ${assignment.locker_number} to ${assignment.student_name}.`, lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function markPendingReturn(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  await markPendingReturnRecord(requestId, lockerId, now);
  await createAuditLog('PENDING_RETURN', 'Marked locker pending return.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function completeReturn(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const refundStatus = String(formData.get('refund_status') || 'NOT_APPLICABLE');
  const shouldAdvance = formData.get('advance_combo') === 'on';
  const now = new Date().toISOString();

  if (!REFUND_STATUSES.includes(refundStatus as never)) redirect(`/admin/lockers/${lockerId}`);

  const result = await completeReturnRecord({
    request_id: requestId,
    locker_id: lockerId,
    return_verified_by: String(formData.get('return_verified_by') || '').trim(),
    refund_status: refundStatus,
    should_advance: shouldAdvance,
    now,
  });

  await createAuditLog(
    'COMPLETE_RETURN',
    `Closed assignment and ${shouldAdvance ? 'advanced' : 'retained'} combo index for locker ${result.locker_number}.`,
    lockerId,
    requestId,
  );
  redirect(`/admin/lockers/${lockerId}`);
}

export async function advanceCombo(formData: FormData) {
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  const result = await advanceComboRecord(lockerId, now);

  await createAuditLog('ADVANCE_COMBO', `Advanced combo position from ${result.previous_index} to ${result.next_index}.`, lockerId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function closeAssignment(formData: FormData) {
  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  await closeAssignmentRecord(requestId, lockerId, now);
  await createAuditLog('CLOSE_ASSIGNMENT', 'Closed assignment and made locker available.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}
