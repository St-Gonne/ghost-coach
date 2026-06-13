# Ghost Coach — Independent Phase 1 Review and Corrections

**Review date:** 2026-06-11
**Reviewed source:** Replit export supplied by Sharan
**Reference:** Ghost Coach Build-Ready Product and Technical Specification v0.1

## Current verdict

### PASS for Phase 1 source logic and mock-planner validation

The exported project is a real implementation rather than a hard-coded preview. After correcting the defects documented below:

- TypeScript project build/check passes.
- Test TypeScript compilation passes.
- 10 test files pass.
- 90 tests pass and 0 fail.
- The key mock scenarios now behave correctly.

### CONDITIONAL for Replit runtime approval

Before Phase 2 begins, Replit must rerun the repository's normal commands in its own environment:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm --filter @workspace/api-server test
pnpm build
```

The exported dependency cache did not contain a usable native `esbuild` executable and omitted some package files required by ESLint. This prevented an honest local production-build and ESLint run. It is an export/runtime dependency issue, not evidence that those checks pass or fail.

The app must also receive a short manual smoke test in Replit Preview after import.

## Important security gate before real calendar data

The Phase 1 mock app currently has no real user authentication middleware. API routes fetch the first database user, and the server enables broad CORS. This is acceptable only for a private mock preview.

**Do not connect or expose Sharan's real Google Calendar until Phase 2 adds:**

- Google OAuth login as the application access gate.
- Enforcement of `ALLOWED_EMAIL` on every authenticated request.
- Secure HTTP-only session cookies.
- CSRF protection for state-changing dashboard routes.
- Restricted production CORS or same-origin-only API access.

This is a mandatory Phase 2 requirement, not optional hardening.

---

# Defects found beyond the Replit audit

## 1. Backup was not a real backup

The original generator made primary, backup, and minimum-win copies of the same activity at the same time. The selector could therefore return an identical primary and backup.

### Correction

- Added a deterministic selection policy.
- A backup must now differ materially from the primary, normally by start time and optionally by activity.
- Minimum win must be a genuine shorter candidate and cannot exceed the primary duration.
- Model output validation rejects an identical primary and backup.

## 2. Time-of-day scoring used UTC instead of Sharan's timezone

A 7:00 a.m. India plan was scored as though it happened around 1:30 a.m., damaging time convenience rankings.

### Correction

Time scoring now converts each candidate into the user's IANA timezone before applying morning/day/evening preferences. A regression test covers Asia/Kolkata.

## 3. Airport planning preferred an outdoor walk

At Mumbai Airport, the planner selected the generic outdoor `Morning Walk` despite a location-compatible `Indoor Walk` being available.

### Correction

- Outdoor activities are rejected inside an airport.
- Indoor/location compatibility contributes to the score.
- The airport acceptance test explicitly requires Indoor Walk.

## 4. Packed days crashed the planner

With no viable free window, `createDailyPlan` threw a `PlannerError`. This is especially harmful because packed days are when the product should reduce cognitive load.

### Correction

The planner now returns a valid degraded result:

- `hasViablePlan: false`
- A machine-readable reason: `NO_FREE_WINDOWS` or `NO_VALID_ACTIVITIES`
- A concise explanation.
- No activity item and no calendar claim.

The Today page displays a clear no-window state rather than failing.

## 5. Candidate generation considered only the beginning of each free window

A six-hour free window produced candidates only at its first minute. It could not select a later, more realistic time within the same free block.

### Correction

Candidates are now generated at 30-minute intervals, plus the latest possible fitting start, with a bounded maximum per window.

## 6. Today action buttons could never appear

The frontend checked for uppercase `SCHEDULED`, while the database stores lowercase states such as `proposed`.

### Correction

- The Today page recognizes actual lowercase active states.
- `Mark Done`, `Mark Partial`, and `Skip` appear when appropriate.
- The query refreshes after an action.
- A completed action updates the daily-plan status.

## 7. State machine rejected truthful after-the-fact reporting

Even if the UI called `Done` or `Partial`, the backend rejected it from `proposed`, the state used by the Phase 1 plan.

### Correction

Done, partial, and skipped reporting is allowed from appropriate pre-start and active states. Terminal states remain protected.

## 8. Replanning was not truly idempotent

The audit's idempotency test only checked that two generated IDs were present. Candidate IDs are random, and the route always created another plan version and plan items.

### Correction

Before writing, the route compares the semantic execution plan:

- Activity template.
- Location.
- Exact start.
- Exact end.
- Primary, backup, and minimum win.

If unchanged, it returns the existing plan without inserting another version or item. Repeated no-plan results also reuse the existing result.

**Remaining note:** simultaneous concurrent replan requests are not protected by a database advisory lock or unique transaction. This is low risk for the single-user prototype but should be hardened before multiple clients or automated frequent replanning.

## 9. Mock Calendar shifted times through the server timezone

The adapter took an already timezone-correct day boundary and called server-local `setHours`, which could shift event times.

### Correction

Mock events now build directly from the supplied zoned day-start instant.

## 10. Physio frequency was not enforced correctly

The route marked active physio prescriptions as due without properly accounting for completed sessions against weekly frequency, and did not reliably provide the last completion for each routine.

### Correction

- Only done/partial activity logs count as completions.
- Each active prescription has its own weekly due calculation.
- Each activity has its own last-completed timestamp.
- Its exact minimum-gap rule is enforced.
- If the weekly target is met, the routine is not scheduled as due.
- Unapproved routines remain rejected regardless of active status.

## 11. Skips incorrectly influenced repetition/boredom history

Recent logs, including skipped activities, were passed into the repetition penalty.

### Correction

Only done and partial outcomes count as recent completed activities.

## 12. Seed data did not match the specification

Coffee Shop was missing despite the audit scenario referring to it. Yoga, stairs, body-weight, and recovery templates were also missing.

### Correction

Added:

- Coffee Shop.
- Short Yoga.
- Free Body-Weight Session.
- Stairs.
- Recovery Movement.
- `mall` as a location type for indoor walking.

The physio template remains unapproved and without invented instructions.

## 13. Backup and minimum-win information was unclear in the Today UI

The cards showed names and generic reasoning, but not their actual time or duration.

### Correction

Both cards now show start time and duration.

## 14. Internal errors were exposed by the replan endpoint

The route returned `String(err)` to the client.

### Correction

Unexpected replan errors now return a generic internal-server response while details stay in server logs.

---

# Validation evidence

## TypeScript

```text
ROOT_TYPESCRIPT_BUILD=PASS
TEST_TYPESCRIPT_CHECK=PASS
```

## Tests

```text
Test Files: 10 passed (10)
Tests:      90 passed (90)
Failures:   0
```

Coverage includes:

- Free-window calculations.
- Candidate generation across long windows.
- Hard constraints.
- Airport/outdoor incompatibility.
- Weather constraints.
- Physio approval, frequency, and minimum gap.
- Timezone-aware scoring.
- Selection diversity.
- Model-output validation.
- State transitions.
- Deterministic fallback.
- Nine acceptance scenarios.

## Key corrected scenario outcomes

- Normal Goa day: valid primary, later backup, and shorter minimum win.
- Hot/rainy day: outdoor plan rejected; indoor plan selected.
- Airport: Indoor Walk selected; floor and outdoor activities rejected.
- Coffee shop: only public/discreet-compatible actions pass.
- Packed calendar: graceful no-plan result, no exception.
- Approved physio due: physio can win selection.
- Unapproved physio: always rejected.
- Weekly physio target met: routine is not treated as due.
- Repeated deterministic planning: semantically identical plan.

---

# Remaining work by phase

## Before Phase 2 starts

1. Import this corrected source into Replit.
2. Run normal install, typecheck, lint, tests, and production build.
3. Perform the manual Preview checks listed below.
4. Create a Replit checkpoint labelled `Phase 1 corrected and verified`.

## Mandatory during Phase 2

- Real authentication and `ALLOWED_EMAIL` enforcement before real calendar access.
- Restricted CORS/session/CSRF behavior.
- Google OAuth token encryption.
- Read only selected calendars.
- Write only to the dedicated Ghost Coach calendar.
- Refuse to edit/delete events without the app's private ownership marker.
- Recheck calendar conflicts immediately before event creation.

## Before Phase 3

- Implement and test `/internal/tick`.
- Due-job claiming, locking, retry, and idempotency.
- Telegram pairing and sender verification.

## Before Phase 4

- LLM usage records.
- Daily call cap.
- Budget threshold.
- Structured model output and deterministic fallback.

---

# Manual Replit Preview checks

1. Open Today and press Re-plan.
2. Confirm primary, backup, and minimum win have meaningful times and durations.
3. Confirm backup is not the exact same execution as primary.
4. Press Mark Partial; verify the item state and plan badge update after refresh.
5. Run the packed-calendar Debug scenario; confirm it shows no viable plan rather than an error.
6. Run Airport; confirm Indoor Walk is selected.
7. Run Coffee Shop; confirm floor/private activities are rejected.
8. Activate but do not approve Physio; confirm it is rejected.
9. Enter explicit routine instructions, approve it, and confirm it can be scheduled when due.
10. Re-plan twice without changing inputs; verify no new database plan version or items are created.
11. Refresh/restart; confirm settings and activity changes persist.
12. Check mobile width and browser console for red errors.

---

# Recommended next status

After Replit's native checks and manual smoke test pass, mark Phase 1 complete and begin Phase 2 using the explicit Phase 2 implementation prompt. Do not connect the real calendar while the dashboard/API remain unauthenticated.
