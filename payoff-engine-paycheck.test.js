const assert = require('assert');
require('./payoff-engine.js');
const PayoffEngine = require('./payoff-engine-paycheck.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== comparePaycheckShare ===');

test('throws without debts array', () => {
  assert.throws(() => PayoffEngine.comparePaycheckShare(null, { takeHome: 4000, percent: 10 }));
});

test('10% of $4000 is $400 extra', () => {
  const r = PayoffEngine.comparePaycheckShare({
    debts: [{ name: 'C', balance: 2000, apr: 0, minPayment: 100 }],
    extra: 50,
    strategy: 'snowball'
  }, { takeHome: 4000, percent: 10 });
  assert.strictEqual(r.extraFromShare, 400);
  assert.strictEqual(r.monthlyMins, 100);
  assert.strictEqual(r.leftover, 3500);
  assert.strictEqual(r.leftoverTight, false);
  assert.ok(r.sharePlan.months < r.current.months);
  assert.ok(r.monthsSaved > 0);
  assert.strictEqual(r.moreAggressive, true);
});

test('0% share uses zero extra', () => {
  const r = PayoffEngine.comparePaycheckShare({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50,
    strategy: 'snowball'
  }, { takeHome: 3000, percent: 0 });
  assert.strictEqual(r.extraFromShare, 0);
  assert.strictEqual(r.sharePlan.months, 10);
});

test('caps percent at 50', () => {
  const r = PayoffEngine.comparePaycheckShare({
    debts: [{ name: 'C', balance: 100, apr: 0, minPayment: 10 }],
    extra: 0,
    strategy: 'snowball'
  }, { takeHome: 2000, percent: 80 });
  assert.strictEqual(r.percent, 50);
  assert.strictEqual(r.extraFromShare, 1000);
});

test('tight leftover when mins + share exceed take-home', () => {
  const r = PayoffEngine.comparePaycheckShare({
    debts: [{ name: 'C', balance: 5000, apr: 0, minPayment: 900 }],
    extra: 0,
    strategy: 'snowball'
  }, { takeHome: 1000, percent: 20 });
  assert.strictEqual(r.extraFromShare, 200);
  assert.ok(r.leftover < 0);
  assert.strictEqual(r.leftoverTight, true);
});

console.log(process.exitCode ? 'Done with failures' : 'All paycheck tests passed');
