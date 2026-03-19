import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const highlights = [
  {
    title: 'Quarter-based rentals',
    description: 'Support assignment, renewal decisions, and return workflows aligned to the UCSD academic quarter.',
  },
  {
    title: 'Preset combination rotation',
    description: 'Track all five preset combinations per locker and advance the active position after each verified return.',
  },
  {
    title: 'Staff-first operations',
    description: 'Provide a focused dashboard for locker inventory, assignment history, CSV exports, and return processing.',
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
                Simple locker operations for Rady’s outdoor metal lockers.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Rady Lockers helps students request quarterly locker access while giving staff a clean workflow for assignments,
                returns, combination rotation, and historical tracking.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/request" className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-sm">
                  Request a Locker
                </Link>
                <Link href="/admin/login" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700">
                  Staff Login
                </Link>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                <li>• Outdoor metal lockers only for version 1.</li>
                <li>• Daily rentals and wooden keyed lockers are intentionally excluded.</li>
                <li>• Student-facing pages never expose locker combinations or other student data.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-brand-mist p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-navy">How the program works</h2>
              <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
                <li><span className="font-semibold text-brand-blue">1.</span> Students submit a locker request for a specific academic quarter.</li>
                <li><span className="font-semibold text-brand-blue">2.</span> Staff review requests, assign an available locker, and record the fee model used.</li>
                <li><span className="font-semibold text-brand-blue">3.</span> When the locker is returned and verified empty, staff closes the assignment and advances the combination index.</li>
                <li><span className="font-semibold text-brand-blue">4.</span> The previous combination is retired from active use for the next renter.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((highlight) => (
              <article key={highlight.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-brand-navy">{highlight.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{highlight.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
