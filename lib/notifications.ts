import nodemailer from 'nodemailer';
import { getAppSetting } from '@/lib/db';
import {
  STANDARD_REFUNDABLE_DEPOSIT,
  STANDARD_RENTAL_FEE,
  STANDARD_TOTAL_COST,
} from '@/lib/policy';

export const LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY = 'locker_request_notification_email';
export const LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL_KEY = 'locker_assignment_notification_email';

type NotificationConfig = {
  savedRecipient: string | null;
  envRecipient: string | null;
  effectiveRecipient: string | null;
  source: 'admin' | 'environment' | 'request-setting' | 'request-environment' | 'none';
  deliveryConfigured: boolean;
  fromAddress: string | null;
};

type NewLockerRequestNotificationInput = {
  student_name: string;
  ucsd_email: string;
  pid_or_student_id: string;
  program: string;
  requested_quarter: string;
  requested_rental_period: string;
  notes: string | null;
  submitted_at: string;
};

type LockerAssignmentEmailInput = {
  student_name: string;
  ucsd_email: string;
  locker_number: string;
  location: string;
  combo_value: string;
  assignment_start_date: string;
  assignment_end_date: string;
};

function getEnvValue(name: string) {
  return process.env[name]?.trim() || null;
}

function getSmtpSettings() {
  const host = getEnvValue('SMTP_HOST');
  const portValue = getEnvValue('SMTP_PORT');
  const user = getEnvValue('SMTP_USER');
  const pass = getEnvValue('SMTP_PASS');
  const from = getEnvValue('SMTP_FROM');
  const secureValue = getEnvValue('SMTP_SECURE');

  const port = portValue ? Number(portValue) : 587;
  const secure = secureValue ? secureValue === 'true' : port === 465;
  const deliveryConfigured = Boolean(host && Number.isFinite(port) && user && pass && from);

  return {
    host,
    port,
    user,
    pass,
    from,
    secure,
    deliveryConfigured,
  };
}

function createTransport() {
  const smtp = getSmtpSettings();

  return nodemailer.createTransport({
    host: smtp.host!,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user!,
      pass: smtp.pass!,
    },
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(value));
}

function formatDate(value: string) {
  if (!value) return '';
  const normalized = value.slice(0, 10);
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return value;
  const localDate = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(localDate);
}

export async function getLockerRequestNotificationConfig(): Promise<NotificationConfig> {
  const savedRecipient = await getAppSetting(LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY);
  const envRecipient = getEnvValue('LOCKER_REQUEST_NOTIFICATION_EMAIL');
  const effectiveRecipient = savedRecipient || envRecipient || null;
  const { from, deliveryConfigured } = getSmtpSettings();

  return {
    savedRecipient,
    envRecipient,
    effectiveRecipient,
    source: savedRecipient ? 'admin' : envRecipient ? 'environment' : 'none',
    deliveryConfigured,
    fromAddress: from,
  };
}

export async function getLockerAssignmentNotificationConfig(): Promise<NotificationConfig> {
  const savedRecipient = await getAppSetting(LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL_KEY);
  const envRecipient = getEnvValue('LOCKER_ASSIGNMENT_NOTIFICATION_EMAIL');
  const requestConfig = await getLockerRequestNotificationConfig();
  const { from, deliveryConfigured } = getSmtpSettings();

  const effectiveRecipient =
    savedRecipient ||
    envRecipient ||
    requestConfig.savedRecipient ||
    requestConfig.envRecipient ||
    null;

  return {
    savedRecipient,
    envRecipient,
    effectiveRecipient,
    source: savedRecipient
      ? 'admin'
      : envRecipient
        ? 'environment'
        : requestConfig.savedRecipient
          ? 'request-setting'
          : requestConfig.envRecipient
            ? 'request-environment'
            : 'none',
    deliveryConfigured,
    fromAddress: from,
  };
}

export async function sendNewLockerRequestNotification(input: NewLockerRequestNotificationInput) {
  const config = await getLockerRequestNotificationConfig();

  if (!config.effectiveRecipient) {
    return { sent: false, reason: 'No locker request notification recipient is configured.' };
  }

  if (!config.deliveryConfigured || !config.fromAddress) {
    return { sent: false, reason: 'SMTP delivery is not configured.' };
  }

  const submittedAt = formatDateTime(input.submitted_at);
  const text = [
    'A new Rady locker request has been submitted.',
    '',
    `Student name: ${input.student_name}`,
    `UCSD email: ${input.ucsd_email}`,
    `Student ID / PID: ${input.pid_or_student_id}`,
    `Program: ${input.program}`,
    `Requested quarter: ${input.requested_quarter}`,
    `Requested rental period: ${input.requested_rental_period}`,
    `Pricing: $${STANDARD_TOTAL_COST} total, $${STANDARD_REFUNDABLE_DEPOSIT} refundable deposit, $${STANDARD_RENTAL_FEE} rental fee`,
    `Submitted: ${submittedAt}`,
    `Notes: ${input.notes || 'None provided'}`,
  ].join('\n');

  await createTransport().sendMail({
    from: config.fromAddress,
    to: config.effectiveRecipient,
    replyTo: input.ucsd_email,
    subject: `New Rady locker request: ${input.student_name} (${input.requested_quarter})`,
    text,
  });

  return { sent: true };
}

export async function sendLockerAssignmentEmail(input: LockerAssignmentEmailInput) {
  const assignmentConfig = await getLockerAssignmentNotificationConfig();
  const { fromAddress, deliveryConfigured } = assignmentConfig;

  if (!deliveryConfigured || !fromAddress) {
    return { sent: false, reason: 'SMTP delivery is not configured.' };
  }

  const text = [
    `Hello ${input.student_name},`,
    '',
    'Your Rady locker request has been approved. Your locker assignment details are below.',
    '',
    `Locker number: ${input.locker_number}`,
    `Location: ${input.location}`,
    `Combination: ${input.combo_value}`,
    `Assignment start date: ${formatDate(input.assignment_start_date)}`,
    `Assignment end date: ${formatDate(input.assignment_end_date)}`,
    '',
    `Please empty and return the locker by the posted end-of-quarter deadline. The $${STANDARD_REFUNDABLE_DEPOSIT} deposit is refunded after staff verifies the locker is empty and returned properly.`,
    '',
    'If you have questions, reply to this email or contact Rady Student Affairs.',
  ].join('\n');

  await createTransport().sendMail({
    from: fromAddress,
    to: input.ucsd_email,
    bcc: assignmentConfig.effectiveRecipient || undefined,
    replyTo: assignmentConfig.effectiveRecipient || fromAddress,
    subject: `Your Rady locker assignment: Locker ${input.locker_number}`,
    text,
  });

  return {
    sent: true,
    internalCopyRecipient: assignmentConfig.effectiveRecipient,
  };
}
