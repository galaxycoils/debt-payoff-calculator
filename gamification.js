/**
 * Gamification — pure (state, event) → { state, effects[] }
 * No DOM. Adapter applies effects (toast, re-render, persist).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Gamification = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ACHIEVEMENTS = [
    { id: 'first_calc', name: 'First Steps', desc: 'Run your first calculation', xp: 25 },
    { id: 'compare', name: 'Strategist', desc: 'Compare Snowball vs Avalanche', xp: 40 },
    { id: 'extra_100', name: 'Booster', desc: 'Use $100+ extra payment', xp: 30 },
    { id: 'extra_300', name: 'Aggressive', desc: 'Use $300+ extra payment', xp: 50 },
    { id: 'streak_3', name: 'Consistent', desc: '3-day check-in streak', xp: 60 },
    { id: 'streak_7', name: 'Week Warrior', desc: '7-day check-in streak', xp: 120 },
    { id: 'level_5', name: 'Rising', desc: 'Reach Level 5', xp: 80 },
    { id: 'calcs_10', name: 'Explorer', desc: 'Run 10 calculations', xp: 70 },
    { id: 'snowflake', name: 'Snowflake', desc: 'Add a one-time bonus payment', xp: 45 },
    { id: 'share_image', name: 'Show-off', desc: 'Export a shareable result image', xp: 55 },
    { id: 'finish_line', name: 'Finish Line', desc: 'Plan with 3 months or fewer remaining', xp: 90 },
    { id: 'target_date', name: 'Deadline', desc: 'Solve extra payment for a target debt-free date', xp: 50 },
    { id: 'balance_transfer', name: 'Shop the APR', desc: 'Compare a balance-transfer offer to staying put', xp: 50 },
    { id: 'annual_bonus', name: 'Bonus Hunter', desc: 'Schedule a repeating annual snowflake', xp: 40 },
    { id: 'biweekly', name: 'Pay Day Split', desc: 'Model biweekly payments vs monthly', xp: 40 },
    { id: 'consolidator', name: 'One Payment', desc: 'Compare a consolidation loan to staying put', xp: 50 },
    { id: 'apr_shock', name: 'Rate Watcher', desc: 'Stress-test the plan if APRs rise', xp: 40 },
    { id: 'holiday', name: 'Pause Check', desc: 'Price a month off extra payments', xp: 40 },
    { id: 'raise_plan', name: 'Raise Rider', desc: 'Model putting a yearly raise toward debt', xp: 40 },
    { id: 'share_plan', name: 'Pass It On', desc: 'Copy a shareable scenario link', xp: 55 },
    { id: 'gig_plan', name: 'Gig Rhythm', desc: 'Model lean vs flush extras on irregular pay', xp: 40 },
    { id: 'hour_value', name: 'Hour Broker', desc: 'Compare overtime vs a side hustle by interest per hour', xp: 45 },
    { id: 'round_up', name: 'Loose Change', desc: 'See what rounding payments up is worth', xp: 35 },
    { id: 'payday_cal', name: 'Pay Day Ping', desc: 'Download paycheck extra-payment reminders', xp: 40 },
    { id: 'first_win_fade', name: 'Keep Rolling', desc: 'See the cost of quitting extras after the first debt dies', xp: 45 },
    { id: 'kill_cal', name: 'Date on the Wall', desc: 'Download kill-order calendar dates', xp: 40 }
  ];

  function defaultState() {
    return { xp: 0, level: 1, streak: 0, lastCheckin: null, achievements: {}, totalCalcs: 0, maxExtraUsed: 0 };
  }

  function xpForLevel(level) { return level * 100; }

  function cloneState(s) {
    return {
      xp: s.xp, level: s.level, streak: s.streak, lastCheckin: s.lastCheckin,
      achievements: Object.assign({}, s.achievements),
      totalCalcs: s.totalCalcs, maxExtraUsed: s.maxExtraUsed
    };
  }

  function applyXp(state, amount, reason, effects) {
    state.xp += amount;
    effects.push({ type: 'toast', message: '+' + amount + ' XP — ' + (reason || 'XP') });
    while (state.xp >= xpForLevel(state.level)) {
      state.xp -= xpForLevel(state.level);
      state.level += 1;
      effects.push({ type: 'toast', message: 'Level up! Level ' + state.level });
      effects.push({ type: 'level_up', level: state.level });
      if (state.level >= 5 && !state.achievements.level_5) unlockIn(state, 'level_5', effects);
    }
  }

  function unlockIn(state, id, effects) {
    if (state.achievements[id]) return;
    var ach = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) { ach = ACHIEVEMENTS[i]; break; }
    }
    if (!ach) return;
    state.achievements[id] = Date.now();
    effects.push({ type: 'achievement', id: id, name: ach.name });
    effects.push({ type: 'toast', message: 'Achievement unlocked: ' + ach.name });
    applyXp(state, ach.xp, ach.name, effects);
  }

  function reduce(state, event) {
    var next = cloneState(state || defaultState());
    var effects = [];
    var type = event && event.type;
    var p = (event && event.payload) || {};

    if (type === 'checkin') {
      var today = p.today || new Date().toDateString();
      if (next.lastCheckin === today) {
        return { state: next, effects: [{ type: 'toast', message: 'Already checked in today' }] };
      }
      var yesterday = p.yesterday;
      if (!yesterday) {
        var y = new Date(); y.setDate(y.getDate() - 1);
        yesterday = y.toDateString();
      }
      next.streak = next.lastCheckin === yesterday ? next.streak + 1 : 1;
      next.lastCheckin = today;
      if (next.streak >= 3) unlockIn(next, 'streak_3', effects);
      if (next.streak >= 7) unlockIn(next, 'streak_7', effects);
      applyXp(next, 15, 'Daily check-in', effects);
      effects.push({ type: 'persist' });
      effects.push({ type: 'render' });
    } else if (type === 'calculation') {
      next.totalCalcs += 1;
      if (next.totalCalcs === 1) unlockIn(next, 'first_calc', effects);
      if (next.totalCalcs >= 10) unlockIn(next, 'calcs_10', effects);
      if (p.compared) unlockIn(next, 'compare', effects);
      var extra = Number(p.extra) || 0;
      if (extra > next.maxExtraUsed) next.maxExtraUsed = extra;
      if (extra >= 100) unlockIn(next, 'extra_100', effects);
      if (extra >= 300) unlockIn(next, 'extra_300', effects);
      applyXp(next, 10, 'Calculation', effects);
      effects.push({ type: 'persist' });
      effects.push({ type: 'render' });
    } else if (type === 'snowflake_added') {
      unlockIn(next, 'snowflake', effects);
      effects.push({ type: 'persist' });
      effects.push({ type: 'render' });
    } else if (type === 'unlock') {
      unlockIn(next, p.id, effects);
      effects.push({ type: 'persist' });
      effects.push({ type: 'render' });
    }

    return { state: next, effects: effects };
  }

  return { reduce: reduce, defaultState: defaultState, ACHIEVEMENTS: ACHIEVEMENTS, xpForLevel: xpForLevel };
});
