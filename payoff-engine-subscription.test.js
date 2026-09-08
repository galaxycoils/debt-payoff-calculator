const assert = require('assert');
require('./payoff-engine.js');
const PayoffEngine = require('./payoff-engine-subscription.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== compareSubscriptionCut ===');

test('zero cut matches stay', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' };
  const r = PayoffEngine.compareSubscriptionCut(input, 0);
  assert.strictEqual(r.monthsSaved, 0);
  assert.strictEqual(r.interestSaved, 0);
  assert.strictEqual(r.redirected.months, r.stay.months);
});

test('$50 cut on 0% APR shortens months', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' };
  const r = PayoffEngine.compareSubscriptionCut(input, 50);
  assert.strictEqual(r.stay.months, 10);
  assert.strictEqual(r.redirected.months, 7);
  assert.strictEqual(r.monthsSaved, 3);
  assert.strictEqual(r.extraAfter, 50);
});

test('cut stacks on existing extra', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 50, strategy: 'snowball' };
  const r = PayoffEngine.compareSubscriptionCut(input, 50);
  assert.strictEqual(r.stay.months, 7);
  assert.strictEqual(r.redirected.months, 5);
  assert.strictEqual(r.monthsSaved, 2);
});

test('requires debts', () => {
  assert.throws(() => PayoffEngine.compareSubscriptionCut({}, 10));
});

console.log(process.exitCode ? 'Done with failures' : 'All subscription tests passed');
