const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
require('./payoff-engine-freedom.js');
require('./payoff-engine-yearone.js');
require('./payoff-engine-ratecut.js');
require('./payoff-engine-life.js');
require('./payoff-engine-season.js');
require('./payoff-engine-fuel.js');
const Persistence = require('./persistence.js');
const Gamification = require('./gamification.js');

function test(name, fn) {
  try { fn(); console.log('  ok —', name); }
  catch (e) { console.error('FAIL —', name, e.message); process.exitCode = 1; }
}

console.log('=== PayoffEngine ===');
test('0% APR exact months', () => {
  const r = PayoffEngine.calculate({ debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }], extra: 0, strategy: 'snowball' });
  assert.strictEqual(r.months, 10);
  assert.strictEqual(r.totalInterest, 0);
});
test('snowball order', () => {
  const r = PayoffEngine.calculate({
    debts: [{ name: 'S', balance: 200, apr: 0, minPayment: 50 }, { name: 'B', balance: 1000, apr: 0, minPayment: 50 }],
    extra: 50, strategy: 'snowball'
  });
  assert.strictEqual(r.payoffOrder[0].name, 'S');
});
test('avalanche order', () => {
  const r = PayoffEngine.calculate({
    debts: [{ name: 'H', balance: 1000, apr: 24, minPayment: 40 }, { name: 'L', balance: 1000, apr: 6, minPayment: 40 }],
    extra: 100, strategy: 'avalanche'
  });
  assert.strictEqual(r.payoffOrder[0].name, 'H');
});
test('snowflake accelerates', () => {
  const base = PayoffEngine.calculate({ debts: [{ name: 'X', balance: 500, apr: 0, minPayment: 50 }], extra: 0, strategy: 'snowball' });
  const f = PayoffEngine.calculate({ debts: [{ name: 'X', balance: 500, apr: 0, minPayment: 50 }], extra: 0, strategy: 'snowball', snowflakes: [{ amount: 200, month: 1 }] });
  assert.ok(f.months < base.months);
});
test('compareToMinimums reports months saved', () => {
  const r = PayoffEngine.compareToMinimums({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50, strategy: 'snowball'
  });
  assert.strictEqual(r.minimums.months, 10);
  assert.strictEqual(r.plan.months, 7);
  assert.strictEqual(r.monthsSaved, 3);
});
test('extraNeededForDate 5-month worked example', () => {
  const r = PayoffEngine.extraNeededForDate({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    strategy: 'snowball',
    asOf: new Date(2026, 0, 1)
  }, new Date(2026, 5, 1));
  assert.strictEqual(r.extra, 100);
  assert.strictEqual(r.plan.months, 5);
});
test('cashFreedTimeline first kill frees that min', () => {
  const r = PayoffEngine.calculate({
    debts: [{ name: 'S', balance: 200, apr: 0, minPayment: 50 }, { name: 'B', balance: 1000, apr: 0, minPayment: 75 }],
    extra: 50, strategy: 'snowball'
  });
  assert.strictEqual(PayoffEngine.cashFreedTimeline(r)[0].freedMonthly, 50);
});
test('freedomYear piles mins plus extra', () => {
  const r = PayoffEngine.freedomYear({
    debts: [{ name: 'C', balance: 1000, apr: 0, minPayment: 100 }],
    extra: 50
  });
  assert.strictEqual(r.monthlyFreed, 150);
  assert.strictEqual(r.year1, 1800);
  assert.strictEqual(r.year5, 9000);
});

console.log('=== Persistence ===');
test('memory backend round-trip debts', () => {
  const p = Persistence.create(Persistence.createMemoryBackend());
  p.saveDebts([{ name: 'A', balance: 1, apr: 2, minPayment: 3 }]);
  assert.strictEqual(p.loadDebts()[0].name, 'A');
  p.clearDebts();
  assert.strictEqual(p.loadDebts().length, 0);
});
test('theme + history', () => {
  const p = Persistence.create(Persistence.createMemoryBackend());
  p.saveTheme('dark');
  assert.strictEqual(p.loadTheme(), 'dark');
  p.pushHistory({ months: 12, extra: 50, debts: [{}] });
  p.pushHistory({ months: 6, extra: 100, debts: [{}, {}] });
  assert.strictEqual(p.loadHistory().length, 2);
  assert.strictEqual(p.loadHistory()[0].months, 6);
  p.clearHistory();
  assert.strictEqual(p.loadHistory().length, 0);
});
test('game merge defaults', () => {
  const p = Persistence.create(Persistence.createMemoryBackend());
  const g = p.loadGame(Gamification.defaultState());
  assert.strictEqual(g.level, 1);
  p.saveGame({ xp: 40, level: 2, streak: 1, lastCheckin: null, achievements: {}, totalCalcs: 3, maxExtraUsed: 0 });
  assert.strictEqual(p.loadGame(Gamification.defaultState()).level, 2);
});

console.log('=== Gamification ===');
test('checkin starts streak', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'checkin', payload: { today: 'Mon Jan 01 2026', yesterday: 'Sun Dec 31 2025' } });
  assert.strictEqual(r.state.streak, 1);
  assert.ok(r.effects.some(e => e.type === 'persist'));
});
test('consecutive checkin unlocks streak_3', () => {
  let s = Gamification.defaultState();
  s = Gamification.reduce(s, { type: 'checkin', payload: { today: 'Day1', yesterday: 'Day0' } }).state;
  s = Gamification.reduce(s, { type: 'checkin', payload: { today: 'Day2', yesterday: 'Day1' } }).state;
  const r = Gamification.reduce(s, { type: 'checkin', payload: { today: 'Day3', yesterday: 'Day2' } });
  assert.strictEqual(r.state.streak, 3);
  assert.ok(r.state.achievements.streak_3);
});
test('calculation unlocks first_calc', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'calculation', payload: { extra: 0, compared: false } });
  assert.strictEqual(r.state.totalCalcs, 1);
  assert.ok(r.state.achievements.first_calc);
});
test('compare + high extra unlocks', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'calculation', payload: { extra: 350, compared: true } });
  assert.ok(r.state.achievements.compare);
  assert.ok(r.state.achievements.extra_300);
});
test('double checkin same day', () => {
  let s = Gamification.defaultState();
  s = Gamification.reduce(s, { type: 'checkin', payload: { today: 'Same', yesterday: 'Prev' } }).state;
  const r = Gamification.reduce(s, { type: 'checkin', payload: { today: 'Same', yesterday: 'Prev' } });
  assert.strictEqual(r.state.streak, 1);
});
test('unlock target_date achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'target_date' } });
  assert.ok(r.state.achievements.target_date);
});
test('unlock gig_plan achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'gig_plan' } });
  assert.ok(r.state.achievements.gig_plan);
});
test('unlock hour_value achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'hour_value' } });
  assert.ok(r.state.achievements.hour_value);
});
test('unlock first_win_fade achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'first_win_fade' } });
  assert.ok(r.state.achievements.first_win_fade);
});
test('unlock windfall achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'windfall' } });
  assert.ok(r.state.achievements.windfall);
});
test('unlock cut_sub achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'cut_sub' } });
  assert.ok(r.state.achievements.cut_sub);
});
test('unlock cushion achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'cushion' } });
  assert.ok(r.state.achievements.cushion);
});
test('unlock daily_leak achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'daily_leak' } });
  assert.ok(r.state.achievements.daily_leak);
});
test('unlock invest_vs_debt achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'invest_vs_debt' } });
  assert.ok(r.state.achievements.invest_vs_debt);
});
test('unlock burn_clock achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'burn_clock' } });
  assert.ok(r.state.achievements.burn_clock);
});
test('unlock freedom_year achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'freedom_year' } });
  assert.ok(r.state.achievements.freedom_year);
});
test('unlock hybrid_switch achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'hybrid_switch' } });
  assert.ok(r.state.achievements.hybrid_switch);
});
test('unlock fee_drag achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'fee_drag' } });
  assert.ok(r.state.achievements.fee_drag);
});
test('unlock focus_split achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'focus_split' } });
  assert.ok(r.state.achievements.focus_split);
});
test('unlock cashflow_first achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'cashflow_first' } });
  assert.ok(r.state.achievements.cashflow_first);
});
test('unlock thirteenth_pay achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'thirteenth_pay' } });
  assert.ok(r.state.achievements.thirteenth_pay);
});
test('unlock year_one_wins achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'year_one_wins' } });
  assert.ok(r.state.achievements.year_one_wins);
});
test('unlock holiday_deadline achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'holiday_deadline' } });
  assert.ok(r.state.achievements.holiday_deadline);
});
test('unlock rate_daydream achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'rate_daydream' } });
  assert.ok(r.state.achievements.rate_daydream);
});
test('unlock life_stack achievement', () => {
  const r = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'life_stack' } });
  assert.ok(r.state.achievements.life_stack);
});
test('life equivalents use independent unit prices', () => {
  const eq = PayoffEngine.lifeEquivalents(2400, { rent: 1500, groceryWeek: 150, flight: 400 });
  assert.strictEqual(eq.rentMonths, 1.6);
  assert.strictEqual(eq.groceryWeeks, 16);
  assert.strictEqual(eq.flights, 6);
  assert.strictEqual(eq.headline, '1.6 months of rent');
});
test('beat pin reports months and interest gained', () => {
  const b = PayoffEngine.beatPin(
    { months: 20, totalInterest: 800 },
    { months: 28, totalInterest: 1400 }
  );
  assert.strictEqual(b.monthsBeaten, 8);
  assert.strictEqual(b.interestBeaten, 600);
  assert.strictEqual(b.won, true);
});
test('rate cut six points matches worked example', () => {
  const r = PayoffEngine.compareRateCut({
    debts: [{ name: 'Card', balance: 2400, apr: 24, minPayment: 50 }],
    extra: 0,
    strategy: 'snowball'
  }, 6);
  assert.strictEqual(r.monthsSaved, 77);
  assert.strictEqual(r.interestSaved, 3852.46);
});

test('gift month dip on 0% plan adds one month', () => {
  const r = PayoffEngine.giftMonthCost(
    [{ name: 'Card', balance: 2400, apr: 0, minPayment: 100 }],
    100,
    'snowball',
    { monthOfYear: 12, dip: 100, asOf: new Date(2026, 0, 1) }
  );
  assert.strictEqual(r.baselineMonths, 12);
  assert.strictEqual(r.dippedMonths, 13);
  assert.strictEqual(r.monthsAdded, 1);
  assert.strictEqual(r.interestAdded, 0);
  assert.strictEqual(r.dip, 100);
});
test('cliff to next hundred is independent of the engine path', () => {
  assert.strictEqual(PayoffEngine.cliffAmount(250, 100).cliff, 50);
  assert.strictEqual(PayoffEngine.cliffAmount(250, 100).target, 200);
  assert.strictEqual(PayoffEngine.cliffAmount(200, 100).cliff, 100);
  const r = PayoffEngine.balanceCliff(
    [{ name: 'Store', balance: 250, apr: 0, minPayment: 50 }],
    0,
    'snowball',
    { step: 100 }
  );
  assert.strictEqual(r.cliff, 50);
  assert.strictEqual(r.baselineMonths, 5);
  assert.strictEqual(r.rushedMonths, 4);
  assert.strictEqual(r.monthsSaved, 1);
  assert.strictEqual(r.interestSaved, 0);
});
test('unlock gift_month and balance_cliff', () => {
  const g = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'gift_month' } });
  assert.ok(g.state.achievements.gift_month);
  const c = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'balance_cliff' } });
  assert.ok(c.state.achievements.balance_cliff);
});


test('snowball fuel frees the killed minimum into extra', () => {
  const r = PayoffEngine.snowballFuel(
    [{ name: 'Store', balance: 200, apr: 0, minPayment: 50 }, { name: 'Card', balance: 1000, apr: 0, minPayment: 50 }],
    50,
    'snowball'
  );
  assert.strictEqual(r.kills[0].name, 'Store');
  assert.strictEqual(r.kills[0].month, 2);
  assert.strictEqual(r.kills[0].freed, 50);
  assert.strictEqual(r.kills[0].extraAfter, 100);
  assert.strictEqual(r.kills[1].name, 'Card');
  assert.strictEqual(r.kills[1].month, 11);
  assert.strictEqual(r.doubleAtMonth, 2);
  assert.strictEqual(r.freedTotal, 100);
});
test('freedom name is weekday plus season band', () => {
  const n = PayoffEngine.freedomName(new Date(2026, 4, 15));
  assert.strictEqual(n.weekday, 'Friday');
  assert.strictEqual(n.band, 'mid');
  assert.strictEqual(n.season, 'spring');
  assert.strictEqual(n.phrase, 'Friday in mid spring');
});
test('unlock snowball_fuel and freedom_name', () => {
  const f = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'snowball_fuel' } });
  assert.ok(f.state.achievements.snowball_fuel);
  const n = Gamification.reduce(Gamification.defaultState(), { type: 'unlock', payload: { id: 'freedom_name' } });
  assert.ok(n.state.achievements.freedom_name);
});

console.log(process.exitCode ? 'Done with failures' : 'All architecture tests passed');


// Countdown daysUntil
const Countdown = require('./app-countdown.js');
test('daysUntil returns 0 for past or today', () => {
  const past = new Date(Date.now() - 86400000 * 2);
  assert.strictEqual(Countdown.daysUntil(past), 0);
});
test('daysUntil returns positive for future', () => {
  const future = new Date(Date.now() + 86400000 * 10);
  const d = Countdown.daysUntil(future);
  assert.ok(d >= 9 && d <= 11);
});
