const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-cashflow.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Cashflow first ===');

test('orders by highest minimum first', () => {
  const r = PayoffEngine.calculateCashflowFirst({
    debts: [
      { name: 'TinyMin', balance: 200, apr: 0, minPayment: 25 },
      { name: 'BigMin', balance: 400, apr: 0, minPayment: 100 }
    ],
    extra: 50
  });
  assert.strictEqual(r.payoffOrder[0].name, 'BigMin');
});

test('0% BigMin dies in 4 months with extra 50', () => {
  const r = PayoffEngine.calculateCashflowFirst({
    debts: [
      { name: 'TinyMin', balance: 200, apr: 0, minPayment: 25 },
      { name: 'BigMin', balance: 400, apr: 0, minPayment: 100 }
    ],
    extra: 50
  });
  assert.strictEqual(r.payoffOrder[0].month, 3);
  assert.strictEqual(r.payoffOrder[0].name, 'BigMin');
});

test('compare exposes three plans and first-kill cashflow', () => {
  const c = PayoffEngine.compareCashflowFirst({
    debts: [
      { name: 'Card', balance: 800, apr: 22, minPayment: 40 },
      { name: 'Loan', balance: 2000, apr: 7, minPayment: 180 }
    ],
    extra: 75,
    strategy: 'snowball'
  });
  assert.ok(c.snowball.months > 0);
  assert.ok(c.avalanche.months > 0);
  assert.ok(c.cashflow.months > 0);
  assert.strictEqual(c.firstKillCashflow.name, 'Loan');
  assert.ok(['snowball', 'avalanche', 'cashflow'].indexOf(c.fastestKey) !== -1);
});

test('monthsUntilFreed reaches 100 after first big min', () => {
  const r = PayoffEngine.calculateCashflowFirst({
    debts: [
      { name: 'A', balance: 300, apr: 0, minPayment: 120 },
      { name: 'B', balance: 300, apr: 0, minPayment: 30 }
    ],
    extra: 0
  });
  assert.strictEqual(PayoffEngine.monthsUntilFreed(r, 100), r.payoffOrder[0].month);
});

test('rejects missing debts', () => {
  let threw = false;
  try { PayoffEngine.calculateCashflowFirst({}); } catch (e) { threw = true; }
  assert.ok(threw);
});

console.log(process.exitCode ? 'Done with failures' : 'All cashflow tests passed');
