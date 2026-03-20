import Image from 'next/image';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const studentInfo = [
  {
    title: 'Eligibility',
    description: 'Current Rady students and approved Rady affiliates may submit a locker request. Assignments are limited and based on availability.',
  },
  {
    title: 'Assignment Period',
    description: 'Lockers are typically assigned for one academic quarter. Students may request to renew for additional quarters, depending on availability and demand.',
  },
  {
    title: 'Return Expectations',
    description: 'Lockers must be emptied and returned by the posted end-of-quarter deadline. Late or incomplete returns may affect deposit refunds and future eligibility.',
  },
];

const workflowSteps = [
  'Submit your request for the academic quarter you need.',
  'Rady Student Affairs reviews availability and program eligibility.',
  'Approved students receive locker assignment and payment details by UCSD email.',
];

const operationsHighlights = [
  {
    title: 'Quarter-based management',
    description: 'Assignments, renewals, and returns stay aligned with the UC San Diego academic calendar.',
  },
  {
    title: 'Combination rotation tracking',
    description: 'Each outdoor locker keeps its preset combination history so staff can advance access after verified returns.',
  },
  {
    title: 'Internal staff oversight',
    description: 'Student requests, locker inventory, and assignment history are managed in one internal workflow.',
  },
];

const trustSignals = ['Managed by Rady Student Affairs', 'Student data is not publicly exposed'];

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
              <p className="mt-6 inline-flex rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-sm font-medium text-brand-navy">
                Now accepting requests for Spring 2026
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
                Request a Rady Locker in Minutes
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Submit a locker request for the current academic quarter and receive staff follow-up through your UCSD email.
                Outdoor metal lockers are assigned based on availability and program eligibility.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/request" className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13233c]">
                  Request a Locker
                </Link>
                <Link href="/admin/login" className="text-sm font-semibold text-brand-blue transition hover:text-brand-navy">
                  Staff Login
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-500">Limited availability. Requests are reviewed in the order received.</p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                {trustSignals.map((signal) => (
                  <p key={signal}>{signal}</p>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-brand-mist p-6 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Pricing</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-4">
                    <p className="text-2xl font-semibold text-brand-navy">$50 total</p>
                    <p className="mt-1 text-sm text-slate-600">Complete quarterly locker cost</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-4">
                    <p className="text-lg font-semibold text-brand-navy">$25 refundable deposit</p>
                    <p className="mt-1 text-sm text-slate-600">Returned after verified locker check-out</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-4">
                    <p className="text-lg font-semibold text-brand-navy">$25 rental fee</p>
                    <p className="mt-1 text-sm text-slate-600">Non-refundable use fee for the quarter</p>
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

        <section className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">How It Works</p>
              <h2 className="mt-3 text-3xl font-semibold text-brand-navy">Clear, quarter-based request workflow</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The request process is designed to be simple for students and easy for staff to manage.
              </p>
              <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
                {workflowSteps.map((step, index) => (
                  <li key={step} className="flex gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Student Information</p>
                <h2 className="mt-3 text-3xl font-semibold text-brand-navy">Before you request</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Review the basic program rules and expectations before submitting a quarter request.
                </p>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {studentInfo.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                    <h3 className="text-lg font-semibold text-brand-navy">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {operationsHighlights.map((highlight) => (
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
