# Ghost Coach — Test Plan

## Unit Tests

### `tests/unit/time.test.ts`
- UTC → local date conversion for Asia/Kolkata and America/New_York
- Local time string ("07:30") → UTC instant for a given date and timezone
- Day boundary calculation respects timezone
- Quiet-hours check: inside quiet hours returns true, outside returns false

### `tests/unit/free-windows.test.ts`
- Empty calendar → one large window covering the day boundary
- Back-to-back events leave no window
- Single event splits the day into two windows
- Transition buffer is subtracted correctly from each window edge
- All-day event is treated as context, not blocking
- Window shorter than minimum is excluded
- In-person event gets larger buffer than remote event
- Quiet hours boundary cuts the last window

### `tests/unit/hard-constraints.test.ts`
- Outdoor activity rejected when weather = OUTDOOR_BLOCKED
- Outdoor activity passes when weather = OUTDOOR_GOOD
- Pool activity rejected at location without `has_pool`
- Floor physio rejected at airport (no `has_floor_space`)
- Short window rejected for activity requiring more minutes
- Unapproved physio routine rejected
- Minimum gap since last prescription not met → rejected
- Quiet hours overlap → rejected
- Public location with private-only activity → rejected
- Candidate in conflict with existing event → rejected

### `tests/unit/scoring.test.ts`
- Due physio routine scores higher than optional walk
- Morning slot with history of completion scores higher than late-night slot
- Boredom penalty applied when same activity was last three days
- Travel friction penalty applied for hotel with overhead
- Overly ambitious duration (>45 min) gets penalty
- Perfect scenario scores ≥ 80
- Worst scenario scores ≤ 30

### `tests/unit/plan-state-machine.test.ts`
- PROPOSED → CALENDAR_BLOCKED: valid
- CALENDAR_BLOCKED → PRE_REMINDER_SENT: valid
- PRE_REMINDER_SENT → START_PROMPT_SENT: valid
- START_PROMPT_SENT → STARTED: valid
- STARTED → DONE: valid
- STARTED → PARTIAL: valid
- START_PROMPT_SENT → SKIPPED: valid
- SKIPPED → BACKUP_PROPOSED: valid
- DONE → CALENDAR_BLOCKED: invalid (transition rejected with error)
- State change is idempotent when re-applying same transition

### `tests/unit/validator.test.ts`
- LLM response with all valid candidate IDs → passes
- LLM response with invented primary ID → falls back to deterministic
- LLM response with invented backup ID → backup set to deterministic runner-up
- LLM response with non-UUID string → falls back
- LLM response missing required field → falls back
- LLM response with caution = invalid enum → falls back

### `tests/unit/nudge-policy.test.ts`
- Intensity 1: only morning + one pre-reminder allowed
- Intensity 3: morning + pre-reminder + start + one follow-up
- Intensity 5: up to four nudges
- Daily cap prevents sixth nudge at any intensity
- Quiet hours blocks nudge at 11 pm

## Integration Tests

### `tests/integration/morning-plan.test.ts`
- Normal Goa day: two free windows, outdoor good, physio due → walk + routine + backup
- Hot/rainy day: OUTDOOR_BLOCKED → indoor activity or routine only
- Airport location: `has_floor_space=false` → no floor routine
- Coffee shop: public privacy → discreet activity only
- Packed calendar (no 20-min window) → minimum-win + note
- Re-running same date returns same plan (idempotent, version incremented)

### `tests/integration/job-deduplication.test.ts`
- Duplicate tick with same dedupe key → second job is no-op
- Two ticks for different dedupe keys → both execute

### `tests/integration/llm-fallback.test.ts`
- Mock LLM returns invalid ID → deterministic top candidate used
- Mock LLM unavailable (throws) → deterministic top candidate used
- Mock LLM returns all valid IDs → LLM selection used

## Acceptance Scenarios (manual verification via Debug page)

| Scenario | Expected Result |
|---|---|
| A: Normal Goa day | Walk block + short routine + backup |
| B: Hot/rainy | Indoor routine, no outdoor recommendation |
| C: Airport | Indoor walk, no floor routine |
| D: Coffee shop | Discreet activity only |
| E: Packed calendar | Minimum-win + walking-call suggestion |
| F: Ignore twice | One follow-up, then backup; no storm |
| G: Calendar change | Ghost Coach block only replaced |
| H: LLM outage | Deterministic plan still works |
| I: 4-day target met | Recovery/optional; no forced volume |

## Running Tests

```bash
pnpm --filter @workspace/api-server run test
```

Or with watch:
```bash
pnpm --filter @workspace/api-server run test:watch
```
