const templateRows = [
  ['locker_number', 'location', 'combo1', 'combo2', 'combo3', 'combo4', 'combo5', 'notes', 'status'],
  ['OM-101', 'Rady Courtyard East', '12-24-08', '', '', '', '', 'Near faculty entrance', 'AVAILABLE'],
];

export async function GET() {
  const csv = templateRows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="rady-lockers-import-template.csv"',
    },
  });
}
