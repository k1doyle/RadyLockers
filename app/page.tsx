import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const studentInfo = [
  {
    title: 'Eligibility',
    description:
      'Current Rady students and approved Rady affiliates may submit a locker request. Assignments are limited and based on availability.',
  },
  {
    title: 'Cost',
    description:
      'Locker rental is $50 total, including a $25 refundable deposit. The remaining $25 is a non-refundable rental fee. Deposits are returned after the locker is emptied and verified at the end of use.',
  },
  {
    title: 'Assignment Period',
    description:
      'Lockers are typically assigned for one academic quarter. Students may request to renew for additional quarters, depending on availability and demand.',
  },
  {
    title: 'Return Expectations',
    description:
      'Lockers must be emptied and returned by the posted end-of-quarter deadline. Late or incomplete returns may affect deposit refunds and future eligibility.',
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-brand-gold/15 px-4 py-1 text-sm font-medium text-brand-blue">
                UC San Diego · Rady School of Management
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-brand-navy">
                Request an outdoor locker for the quarter.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Use this form to request an outdoor metal locker near MPR2 and the IT offices. Staff review requests each quarter and assign lockers based on availability.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div>
                  <Link href="/request" className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-sm">
                    Request a Locker
                  </Link>
                  <p className="mt-3 text-sm font-medium text-slate-600">$50 total per locker • $25 refundable deposit</p>
                </div>
                <Link href="/admin/login" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700">
                  Staff Login
                </Link>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                <li>• Outdoor metal lockers only for this version.</li>
                <li>• Lockers are generally assigned for one academic quarter at a time.</li>
                <li>• Student-facing pages do not show locker combinations or other student information.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-brand-mist p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-navy">Before you request</h2>
              <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
                <li><span className="font-semibold text-brand-blue">1.</span> Submit a request for the quarter you need a locker.</li>
                <li><span className="font-semibold text-brand-blue">2.</span> Staff review requests and follow up by UCSD email if a locker is available.</li>
                <li><span className="font-semibold text-brand-blue">3.</span> If assigned, you keep the locker through the approved quarter and return it by the posted deadline.</li>
                <li><span className="font-semibold text-brand-blue">4.</span> Deposits are returned after the locker is emptied and verified.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {studentInfo.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-brand-navy">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
