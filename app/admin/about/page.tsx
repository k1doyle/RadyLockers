import { AdminShell } from '@/components/admin-shell';
import { requireAdmin } from '@/lib/auth';

export default async function AboutPage() {
  await requireAdmin();

  return (
    <AdminShell currentSection="about">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">IT Reference</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-navy">System Information</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Technical overview of RadyLockers for IT review. Covers data collection, hosting infrastructure, authentication, and known gaps on the path to production.
        </p>

        <div className="mt-8 space-y-6">

          {/* System Overview */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-navy">System overview</h2>
            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <p><span className="font-medium text-slate-800">Purpose:</span> Internal tool for managing quarterly rental assignments of outdoor metal combination lockers at the Rady School of Management.</p>
              <p><span className="font-medium text-slate-800">Scope:</span> Covers the outdoor metal combination lockers located between Rady IT and MPR2. Does not manage the keyed wooden lockers in other areas.</p>
              <p><span className="font-medium text-slate-800">Users:</span> Rady students submit requests via the public-facing form. Rady staff manage assignments via this password-protected admin area.</p>
              <p><span className="font-medium text-slate-800">Stack:</span> Next.js 15 (TypeScript), deployed on Vercel, Postgres database via Neon.</p>
              <p><span className="font-medium text-slate-800">Status:</span> Working prototype. Not yet approved for production student use — pending IT review.</p>
            </div>
          </section>

          {/* Data Collection */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-navy">Data collected</h2>
            <p className="mt-2 text-sm text-slate-500">All data is submitted voluntarily by students as part of the locker request process.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 pr-6 font-medium">Field</th>
                    <th className="pb-3 pr-6 font-medium">Why it&apos;s collected</th>
                    <th className="pb-3 font-medium">Who can see it</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">Full name</td>
                    <td className="py-3 pr-6">Assignment records and email communication</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">UCSD email</td>
                    <td className="py-3 pr-6">Assignment confirmation and return reminder emails</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">Student PID</td>
                    <td className="py-3 pr-6">Identity verification</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">Program</td>
                    <td className="py-3 pr-6">Eligibility and reporting context</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">Assignment history</td>
                    <td className="py-3 pr-6">Locker number, dates, fee, return status, refund status</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-medium text-slate-800">Audit log</td>
                    <td className="py-3 pr-6">Record of all admin actions with timestamps</td>
                    <td className="py-3">Admin staff only</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">Note:</span> No formal data retention policy has been established. This is a known gap to be defined with IT before production use.
            </div>
          </section>

          {/* Hosting */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-navy">Hosting &amp; infrastructure</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">Application hosting — Vercel</p>
                <p className="mt-1">Serverless Next.js hosting. SOC 2 Type 2 certified. Automatic HTTPS, global CDN, zero-downtime deployments via GitHub integration. Deployments are triggered automatically when code is pushed to the main branch.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">Database — Neon (Serverless Postgres)</p>
                <p className="mt-1">SOC 2 Type 2 certified. Billed through Vercel. Currently on the <span className="font-medium">Free tier</span>, which includes 24-hour point-in-time recovery. Upgrading to a paid tier (starting at $19/month) would extend backup retention to 7 days — recommended before production use.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">Automated emails — Nodemailer via SMTP</p>
                <p className="mt-1">Sends assignment confirmation emails to students and return reminder emails 14 days before a locker is due back. SMTP credentials are stored as environment variables in Vercel, not in the codebase.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">Scheduled jobs — Vercel Cron</p>
                <p className="mt-1">A daily cron job runs at 9am Pacific to send return reminder emails. Cron endpoint is protected by a secret token stored in Vercel environment variables.</p>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-navy">Authentication</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p><span className="font-medium text-slate-800">Current:</span> Shared admin password stored as a Vercel environment variable. Sessions expire after 8 hours. Login attempts are rate-limited to 5 tries before a 15-minute lockout.</p>
              <p><span className="font-medium text-slate-800">SSO readiness:</span> The authentication layer is isolated in a single module (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">lib/auth.ts</code>). It is designed to be replaced with UCSD SSO (Shibboleth/SAML) without changes to the rest of the application. Integration requires IT to provide SP credentials and SAML endpoint configuration.</p>
              <p><span className="font-medium text-slate-800">Public access:</span> The student request form (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/request</code>) is intentionally public — no login required for students to submit a request.</p>
            </div>
          </section>

          {/* Known Gaps */}
          <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-navy">Known gaps — path to production</h2>
            <p className="mt-2 text-sm text-slate-500">Items to resolve before this system is used with live student data at scale.</p>
            <div className="mt-4 space-y-3">
              {[
                { n: '1', title: 'SSO authentication', detail: 'Replace shared admin password with UCSD Shibboleth SSO. Requires IT coordination.' },
                { n: '2', title: 'Database backup retention', detail: 'Upgrade Neon to a paid plan for 7-day point-in-time recovery (currently 24 hours on Free tier).' },
                { n: '3', title: 'Data retention policy', detail: 'Define how long student request and assignment records are kept. Requires IT/compliance input.' },
                { n: '4', title: 'Ownership and support model', detail: 'Establish who owns the system long-term and who handles incidents if something breaks.' },
                { n: '5', title: 'Email template review', detail: 'Assignment and reminder email copy should be reviewed with Student Affairs before going live.' },
              ].map((item) => (
                <div key={item.n} className="flex gap-4 rounded-2xl border border-slate-200 p-4 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700">{item.n}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-slate-600">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </AdminShell>
  );
}
