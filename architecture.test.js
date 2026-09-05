const assert = require('assert');
const PayoffEngine = require('./payoff-engine.js');
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

console.log(process.exitCode ? 'Done with failures' : 'All architecture tests passed');
