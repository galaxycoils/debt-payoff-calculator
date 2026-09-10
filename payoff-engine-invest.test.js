const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-invest.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Invest vs debt ===');

test('0% return FV is extra * months', () => {
  assert.strictEqual(PayoffEngine.futureValueAnnuity(100, 0, 10), 1000);
});

test('12% monthly annuity 12 months of $100', () => {
  assert.strictEqual(PayoffEngine.futureValueAnnuity(100, 12, 12), 1268.25);
});

test('22% card extra beats 6% invest on worked example', () => {
  const r = PayoffEngine.compareInvestVsDebt({
    debts: [{ name: 'Card', balance: 12000, apr: 22, minPayment: 240 }],
    extra: 50,
    strategy: 'avalanche'
  }, 6);
  assert.strictEqual(r.interestSaved, 10137.66);
  assert.strictEqual(r.fvIfInvestExtra, 4829.24);
  assert.strictEqual(r.debtWins, true);
  assert.strictEqual(r.weightedApr, 22);
});

test('0% APR extra loses to positive expected return', () => {
  const r = PayoffEngine.compareInvestVsDebt({
    debts: [{ name: 'Promo', balance: 1200, apr: 0, minPayment: 100 }],
    extra: 100,
    strategy: 'snowball'
  }, 8);
  assert.strictEqual(r.interestSaved, 0);
  assert.ok(r.fvIfInvestExtra > 0);
  assert.strictEqual(r.debtWins, false);
});

test('zero extra is a wash', () => {
  const r = PayoffEngine.compareInvestVsDebt({
    debts: [{ name: 'C', balance: 1000, apr: 12, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball'
  }, 7);
  assert.strictEqual(r.fvIfInvestExtra, 0);
  assert.strictEqual(r.edge, r.interestSaved);
});

test('milestone map hits halfway then free', () => {
  const plan = PayoffEngine.calculate({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 0,
    strategy: 'snowball',
    asOf: new Date(2026, 0, 1)
  });
  const m = PayoffEngine.milestoneMap(plan);
  const labels = m.map((x) => x.label);
  assert.ok(labels.indexOf('Halfway') !== -1);
  assert.ok(labels.indexOf('Debt-free') !== -1);
  const free = m.filter((x) => x.label === 'Debt-free')[0];
  assert.strictEqual(free.month, 10);
});

console.log(process.exitCode ? 'Done with failures' : 'All invest tests passed');
