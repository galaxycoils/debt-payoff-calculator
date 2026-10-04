/**
 * Come-back nudge — overdue banner + optional browser reminder. localStorage only.
 */
(function () {
  'use strict';
  var KEY = 'debtPayoffNudge';
  var INTERVAL = 7;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function ensureFont() {
    if (document.getElementById('jakarta-font')) return;
    var link = document.createElement('link');
    link.id = 'jakarta-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap';
    document.head.appendChild(link);
    document.body.style.fontFamily = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  }

  function ensureBanner() {
    if (document.getElementById('nudge-banner')) return;
    var main = document.getElementById('main');
    if (!main) return;
    var banner = document.createElement('div');
    banner.id = 'nudge-banner';
    banner.className = 'hidden mb-6 rounded-[2rem] bg-black/5 dark:bg-white/5 p-1.5';
    banner.innerHTML =
      '<div class="rounded-[1.6rem] bg-[var(--card)] px-5 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-wrap items-center justify-between gap-3">' +
      '<div><p class="text-[10px] uppercase tracking-[0.2em] text-accent">Come back</p>' +
      '<p id="nudge-copy" class="text-sm font-semibold mt-1"></p></div>' +
      '<div class="flex gap-2">' +
      '<button type="button" id="nudge-back" class="rounded-full px-4 py-2 min-h-[44px] text-sm font-semibold text-white" style="background:var(--accent)">I am back</button>' +
      '<button type="button" id="nudge-remind" class="rounded-full px-4 py-2 min-h-[44px] text-sm bg-black/5 dark:bg-white/5">Remind me</button>' +
      '</div></div>';
    main.insertBefore(banner, main.firstChild);
    document.getElementById('nudge-back').addEventListener('click', onBack);
    document.getElementById('nudge-remind').addEventListener('click', onRemind);
  }

  function paint() {
    if (typeof PayoffNudge === 'undefined') return;
    ensureBanner();
    var status = PayoffNudge.evaluateNudge(load(), Date.now(), INTERVAL);
    var banner = document.getElementById('nudge-banner');
    var copy = document.getElementById('nudge-copy');
    if (!banner || !copy) return;
    if (status.shouldArm) {
      save(PayoffNudge.markReturn(null, Date.now(), INTERVAL));
      status = PayoffNudge.evaluateNudge(load(), Date.now(), INTERVAL);
    }
    if (status.overdue) {
      banner.classList.remove('hidden');
      copy.textContent = status.daysLate === 0
        ? 'Your 7-day plan check is due. One look keeps the streak honest.'
        : 'It has been ' + status.daysLate + ' day' + (status.daysLate === 1 ? '' : 's') + ' past your plan check. Drag the extra slider again.';
    } else {
      banner.classList.add('hidden');
    }
  }

  function onBack() {
    var next = PayoffNudge.markReturn(load(), Date.now(), INTERVAL);
    save(next);
    paint();
    if (typeof window.dispatchGame === 'function') window.dispatchGame('unlock', { id: 'comeback' });
    if (typeof showToast === 'function') showToast('Check-in saved. Next look in 7 days.');
    var btn = document.getElementById('checkin-btn');
    if (btn) btn.click();
  }

  function onRemind() {
    if (!('Notification' in window)) {
      if (typeof showToast === 'function') showToast('This browser has no notifications. The banner still waits here.');
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm === 'granted') {
        var when = PayoffNudge.evaluateNudge(load(), Date.now(), INTERVAL);
        try {
          new Notification('Debt plan check', { body: 'Your extra-payment plan is ready for another look.' });
        } catch (e) {}
        if (typeof showToast === 'function') showToast('Reminder armed in this browser. Due in ' + when.daysUntil + ' days.');
      }
    });
  }

  function registerAchievements() {
    if (!window.Gamification || !Gamification.ACHIEVEMENTS) return;
    var ids = Gamification.ACHIEVEMENTS.map(function (a) { return a.id; });
    if (ids.indexOf('next_dollar') === -1) {
      Gamification.ACHIEVEMENTS.push({ id: 'next_dollar', name: 'Next Dollar', desc: 'See what the next $25 of extra buys', xp: 35 });
    }
    if (ids.indexOf('comeback') === -1) {
      Gamification.ACHIEVEMENTS.push({ id: 'comeback', name: 'Came Back', desc: 'Return for a 7-day plan check', xp: 45 });
    }
  }

  function boot() {
    registerAchievements();
    ensureFont();
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
