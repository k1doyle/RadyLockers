import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

export default function ConfirmationPage() {
  return (
    <SiteShell>
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Request received</p>
          <h1 className="mt-4 text-3xl font-semibold text-brand-navy">Your locker request has been submitted.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Staff will review your request and follow up via your UCSD email once a locker is available or if more information is needed.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/" className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white">
              Return home
            </Link>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
