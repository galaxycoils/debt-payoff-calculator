/**
 * PayoffEngine.checkIn + utilizationPath
 * Compare actual balances to the saved plan after N months.
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

  function expectedBalanceAt(plan, monthsElapsed) {
    if (!plan || !Array.isArray(plan.history) || !plan.history.length) return 0;
    var m = Math.max(0, parseInt(monthsElapsed, 10) || 0);
    if (m <= 0) return money(plan.startingTotal || plan.history[0].totalBalance);
    if (m >= plan.history.length) return money(plan.history[plan.history.length - 1].totalBalance);
    return money(plan.history[m - 1].totalBalance);
  }

  function monthsAheadFromBalances(plan, actualTotal) {
    if (!plan || !Array.isArray(plan.history) || !plan.history.length) return 0;
    var actual = money(actualTotal);
    var expectedMonth = plan.history.length;
    for (var i = 0; i < plan.history.length; i++) {
      if (plan.history[i].totalBalance <= actual + 0.5) {
        expectedMonth = plan.history[i].month;
        break;
      }
    }
    return expectedMonth;
  }

  function checkIn(plan, opts) {
    opts = opts || {};
    var elapsed = Math.max(0, parseInt(opts.monthsElapsed, 10) || 0);
    var actual = money(opts.actualTotal);
    var expected = expectedBalanceAt(plan, elapsed);
    var delta = money(expected - actual);
    var status = 'on_track';
    if (delta >= 50) status = 'ahead';
    else if (delta <= -50) status = 'behind';
    var equivalentMonth = monthsAheadFromBalances(plan, actual);
    var monthsDelta = elapsed - equivalentMonth;
    if (actual <= 0.01) {
      status = 'done';
      monthsDelta = Math.max(0, (plan.months || elapsed) - elapsed);
    }
    return {
      monthsElapsed: elapsed,
      actualTotal: actual,
      expectedTotal: expected,
      dollarsDelta: delta,
      monthsDelta: monthsDelta,
      status: status,
      equivalentMonth: equivalentMonth
    };
  }

  function utilizationPath(input, plan) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.utilizationPath: debts array required');
    }
    var cards = input.debts.map(function (d) {
      var limit = Math.max(0, Number(d.limit) || 0);
      var bal = Math.max(0, Number(d.balance) || 0);
      if (!limit && (d.kind === 'card' || /card|visa|mastercard|amex|discover/i.test(String(d.name || '')))) {
        limit = money(Math.max(bal * 2, 500));
      }
      return { name: d.name || 'Debt', balance: bal, limit: limit };
    }).filter(function (d) { return d.limit > 0; });

    var totalLimit = cards.reduce(function (s, d) { return s + d.limit; }, 0);
    var startBal = cards.reduce(function (s, d) { return s + d.balance; }, 0);
    var startUtil = totalLimit > 0 ? money((startBal / totalLimit) * 100) : 0;
    var result = plan && typeof plan.months === 'number' ? plan : E.calculate(input);
    var under30Month = null;
    var under10Month = null;
    if (startUtil <= 30) under30Month = 0;
    if (startUtil <= 10) under10Month = 0;
    if (result.history && totalLimit > 0) {
      for (var i = 0; i < result.history.length; i++) {
        var remaining = result.history[i].totalBalance;
        var cardShare = startBal > 0 ? Math.min(1, remaining / (result.startingTotal || startBal)) : 0;
        var estCard = money(startBal * cardShare);
        var util = money((estCard / totalLimit) * 100);
        if (under30Month == null && util <= 30) under30Month = result.history[i].month;
        if (under10Month == null && util <= 10) under10Month = result.history[i].month;
      }
    }
    return {
      cardCount: cards.length,
      totalLimit: money(totalLimit),
      startBalance: money(startBal),
      startUtil: startUtil,
      under30Month: under30Month,
      under10Month: under10Month,
      months: result.months
    };
  }

  E.expectedBalanceAt = expectedBalanceAt;
  E.checkIn = checkIn;
  E.utilizationPath = utilizationPath;

  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : this);
