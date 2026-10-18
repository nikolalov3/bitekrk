/* BiteKrakow, strona glowna: "Gdzie nocujesz?" (polecenia w okolicy) + poziome karuzele.
   Dane lokali: /data/map-venues.json (generuje scripts/gen-venues.mjs). */
(function () {
  'use strict';

  /* ---------- karuzele: strzalki + przewijanie o szerokosc widoku ---------- */
  function initRails() {
    var rails = document.querySelectorAll('.rail');
    Array.prototype.forEach.call(rails, function (rail) {
      var track = rail.querySelector('.rail-track');
      var scope = rail.closest('section') || rail;
      var prev = scope.querySelector('.rail-prev'), next = scope.querySelector('.rail-next');
      if (!track || rail._bkSync) return;
      var max = 0, raf = 0;
      function measure() { max = track.scrollWidth - track.clientWidth; }
      // Tylko stan przyciskow: zadnych klas na sekcji, zeby nie przeliczac stylu 30 kart.
      function apply() {
        raf = 0;
        if (!prev || !next) return;
        var x = Math.abs(track.scrollLeft);
        prev.disabled = x <= 2;
        next.disabled = x >= max - 2;
        var nav = prev.parentNode; if (nav) nav.style.visibility = max <= 4 ? 'hidden' : '';
      }
      function sync(remeasure) { if (remeasure) measure(); if (!raf) raf = requestAnimationFrame(apply); }
      function step(dir) {
        var rtl = getComputedStyle(track).direction === 'rtl';
        track.scrollBy({ left: (rtl ? -dir : dir) * Math.max(240, track.clientWidth * 0.8), behavior: 'smooth' });
      }
      if (prev) prev.addEventListener('click', function () { step(-1); });
      if (next) next.addEventListener('click', function () { step(1); });
      track.addEventListener('scroll', function () { sync(false); }, { passive: true });
      window.addEventListener('resize', function () { sync(true); }, { passive: true });
      rail._bkSync = sync;
      sync(true);
    });
  }

  /* ---------- "Gdzie nocujesz?" ---------- */
  var box = document.getElementById('stay');
  if (!box) { initRails(); return; }

  var AR = box.getAttribute('data-lang') === 'ar';
  var T = AR ? {
    walk: function (m) { return m + ' د مشيًا'; }, you: 'بالقرب منك', reviews: 'مراجعة', ours: 'تقييمنا',
    guide: 'في الدليل', profile: 'الملف', intro: function (n, a) { return n + ' أماكن ننصح بها على بعد مشي من ' + a; },
    locating: 'جارٍ تحديد موقعك…', denied: 'لم نتمكن من تحديد موقعك. اختر حيًا أعلاه.', map: 'كل الأماكن على الخريطة',
    type: { cafe: 'مقهى', food: 'مطعم', bar: 'بار' }, partner: 'شريك'
  } : {
    walk: function (m) { return m + ' min walk'; }, you: 'you', reviews: 'reviews', ours: 'Our score',
    guide: 'In the guide', profile: 'Profile', intro: function (n, a) { return n + ' places we recommend within a walk of ' + a; },
    locating: 'Finding you…', denied: 'We could not get your location. Pick an area above.', map: 'Everything on the map',
    type: { cafe: 'Cafe', food: 'Restaurant', bar: 'Bar' }, partner: 'Partner'
  };

  var chips = box.querySelectorAll('.stay-chip[data-lat]');
  var geoBtn = box.querySelector('.stay-geo');
  var track = box.querySelector('.rail-track');
  var lead = box.querySelector('.stay-lead');
  var venues = null, current = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dist(a, b, c, d) {
    var R = 6371000, toR = Math.PI / 180, dLat = (c - a) * toR, dLng = (d - b) * toR;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function stars(r) {
    var w = Math.max(0, Math.min(100, (r / 5) * 100));
    return '<span class="k-stars" aria-hidden="true"><span class="k-s0">★★★★★</span><span class="k-s1" style="width:' + w + '%">★★★★★</span></span>';
  }
  function photo(v) { return v.img ? v.img : '/api/photo?slug=' + encodeURIComponent(v.s) + '&w=480'; }

  function pick(lat, lng) {
    var all = venues.map(function (v) { return { v: v, d: dist(lat, lng, v.lat, v.lng) }; });
    var radius = 1500, list = all.filter(function (x) { return x.d <= radius; });
    if (list.length < 8) { radius = 2600; list = all.filter(function (x) { return x.d <= radius; }); }
    if (list.length < 8) { list = all.slice().sort(function (p, q) { return p.d - q.d; }).slice(0, 12); }
    list.forEach(function (x) {
      var v = x.v, base = v.sc ? v.sc : (v.r ? v.r * 1.6 : 5);
      x.score = base + (v.r ? Math.min(v.r, 5) * 0.5 : 0) + Math.log10((v.c || 0) + 10) * 0.4 - x.d / 450 + (v.cl && x.d <= 1300 ? 3.2 : 0);
    });
    list.sort(function (p, q) { return q.score - p.score; });
    // roznorodnosc: max 5 jednej kategorii w osmiu
    var out = [], count = {};
    for (var i = 0; i < list.length && out.length < 8; i++) {
      var t = list[i].v.t; if ((count[t] || 0) >= 5) continue;
      count[t] = (count[t] || 0) + 1; out.push(list[i]);
    }
    return out;
  }

  function card(x) {
    var v = x.v, min = Math.max(1, Math.round(x.d / 80));
    var kicker = [v.k || T.type[v.t] || '', T.walk(min)].filter(Boolean).join(' · ');
    var rate = v.r ? '<span class="sc-rate">' + stars(v.r) + '<b>' + v.r.toFixed(1) + '</b><span>' + (v.c ? ' (' + v.c + ')' : '') + '</span></span>' : '';
    var ours = v.sc ? '<span class="sc-ours">' + T.ours + ' <b>' + v.sc + '/10</b></span>' : '';
    return '<a class="rail-card stay-card' + (v.cl ? ' is-partner' : '') + '" href="/restaurant/' + esc(v.s) + '/">' +
      '<span class="rc-photo"><img src="' + esc(photo(v)) + '" alt="" loading="lazy" decoding="async" width="480" height="320" onerror="this.parentNode.classList.add(\'noimg\')"></span>' +
      '<span class="rc-body">' +
      '<span class="rc-kicker">' + esc(kicker) + '</span>' +
      '<span class="rc-title">' + esc(v.n.replace(/\s*\(.*?\)\s*/g, ' ').trim()) + '</span>' +
      '<span class="rc-meta">' + rate + ours + '</span>' +
      (v.a ? '<span class="rc-addr">' + esc(v.a) + (v.d ? ', ' + esc(v.d) : '') + '</span>' : '') +
      '</span></a>';
  }

  function render(lat, lng, label) {
    if (!venues) return;
    var list = pick(lat, lng);
    track.innerHTML = list.map(card).join('') +
      '<a class="rail-card stay-more" href="/map/"><span class="rc-body"><span class="rc-title">' + T.map + (AR ? ' ←' : ' →') + '</span></span></a>';
    track.scrollTo({ left: 0 });
    if (lead) lead.textContent = T.intro(list.length, label);
    var rail = box.querySelector('.rail'); if (rail && rail._bkSync) setTimeout(function () { rail._bkSync(true); }, 60);
  }

  function select(chip, persist) {
    Array.prototype.forEach.call(chips, function (c) { var on = c === chip; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (geoBtn) geoBtn.classList.remove('on');
    current = { lat: +chip.getAttribute('data-lat'), lng: +chip.getAttribute('data-lng'), label: chip.getAttribute('data-label') || chip.textContent.trim() };
    if (persist) { try { localStorage.setItem('bk-stay', chip.getAttribute('data-key') || ''); } catch (e) {} }
    render(current.lat, current.lng, current.label);
  }

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () { select(chip, true); });
  });
  if (geoBtn) {
    if (!('geolocation' in navigator)) geoBtn.hidden = true;
    geoBtn.addEventListener('click', function () {
      var old = geoBtn.textContent; geoBtn.textContent = T.locating; geoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        geoBtn.textContent = old; geoBtn.disabled = false;
        Array.prototype.forEach.call(chips, function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
        geoBtn.classList.add('on');
        try { localStorage.setItem('bk-stay', 'geo'); } catch (e) {}
        render(pos.coords.latitude, pos.coords.longitude, T.you);
      }, function () {
        geoBtn.textContent = old; geoBtn.disabled = false;
        if (lead) lead.textContent = T.denied;
      }, { timeout: 8000, maximumAge: 600000 });
    });
  }

  fetch('/data/map-venues.json').then(function (r) { return r.json(); }).then(function (data) {
    venues = (data.venues || []).filter(function (v) { return v.lat && v.lng; });
    var saved = null; try { saved = localStorage.getItem('bk-stay'); } catch (e) {}
    var start = null;
    Array.prototype.forEach.call(chips, function (c) { if (saved && c.getAttribute('data-key') === saved) start = c; });
    if (!start) start = chips[0];
    if (start) select(start, false);
    initRails();
  }).catch(function () { box.classList.add('stay-fallback'); initRails(); });
})();
