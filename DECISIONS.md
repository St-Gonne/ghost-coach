# Ghost Coach — Architecture and Design Decisions

## D1: Monorepo adapter — spec's `src/` maps to `artifacts/api-server/src/`

**Decision:** The spec's `ghost-coach/src/` structure is implemented under `artifacts/api-server/src/`. The React dashboard is the separate `artifacts/ghost-coach-web/` package. DB schema lives in `lib/db/src/schema/` per the existing pnpm monorepo conventions.

**Why:** We're building on an existing pnpm monorepo scaffold. Adapting to this avoids introducing a second Node process and keeps the shared DB lib working correctly.

## D2: Replit PostgreSQL instead of Supabase

**Decision:** Using Replit's built-in managed PostgreSQL rather than Supabase for Phase 1.

**Why:** Replit's managed DB integrates with the existing `lib/db` package and Drizzle ORM setup. Supabase Cron (for the `/internal/tick` endpoint) can be added in Phase 3 when the job loop is built; for Phase 1, tick is called manually from the debug page.

## D3: Drizzle `push` for schema in development, not custom migration files

**Decision:** Use `pnpm --filter @workspace/db run push` to apply schema changes in development. Do not maintain hand-written SQL migration files.

**Why:** The spec mentions "database migrations" but Drizzle's push command generates and applies migrations from the TypeScript schema definition. Replit's publish flow handles production schema diffs automatically.

## D4: Controlled workflow engine — LLM may only select from validated candidate IDs

**Decision:** The planning pipeline generates, filters, and scores all candidates deterministically. The LLM receives only the top-N valid candidate objects with their UUIDs and may only return candidate IDs from that set.

**Why:** Spec section 4.2 and 11.6 are explicit: deterministic code owns constraints, scoring, and permissions. The LLM is a language-generation and ranking tool, not a planning tool.

## D5: Mock mode via `MOCK_INTEGRATIONS=true`

**Decision:** When `MOCK_INTEGRATIONS=true`, all four adapters (Calendar, Weather, Telegram, LLM) are replaced with deterministic mock implementations. Seed data is loaded automatically on server start if the user table is empty.

**Why:** Spec section 21. The app must work fully before any external credentials exist.

## D6: No physio exercise instructions in seed data

**Decision:** Seed data includes a placeholder physio activity template marked `is_physio_approved: false` and no `instructions_markdown`.

**Why:** Spec explicitly says "Do not seed medical exercise instructions." Sharan must enter and approve his actual physio routines from his physiotherapist.

## D7: `date-fns-tz` for timezone-safe calculations

**Decision:** Use `date-fns-tz` (already in the workspace) for all timezone conversions and UTC storage.

**Why:** The spec lists Luxon or date-fns-tz; date-fns-tz is already in use in the workspace ecosystem.

## D8: Completion-probability heuristics only in Phase 1

**Decision:** For the first 14 days, completion probability is estimated by simple heuristics (time-of-day bucket, duration bucket, activity category). Historical probability estimation is a Phase 5 feature.

**Why:** Spec section 11.4: "Initially use heuristics." No historical data exists on day 1.

## D9: Token encryption deferred to Phase 2

**Decision:** The `token_encryption_key_base64` secret is in `.env.example` but AES-256-GCM token encryption is implemented as a stub that returns plaintext in Phase 1.

**Why:** Google OAuth tokens don't exist yet in Phase 1. The interface is defined so Phase 2 can drop in the real implementation without API changes.

## D10: Session-based auth stubs in Phase 1

**Decision:** Dashboard routes are lightly protected by an internal `X-Ghost-Coach-Session` header check in Phase 1. Full Google OAuth session handling is Phase 2.

**Why:** Phase 1 is a personal local prototype. Real auth (Google sign-in, single-user restriction) is Phase 2 scope.

## D11: Phase 2 keeps mock mode as a first-class path

**Decision:** `MOCK_INTEGRATIONS=true` still bypasses real OAuth and real external adapters while preserving the full planner and dashboard workflow.

**Why:** The product must remain reproducible without external secrets, and Phase 2 must not break the existing Phase 1 local demo path.

## D12: Real auth uses opaque server-side sessions plus CSRF protection

**Decision:** Real mode uses an HTTP-only session cookie backed by the `auth_sessions` table, plus a separate CSRF token cookie/header check for state-changing requests.

**Why:** The browser must never receive Google tokens, and same-user local dashboard actions still need CSRF protection once real calendar access exists.

## D13: Transition seeded Phase 1 data onto the real allowed user

**Decision:** On the first successful Google login, Ghost Coach upgrades the seeded single-user row to the authenticated `ALLOWED_EMAIL` account instead of creating a disconnected second profile when possible.

**Why:** This preserves the existing settings, locations, activities, and routines from mock mode while still enforcing the real account boundary.

## D14: Dedicated write-calendar safety before automatic writes

**Decision:** Phase 2 introduces explicit write-calendar selection/creation and test write-delete verification, but not automatic planner event writes.

**Why:** The safety boundary matters before the job loop exists. This phase proves that Ghost Coach can write only to its own calendar without widening scope into scheduler behavior.
