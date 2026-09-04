/**
 * Round-up extras + paycheck reminder dates.
 * Extends PayoffEngine after payoff-engine-ext.js.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.roundUpAmount) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }
  try {
    if (typeof module === 'object' && module.exports) require('./payoff-engine-ext.js');
  } catch (e) { /* browser loads ext separately */ }

  function normalizeIncrement(inc) {
    var n = Math.round(Number(inc) || 0);
    if (n === 5 || n === 10 || n === 25 || n === 50 || n === 100) return n;
    return 10;
  }

  PE.roundUpAmount = function (amount, increment) {
    var a = Math.max(0, Number(amount) || 0);
    var step = normalizeIncrement(increment);
    if (a === 0) return 0;
    return Math.ceil(a / step) * step;
  };

  PE.roundUpExtra = function (minTotal, extra, increment) {
    var mins = Math.max(0, Number(minTotal) || 0);
    var ex = Math.max(0, Number(extra) || 0);
    var currentOutflow = Math.round((mins + ex) * 100) / 100;
    var roundedOutflow = PE.roundUpAmount(currentOutflow, increment);
    var roundedExtra = Math.max(0, Math.round((roundedOutflow - mins) * 100) / 100);
    return {
      currentOutflow: currentOutflow,
      roundedOutflow: roundedOutflow,
      roundedExtra: roundedExtra,
      added: Math.round((roundedExtra - ex) * 100) / 100,
      increment: normalizeIncrement(increment)
    };
  };

  PE.compareRoundUp = function (input, increment) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareRoundUp: debts array required');
    var mins = input.debts.reduce(function (s, d) { return s + Math.max(0, Number(d.minPayment) || 0); }, 0);
    var extra = Math.max(0, Number(input.extra) || 0);
    var math = PE.roundUpExtra(mins, extra, increment);
    var stay = PE.calculate(input);
    var rounded = PE.calculate(Object.assign({}, input, { extra: math.roundedExtra }));
    return {
      stay: stay,
      rounded: rounded,
      increment: math.increment,
      currentOutflow: math.currentOutflow,
      roundedOutflow: math.roundedOutflow,
      roundedExtra: math.roundedExtra,
      added: math.added,
      monthsSaved: Math.max(0, stay.months - rounded.months),
      interestSaved: Math.round((stay.totalInterest - rounded.totalInterest) * 100) / 100
    };
  };

  function clampDay(year, monthIndex, day) {
    var last = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(Math.max(1, day), last);
  }

  PE.nextPaydays = function (asOf, dayOfMonth, count) {
    var start = asOf instanceof Date && !isNaN(asOf.getTime()) ? asOf : new Date();
    var day = Math.max(1, Math.min(31, parseInt(dayOfMonth, 10) || 1));
    var n = Math.max(1, parseInt(count, 10) || 12);
    var y = start.getFullYear();
    var m = start.getMonth();
    var first = new Date(y, m, clampDay(y, m, day));
    var startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    if (first.getTime() < startDay.getTime()) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    var out = [];
    for (var i = 0; i < n; i++) {
      var mm = m + i;
      var yy = y + Math.floor(mm / 12);
      mm = mm % 12;
      out.push(new Date(yy, mm, clampDay(yy, mm, day)));
    }
    return out;
  };

  PE.paycheckReminderIcs = function (dates, extra) {
    var amt = Math.round((Number(extra) || 0) * 100) / 100;
    function pad(n) { return String(n).padStart(2, '0'); }
    function ymd(d) {
      var dt = d instanceof Date ? d : new Date(d);
      return dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate());
    }
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Debt Payoff Calculator//EN'];
    (dates || []).forEach(function (d, i) {
      if (!(d instanceof Date) && isNaN(new Date(d).getTime())) return;
      var stamp = ymd(d);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:payday-extra-' + stamp + '-' + i + '@debt-payoff-calculator');
      lines.push('DTSTART;VALUE=DATE:' + stamp);
      lines.push('DTEND;VALUE=DATE:' + stamp);
      lines.push('SUMMARY:Send $' + amt + ' extra toward debt');
      lines.push('DESCRIPTION:Paycheck reminder from the private debt payoff calculator.');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
