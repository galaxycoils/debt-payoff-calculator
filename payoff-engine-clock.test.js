const assert = require('assert');
const Clock = require('./payoff-engine-clock.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Freedom clock ===');
test('$3650 at 10% burns $1.00 per day', () => {
  const r = Clock.dailyInterestBurn([{ name: 'Card', balance: 3650, apr: 10 }]);
  assert.strictEqual(r.perDay, 1);
  assert.strictEqual(r.perYear, 365);
});
test('two debts add daily burn', () => {
  const r = Clock.dailyInterestBurn([
    { name: 'A', balance: 3650, apr: 10 },
    { name: 'B', balance: 3650, apr: 10 }
  ]);
  assert.strictEqual(r.perDay, 2);
});
test('zero balance or APR is zero burn', () => {
  const r = Clock.dailyInterestBurn([{ balance: 0, apr: 20 }, { balance: 1000, apr: 0 }]);
  assert.strictEqual(r.perDay, 0);
});
test('24 months from a 30-year-old is age 32', () => {
  const r = Clock.freedomClock({ months: 24, ageYears: 30, asOf: new Date(2026, 0, 1) });
  assert.strictEqual(r.debtFreeAge, 32);
  assert.strictEqual(r.daysRemaining, 731);
  assert.strictEqual(r.weeksRemaining, 104.4);
});
test('already free is zero days', () => {
  const r = Clock.freedomClock({ months: 0, ageYears: 40 });
  assert.strictEqual(r.daysRemaining, 0);
  assert.strictEqual(r.debtFreeAge, 40);
});

console.log(process.exitCode ? 'Done with failures' : 'All clock tests passed');
