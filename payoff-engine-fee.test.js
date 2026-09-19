const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-fee.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Annual fee drag ===');

test('zero fee matches plain calculate', () => {
  const input = {
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball',
    annualFee: 0
  };
  const a = PayoffEngine.calculate(input);
  const b = PayoffEngine.calculateWithAnnualFee(input);
  assert.strictEqual(b.months, a.months);
  assert.strictEqual(b.totalFees, 0);
});

test('fee on month 12 lengthens a multi-year plan', () => {
  const debts = [{ name: 'Slow', balance: 2400, apr: 0, minPayment: 100 }];
  const clean = PayoffEngine.calculate({ debts: debts, extra: 0, strategy: 'snowball' });
  const fee = PayoffEngine.calculateWithAnnualFee({
    debts: debts, extra: 0, strategy: 'snowball', annualFee: 120
  });
  assert.ok(clean.months >= 12);
  assert.ok(fee.months > clean.months);
  assert.ok(fee.totalFees >= 120);
});

test('paid-off before month 12 incurs no fee', () => {
  const r = PayoffEngine.calculateWithAnnualFee({
    debts: [{ name: 'Fast', balance: 500, apr: 0, minPayment: 100 }],
    extra: 0,
    annualFee: 95
  });
  assert.ok(r.months < 12);
  assert.strictEqual(r.totalFees, 0);
});

test('compareAnnualFee reports drag dollars', () => {
  const c = PayoffEngine.compareAnnualFee({
    debts: [{ name: 'Card', balance: 3000, apr: 0, minPayment: 100 }],
    extra: 0,
    annualFee: 100
  });
  assert.ok(c.feesPaid > 0);
  assert.ok(c.extraMonths >= 1);
  assert.strictEqual(typeof c.totalDrag, 'number');
});

test('per-debt annualFee overrides slider', () => {
  const r = PayoffEngine.calculateWithAnnualFee({
    debts: [
      { name: 'Free', balance: 200, apr: 0, minPayment: 20, annualFee: 0 },
      { name: 'Club', balance: 2400, apr: 0, minPayment: 100, annualFee: 200 }
    ],
    extra: 0,
    annualFee: 50
  });
  assert.ok(r.totalFees >= 200);
});

console.log(process.exitCode ? 'Done with failures' : 'All fee tests passed');
