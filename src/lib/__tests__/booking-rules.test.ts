import test from "node:test";
import assert from "node:assert/strict";
import { formatWeeklyHours, normalizeSchedule, parseOpeningHours, weekdayOf } from "../opening-hours";
import { availableWindows, closuresForPrompt, freeSlots, isOutsideHours, nextOpenDay, slotProblem, timeOffLabel, validateTimeOff, type TimeOff } from "../time-off";

const hours = parseOpeningHours("Available every day except Tuesdays, from 9:00 to 18:00.");
const now = { date: "2026-11-09", time: "08:00" };
const off = (o: Partial<TimeOff>): TimeOff => ({ id: "x", start_date: "2026-12-02", end_date: "2026-12-04", start_time: null, end_time: null, reason: null, ...o });
const check = (date: string, time: string, durationMinutes = 30, timeOff: TimeOff[] = [], at = now) => slotProblem({ date, time, durationMinutes, now: at, hours, timeOff });

test("the real saved hours close Tuesdays", () => {
  assert.equal(weekdayOf("2026-11-10"), 2);
  assert.deepEqual(hours?.[2], []);
  assert.deepEqual(hours?.[3], [{ open: 540, close: 1080 }]);
});

test("closed day is refused: the Tuesday 10 Nov booking", () => assert.equal(check("2026-11-10", "09:00"), "closed"));
test("before opening is refused", () => assert.equal(check("2026-11-11", "08:59"), "outside_hours"));
test("exactly at opening is allowed", () => assert.equal(check("2026-11-11", "09:00"), null));
test("after closing is refused", () => assert.equal(check("2026-11-11", "18:00"), "outside_hours"));
test("last slot must fit the service", () => {
  assert.equal(check("2026-11-11", "17:30", 30), null);
  assert.equal(check("2026-11-11", "17:30", 60), "outside_hours");
  assert.equal(check("2026-11-11", "17:00", 60), null);
});
test("a booking that would cross midnight is refused", () => {
  const late = parseOpeningHours("Daily 10:00 to 23:30");
  assert.equal(slotProblem({ date: "2026-11-11", time: "23:15", durationMinutes: 60, now, hours: late, timeOff: [] }), "outside_hours");
});

test("Asia/Qatar midnight: 00:10 on Tuesday wall clock is already Tuesday", () => {
  // 2026-11-09T21:10Z is 00:10 on Tue 10 Nov in Doha.
  const justAfter = { date: "2026-11-10", time: "00:10" };
  assert.equal(slotProblem({ date: "2026-11-10", time: "09:00", durationMinutes: 30, now: justAfter, hours, timeOff: [] }), "closed");
  assert.equal(slotProblem({ date: "2026-11-09", time: "17:00", durationMinutes: 30, now: justAfter, hours, timeOff: [] }), "past");
});
test("Asia/Qatar midnight: 23:50 Monday can still book Wednesday, not earlier today", () => {
  const justBefore = { date: "2026-11-09", time: "23:50" };
  assert.equal(slotProblem({ date: "2026-11-11", time: "09:00", durationMinutes: 30, now: justBefore, hours, timeOff: [] }), null);
  assert.equal(slotProblem({ date: "2026-11-09", time: "23:00", durationMinutes: 30, now: justBefore, hours, timeOff: [] }), "past");
});
test("weekday never depends on the machine timezone", () => {
  for (const tz of ["UTC", "Asia/Qatar", "Pacific/Auckland", "America/Los_Angeles"]) {
    process.env.TZ = tz;
    assert.equal(weekdayOf("2026-11-10"), 2, tz);
  }
  process.env.TZ = "UTC";
});

test("full-day time off is refused and removes the day", () => {
  const list = [off({})];
  assert.equal(check("2026-12-03", "10:00", 30, list), "time_off");
  assert.deepEqual(availableWindows("2026-12-03", hours, list), []);
});
test("partial time off blocks only those hours", () => {
  const list = [off({ start_date: "2026-11-12", end_date: "2026-11-12", start_time: "13:00", end_time: "23:59" })];
  assert.equal(check("2026-11-12", "12:30", 30, list), null);
  assert.equal(check("2026-11-12", "12:45", 30, list), "time_off");
  assert.equal(check("2026-11-12", "13:00", 30, list), "time_off");
  assert.deepEqual(availableWindows("2026-11-12", hours, list), [{ open: 540, close: 780 }]);
});
test("next open day skips time off and closed days", () => {
  assert.equal(nextOpenDay("2026-12-01", hours, [off({})]), "2026-12-05");
  assert.equal(nextOpenDay("2026-11-09", hours, []), "2026-11-11");
});
test("free slots leave out bookings and past times", () => {
  const slots = freeSlots({ date: "2026-11-11", hours, timeOff: [], booked: [{ time: "09:30", durationMinutes: 60 }], now: { date: "2026-11-11", time: "09:10" } });
  assert.equal(slots[0], "10:30");
  assert.equal(slots[slots.length - 1], "17:30");
});
test("the existing Tuesday booking is flagged, not removed", () => assert.equal(isOutsideHours("2026-11-10", "09:00", 30, hours, []), true));

test("validation: dates, times, reasons", () => {
  const today = "2026-11-09";
  assert.equal(validateTimeOff({ startDate: "2026-02-30" }, today).ok, false);
  assert.equal(validateTimeOff({ startDate: "2026-12-04", endDate: "2026-12-02" }, today).ok, false);
  assert.deepEqual(validateTimeOff({ startDate: "2026-01-01" }, today), { ok: false, error: "past" });
  assert.deepEqual(validateTimeOff({ startDate: "2026-12-02", endDate: "2028-12-02" }, today), { ok: false, error: "range_too_long" });
  assert.deepEqual(validateTimeOff({ startDate: "2026-12-02", startTime: "<x>" }, today), { ok: false, error: "invalid_time" });
  const early = validateTimeOff({ startDate: "2026-12-03", startTime: "13:00", reason: "  Eid\n" }, today);
  assert.ok(early.ok && early.value.end_time === "23:59" && early.value.reason === "Eid");
});

test("labels and spoken closures", () => {
  assert.equal(timeOffLabel(off({}), "en"), "Wed 2 to Fri 4 Dec, all day");
  const text = closuresForPrompt([off({ reason: "private reason" })], hours, "2026-11-09");
  assert.match(text, /closed from 2 to 4 December, the next available day is Saturday 5 December/);
  assert.match(text, /من اثنين إلى أربعة ديسمبر/);
  assert.match(text, /السبت خمسة ديسمبر/);
  assert.doesNotMatch(text, /private reason/);
  assert.equal(closuresForPrompt([off({ start_date: "2027-06-01", end_date: "2027-06-02" })], hours, "2026-11-09"), "");
});

test("structured hours round trip through the text version", () => {
  const split = parseOpeningHours("Sat-Thu 9-1, 4-9, Friday off");
  for (const schedule of [hours, split]) {
    const text = formatWeeklyHours(schedule!);
    assert.deepEqual(parseOpeningHours(text), schedule, text);
  }
  assert.match(formatWeeklyHours(hours!), /Tuesday closed/);
});
test("schedule validation rejects bad shapes", () => {
  assert.equal(normalizeSchedule([[]]), null);
  assert.equal(normalizeSchedule(new Array(7).fill([{ open: 600, close: 500 }])), null);
  assert.equal(normalizeSchedule(new Array(7).fill([{ open: 0, close: 2000 }])), null);
  assert.equal(normalizeSchedule(new Array(7).fill([{ open: 540, close: 800 }, { open: 700, close: 900 }])), null);
  assert.ok(normalizeSchedule(new Array(7).fill([{ open: 800, close: 900 }, { open: 540, close: 780 }])));
});
