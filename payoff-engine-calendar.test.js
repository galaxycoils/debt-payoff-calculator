const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
const Calendar = require('./payoff-engine-calendar.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Days bought back + missed payment ===');

test('22 months saved is 670 days, 96 weekends, 1 birthday', () => {
  const bought = Calendar.daysBoughtBack(18, 40);
  assert.strictEqual(bought.monthsSaved, 22);
  assert.strictEqual(bought.days, 670);
  assert.strictEqual(bought.weekends, 96);
  assert.strictEqual(bought.birthdays, 1);
});

test('a plan slower than minimums buys back nothing', () => {
  const bought = Calendar.daysBoughtBack(14, 10);
  assert.strictEqual(bought.monthsSaved, 0);
  assert.strictEqual(bought.days, 0);
  assert.strictEqual(bought.weekends, 0);
  assert.strictEqual(bought.birthdays, 0);
});

test('skipping one $100 payment on a 0% balance adds exactly one month', () => {
  const debts = [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }];
  const shock = Calendar.missedPaymentShock(PayoffEngine.calculate, debts, 0, 'snowball', { monthsMissed: 1, fee: 0 });
  assert.strictEqual(shock.baselineMonths, 10);
  assert.strictEqual(shock.shockMonths, 11);
  assert.strictEqual(shock.monthsAdded, 1);
  assert.strictEqual(shock.interestAdded, 0);
  assert.strictEqual(shock.target, 'Card');
});

test('a $40 late fee on a 0% balance adds a second month', () => {
  const debts = [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }];
  const shock = Calendar.missedPaymentShock(PayoffEngine.calculate, debts, 0, 'snowball', { monthsMissed: 1, fee: 40 });
  assert.strictEqual(shock.shockMonths, 12);
  assert.strictEqual(shock.monthsAdded, 2);
  assert.strictEqual(shock.fee, 40);
});

test('one miss plus a $40 fee on 12% APR costs two months and $16.39', () => {
  const debts = [{ name: 'Card', balance: 1000, apr: 12, minPayment: 100 }];
  const shock = Calendar.missedPaymentShock(PayoffEngine.calculate, debts, 0, 'avalanche', { monthsMissed: 1, fee: 40 });
  assert.strictEqual(shock.baselineMonths, 11);
  assert.strictEqual(shock.baselineInterest, 58.98);
  assert.strictEqual(shock.shockMonths, 13);
  assert.strictEqual(shock.shockInterest, 75.37);
  assert.strictEqual(shock.monthsAdded, 2);
  assert.strictEqual(shock.interestAdded, 16.39);
});

test('two misses and a $25 fee on an extra-payment plan cost four months', () => {
  const debts = [{ name: 'Loan', balance: 2000, apr: 18, minPayment: 50 }];
  const shock = Calendar.missedPaymentShock(PayoffEngine.calculate, debts, 50, 'snowball', { monthsMissed: 2, fee: 25 });
  assert.strictEqual(shock.baselineMonths, 24);
  assert.strictEqual(shock.baselineInterest, 395.65);
  assert.strictEqual(shock.shockMonths, 28);
  assert.strictEqual(shock.shockInterest, 495.98);
  assert.strictEqual(shock.monthsAdded, 4);
  assert.strictEqual(shock.interestAdded, 100.33);
});

test('the fee lands on the highest APR when several debts are open', () => {
  const debts = [
    { name: 'Low', balance: 500, apr: 6, minPayment: 25 },
    { name: 'High', balance: 800, apr: 24, minPayment: 35 }
  ];
  const shock = Calendar.missedPaymentShock(PayoffEngine.calculate, debts, 0, 'avalanche', { monthsMissed: 1, fee: 40 });
  assert.strictEqual(shock.target, 'High');
  assert.ok(shock.monthsAdded >= 1);
});

console.log(process.exitCode ? 'Done with failures' : 'All calendar tests passed');
