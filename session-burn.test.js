/**
 * TDD seam tests for SessionBurn (sessionBurnCents, formatSessionBurn).
 * Run: node session-burn.test.js
 */
const assert = require('assert');
const SessionBurn = require('./session-burn.js');

function test(name, fn) {
  try {
    fn();
    console.log('  ok —', name);
  } catch (e) {
    console.error('FAIL —', name, e.message);
    process.exitCode = 1;
  }
}

console.log('SessionBurn seam tests');

test('zero rate or zero time → 0 cents', () => {
  assert.strictEqual(SessionBurn.sessionBurnCents(0, 100), 0);
  assert.strictEqual(SessionBurn.sessionBurnCents(10, 0), 0);
  assert.strictEqual(SessionBurn.sessionBurnCents(null, 60), 0);
});

test('$1/day for 86400 seconds (1 day) → 100 cents', () => {
  assert.strictEqual(SessionBurn.sessionBurnCents(1, 86400), 100);
});

test('$36.50/day for 1 hour (3600s) ≈ $1.52 → 152 cents', () => {
  // 36.50 / 86400 * 3600 = 1.520833... → 152 cents
  assert.strictEqual(SessionBurn.sessionBurnCents(36.50, 3600), 152);
});

test('formatSessionBurn rounds and formats money', () => {
  assert.strictEqual(SessionBurn.formatSessionBurn(0), '$0.00');
  assert.strictEqual(SessionBurn.formatSessionBurn(152), '$1.52');
  assert.strictEqual(SessionBurn.formatSessionBurn(10000), '$100.00');
});

console.log(process.exitCode ? 'SOME FAILED' : 'all passed');
