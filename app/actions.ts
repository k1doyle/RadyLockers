'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_COOKIE, requireAdmin } from '@/lib/auth';
import { LOCKER_STATUSES, REFUND_STATUSES } from '@/lib/data';
import { rentalPeriods } from '@/lib/constants';
import { normalizeCsvHeader, parseCsv } from '@/lib/csv';
import {
  LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL_KEY,
  LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY,
  sendLockerAssignmentEmail,
  sendNewLockerRequestNotification,
} from '@/lib/notifications';
import {
  normalizeLockerLocation,
  STANDARD_FEE_MODEL,
  STANDARD_REFUNDABLE_DEPOSIT,
  STANDARD_TOTAL_COST,
} from '@/lib/policy';
import { areRequestSubmissionsAvailable, REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE } from '@/lib/request-submissions';
import {
  advanceComboRecord,
  assignLockerRecord,
  closeAssignmentRecord,
  completeReturnRecord,
  createAssignmentRequest,
  createAuditLog,
  createLockerRecord,
  createLockerRecordsBulk,
  getAssignmentEmailPayload,
  upsertAppSetting,
  markPendingReturnRecord,
  updateAssignmentEmailDelivery,
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

async function sendAssignmentEmailAndTrack(
  requestId: number,
  lockerId: number,
) {
  const payload = await getAssignmentEmailPayload(requestId);

  if (!payload || !payload.assignment_start_date || !payload.assignment_end_date) {
    const reason = 'Assignment email could not be prepared because locker or date details are incomplete.';
    console.warn(reason);
    await updateAssignmentEmailDelivery(requestId, 'FAILED', null, new Date().toISOString());
    return { sent: false as const, reason };
  }

  try {
    const result = await sendLockerAssignmentEmail({
      student_name: payload.student_name,
      ucsd_email: payload.ucsd_email,
      locker_number: payload.locker_number,
      location: payload.location,
      combo_value: payload.combo_value,
      assignment_start_date: payload.assignment_start_date,
      assignment_end_date: payload.assignment_end_date,
    });

    const now = new Date().toISOString();

    if (!result.sent) {
      await updateAssignmentEmailDelivery(requestId, 'FAILED', null, now);
      return result;
    }

    await updateAssignmentEmailDelivery(requestId, 'SENT', now, now);
    return result;
  } catch (error) {
    const now = new Date().toISOString();
    await updateAssignmentEmailDelivery(requestId, 'FAILED', null, now);
    console.error('Failed to send locker assignment email.', error);
    return { sent: false as const, reason: 'The locker assignment email could not be sent.' };
  }
}

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
    fee_model: STANDARD_FEE_MODEL,
    amount_charged: STANDARD_TOTAL_COST,
    refundable_amount: STANDARD_REFUNDABLE_DEPOSIT,
    refund_status: 'PENDING',
    created_at: now,
    updated_at: now,
  });

  try {
    const result = await sendNewLockerRequestNotification({
      student_name: data.student_name,
      ucsd_email: data.ucsd_email,
      pid_or_student_id: data.pid_or_student_id,
      program: data.program,
      requested_quarter: data.requested_quarter,
      requested_rental_period: data.requested_rental_period,
      notes: data.reason || null,
      submitted_at: now,
    });

    if (!result.sent) {
      console.warn(`Locker request notification skipped: ${result.reason}`);
    }
  } catch (error) {
    console.error('Failed to send locker request notification.', error);
  }

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
  await requireAdmin();

  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  if (!LOCKER_STATUSES.includes(status as never)) redirect('/admin');

  await createLockerRecord({
    locker_number: String(formData.get('locker_number') || '').trim(),
    location: normalizeLockerLocation(String(formData.get('location') || '')),
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

const lockerImportHeaderMap: Record<string, string> = {
  lockernumber: 'locker_number',
  locker: 'locker_number',
  location: 'location',
  combination1: 'combo_1',
  combo1: 'combo_1',
  currentcombination: 'combo_1',
  currentcombo: 'combo_1',
  combination: 'combo_1',
  combination2: 'combo_2',
  combo2: 'combo_2',
  combination3: 'combo_3',
  combo3: 'combo_3',
  combination4: 'combo_4',
  combo4: 'combo_4',
  combination5: 'combo_5',
  combo5: 'combo_5',
  notes: 'notes',
  status: 'status',
};

export async function importLockers(formData: FormData) {
  await requireAdmin();

  const uploadedFile = formData.get('csv_file');
  const pastedCsv = String(formData.get('csv_text') || '').trim();
  const csvText =
    uploadedFile instanceof File && uploadedFile.size > 0
      ? await uploadedFile.text()
      : pastedCsv;

  if (!csvText) {
    redirect('/admin?importError=' + encodeURIComponent('Upload a CSV file or paste CSV rows to import lockers.') + '#locker-import');
  }

  let destination = '/admin?importError=' + encodeURIComponent('Locker import failed.') + '#locker-import';

  try {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      throw new Error('The import file needs a header row and at least one locker row.');
    }

    const rawHeaders = rows[0];
    const headers = rawHeaders.map((header) => lockerImportHeaderMap[normalizeCsvHeader(header)] || '');

    if (!headers.includes('locker_number') || !headers.includes('combo_1')) {
      throw new Error('CSV must include locker number and combination 1 columns.');
    }

    const now = new Date().toISOString();
    const importedLockers = [];

    for (const [index, row] of rows.slice(1).entries()) {
      const record = Object.fromEntries(
        headers
          .map((header, headerIndex) => [header, row[headerIndex]?.trim() ?? ''])
          .filter(([header]) => header),
      ) as Record<string, string>;

      if (!Object.values(record).some((value) => value)) continue;

      const rowNumber = index + 2;
      const lockerNumber = record.locker_number?.trim();
      const location = normalizeLockerLocation(record.location);
      const combo1 = record.combo_1?.trim();
      const status = (record.status?.trim() || 'AVAILABLE').toUpperCase();

      if (!lockerNumber) {
        throw new Error(`Row ${rowNumber}: locker number is required.`);
      }

      if (!combo1) {
        throw new Error(`Row ${rowNumber}: combination 1 is required.`);
      }

      if (!LOCKER_STATUSES.includes(status as never)) {
        throw new Error(`Row ${rowNumber}: status "${record.status}" is not valid.`);
      }

      importedLockers.push({
        locker_number: lockerNumber,
        location,
        status,
        combo_1: combo1,
        combo_2: record.combo_2?.trim() || '',
        combo_3: record.combo_3?.trim() || '',
        combo_4: record.combo_4?.trim() || '',
        combo_5: record.combo_5?.trim() || '',
        active_combo_index: 1,
        notes: record.notes?.trim() || null,
        disabled_reason: null,
        created_at: now,
        updated_at: now,
      });
    }

    if (!importedLockers.length) {
      throw new Error('No locker rows were found to import.');
    }

    const createdCount = await createLockerRecordsBulk(importedLockers);
    destination = '/admin?imported=' + encodeURIComponent(String(createdCount)) + '#locker-import';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Locker import failed.';
    destination = '/admin?importError=' + encodeURIComponent(message) + '#locker-import';
  }

  redirect(destination);
}

export async function updateLocker(formData: FormData) {
  await requireAdmin();

  const lockerId = Number(formData.get('locker_id'));
  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  const lockerNumber = await updateLockerRecord({
    locker_id: lockerId,
    locker_number: String(formData.get('locker_number') || '').trim(),
    location: normalizeLockerLocation(String(formData.get('location') || '')),
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
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const paymentNotes = String(formData.get('payment_notes') || '').trim() || null;
  const assignmentStartDate = String(formData.get('assignment_start_date') || '') || null;
  const assignmentEndDate = String(formData.get('assignment_end_date') || '') || null;
  const now = new Date().toISOString();

  const assignment = await assignLockerRecord({
    request_id: requestId,
    locker_id: lockerId,
    assignment_start_date: assignmentStartDate,
    assignment_end_date: assignmentEndDate,
    fee_model: STANDARD_FEE_MODEL,
    amount_charged: STANDARD_TOTAL_COST,
    refundable_amount: STANDARD_REFUNDABLE_DEPOSIT,
    payment_notes: paymentNotes,
    updated_at: now,
  });

  await createAuditLog('ASSIGN_LOCKER', `Assigned locker ${assignment.locker_number} to ${assignment.student_name}.`, lockerId, requestId);

  let destination = `/admin/lockers/${lockerId}`;

  const emailResult = await sendAssignmentEmailAndTrack(requestId, lockerId);
  if (!emailResult.sent) {
    destination += '?emailWarning=' + encodeURIComponent(`Locker assignment saved, but the email was not sent. ${emailResult.reason}`);
  } else if (!emailResult.internalCopyRecipient) {
    destination += '?emailWarning=' + encodeURIComponent('Student assignment email sent, but no internal BCC inbox is configured.');
  }

  redirect(destination);
}

export async function resendAssignmentEmail(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const result = await sendAssignmentEmailAndTrack(requestId, lockerId);

  if (!result.sent) {
    redirect(
      `/admin/lockers/${lockerId}?emailWarning=` +
        encodeURIComponent(`Locker details were not resent. ${result.reason}`),
    );
  }

  await createAuditLog('RESEND_ASSIGNMENT_EMAIL', 'Resent locker assignment email to the student.', lockerId, requestId);

  const message = result.internalCopyRecipient
    ? 'Locker details email resent successfully.'
    : 'Locker details email resent to the student, but no internal BCC inbox is configured.';

  redirect(`/admin/lockers/${lockerId}?emailSuccess=${encodeURIComponent(message)}`);
}

export async function updateNotificationSettings(formData: FormData) {
  await requireAdmin();

  const rawRequestEmail = String(formData.get('notification_email') || '').trim();
  const rawAssignmentEmail = String(formData.get('assignment_notification_email') || '').trim();
  const requestParsed = rawRequestEmail ? z.string().email().safeParse(rawRequestEmail) : { success: true as const };
  const assignmentParsed = rawAssignmentEmail ? z.string().email().safeParse(rawAssignmentEmail) : { success: true as const };

  if ((rawRequestEmail && !requestParsed.success) || (rawAssignmentEmail && !assignmentParsed.success)) {
    redirect('/admin?settingsError=' + encodeURIComponent('Enter valid notification email addresses.'));
  }

  const now = new Date().toISOString();
  const requestSettingValue = rawRequestEmail || null;
  const assignmentSettingValue = rawAssignmentEmail || null;

  await upsertAppSetting(LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY, requestSettingValue, now);
  await upsertAppSetting(LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL_KEY, assignmentSettingValue, now);
  await createAuditLog(
    'UPDATE_SETTING',
    `Updated notification settings. Request inbox: ${requestSettingValue ?? 'fallback/none'}. Assignment inbox: ${assignmentSettingValue ?? 'fallback/none'}.`,
  );

  redirect(
    '/admin?settingsSaved=' +
      encodeURIComponent(
        'Notification email settings updated.',
      ),
  );
}

export async function markPendingReturn(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  await markPendingReturnRecord(requestId, lockerId, now);
  await createAuditLog('PENDING_RETURN', 'Marked locker pending return.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function completeReturn(formData: FormData) {
  await requireAdmin();

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
  await requireAdmin();

  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  const result = await advanceComboRecord(lockerId, now);

  await createAuditLog('ADVANCE_COMBO', `Advanced combo position from ${result.previous_index} to ${result.next_index}.`, lockerId);
  redirect(`/admin/lockers/${lockerId}`);
}

export async function closeAssignment(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();

  await closeAssignmentRecord(requestId, lockerId, now);
  await createAuditLog('CLOSE_ASSIGNMENT', 'Closed assignment and made locker available.', lockerId, requestId);
  redirect(`/admin/lockers/${lockerId}`);
}
