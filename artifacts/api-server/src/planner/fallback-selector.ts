import type { Candidate, SelectedPlan } from "../domain/types";
import { selectDeterministically } from "./selection-policy";

export function deterministicSelect(candidates: Candidate[]): SelectedPlan {
  return selectDeterministically(candidates);
}
