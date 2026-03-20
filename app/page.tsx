import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4">
                <Image
                  src="/rady-logo.png"
                  alt="Rady School of Management"
                  width={250}
                  height={67}
                  className="h-10 w-auto"
                  priority
                />
              </div>
              <p className="mt-5 inline-flex rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-sm font-medium text-brand-navy">
                Now accepting requests for Spring 2026
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
                Request a Rady Locker
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Submit a request for the current academic quarter. Eligible students receive staff follow-up through their UCSD email.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/request"
                  className="rounded-xl bg-brand-navy px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#13233c]"
                >
                  Request a Locker
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-500">Limited availability. Requests are reviewed in the order received.</p>
              <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left shadow-sm">
                <div className="space-y-4 text-sm leading-6 text-slate-600">
                  <div>
                    <p className="font-semibold text-brand-navy">Eligibility</p>
                    <p className="mt-1">
                      Open to current Rady students and approved Rady affiliates. Assignments are limited and based on availability.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-brand-navy">Return expectations</p>
                    <p className="mt-1">
                      Lockers must be emptied and returned by the posted end-of-quarter deadline so deposits can be refunded appropriately.
                    </p>
                  </div>
                  <div className="border-t border-slate-200 pt-3 text-sm text-slate-500">
                    Questions? Contact Rady Student Affairs.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-brand-mist p-4 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Pricing</p>
                <div className="mt-4 grid gap-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-3">
                    <div>
                      <p className="text-lg font-semibold text-brand-navy">$25 refundable deposit</p>
                      <p className="mt-1 text-sm text-slate-600">Returned after verified locker check-out</p>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-lg font-semibold text-brand-navy">$25 rental fee</p>
                      <p className="mt-1 text-sm text-slate-600">Non-refundable use fee for the quarter</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/15 px-4 py-3">
                    <p className="text-sm font-medium uppercase tracking-[0.15em] text-brand-blue">Total due</p>
                    <p className="mt-1 text-2xl font-semibold text-brand-navy">$50</p>
                    <p className="mt-1 text-sm text-slate-600">Includes the refundable deposit and quarterly rental fee</p>
                  </div>
                </div>
              </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">What Happens After You Submit?</p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                  <li>
                    <span className="font-semibold text-brand-navy">1. Confirmation is sent immediately.</span>
                    <span className="block text-slate-600">Your submission is received and routed into the staff review queue.</span>
                  </li>
                  <li>
                    <span className="font-semibold text-brand-navy">2. Staff review within a few days.</span>
                    <span className="block text-slate-600">Requests are checked for availability, quarter timing, and eligibility.</span>
                  </li>
                  <li>
                    <span className="font-semibold text-brand-navy">3. Approved students receive locker and payment details.</span>
                    <span className="block text-slate-600">All follow-up is sent through your UCSD email.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
