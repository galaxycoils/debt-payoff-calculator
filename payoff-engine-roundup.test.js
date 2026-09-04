/**
 * TDD seam: round-up extras + paycheck reminder dates.
 * Run: node payoff-engine-roundup.test.js
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-ext.js');
require('./payoff-engine-roundup.js');

function test(name, fn) {
  try {
    fn();
    console.log('  ok —', name);
  } catch (e) {
    console.error('FAIL —', name, e.message);
    process.exitCode = 1;
  }
}

console.log('Round-up + payday seams');

test('roundUpAmount: $347 to nearest $10 is $350', () => {
  assert.strictEqual(PayoffEngine.roundUpAmount(347, 10), 350);
});

test('roundUpAmount: exact increment stays put', () => {
  assert.strictEqual(PayoffEngine.roundUpAmount(350, 10), 350);
});

test('roundUpAmount: invalid increment falls back to 10', () => {
  assert.strictEqual(PayoffEngine.roundUpAmount(21, 0), 30);
});

test('roundUpExtra: mins $245 + extra $50 = $295 → $300 adds $5 extra', () => {
  const r = PayoffEngine.roundUpExtra(245, 50, 10);
  assert.strictEqual(r.currentOutflow, 295);
  assert.strictEqual(r.roundedOutflow, 300);
  assert.strictEqual(r.roundedExtra, 55);
  assert.strictEqual(r.added, 5);
});

test('compareRoundUp: extra $45 rounds $145 outflow to $150', () => {
  const r2 = PayoffEngine.compareRoundUp({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 45,
    strategy: 'snowball'
  }, 10);
  assert.strictEqual(r2.stay.months, 7);
  assert.ok(r2.rounded.months <= r2.stay.months);
  assert.strictEqual(r2.increment, 10);
  assert.strictEqual(r2.added, 5);
  assert.strictEqual(r2.roundedExtra, 50);
});

test('compareRoundUp rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareRoundUp({}, 10), /debts/);
});

test('nextPaydays: 15th from Jan 4 2026 yields Jan 15 then Feb 15', () => {
  const dates = PayoffEngine.nextPaydays(new Date(2026, 0, 4), 15, 2);
  assert.strictEqual(dates.length, 2);
  assert.strictEqual(dates[0].getFullYear(), 2026);
  assert.strictEqual(dates[0].getMonth(), 0);
  assert.strictEqual(dates[0].getDate(), 15);
  assert.strictEqual(dates[1].getMonth(), 1);
  assert.strictEqual(dates[1].getDate(), 15);
});

test('nextPaydays: asOf after payday rolls to next month', () => {
  const dates = PayoffEngine.nextPaydays(new Date(2026, 0, 20), 15, 1);
  assert.strictEqual(dates[0].getMonth(), 1);
  assert.strictEqual(dates[0].getDate(), 15);
});

test('nextPaydays: day 31 clamps to last day of month', () => {
  const dates = PayoffEngine.nextPaydays(new Date(2026, 1, 1), 31, 1);
  assert.strictEqual(dates[0].getMonth(), 1);
  assert.strictEqual(dates[0].getDate(), 28);
});

test('paycheckReminderIcs includes SUMMARY and DTSTART dates', () => {
  const dates = [new Date(2026, 0, 15), new Date(2026, 1, 15)];
  const ics = PayoffEngine.paycheckReminderIcs(dates, 75);
  assert.ok(ics.indexOf('BEGIN:VCALENDAR') === 0);
  assert.ok(ics.indexOf('SUMMARY:Send $75 extra toward debt') !== -1);
  assert.ok(ics.indexOf('DTSTART;VALUE=DATE:20260115') !== -1);
  assert.ok(ics.indexOf('DTSTART;VALUE=DATE:20260215') !== -1);
  assert.ok(ics.indexOf('END:VCALENDAR') !== -1);
});

console.log(process.exitCode ? 'Done with failures' : 'All round-up tests passed');
