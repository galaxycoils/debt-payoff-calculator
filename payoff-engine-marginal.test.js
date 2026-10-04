const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
const Marginal = require('./payoff-engine-marginal.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Next-dollar curve ===');
test('$1000 at 0% buys 2 months at +$25 and 5 months at +$100', () => {
  const input = { debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' };
  const curve = Marginal.nextDollarCurve(PayoffEngine.calculate, input, [0, 25, 100]);
  assert.strictEqual(curve.rows[0].months, 10);
  assert.strictEqual(curve.rows[0].monthsSaved, 0);
  assert.strictEqual(curve.rows[1].extra, 25);
  assert.strictEqual(curve.rows[1].months, 8);
  assert.strictEqual(curve.rows[1].monthsSaved, 2);
  assert.strictEqual(curve.rows[1].interestSaved, 0);
  assert.strictEqual(curve.rows[2].months, 5);
  assert.strictEqual(curve.rows[2].monthsSaved, 5);
});
test('sharpest step is the first $25 on a 0% balance', () => {
  const input = { debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' };
  const curve = Marginal.nextDollarCurve(PayoffEngine.calculate, input, [0, 25, 100]);
  assert.strictEqual(curve.sharpest.bump, 25);
  assert.strictEqual(curve.sharpest.monthsSaved, 2);
});
test('current extra is the baseline, not zero', () => {
  const input = { debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }], extra: 100, strategy: 'snowball' };
  const curve = Marginal.nextDollarCurve(PayoffEngine.calculate, input, [0, 100]);
  assert.strictEqual(curve.baseExtra, 100);
  assert.strictEqual(curve.rows[0].months, 5);
  assert.strictEqual(curve.rows[1].extra, 200);
  assert.strictEqual(curve.rows[1].months, 4);
  assert.strictEqual(curve.rows[1].monthsSaved, 1);
});

console.log(process.exitCode ? 'Done with failures' : 'All marginal tests passed');
