/* BiteKrakow: stan "na zywo" liczony w przegladarce, w czasie Krakowa (Europe/Warsaw).
   - Wydarzenia: element z data-start (+ opcjonalnie data-end, data-daily="HH:MM-HH:MM")
     dostaje plakietke .live-badge: "Live now", "Today", "Tomorrow", "This weekend";
     przeszle z data-hide-past znikaja.
   - Lokale: element z data-hours='[[dzien,otwarcie,zamkniecie],...]' (dzien 0 = niedziela,
     minuty od polnocy, zamkniecie po polnocy = wiecej niz 1440) dostaje "Open now · until 02:00"
     albo "Opens 17:00". Przycisk [data-open-filter] chowa zamkniete wiersze.
   Bez zaleznosci, odswieza sie co minute. Tekst plakietek: EN albo PL (lang dokumentu). */
(function () {
  'use strict';
  var PL = (document.documentElement.lang || '').indexOf('pl') === 0;
  var T = PL ? { live: 'Teraz', today: 'Dziś', tomorrow: 'Jutro', weekend: 'W ten weekend', open: 'Otwarte', until: 'do', opens: 'Otwarcie', tmr: 'jutro', closed: 'Zamknięte', days: ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob'] }
             : { live: 'Live now', today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', open: 'Open now', until: 'until', opens: 'Opens', tmr: 'tomorrow', closed: 'Closed', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

  // Czas "teraz" w Krakowie jako: dzien tygodnia (0=nd), minuty od polnocy, data YYYY-MM-DD
  function nowWaw() {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    var p = {}; f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
    return { wd: wd, min: (+p.hour % 24) * 60 + +p.minute, date: p.year + '-' + p.month + '-' + p.day };
  }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; return (m / 60 | 0) + ':' + ('0' + m % 60).slice(-2); }
  function badge(el, cls, text) {
    var b = el.querySelector(':scope > .live-badge, .live-slot > .live-badge');
    var slot = el.querySelector('.live-slot') || el;
    if (!text) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); slot.insertBefore(b, slot.firstChild); }
    b.className = 'live-badge ' + cls; b.textContent = text;
  }

  function events(n) {
    var nowMs = Date.now();
    document.querySelectorAll('[data-start]').forEach(function (el) {
      var s = Date.parse(el.getAttribute('data-start')), e = Date.parse(el.getAttribute('data-end') || el.getAttribute('data-start'));
      var daily = el.getAttribute('data-daily'); // np. "11:00-17:00" dla jednodniowych z godzinami
      var sDay = el.getAttribute('data-start').slice(0, 10), eDay = (el.getAttribute('data-end') || el.getAttribute('data-start')).slice(0, 10);
      if (nowMs > e) { if (el.hasAttribute('data-hide-past')) el.hidden = true; badge(el, '', ''); return; }
      el.hidden = false;
      var live = nowMs >= s && nowMs <= e;
      if (live && daily) { var h = daily.split('-').map(function (t) { var q = t.split(':'); return +q[0] * 60 + +q[1]; }); live = n.min >= h[0] && n.min < h[1]; }
      if (live) return badge(el, 'is-live', T.live);
      if (n.date >= sDay && n.date <= eDay) return badge(el, 'is-today', T.today);
      if (sDay === addDays(n.date, 1)) return badge(el, 'is-soon', T.tomorrow);
      var toSat = (6 - n.wd + 7) % 7, sat = addDays(n.date, toSat), sun = addDays(sat, 1);
      if (sDay >= addDays(n.date, 1) && sDay <= sun && n.wd >= 4) return badge(el, 'is-soon', T.weekend);
      badge(el, '', '');
    });
  }

  function venues(n) {
    var anyOpen = false;
    document.querySelectorAll('[data-hours]').forEach(function (el) {
      var H; try { H = JSON.parse(el.getAttribute('data-hours')); } catch (e) { return; }
      var open = null, next = null;
      H.forEach(function (r) {
        var d = r[0], o = r[1], c = r[2];
        // dzisiejszy przedzial albo wczorajszy, ktory przeszedl przez polnoc
        if (d === n.wd && n.min >= o && n.min < c) open = c;
        if (d === (n.wd + 6) % 7 && c > 1440 && n.min < c - 1440) open = c;
      });
      // najblizsze otwarcie: dzis pozniej albo w kolejnych dniach
      for (var k = 0; k < 8 && next === null; k++) {
        var wd = (n.wd + k) % 7, best = null;
        H.forEach(function (r) { if (r[0] === wd && (k > 0 || r[1] > n.min) && (best === null || r[1] < best)) best = r[1]; });
        if (best !== null) next = { k: k, wd: wd, m: best };
      }
      el.classList.toggle('is-open', open !== null);
      if (open !== null) { anyOpen = true; badge(el, 'is-open', T.open + ' · ' + T.until + ' ' + hhmm(open)); }
      else if (next) badge(el, 'is-later', T.opens + ' ' + (next.k === 0 ? '' : next.k === 1 ? T.tmr + ' ' : T.days[next.wd] + ' ') + hhmm(next.m));
      else badge(el, 'is-closed', T.closed);
    });
    document.querySelectorAll('[data-open-count]').forEach(function (el) {
      // licznik w obrebie sekcji, w ktorej stoi przycisk filtra (np. tabela), nie calej strony
      var scope = el.closest('[id]') || document;
      el.textContent = scope.querySelectorAll('[data-hours].is-open').length;
    });
  }

  function tick() { var n = nowWaw(); events(n); venues(n); }
  document.querySelectorAll('[data-open-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var scope = document.getElementById(btn.getAttribute('data-open-filter')) || document;
      scope.classList.toggle('only-open', on);
    });
  });
  tick();
  setInterval(tick, 60000);
})();
