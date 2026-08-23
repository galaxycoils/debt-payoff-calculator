  // Theme
  var themeToggle = document.getElementById('theme-toggle');
  function updateThemeUI() {
    var isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
    document.getElementById('theme-label').textContent = isDark ? 'Light' : 'Dark';
  }
  function setTheme(mode) {
    if (mode === 'dark') { document.documentElement.classList.add('dark'); localStorage.setItem('debtPayoffTheme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('debtPayoffTheme', 'light'); }
    updateThemeUI();
  }
  themeToggle.addEventListener('click', function () {
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });
  updateThemeUI();

  var GAME_KEY = 'debtPayoffGame';
  var defaultGame = { xp: 0, level: 1, streak: 0, lastCheckin: null, achievements: {}, totalCalcs: 0, maxExtraUsed: 0 };
  function loadGame() {
    try { var raw = localStorage.getItem(GAME_KEY); if (raw) return Object.assign({}, defaultGame, JSON.parse(raw)); } catch (e) {}
    return Object.assign({}, defaultGame);
  }
  function saveGame(g) { localStorage.setItem(GAME_KEY, JSON.stringify(g)); }
  var game = loadGame();
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
    { id: 'finish_line', name: 'Finish Line', desc: 'Plan with 3 months or fewer remaining', xp: 90 }
  ];
  // RESTORED - see next commit for full file if truncated
  console.error('app-inline incomplete restore - use git');
