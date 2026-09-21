/**
 * Focus extra vs split extra across open debts.
 * Public seam: calculateSplitExtra, compareFocusVsSplit
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var MAX_MONTHS = (PayoffEngine && PayoffEngine.MAX_MONTHS) || 720;
  var EPS = 0.005;

  function addMonths(date, months) {
    if (PayoffEngine && typeof PayoffEngine.addMonths === 'function') return PayoffEngine.addMonths(date, months);
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function currentApr(debt, month) {
    if (PayoffEngine && typeof PayoffEngine.currentApr === 'function') return PayoffEngine.currentApr(debt, month);
    return debt.apr;
  }

  function cloneDebts(input) {
    return input.debts.map(function (d) {
      return {
        name: (d.name && String(d.name).trim()) || 'Debt',
        balance: Math.max(0, Number(d.balance) || 0),
        apr: Math.max(0, Number(d.apr) || 0),
        promoMonths: Math.max(0, parseInt(d.promoMonths, 10) || 0),
        promoApr: d.promoApr == null ? null : Math.max(0, Number(d.promoApr) || 0),
        regularApr: d.regularApr == null ? null : Math.max(0, Number(d.regularApr) || 0),
        minPayment: Math.max(0, Number(d.minPayment) || 0),
        paidOffMonth: null
      };
    }).filter(function (d) { return d.balance > 0; });
  }

  function calculateSplitExtra(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculateSplitExtra: debts array required');
    }
    var extra = Math.max(0, Number(input.extra) || 0);
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var snowflakes = (input.snowflakes || [])
      .map(function (f) {
        return { amount: Math.max(0, Number(f.amount) || 0), month: Math.max(0, parseInt(f.month, 10) || 0) };
      })
      .filter(function (f) { return f.amount > 0 && f.month > 0; });

    var debts = cloneDebts(input);
    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0, totalInterest = 0, payoffOrder = [];
    if (startingTotal <= 0) {
      return { months: 0, totalInterest: 0, payoffOrder: [], debtFreeDate: asOf, startingTotal: 0, extraMode: 'split' };
    }

    while (debts.some(function (d) { return d.balance > EPS; }) && month < MAX_MONTHS) {
      month++;
      var remainingExtra = extra;
      snowflakes.forEach(function (f) { if (f.month === month) remainingExtra += f.amount; });

      debts.forEach(function (d) {
        if (d.balance > 0) {
          var interest = d.balance * (currentApr(d, month) / 100 / 12);
          d.balance += interest;
          totalInterest += interest;
        }
      });
      debts.forEach(function (d) {
        if (d.balance > 0) d.balance -= Math.min(d.minPayment, d.balance);
      });

      var live = debts.filter(function (d) { return d.balance > EPS; });
      var leftover = remainingExtra;
      if (live.length && leftover > 0) {
        var share = leftover / live.length;
        live.forEach(function (d) {
          var p = Math.min(share, d.balance);
          d.balance -= p;
          leftover -= p;
        });
        for (var i = 0; i < debts.length && leftover > EPS; i++) {
          if (debts[i].balance > EPS) {
            var q = Math.min(leftover, debts[i].balance);
            debts[i].balance -= q;
            leftover -= q;
          }
        }
      }

      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({ name: d.name, month: month, date: addMonths(asOf, month), minPayment: d.minPayment });
          }
          d.balance = 0;
        }
      });
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      startingTotal: startingTotal,
      extraMode: 'split',
      hitCap: month >= MAX_MONTHS && debts.some(function (d) { return d.balance > EPS; })
    };
  }

  function firstKillMonth(result) {
    if (!result || !result.payoffOrder || !result.payoffOrder.length) return result ? result.months : 0;
    return result.payoffOrder[0].month;
  }

  function compareFocusVsSplit(input) {
    if (!PayoffEngine || typeof PayoffEngine.calculate !== 'function') {
      throw new Error('PayoffEngine.compareFocusVsSplit: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareFocusVsSplit: debts array required');
    }
    var focus = PayoffEngine.calculate(input);
    var split = calculateSplitExtra(input);
    var monthsSavedByFocus = split.months - focus.months;
    var interestSavedByFocus = Math.round((split.totalInterest - focus.totalInterest) * 100) / 100;
    var firstKillFocus = firstKillMonth(focus);
    var firstKillSplit = firstKillMonth(split);
    var winner = 'tie';
    if (focus.months < split.months || (focus.months === split.months && focus.totalInterest < split.totalInterest - 0.005)) winner = 'focus';
    else if (split.months < focus.months || (split.months === focus.months && split.totalInterest < focus.totalInterest - 0.005)) winner = 'split';
    return {
      focus: focus,
      split: split,
      monthsSavedByFocus: monthsSavedByFocus,
      interestSavedByFocus: interestSavedByFocus,
      firstKillFocus: firstKillFocus,
      firstKillSplit: firstKillSplit,
      firstKillFasterBy: firstKillSplit - firstKillFocus,
      winner: winner
    };
  }

  PayoffEngine.calculateSplitExtra = calculateSplitExtra;
  PayoffEngine.compareFocusVsSplit = compareFocusVsSplit;
  return PayoffEngine;
});
