import { describe, it, expect } from "vitest";
import { validateLLMSelection } from "../../src/planner/validator";
import type { Candidate, SelectedPlan } from "../../src/domain/types";

function makeCandidate(
  id: string,
  overrides: Partial<Candidate> = {},
): Candidate {
  const start = new Date("2026-06-12T01:30:00.000Z");
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id,
    activityTemplateId: "a1",
    activityName: "Walk",
    role: "primary",
    windowStart: start,
    windowEnd: end,
    durationMinutes: 30,
    locationId: "l1",
    locationLabel: "Home",
    score: 75,
    scoreBreakdown: {},
    rejectionReasons: [],
    isPassing: true,
    ...overrides,
  };
}

const VALID_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
];

const candidates = [
  makeCandidate(VALID_IDS[0]!),
  makeCandidate(VALID_IDS[1]!, {
    windowStart: new Date("2026-06-12T02:00:00.000Z"),
    windowEnd: new Date("2026-06-12T02:30:00.000Z"),
  }),
  makeCandidate(VALID_IDS[2]!, {
    role: "minimum_win",
    durationMinutes: 15,
    windowEnd: new Date("2026-06-12T01:45:00.000Z"),
  }),
];

describe("validateLLMSelection", () => {
  it("valid selection with all known IDs passes", () => {
    const plan: SelectedPlan = {
      primaryCandidateId: VALID_IDS[0]!,
      backupCandidateId: VALID_IDS[1]!,
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "Good choice",
      caution: "none",
    };
    const { valid, reasons } = validateLLMSelection(plan, candidates);
    expect(valid).toBe(true);
    expect(reasons).toHaveLength(0);
  });

  it("invented primary ID fails validation", () => {
    const plan: SelectedPlan = {
      primaryCandidateId: "invented-uuid-xxxx-not-real",
      backupCandidateId: VALID_IDS[1]!,
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "Bad",
      caution: "none",
    };
    const { valid, reasons } = validateLLMSelection(plan, candidates);
    expect(valid).toBe(false);
    expect(reasons.some((r) => r.includes("primaryCandidateId"))).toBe(true);
  });

  it("non-UUID primary ID fails validation", () => {
    const plan: SelectedPlan = {
      primaryCandidateId: "not-a-uuid",
      backupCandidateId: VALID_IDS[1]!,
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "Bad",
      caution: "none",
    };
    const { valid, reasons } = validateLLMSelection(plan, candidates);
    expect(valid).toBe(false);
  });

  it("identical primary and backup execution fails validation", () => {
    const duplicateBackup = makeCandidate(VALID_IDS[1]!);
    const plan: SelectedPlan = {
      primaryCandidateId: VALID_IDS[0]!,
      backupCandidateId: VALID_IDS[1]!,
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "Bad duplicate",
      caution: "none",
    };
    const { valid, reasons } = validateLLMSelection(plan, [
      candidates[0]!,
      duplicateBackup,
      candidates[2]!,
    ]);
    expect(valid).toBe(false);
    expect(reasons.some((reason) => /materially different/i.test(reason))).toBe(
      true,
    );
  });

  it("invalid caution value fails validation", () => {
    const plan: SelectedPlan = {
      primaryCandidateId: VALID_IDS[0]!,
      backupCandidateId: VALID_IDS[1]!,
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "OK",
      caution: "very_bad_invalid_value",
    };
    const { valid, reasons } = validateLLMSelection(plan, candidates);
    expect(valid).toBe(false);
    expect(reasons.some((r) => r.includes("caution"))).toBe(true);
  });

  it("known backup ID not in candidates fails", () => {
    const plan: SelectedPlan = {
      primaryCandidateId: VALID_IDS[0]!,
      backupCandidateId: "44444444-4444-4444-4444-444444444444",
      minimumWinCandidateId: VALID_IDS[2]!,
      reasoningSummary: "OK",
      caution: "none",
    };
    const { valid, reasons } = validateLLMSelection(plan, candidates);
    expect(valid).toBe(false);
  });
});
