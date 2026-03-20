# Rady Lockers

Rady Lockers is a small internal web application for the UC San Diego Rady School of Management to manage quarter-based rentals of outdoor metal combination lockers.

## Version 1 scope

This first release includes:

- Public landing page for the locker program
- Student locker request form and confirmation page
- Admin login using a shared password stored in environment variables
- Admin dashboard with search and filter tools
- Locker detail page with assignment history and combination management
- Assignment workflow for matching requests to lockers
- Return workflow for verifying returns and advancing combo positions
- CSV exports for current assignments and assignment history
- SQLite schema and seed data for demo/testing

This version intentionally does **not** include:

- Wooden keyed lockers
- Daily rentals
- Online payments
- Student visibility into other lockers or any locker combinations

## Tech stack

- Next.js (App Router)
- TypeScript
- SQLite with `better-sqlite3` for local development
- Postgres/Neon via `pg` for hosted runtime persistence
- Tailwind CSS

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with an admin password. Example:

   ```env
   DATABASE_URL="file:./data/rady-lockers.db"
   ADMIN_PASSWORD="rady-admin-demo"
   ```

4. Initialize the configured database schema:

   ```bash
   npm run db:push
   ```

5. Seed demo data:

   ```bash
   npm run db:seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

## Runtime database modes

- Local development defaults to SQLite via `DATABASE_URL="file:./data/rady-lockers.db"`.
- Hosted environments can use a Postgres connection string in `DATABASE_URL`.
- The app initializes the configured schema at runtime for supported database modes.

## Database schema

- SQL schema file: `db/schema.sql`
- Postgres schema file: `db/postgres-schema.sql`
- Seed script: `scripts/seed.ts`
- Database helper module: `lib/db.ts`

The app stores three relational tables:

- `lockers`
- `assignments`
- `audit_logs`

## Demo seed data

Seed data includes:

- Outdoor lockers in two locations: `Rady Courtyard East` and `Rady Patio West`
- Sample statuses including Available, Assigned, Pending Return, and Disabled
- Sample requests and assignment history
- A locker at active combination index 5 to demonstrate the review warning state

## Admin workflow overview

### Request intake

Students submit:

- Full name
- UCSD email
- PID or student ID
- Program
- Requested quarter
- Requested rental period
- Optional reason
- Terms acknowledgement

### Assignment flow

Admins can:

- Review incoming requests from the dashboard
- Assign an available locker
- Record assignment dates
- Choose between two fee models:
  - `FLAT_25_NON_REFUNDABLE`
  - `DEPOSIT_50_WITH_25_REFUND`
- Track amount charged, refundable amount, and payment notes

### Return flow

When a locker is returned:

1. Staff marks the locker workflow as pending return or verifies the return directly.
2. Staff confirms the locker is empty.
3. Staff closes the assignment.
4. Staff advances the active combo index so the previous combination is no longer the active one for the next renter.
5. If the locker reaches combo index 5, the UI shows a warning for facilities review/reset planning.

## CSV exports

The admin dashboard includes links for:

- Current assignments export
- Full assignment history export

## Notes on auth

For version 1, admin access uses a shared password stored in `ADMIN_PASSWORD`. After login, the app stores a secure HTTP-only session cookie for admin pages.

This is intentionally lightweight for internal use and local evaluation. A future version could replace it with SSO or role-based authentication.

## Future improvements

Possible next steps:

- Email notifications when a locker is assigned
- Renewal approval workflow
- Deeper reporting and operational charts
- More granular audit history
- SSO integration for staff
