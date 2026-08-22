/**
 * Minimal Node tests for PayoffEngine (agreed seam: calculate).
 * Run: node payoff-engine.test.js
 * Expected values are independent worked examples, not recomputed from the same loop.
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
  // 0% APR, $100/mo on $1000 → 10 months
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

console.log(process.exitCode ? 'Done with failures' : 'All passed');
