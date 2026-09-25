const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-yearone.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Year-one wins ===');

test('yearOneWins counts kills on or before horizon', () => {
  const plan = PayoffEngine.calculate({
    debts: [
      { name: 'Tiny', balance: 100, apr: 0, minPayment: 25 },
      { name: 'Mid', balance: 400, apr: 0, minPayment: 25 },
      { name: 'Huge', balance: 8000, apr: 0, minPayment: 50 }
    ],
    extra: 75,
    strategy: 'snowball'
  });
  const y = PayoffEngine.yearOneWins(plan, 12);
  assert.ok(y.count >= 1);
  assert.ok(y.names.indexOf('Tiny') !== -1);
  assert.strictEqual(y.horizon, 12);
});

test('empty result is zero wins', () => {
  const y = PayoffEngine.yearOneWins({ payoffOrder: [], history: [], months: 0 }, 12);
  assert.strictEqual(y.count, 0);
  assert.strictEqual(y.interestYearOne, 0);
});

test('snowball gets more year-one wins than avalanche on a barbell stack', () => {
  const r = PayoffEngine.compareYearOneWins({
    debts: [
      { name: 'Tiny', balance: 100, apr: 3, minPayment: 25 },
      { name: 'Mid', balance: 400, apr: 18, minPayment: 25 },
      { name: 'Huge', balance: 8000, apr: 22, minPayment: 50 }
    ],
    extra: 75
  }, 12);
  assert.ok(r.snowball.count >= r.avalanche.count);
  assert.ok(r.moreWinsStrategy === 'snowball' || r.moreWinsStrategy === 'tie');
  assert.ok(r.snowball.names.indexOf('Tiny') !== -1);
});

test('horizon 1 only counts month-1 kills', () => {
  const plan = PayoffEngine.calculate({
    debts: [{ name: 'A', balance: 50, apr: 0, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  });
  const y = PayoffEngine.yearOneWins(plan, 1);
  assert.strictEqual(y.count, 1);
  assert.strictEqual(y.remainingAfter, 0);
});

test('compareYearOneWins throws without debts', () => {
  let threw = false;
  try { PayoffEngine.compareYearOneWins({}); } catch (e) { threw = true; }
  assert.ok(threw);
});

console.log(process.exitCode ? 'Done with failures' : 'All year-one tests passed');
