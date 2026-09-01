/**
 * Seam: PayoffEngine.calculate({ annualRaisePercent }) and compareRaise.
 * Run: node payoff-engine-raise.test.js
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine-ext.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('PayoffEngine annual-raise seam');

test('no raise matches baseline extra', () => {
  const debts = [{ name: 'C', balance: 6000, apr: 0, minPayment: 100 }];
  const a = PayoffEngine.calculate({ debts: debts, extra: 100, strategy: 'snowball' });
  const b = PayoffEngine.calculate({ debts: debts, extra: 100, strategy: 'snowball', annualRaisePercent: 0 });
  assert.strictEqual(b.months, a.months);
});

test('50% annual raise on $6000 / $100 min / $100 extra finishes in 26 months', () => {
  const r = PayoffEngine.calculate({
    debts: [{ name: 'C', balance: 6000, apr: 0, minPayment: 100 }],
    extra: 100,
    strategy: 'snowball',
    annualRaisePercent: 50
  });
  assert.strictEqual(r.months, 26);
  assert.strictEqual(r.totalInterest, 0);
});

test('compareRaise reports months and interest saved', () => {
  const r = PayoffEngine.compareRaise({
    debts: [{ name: 'C', balance: 6000, apr: 0, minPayment: 100 }],
    extra: 100,
    strategy: 'snowball'
  }, 50);
  assert.strictEqual(r.stay.months, 30);
  assert.strictEqual(r.raised.months, 26);
  assert.strictEqual(r.monthsSaved, 4);
  assert.strictEqual(r.raisePercent, 50);
});

test('compareRaise rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareRaise({}, 3), /debts/);
});

test('negative raise percent is treated as 0', () => {
  const debts = [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }];
  const a = PayoffEngine.calculate({ debts: debts, extra: 0, strategy: 'snowball' });
  const b = PayoffEngine.calculate({ debts: debts, extra: 0, strategy: 'snowball', annualRaisePercent: -10 });
  assert.strictEqual(b.months, a.months);
});

console.log(process.exitCode ? 'Done with failures' : 'All raise tests passed');
