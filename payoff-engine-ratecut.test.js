const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-ratecut.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Rate-cut daydream ===');

test('throws without debts', () => {
  let threw = false;
  try { PayoffEngine.compareRateCut({}); } catch (e) { threw = true; }
  assert.ok(threw);
});

test('0% stack does not invent savings when points are cut', () => {
  const r = PayoffEngine.compareRateCut({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  }, 2);
  assert.strictEqual(r.baseline.months, 10);
  assert.strictEqual(r.cut.months, 10);
  assert.strictEqual(r.monthsSaved, 0);
  assert.strictEqual(r.interestSaved, 0);
  assert.strictEqual(r.points, 2);
});

test('six-point cut on a 24% card is the worked example', () => {
  const r = PayoffEngine.compareRateCut({
    debts: [{ name: 'Card', balance: 2400, apr: 24, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  }, 6);
  assert.strictEqual(r.baseline.months, 163);
  assert.strictEqual(Math.round(r.baseline.totalInterest * 100) / 100, 5727.52);
  assert.strictEqual(r.cut.months, 86);
  assert.strictEqual(Math.round(r.cut.totalInterest * 100) / 100, 1875.06);
  assert.strictEqual(r.monthsSaved, 77);
  assert.strictEqual(r.interestSaved, 3852.46);
  assert.strictEqual(r.cutDebts[0].apr, 18);
});

test('autopay preset is a 0.25 point cut', () => {
  const r = PayoffEngine.compareAutopayDiscount({
    debts: [{ name: 'Card', balance: 2400, apr: 24, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  });
  assert.strictEqual(r.points, 0.25);
  assert.strictEqual(r.baseline.months, 163);
  assert.strictEqual(r.cut.months, 153);
  assert.strictEqual(r.interestSaved, 484.65);
  assert.strictEqual(r.monthsSaved, 10);
});

test('APR floors at zero', () => {
  const r = PayoffEngine.compareRateCut({
    debts: [{ name: 'C', balance: 500, apr: 1, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  }, 4);
  assert.strictEqual(r.cutDebts[0].apr, 0);
});

console.log(process.exitCode ? 'Done with failures' : 'All rate-cut tests passed');
