/**
 * PayoffEngine.freedomYear — cash unlocked the first year after debt-free.
 * Monthly cash = current minimums + extra (the budget already leaving the account).
 */
(function (root) {
  'use strict';
  var E = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!E || typeof E.calculate !== 'function') return;

  function money(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function freedomYear(input, plan) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.freedomYear: debts array required');
    }
    var result = plan && typeof plan.months === 'number'
      ? plan
      : E.calculate(input);
    var mins = input.debts.reduce(function (s, d) {
      return s + Math.max(0, Number(d.minPayment) || 0);
    }, 0);
    var extra = Math.max(0, Number(input.extra) || 0);
    var monthlyFreed = money(mins + extra);
    var keepPayingYourself = monthlyFreed;
    var dropExtra = money(mins);
    return {
      months: result.months,
      debtFreeDate: result.debtFreeDate,
      monthlyMinimums: money(mins),
      extra: money(extra),
      monthlyFreed: monthlyFreed,
      year1: money(monthlyFreed * 12),
      year5: money(monthlyFreed * 60),
      year1IfDropExtra: money(dropExtra * 12),
      keepPayingYourself: money(keepPayingYourself)
    };
  }

  E.freedomYear = freedomYear;

  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : this);
