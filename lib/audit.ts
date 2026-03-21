import { formatStatus } from '@/lib/utils';

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  ADVANCE_COMBO: 'Combination advanced',
  ASSIGN_LOCKER: 'Locker assigned',
  CLOSE_ASSIGNMENT: 'Assignment closed',
  COMPLETE_RETURN: 'Return completed',
  PENDING_RETURN: 'Return initiated',
  RESEND_ASSIGNMENT_EMAIL: 'Assignment email resent',
  SEED_ASSIGNMENT: 'Assignment seeded',
  SEED_NOTE: 'Seed note added',
  SEED_RETURN: 'Return seeded',
  UPDATE_LOCKER: 'Locker updated',
  UPDATE_SETTING: 'Settings updated',
};

const AUDIT_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'PENDING_RETURN:Marked locker pending return.': 'Return initiated.',
  'RESEND_ASSIGNMENT_EMAIL:Resent locker assignment email to the student.': 'Assignment email resent to the student.',
  'CLOSE_ASSIGNMENT:Closed assignment and made locker available.': 'Assignment closed and locker made available.',
};

export function getAuditEventLabel(action: string) {
  return AUDIT_EVENT_LABELS[action] ?? formatStatus(action);
}

export function getAuditDescription(action: string, details: string) {
  return AUDIT_DESCRIPTION_OVERRIDES[`${action}:${details}`] ?? details;
}
