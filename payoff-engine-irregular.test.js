/**
 * Seam: PayoffEngine.irregularSnowflakes + compareIrregularIncome
 * Run: node payoff-engine-irregular.test.js
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-ext.js');

function test(name, fn) {
  try {
    fn();
    console.log('  ok —', name);
  } catch (e) {
    console.error('FAIL —', name, e.message);
    process.exitCode = 1;
  }
}

console.log('PayoffEngine irregular income');

test('irregularSnowflakes every 2 months adds flush delta on even months', () => {
  const flakes = PayoffEngine.irregularSnowflakes(50, 200, 2, 8);
  assert.deepStrictEqual(flakes.map(function (f) { return f.month; }), [2, 4, 6, 8]);
  flakes.forEach(function (f) { assert.strictEqual(f.amount, 150); });
});

test('irregularSnowflakes equal extras → empty', () => {
  assert.strictEqual(PayoffEngine.irregularSnowflakes(100, 100, 2, 24).length, 0);
});

test('$600 @ 0% / $100 min, lean $0 flush $100 every 2 months finishes in 4', () => {
  const r = PayoffEngine.compareIrregularIncome({
    debts: [{ name: 'Card', balance: 600, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  }, { leanExtra: 0, flushExtra: 100, flushEvery: 2 });
  assert.strictEqual(r.steady.months, 6);
  assert.strictEqual(r.irregular.months, 4);
  assert.strictEqual(r.monthsSaved, 2);
  assert.strictEqual(r.interestSaved, 0);
});

test('flush months beat a lean-only plan', () => {
  const r = PayoffEngine.compareIrregularIncome({
    debts: [{ name: 'Card', balance: 2000, apr: 24, minPayment: 50 }],
    extra: 25,
    strategy: 'avalanche'
  }, { leanExtra: 25, flushExtra: 150, flushEvery: 3 });
  assert.ok(r.irregular.months < r.steady.months);
  assert.ok(r.interestSaved > 0);
});

test('compareIrregularIncome rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareIrregularIncome({}, { leanExtra: 0, flushExtra: 50 }), /debts/);
});

console.log(process.exitCode ? 'Done with failures' : 'All irregular tests passed');
