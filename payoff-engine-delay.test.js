const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-delay.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Delay cost ===');
test('waiting 0 months costs nothing', () => {
  const r = PayoffEngine.compareDelay({
    debts: [{ name: 'C', balance: 1000, apr: 24, minPayment: 50 }],
    extra: 100, strategy: 'snowball'
  }, 0);
  assert.strictEqual(r.extraMonths, 0);
  assert.strictEqual(r.extraInterest, 0);
});
test('waiting 3 months costs extra interest on 24% card', () => {
  const r = PayoffEngine.compareDelay({
    debts: [{ name: 'C', balance: 3000, apr: 24, minPayment: 60 }],
    extra: 200, strategy: 'snowball'
  }, 3);
  assert.ok(r.later.months >= r.now.months);
  assert.ok(r.extraInterest > 0);
  assert.ok(r.basket.coffees >= 0);
});
test('extraStartsAtMonth 1 matches default calculate', () => {
  const debts = [{ name: 'C', balance: 800, apr: 0, minPayment: 100 }];
  const a = PayoffEngine.calculate({ debts: debts, extra: 100, strategy: 'snowball' });
  const b = PayoffEngine.calculate({ debts: debts, extra: 100, strategy: 'snowball', extraStartsAtMonth: 1 });
  assert.strictEqual(a.months, b.months);
});
test('0% APR delay of 2 months adds exactly 2 months when mins are 0', () => {
  const r = PayoffEngine.compareDelay({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 0 }],
    extra: 200, strategy: 'snowball'
  }, 2);
  assert.strictEqual(r.now.months, 5);
  assert.strictEqual(r.later.months, 7);
  assert.strictEqual(r.extraMonths, 2);
  assert.strictEqual(r.extraInterest, 0);
});

console.log(process.exitCode ? 'Done with failures' : 'All delay tests passed');
