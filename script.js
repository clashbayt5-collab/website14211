(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' '); };

  /* ---------- Шапка и мобильное меню ---------- */
  var header = document.querySelector('.header');
  var burger = document.querySelector('.burger');
  var mobileNav = document.getElementById('mobileNav');

  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    burger.setAttribute('aria-label', open ? 'Открыть меню' : 'Закрыть меню');
    mobileNav.classList.toggle('is-open', !open);
  });
  mobileNav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      mobileNav.classList.remove('is-open');
    }
  });

  /* ---------- Слайдер «до и после» ---------- */
  document.querySelectorAll('.ba__frame').forEach(function (frame) {
    var range = frame.querySelector('.ba__range');
    var update = function () { frame.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', update);
    update();
  });

  /* ---------- Калькулятор рассрочки ---------- */
  var sumInput = document.getElementById('calcSum');
  var sumOut = document.getElementById('calcSumOut');
  var monthlyEl = document.getElementById('calcMonthly');
  var termInputs = document.querySelectorAll('input[name="term"]');
  var shown = 0;
  var rafId = null;

  function animateTo(target) {
    if (rafId) cancelAnimationFrame(rafId);
    var from = shown;
    var start = performance.now();
    var duration = 450;
    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      shown = from + (target - from) * eased;
      monthlyEl.textContent = fmt(shown);
      if (t < 1) rafId = requestAnimationFrame(step);
      else { shown = target; rafId = null; }
    }
    rafId = requestAnimationFrame(step);
  }

  function recalc() {
    var sum = Number(sumInput.value);
    var term = Number(document.querySelector('input[name="term"]:checked').value);
    var pct = (sum - sumInput.min) / (sumInput.max - sumInput.min) * 100;
    sumInput.style.setProperty('--fill', pct + '%');
    sumOut.textContent = fmt(sum) + ' ₽';
    animateTo(Math.ceil(sum / term));
  }
  sumInput.addEventListener('input', recalc);
  termInputs.forEach(function (r) { r.addEventListener('change', recalc); });
  recalc();

  /* ---------- Таймлайн: линия прорисовывается при прокрутке ---------- */
  var timeline = document.getElementById('timeline');
  var tlSvg = timeline.querySelector('.timeline__svg');
  var tlLine = timeline.querySelector('.timeline__line');
  var steps = Array.prototype.slice.call(timeline.querySelectorAll('.tl-step'));
  var lineLength = 0;
  var dotOffsets = [];

  function measureTimeline() {
    lineLength = tlSvg.getBoundingClientRect().height;
    tlLine.style.strokeDasharray = lineLength;
    var svgTop = tlSvg.getBoundingClientRect().top;
    dotOffsets = steps.map(function (s) {
      var dot = s.querySelector('.tl-step__dot').getBoundingClientRect();
      return dot.top + dot.height / 2 - svgTop;
    });
    drawTimeline();
  }

  function drawTimeline() {
    var rect = tlSvg.getBoundingClientRect();
    // Линия «доходит» до точки, когда та пересекает 60% высоты экрана
    var trigger = window.innerHeight * 0.6;
    var drawn = Math.max(0, Math.min(lineLength, trigger - rect.top));
    tlLine.style.strokeDashoffset = lineLength - drawn;
    steps.forEach(function (s, i) {
      s.classList.toggle('is-active', drawn >= dotOffsets[i] - 1);
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { drawTimeline(); ticking = false; });
    }
  }, { passive: true });
  window.addEventListener('resize', measureTimeline);
  window.addEventListener('load', measureTimeline);
  measureTimeline();

  /* ---------- Карточки врачей: тап на сенсорных экранах ---------- */
  document.querySelectorAll('.doctor').forEach(function (card) {
    card.addEventListener('click', function () {
      if (window.matchMedia('(hover: none)').matches) card.classList.toggle('is-open');
    });
  });

  /* ---------- Появление блоков ---------- */
  var revealTargets = document.querySelectorAll('.section__head, .service, .ba, .calc__card, .doctor, .review, .form, .booking__info, .calc__info');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Форма записи (заявки пока не отправляются) ---------- */
  var form = document.getElementById('bookingForm');
  var phone = document.getElementById('fPhone');

  function maskPhone(value) {
    var d = value.replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  phone.addEventListener('input', function () {
    phone.value = phone.value ? maskPhone(phone.value) : '';
  });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 '; });
  phone.addEventListener('blur', function () { if (phone.value.replace(/\D/g, '').length <= 1) phone.value = ''; });

  function validate(field) {
    var wrap = field.closest('.field');
    var ok;
    if (field === phone) ok = phone.value.replace(/\D/g, '').length === 11;
    else ok = field.value.trim() !== '';
    wrap.classList.toggle('has-error', !ok);
    return ok;
  }
  form.querySelectorAll('input, select').forEach(function (f) {
    f.addEventListener('change', function () { if (f.closest('.has-error')) validate(f); });
    f.addEventListener('input', function () { if (f.closest('.has-error')) validate(f); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = [document.getElementById('fName'), phone, document.getElementById('fService'), document.getElementById('fTime')];
    var valid = fields.map(validate).every(Boolean);
    if (!valid) {
      form.querySelector('.has-error input, .has-error select').focus();
      return;
    }
    // Отправка заявок будет подключена позже
    form.querySelector('.form__success').hidden = false;
  });
})();
