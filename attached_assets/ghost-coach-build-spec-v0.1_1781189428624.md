# Ghost Coach
## Build-Ready Product and Technical Specification
**Version:** 0.1 — Personal pre-MVP and V1  
**Owner/User:** Sharan  
**Primary objective:** Make movement and exercise consistent while reducing daily planning, research, and decision-making to under one minute.  
**Primary physical priorities:** Execute Sharan's existing physio-approved routines for anterior pelvic tilt and trapezius/neck discomfort; supplement these with walking, swimming, stretching, yoga, and occasional body-weight exercise.  
**Initial interface:** Telegram bot plus a small responsive web dashboard.  
**Initial calendar authority:** Read the relevant calendars and automatically create exercise blocks in genuine free time. Never move, edit, or delete ordinary meetings.  
**Target:** At least four active days per week.  
**Budget target:** No more than approximately USD 30/month for hosting and APIs.

---

# 1. Product definition

Ghost Coach is not a general chatbot and not a conventional workout app.

It is a controlled personal coaching system that:

1. Understands Sharan's schedule and available time.
2. Understands his current or expected location.
3. Checks weather and basic environmental constraints.
4. Selects a realistic activity from an approved library.
5. Places a specific block on his calendar.
6. Sends a short, actionable Telegram message.
7. Follows up if the message is ignored.
8. Records done, partial, skipped, or no-response outcomes.
9. Learns which times, durations, activities, and coaching intensity produce actual completion.
10. Preserves safety by using deterministic rules and only physio-approved corrective routines.

The product must optimize for **completion in real life**, not for theoretically ideal workouts.

---

# 2. Locked product decisions

## 2.1 User and scope

- Single user: Sharan.
- Personal and functional, not multi-tenant.
- No billing, teams, public onboarding, or app-store release in the pre-MVP.
- Architecture should avoid obvious dead ends, but speed and reliability matter more than commercial scalability.

## 2.2 Primary success measure

The system succeeds when:

- Sharan completes intentional movement or an approved exercise routine on at least **four days per week**.
- Normal daily planning/input takes **less than one minute**.
- The system chooses the activity, time, and fallback rather than asking Sharan to research or construct a plan.
- Over time, ignored plans decrease and completed plans increase.

Weight is tracked as optional context, not as the primary success metric.

## 2.3 Coaching authority

Ghost Coach may:

- Read selected Google Calendars.
- Find free windows.
- Create, move, or delete calendar events that Ghost Coach itself created.
- Suggest turning an eligible internal remote meeting into a walking call.
- Follow up after ignored nudges.
- Replace a skipped plan with a shorter or more convenient backup.

Ghost Coach may not:

- Move, cancel, edit, or delete meetings created by anyone else.
- Send messages to meeting attendees.
- change a meeting into a walking call without Sharan explicitly tapping an approval button.
- Diagnose a condition or generate a new rehabilitation protocol.
- Use heart-rate data to declare exercise medically safe or unsafe.

## 2.4 Interface

### Telegram is the daily interface

It handles:

- Morning plan.
- Reminders.
- Start prompts.
- Done/partial/skipped responses.
- Backup suggestions.
- Location sharing.
- Quick plan changes.
- Weekly summaries.

### Web dashboard is the configuration and review interface

It handles:

- Google Calendar connection.
- Selected calendars.
- Dedicated write calendar.
- Saved locations and facilities.
- Approved activity library.
- Physio routines and frequency.
- Coaching intensity slider.
- Quiet hours.
- Weekly history.
- Debug/plan preview.
- Integration health.

## 2.5 Coaching style

Default coaching intensity: **3 of 5 — Persistent**.

- It follows up when ignored.
- It gives one recommended action, not a menu of ten choices.
- It may offer at most two alternatives.
- It does not shame, moralize, or give a long motivational speech.
- It prefers securing a smaller completed session over losing the day to an ambitious plan.
- After two consistent weeks, it may gradually increase duration or challenge.

---

# 3. Scope by release

## 3.1 Pre-MVP: Daily planner that genuinely works

Build this first.

### Inputs

- Google Calendar events for today and tomorrow.
- Current/default saved location.
- Calendar event location when available.
- Hourly weather.
- User settings and approved activity library.
- Recent completion history.
- Manual Telegram responses.
- Optional manually entered weight.

### Outputs

- One morning plan.
- One primary movement block.
- One backup window.
- One small physio or mobility action when due.
- Automatic calendar block for the primary activity.
- Pre-activity reminder.
- Start prompt.
- One ignored-message follow-up.
- Completion check.
- Backup plan after a skip.
- Weekly summary.

### Pre-MVP exclusions

Do not delay the pre-MVP for:

- Samsung Watch integration.
- Health Connect.
- Continuous phone location.
- Food-photo analysis.
- WhatsApp.
- Email context.
- Calendar push notifications.
- Voice guidance.
- Maps/place search.
- Adaptive medical exercise generation.

The data model should leave room for these, but they are not on the pre-MVP critical path.

## 3.2 V1.1: Better opportunity detection

Add after the daily loop is stable:

- Re-check the calendar before a planned block.
- Re-plan when an event is cancelled or extended.
- Google Calendar change notifications or periodic targeted refresh.
- Event classification: internal, external, remote, in-person, high-stakes.
- Walking-call eligibility suggestions.
- Better travel-day handling.
- Air-quality input where useful.
- More precise saved-place context.

## 3.3 V1.2: Android companion and Samsung Watch data

Build a small native Android companion app.

It should:

- Request Health Connect permissions.
- Read steps, exercise sessions, heart rate, and weight.
- Sync compact daily summaries to the Ghost Coach server.
- Optionally obtain background location with explicit permission.
- Use Android WorkManager for periodic sync.
- Show connection state and last successful sync.
- Never send raw minute-by-minute heart-rate data unless specifically required.

Samsung Watch data reaches the phone through Samsung Health and can then be made available through Health Connect when the user enables the sync and permissions.

## 3.4 V1.3: Food photographs

Add only after the movement loop has demonstrated value.

- Telegram meal photo upload.
- Image analysis.
- Rough meal description and calorie range.
- No false precision.
- Optional link between meal timing and exercise suggestions.
- Food data must not crowd the daily movement experience.

---

# 4. Recommended architecture

## 4.1 Overview

```text
                         +----------------------+
                         |   Google Calendar    |
                         +----------+-----------+
                                    |
                                    v
+-----------+       HTTPS      +----+-----------------------+      HTTPS
| Telegram  | <--------------> | Replit Node/TypeScript App | <----------> Open-Meteo
| Bot       |    Webhook/API   |                            |
+-----------+                  | - REST API                 | <----------> Gemini API
                               | - Telegram handler         |
+-----------+       HTTPS      | - Planner engine           |
| Web/PWA   | <--------------> | - Calendar adapter         |
| Dashboard |                  | - Job processor            |
+-----------+                  | - Static web server        |
                               +------------+---------------+
                                            |
                                            v
                               +------------+---------------+
                               | Supabase PostgreSQL        |
                               | - App data                 |
                               | - Scheduled jobs           |
                               | - Cron tick                |
                               | - Audit logs               |
                               +----------------------------+

Later:
+-----------------------+
| Android companion     |
| Health Connect + GPS  |
+-----------+-----------+
            |
            +-------------------- HTTPS sync ---------------->
```

## 4.2 Why this shape

Use a **controlled workflow engine**, not a free-running autonomous agent.

- Deterministic code owns time arithmetic, calendar permissions, safety constraints, retries, and idempotency.
- A scoring engine generates realistic candidate plans.
- The language model chooses among valid candidates and writes concise explanations.
- A validator rejects any model output that invents a time, activity, location, or calendar action.
- If the model is unavailable, the highest-scoring deterministic candidate becomes the plan.

This keeps the agent useful without allowing hallucinated calendar actions.

## 4.3 Technology stack

### Application

- Node.js with TypeScript.
- Express for HTTP routes and webhook handling.
- React with Vite for the dashboard.
- PostgreSQL.
- Drizzle ORM and SQL migrations.
- Zod for runtime validation and LLM response schemas.
- Google APIs official Node client for Calendar.
- Google GenAI SDK for Gemini.
- Telegram Bot API through a thin adapter. A library such as grammY is acceptable, but keep Telegram-specific code behind an interface.
- Luxon or date-fns-tz for timezone-safe calculations.
- Pino for structured logs.

### Hosting

- Replit Autoscale Deployment for the HTTP app.
- Supabase free project for PostgreSQL and cron during the personal prototype.
- Supabase Cron calls `POST /internal/tick` once per minute.
- The Replit app processes only jobs that are due, then returns quickly.
- No always-running MacBook process is required.

### AI model

- Model name supplied through `LLM_MODEL`.
- Initial default: a low-cost Gemini Flash-Lite class model with structured JSON output.
- Use the model only for morning planning, re-planning, and optional weekly summaries.
- Do not call an LLM for ordinary reminders, button handling, database writes, or time calculations.

---

# 5. Repository structure

Use one repository. Avoid premature microservices.

```text
ghost-coach/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── .env.example
├── README.md
├── IMPLEMENTATION_PLAN.md
├── TEST_PLAN.md
├── DECISIONS.md
├── migrations/
├── src/
│   ├── server.ts
│   ├── config.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── repositories/
│   ├── domain/
│   │   ├── types.ts
│   │   ├── time.ts
│   │   ├── activities.ts
│   │   └── errors.ts
│   ├── integrations/
│   │   ├── calendar/
│   │   │   ├── calendar.interface.ts
│   │   │   ├── google-calendar.ts
│   │   │   └── mock-calendar.ts
│   │   ├── weather/
│   │   │   ├── weather.interface.ts
│   │   │   ├── open-meteo.ts
│   │   │   └── mock-weather.ts
│   │   ├── telegram/
│   │   │   ├── telegram.interface.ts
│   │   │   ├── telegram-bot.ts
│   │   │   ├── callbacks.ts
│   │   │   └── message-templates.ts
│   │   └── llm/
│   │       ├── llm.interface.ts
│   │       ├── gemini.ts
│   │       ├── mock-llm.ts
│   │       └── schemas.ts
│   ├── planner/
│   │   ├── gather-context.ts
│   │   ├── free-windows.ts
│   │   ├── candidate-generator.ts
│   │   ├── hard-constraints.ts
│   │   ├── scoring.ts
│   │   ├── llm-selector.ts
│   │   ├── validator.ts
│   │   ├── fallback-selector.ts
│   │   └── create-daily-plan.ts
│   ├── coaching/
│   │   ├── plan-state-machine.ts
│   │   ├── nudge-policy.ts
│   │   ├── completion.ts
│   │   ├── replan.ts
│   │   └── weekly-learning.ts
│   ├── jobs/
│   │   ├── processor.ts
│   │   ├── handlers/
│   │   └── scheduler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   ├── telegram.ts
│   │   ├── internal.ts
│   │   └── health.ts
│   ├── security/
│   │   ├── sessions.ts
│   │   ├── token-encryption.ts
│   │   ├── telegram-verification.ts
│   │   └── internal-auth.ts
│   └── web/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       ├── components/
│       └── pages/
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

# 6. Core data model

Use UUID primary keys and `timestamptz` for timestamps. Store all scheduled instants in UTC and retain the user's IANA timezone separately.

## 6.1 `users`

```text
id
email
display_name
timezone
telegram_user_id
telegram_chat_id
is_active
created_at
updated_at
```

Enforce one active user for the pre-MVP.

## 6.2 `user_settings`

```text
user_id
morning_brief_local_time          default 07:30
day_start_local_time              default 07:00
day_end_local_time                default 21:30
quiet_hours_start                 default 22:00
quiet_hours_end                   default 07:00
target_active_days_per_week       default 4
minimum_free_window_minutes       default 10
transition_buffer_minutes         default 10
coaching_intensity                integer 1..5, default 3
max_nudges_per_day                default derived from intensity
calendar_write_enabled            default true
default_location_id
weather_heat_threshold_c
weather_rain_probability_limit
weather_wind_limit_kph
prefer_completion_over_progression default true
weekly_review_day                 default Sunday
weekly_review_local_time          default 20:30
created_at
updated_at
```

Weather thresholds must be editable. They are preferences, not medical limits.

## 6.3 `calendar_connections`

```text
id
user_id
provider                         "google"
encrypted_access_token          nullable
encrypted_refresh_token
token_expiry
granted_scopes
provider_account_email
selected_read_calendar_ids      jsonb
write_calendar_id
status                          active|expired|revoked|error
last_success_at
last_error
created_at
updated_at
```

Tokens must be encrypted before storage.

## 6.4 `locations`

```text
id
user_id
label                           Home Goa, Mumbai hotel, office, airport
latitude
longitude
timezone
location_type                   home|office|hotel|airport|mall|outdoor|other
has_floor_space
has_pool
has_stairs
has_indoor_walk
has_shower
public_privacy_level            public|semi_private|private
typical_travel_overhead_minutes
is_default
last_confirmed_at
created_at
updated_at
```

## 6.5 `activity_templates`

These are allowed activities, not scheduled instances.

```text
id
user_id
name
category                        walk|swim|stretch|yoga|bodyweight|physio|stairs
goal_tags                       jsonb: movement, APT, neck_trap, cardio, recovery
minimum_minutes
preferred_minutes
maximum_minutes
intensity                       low|moderate|vigorous
requires_floor_space
requires_pool
requires_stairs
requires_shower
requires_equipment              jsonb
minimum_privacy                 public|semi_private|private
public_suitability              discreet|visible|private_only
weather_mode                    outdoor|indoor|either
allowed_location_types          jsonb
preference_score                0..100
active
is_physio_approved
instructions_markdown
version
created_at
updated_at
```

## 6.6 `routine_prescriptions`

This stores the actual physio-approved prescription.

```text
id
user_id
activity_template_id
source_label                    e.g. "Physio recommendation May 2026"
approved_or_prescribed_by       free text
target_frequency_per_week
minimum_gap_hours
valid_from
review_after
notes
active
created_at
updated_at
```

Do not activate a corrective routine until Sharan marks it approved/prescribed.

## 6.7 `calendar_event_cache`

```text
id
user_id
provider_event_id
calendar_id
start_at
end_at
title_redacted
location_text
is_all_day
is_cancelled
is_remote
is_internal
is_high_stakes
walking_call_eligible
classification_source          rules|manual|llm
event_hash
raw_minimal_json               jsonb
last_synced_at
```

Store only the fields required for planning.

## 6.8 `daily_contexts`

```text
id
user_id
local_date
timezone
location_id
calendar_snapshot_hash
weather_snapshot               jsonb
recent_activity_summary        jsonb
context_quality                complete|partial|stale
generated_at
```

## 6.9 `daily_plans`

```text
id
user_id
local_date
version
status                          draft|active|completed|abandoned|superseded
daily_context_id
planner_mode                    llm|deterministic_fallback|manual
reasoning_summary
primary_plan_item_id
backup_plan_item_id
minimum_win_plan_item_id
created_at
updated_at
```

## 6.10 `plan_items`

```text
id
daily_plan_id
activity_template_id
role                            primary|backup|minimum_win|physio
scheduled_start_at
scheduled_end_at
location_id
location_label_snapshot
candidate_score
selection_reason
state                           proposed|calendar_blocked|reminded|started|done|partial|skipped|expired
calendar_event_id
calendar_event_hash
created_at
updated_at
```

## 6.11 `activity_logs`

```text
id
user_id
plan_item_id                    nullable for unplanned activity
activity_template_id
started_at
ended_at
actual_minutes
outcome                         done|partial|skipped|no_response
skip_reason                     busy|pain|low_energy|weather|forgot|did_not_want|other
pain_before_optional            0..10
pain_after_optional             0..10
source                          telegram|web|health_connect|system
notes_optional
created_at
```

Do not ask pain ratings after every activity. Make them optional and use them only for physio routines or when Sharan reports pain.

## 6.12 `scheduled_jobs`

```text
id
user_id
job_type
due_at
payload                         jsonb
status                          pending|running|succeeded|failed|cancelled
dedupe_key                      unique
attempt_count
max_attempts
locked_at
last_error
created_at
updated_at
completed_at
```

## 6.13 `nudge_events`

```text
id
user_id
plan_item_id
nudge_type                      morning|pre_reminder|start|followup|completion|backup|evening
telegram_message_id
sent_at
responded_at
response_action
created_at
```

## 6.14 Future placeholder tables

Create migrations only when the feature is built:

- `health_daily_summaries`
- `health_sync_runs`
- `weight_logs`
- `meal_logs`
- `meal_images`

Do not build unused complexity into the pre-MVP.

---

# 7. Calendar integration

## 7.1 Authentication

Use Google OAuth 2.0 for the pre-MVP.

Request only:

- OpenID/email identity.
- Calendar event read/write access.
- Calendar list read access.

Restrict application access to the configured `ALLOWED_EMAIL`.

Store refresh tokens encrypted with AES-256-GCM using an environment secret. Never expose tokens to the browser or logs.

A service-account/shared-calendar setup may be offered as a fallback, but OAuth is the normal path because it can read Sharan's selected calendars directly.

## 7.2 Read behavior

At morning planning time:

1. Fetch events from the start of the local day through the end of the following local day.
2. Expand recurring events into instances.
3. Exclude cancelled events.
4. Treat all-day events as context, not automatically as blocking, unless marked busy.
5. Respect event transparency/free-busy state.
6. Include buffers around in-person events.
7. Keep titles out of the LLM unless needed; use redacted classifications where possible.

## 7.3 Write behavior

Use a dedicated secondary calendar named `Ghost Coach`.

- Read free/busy from selected calendars.
- Write only to the dedicated calendar.
- Set Ghost Coach blocks to private.
- Add no attendees.
- Add no conference link.
- Do not send invitations.
- Include a private extended property such as `ghostCoachPlanItemId`.
- The application may edit/delete only events containing its own valid private marker.
- Before writing, verify no conflict has appeared.
- If conflict appears, re-run selection or use the backup.

Suggested event format:

```text
Title: Ghost Coach — 25-minute walk
Start/end: selected slot
Description:
Goal: movement consistency
Minimum win: 15 minutes
Telegram is the control interface.
```

## 7.4 Walking-call logic

A meeting may be suggested as a walking call only when all are true:

- It is remote.
- No physical location is required.
- It is not classified high-stakes.
- It is likely internal or explicitly marked eligible by Sharan.
- It does not contain presentation/demo/interview/investor/client/board indicators.
- Sharan can safely participate using audio.

The bot asks:

```text
Your 4:00 pm internal call looks walkable.
[Make this the plan] [No] [Always allow this series]
```

Tapping approval creates a separate Ghost Coach walking block or marks the plan; it does not edit the original meeting.

---

# 8. Location and environment model

## 8.1 Pre-MVP location sources, in priority order

1. Explicit Telegram location share, valid for a configurable duration.
2. Explicit location selected in the web dashboard or Telegram.
3. Calendar event location for the relevant period.
4. Saved default location.
5. Unknown.

Never claim continuous location awareness in the Telegram-only pre-MVP.

If location is unknown and weather matters, send a single action:

```text
Where are you planning from today?
[Home Goa] [Mumbai] [Share current location]
```

## 8.2 Telegram location

Use a reply keyboard button with location request enabled. Save the received latitude/longitude only after the user sends it. Allow:

- Use once.
- Save as a named place.
- Set expiry, such as four hours or end of day.

## 8.3 Activity-place compatibility

Examples:

- Outdoor walking: outdoor/either, weather-compatible.
- Indoor walking: requires `has_indoor_walk` or location type mall/airport.
- Swimming: requires pool, sufficient window, and shower/change overhead.
- Floor physio: requires floor space and adequate privacy.
- Discreet neck/trap routine: may be allowed in a public or semi-private setting.
- Yoga: usually private or semi-private, floor space, longer window.
- Stairs: requires stairs and appropriate footwear/context.
- Body-weight: use only when the selected template's requirements are met.

---

# 9. Weather integration

Use hourly forecast data for the active location.

Minimum fields:

- Temperature.
- Apparent temperature.
- Precipitation probability.
- Precipitation amount.
- Weather code.
- Wind speed.
- Daylight/sunrise/sunset.

Optional later:

- Air quality.
- UV.
- Marine conditions for beach/swim context.

Cache weather by rounded coordinates and forecast hour. Do not call the API separately for every candidate.

Weather logic must produce one of:

```text
OUTDOOR_GOOD
OUTDOOR_POSSIBLE
INDOOR_PREFERRED
OUTDOOR_BLOCKED
UNKNOWN
```

The thresholds are user settings. The system should explain the result briefly, for example:

```text
Indoor preferred after 1 pm because it will feel hot.
```

Do not turn preference thresholds into medical claims.

---

# 10. Activity library

Seed these non-medical templates:

| Activity | Typical durations | Constraints |
|---|---:|---|
| Outdoor walk | 10, 20, 30, 45 min | Weather and route |
| Walking call | Meeting duration | Eligible remote meeting |
| Indoor walk | 10, 20, 30 min | Mall, airport, large building |
| Swim | 25, 40, 60 min | Pool plus change/shower time |
| Stairs | 5, 10 min | Stairs available |
| Stretch break | 3, 5, 8 min | Template-specific privacy |
| Yoga | 10, 20, 30 min | Floor space/privacy |
| Body-weight | 8, 15, 25 min | Approved exercises/space |
| Recovery movement | 5, 10, 20 min | Low intensity |

Physio activities are entered separately from Sharan's actual recommendation.

For each physio routine, onboarding must capture:

- Exact exercise names.
- Repetitions or time.
- Sequence.
- Frequency prescribed.
- Minimum gap.
- Any stop/avoid instruction.
- Whether it is safe in public.
- Required floor, wall, band, or other equipment.
- Optional photo/video reference supplied by Sharan or the physio.
- Review date.

The planner may choose when to deploy this routine. It may not alter the exercise prescription.

---

# 11. Planning engine

## 11.1 Daily planning pipeline

```text
1. Load settings and approved activities.
2. Resolve timezone and location.
3. Fetch calendar events.
4. Build free windows with buffers.
5. Fetch hourly weather.
6. Load previous 14–28 days of completion history.
7. Determine which prescribed routines are due.
8. Generate valid activity-window-location candidates.
9. Apply hard constraints.
10. Score candidates.
11. Give only the top valid candidates to the LLM.
12. Ask the LLM for a structured selection.
13. Validate the selection against the candidate IDs.
14. If invalid or unavailable, use deterministic fallback.
15. Write the primary calendar block.
16. Store primary, backup, and minimum-win items.
17. Schedule all notification jobs.
18. Send morning brief.
```

## 11.2 Free-window generation

Configurable defaults:

- Planning horizon: today.
- Day boundaries: user settings.
- Transition buffer: 10 minutes.
- In-person event buffer: location-dependent.
- Minimum candidate window: 10 minutes.
- Do not use meal windows if explicitly configured.
- Do not schedule during quiet hours.
- Do not create back-to-back blocks without transition time.
- Re-check calendar immediately before writing.

For every free window, derive usable duration after:

- Preparation.
- Travel to/from activity.
- Change/shower.
- Transition to next event.

## 11.3 Hard constraints

Reject a candidate when:

- It overlaps a busy event or buffer.
- It is shorter than the activity minimum.
- It cannot fit preparation/travel/change overhead.
- Location facilities do not satisfy requirements.
- Privacy is insufficient.
- Outdoor weather status is blocked.
- The routine is not marked physio-approved.
- Minimum gap since the same prescription is not met.
- It violates quiet hours.
- It would exceed a user-defined maximum session duration.
- A calendar event changed after the candidate was generated.
- A reported pain or safety state blocks the activity under an explicit approved rule.

The LLM may not override a hard constraint.

## 11.4 Candidate scoring

Score every valid candidate from 0 to 100.

Suggested initial weights:

```text
Estimated completion probability       35
Goal alignment                         25
Calendar convenience                   15
Environment/location fit               10
Stated activity preference             10
Progression value                       5
```

Apply penalties:

```text
Extra travel/setup friction          -0 to -25
Late-day historical skip tendency    -0 to -20
Repeated same activity boredom       -0 to -10
Uncertain location/context           -0 to -15
Overly ambitious duration            -0 to -20
```

### Completion probability

Initially use heuristics.

After at least 14 days, estimate completion likelihood by:

- Day of week.
- Start-hour bucket.
- Activity category.
- Planned duration bucket.
- Location.
- Whether it was a walking call.
- Nudge intensity.
- Previous-day completion or skip.

Use simple counts with smoothing. Do not add a machine-learning platform.

## 11.5 Completion-first progression policy

Weeks 1–2:

- Prefer high-likelihood completion.
- Shorten rather than lose the day.
- Do not raise targets after a single good day.

After two weeks:

- Increase one dimension at a time.
- Add 5 minutes or one session, not both.
- Back off after repeated skips.
- Protect the four-day consistency target.

## 11.6 LLM responsibility

The LLM receives:

- Today's sanitized schedule summary.
- Weather summary.
- Current location capabilities.
- Weekly targets and remaining requirements.
- Recent completion pattern.
- Up to ten valid candidate objects with IDs and scores.
- Due approved physio routines.
- Coaching tone rules.

The LLM returns only:

- Primary candidate ID.
- Backup candidate ID.
- Minimum-win candidate ID.
- Short explanation.
- Short morning message.
- Optional caution flag from a predefined enum.

It may not:

- Invent a candidate.
- Change times.
- Add exercises.
- create calendar actions.
- diagnose.
- decide permissions.
- directly call tools.

## 11.7 Structured output schema

```json
{
  "primaryCandidateId": "uuid",
  "backupCandidateId": "uuid",
  "minimumWinCandidateId": "uuid",
  "reasoningSummary": "string, max 300 characters",
  "morningMessage": "string, max 700 characters",
  "caution": "NONE | LOCATION_UNCERTAIN | WEATHER_UNCERTAIN | ROUTINE_DUE"
}
```

Validate every ID against the supplied candidate set.

## 11.8 Planner system prompt

Use this as the starting prompt:

```text
You are the planning component of Ghost Coach, a personal movement coach for one user.

Your goal is not to design an ideal fitness program. Your goal is to select the plan the user is most likely to complete in their actual day while progressing approved goals.

You are given a finite list of valid candidate objects. Every candidate has already passed calendar, location, weather, privacy, duration, and safety constraints.

Rules:
1. Select only candidate IDs present in the input.
2. Never invent an activity, exercise, location, time, or duration.
3. Prefer completion over ambition, especially during the first two weeks.
4. Prioritize due physio-approved routines for anterior pelvic tilt and neck/trapezius goals, but never alter their contents.
5. Keep the morning message short, direct, and action-oriented.
6. State the primary action, exact time, and fallback.
7. Do not shame, moralize, diagnose, or provide medical reassurance.
8. Return JSON matching the provided schema and nothing else.
```

---

# 12. Plan state machine

Every plan item follows explicit states.

```text
PROPOSED
  -> CALENDAR_BLOCKED
  -> PRE_REMINDER_SENT
  -> START_PROMPT_SENT
  -> STARTED
  -> DONE | PARTIAL | SKIPPED | EXPIRED
```

Alternative paths:

```text
CALENDAR_BLOCKED -> CONFLICT_DETECTED -> REPLANNED
IGNORED -> FOLLOWUP_SENT -> STARTED | SKIPPED | EXPIRED
SKIPPED -> BACKUP_PROPOSED -> CALENDAR_BLOCKED
```

State changes must be transactional and idempotent.

---

# 13. Notification and nudge policy

## 13.1 Morning message

Example:

```text
Today’s plan

4:30–4:55 pm — 25-minute walk.
I blocked it on your calendar.

6:10 pm — 7-minute approved neck/trap routine.
Backup walk: 7:15 pm.

Weather gets uncomfortable earlier, so the main walk is later.

[Keep plan] [Move it] [Swap activity] [Pause today]
```

Do not show unnecessary data.

## 13.2 Pre-reminder

Ten minutes before:

```text
Walk in 10 minutes. Shoes and water now.

[Ready] [Shift 15m] [Indoor option] [Skip]
```

## 13.3 Start prompt

```text
Start the 25-minute walk now.

[Started] [Give me the minimum] [Skip]
```

## 13.4 Ignored follow-up

Default intensity 3:

- One follow-up 10 minutes after the start prompt.
- If still ignored, do not repeatedly ping immediately.
- Re-plan to the backup window.
- Respect daily nudge cap and quiet hours.

Example:

```text
You missed the start. A 15-minute version still fits now.

[Start 15m] [Use backup] [Skip today]
```

## 13.5 Completion check

At planned end plus a small grace period:

```text
How did it go?

[Done] [Partly] [Skipped]
```

If skipped, offer reason buttons, but do not require typing:

```text
What got in the way?

[Busy] [Pain] [Low energy] [Weather] [Forgot] [Didn't feel like it]
```

## 13.6 Evening rescue

Only at intensity 4 or 5 by default, or when explicitly enabled at level 3.

```text
No active session landed today. Your minimum win is the approved 7-minute routine at home.

[Start] [Not today]
```

## 13.7 Intrusiveness slider

| Level | Behavior |
|---|---|
| 1 — Gentle | Morning brief and one pre-reminder |
| 2 — Light | Adds completion check |
| 3 — Persistent | Adds start prompt, one follow-up, and backup |
| 4 — Firm | Adds second follow-up and evening rescue |
| 5 — Maximum | Up to four daily nudges, asks skip reason, still respects quiet hours and hard cap |

The cap protects against notification fatigue.

---

# 14. Telegram design

## 14.1 Commands

```text
/start        Link and onboard
/today        Show today's current plan
/replan       Re-run plan using current calendar/context
/done         Mark current item done
/location     Select or share location
/routine      Show today's approved routine
/pause        Pause nudges for a chosen duration
/settings     Open dashboard link
/help         Show minimal help
```

Buttons should be the primary interaction; commands are fallback.

## 14.2 Callback design

Keep callback payloads short:

```text
p:<shortPlanId>:keep
i:<shortItemId>:start
i:<shortItemId>:done
i:<shortItemId>:partial
i:<shortItemId>:skip
i:<shortItemId>:shift15
i:<shortItemId>:minimum
```

Map short IDs to database IDs server-side.

## 14.3 Telegram security

- Accept messages only from the configured Telegram user ID after pairing.
- Pair with a one-time code shown in the authenticated dashboard.
- Verify Telegram webhook secret header.
- Use a high-entropy webhook path.
- Never include tokens in URLs shown to the user.
- Ignore group messages.
- Log rejected sender IDs without message content.

## 14.4 Photo handling placeholder

The pre-MVP can acknowledge photos with:

```text
Meal-photo analysis is not active yet.
```

Do not silently pretend to analyze them.

---

# 15. Web dashboard

Keep it mobile-friendly and simple.

## 15.1 Today

Show:

- Active plan.
- Primary/backup/minimum win.
- Calendar block state.
- Buttons: done, partial, skip, re-plan.
- Current location and weather summary.
- Integration warnings.

## 15.2 Week

Show:

- Active days completed out of four.
- Physio sessions completed against prescribed frequency.
- Planned versus completed minutes.
- Completion rate.
- Simple seven-day timeline.
- No complicated fitness score.

## 15.3 Routines

- Activity library.
- Add/edit/disable template.
- Physio routine editor.
- Version history.
- Mark approved.
- Frequency and gap.
- Public/private suitability.
- Equipment and location requirements.

## 15.4 Locations

- Saved locations.
- Lat/longitude or map pin.
- Facility checkboxes.
- Default location.
- Current temporary location.
- Last confirmed time.

## 15.5 Calendar

- Connect/reconnect Google.
- Select read calendars.
- Select the dedicated Ghost Coach write calendar.
- Test read.
- Test write and delete a test event.
- Show last successful sync.

## 15.6 Coaching

- Intrusiveness slider.
- Morning time.
- Quiet hours.
- Four-day target.
- Preferred activities.
- Weather preferences.
- Maximum daily nudges.
- Completion-first toggle.

## 15.7 Debug

For the personal prototype only:

- Preview plan for a date without sending.
- See generated candidates and rejection reasons.
- See selected candidate scores.
- Run mock morning brief.
- View failed jobs.
- Retry a job.
- Check API usage counters.

The debug page is essential for tuning trust.

---

# 16. HTTP endpoints

## Public/system

```text
GET  /health
POST /telegram/webhook/:unguessablePath
GET  /auth/google
GET  /auth/google/callback
POST /internal/tick
```

## Authenticated dashboard API

```text
GET  /api/me
GET  /api/today
POST /api/today/replan
POST /api/plan-items/:id/action
GET  /api/week
GET  /api/settings
PUT  /api/settings
GET  /api/activities
POST /api/activities
PUT  /api/activities/:id
DELETE /api/activities/:id
GET  /api/routines
POST /api/routines
PUT  /api/routines/:id
GET  /api/locations
POST /api/locations
PUT  /api/locations/:id
POST /api/locations/current
GET  /api/calendar/status
POST /api/calendar/test-read
POST /api/calendar/test-write
GET  /api/integrations/status
GET  /api/debug/plan-preview
POST /api/debug/send-morning-brief
GET  /api/debug/jobs
POST /api/debug/jobs/:id/retry
```

Use CSRF protection for state-changing dashboard requests.

---

# 17. Job system

## 17.1 Cron design

Supabase Cron invokes:

```text
POST /internal/tick
Authorization: HMAC or bearer secret
```

Run every minute.

The endpoint:

1. Verifies the internal secret.
2. Claims a small batch of due jobs using row locks.
3. Sets `status=running`.
4. Executes each handler.
5. Marks success or failure.
6. Retries transient failures with backoff.
7. Returns within a short timeout.

## 17.2 Job types

```text
CREATE_MORNING_PLAN
SEND_MORNING_BRIEF
SEND_PRE_REMINDER
SEND_START_PROMPT
SEND_IGNORED_FOLLOWUP
SEND_COMPLETION_CHECK
CREATE_BACKUP_PLAN
SEND_EVENING_RESCUE
CREATE_WEEKLY_REVIEW
REFRESH_CALENDAR_CONTEXT
CHECK_INTEGRATIONS
```

## 17.3 Idempotency

Every job has a deterministic dedupe key.

Examples:

```text
morning-plan:<userId>:<localDate>
pre-reminder:<planItemId>
start:<planItemId>
completion:<planItemId>
```

Telegram send operations and calendar writes must check whether the corresponding message/event already exists before creating another.

## 17.4 Failure behavior

- Weather fails: use cached weather; otherwise plan indoor/either activity and state uncertainty.
- LLM fails: deterministic top candidate.
- Calendar read fails: do not automatically create a block; notify Sharan and offer manual plan.
- Calendar write fails: send plan without claiming it is blocked.
- Telegram fails: keep plan and retry transiently.
- Database fails: return error; do not create external side effects.
- Duplicate cron calls: no duplicate messages/events.

---

# 18. Safety boundaries

Ghost Coach is a general wellness and adherence tool.

## Required behavior

- Use only routines explicitly marked approved/prescribed.
- Preserve the exact routine instructions.
- Allow Sharan to stop or skip at any time.
- If Sharan reports acute or unusual symptoms, respond with a neutral stop message and suggest appropriate professional care rather than coaching through it.
- Treat heart rate as trend/context, not diagnosis.
- Do not create a heart-rate target or vigorous progression without an explicitly entered approved rule.
- Keep a visible disclaimer in onboarding and settings.
- Never interpret weight or food photographs as a diagnosis.

## Routine stop rules

Each approved routine may contain user/physio-supplied stop rules. The system may enforce those rules but must not invent new clinical rules.

---

# 19. Security and privacy

Even though privacy is not a launch blocker, implement basic hygiene.

- All secrets in Replit Secrets/environment variables.
- No API keys in frontend bundles.
- Encrypt Google refresh tokens before database storage.
- TLS only.
- Secure, HTTP-only, SameSite cookies.
- Restrict login to `ALLOWED_EMAIL`.
- Pair only one Telegram user.
- Row-level access checks in every repository method.
- Supabase Row Level Security where the browser accesses Supabase directly; preferably keep browser access behind the server.
- Rate-limit auth and webhook routes.
- Verify webhook and cron secrets.
- Redact tokens, calendar descriptions, and Telegram message contents from logs.
- Store only minimal calendar fields.
- Provide a dashboard action to disconnect Google and delete tokens.
- Back up configuration exports but not secrets.

---

# 20. Environment variables

Create `.env.example`:

```bash
NODE_ENV=development
PORT=3000
APP_BASE_URL=https://your-replit-deployment.example

DATABASE_URL=
SESSION_SECRET=
TOKEN_ENCRYPTION_KEY_BASE64=
INTERNAL_CRON_SECRET=
ALLOWED_EMAIL=

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_PATH=
TELEGRAM_ALLOWED_USER_ID=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

GEMINI_API_KEY=
LLM_MODEL=gemini-3.1-flash-lite

OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
MOCK_INTEGRATIONS=true
LOG_LEVEL=info
```

`TOKEN_ENCRYPTION_KEY_BASE64` must decode to 32 random bytes.

---

# 21. Mock mode

The app must work before external integrations are configured.

With `MOCK_INTEGRATIONS=true`:

- Seed a realistic sample day.
- Seed Goa weather scenarios.
- Seed Home, Coffee Shop, Airport, and Hotel locations.
- Do not seed medical exercise instructions.
- Seed generic walking/swimming/yoga activity templates.
- Allow a draft routine placeholder that is inactive until marked approved.
- Render the dashboard.
- Generate a plan preview.
- Simulate Telegram messages in a web panel.
- Simulate done, skipped, and ignored flows.

Do not leave mock behavior enabled in production without a visible banner.

---

# 22. Testing

## 22.1 Unit tests

Test:

- Free-window calculations.
- Timezone conversion.
- Event buffers.
- Weather classification.
- Activity/location compatibility.
- Hard-constraint rejection.
- Candidate scoring.
- LLM schema validation.
- Deterministic fallback.
- Nudge caps.
- Plan state transitions.
- Dedupe keys.
- Token encryption round trip.

## 22.2 Integration tests

Use mocked external APIs to test:

- Morning job creates one plan.
- One calendar event is written.
- One Telegram brief is sent.
- Duplicate tick sends nothing extra.
- Calendar conflict causes re-plan.
- Skip creates backup.
- LLM invalid ID falls back safely.
- Weather failure selects indoor activity.
- Calendar failure does not claim a block was created.
- Unauthorized Telegram user is ignored.
- Unauthorized cron request is rejected.
- OAuth token refresh updates encrypted storage.

## 22.3 End-to-end acceptance scenarios

### Scenario A: Normal Goa day

- Two free windows.
- Outdoor weather good.
- A physio routine is due.
- Result: one walk block, one short routine, backup included.

### Scenario B: Hot/rainy day

- Outdoor conditions poor.
- Home has floor space.
- Result: indoor approved routine or indoor walk, no outdoor recommendation.

### Scenario C: Airport day

- Location is airport.
- Two-hour wait.
- Result: indoor terminal walk, no floor routine.

### Scenario D: Coffee shop

- Public location, 15-minute gap.
- Result: only discreet activity; no floor stretching.

### Scenario E: Packed calendar

- No 20-minute free window.
- Result: minimum-win routine and one walking-call suggestion if eligible.

### Scenario F: Ignore twice

- Morning accepted, start prompt ignored.
- Result: one follow-up, then backup later; no notification storm.

### Scenario G: Calendar changes

- A meeting is added over the planned block.
- Result: Ghost Coach removes/moves only its own block and re-plans.

### Scenario H: External API outage

- LLM unavailable.
- Result: deterministic plan still works.

### Scenario I: Four-day target met

- Result: recovery or optional activity; do not push unnecessary volume.

---

# 23. Analytics and learning

Track product behavior, not vanity metrics.

## Core metrics

```text
Active days per week
Plan completion rate
Primary-plan completion rate
Backup salvage rate
Average planned versus actual minutes
Physio adherence against prescription
Response time to nudge
Ignored-message rate
Completion by time bucket
Completion by activity
Completion by location
Completion by planned duration
Calendar conflicts after planning
Daily user input count and estimated input time
```

## Learning rules

After 14 days:

- Increase preference for contexts with higher completion.
- Reduce duration in contexts repeatedly skipped.
- Promote backup windows that often salvage the day.
- Avoid times with repeated no-response.
- Do not reduce prescribed routine frequency without explicit user approval.
- Do not infer a medical contraindication from ordinary skips.

A simple weekly aggregation is enough. No vector database is needed.

---

# 24. Budget guardrails

Expected personal-prototype structure:

- Replit Core/hosting is the largest fixed cost.
- Autoscale deployment should remain low usage for a single user.
- Supabase free tier should be sufficient for the prototype.
- Telegram Bot API has no normal per-message cost for this use.
- Open-Meteo's non-commercial prototype access is free within fair-use limits.
- Low-cost Gemini calls should be well under a few dollars per month at one or two planning calls per day.

Implement:

- `llm_usage` table or counters.
- Maximum LLM calls per day, default 5.
- Maximum input size.
- No LLM call for reminders.
- Dashboard monthly cost estimate.
- Fail closed when a configurable API budget threshold is exceeded.

Target runtime/API spend excluding the Replit subscription: under USD 5/month.

---

# 25. Deployment setup checklist

## Telegram

1. Create a bot with BotFather.
2. Save bot token in Replit Secrets.
3. Deploy the app.
4. Register HTTPS webhook URL.
5. Include a secret token.
6. Pair Sharan's Telegram ID using the one-time dashboard code.
7. Test inline buttons and location request.

## Supabase

1. Create project.
2. Copy pooled PostgreSQL connection string.
3. Run migrations.
4. Enable Cron.
5. Add a one-minute job calling `/internal/tick`.
6. Store the endpoint secret securely.
7. Confirm the tick does not create duplicate work.

## Google Cloud

1. Create a project.
2. Enable Google Calendar API.
3. Configure OAuth consent.
4. Create web OAuth credentials.
5. Add exact Replit callback URL.
6. Add Sharan's account as the allowed user/test user as needed.
7. Connect from dashboard.
8. Select read calendars.
9. Create/select a dedicated Ghost Coach calendar.
10. Run read and write/delete tests.

## Gemini

1. Create API key.
2. Save in Replit Secrets.
3. Set model via environment variable.
4. Test structured output.
5. Test deterministic fallback by disabling the key.

## Replit

1. Create Node.js/TypeScript project.
2. Add environment secrets.
3. Configure build command.
4. Configure run command.
5. Publish as Autoscale Deployment.
6. Confirm HTTPS base URL.
7. Run health check.
8. Set webhook.
9. Execute end-to-end test.

---

# 26. Build sequence for an AI coding tool

Do not ask the coding agent to build the whole product in one uncontrolled pass.

## Phase 1 — Foundation and mock demo

Deliver:

- TypeScript server and React dashboard.
- PostgreSQL schema and migrations.
- Mock integrations.
- Settings, activity library, locations.
- Candidate generator and deterministic planner.
- Today and debug pages.
- Tests.

Acceptance:

- A sample day produces a valid primary, backup, and minimum-win plan.
- Re-running is idempotent.
- Invalid candidates are visibly rejected with reasons.

## Phase 2 — Real Calendar and Weather

Deliver:

- Google OAuth.
- Calendar selection.
- Dedicated write calendar.
- Open-Meteo.
- Real free-window planner.
- Test-read and test-write actions.

Acceptance:

- Real events are read.
- A conflict-free Ghost Coach block is created.
- The app never edits a non-Ghost-Coach event.

## Phase 3 — Telegram and job loop

Deliver:

- Telegram webhook.
- Pairing.
- Morning brief.
- Buttons.
- Cron tick and scheduled jobs.
- Full done/partial/skipped/ignored loop.

Acceptance:

- One complete day can run without opening the dashboard.
- Duplicate ticks create no duplicates.

## Phase 4 — LLM selection and language

Deliver:

- Gemini structured output.
- Candidate-only selection.
- Validator.
- Deterministic fallback.
- Usage tracking.

Acceptance:

- Hallucinated IDs are rejected.
- App works with Gemini disabled.

## Phase 5 — Learning and hardening

Deliver:

- Weekly metrics.
- Basic completion-probability adjustment.
- Intrusiveness slider.
- Integration status.
- Error/retry UI.
- Security review.
- Full acceptance test suite.

## Phase 6 — Android companion

Separate repository/module only after pre-MVP proof.

---

# 27. Definition of done for pre-MVP

The pre-MVP is done only when all are true:

- [ ] Sharan can connect Google Calendar.
- [ ] Selected calendars are read correctly.
- [ ] A dedicated Ghost Coach calendar is used for writes.
- [ ] The dashboard stores locations and activity constraints.
- [ ] Sharan can enter and approve his actual physio routines.
- [ ] The planner produces primary, backup, and minimum win.
- [ ] A calendar block is automatically created.
- [ ] Telegram sends the morning brief.
- [ ] Pre-reminder, start, follow-up, and completion messages work.
- [ ] Done, partial, skipped, and no response are recorded.
- [ ] A skip can create a backup.
- [ ] The four-day weekly target is visible.
- [ ] Daily user input can normally remain below one minute.
- [ ] Duplicate jobs do not duplicate messages/events.
- [ ] LLM failure has a deterministic fallback.
- [ ] Calendar failure never creates a false claim.
- [ ] The app runs while the MacBook is off.
- [ ] Runtime/API spend is within the target.
- [ ] Tests and setup instructions are included.

---

# 28. Master prompt for Replit Agent or another coding agent

Copy the following prompt into the coding tool. Attach this specification file as the source of truth.

```text
Build the personal application described in the attached “Ghost Coach Build-Ready Product and Technical Specification v0.1”.

Treat the specification as binding. Do not redesign the product into a generic fitness chatbot. The key product is a controlled daily planning and adherence loop for one user.

Important implementation rules:

1. Use Node.js, TypeScript, Express, React/Vite, PostgreSQL, Drizzle ORM, Zod, and structured logs.
2. Keep the project as one repository and one deployable HTTP application.
3. Create integration interfaces and real/mock adapters for Google Calendar, Open-Meteo, Telegram, and Gemini.
4. Build mock mode first. The app must be demonstrable without any API secrets.
5. Deterministic code must own calendar arithmetic, constraints, scoring, permissions, state transitions, retries, and idempotency.
6. The LLM may select only from prevalidated candidate IDs and return schema-valid JSON. It must never directly execute tools.
7. The application may write only to a dedicated Ghost Coach calendar and may edit/delete only events it created.
8. Do not invent physiotherapy instructions. Create an editor so the user can enter and approve the exact routine provided by their physio.
9. Build a database-backed scheduled-job system. A protected `/internal/tick` endpoint will be called every minute.
10. Every external side effect must be idempotent.
11. Build the pre-MVP phases in order. Do not jump to Health Connect, food photos, WhatsApp, voice, or continuous location.
12. Never place secrets in code or frontend bundles.
13. Restrict the app to one configured Google email and one paired Telegram user.
14. Include migrations, seed data, unit tests, integration tests, `.env.example`, README, setup checklist, and troubleshooting.
15. Add a debug page that shows candidate generation, rejection reasons, scores, selected plan, jobs, and integration health.
16. Keep the user-facing interface short and action-oriented.

Before coding:
- Read the entire specification.
- Create `IMPLEMENTATION_PLAN.md`, `DECISIONS.md`, and `TEST_PLAN.md`.
- List the exact milestones and files.
- Identify external secrets/setup steps, but do not block mock-mode work on them.
- Then implement Phase 1 only.

At the end of each phase:
- Run type checking, linting, unit tests, and integration tests.
- Show what works.
- List any deviation from the specification.
- Do not start the next phase until the current phase’s acceptance criteria pass.

Start now with Phase 1: foundation and mock demo.
```

---

# 29. Follow-on prompts for the coding agent

## Prompt after Phase 1 passes

```text
Proceed with Phase 2 from the Ghost Coach specification: real Google Calendar and Open-Meteo integration.

Preserve all mock adapters and tests.

Implement Google OAuth, encrypted refresh-token storage, calendar selection, and dedicated Ghost Coach write-calendar behavior. Read selected calendars, expand recurring events, respect busy/free state, and use timezone-safe free-window calculations.

Implement Open-Meteo hourly weather retrieval and caching.

Add dashboard integration-status, test-read, test-write, and safe delete of the test event.

The application must never modify an event it did not create. Add integration tests proving this.

Run the complete test suite and stop after Phase 2 acceptance criteria pass.
```

## Prompt after Phase 2 passes

```text
Proceed with Phase 3: Telegram and the database-backed job loop.

Implement secure bot pairing, webhook verification, inline buttons, location request, morning brief, pre-reminder, start prompt, one ignored follow-up, completion check, skip reason, backup planning, pause, today, and replan.

Implement `/internal/tick`, due-job claiming, retries, dedupe keys, and idempotent Telegram/calendar side effects.

Add simulated Telegram handling in mock mode and integration tests for duplicate cron ticks.

Run the complete test suite and stop after one full day can operate through Telegram without opening the dashboard.
```

## Prompt after Phase 3 passes

```text
Proceed with Phase 4: Gemini structured selection and concise message generation.

The deterministic engine must first generate and validate candidates. Send only valid candidates to the model. Require schema-valid JSON containing existing candidate IDs. Validate the output. If the API fails, times out, violates schema, or returns an unknown ID, use deterministic fallback.

Add daily call limits and usage counters. Do not use the model for routine reminders or button actions.

Add tests for invalid IDs, malformed JSON, timeout, and disabled API key.

Run the full test suite and stop after Phase 4 acceptance criteria pass.
```

## Prompt after Phase 4 passes

```text
Proceed with Phase 5: learning, coaching slider, weekly review, reliability, and security hardening.

Add the four-day weekly dashboard, physio adherence, completion patterns by time/activity/location/duration, simple smoothed completion-probability adjustments after 14 days, and coaching levels 1–5.

Add job/integration error visibility, retry controls, token redaction, route rate limits, CSRF protection, session hardening, and final end-to-end acceptance scenarios.

Do not add Android, Health Connect, food photos, WhatsApp, or continuous location yet.

Run all tests, produce a deployment checklist, and report the exact pre-MVP definition-of-done status.
```

---

# 30. Later Android companion specification

Do not give this to the coding agent until the web/Telegram pre-MVP works.

Recommended Android stack:

- Kotlin.
- Jetpack Compose.
- Health Connect SDK.
- WorkManager.
- Encrypted local preferences.
- HTTPS API with device-specific token.

Read permissions:

- Steps.
- Exercise sessions.
- Heart rate.
- Weight.
- Background read, if available and explicitly granted.
- Historical read only if needed.

Sync payload should be summarized:

```json
{
  "date": "YYYY-MM-DD",
  "timezone": "Asia/Kolkata",
  "steps": 7342,
  "exerciseMinutes": 24,
  "exerciseSessions": [
    {
      "type": "walking",
      "startAt": "ISO timestamp",
      "endAt": "ISO timestamp"
    }
  ],
  "heartRateSummary": {
    "restingOptional": 72,
    "dailyAverageOptional": 88
  },
  "weightKgOptional": 82.4,
  "sourceUpdatedAt": "ISO timestamp"
}
```

Do not upload raw continuous heart-rate records by default.

---

# 31. Product principles to preserve

1. **One decision, not many:** Give one recommended action and at most two alternatives.
2. **Real context beats ideal plans:** A 15-minute airport walk that happens is better than a 45-minute workout that does not.
3. **The system carries the cognitive load:** The user should not calculate windows, weather, routines, or progress.
4. **Calendar access creates responsibility:** Never touch non-Ghost-Coach events.
5. **AI proposes inside a cage:** Valid candidate IDs only.
6. **Consistency before progression:** Secure four days per week first.
7. **Approved corrective routines remain unchanged:** The agent schedules them; it does not practise physiotherapy.
8. **No false certainty:** Missing location, stale calendar, or failed weather must be disclosed.
9. **No notification avalanche:** Persistent does not mean unlimited.
10. **Build the loop before the integrations:** Calendar → plan → block → nudge → completion → learning is the product.
