const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-thirteenth.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Thirteenth + month-one split ===');

test('0% APR month-one split is all principal', () => {
  const s = PayoffEngine.monthOneSplit({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50
  });
  assert.strictEqual(s.interest, 0);
  assert.strictEqual(s.payment, 150);
  assert.strictEqual(s.principalPaid, 150);
  assert.strictEqual(s.bankShare, 0);
});

test('24% APR $1200 first month interest is $24', () => {
  const s = PayoffEngine.monthOneSplit({
    debts: [{ name: 'C', balance: 1200, apr: 24, minPayment: 40 }],
    extra: 0
  });
  assert.strictEqual(s.interest, 24);
  assert.strictEqual(s.payment, 40);
  assert.strictEqual(s.principalPaid, 16);
  assert.strictEqual(s.bankShare, 0.6);
});

test('13th payment shortens a 13-month 0% plan by 1 month', () => {
  const r = PayoffEngine.compareThirteenth({
    debts: [{ name: 'C', balance: 1300, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  });
  assert.strictEqual(r.baseline.months, 13);
  assert.strictEqual(r.thirteenthAmount, 100);
  assert.strictEqual(r.withThirteenth.months, 12);
  assert.strictEqual(r.monthsSaved, 1);
});

test('13th payment amount equals mins plus extra', () => {
  const r = PayoffEngine.compareThirteenth({
    debts: [{ name: 'A', balance: 500, apr: 0, minPayment: 25 }, { name: 'B', balance: 800, apr: 0, minPayment: 50 }],
    extra: 75
  });
  assert.strictEqual(r.thirteenthAmount, 150);
});
