import { NextResponse } from 'next/server';
import { ensureDatabaseSchema, getAssignmentsDueForReturnReminder, updateReturnReminderDelivery } from '@/lib/db';
import { sendLockerReturnReminderEmail } from '@/lib/notifications';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  await ensureDatabaseSchema();

  const assignments = await getAssignmentsDueForReturnReminder();

  if (!assignments.length) {
    return NextResponse.json({ message: 'No return reminders due today.', sent: 0, skipped: 0 });
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const assignment of assignments) {
    try {
      const result = await sendLockerReturnReminderEmail({
        student_name: assignment.student_name,
        ucsd_email: assignment.ucsd_email,
        locker_number: assignment.locker_number,
        location: assignment.location,
        assignment_end_date: assignment.assignment_end_date,
      });

      if (!result.sent) {
        skippedCount += 1;
        console.warn(`Skipped return reminder for request ${assignment.request_id}: ${result.reason}`);
        continue;
      }

      const now = new Date().toISOString();
      await updateReturnReminderDelivery(assignment.request_id, now, now);
      sentCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.error(`Failed to process return reminder for request ${assignment.request_id}.`, error);
    }
  }

  return NextResponse.json({
    message: `Processed ${assignments.length} return reminder candidates.`,
    sent: sentCount,
    skipped: skippedCount,
  });
}
