(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ViralShare = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function fmtDate(d) {
    if (!d) return '—';
    try {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { return String(d); }
  }

  function fmtMoney(n) {
    return '$' + Math.round(n || 0).toLocaleString();
  }

  function generate(result, extras) {
    extras = extras || {};
    var dateStr = fmtDate(result.debtFreeDate);
    var months = result.months || 0;
    var interest = fmtMoney(result.totalInterest);
    var strategy = result.strategy || 'Snowball';
    var daysLine = (extras.daysBoughtBack && extras.daysBoughtBack.copy) || '';

    var text = 'Debt-free ' + dateStr + ' (' + months + ' months, ' + interest + ' interest, ' + strategy + ').';
    if (daysLine) text += ' ' + daysLine;
    text += ' Can you beat this? Private calculator — your data stays in the browser.';

    var challenge = 'Can you beat my debt-free date of ' + dateStr + '? I\'m on a ' + strategy + ' plan.';

    return { text: text, challenge: challenge, dateStr: dateStr };
  }

  return { generate: generate };
});
