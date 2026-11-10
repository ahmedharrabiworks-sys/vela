import test from "node:test";
import assert from "node:assert/strict";
import { formatWeeklyHours, parseOpeningHours } from "../opening-hours";
import { applyWeeklyChange } from "../weekly-hours-edit";
import { parseKnowledgeBase, syncHoursFields } from "../knowledge-base";

const clinic = parseOpeningHours("Sunday closed, Monday to Friday 8:00 to 12:00 and 14:00 to 18:00, Saturday closed")!;

test("the real clinic text becomes a split week", () => {
  assert.deepEqual(clinic[0], []);
  assert.deepEqual(clinic[1], [{ open: 480, close: 720 }, { open: 840, close: 1080 }]);
  assert.deepEqual(clinic[6], []);
});
test("lunch 12 to 1:30 every day replaces the old break", () => {
  const r = applyWeeklyChange(clinic, { action: "set_break", start: "12:00", end: "13:30" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.week[1], [{ open: 480, close: 720 }, { open: 810, close: 1080 }]);
    assert.deepEqual(r.week[0], [], "closed days stay closed");
  }
});
test("set hours, close a day, remove breaks", () => {
  const sat = applyWeeklyChange(clinic, { action: "set_hours", days: [6], start: "09:00", end: "13:00" });
  assert.ok(sat.ok && sat.week[6][0].open === 540);
  const fri = applyWeeklyChange(clinic, { action: "close", days: [5] });
  assert.ok(fri.ok && fri.week[5].length === 0);
  const whole = applyWeeklyChange(clinic, { action: "remove_breaks" });
  assert.ok(whole.ok && whole.week[2].length === 1 && whole.week[2][0].close === 1080);
});
test("bad input is refused", () => {
  assert.equal(applyWeeklyChange(clinic, { action: "close" }).ok, false);
  assert.equal(applyWeeklyChange(clinic, { action: "set_break", start: "13:00", end: "12:00" }).ok, false);
  assert.equal(applyWeeklyChange(clinic, { action: "set_hours", days: [9], start: "09:00", end: "10:00" }).ok, false);
  assert.equal(applyWeeklyChange(clinic, { action: "drop_table" }).ok, false);
});
test("the week is the source: edited text never changes it", () => {
  const prev = parseKnowledgeBase({ business: { hours: "x", schedule: clinic } });
  const next = parseKnowledgeBase({ business: { hours: "Daily 9-5", schedule: clinic } });
  const synced = syncHoursFields(prev, next);
  assert.deepEqual(synced.business.schedule, clinic);
  assert.equal(synced.business.hours, formatWeeklyHours(clinic));
});
