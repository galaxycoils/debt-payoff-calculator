const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-promo.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Promo cliff ===');

test('aims extra at promo debt first', () => {
  const r = PayoffEngine.calculatePromoFirst({
    debts: [
      { name: 'Regular', balance: 900, apr: 22, minPayment: 30 },
      { name: 'Zero', balance: 300, apr: 0, promoMonths: 6, promoApr: 0, regularApr: 24, minPayment: 25 }
    ],
    extra: 75
  });
  assert.strictEqual(r.payoffOrder[0].name, 'Zero');
});

test('records leftover at cliff when extra is too small', () => {
  const r = PayoffEngine.calculatePromoFirst({
    debts: [
      { name: 'Zero', balance: 2400, apr: 0, promoMonths: 3, promoApr: 0, regularApr: 26, minPayment: 25 }
    ],
    extra: 0
  });
  assert.strictEqual(r.cliffs.length, 1);
  assert.strictEqual(r.cliffs[0].paidBeforeCliff, false);
  assert.ok(r.cliffs[0].leftoverAtCliff > 2000);
});

test('clears a small promo balance before the cliff', () => {
  const r = PayoffEngine.calculatePromoFirst({
    debts: [
      { name: 'Zero', balance: 200, apr: 0, promoMonths: 6, promoApr: 0, regularApr: 24, minPayment: 25 },
      { name: 'Card', balance: 800, apr: 19, minPayment: 30 }
    ],
    extra: 50
  });
  const cliff = r.cliffs[0];
  assert.ok(cliff.paidBeforeCliff);
  assert.ok(r.payoffOrder[0].month <= 6);
});

test('comparePromoCliff exposes extraToClear', () => {
  const c = PayoffEngine.comparePromoCliff({
    debts: [
      { name: 'Zero', balance: 600, apr: 0, promoMonths: 4, promoApr: 0, regularApr: 25, minPayment: 25 },
      { name: 'Card', balance: 400, apr: 20, minPayment: 20 }
    ],
    extra: 10
  });
  assert.ok(c.hasPromo);
  assert.ok(c.extraToClear >= 10);
  assert.ok(c.promo.months > 0);
  assert.ok(c.avalanche.months > 0);
});

test('rejects missing debts', () => {
  let threw = false;
  try { PayoffEngine.calculatePromoFirst({}); } catch (e) { threw = true; }
  assert.ok(threw);
});

console.log(process.exitCode ? 'Done with failures' : 'All promo tests passed');
