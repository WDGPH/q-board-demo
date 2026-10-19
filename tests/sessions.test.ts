import { describe, expect, it } from "vitest";
import { defaultSession, sessionHasEnded } from "../src/lib/sessions";
import type { EventSession } from "../src/types";

const opening: EventSession = {
  id: "opening",
  title: "Opening",
  description: "",
  starts_at: "2026-11-20T09:00:00Z",
  ends_at: "2026-11-20T10:00:00Z",
};
const closing: EventSession = {
  id: "closing",
  title: "Closing",
  description: "",
  starts_at: "2026-11-20T11:00:00Z",
  ends_at: "2026-11-20T12:00:00Z",
};
const at = (time: string) => Date.parse(`2026-11-20T${time}:00Z`);

describe("session schedule", () => {
  it("selects the earliest upcoming session regardless of configured order", () => {
    expect(defaultSession([closing, opening], at("08:00"))).toBe(opening);
  });
  it("selects the current session including its exact start", () => {
    expect(defaultSession([opening, closing], at("11:00"))).toBe(closing);
  });
  it("moves to the next session at the end boundary and during a gap", () => {
    expect(defaultSession([opening, closing], at("10:00"))).toBe(closing);
    expect(defaultSession([opening, closing], at("10:30"))).toBe(closing);
  });
  it("selects the most recent session after the schedule ends", () => {
    expect(defaultSession([closing, opening], at("13:00"))).toBe(closing);
  });
  it("prefers the latest start when active sessions overlap", () => {
    const longOpening = { ...opening, ends_at: "2026-11-20T13:00:00Z" };
    expect(defaultSession([closing, longOpening], at("11:30"))).toBe(closing);
  });
  it("compares timezone offsets as instants and treats the end as exclusive", () => {
    const offsetSession = { ...opening, ends_at: "2026-11-20T05:00:00-05:00" };
    expect(sessionHasEnded(offsetSession, at("09:59"))).toBe(false);
    expect(sessionHasEnded(offsetSession, at("10:00"))).toBe(true);
  });
  it("does not guess an end time when none is supplied", () => {
    const noEnd = { ...opening, ends_at: null };
    expect(sessionHasEnded(noEnd, at("13:00"))).toBe(false);
    expect(defaultSession([noEnd, closing], at("11:30"))).toBe(closing);
  });
  it("handles empty and invalid schedules without crashing", () => {
    expect(defaultSession([])).toBeUndefined();
    const invalid = { ...opening, starts_at: "invalid", ends_at: "invalid" };
    expect(defaultSession([invalid])).toBe(invalid);
    expect(sessionHasEnded(invalid)).toBe(false);
  });
});
