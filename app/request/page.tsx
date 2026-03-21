import { cookies } from 'next/headers';
import Link from 'next/link';
import { submitLockerRequest } from '@/app/actions';
import { ProgramSelect, QuarterSelect, RentalPeriodSelect, TextAreaField, TextField } from '@/components/forms';
import { cn } from '@/lib/utils';
import { areRequestSubmissionsAvailable, REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE } from '@/lib/request-submissions';
import { SiteShell } from '@/components/site-shell';

type RequestFormState = {
  summary: string;
  values: {
    student_name: string;
    ucsd_email: string;
    pid_or_student_id: string;
    program: string;
    requested_quarter: string;
    requested_rental_period: string;
    reason: string;
    acknowledged_terms: boolean;
  };
  errors: Partial<Record<'student_name' | 'ucsd_email' | 'pid_or_student_id' | 'program' | 'requested_quarter' | 'requested_rental_period' | 'reason' | 'acknowledged_terms', string>>;
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasFormError = typeof params.formError === 'string' ? params.formError : '';
  const notice = typeof params.notice === 'string' ? params.notice : '';
  const cookieStore = await cookies();
  const rawFormState = cookieStore.get('rady-lockers-request-form-state')?.value;
  let formState: RequestFormState | null = null;

  if (hasFormError && rawFormState) {
    try {
      formState = JSON.parse(rawFormState) as RequestFormState;
    } catch {
      formState = null;
    }
  }

  const error = formState?.summary ?? '';
  const values = formState?.values ?? {
    student_name: '',
    ucsd_email: '',
    pid_or_student_id: '',
    program: '',
    requested_quarter: '',
    requested_rental_period: '',
    reason: '',
    acknowledged_terms: false,
  };
  const fieldErrors = formState?.errors ?? {};
  const submissionsAvailable = areRequestSubmissionsAvailable();

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Locker Request</p>
            <h1 className="text-3xl font-semibold text-brand-navy">Request a quarter locker</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Submit this form to request access to an outdoor metal locker for a specific quarter. Staff will review availability and follow up using your UCSD email.
            </p>
          </div>

          {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {!error && (notice || !submissionsAvailable) ? (
            <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {notice || REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE}
            </div>
          ) : null}

          <form action={submitLockerRequest} className="mt-8 grid gap-6 md:grid-cols-2">
            <fieldset disabled={!submissionsAvailable} className="contents disabled:opacity-60">
              <TextField name="student_name" label="Full name" required placeholder="First Last" defaultValue={values.student_name} error={fieldErrors.student_name} />
              <TextField name="ucsd_email" label="UCSD email" type="email" required placeholder="name@ucsd.edu" defaultValue={values.ucsd_email} error={fieldErrors.ucsd_email} />
              <TextField name="pid_or_student_id" label="Student PID or ID" required placeholder="A12345678" defaultValue={values.pid_or_student_id} error={fieldErrors.pid_or_student_id} />
              <ProgramSelect defaultValue={values.program} error={fieldErrors.program} />
              <QuarterSelect defaultValue={values.requested_quarter} error={fieldErrors.requested_quarter} />
              <RentalPeriodSelect defaultValue={values.requested_rental_period} error={fieldErrors.requested_rental_period} />
              <div className="md:col-span-2">
                <TextAreaField
                  name="reason"
                  label="Reason for request (optional)"
                  placeholder="Include schedule, access needs, or context for staff."
                  defaultValue={values.reason}
                  error={fieldErrors.reason}
                />
              </div>
              <label className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="acknowledged_terms"
                  required
                  defaultChecked={values.acknowledged_terms}
                  aria-invalid={fieldErrors.acknowledged_terms ? 'true' : 'false'}
                  className={cn(
                    'mt-1 h-4 w-4 rounded border-slate-300',
                    fieldErrors.acknowledged_terms && 'border-rose-300 text-rose-700 focus:ring-rose-200',
                  )}
                />
                <span>
                  I understand lockers are assigned per quarter, lockers remain Rady property, the total cost is $50, including a $25 refundable deposit, and staff may revoke access if policies are not followed.
                  {fieldErrors.acknowledged_terms ? (
                    <span className="mt-2 block text-sm font-normal text-rose-700">{fieldErrors.acknowledged_terms}</span>
                  ) : null}
                </span>
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button
                  disabled={!submissionsAvailable}
                  className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submissionsAvailable ? 'Submit request' : 'Submission unavailable'}
                </button>
                <Link href="/" className="text-sm font-medium text-slate-500">
                  Back to overview
                </Link>
              </div>
            </fieldset>
          </form>
        </div>
      </main>
    </SiteShell>
  );
}
