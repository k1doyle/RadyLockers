import { getHistoryExport } from '@/lib/db';

export async function GET() {
  const rows = await getHistoryExport();
  const header = [
    'request_id',
    'student_name',
    'ucsd_email',
    'program',
    'requested_quarter',
    'request_status',
    'locker_number',
    'location',
    'assignment_start_date',
    'assignment_end_date',
    'returned_date',
    'return_verified_by',
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
        row.request_status,
        row.locker_number ?? '',
        row.location ?? '',
        row.assignment_start_date ?? '',
        row.assignment_end_date ?? '',
        row.returned_date ?? '',
        row.return_verified_by ?? '',
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
      'Content-Disposition': 'attachment; filename="rady-lockers-history.csv"',
    },
  });
}
