# RadyLockers — Hosting & Infrastructure

**Status:** Prototype — pending IT review before production use
**Last updated:** March 2026

---

## Architecture overview

```
Student browser  ──►  Vercel (Next.js app)  ──►  Neon (Postgres database)
Admin browser    ──►  Vercel (Next.js app)  ──►  Neon (Postgres database)
Vercel Cron      ──►  /api/cron/return-reminders  ──►  SMTP (email delivery)
```

---

## Application hosting — Vercel

- **Provider:** Vercel (vercel.com)
- **Model:** Serverless Next.js hosting
- **Security:** SOC 2 Type 2 certified
- **TLS:** Automatic HTTPS on all routes
- **CDN:** Global edge network
- **Deployments:** Triggered automatically when code is pushed to the `main` branch on GitHub. Zero-downtime deploys.
- **Domain:** radylockers.org (registered separately, pointed to Vercel)

---

## Database — Neon (Serverless Postgres)

- **Provider:** Neon, LLC (neon.tech)
- **Model:** Serverless Postgres
- **Security:** SOC 2 Type 2 certified
- **Billing:** Via Vercel (single vendor relationship)
- **Current plan:** Free tier
- **Backup / recovery:** 24-hour point-in-time recovery on Free tier

> **⚠ Recommendation:** Upgrade to Neon's Launch plan (~$19/month) before production use. This extends point-in-time recovery to 7 days and removes compute hour limits.

---

## Email delivery — SMTP via Nodemailer

- Sends assignment confirmation emails to students when a locker is assigned
- Sends return reminder emails 14 days before a rental period ends
- SMTP credentials are stored as Vercel environment variables — not in the codebase or version control

---

## Scheduled jobs — Vercel Cron

- A daily cron job runs at 9:00am Pacific time
- Endpoint: `GET /api/cron/return-reminders`
- Protected by a secret token (`CRON_SECRET`) stored in Vercel environment variables
- Logs are visible in the Vercel dashboard under Cron Jobs

---

## Environment variables

All secrets are stored as Vercel environment variables. No secrets are committed to the GitHub repository.

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Shared admin login password |
| `DATABASE_URL` | Neon Postgres connection string |
| `SMTP_HOST` | Email server hostname |
| `SMTP_PORT` | Email server port |
| `SMTP_USER` | Email account username |
| `SMTP_PASS` | Email account password |
| `SMTP_FROM` | From address for outgoing emails |
| `CRON_SECRET` | Authenticates the daily cron job endpoint |

---

## Known gaps — path to production

| Gap | Detail |
|---|---|
| SSO authentication | Replace shared admin password with UCSD Shibboleth SSO |
| Database backup retention | Upgrade Neon plan for 7-day point-in-time recovery |
| Data retention policy | Define record retention schedule with IT/compliance |
| Ownership model | Establish IT support agreement or transfer hosting |
| FERPA review | Formal review recommended given student PID storage |

---

## Disaster recovery

In the event of a database outage, Neon provides automatic failover for the serverless Postgres instance. Point-in-time recovery allows restoration to any point within the retention window. The application itself is stateless — redeploying from GitHub restores full functionality once the database is available.
