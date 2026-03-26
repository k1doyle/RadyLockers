'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_COOKIE, requireAdmin, checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '@/lib/auth';
import { headers } from 'next/headers';
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
  updateAssignmentRefundStatus,
  updateLockerRecord,
} from '@/lib/db';

const requestSchema = z.object({
  student_name: z.string().trim().min(2, 'Enter your full name'),
  ucsd_email: z.string().trim().email('Enter a valid email address').refine((value) => value.endsWith('@ucsd.edu'), 'Use your UCSD email'),
  pid_or_student_id: z.string().trim().min(6, 'Enter your student PID or ID'),
  program: z.string().trim().min(2, 'Select your program'),
  requested_quarter: z.string().trim().min(2, 'Select a quarter'),
  requested_rental_period: z.string().refine((value): value is (typeof rentalPeriods)[number] => rentalPeriods.includes(value as (typeof rentalPeriods)[number]), 'Select a rental period'),
  reason: z.string().optional(),
  acknowledged_terms: z.string().refine((value) => value === 'on', 'Please confirm the locker terms'),
});

const REQUEST_FORM_STATE_COOKIE = 'rady-lockers-request-form-state';

type RequestFormFieldName =
  | 'student_name'
  | 'ucsd_email'
  | 'pid_or_student_id'
  | 'program'
  | 'requested_quarter'
  | 'requested_rental_period'
  | 'reason'
  | 'acknowledged_terms';

type RequestFormState = {
  summary: string;
  values: {
    student_name: string;
    ucsd_email: string;
    pid_or_student_id: string;
    program: string;
    requested_quarter: string;
    requested_rental_period: string;
    reason: string;
    acknowledged_terms: boolean;
  };
  errors: Partial<Record<RequestFormFieldName, string>>;
};

function getRequestFormValues(formData: FormData): RequestFormState['values'] {
  return {
    student_name: String(formData.get('student_name') || '').trim(),
    ucsd_email: String(formData.get('ucsd_email') || '').trim(),
    pid_or_student_id: String(formData.get('pid_or_student_id') || '').trim(),
    program: String(formData.get('program') || '').trim(),
    requested_quarter: String(formData.get('requested_quarter') || '').trim(),
    requested_rental_period: String(formData.get('requested_rental_period') || '').trim(),
    reason: String(formData.get('reason') || '').trim(),
    acknowledged_terms: formData.get('acknowledged_terms') === 'on',
  };
}

async function setRequestFormState(state: RequestFormState) {
  const cookieStore = await cookies();
  cookieStore.set(REQUEST_FORM_STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
}

async function clearRequestFormState() {
  const cookieStore = await cookies();
  cookieStore.delete(REQUEST_FORM_STATE_COOKIE);
}

async function redirectToRequestFormError(summary: string, formData: FormData, errors: RequestFormState['errors'] = {}) {
  await setRequestFormState({
    summary,
    values: getRequestFormValues(formData),
    errors,
  });
  redirect('/request?formError=1');
}

function logActionError(message: string, error: unknown) {
  console.error(message, error);
}

function redirectToLockerManagementError(message: string): never {
  redirect('/admin/lockers?importError=' + encodeURIComponent(message));
}

function redirectToImportError(message: string): never {
  redirect('/admin/lockers?importError=' + encodeURIComponent(message) + '#locker-import');
}

function redirectToLockerWarning(lockerId: number, message: string): never {
  redirect(`/admin/lockers/${lockerId}?emailWarning=${encodeURIComponent(message)}`);
}

async function sendAssignmentEmailAndTrack(
  requestId: number,
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
    const fieldErrors = parsed.error.issues.reduce<Partial<Record<RequestFormFieldName, string>>>((errors, issue) => {
      const field = issue.path[0];
      if (typeof field === 'string' && !(field in errors)) {
        errors[field as RequestFormFieldName] = issue.message;
      }
      return errors;
    }, {});

    await redirectToRequestFormError('Please review the highlighted fields and try again.', formData, fieldErrors);
    return;
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const renewalRequested = data.requested_rental_period === 'One Academic Quarter, with possible renewal request' ? 1 : 0;
  try {
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
  } catch (error) {
    console.error('Failed to create locker request.', error);
    await redirectToRequestFormError('Your request could not be submitted right now. Please try again.', formData);
  }

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

  await clearRequestFormState();
  redirect('/request/confirmation');
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get('password') || '');
  const headerStore = await headers();
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const rateLimit = checkLoginRateLimit(ip);
  if (rateLimit.blocked) {
    redirect(`/admin/login?error=Too many failed attempts. Try again in ${rateLimit.minutesLeft} minute${rateLimit.minutesLeft === 1 ? '' : 's'}.`);
  }

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    recordFailedLogin(ip);
    redirect('/admin/login?error=Invalid password');
  }

  clearLoginAttempts(ip);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
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
  if (!LOCKER_STATUSES.includes(status as never)) redirect('/admin/lockers');

  try {
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
  } catch (error) {
    logActionError('Failed to create locker.', error);
    redirectToLockerManagementError('Unable to create the locker right now.');
  }

  redirect('/admin/lockers');
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
    redirectToImportError('Upload a CSV file or paste CSV rows to import lockers.');
  }

  let destination = '/admin/lockers?importError=' + encodeURIComponent('Locker import failed. Please try again.') + '#locker-import';

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
    destination = '/admin/lockers?imported=' + encodeURIComponent(String(createdCount)) + '#locker-import';
  } catch (error) {
    logActionError('Failed to import lockers.', error);
    destination = '/admin/lockers?importError=' + encodeURIComponent('Locker import failed. Please try again.') + '#locker-import';
  }

  redirect(destination);
}

export async function updateLocker(formData: FormData) {
  await requireAdmin();

  const lockerId = Number(formData.get('locker_id'));
  const status = String(formData.get('status') || 'AVAILABLE');
  const now = new Date().toISOString();
  try {
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
  } catch (error) {
    logActionError(`Failed to update locker ${lockerId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker updates could not be saved right now.');
  }
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
  let destination = `/admin/lockers/${lockerId}`;

  try {
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

    const emailResult = await sendAssignmentEmailAndTrack(requestId);
    if (!emailResult.sent) {
      destination += '?emailWarning=' + encodeURIComponent(`Locker assignment saved, but the email was not sent. ${emailResult.reason}`);
    } else if (!emailResult.internalCopyRecipient) {
      destination += '?emailWarning=' + encodeURIComponent('Student assignment email sent, but no internal BCC inbox is configured.');
    }
  } catch (error) {
    logActionError(`Failed to assign locker ${lockerId} to request ${requestId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker assignment could not be saved right now.');
  }

  redirect(destination);
}

export async function resendAssignmentEmail(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  let destination = `/admin/lockers/${lockerId}`;

  try {
    const result = await sendAssignmentEmailAndTrack(requestId);

    if (!result.sent) {
      destination += '?emailWarning=' + encodeURIComponent(`Locker details were not resent. ${result.reason}`);
    } else {
      await createAuditLog('RESEND_ASSIGNMENT_EMAIL', 'Resent locker assignment email to the student.', lockerId, requestId);

      const message = result.internalCopyRecipient
        ? 'Locker details email resent successfully.'
        : 'Locker details email resent to the student, but no internal BCC inbox is configured.';

      destination += `?emailSuccess=${encodeURIComponent(message)}`;
    }
  } catch (error) {
    logActionError(`Failed to resend locker assignment email for request ${requestId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker details could not be resent right now.');
  }

  redirect(destination);
}

export async function updateNotificationSettings(formData: FormData) {
  await requireAdmin();

  const rawRequestEmail = String(formData.get('notification_email') || '').trim();
  const rawAssignmentEmail = String(formData.get('assignment_notification_email') || '').trim();
  const requestParsed = rawRequestEmail ? z.string().email().safeParse(rawRequestEmail) : { success: true as const };
  const assignmentParsed = rawAssignmentEmail ? z.string().email().safeParse(rawAssignmentEmail) : { success: true as const };

  if ((rawRequestEmail && !requestParsed.success) || (rawAssignmentEmail && !assignmentParsed.success)) {
    redirect('/admin/notifications?settingsError=' + encodeURIComponent('Enter valid notification email addresses.'));
  }

  const now = new Date().toISOString();
  const requestSettingValue = rawRequestEmail || null;
  const assignmentSettingValue = rawAssignmentEmail || null;
  try {
    await upsertAppSetting(LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY, requestSettingValue, now);
    await upsertAppSetting(LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL_KEY, assignmentSettingValue, now);
    await createAuditLog(
      'UPDATE_SETTING',
      `Updated notification settings. Request inbox: ${requestSettingValue ?? 'fallback/none'}. Assignment inbox: ${assignmentSettingValue ?? 'fallback/none'}.`,
    );
  } catch (error) {
    logActionError('Failed to update notification settings.', error);
    redirect('/admin/notifications?settingsError=' + encodeURIComponent('Notification email settings could not be updated right now.'));
  }

  redirect(
    '/admin/notifications?settingsSaved=' +
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
  try {
    const changed = await markPendingReturnRecord(requestId, lockerId, now);
    if (changed) {
      await createAuditLog('PENDING_RETURN', 'Marked locker pending return.', lockerId, requestId);
    }
  } catch (error) {
    logActionError(`Failed to mark locker ${lockerId} pending return.`, error);
    redirectToLockerWarning(lockerId, 'Locker return status could not be updated right now.');
  }
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

  try {
    const result = await completeReturnRecord({
      request_id: requestId,
      locker_id: lockerId,
      return_verified_by: String(formData.get('return_verified_by') || '').trim(),
      refund_status: refundStatus,
      should_advance: shouldAdvance,
      now,
    });

    if (result.changed) {
      await createAuditLog(
        'COMPLETE_RETURN',
        `Closed assignment and ${shouldAdvance ? 'advanced' : 'retained'} combo index for locker ${result.locker_number}.`,
        lockerId,
        requestId,
      );
    }
  } catch (error) {
    logActionError(`Failed to complete return for locker ${lockerId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker return could not be completed right now.');
  }
  redirect(`/admin/lockers/${lockerId}`);
}

export async function updateRefundStatus(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const refundStatus = String(formData.get('refund_status') || '');

  if (!REFUND_STATUSES.includes(refundStatus as never)) redirect(`/admin/lockers/${lockerId}`);

  try {
    const now = new Date().toISOString();
    await updateAssignmentRefundStatus(requestId, refundStatus, now);
    await createAuditLog('UPDATE_REFUND_STATUS', `Refund status updated to ${refundStatus}.`, lockerId, requestId);
  } catch (error) {
    logActionError(`Failed to update refund status for request ${requestId}.`, error);
    redirectToLockerWarning(lockerId, 'Refund status could not be updated right now.');
  }

  redirect(`/admin/lockers/${lockerId}`);
}

export async function advanceCombo(formData: FormData) {
  await requireAdmin();

  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  try {
    const result = await advanceComboRecord(lockerId, now);
    await createAuditLog('ADVANCE_COMBO', `Advanced combo position from ${result.previous_index} to ${result.next_index}.`, lockerId);
  } catch (error) {
    logActionError(`Failed to advance combo for locker ${lockerId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker combination index could not be advanced right now.');
  }
  redirect(`/admin/lockers/${lockerId}`);
}

export async function closeAssignment(formData: FormData) {
  await requireAdmin();

  const requestId = Number(formData.get('request_id'));
  const lockerId = Number(formData.get('locker_id'));
  const now = new Date().toISOString();
  try {
    await closeAssignmentRecord(requestId, lockerId, now);
    await createAuditLog('CLOSE_ASSIGNMENT', 'Closed assignment and made locker available.', lockerId, requestId);
  } catch (error) {
    logActionError(`Failed to close assignment ${requestId} for locker ${lockerId}.`, error);
    redirectToLockerWarning(lockerId, 'Locker assignment could not be closed right now.');
  }
  redirect(`/admin/lockers/${lockerId}`);
}
