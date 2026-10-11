/**
 * TDD tests for payoff velocity (months and interest saved per $100 extra).
 * Seam: calculateVelocity(debts, extra, strategy)
 */
const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
const Velocity = require('./payoff-engine-velocity.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('Velocity seam tests');

test('zero extra still returns positive velocity on high-APR debt', () => {
  const debts = [{ name: 'Card', balance: 5000, apr: 18, minPayment: 100 }];
  const v = Velocity.calculateVelocity(debts, 0, 'snowball');
  assert.ok(v.monthsPer100 > 0);
  assert.ok(v.interestPer100 > 0);
  assert.ok(v.baseMonths > 0);
});

test('higher base extra has lower marginal months per $100', () => {
  const debts = [{ name: 'Card', balance: 10000, apr: 15, minPayment: 200 }];
  const low = Velocity.calculateVelocity(debts, 50, 'avalanche');
  const high = Velocity.calculateVelocity(debts, 300, 'avalanche');
  assert.ok(low.monthsPer100 >= high.monthsPer100);
});

test('empty debts returns zeros', () => {
  const v = Velocity.calculateVelocity([], 100, 'snowball');
  assert.strictEqual(v.monthsPer100, 0);
  assert.strictEqual(v.interestPer100, 0);
});
