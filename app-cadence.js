/**
 * Injects biweekly toggle, patches engine inputs, binds Calculate.
 */
(function () {
  'use strict';

  function cadenceFromUi() {
    var box = document.getElementById('cadence');
    return box && box.checked ? 'biweekly' : 'monthly';
  }

  function injectToggle() {
    if (document.getElementById('cadence')) return;
    var extra = document.getElementById('extra-slider');
    if (!extra || !extra.parentNode) return;
    var label = document.createElement('label');
    label.className = 'mt-4 flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer';
    label.innerHTML = '<input type="checkbox" id="cadence" class="mt-1 h-4 w-4 rounded border-slate-300" /><span><span class="font-medium">Pay biweekly</span> — 26 half-payments a year (one extra monthly payment). Recalculates with the slider.</span>';
    extra.parentNode.appendChild(label);
  }

  function injectFooter() {
    var foot = document.querySelector('footer p.mt-2');
    if (!foot) return;
    function add(href, text) {
      if (foot.querySelector('a[href="' + href + '"]')) return;
      foot.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.className = 'underline hover:text-accent';
      a.href = href;
      a.textContent = text;
      foot.appendChild(a);
    }
    add('debt-consolidation-vs-payoff.html', 'Consolidation vs payoff');
    add('biweekly-vs-monthly-payments.html', 'Biweekly payments');
  }

  function patchEngine() {
    if (typeof PayoffEngine === 'undefined' || PayoffEngine._cadencePatched) return;
    PayoffEngine._cadencePatched = true;
    function wrap(name) {
      var orig = PayoffEngine[name];
      if (typeof orig !== 'function') return;
      PayoffEngine[name] = function (input, second) {
        if (input && typeof input === 'object' && !input.cadence) {
          input = Object.assign({}, input, { cadence: cadenceFromUi() });
        }
        return orig.call(PayoffEngine, input, second);
      };
    }
    wrap('calculate');
    wrap('compareToMinimums');
    wrap('extraNeededForDate');
    wrap('compareBalanceTransfer');
    wrap('compareConsolidation');
    wrap('compareAprShock');
    wrap('comparePaymentHoliday');
  }

  function bind() {
    injectToggle();
    injectFooter();
    patchEngine();
    var box = document.getElementById('cadence');
    if (box && !box._bound) {
      box._bound = true;
      box.addEventListener('change', function () {
        if (box.checked && typeof window.dispatchGame === 'function') {
          window.dispatchGame('unlock', { id: 'biweekly' });
        }
        if (typeof window.runCalc === 'function' && window._lastResultsShown) window.runCalc(true);
      });
    }
    var calcBtn = document.getElementById('calculate-btn') || document.getElementById('calculate');
    if (calcBtn && !calcBtn._cadenceBound) {
      calcBtn._cadenceBound = true;
      calcBtn.addEventListener('click', function () {
        if (typeof window.runCalc === 'function') window.runCalc(false);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
