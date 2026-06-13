import type { LLMAdapter } from "./index";
import type { Candidate, DailyContext, SelectedPlan } from "../../domain/types";
import { logger } from "../../lib/logger";
import { selectDeterministically } from "../../planner/selection-policy";

export class MockLLMAdapter implements LLMAdapter {
  readonly connected = false;
  readonly mock = true;

  private shouldFail = false;
  private returnInvalidId = false;

  setFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  setReturnInvalidId(invalid: boolean): void {
    this.returnInvalidId = invalid;
  }

  async selectPlan(
    candidates: Candidate[],
    context: DailyContext,
    topN: number,
  ): Promise<SelectedPlan> {
    if (this.shouldFail) {
      throw new Error("[MockLLM] Simulated LLM failure");
    }

    const deterministic = selectDeterministically(candidates);
    const primary = candidates.find(
      (candidate) => candidate.id === deterministic.primaryCandidateId,
    );
    const backup = candidates.find(
      (candidate) => candidate.id === deterministic.backupCandidateId,
    );
    const minimumWin = candidates.find(
      (candidate) => candidate.id === deterministic.minimumWinCandidateId,
    );

    if (!primary) {
      throw new Error("[MockLLM] No valid primary candidate");
    }

    logger.info(
      {
        primaryId: primary.id,
        backupId: backup?.id,
        minimumWinId: minimumWin?.id,
      },
      "[MockLLM] selectPlan",
    );

    const primaryCandidateId = this.returnInvalidId
      ? "invalid-uuid-xxxx"
      : primary.id;

    return {
      primaryCandidateId,
      backupCandidateId: backup?.id ?? primary.id,
      minimumWinCandidateId: minimumWin?.id ?? primary.id,
      reasoningSummary: `Mock LLM selected ${primary.activityName} as the best option based on timing and location constraints.`,
      caution: primary.score < 50 ? "low_confidence" : "none",
    };
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (this.shouldFail) {
      return { ok: false, error: "Simulated LLM failure" };
    }
    return { ok: true };
  }
}
