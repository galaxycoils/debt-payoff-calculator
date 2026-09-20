const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-ladder.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Extra ladder ===');

test('higher extra shortens months', () => {
  const input = {
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  };
  const lad = PayoffEngine.extraLadder(input, [0, 100]);
  assert.strictEqual(lad.rows.length, 2);
  assert.ok(lad.rows[1].months < lad.rows[0].months);
  assert.strictEqual(lad.rows[0].extra, 0);
  assert.strictEqual(lad.rows[1].extra, 100);
});

test('dedupes and sorts extras', () => {
  const lad = PayoffEngine.extraLadder({
    debts: [{ name: 'C', balance: 500, apr: 0, minPayment: 50 }],
    extra: 50
  }, [50, 0, 50, 25]);
  assert.deepStrictEqual(lad.rows.map((r) => r.extra), [0, 25, 50]);
});

test('marks current extra', () => {
  const lad = PayoffEngine.extraLadder({
    debts: [{ name: 'C', balance: 500, apr: 0, minPayment: 50 }],
    extra: 50
  }, [0, 50]);
  const current = lad.rows.find((r) => r.isCurrent);
  assert.ok(current);
  assert.strictEqual(current.extra, 50);
});

test('partner extra matches solo plus amount', () => {
  const input = {
    debts: [{ name: 'C', balance: 1200, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  };
  const c = PayoffEngine.comparePartnerExtra(input, 100);
  assert.strictEqual(c.solo.months, 12);
  assert.strictEqual(c.together.months, 6);
  assert.strictEqual(c.monthsSaved, 6);
  assert.strictEqual(c.partner, 100);
});

test('zero partner is a no-op', () => {
  const input = {
    debts: [{ name: 'C', balance: 400, apr: 0, minPayment: 100 }],
    extra: 0
  };
  const c = PayoffEngine.comparePartnerExtra(input, 0);
  assert.strictEqual(c.monthsSaved, 0);
  assert.strictEqual(c.interestSaved, 0);
});

console.log(process.exitCode ? 'Done with failures' : 'All ladder tests passed');
