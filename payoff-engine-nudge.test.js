const assert = require('assert');
const Nudge = require('./payoff-engine-nudge.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Come-back nudge ===');
test('fresh visitor arms a 7-day due date', () => {
  const now = 1_700_000_000_000;
  const r = Nudge.evaluateNudge(null, now, 7);
  assert.strictEqual(r.shouldArm, true);
  assert.strictEqual(r.overdue, false);
  assert.strictEqual(r.daysUntil, 7);
  assert.strictEqual(r.nextDue, now + 7 * 86400000);
});
test('due date in the past is overdue by whole days', () => {
  const now = 1_700_000_000_000;
  const saved = { nextDue: now - 3 * 86400000, visits: 2 };
  const r = Nudge.evaluateNudge(saved, now, 7);
  assert.strictEqual(r.overdue, true);
  assert.strictEqual(r.daysLate, 3);
  assert.strictEqual(r.visits, 2);
  assert.strictEqual(r.shouldArm, false);
});
test('marking a return schedules the next check and counts the visit', () => {
  const now = 1_700_000_000_000;
  const next = Nudge.markReturn({ visits: 2, nextDue: now - 1 }, now, 7);
  assert.strictEqual(next.visits, 3);
  assert.strictEqual(next.lastVisit, now);
  assert.strictEqual(next.nextDue, now + 7 * 86400000);
  const status = Nudge.evaluateNudge(next, now, 7);
  assert.strictEqual(status.overdue, false);
  assert.strictEqual(status.daysUntil, 7);
});

console.log(process.exitCode ? 'Done with failures' : 'All nudge tests passed');
