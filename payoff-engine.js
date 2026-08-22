/**
 * PayoffEngine — pure debt amortization (no DOM, no storage).
 * Public seam: calculate(input) → result
 *
 * @typedef {{ name: string, balance: number, apr: number, minPayment: number }} Debt
 * @typedef {{ amount: number, month: number }} Snowflake
 * @typedef {{ debts: Debt[], extra?: number, strategy: 'snowball'|'avalanche', snowflakes?: Snowflake[], asOf?: Date }} PayoffInput
 * @typedef {{ month: number, totalBalance: number, interest: number }} HistoryPoint
 * @typedef {{ name: string, month: number, date: Date }} PayoffEvent
 * @typedef {{ months: number, totalInterest: number, history: HistoryPoint[], payoffOrder: PayoffEvent[], debtFreeDate: Date, strategy: string, startingTotal: number }} PayoffResult
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PayoffEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_MONTHS = 720;
  var EPS = 0.005;

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /**
   * @param {PayoffInput} input
   * @returns {PayoffResult}
   */
  function calculate(input) {
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.calculate: debts array required');
    }
    var strategy = input.strategy === 'avalanche' ? 'avalanche' : 'snowball';
    var extra = Math.max(0, Number(input.extra) || 0);
    var asOf = input.asOf instanceof Date ? input.asOf : new Date();
    var snowflakes = (input.snowflakes || [])
      .map(function (f) {
        return { amount: Math.max(0, Number(f.amount) || 0), month: Math.max(0, parseInt(f.month, 10) || 0) };
      })
      .filter(function (f) { return f.amount > 0 && f.month > 0; })
      .sort(function (a, b) { return a.month - b.month; });

    var debts = input.debts
      .map(function (d) {
        return {
          name: (d.name && String(d.name).trim()) || 'Debt',
          balance: Math.max(0, Number(d.balance) || 0),
          apr: Math.max(0, Number(d.apr) || 0),
          minPayment: Math.max(0, Number(d.minPayment) || 0),
          paidOffMonth: null
        };
      })
      .filter(function (d) { return d.balance > 0; });

    if (strategy === 'snowball') {
      debts.sort(function (a, b) { return a.balance - b.balance || b.apr - a.apr; });
    } else {
      debts.sort(function (a, b) { return b.apr - a.apr || a.balance - b.balance; });
    }

    var startingTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var month = 0;
    var totalInterest = 0;
    var history = [];
    var payoffOrder = [];

    if (startingTotal <= 0) {
      return {
        months: 0,
        totalInterest: 0,
        history: [],
        payoffOrder: [],
        debtFreeDate: asOf,
        strategy: strategy,
        startingTotal: 0
      };
    }

    while (debts.some(function (d) { return d.balance > EPS; }) && month < MAX_MONTHS) {
      month++;
      var remainingExtra = extra;
      for (var fi = 0; fi < snowflakes.length; fi++) {
        if (snowflakes[fi].month === month) remainingExtra += snowflakes[fi].amount;
      }
      var monthInterest = 0;

      debts.forEach(function (d) {
        if (d.balance > 0) {
          var interest = d.balance * (d.apr / 100 / 12);
          d.balance += interest;
          monthInterest += interest;
          totalInterest += interest;
        }
      });

      debts.forEach(function (d) {
        if (d.balance > 0) {
          var pay = Math.min(d.minPayment, d.balance);
          d.balance -= pay;
        }
      });

      for (var i = 0; i < debts.length; i++) {
        var d = debts[i];
        if (d.balance > EPS && remainingExtra > 0) {
          var p = Math.min(remainingExtra, d.balance);
          d.balance -= p;
          remainingExtra -= p;
        }
      }

      debts.forEach(function (d) {
        if (d.balance < EPS) {
          if (d.paidOffMonth === null) {
            d.paidOffMonth = month;
            payoffOrder.push({ name: d.name, month: month, date: addMonths(asOf, month) });
          }
          d.balance = 0;
        }
      });

      var totalBal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
      history.push({
        month: month,
        totalBalance: Math.round(totalBal * 100) / 100,
        interest: Math.round(monthInterest * 100) / 100
      });
      if (totalBal < 0.01) break;
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterest * 100) / 100,
      history: history,
      payoffOrder: payoffOrder,
      debtFreeDate: addMonths(asOf, month),
      strategy: strategy,
      startingTotal: startingTotal
    };
  }

  return {
    calculate: calculate,
    addMonths: addMonths,
    MAX_MONTHS: MAX_MONTHS
  };
});
