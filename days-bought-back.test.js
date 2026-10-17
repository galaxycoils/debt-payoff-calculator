/**
 * days-bought-back.test.js
 * Seam: DaysBoughtBack.calculate — months saved vs minimums as days / weekends / birthdays
 */
const assert = require('assert');
const DaysBoughtBack = require('./days-bought-back.js');

function approx(a, b, eps) { return Math.abs(a - b) < (eps || 0.01); }

// Independent worked example: 12 months saved = 365 days, ~52 weekends, ~1 birthday
const r1 = DaysBoughtBack.calculate(12);
assert.strictEqual(r1.days, 365);
assert.ok(approx(r1.weekends, 52.14, 0.5));
assert.ok(approx(r1.birthdays, 1, 0.1));

// Zero months
const r0 = DaysBoughtBack.calculate(0);
assert.strictEqual(r0.days, 0);
assert.strictEqual(r0.weekends, 0);

// 6 months
const r6 = DaysBoughtBack.calculate(6);
assert.strictEqual(r6.days, 183); // 6 * 30.4167 ≈ 182.5 → 183

console.log('days-bought-back tests passed');
