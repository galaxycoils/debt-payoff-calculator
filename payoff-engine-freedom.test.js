const assert = require('assert');
require('./payoff-engine-freedom.js');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-freedom.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== FreedomYear ===');
test('year1 is 12 months of mins plus extra', () => {
  const input = {
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50,
    strategy: 'snowball'
  };
  const r = PayoffEngine.freedomYear(input);
  assert.strictEqual(r.monthlyMinimums, 100);
  assert.strictEqual(r.extra, 50);
  assert.strictEqual(r.monthlyFreed, 150);
  assert.strictEqual(r.year1, 1800);
  assert.strictEqual(r.year5, 9000);
  assert.strictEqual(r.year1IfDropExtra, 1200);
});

test('two debts sum minimums', () => {
  const r = PayoffEngine.freedomYear({
    debts: [
      { name: 'A', balance: 200, apr: 0, minPayment: 40 },
      { name: 'B', balance: 800, apr: 0, minPayment: 60 }
    ],
    extra: 0
  });
  assert.strictEqual(r.monthlyFreed, 100);
  assert.strictEqual(r.year1, 1200);
});

console.log(process.exitCode ? 'Done with failures' : 'All freedom-year tests passed');
