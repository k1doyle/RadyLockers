import { ensureDatabaseSchema, getAssignmentsDueForReturnReminder, updateReturnReminderDelivery } from '../lib/db';
import { sendLockerReturnReminderEmail } from '../lib/notifications';

async function main() {
  await ensureDatabaseSchema();

  const assignments = await getAssignmentsDueForReturnReminder();

  if (!assignments.length) {
    console.log('No locker return reminders are due today.');
    return;
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

      console.log(`Sent return reminder for request ${assignment.request_id} (${assignment.ucsd_email}).`);
    } catch (error) {
      skippedCount += 1;
      console.error(`Failed to process return reminder for request ${assignment.request_id}.`, error);
    }
  }

  console.log(`Processed ${assignments.length} return reminder candidates. Sent ${sentCount}. Skipped ${skippedCount}.`);
}

main().catch((error) => {
  console.error('Locker return reminder job failed.', error);
  process.exit(1);
});
