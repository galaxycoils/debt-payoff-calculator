/**
 * Daily interest burn + freedom clock (pure, no DOM).
 * Seam: dailyInterestBurn, freedomClock
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    var api = factory();
    if (root.PayoffEngine) {
      root.PayoffEngine.dailyInterestBurn = api.dailyInterestBurn;
      root.PayoffEngine.freedomClock = api.freedomClock;
    } else {
      root.PayoffEngineClock = api;
    }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAYS_PER_YEAR = 365;
  var DAYS_PER_MONTH = 30.4375;

  function dailyInterestBurn(debts) {
    var list = Array.isArray(debts) ? debts : [];
    var perYear = 0;
    var rows = list.map(function (d) {
      var bal = Math.max(0, Number(d.balance) || 0);
      var apr = Math.max(0, Number(d.apr) || 0);
      var year = bal * (apr / 100);
      perYear += year;
      return {
        name: (d.name && String(d.name).trim()) || 'Debt',
        perYear: Math.round(year * 100) / 100,
        perDay: Math.round((year / DAYS_PER_YEAR) * 10000) / 10000
      };
    });
    var perDay = perYear / DAYS_PER_YEAR;
    return {
      perYear: Math.round(perYear * 100) / 100,
      perDay: Math.round(perDay * 10000) / 10000,
      perHour: Math.round((perDay / 24) * 100000) / 100000,
      rows: rows
    };
  }

  function freedomClock(opts) {
    opts = opts || {};
    var months = Math.max(0, parseInt(opts.months, 10) || 0);
    var asOf = opts.asOf instanceof Date ? opts.asOf : new Date();
    var ageYears = opts.ageYears == null ? null : Math.max(0, Number(opts.ageYears));
    var daysRemaining = Math.round(months * DAYS_PER_MONTH);
    var weeksRemaining = Math.round((daysRemaining / 7) * 10) / 10;
    var debtFreeDate = new Date(asOf.getTime());
    debtFreeDate.setMonth(debtFreeDate.getMonth() + months);
    var debtFreeAge = ageYears == null || isNaN(ageYears)
      ? null
      : Math.round((ageYears + months / 12) * 10) / 10;
    return {
      months: months,
      daysRemaining: daysRemaining,
      weeksRemaining: weeksRemaining,
      debtFreeDate: debtFreeDate,
      debtFreeAge: debtFreeAge
    };
  }

  return { dailyInterestBurn: dailyInterestBurn, freedomClock: freedomClock };
});
