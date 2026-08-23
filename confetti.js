/**
 * Confetti celebration when near debt-free.
 * Observes #celebration-banner; fires intensity by months remaining.
 */
(function () {
  'use strict';

  function launchConfetti(intensity) {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3dbdbd', '#f472b6', '#34d399'];
    var count = intensity === 'full' ? 140 : intensity === 'medium' ? 70 : 36;
    var pieces = [];
    for (var i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.4,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        color: colors[i % colors.length],
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vr: -0.15 + Math.random() * 0.3,
        opacity: 0.85 + Math.random() * 0.15
      });
    }
    var start = performance.now();
    var duration = intensity === 'full' ? 3200 : 2200;
    if (window._confettiRaf) cancelAnimationFrame(window._confettiRaf);
    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (t > duration) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        window._confettiRaf = null;
        return;
      }
      var fade = t > duration - 600 ? 1 - (t - (duration - 600)) / 600 : 1;
      pieces.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity * fade;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      window._confettiRaf = requestAnimationFrame(frame);
    }
    window._confettiRaf = requestAnimationFrame(frame);
  }

  window.launchConfetti = launchConfetti;

  function boot() {
    var banner = document.getElementById('celebration-banner');
    if (!banner || typeof MutationObserver === 'undefined') return;
    var lastFired = 0;
    var mo = new MutationObserver(function () {
      if (banner.classList.contains('hidden')) return;
      var now = Date.now();
      if (now - lastFired < 1500) return;
      lastFired = now;
      var msg = document.getElementById('celebration-msg');
      var title = document.getElementById('celebration-title');
      var months = 18;
      if (msg) {
        var m = (msg.textContent || '').match(/(\d+)\s*month/);
        if (m) months = parseInt(m[1], 10);
      }
      if (months <= 3) {
        if (title) title.textContent = 'Finish line in sight!';
        launchConfetti('full');
        if (typeof unlockAchievement === 'function') unlockAchievement('finish_line');
      } else if (months <= 12) {
        launchConfetti('medium');
      } else {
        launchConfetti('light');
      }
    });
    mo.observe(banner, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
