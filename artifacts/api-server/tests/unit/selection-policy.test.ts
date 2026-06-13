import { describe, expect, it } from "vitest";
import {
  isSameExecution,
  selectDeterministically,
} from "../../src/planner/selection-policy";
import type { Candidate } from "../../src/domain/types";

function candidate(
  id: string,
  startIso: string,
  durationMinutes: number,
  role: Candidate["role"],
  score: number,
): Candidate {
  const start = new Date(startIso);
  return {
    id,
    activityTemplateId: "walk",
    activityName: "Walk",
    role,
    windowStart: start,
    windowEnd: new Date(start.getTime() + durationMinutes * 60_000),
    durationMinutes,
    locationId: "home",
    locationLabel: "Home",
    score,
    scoreBreakdown: {},
    rejectionReasons: [],
    isPassing: true,
  };
}

describe("selection policy", () => {
  it("selects a backup that is not the same execution as primary", () => {
    const candidates = [
      candidate("p", "2026-06-12T01:30:00.000Z", 30, "primary", 80),
      candidate("b", "2026-06-12T02:00:00.000Z", 30, "primary", 79),
      candidate("m", "2026-06-12T01:30:00.000Z", 15, "minimum_win", 70),
    ];

    const plan = selectDeterministically(candidates);
    const primary = candidates.find(
      (item) => item.id === plan.primaryCandidateId,
    )!;
    const backup = candidates.find(
      (item) => item.id === plan.backupCandidateId,
    )!;

    expect(isSameExecution(primary, backup)).toBe(false);
    expect(backup.windowStart.getTime()).not.toBe(
      primary.windowStart.getTime(),
    );
  });

  it("selects an explicitly shorter minimum-win candidate", () => {
    const candidates = [
      candidate("p", "2026-06-12T01:30:00.000Z", 30, "primary", 80),
      candidate("b", "2026-06-12T02:00:00.000Z", 30, "primary", 79),
      candidate("m", "2026-06-12T01:30:00.000Z", 15, "minimum_win", 70),
    ];

    const plan = selectDeterministically(candidates);
    const minimum = candidates.find(
      (item) => item.id === plan.minimumWinCandidateId,
    )!;

    expect(minimum.role).toBe("minimum_win");
    expect(minimum.durationMinutes).toBe(15);
  });
});
