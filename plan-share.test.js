/**
 * Seam: PlanShare.encode / decode for hash URLs.
 * Run: node plan-share.test.js
 */
const assert = require('assert');
const PlanShare = require('./plan-share.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('PlanShare seam');

test('round-trip debts + extra + strategy', () => {
  const plan = {
    debts: [{ name: 'Visa', balance: 2400, apr: 21.9, minPayment: 75 }],
    extra: 150,
    strategy: 'avalanche'
  };
  const token = PlanShare.encode(plan);
  assert.ok(typeof token === 'string' && token.length > 8);
  const back = PlanShare.decode(token);
  assert.strictEqual(back.extra, 150);
  assert.strictEqual(back.strategy, 'avalanche');
  assert.strictEqual(back.debts[0].name, 'Visa');
  assert.strictEqual(back.debts[0].balance, 2400);
});

test('decode rejects garbage', () => {
  assert.strictEqual(PlanShare.decode('%%%not-valid%%%'), null);
  assert.strictEqual(PlanShare.decode(''), null);
  assert.strictEqual(PlanShare.decode(null), null);
});

test('encode skips empty debts', () => {
  const token = PlanShare.encode({ debts: [], extra: 10, strategy: 'snowball' });
  const back = PlanShare.decode(token);
  assert.ok(back);
  assert.strictEqual(back.debts.length, 0);
});

test('hash helpers wrap #p=', () => {
  const hash = PlanShare.toHash({ debts: [{ name: 'A', balance: 1, apr: 0, minPayment: 1 }], extra: 0, strategy: 'snowball' });
  assert.ok(hash.indexOf('#p=') === 0);
  const plan = PlanShare.fromHash(hash);
  assert.strictEqual(plan.debts[0].name, 'A');
});

test('fromHash ignores unrelated hashes', () => {
  assert.strictEqual(PlanShare.fromHash('#theme=dark'), null);
});

console.log(process.exitCode ? 'Done with failures' : 'All plan-share tests passed');
