# RadyLockers — Data Privacy Statement

**Status:** Prototype — pending IT review before production use
**Last updated:** March 2026
**Contact:** Rady School of Management, Student Services

---

## What this system is

RadyLockers is an internal web application for managing quarterly rental assignments of outdoor metal combination lockers at the UC San Diego Rady School of Management. It replaces a manual spreadsheet process.

---

## What data is collected

All data is submitted voluntarily by students as part of the locker request process.

| Field | Purpose |
|---|---|
| Full name | Assignment records and email communication |
| UCSD email address (.edu only) | Assignment confirmation and return reminder delivery |
| Student PID | Identity verification |
| Program enrollment | Eligibility check and reporting context |
| Assignment history | Locker number, rental dates, fee, return status, refund status |
| Audit log | Record of all admin actions with timestamps |

---

## Who can access this data

- **Admin staff only** — access requires a password-protected login
- Student data is never displayed publicly
- No third-party services receive student data except as necessary for email delivery (SMTP)

---

## What this system does NOT do

- Does not integrate with Banner, Canvas, or any other UCSD system
- Does not use UCSD SSO (designed for SSO integration — pending IT configuration)
- Does not share data with external parties
- Does not collect payment information (fees are handled offline)

---

## Email communication

Students who submit a request may receive:
1. An assignment confirmation email when a locker is assigned
2. A return reminder email 14 days before their rental period ends

Emails are sent from an SMTP address configured by Rady staff. Students are not subscribed to any mailing list.

---

## Data retention

**⚠ No formal retention policy has been established.** This is a known gap to be resolved with IT and compliance teams before production use. Proposed for discussion: retain active assignment records indefinitely, purge closed/declined requests after 3 academic years.

---

## FERPA considerations

This system stores student PID numbers and program enrollment, which may constitute education records under FERPA. Access is restricted to authorized Rady staff. A formal FERPA review is recommended before production deployment.

---

## Hosting

Student data is stored in a Postgres database hosted by Neon (neon.tech), a SOC 2 Type 2 certified provider, billed through Vercel. The application is hosted on Vercel (vercel.com), also SOC 2 Type 2 certified. Both providers are US-based.
