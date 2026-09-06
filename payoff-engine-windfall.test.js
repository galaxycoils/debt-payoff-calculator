const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-windfall.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== compareWindfall ===');
test('0% APR lump $300 cuts 3 months', () => {
  const r = PayoffEngine.compareWindfall({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0, strategy: 'snowball'
  }, { amount: 300, dripMonths: 3 });
  assert.strictEqual(r.stay.months, 10);
  assert.strictEqual(r.now.plan.months, 7);
  assert.strictEqual(r.now.monthsSaved, 3);
  assert.strictEqual(r.drip.plan.months, 7);
  assert.strictEqual(r.winner, 'now');
});

test('interest prefers lump now over drip', () => {
  const r = PayoffEngine.compareWindfall({
    debts: [{ name: 'C', balance: 2000, apr: 24, minPayment: 50 }],
    extra: 50, strategy: 'avalanche'
  }, { amount: 600, dripMonths: 6 });
  assert.ok(r.now.interestSaved >= r.drip.interestSaved);
  assert.ok(r.now.monthsSaved >= r.drip.monthsSaved);
  assert.strictEqual(r.winner, 'now');
});

test('zero amount stays', () => {
  const r = PayoffEngine.compareWindfall({
    debts: [{ name: 'C', balance: 500, apr: 0, minPayment: 50 }],
    extra: 0, strategy: 'snowball'
  }, { amount: 0, dripMonths: 3 });
  assert.strictEqual(r.winner, 'stay');
  assert.strictEqual(r.now.monthsSaved, 0);
});

test('windfallFlakes last piece absorbs remainder', () => {
  const flakes = PayoffEngine.windfallFlakes(100, 3, 1);
  assert.strictEqual(flakes.length, 3);
  const sum = flakes.reduce((s, f) => s + f.amount, 0);
  assert.strictEqual(Math.round(sum * 100) / 100, 100);
  assert.strictEqual(flakes[0].month, 1);
  assert.strictEqual(flakes[2].month, 3);
});

console.log(process.exitCode ? 'Done with failures' : 'All windfall tests passed');
