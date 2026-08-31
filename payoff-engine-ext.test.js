const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-ext.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('PayoffEngine stress-ext tests');

test('holidayMonths of 2 on 0% $1000 / $100 min / $50 extra adds 1 month', () => {
  const base = PayoffEngine.calculate({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50, strategy: 'snowball'
  });
  const holiday = PayoffEngine.calculate({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50, strategy: 'snowball', holidayMonths: 2
  });
  assert.strictEqual(base.months, 7);
  assert.strictEqual(holiday.months, 8);
});

test('comparePaymentHoliday reports extra months vs stay', () => {
  const r = PayoffEngine.comparePaymentHoliday({
    debts: [{ name: 'Card', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50, strategy: 'snowball'
  }, 2);
  assert.strictEqual(r.extraMonths, 1);
  assert.strictEqual(r.holiday.months, 8);
});

test('compareAprShock adds interest when rates rise', () => {
  const r = PayoffEngine.compareAprShock({
    debts: [{ name: 'Card', balance: 2000, apr: 12, minPayment: 50 }],
    extra: 50, strategy: 'snowball'
  }, 12);
  assert.ok(r.extraInterest > 0);
  assert.ok(r.shock.months >= r.stay.months);
});

test('compareAprShock rejects missing debts', () => {
  assert.throws(() => PayoffEngine.compareAprShock({}, 2), /debts/);
});

test('comparePaymentHoliday rejects missing debts', () => {
  assert.throws(() => PayoffEngine.comparePaymentHoliday({}, 1), /debts/);
});

console.log(process.exitCode ? 'Done with failures' : 'All passed');
