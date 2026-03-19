import Link from 'next/link';
import { submitLockerRequest } from '@/app/actions';
import { ProgramSelect, QuarterSelect, SelectField, TextAreaField, TextField } from '@/components/forms';
import { SiteShell } from '@/components/site-shell';

const rentalPeriodOptions = [
  'One Academic Quarter',
  'One Academic Quarter, with possible renewal request',
];

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Locker Request</p>
            <h1 className="text-3xl font-semibold text-brand-navy">Request a locker for one quarter</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Complete this form if you are a current Rady student or approved Rady affiliate seeking an outdoor metal locker for the quarter. Staff will review requests based on availability and demand.
            </p>
          </div>

          {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <form action={submitLockerRequest} className="mt-8 grid gap-6 md:grid-cols-2">
            <TextField name="student_name" label="Full name" required placeholder="First Last" />
            <TextField name="ucsd_email" label="UCSD email" type="email" required placeholder="name@ucsd.edu" />
            <TextField name="pid_or_student_id" label="Student PID or ID" required placeholder="A12345678" />
            <ProgramSelect />
            <QuarterSelect />
            <SelectField name="requested_rental_period" label="Requested Rental Period" options={rentalPeriodOptions} required />
            <div className="md:col-span-2">
              <TextAreaField name="reason" label="Reason for request (optional)" placeholder="Share any schedule or access needs that would help staff review your request." />
            </div>
            <label className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <input type="checkbox" name="acknowledged_terms" required className="mt-1 h-4 w-4 rounded border-slate-300" />
              <span>
                I understand locker access is typically quarter-based, lockers remain Rady property, the rental cost is $50 total including a $25 refundable deposit, and staff may reassign or revoke lockers if terms are not followed.
              </span>
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <button className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white">Submit request</button>
              <Link href="/" className="text-sm font-medium text-slate-500">
                Back to overview
              </Link>
            </div>
          </form>
        </div>
      </main>
    </SiteShell>
  );
}
