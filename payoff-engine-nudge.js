/**
 * Come-back nudge — local due date, no server.
 * Seam: evaluateNudge, markReturn
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    var api = factory();
    root.PayoffNudge = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 86400000;

  function evaluateNudge(saved, nowMs, intervalDays) {
    var interval = Math.max(1, parseInt(intervalDays, 10) || 7);
    var now = Number(nowMs) || 0;
    if (!saved || !saved.nextDue) {
      return {
        overdue: false,
        daysUntil: interval,
        daysLate: 0,
        visits: 0,
        shouldArm: true,
        nextDue: now + interval * DAY
      };
    }
    var delta = Number(saved.nextDue) - now;
    var overdue = delta <= 0;
    return {
      overdue: overdue,
      daysUntil: overdue ? 0 : Math.ceil(delta / DAY),
      daysLate: overdue ? Math.max(0, Math.floor(-delta / DAY)) : 0,
      visits: Number(saved.visits) || 0,
      shouldArm: false,
      nextDue: Number(saved.nextDue)
    };
  }

  function markReturn(saved, nowMs, intervalDays) {
    var interval = Math.max(1, parseInt(intervalDays, 10) || 7);
    var now = Number(nowMs) || 0;
    return {
      lastVisit: now,
      nextDue: now + interval * DAY,
      visits: (saved && Number(saved.visits) || 0) + 1
    };
  }

  return { evaluateNudge: evaluateNudge, markReturn: markReturn, DAY: DAY };
});
