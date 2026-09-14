const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-track.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

const plan = PayoffEngine.calculate({
  debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
  extra: 0,
  strategy: 'snowball'
});

test('expectedBalanceAt month 0 is starting total', () => {
  assert.strictEqual(PayoffEngine.expectedBalanceAt(plan, 0), 1000);
});

test('expectedBalanceAt month 3 is 700', () => {
  assert.strictEqual(PayoffEngine.expectedBalanceAt(plan, 3), 700);
});

test('checkIn on track when actual matches', () => {
  const r = PayoffEngine.checkIn(plan, { monthsElapsed: 3, actualTotal: 700 });
  assert.strictEqual(r.status, 'on_track');
  assert.strictEqual(r.dollarsDelta, 0);
});

test('checkIn ahead when actual is lower', () => {
  const r = PayoffEngine.checkIn(plan, { monthsElapsed: 3, actualTotal: 500 });
  assert.strictEqual(r.status, 'ahead');
  assert.strictEqual(r.dollarsDelta, 200);
});

test('checkIn behind when actual is higher', () => {
  const r = PayoffEngine.checkIn(plan, { monthsElapsed: 3, actualTotal: 900 });
  assert.strictEqual(r.status, 'behind');
  assert.strictEqual(r.dollarsDelta, -200);
});

test('checkIn done when actual is zero', () => {
  const r = PayoffEngine.checkIn(plan, { monthsElapsed: 8, actualTotal: 0 });
  assert.strictEqual(r.status, 'done');
});

test('utilizationPath reports start util and under-30 month', () => {
  const r = PayoffEngine.utilizationPath({
    debts: [{ name: 'Visa card', balance: 2000, apr: 20, minPayment: 50, limit: 4000 }],
    extra: 150,
    strategy: 'avalanche'
  });
  assert.strictEqual(r.startUtil, 50);
  assert.ok(r.under30Month == null || r.under30Month >= 0);
  assert.ok(r.cardCount === 1);
});

console.log(process.exitCode ? 'Done with failures' : 'All track tests passed');
