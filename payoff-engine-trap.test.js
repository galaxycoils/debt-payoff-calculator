const assert = require('assert');
require('./payoff-engine.js');
const PayoffEngine = require('./payoff-engine-trap.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== inspectMinimums ===');

test('throws without debts array', () => {
  assert.throws(() => PayoffEngine.inspectMinimums(null));
});

test('0% APR min all goes to principal', () => {
  const r = PayoffEngine.inspectMinimums([
    { name: 'C', balance: 1000, apr: 0, minPayment: 100 }
  ]);
  assert.strictEqual(r.monthlyInterest, 0);
  assert.strictEqual(r.stackPrincipal, 100);
  assert.strictEqual(r.trapped, false);
  assert.strictEqual(r.debts[0].growing, false);
  assert.strictEqual(r.debts[0].principalToward, 100);
});

test('24% on $1000 with $15 min is a trap', () => {
  const r = PayoffEngine.inspectMinimums([
    { name: 'Card', balance: 1000, apr: 24, minPayment: 15 }
  ]);
  assert.strictEqual(r.monthlyInterest, 20);
  assert.strictEqual(r.debts[0].growing, true);
  assert.strictEqual(r.debts[0].extraToStopBleed, 5);
  assert.strictEqual(r.extraToStopBleed, 5);
  assert.strictEqual(r.growingCount, 1);
  assert.strictEqual(r.trapped, true);
});

test('min that exactly covers interest is not growing', () => {
  const r = PayoffEngine.inspectMinimums([
    { name: 'Card', balance: 1200, apr: 20, minPayment: 20 }
  ]);
  assert.strictEqual(r.monthlyInterest, 20);
  assert.strictEqual(r.debts[0].growing, false);
  assert.strictEqual(r.extraToStopBleed, 0);
});

test('stack extraToStopBleed sums only growing debts', () => {
  const r = PayoffEngine.inspectMinimums([
    { name: 'Grow', balance: 1000, apr: 24, minPayment: 15 },
    { name: 'Ok', balance: 500, apr: 0, minPayment: 50 }
  ]);
  assert.strictEqual(r.growingCount, 1);
  assert.strictEqual(r.extraToStopBleed, 5);
  assert.strictEqual(r.monthlyMins, 65);
});

console.log(process.exitCode ? 'Done with failures' : 'All trap tests passed');
