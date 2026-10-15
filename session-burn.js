/**
 * Session interest burn — pure math for "interest burned since page open".
 * Seam: sessionBurnCents, formatSessionBurn
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SessionBurn = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Interest burned in cents over elapsed seconds at a given daily rate.
   * Independent source of truth for tests.
   */
  function sessionBurnCents(perDay, elapsedSeconds) {
    var day = Math.max(0, Number(perDay) || 0);
    var secs = Math.max(0, Number(elapsedSeconds) || 0);
    if (day === 0 || secs === 0) return 0;
    var perSecond = day / 86400;
    return Math.round(perSecond * secs * 100);
  }

  function formatSessionBurn(cents) {
    var c = Math.max(0, Math.round(Number(cents) || 0));
    var dollars = c / 100;
    return '$' + dollars.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return {
    sessionBurnCents: sessionBurnCents,
    formatSessionBurn: formatSessionBurn
  };
});
