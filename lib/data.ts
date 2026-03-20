export const LOCKER_STATUSES = ['AVAILABLE', 'ASSIGNED', 'PENDING_RETURN', 'RETURNED', 'OVERDUE', 'DISABLED'] as const;
export const REQUEST_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'WAITLISTED', 'CLOSED', 'DECLINED'] as const;
export const FEE_MODELS = ['DEPOSIT_50_WITH_25_REFUND', 'FLAT_25_NON_REFUNDABLE'] as const;
export const REFUND_STATUSES = ['NOT_APPLICABLE', 'PENDING', 'COMPLETED', 'FORFEITED'] as const;
export const ASSIGNMENT_EMAIL_STATUSES = ['SENT', 'FAILED'] as const;
export const LOCKER_TYPE = 'OUTDOOR_METAL_COMBINATION' as const;

export type LockerStatus = (typeof LOCKER_STATUSES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type FeeModel = (typeof FEE_MODELS)[number];
export type RefundStatus = (typeof REFUND_STATUSES)[number];
export type AssignmentEmailStatus = (typeof ASSIGNMENT_EMAIL_STATUSES)[number];

export type LockerRow = {
  locker_id: number;
  locker_number: string;
  location: string;
  locker_type: string;
  status: LockerStatus;
  combo_1: string;
  combo_2: string;
  combo_3: string;
  combo_4: string;
  combo_5: string;
  active_combo_index: number;
  notes: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignmentRow = {
  request_id: number;
  student_name: string;
  ucsd_email: string;
  pid_or_student_id: string;
  program: string;
  requested_quarter: string;
  requested_rental_period: string | null;
  request_status: RequestStatus;
  assigned_locker_id: number | null;
  assignment_start_date: string | null;
  assignment_end_date: string | null;
  returned_date: string | null;
  return_verified_by: string | null;
  renewal_requested: number;
  notes: string | null;
  fee_model: FeeModel;
  amount_charged: number;
  refundable_amount: number;
  refund_status: RefundStatus;
  refund_date: string | null;
  payment_notes: string | null;
  assignment_email_status: AssignmentEmailStatus | null;
  assignment_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: number;
  action: string;
  actor: string;
  details: string;
  created_at: string;
  locker_id: number | null;
  assignment_id: number | null;
};
