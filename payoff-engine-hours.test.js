/**
 * Seam: PayoffEngine.compareHourValue
 * Run: node payoff-engine-hours.test.js
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine-ext.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('PayoffEngine hour-value seam');

const debts = [{ name: 'C', balance: 1200, apr: 0, minPayment: 100 }];
const base = { debts: debts, extra: 0, strategy: 'snowball' };

test('overtime $25 × 4 hrs adds $100 extra and halves a 12-month 0% plan', () => {
  const r = PayoffEngine.compareHourValue(base, {
    overtimeRate: 25,
    overtimeHours: 4,
    hustleRate: 0,
    hustleHours: 0
  });
  assert.strictEqual(r.stay.months, 12);
  assert.strictEqual(r.overtime.extraMonthly, 100);
  assert.strictEqual(r.overtime.plan.months, 6);
  assert.strictEqual(r.overtime.monthsSaved, 6);
  assert.strictEqual(r.overtime.hoursPerMonth, 4);
});

test('side hustle $15 × 8 hrs adds $120 extra', () => {
  const r = PayoffEngine.compareHourValue(base, {
    overtimeRate: 0,
    overtimeHours: 0,
    hustleRate: 15,
    hustleHours: 8
  });
  assert.strictEqual(r.hustle.extraMonthly, 120);
  assert.strictEqual(r.hustle.plan.months, 6);
  assert.strictEqual(r.hustle.monthsSaved, 6);
});

test('winner is the path with more interest saved per hour', () => {
  const r = PayoffEngine.compareHourValue({
    debts: [{ name: 'C', balance: 3000, apr: 24, minPayment: 75 }],
    extra: 0,
    strategy: 'avalanche'
  }, {
    overtimeRate: 30,
    overtimeHours: 5,
    hustleRate: 12,
    hustleHours: 20
  });
  assert.ok(r.overtime.interestSavedPerHour != null);
  assert.ok(r.hustle.interestSavedPerHour != null);
  assert.ok(r.winner === 'overtime' || r.winner === 'hustle' || r.winner === 'tie');
  if (r.overtime.interestSavedPerHour > r.hustle.interestSavedPerHour) {
    assert.strictEqual(r.winner, 'overtime');
  } else if (r.hustle.interestSavedPerHour > r.overtime.interestSavedPerHour) {
    assert.strictEqual(r.winner, 'hustle');
  }
});

test('zero hours leaves stay plan unchanged', () => {
  const r = PayoffEngine.compareHourValue(base, {
    overtimeRate: 40,
    overtimeHours: 0,
    hustleRate: 20,
    hustleHours: 0
  });
  assert.strictEqual(r.overtime.plan.months, r.stay.months);
  assert.strictEqual(r.hustle.extraMonthly, 0);
  assert.strictEqual(r.winner, 'stay');
});

test('compareHourValue rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareHourValue({}, {}), /debts/);
});

test('negative rates and hours clamp to zero', () => {
  const r = PayoffEngine.compareHourValue(base, {
    overtimeRate: -10,
    overtimeHours: -4,
    hustleRate: -1,
    hustleHours: 3
  });
  assert.strictEqual(r.overtime.extraMonthly, 0);
  assert.strictEqual(r.hustle.extraMonthly, 0);
});

console.log(process.exitCode ? 'Done with failures' : 'All hour-value tests passed');
