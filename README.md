# Ghost Coach

**Where this fits (note added July 2026):** this is a paused prototype from mid-June 2026, and its the oldest thing in my portfolio... built before [meeting-intelligence-system](https://github.com/sharantulsiani-ui/meeting-intelligence-system) and [ai-chief-of-staff](https://github.com/sharantulsiani-ui/ai-chief-of-staff). I don't write code; the AI wrote the implementation from a written spec, and the method that runs my current systems is already visible here a month earlier: a decisions log (DECISIONS.md), a test plan, a phase audit, an independent review, and mock-first gating so nothing needed real credentials to be judged. It's runnable in mock mode if you want to poke at it. Paused, not dead — the plan is for its ideas to fold into the chief of staff's health loop eventually. If you learn from it or build on it, credit is the ask (see [LICENSE.md](LICENSE.md)).

Ghost Coach is a personal movement-planning prototype. Phase 1 provides a
deterministic planning engine, mock integrations, an Express API, and a React
dashboard for reviewing and acting on a daily plan.

The planner evaluates calendar availability, location capabilities, weather,
activity requirements, physio approval, and recent completion history. It
produces a primary plan, a materially different backup, and a shorter
minimum-win option. The dashboard includes Today, Week, Activities, Routines,
Locations, Settings, and Debug pages.

## Phase 1 Mock Mode

Set `MOCK_INTEGRATIONS=true` to use deterministic mock adapters for:

- Calendar availability
- Weather
- Telegram delivery
- LLM-assisted candidate selection

Mock mode supports local planning, candidate rejection inspection, plan actions
(`Done`, `Partial`, and `Skip`), and scenario previews. Physio instructions are
not seeded, and an unapproved physio routine is never scheduled.

Real Google Calendar, Telegram, Health Connect, and live weather integrations
are not active in Phase 1.

## Technology Stack

- Node.js 24.16.0
- pnpm 10.34.3 workspaces
- TypeScript 5.9
- Express 5
- PostgreSQL with Drizzle ORM and Drizzle Kit
- React 19, Vite 7, Tailwind CSS, and shadcn/ui
- TanStack Query and wouter
- Zod and an OpenAPI-generated client
- Vitest
- esbuild

## Prerequisites

- Node.js `24.16.0` (also recorded in `.node-version`)
- pnpm `10.34.3`
- A reachable PostgreSQL database

The required package-manager versions are also pinned in the root
`package.json`.

## Install Dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env
```

Update `DATABASE_URL` for your PostgreSQL instance. Phase 1 local development
requires `MOCK_INTEGRATIONS=true`.

The application does not load `.env` automatically. Export it into each shell
before running database or API commands:

```bash
set -a
source .env
set +a
```

Do not commit `.env` or any file containing credentials.

## Database Setup

After loading `.env`, apply the schema:

```bash
pnpm --filter @workspace/db run push
```

This repository uses Drizzle `push` for Phase 1 development schema changes.
`push-force` exists but is intentionally not part of the normal setup because
it can apply destructive changes.

## Seed Data

There is no standalone seed script. The API calls `seedIfEmpty()` when it
starts. It inserts the Phase 1 user, settings, locations, activity templates,
and inactive unapproved physio placeholder only when the seed user is absent.

Run the API development command after applying the schema to trigger seeding:

```bash
pnpm --filter @workspace/api-server run dev
```

## Local Development

Load `.env` in both terminals.

Terminal 1, API server on `PORT` (the example uses port 8080):

```bash
pnpm --filter @workspace/api-server run dev
```

Terminal 2, React dashboard (defaults to port 3000):

```bash
pnpm --filter @workspace/ghost-coach-web run dev
```

The Vite development server proxies `/api` to `API_PROXY_TARGET`, which defaults
to `http://127.0.0.1:8080`.

The API `dev` script rebuilds before starting; it does not provide API
hot-reload.

## Verification Commands

Type checking:

```bash
pnpm typecheck
```

Linting:

```bash
pnpm lint
```

Complete API test suite:

```bash
pnpm --filter @workspace/api-server run test
```

Production build:

```bash
pnpm build
```

The root build runs type checking and then builds every workspace package that
defines a build script.

## Project Structure

```text
artifacts/api-server/       Express API, planner, mock adapters, seed, tests
artifacts/ghost-coach-web/  React/Vite dashboard
artifacts/mockup-sandbox/   Standalone UI mockup workspace
lib/api-spec/               OpenAPI source contract and codegen config
lib/api-client-react/       Generated React Query client and fetch wrapper
lib/api-zod/                Generated API validation schemas
lib/db/                     Drizzle database client and 13-table schema
scripts/                    Workspace utility scripts
attached_assets/            Product specification supplied with the project
```

Architecture decisions and test coverage are documented in `DECISIONS.md`,
`IMPLEMENTATION_PLAN.md`, `TEST_PLAN.md`, and
`PHASE1_INDEPENDENT_REVIEW.md`.

## Known Phase 1 Limitations

- Authentication is only a Phase 1 local prototype boundary; real calendar
  data must not be connected before Phase 2 authentication and authorization.
- Google OAuth and Google Calendar read/write are not implemented.
- Telegram delivery and scheduled background nudges are not live.
- Health Connect is not implemented.
- Weather is simulated in mock mode; live weather is not active.
- The LLM adapter is mocked and may only select from deterministic,
  prevalidated candidate IDs.
- Concurrent identical replan requests do not have a database advisory lock.
- PostgreSQL must be provided separately.
- Seed data intentionally contains no medical exercise instructions.
- The frontend production bundle currently emits a non-failing large-chunk
  warning.

Phase 2 integrations are intentionally out of scope for this baseline.
