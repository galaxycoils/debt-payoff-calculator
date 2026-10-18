/**
 * viral-share.test.js
 * Seam: ViralShare.generate — produces shareable text and challenge copy
 */
const assert = require('assert');
const ViralShare = require('./viral-share.js');

const result = {
  debtFreeDate: new Date('2028-06-15'),
  months: 20,
  totalInterest: 12450,
  strategy: 'Avalanche',
  monthsSavedVsMinimums: 8
};

const out = ViralShare.generate(result, { daysBoughtBack: { copy: 'You bought back 243 days — about 34.7 weekends.' } });

assert.ok(out.text.includes('Debt-free'));
assert.ok(out.text.includes('June'));
assert.ok(out.text.includes('20 months'));
assert.ok(out.text.includes('Can you beat'));
assert.ok(out.challenge.includes('Can you beat my debt-free date'));

console.log('viral-share tests passed');
