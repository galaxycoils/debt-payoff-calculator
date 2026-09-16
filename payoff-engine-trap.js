/**
 * Minimum-payment trap — does this month's min cover interest?
 * If not, the balance grows even while you "pay on time."
 * Extends PayoffEngine.inspectMinimums.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.inspectMinimums) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }

  function money(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  PE.inspectMinimums = function (debts) {
    if (!Array.isArray(debts)) {
      throw new Error('PayoffEngine.inspectMinimums: debts array required');
    }
    var rows = [];
    var monthlyInterest = 0;
    var monthlyMins = 0;
    var growingCount = 0;
    var extraToStopBleed = 0;

    debts.forEach(function (d) {
      var bal = Math.max(0, Number(d.balance) || 0);
      if (bal <= 0) return;
      var apr = Math.max(0, Number(d.apr) || 0);
      var minP = Math.max(0, Number(d.minPayment) || 0);
      var interest = money(bal * (apr / 100 / 12));
      var principal = money(minP - interest);
      var growing = minP + 0.005 < interest;
      var coverPct = interest <= 0 ? 100 : money((minP / interest) * 100);
      var extraNeeded = growing ? money(interest - minP) : 0;
      monthlyInterest += interest;
      monthlyMins += minP;
      extraToStopBleed += extraNeeded;
      if (growing) growingCount += 1;
      rows.push({
        name: (d.name && String(d.name).trim()) || 'Debt',
        balance: money(bal),
        apr: apr,
        minPayment: money(minP),
        monthlyInterest: interest,
        principalToward: principal,
        growing: growing,
        coverPct: coverPct,
        extraToStopBleed: extraNeeded
      });
    });

    monthlyInterest = money(monthlyInterest);
    monthlyMins = money(monthlyMins);
    extraToStopBleed = money(extraToStopBleed);
    var stackPrincipal = money(monthlyMins - monthlyInterest);
    return {
      debts: rows,
      monthlyInterest: monthlyInterest,
      monthlyMins: monthlyMins,
      stackPrincipal: stackPrincipal,
      growingCount: growingCount,
      extraToStopBleed: extraToStopBleed,
      trapped: growingCount > 0 || stackPrincipal < 0
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
