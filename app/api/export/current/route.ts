import { getCurrentAssignmentsExport } from '@/lib/db';

export async function GET() {
  const rows = getCurrentAssignmentsExport() as Array<Record<string, string | number | null>>;
  const header = [
    'request_id',
    'student_name',
    'ucsd_email',
    'program',
    'requested_quarter',
    'locker_number',
    'location',
    'locker_status',
    'active_combo_index',
    'fee_model',
    'amount_charged',
    'refundable_amount',
    'refund_status',
  ];

  const csv = [
    header.join(','),
    ...rows.map((row: Record<string, string | number | null>) =>
      [
        row.request_id,
        row.student_name,
        row.ucsd_email,
        row.program,
        row.requested_quarter,
        row.locker_number ?? '',
        row.location ?? '',
        row.locker_status ?? '',
        row.active_combo_index ?? '',
        row.fee_model,
        row.amount_charged,
        row.refundable_amount,
        row.refund_status,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="rady-lockers-current-assignments.csv"',
    },
  });
}
