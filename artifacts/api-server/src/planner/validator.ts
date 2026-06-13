import type { Candidate, SelectedPlan } from "../domain/types";
import { isSameExecution } from "./selection-policy";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

export function validateLLMSelection(
  llmOutput: SelectedPlan,
  candidates: Candidate[],
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const candidateIds = new Set(candidates.map((c) => c.id));

  if (!isValidUuid(llmOutput.primaryCandidateId)) {
    reasons.push(
      `primaryCandidateId is not a valid UUID: ${llmOutput.primaryCandidateId}`,
    );
  } else if (!candidateIds.has(llmOutput.primaryCandidateId)) {
    reasons.push(
      `primaryCandidateId not found in candidates: ${llmOutput.primaryCandidateId}`,
    );
  }

  if (!isValidUuid(llmOutput.backupCandidateId)) {
    reasons.push(
      `backupCandidateId is not a valid UUID: ${llmOutput.backupCandidateId}`,
    );
  } else if (!candidateIds.has(llmOutput.backupCandidateId)) {
    reasons.push(
      `backupCandidateId not found in candidates: ${llmOutput.backupCandidateId}`,
    );
  }

  if (!isValidUuid(llmOutput.minimumWinCandidateId)) {
    reasons.push(
      `minimumWinCandidateId is not a valid UUID: ${llmOutput.minimumWinCandidateId}`,
    );
  } else if (!candidateIds.has(llmOutput.minimumWinCandidateId)) {
    reasons.push(
      `minimumWinCandidateId not found in candidates: ${llmOutput.minimumWinCandidateId}`,
    );
  }

  const primary = candidates.find(
    (candidate) => candidate.id === llmOutput.primaryCandidateId,
  );
  const backup = candidates.find(
    (candidate) => candidate.id === llmOutput.backupCandidateId,
  );
  const minimumWin = candidates.find(
    (candidate) => candidate.id === llmOutput.minimumWinCandidateId,
  );

  if (primary?.role === "minimum_win") {
    reasons.push("primaryCandidateId must be a full-length candidate");
  }

  if (backup?.role === "minimum_win") {
    reasons.push("backupCandidateId must be a full-length candidate");
  }

  if (primary && backup && isSameExecution(primary, backup)) {
    reasons.push(
      "backupCandidateId must represent a materially different execution from primary",
    );
  }

  if (minimumWin && minimumWin.role !== "minimum_win") {
    reasons.push(
      "minimumWinCandidateId must reference a minimum-win candidate",
    );
  }

  if (
    primary &&
    minimumWin &&
    minimumWin.durationMinutes > primary.durationMinutes
  ) {
    reasons.push(
      "minimumWinCandidateId cannot be longer than the primary candidate",
    );
  }

  const validCautions = [
    "none",
    "low_confidence",
    "physio_caution",
    "weather_caution",
    "time_pressure",
  ];
  if (!validCautions.includes(llmOutput.caution)) {
    reasons.push(`caution value is not valid: ${llmOutput.caution}`);
  }

  return { valid: reasons.length === 0, reasons };
}
