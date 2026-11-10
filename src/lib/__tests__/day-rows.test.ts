import test from "node:test";
import assert from "node:assert/strict";
import { buildDayRows, summarizeDay, type DayAppt } from "../day-rows";
import { clashesWithBooked, dayStatus, type TimeOff } from "../time-off";
import { defaultWeekStart, resolveWeekStart, startOfWeek } from "../week-start";

const W = (o: number, c: number) => ({ open: o * 60, close: c * 60 });
// Every day 9 to 18 with a 12:00 to 13:30 lunch, Saturday closed.
const day = [W(9, 12), { open: 810, close: 1080 }];
const hours = [day, day, day, day, day, day, []];
const A = (id: string, time: string, durationMinutes = 30, status = "confirmed"): DayAppt => ({ id, time, durationMinutes, status });
const rows = (date: string, appts: DayAppt[], now = { date: "2026-11-09", time: "08:00" }, timeOff: TimeOff[] = []) =>
  buildDayRows({ date, appts, hours, timeOff, status: dayStatus(date, hours, timeOff), now, slotMinutes: 30 });
const free = (r: ReturnType<typeof rows>) => r.filter((x) => x.kind === "free").map((x) => x.start);

test("exactly one row per 30 minute slot", () => {
  const r = rows("2026-11-11", []);
  assert.deepEqual(free(r).slice(0, 3), [540, 570, 600]);
  assert.equal(r.filter((x) => x.kind === "free").length, 6 + 9);
  assert.equal(r.filter((x) => x.kind === "blocked").length, 1, "lunch is one merged row");
});

test("a booked slot is never also Free", () => {
  const r = rows("2026-11-11", [A("a", "09:00")]);
  assert.equal(r[0].kind, "booked");
  assert.ok(!free(r).includes(540));
  assert.equal(free(r)[0], 570);
});

test("a 60 minute service is one row over two slots", () => {
  const r = rows("2026-11-11", [A("a", "10:00", 60)]);
  const booked = r.filter((x) => x.kind === "booked");
  assert.equal(booked.length, 1);
  assert.ok(!free(r).includes(600) && !free(r).includes(630) && free(r).includes(660));
});

test("cancelled never holds the slot and has no row of its own", () => {
  const r = rows("2026-11-11", [A("c", "09:00", 30, "cancelled")]);
  assert.equal(r.filter((x) => x.kind === "booked").length, 0);
  assert.equal(r[0].kind, "free");
  assert.equal(r[0].cancelled[0]?.id, "c", "shown inside the 9:00 row when asked");
});

test("the Tue 10 Nov case: earlier slots today are Past, and the summary matches the rows", () => {
  const now = { date: "2026-11-10", time: "15:10" };
  const r = rows("2026-11-10", [A("c", "09:00", 30, "cancelled")], now);
  assert.ok(r.filter((x) => x.kind === "past").every((x) => x.start < 15 * 60 + 10));
  assert.equal(r.find((x) => x.kind === "free")?.start, 15 * 60 + 30);
  const s = summarizeDay(r);
  assert.equal(s.free, r.filter((x) => x.kind === "free").length);
  assert.equal(s.booked, 0);
  assert.equal(s.nextFree, 930);
  const yesterday = rows("2026-11-09", [], now);
  assert.equal(free(yesterday).length, 0, "a past day has no Free rows");
});

test("closed day: one merged row, its bookings listed under it", () => {
  const r = rows("2026-11-14", [A("x", "10:00")]);
  assert.equal(r[0].kind, "blocked");
  assert.deepEqual(r[0].kind === "blocked" && r[0].reason, { type: "closedDay" });
  assert.equal(r[1].kind === "booked" && r[1].appt.id, "x");
  assert.equal(summarizeDay(r).free, 0);
});

test("time off with a reason", () => {
  const off: TimeOff = { id: "o", start_date: "2026-11-12", end_date: "2026-11-12", start_time: null, end_time: null, reason: "Eid" };
  const r = rows("2026-11-12", [], undefined, [off]);
  assert.deepEqual(r[0].kind === "blocked" && r[0].reason, { type: "offDay", label: "Eid" });
});

test("double booking: overlaps refused, back to back allowed", () => {
  const booked = [{ date: "2026-11-11", time: "10:00", durationMinutes: 30 }];
  assert.equal(clashesWithBooked("2026-11-11", "10:00", 30, booked), true, "same slot");
  assert.equal(clashesWithBooked("2026-11-11", "09:45", 30, booked), true, "starts before, runs into it");
  assert.equal(clashesWithBooked("2026-11-11", "10:15", 60, booked), true, "starts inside it");
  assert.equal(clashesWithBooked("2026-11-11", "09:30", 30, booked), false, "ends as it starts");
  assert.equal(clashesWithBooked("2026-11-11", "10:30", 30, booked), false, "starts as it ends");
  assert.equal(clashesWithBooked("2026-11-12", "00:10", 30, [{ date: "2026-11-11", time: "23:50", durationMinutes: 60 }]), true, "across midnight");
});

test("week start: owner choice, else the business country", () => {
  assert.equal(defaultWeekStart("+97444441234"), 0);
  assert.equal(defaultWeekStart("+966501234567"), 0);
  assert.equal(defaultWeekStart("+971501234567"), 1, "UAE works Monday to Friday");
  assert.equal(defaultWeekStart("+44 20 7946 0000"), 1);
  assert.equal(defaultWeekStart(null), 0, "Qatar first");
  assert.equal(resolveWeekStart(6, "+97444441234"), 6);
  assert.equal(resolveWeekStart("x", "+4420"), 1);
  assert.equal(startOfWeek("2026-11-11", 0), "2026-11-08");
  assert.equal(startOfWeek("2026-11-11", 1), "2026-11-09");
  assert.equal(startOfWeek("2026-11-11", 6), "2026-11-07");
  assert.equal(startOfWeek("2026-11-07", 6), "2026-11-07");
});
