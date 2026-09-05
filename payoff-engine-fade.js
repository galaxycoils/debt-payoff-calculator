/**
 * First-win fade: what happens if extras stop after the first debt dies.
 * Also builds a kill-order .ics calendar.
 * Extends PayoffEngine after payoff-engine-ext.js.
 */
(function (root) {
  'use strict';
  var PE = (typeof module === 'object' && module.exports)
    ? require('./payoff-engine.js')
    : root.PayoffEngine;
  if (!PE || PE.compareFirstWinFade) {
    if (typeof module === 'object' && module.exports) module.exports = PE;
    return;
  }
  try {
    if (typeof module === 'object' && module.exports) require('./payoff-engine-ext.js');
  } catch (e) { /* browser loads ext separately */ }

  function extraSnowflakesThrough(extra, throughMonth) {
    var amt = Math.max(0, Number(extra) || 0);
    var n = Math.max(0, parseInt(throughMonth, 10) || 0);
    var out = [];
    if (amt <= 0 || n <= 0) return out;
    for (var m = 1; m <= n; m++) out.push({ month: m, amount: amt });
    return out;
  }

  PE.extraSnowflakesThrough = extraSnowflakesThrough;

  PE.compareFirstWinFade = function (input) {
    if (!input || !Array.isArray(input.debts)) throw new Error('PayoffEngine.compareFirstWinFade: debts array required');
    var stay = PE.calculate(input);
    var extra = Math.max(0, Number(input.extra) || 0);
    var firstKill = stay.payoffOrder && stay.payoffOrder[0] ? stay.payoffOrder[0].month : stay.months;
    var liveDebts = (input.debts || []).filter(function (d) {
      return Math.max(0, Number(d.balance) || 0) > 0;
    });
    if (liveDebts.length < 2 || extra <= 0) {
      return {
        stay: stay,
        fade: stay,
        firstKillMonth: firstKill,
        extraMonths: 0,
        extraInterest: 0,
        applicable: false
      };
    }
    var flakes = (input.snowflakes || []).concat(extraSnowflakesThrough(extra, firstKill));
    var fade = PE.calculate(Object.assign({}, input, {
      extra: 0,
      snowflakes: flakes
    }));
    return {
      stay: stay,
      fade: fade,
      firstKillMonth: firstKill,
      extraMonths: fade.months - stay.months,
      extraInterest: Math.round((fade.totalInterest - stay.totalInterest) * 100) / 100,
      applicable: true
    };
  };

  PE.killOrderIcs = function (result) {
    function pad(n) { return String(n).padStart(2, '0'); }
    function ymd(d) {
      var dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate());
    }
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Debt Payoff Calculator//EN'];
    var order = (result && result.payoffOrder) || [];
    order.forEach(function (ev, i) {
      var stamp = ymd(ev.date);
      if (!stamp) return;
      lines.push('BEGIN:VEVENT');
      lines.push('UID:kill-' + stamp + '-' + i + '@debt-payoff-calculator');
      lines.push('DTSTART;VALUE=DATE:' + stamp);
      lines.push('DTEND;VALUE=DATE:' + stamp);
      lines.push('SUMMARY:Paid off ' + String(ev.name || 'debt'));
      lines.push('DESCRIPTION:Kill-order milestone from the private debt payoff calculator.');
      lines.push('END:VEVENT');
    });
    if (result && result.debtFreeDate) {
      var free = ymd(result.debtFreeDate);
      if (free) {
        lines.push('BEGIN:VEVENT');
        lines.push('UID:debt-free-' + free + '@debt-payoff-calculator');
        lines.push('DTSTART;VALUE=DATE:' + free);
        lines.push('DTEND;VALUE=DATE:' + free);
        lines.push('SUMMARY:Debt-free day');
        lines.push('DESCRIPTION:Last planned payoff date from the private calculator.');
        lines.push('END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  if (typeof module === 'object' && module.exports) module.exports = PE;
})(typeof self !== 'undefined' ? self : this);
