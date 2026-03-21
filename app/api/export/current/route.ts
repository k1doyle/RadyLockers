<file name=app/admin/lockers/[id]/page.tsx>import { useState } from 'react';
// ... other imports

export default function LockerDetailPage({ params }: { params: { id: string } }) {
  // ... existing code and state

  return (
    <div>
      {/* ... other UI sections */}
      <section>
        <h2>Current workflow</h2>
        {/* ... other workflow cards */}
        {locker.status !== 'RETURNED' ? (
          <form action={completeReturnAction}>
            {/* form fields */}
            <button type="submit">Verify return and close</button>
          </form>
        ) : (
          <div className="bg-gray-100 border border-gray-300 rounded p-4">
            <h3 className="text-lg font-semibold mb-1">Return completed</h3>
            <p className="text-gray-700">This locker has already been verified and closed.</p>
          </div>
        )}
      </section>
      {/* ... rest of the page */}
    </div>
  );
}
</file>

<file name=app/actions.ts>import { getLockerById, completeLockerReturn, writeAuditLog } from '@/lib/db';

// ... other actions

export async function completeReturnAction(data: FormData) {
  'use server';

  const lockerId = data.get('lockerId');
  if (typeof lockerId !== 'string') throw new Error('Invalid locker ID');

  const locker = await getLockerById(lockerId);
  if (!locker) throw new Error('Locker not found');

  // Check if already returned/closed
  if (locker.status === 'RETURNED') {
    // Idempotent: do nothing and exit early
    return;
  }

  // Proceed with update
  const updated = await completeLockerReturn(lockerId);
  if (updated) {
    await writeAuditLog({
      lockerId,
      action: 'RETURN_COMPLETED',
      message: 'Locker return verified and closed',
    });
  }
}
</file>

<file name=lib/db.ts>import { db } from './dbClient';

// ... other db helpers

export async function completeLockerReturn(lockerId: string): Promise<boolean> {
  // Only update if not already returned
  const result = await db.locker.updateMany({
    where: {
      id: lockerId,
      status: {
        not: 'RETURNED',
      },
    },
    data: {
      status: 'RETURNED',
      returnCompletedAt: new Date(),
    },
  });

  // result.count indicates how many rows were updated
  return result.count > 0;
}
</file>
