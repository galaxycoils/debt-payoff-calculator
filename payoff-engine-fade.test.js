const assert = require('assert');
require('./payoff-engine-ext.js');
const PE = require('./payoff-engine-fade.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== First-win fade ===');

test('single debt is not applicable', () => {
  const r = PE.compareFirstWinFade({
    debts: [{ name: 'Only', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50,
    strategy: 'snowball'
  });
  assert.strictEqual(r.applicable, false);
  assert.strictEqual(r.extraMonths, 0);
});

test('zero extra is not applicable', () => {
  const r = PE.compareFirstWinFade({
    debts: [
      { name: 'S', balance: 200, apr: 0, minPayment: 50 },
      { name: 'B', balance: 1000, apr: 0, minPayment: 50 }
    ],
    extra: 0,
    strategy: 'snowball'
  });
  assert.strictEqual(r.applicable, false);
});

test('dropping extra after first kill costs months on 0% worked example', () => {
  const debts = [
    { name: 'S', balance: 200, apr: 0, minPayment: 50 },
    { name: 'B', balance: 1000, apr: 0, minPayment: 50 }
  ];
  const stay = PE.calculate({ debts: debts, extra: 50, strategy: 'snowball' });
  const r = PE.compareFirstWinFade({ debts: debts, extra: 50, strategy: 'snowball' });
  assert.strictEqual(r.applicable, true);
  assert.strictEqual(r.stay.months, stay.months);
  assert.ok(r.fade.months > r.stay.months, 'fade should take longer');
  assert.ok(r.extraMonths > 0);
  assert.strictEqual(r.extraInterest, 0);
});

test('killOrderIcs includes first debt name and debt-free day', () => {
  const r = PE.calculate({
    debts: [
      { name: 'Visa', balance: 200, apr: 0, minPayment: 50 },
      { name: 'Auto', balance: 400, apr: 0, minPayment: 50 }
    ],
    extra: 50,
    strategy: 'snowball',
    asOf: new Date(2026, 0, 15)
  });
  const ics = PE.killOrderIcs(r);
  assert.ok(ics.indexOf('BEGIN:VCALENDAR') === 0);
  assert.ok(ics.indexOf('Paid off Visa') !== -1);
  assert.ok(ics.indexOf('Debt-free day') !== -1);
});

console.log(process.exitCode ? 'Done with failures' : 'All fade tests passed');
