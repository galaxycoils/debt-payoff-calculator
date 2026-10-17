(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DaysBoughtBack = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function calculate(monthsSaved) {
    var m = Math.max(0, Number(monthsSaved) || 0);
    var days = Math.round(m * 30.4167);
    var weekends = Math.round((days / 7) * 10) / 10;
    var birthdays = Math.round((days / 365) * 10) / 10;
    var copy = '';
    if (days === 0) copy = 'No extra time bought yet.';
    else if (days < 30) copy = 'You bought back ' + days + ' days.';
    else if (days < 365) copy = 'You bought back ' + days + ' days — about ' + weekends + ' weekends.';
    else copy = 'You bought back ' + days + ' days — ' + birthdays + ' birthday' + (birthdays === 1 ? '' : 's') + ' and ' + weekends + ' weekends.';
    return { days: days, weekends: weekends, birthdays: birthdays, copy: copy };
  }

  return { calculate: calculate };
});
