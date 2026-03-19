# AGENTS.md

## Project guardrails
- Security and privacy matter.
- Locker combinations must never appear on public or student-facing pages.
- Only authorized admins should be able to view or edit locker combinations.
- Changes should prioritize simplicity and operational clarity.
- Avoid unnecessary dependencies.
- Prefer maintainable code over clever abstractions.
- Protect against duplicate locker assignments.
- Protect the combo-advance workflow from accidental or double submission.

## Product context
- This first version is only for the outdoor metal combination lockers located outside near MPR2 / the IT offices.
- Each locker/lock has exactly 5 preset combinations.
- Only 1 combination is active at a time.
- Staff can manually trigger the physical lock to move to the next preset combination.
- The app should track the active combo index only; it should not try to automate the physical lock.
- Combo positions cycle as: 1 -> 2 -> 3 -> 4 -> 5 -> 1.
- Other keyed lockers at Rady are out of scope for this version.
