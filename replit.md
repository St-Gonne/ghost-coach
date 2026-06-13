# Ghost Coach

A controlled personal coaching system for Sharan that plans daily exercise sessions based on schedule, location, and weather. Phase 1 is a foundation + mock demo with a planning engine, Today/Debug dashboard, and full data management UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, via `/api` proxy path)
- `pnpm --filter @workspace/ghost-coach-web run dev` — run the React frontend (root `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run test` — run unit tests (49 tests)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `MOCK_INTEGRATIONS=true` — enable all mock adapters (Calendar/Weather/Telegram/LLM)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui + TanStack Query + wouter

## Where things live

- `lib/db/src/schema/index.ts` — source-of-truth DB schema (13 tables)
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas (do not edit)
- `artifacts/api-server/src/` — Express server, planner pipeline, coaching state machine
- `artifacts/api-server/src/planner/` — planning engine modules (free-windows, candidates, hard-constraints, scoring, validator, llm-selector, fallback, create-daily-plan)
- `artifacts/api-server/src/integrations/` — mock adapters (Calendar, Weather, Telegram, LLM)
- `artifacts/api-server/src/seed/seed.ts` — dev seed data (no physio instructions seeded)
- `artifacts/ghost-coach-web/src/pages/` — 7 pages: Today, Week, Activities, Routines, Locations, Settings, Debug
- `.env.example` — all required and optional environment variables

## Architecture decisions

- **Contract-first API**: OpenAPI spec lives in `lib/api-spec/`; Orval generates React Query hooks + Zod schemas. Never hand-write client API calls.
- **Mock adapters**: `MOCK_INTEGRATIONS=true` enables deterministic mocks for Calendar/Weather/Telegram/LLM. Mock LLM uses heuristic candidate selection; Mock Calendar uses a hardcoded busy-period schedule.
- **No physio seeding**: The Physio Routine activity template is seeded *without* `instructionsMarkdown`. Physio exercise instructions must be entered by the user and approved before the planner will select physio items.
- **Planning pipeline**: free-windows → candidates → hard-constraints → scoring → LLM-selector (or fallback) → validator → create-daily-plan. All modules are independently unit-tested.
- **Plan state machine**: All state transitions are defined in `coaching/plan-state-machine.ts`. Invalid transitions throw at runtime.

## Product

- **Today page**: Shows today's primary/backup/minimum-win plan items, conditions, location, and a Re-plan button.
- **Week page**: 7-day view of plan status and activity history.
- **Activities**: CRUD for activity templates (name, category, duration, requirements, preference score).
- **Routines**: Manage physio prescription routines (enter instructions, toggle active).
- **Locations**: Manage locations with feature flags (floor space, pool, shower, privacy level).
- **Settings**: Coaching preferences (day bounds, nudge limits, weather thresholds, intensity).
- **Debug**: Plan preview, mock-day simulation, job status viewer, integration status.

## User preferences

- Physio routines must be entered and approved by the user — never seeded with instructions.
- Phase 2 (real integrations, Telegram bot, cron) must not be started until the user explicitly asks.

## Gotchas

- **Always rebuild after route changes**: The dev workflow runs `pnpm run build && pnpm run start`. If you change route files, restart the API Server workflow to rebuild; hot-reload is NOT available for the API.
- `pnpm --filter @workspace/api-server run test` — the test script is `vitest run` (not `vitest`).
- The seed runs on server startup only if the `users` table is empty. To re-seed, truncate all tables and restart.
- `localDateString()` uses the user's stored `timezone` field — always pass the user's timezone, not a hardcoded value.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Spec: `attached_assets/ghost-coach-build-spec-v0.1_1781189428624.md`
