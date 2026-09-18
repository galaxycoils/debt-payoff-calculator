const assert = require('assert');
require('./payoff-engine-hybrid.js');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-hybrid.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

const debts = [
  { name: 'Small', balance: 300, apr: 8, minPayment: 25 },
  { name: 'HighAPR', balance: 2000, apr: 24, minPayment: 50 },
  { name: 'LowAPR', balance: 1500, apr: 6, minPayment: 40 }
];

console.log('=== Hybrid ===');
test('first kill is the smallest balance', () => {
  const r = PayoffEngine.calculateHybrid({ debts: debts, extra: 100 });
  assert.strictEqual(r.payoffOrder[0].name, 'Small');
  assert.ok(r.switched);
  assert.ok(r.switchMonth >= r.payoffOrder[0].month);
});

test('after first kill extra hits highest remaining APR', () => {
  const r = PayoffEngine.calculateHybrid({ debts: debts, extra: 150 });
  const names = r.payoffOrder.map(function (p) { return p.name; });
  assert.strictEqual(names[0], 'Small');
  assert.strictEqual(names[1], 'HighAPR');
});

test('compareHybrid exposes all three plans', () => {
  const c = PayoffEngine.compareHybrid({ debts: debts, extra: 80 });
  assert.ok(c.snowball.months > 0);
  assert.ok(c.avalanche.months > 0);
  assert.ok(c.hybrid.months > 0);
  assert.strictEqual(typeof c.vsSnowballInterest, 'number');
  assert.strictEqual(typeof c.vsAvalancheInterest, 'number');
});

test('hybrid interest sits between or near the two poles', () => {
  const c = PayoffEngine.compareHybrid({ debts: debts, extra: 80 });
  const hi = Math.max(c.snowball.totalInterest, c.avalanche.totalInterest);
  const lo = Math.min(c.snowball.totalInterest, c.avalanche.totalInterest);
  assert.ok(c.hybrid.totalInterest <= hi + 1);
  assert.ok(c.hybrid.totalInterest + 1 >= lo);
});

test('single debt hybrid matches snowball', () => {
  const input = { debts: [{ name: 'Only', balance: 500, apr: 0, minPayment: 50 }], extra: 0 };
  const s = PayoffEngine.calculate(Object.assign({ strategy: 'snowball' }, input));
  const h = PayoffEngine.calculateHybrid(input);
  assert.strictEqual(h.months, s.months);
  assert.strictEqual(h.switched, false);
});

console.log(process.exitCode ? 'Done with failures' : 'All hybrid tests passed');
