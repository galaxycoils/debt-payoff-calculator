const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-refi.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== compareRefinance ===');

test('throws without debts', () => {
  assert.throws(() => PayoffEngine.compareRefinance({}), /debts array required/);
});

test('0% stay vs 0% refi with no fee is a wash on interest', () => {
  const input = {
    debts: [{ name: 'A', balance: 1200, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  };
  const r = PayoffEngine.compareRefinance(input, { apr: 0, feePercent: 0, feeFlat: 0 });
  assert.strictEqual(r.stay.months, 12);
  assert.strictEqual(r.refinance.months, 12);
  assert.strictEqual(r.feePaid, 0);
  assert.strictEqual(r.interestSaved, 0);
  assert.strictEqual(r.worthIt, false);
});

test('fee is added to new balance (worked example)', () => {
  const input = {
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  };
  const r = PayoffEngine.compareRefinance(input, { apr: 0, feePercent: 3, feeFlat: 20 });
  assert.strictEqual(r.feePaid, 50);
  assert.strictEqual(r.newBalance, 1050);
  assert.strictEqual(r.refinance.months, 21);
});

test('lower APR saves interest vs high APR stay', () => {
  const input = {
    debts: [{ name: 'Card', balance: 3000, apr: 24, minPayment: 90 }],
    extra: 50,
    strategy: 'avalanche'
  };
  const r = PayoffEngine.compareRefinance(input, { apr: 8, feePercent: 0, feeFlat: 0 });
  assert.ok(r.interestSaved > 0);
  assert.ok(r.monthsSaved >= 0);
  assert.strictEqual(r.worthIt, r.netSaved > 0);
});

test('names filter leaves unmatched debts at original APR', () => {
  const input = {
    debts: [
      { name: 'Keep', balance: 400, apr: 0, minPayment: 50 },
      { name: 'Roll', balance: 400, apr: 0, minPayment: 50 }
    ],
    extra: 0,
    strategy: 'snowball'
  };
  const r = PayoffEngine.compareRefinance(input, { apr: 0, feeFlat: 0, names: ['Roll'] });
  assert.ok(r.refinance.startingTotal >= 800);
});

console.log(process.exitCode ? 'Done with failures' : 'All refinance tests passed');
