import type { PlanItemState } from "../domain/types";

type TransitionMap = Partial<Record<PlanItemState, PlanItemState[]>>;

const TRANSITIONS: TransitionMap = {
  // Dashboard and Telegram completion checks may arrive without an explicit
  // "started" tap. Allow truthful after-the-fact reporting from any active state.
  proposed: ["calendar_blocked", "done", "partial", "skipped"],
  calendar_blocked: ["pre_reminder_sent", "done", "partial", "skipped"],
  pre_reminder_sent: ["start_prompt_sent", "done", "partial", "skipped"],
  start_prompt_sent: [
    "started",
    "done",
    "partial",
    "skipped",
    "backup_proposed",
  ],
  started: ["done", "partial"],
  skipped: ["backup_proposed"],
  backup_proposed: ["backup_done", "backup_partial", "backup_skipped"],
  backup_skipped: ["minimum_win_done", "rest_day"],
  backup_partial: [],
  backup_done: [],
  done: [],
  partial: [],
  minimum_win_done: [],
  rest_day: [],
};

export function canTransition(from: PlanItemState, to: PlanItemState): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function transition(
  from: PlanItemState,
  to: PlanItemState,
): PlanItemState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalState(state: PlanItemState): boolean {
  const terminal: PlanItemState[] = [
    "done",
    "partial",
    "minimum_win_done",
    "rest_day",
    "backup_done",
    "backup_partial",
    "backup_skipped",
  ];
  return terminal.includes(state);
}

export function actionToTransition(
  currentState: PlanItemState,
  action: string,
): PlanItemState | null {
  const map: Record<string, PlanItemState> = {
    start: "started",
    done: "done",
    partial: "partial",
    skip: "skipped",
    calendar_blocked: "calendar_blocked",
    pre_reminder: "pre_reminder_sent",
    start_prompt: "start_prompt_sent",
    backup_proposed: "backup_proposed",
    backup_done: "backup_done",
    backup_partial: "backup_partial",
    backup_skipped: "backup_skipped",
    minimum_win_done: "minimum_win_done",
    rest_day: "rest_day",
  };

  const target = map[action];
  if (!target) return null;
  if (!canTransition(currentState, target)) return null;
  return target;
}
