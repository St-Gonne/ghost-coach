import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  isTerminalState,
  actionToTransition,
} from "../../src/coaching/plan-state-machine";
import type { PlanItemState } from "../../src/domain/types";

describe("plan-state-machine", () => {
  it("proposed → calendar_blocked is valid", () => {
    expect(canTransition("proposed", "calendar_blocked")).toBe(true);
  });

  it("proposed → done is valid for after-the-fact dashboard reporting", () => {
    expect(canTransition("proposed", "done")).toBe(true);
  });

  it("proposed → partial is valid for after-the-fact dashboard reporting", () => {
    expect(canTransition("proposed", "partial")).toBe(true);
  });

  it("calendar_blocked → pre_reminder_sent is valid", () => {
    expect(canTransition("calendar_blocked", "pre_reminder_sent")).toBe(true);
  });

  it("pre_reminder_sent → start_prompt_sent is valid", () => {
    expect(canTransition("pre_reminder_sent", "start_prompt_sent")).toBe(true);
  });

  it("start_prompt_sent → started is valid", () => {
    expect(canTransition("start_prompt_sent", "started")).toBe(true);
  });

  it("started → done is valid", () => {
    expect(canTransition("started", "done")).toBe(true);
  });

  it("started → partial is valid", () => {
    expect(canTransition("started", "partial")).toBe(true);
  });

  it("start_prompt_sent → skipped is valid", () => {
    expect(canTransition("start_prompt_sent", "skipped")).toBe(true);
  });

  it("skipped → backup_proposed is valid", () => {
    expect(canTransition("skipped", "backup_proposed")).toBe(true);
  });

  it("done → calendar_blocked is NOT valid (terminal state)", () => {
    expect(canTransition("done", "calendar_blocked")).toBe(false);
  });

  it("transition throws on invalid transition", () => {
    expect(() => transition("done", "calendar_blocked")).toThrow();
  });

  it("transition returns new state on valid transition", () => {
    expect(transition("proposed", "calendar_blocked")).toBe("calendar_blocked");
  });

  it("done is terminal", () => {
    expect(isTerminalState("done")).toBe(true);
  });

  it("partial is terminal", () => {
    expect(isTerminalState("partial")).toBe(true);
  });

  it("proposed is NOT terminal", () => {
    expect(isTerminalState("proposed")).toBe(false);
  });

  it("actionToTransition maps 'done' action from started state", () => {
    expect(actionToTransition("started", "done")).toBe("done");
  });

  it("actionToTransition maps done directly from proposed", () => {
    expect(actionToTransition("proposed", "done")).toBe("done");
  });

  it("actionToTransition returns null for an unknown action", () => {
    expect(actionToTransition("proposed", "teleport")).toBeNull();
  });
});
