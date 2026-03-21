import Link from 'next/link';
import { ActionSubmitButton } from '@/components/action-submit-button';
import { createLocker, importLockers } from '@/app/actions';
import { lockerStatuses } from '@/lib/constants';
import {
  STANDARD_LOCKER_LOCATION,
  STANDARD_REFUNDABLE_DEPOSIT,
  STANDARD_RENTAL_FEE,
  STANDARD_TOTAL_COST,
} from '@/lib/policy';
import { formatStatus } from '@/lib/utils';

export function AdminLockerManagementSections({
  imported,
  importError,
}: {
  imported: string;
  importError: string;
}) {
  return (
    <div className="space-y-6">
      <section id="locker-import" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-navy">Import lockers from CSV</h2>
            <p className="mt-2 text-sm text-slate-500">Use this to load initial locker inventory from a spreadsheet export or cleaned CSV.</p>
          </div>
          <Link href="/api/import/lockers-template" className="text-sm font-semibold text-brand-blue">
            Download template
          </Link>
        </div>
        {(imported || importError) ? (
          <div
            aria-live="polite"
            className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
              imported
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {imported ? `Imported ${imported} lockers successfully.` : importError}
          </div>
        ) : null}
        <form action={importLockers} className="mt-5 space-y-4">
          <input type="file" name="csv_file" accept=".csv,text/csv" className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-mist file:px-4 file:py-2 file:font-medium file:text-brand-navy" />
          <textarea
            name="csv_text"
            placeholder={`locker_number,location,combo1,notes,status\nOM-101,${STANDARD_LOCKER_LOCATION},12-24-08,Near faculty entrance,AVAILABLE`}
            className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Expected columns: <span className="font-medium text-slate-900">locker_number</span>, optional <span className="font-medium text-slate-900">location</span>, <span className="font-medium text-slate-900">combo1</span>, optional <span className="font-medium text-slate-900">combo2</span>-<span className="font-medium text-slate-900">combo5</span>, <span className="font-medium text-slate-900">notes</span>, and <span className="font-medium text-slate-900">status</span>.
            If <span className="font-medium text-slate-900">location</span> is blank, the locker imports as <span className="font-medium text-slate-900">{STANDARD_LOCKER_LOCATION}</span>. If <span className="font-medium text-slate-900">status</span> is blank, the locker imports as <span className="font-medium text-slate-900">Available</span>.
          </div>
          <ActionSubmitButton
            idleLabel="Import lockers"
            pendingLabel="Importing lockers..."
            className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          />
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-brand-navy">Create a locker manually</h2>
        <p className="mt-2 text-sm text-slate-500">Use manual entry for one-off additions or corrections.</p>
        <form action={createLocker} className="mt-5 space-y-4">
          <input name="locker_number" placeholder="Locker number" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
          <input type="hidden" name="location" value={STANDARD_LOCKER_LOCATION} />
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Location: <span className="font-medium text-slate-900">{STANDARD_LOCKER_LOCATION}</span>
          </div>
          <div className="rounded-2xl border border-brand-mist bg-brand-mist/40 p-4 text-sm text-slate-700">
            Standard pricing for new assignments: <span className="font-medium text-slate-900">${STANDARD_TOTAL_COST} total</span>, including a <span className="font-medium text-slate-900">${STANDARD_REFUNDABLE_DEPOSIT} refundable deposit</span> and a <span className="font-medium text-slate-900">${STANDARD_RENTAL_FEE} rental fee</span>.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input name="combo_1" placeholder="Combination 1" required className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <input name="combo_2" placeholder="Combination 2 (optional)" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <input name="combo_3" placeholder="Combination 3 (optional)" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <input name="combo_4" placeholder="Combination 4 (optional)" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <input name="combo_5" placeholder="Combination 5 (optional)" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
            <input name="active_combo_index" type="number" min="1" max="5" defaultValue="1" className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
          </div>
          <select name="status" defaultValue="AVAILABLE" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
            {lockerStatuses.map((status) => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </select>
          <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
          <textarea name="disabled_reason" placeholder="Disabled reason if applicable" className="min-h-20 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
          <button className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white">Create locker</button>
        </form>
      </section>
    </div>
  );
}
