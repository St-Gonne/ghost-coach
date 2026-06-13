import type { LLMAdapter } from "../integrations/llm";
import type { Candidate, DailyContext, SelectedPlan } from "../domain/types";
import { validateLLMSelection } from "./validator";
import { deterministicSelect } from "./fallback-selector";
import { diversifyForLLM } from "./selection-policy";
import { logger } from "../lib/logger";

const TOP_N = 10;

export async function selectWithLLM(
  llm: LLMAdapter,
  candidates: Candidate[],
  context: DailyContext,
): Promise<{
  plan: SelectedPlan;
  mode: "llm_assisted" | "deterministic_fallback";
}> {
  const sorted = diversifyForLLM(candidates, TOP_N);

  try {
    const llmResult = await llm.selectPlan(sorted, context, TOP_N);
    const { valid, reasons } = validateLLMSelection(llmResult, sorted);

    if (!valid) {
      logger.warn(
        { reasons },
        "LLM selection invalid — falling back to deterministic",
      );
      return {
        plan: deterministicSelect(candidates),
        mode: "deterministic_fallback",
      };
    }

    return { plan: llmResult, mode: "llm_assisted" };
  } catch (err) {
    logger.warn(
      { err },
      "LLM selectPlan threw — falling back to deterministic",
    );
    return {
      plan: deterministicSelect(candidates),
      mode: "deterministic_fallback",
    };
  }
}
