import nodemailer from 'nodemailer';
import { getAppSetting } from '@/lib/db';
import {
  STANDARD_REFUNDABLE_DEPOSIT,
  STANDARD_RENTAL_FEE,
  STANDARD_TOTAL_COST,
} from '@/lib/policy';

export const LOCKER_REQUEST_NOTIFICATION_EMAIL_KEY = 'locker_request_notification_email';

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

type NotificationConfig = {
  savedRecipient: string | null;
  envRecipient: string | null;
  effectiveRecipient: string | null;
  source: 'admin' | 'environment' | 'none';
  deliveryConfigured: boolean;
  fromAddress: string | null;
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

function formatSubmittedTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(value));
}

export async function sendNewLockerRequestNotification(input: NewLockerRequestNotificationInput) {
  const config = await getLockerRequestNotificationConfig();

  if (!config.effectiveRecipient) {
    return { sent: false, reason: 'No locker request notification recipient is configured.' };
  }

  if (!config.deliveryConfigured || !config.fromAddress) {
    return { sent: false, reason: 'SMTP delivery is not configured.' };
  }

  const smtp = getSmtpSettings();
  const transporter = nodemailer.createTransport({
    host: smtp.host!,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user!,
      pass: smtp.pass!,
    },
  });

  const submittedAt = formatSubmittedTimestamp(input.submitted_at);
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

  await transporter.sendMail({
    from: config.fromAddress,
    to: config.effectiveRecipient,
    replyTo: input.ucsd_email,
    subject: `New Rady locker request: ${input.student_name} (${input.requested_quarter})`,
    text,
  });

  return { sent: true };
}
