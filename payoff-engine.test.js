/**
 * Minimal Node tests for PayoffEngine (agreed seam: calculate, compareToMinimums, extraNeededForDate).
 * Run: node payoff-engine.test.js
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');

function test(name, fn) {
  try {
    fn();
    console.log('  ok —', name);
  } catch (e) {
    console.error('FAIL —', name, e.message);
    process.exitCode = 1;
  }
}

console.log('PayoffEngine seam tests');

test('empty debts → zero plan', () => {
  const r = PayoffEngine.calculate({ debts: [], extra: 100, strategy: 'snowball' });
  assert.strictEqual(r.months, 0);
  assert.strictEqual(r.startingTotal, 0);
  assert.strictEqual(r.history.length, 0);
});

test('single debt pays down with extra', () => {
  const r = PayoffEngine.calculate({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  });
  assert.strictEqual(r.months, 10);
  assert.strictEqual(r.totalInterest, 0);
  assert.strictEqual(r.payoffOrder.length, 1);
  assert.strictEqual(r.payoffOrder[0].name, 'Card');
});

test('snowball kills lowest balance first', () => {
  const r = PayoffEngine.calculate({
    debts: [
      { name: 'Small', balance: 200, apr: 0, minPayment: 50 },
      { name: 'Big', balance: 1000, apr: 0, minPayment: 50 }
    ],
    extra: 50,
    strategy: 'snowball'
  });
  assert.strictEqual(r.payoffOrder[0].name, 'Small');
  assert.ok(r.payoffOrder[0].month < r.payoffOrder[1].month);
});

test('avalanche prefers higher APR when balances similar', () => {
  const r = PayoffEngine.calculate({
    debts: [
      { name: 'HighAPR', balance: 1000, apr: 24, minPayment: 40 },
      { name: 'LowAPR', balance: 1000, apr: 6, minPayment: 40 }
    ],
    extra: 100,
    strategy: 'avalanche'
  });
  assert.strictEqual(r.payoffOrder[0].name, 'HighAPR');
});

test('snowflake in month 1 accelerates payoff', () => {
  const base = PayoffEngine.calculate({
    debts: [{ name: 'X', balance: 500, apr: 0, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball',
    snowflakes: []
  });
  const withFlake = PayoffEngine.calculate({
    debts: [{ name: 'X', balance: 500, apr: 0, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball',
    snowflakes: [{ amount: 200, month: 1 }]
  });
  assert.ok(withFlake.months < base.months);
});

test('rejects missing debts', () => {
  assert.throws(() => PayoffEngine.calculate({}), /debts/);
});

test('compareToMinimums: extra $50 on 0% $1000 / $100 min saves 3 months', () => {
  const r = PayoffEngine.compareToMinimums({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50,
    strategy: 'snowball'
  });
  assert.strictEqual(r.minimums.months, 10);
  assert.strictEqual(r.plan.months, 7);
  assert.strictEqual(r.monthsSaved, 3);
  assert.strictEqual(r.interestSaved, 0);
});

test('compareToMinimums: extra payment reduces interest vs minimums', () => {
  const r = PayoffEngine.compareToMinimums({
    debts: [{ name: 'Card', balance: 2000, apr: 24, minPayment: 50 }],
    extra: 100,
    strategy: 'avalanche'
  });
  assert.ok(r.plan.months < r.minimums.months);
  assert.ok(r.interestSaved > 0);
  assert.strictEqual(r.monthsSaved, r.minimums.months - r.plan.months);
});

test('compareToMinimums rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareToMinimums({}), /debts/);
});

test('extraNeededForDate: $1000 @ 0% / $100 min needs $100 extra to finish in 5 months', () => {
  const asOf = new Date(2026, 0, 1);
  const target = new Date(2026, 5, 1);
  const r = PayoffEngine.extraNeededForDate({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    strategy: 'snowball',
    asOf: asOf
  }, target);
  assert.strictEqual(r.extra, 100);
  assert.strictEqual(r.plan.months, 5);
  assert.strictEqual(r.reachable, true);
  assert.strictEqual(r.alreadyOnTrack, false);
});

test('extraNeededForDate: already on track with minimums → extra 0', () => {
  const asOf = new Date(2026, 0, 1);
  const target = new Date(2027, 0, 1);
  const r = PayoffEngine.extraNeededForDate({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    strategy: 'snowball',
    asOf: asOf
  }, target);
  assert.strictEqual(r.extra, 0);
  assert.strictEqual(r.alreadyOnTrack, true);
});

test('extraNeededForDate rejects missing debts', () => {
  assert.throws(() => PayoffEngine.extraNeededForDate({}, new Date()), /debts/);
});

test('cashFreedTimeline accumulates min payments as debts die', () => {
  const r = PayoffEngine.calculate({
    debts: [
      { name: 'Small', balance: 200, apr: 0, minPayment: 50 },
      { name: 'Big', balance: 1000, apr: 0, minPayment: 75 }
    ],
    extra: 50,
    strategy: 'snowball'
  });
  const tl = PayoffEngine.cashFreedTimeline(r);
  assert.strictEqual(tl[0].name, 'Small');
  assert.strictEqual(tl[0].freedMonthly, 50);
  assert.strictEqual(tl[1].name, 'Big');
  assert.strictEqual(tl[1].cumulativeFreed, 125);
});

console.log(process.exitCode ? 'Done with failures' : 'All passed');
