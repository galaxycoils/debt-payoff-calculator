/**
 * Holiday deadlines — extra needed to finish by Christmas, tax day, New Year.
 * Public seam: nextHolidayDate, holidayDeadlines, compareHolidayDeadlines
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./payoff-engine.js'));
  else factory(root.PayoffEngine);
})(typeof self !== 'undefined' ? self : this, function (PayoffEngine) {
  'use strict';

  var DEADLINES = [
    { id: 'christmas', label: 'Christmas', month: 11, day: 25 },
    { id: 'taxday', label: 'Tax day', month: 3, day: 15 },
    { id: 'newyear', label: 'New Year', month: 0, day: 1 }
  ];

  function nextHolidayDate(id, asOf) {
    var start = asOf instanceof Date ? new Date(asOf.getTime()) : new Date();
    var spec = null;
    for (var i = 0; i < DEADLINES.length; i++) {
      if (DEADLINES[i].id === id) spec = DEADLINES[i];
    }
    if (!spec) throw new Error('PayoffEngine.nextHolidayDate: unknown id ' + id);
    var year = start.getFullYear();
    var candidate = new Date(year, spec.month, spec.day);
    if (candidate.getTime() <= start.getTime()) candidate = new Date(year + 1, spec.month, spec.day);
    return candidate;
  }

  function holidayDeadlines(asOf) {
    return DEADLINES.map(function (d) {
      var date = nextHolidayDate(d.id, asOf);
      return { id: d.id, label: d.label, date: date };
    });
  }

  function cloneInput(input) {
    return {
      debts: (input.debts || []).map(function (d) {
        return {
          name: d.name,
          balance: Number(d.balance) || 0,
          apr: Number(d.apr) || 0,
          minPayment: Number(d.minPayment) || 0,
          promoMonths: d.promoMonths,
          promoApr: d.promoApr,
          regularApr: d.regularApr
        };
      }),
      extra: Math.max(0, Number(input.extra) || 0),
      strategy: input.strategy === 'avalanche' ? 'avalanche' : 'snowball',
      snowflakes: (input.snowflakes || []).slice(),
      asOf: input.asOf,
      cadence: input.cadence
    };
  }

  function compareHolidayDeadlines(input, asOf) {
    if (!PayoffEngine || typeof PayoffEngine.extraNeededForDate !== 'function') {
      throw new Error('PayoffEngine.compareHolidayDeadlines: engine missing');
    }
    if (!input || !Array.isArray(input.debts)) {
      throw new Error('PayoffEngine.compareHolidayDeadlines: debts array required');
    }
    var when = asOf instanceof Date ? asOf : (input.asOf instanceof Date ? input.asOf : new Date());
    var cloned = cloneInput(input);
    cloned.asOf = when;
    var currentExtra = cloned.extra;
    var currentPlan = PayoffEngine.calculate(cloned);
    var rows = holidayDeadlines(when).map(function (h) {
      var solved = PayoffEngine.extraNeededForDate(cloned, h.date);
      var shortfall = Math.max(0, (solved.extra || 0) - currentExtra);
      return {
        id: h.id,
        label: h.label,
        date: h.date,
        monthsWanted: solved.monthsWanted,
        extraNeeded: solved.extra,
        currentExtra: currentExtra,
        shortfall: Math.round(shortfall * 100) / 100,
        alreadyOnTrack: !!solved.alreadyOnTrack || shortfall === 0 && solved.reachable,
        reachable: !!solved.reachable,
        planMonths: solved.plan ? solved.plan.months : null
      };
    });
    var closest = null;
    rows.forEach(function (r) {
      if (!r.reachable) return;
      if (!closest || r.monthsWanted < closest.monthsWanted) closest = r;
    });
    return {
      asOf: when,
      currentMonths: currentPlan.months,
      currentExtra: currentExtra,
      rows: rows,
      closestReachable: closest ? closest.id : null
    };
  }

  if (PayoffEngine) {
    PayoffEngine.nextHolidayDate = nextHolidayDate;
    PayoffEngine.holidayDeadlines = holidayDeadlines;
    PayoffEngine.compareHolidayDeadlines = compareHolidayDeadlines;
  }
  return PayoffEngine;
});
