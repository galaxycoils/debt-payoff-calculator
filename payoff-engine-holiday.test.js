const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-holiday.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== Holiday deadlines ===');

test('next Christmas after Sept 28 2026 is Dec 25 2026', () => {
  const d = PayoffEngine.nextHolidayDate('christmas', new Date(2026, 8, 28));
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 11);
  assert.strictEqual(d.getDate(), 25);
});

test('next Christmas after Dec 26 rolls to next year', () => {
  const d = PayoffEngine.nextHolidayDate('christmas', new Date(2026, 11, 26));
  assert.strictEqual(d.getFullYear(), 2027);
});

test('tax day after April 15 rolls forward', () => {
  const d = PayoffEngine.nextHolidayDate('taxday', new Date(2026, 3, 16));
  assert.strictEqual(d.getFullYear(), 2027);
  assert.strictEqual(d.getMonth(), 3);
  assert.strictEqual(d.getDate(), 15);
});

test('holidayDeadlines returns three future dates', () => {
  const list = PayoffEngine.holidayDeadlines(new Date(2026, 8, 28));
  assert.strictEqual(list.length, 3);
  list.forEach(function (h) {
    assert.ok(h.date.getTime() > new Date(2026, 8, 28).getTime());
  });
});

test('small stack is already on track for Christmas with enough extra', () => {
  const r = PayoffEngine.compareHolidayDeadlines({
    debts: [{ name: 'C', balance: 200, apr: 0, minPayment: 100 }],
    extra: 100,
    strategy: 'snowball',
    asOf: new Date(2026, 8, 28)
  }, new Date(2026, 8, 28));
  const xmas = r.rows.find(function (row) { return row.id === 'christmas'; });
  assert.ok(xmas);
  assert.ok(xmas.alreadyOnTrack);
  assert.strictEqual(xmas.shortfall, 0);
});

test('large stack reports shortfall to hit tax day', () => {
  const r = PayoffEngine.compareHolidayDeadlines({
    debts: [{ name: 'C', balance: 8000, apr: 0, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball',
    asOf: new Date(2026, 8, 28)
  }, new Date(2026, 8, 28));
  const tax = r.rows.find(function (row) { return row.id === 'taxday'; });
  assert.ok(tax.extraNeeded > 0);
  assert.ok(tax.shortfall > 0);
});

test('throws without debts', () => {
  let threw = false;
  try { PayoffEngine.compareHolidayDeadlines({}); } catch (e) { threw = true; }
  assert.ok(threw);
});

test('unknown holiday id throws', () => {
  let threw = false;
  try { PayoffEngine.nextHolidayDate('easter', new Date()); } catch (e) { threw = true; }
  assert.ok(threw);
});

console.log(process.exitCode ? 'Done with failures' : 'All holiday tests passed');
