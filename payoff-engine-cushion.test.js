const assert = require('assert');
const PayoffEngine = require('./payoff-engine-cushion.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Emergency fund vs extra ===');

test('zero cushion matches stay plan', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 50, strategy: 'snowball' };
  const r = PayoffEngine.compareEmergencyFund(input, { monthlyCushion: 0, apy: 0 });
  assert.strictEqual(r.stay.months, r.cushion.months);
  assert.strictEqual(r.monthsDelayed, 0);
  assert.strictEqual(r.savingsBalance, 0);
  assert.strictEqual(r.debtWins, false);
});

test('diverting all extra on 0% APR delays 3 months and parks $500', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 50, strategy: 'snowball' };
  const r = PayoffEngine.compareEmergencyFund(input, { monthlyCushion: 50, apy: 0 });
  assert.strictEqual(r.stay.months, 7);
  assert.strictEqual(r.cushion.months, 10);
  assert.strictEqual(r.monthsDelayed, 3);
  assert.strictEqual(r.savingsBalance, 500);
  assert.strictEqual(r.extraInterest, 0);
  assert.strictEqual(r.netCost, 0);
});

test('cannot divert more than current extra', () => {
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 20, strategy: 'snowball' };
  const r = PayoffEngine.compareEmergencyFund(input, { monthlyCushion: 80, apy: 0 });
  assert.strictEqual(r.monthlyCushion, 20);
  assert.strictEqual(r.extraAfter, 0);
});

test('high APR debt usually costs more than HYSA earns', () => {
  const input = { debts: [{ name: 'C', balance: 2000, apr: 24, minPayment: 50 }], extra: 100, strategy: 'snowball' };
  const r = PayoffEngine.compareEmergencyFund(input, { monthlyCushion: 100, apy: 4 });
  assert.ok(r.monthsDelayed > 0);
  assert.ok(r.extraInterest > r.savingsInterest);
  assert.strictEqual(r.debtWins, true);
});

test('$5/day leak becomes $152.19 extra and shortens 0% plan', () => {
  assert.strictEqual(PayoffEngine.dailyToMonthly(5), 152.19);
  const input = { debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' };
  const r = PayoffEngine.compareDailyLeak(input, 5);
  assert.strictEqual(r.stay.months, 10);
  assert.ok(r.redirected.months < r.stay.months);
  assert.strictEqual(r.monthsSaved, r.stay.months - r.redirected.months);
});

console.log(process.exitCode ? 'Done with failures' : 'All cushion tests passed');
