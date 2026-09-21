const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-focus.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Focus vs split extra ===');

test('single debt split equals focus', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 100 };
  const c = PayoffEngine.compareFocusVsSplit(input);
  assert.strictEqual(c.focus.months, 5);
  assert.strictEqual(c.split.months, 5);
  assert.strictEqual(c.winner, 'tie');
});

test('focus kills the small debt first', () => {
  const input = {
    debts: [
      { name: 'S', balance: 200, apr: 0, minPayment: 50 },
      { name: 'B', balance: 1000, apr: 0, minPayment: 50 }
    ],
    extra: 100,
    strategy: 'snowball'
  };
  const c = PayoffEngine.compareFocusVsSplit(input);
  assert.strictEqual(c.focus.payoffOrder[0].name, 'S');
  assert.ok(c.firstKillFocus <= c.firstKillSplit);
});

test('split still finishes and reports months', () => {
  const input = {
    debts: [
      { name: 'A', balance: 600, apr: 0, minPayment: 50 },
      { name: 'B', balance: 600, apr: 0, minPayment: 50 }
    ],
    extra: 100
  };
  const split = PayoffEngine.calculateSplitExtra(input);
  assert.ok(split.months > 0);
  assert.ok(split.months < 12);
  assert.strictEqual(split.extraMode, 'split');
});

test('requires debts array', () => {
  assert.throws(() => PayoffEngine.compareFocusVsSplit({}), /debts/);
});

console.log(process.exitCode ? 'Done with failures' : 'All focus tests passed');
