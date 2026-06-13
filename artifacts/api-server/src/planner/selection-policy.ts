import type { Candidate, SelectedPlan } from "../domain/types";

const MIN_BACKUP_SEPARATION_MINUTES = 15;

function candidateStartMs(candidate: Candidate): number {
  return candidate.windowStart.getTime();
}

export function isSameExecution(a: Candidate, b: Candidate): boolean {
  return (
    a.activityTemplateId === b.activityTemplateId &&
    a.locationId === b.locationId &&
    a.windowStart.getTime() === b.windowStart.getTime() &&
    a.windowEnd.getTime() === b.windowEnd.getTime()
  );
}

export function isMateriallyDifferent(a: Candidate, b: Candidate): boolean {
  if (a.locationId !== b.locationId) return true;
  if (a.activityTemplateId !== b.activityTemplateId) return true;
  if (
    Math.abs(candidateStartMs(a) - candidateStartMs(b)) >=
    MIN_BACKUP_SEPARATION_MINUTES * 60_000
  ) {
    return true;
  }
  return Math.abs(a.durationMinutes - b.durationMinutes) >= 5;
}

export function rankPassingCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates]
    .filter((candidate) => candidate.isPassing)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationMinutes !== b.durationMinutes)
        return b.durationMinutes - a.durationMinutes;
      return a.windowStart.getTime() - b.windowStart.getTime();
    });
}

function chooseBackup(primary: Candidate, ranked: Candidate[]): Candidate {
  const fullLength = ranked.filter(
    (candidate) => candidate.role !== "minimum_win",
  );

  return (
    fullLength.find(
      (candidate) =>
        !isSameExecution(candidate, primary) &&
        Math.abs(candidateStartMs(candidate) - candidateStartMs(primary)) >=
          MIN_BACKUP_SEPARATION_MINUTES * 60_000,
    ) ??
    fullLength.find(
      (candidate) =>
        !isSameExecution(candidate, primary) &&
        isMateriallyDifferent(candidate, primary),
    ) ??
    ranked.find(
      (candidate) =>
        !isSameExecution(candidate, primary) &&
        isMateriallyDifferent(candidate, primary),
    ) ??
    primary
  );
}

function chooseMinimumWin(
  primary: Candidate,
  backup: Candidate,
  ranked: Candidate[],
): Candidate {
  const minimumWins = ranked.filter(
    (candidate) => candidate.role === "minimum_win",
  );

  return (
    minimumWins.find(
      (candidate) =>
        candidate.durationMinutes < primary.durationMinutes &&
        !isSameExecution(candidate, backup),
    ) ??
    minimumWins.find(
      (candidate) => candidate.durationMinutes <= primary.durationMinutes,
    ) ??
    ranked.find(
      (candidate) => candidate.durationMinutes < primary.durationMinutes,
    ) ??
    backup
  );
}

export function selectDeterministically(candidates: Candidate[]): SelectedPlan {
  const ranked = rankPassingCandidates(candidates);
  const standard = ranked.filter(
    (candidate) => candidate.role !== "minimum_win",
  );
  const primary = standard[0] ?? ranked[0];

  if (!primary) {
    throw new Error("No valid candidates available for planning");
  }

  const backup = chooseBackup(primary, ranked);
  const minimumWin = chooseMinimumWin(primary, backup, ranked);

  return {
    primaryCandidateId: primary.id,
    backupCandidateId: backup.id,
    minimumWinCandidateId: minimumWin.id,
    reasoningSummary: `Deterministic selection: ${primary.activityName} scored ${primary.score.toFixed(1)}/100 at ${primary.locationLabel}.`,
    caution: primary.score < 40 ? "low_confidence" : "none",
  };
}

export function diversifyForLLM(
  candidates: Candidate[],
  limit: number,
): Candidate[] {
  const ranked = rankPassingCandidates(candidates);
  const standard = ranked.filter(
    (candidate) => candidate.role !== "minimum_win",
  );
  const minimumWins = ranked.filter(
    (candidate) => candidate.role === "minimum_win",
  );
  const result: Candidate[] = [];

  const addUnique = (candidate: Candidate) => {
    if (!result.some((existing) => isSameExecution(existing, candidate))) {
      result.push(candidate);
    }
  };

  // Reserve part of the model context for genuinely shorter minimum-win options.
  // Without this, a long free window can fill the entire top-N list with full-length
  // variants at nearby start times, leaving the model no valid minimum win to select.
  const minimumWinSlots = Math.min(
    3,
    minimumWins.length,
    Math.max(1, limit - 2),
  );
  const standardSlots = Math.max(2, limit - minimumWinSlots);

  for (const candidate of standard) {
    addUnique(candidate);
    if (
      result.filter((item) => item.role !== "minimum_win").length >=
      standardSlots
    )
      break;
  }

  for (const candidate of minimumWins) {
    addUnique(candidate);
    if (
      result.filter((item) => item.role === "minimum_win").length >=
      minimumWinSlots
    )
      break;
  }

  for (const candidate of ranked) {
    if (result.length >= limit) break;
    addUnique(candidate);
  }

  return result.slice(0, limit);
}
