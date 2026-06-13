import type { Candidate, DailyContext, SelectedPlan } from "../../domain/types";

export interface LLMAdapter {
  readonly connected: boolean;
  readonly mock: boolean;

  selectPlan(
    candidates: Candidate[],
    context: DailyContext,
    topN: number,
  ): Promise<SelectedPlan>;

  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}
