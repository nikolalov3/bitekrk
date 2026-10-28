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

  var LANG = box.getAttribute('data-lang') || 'en', AR = LANG === 'ar';
  var TT = {
    ar: {
    walk: function (m) { return m + ' د مشيًا'; }, you: 'موقعك', reviews: 'مراجعة', ours: 'تقييمنا',
    guide: 'في الدليل', profile: 'الملف', intro: function (n, a) { return n + ' أماكن ننصح بها على بعد مشي من ' + a; },
    locating: 'جارٍ تحديد موقعك…', denied: 'لم نتمكن من تحديد موقعك. اختر حي فندقك أعلاه.', map: 'كل الأماكن على الخريطة',
    far: 'يبدو أنك خارج كراكوف الآن. اختر حي فندقك أعلاه.', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل القائمة. جرّب الخريطة.',
    type: { cafe: 'مقهى', food: 'مطعم', bar: 'بار' }, partner: 'شريك'
  },
    pl: {
      walk: function (m) { return m + ' min pieszo'; }, you: 'Ty', reviews: 'opinii', ours: 'Nasza ocena',
      guide: 'W przewodniku', profile: 'Profil', intro: function (n, a) { return n + ' polecanych miejsc w zasięgu spaceru: ' + a; },
      locating: 'Ustalam lokalizację…', denied: 'Nie udało się ustalić lokalizacji. Wybierz okolicę hotelu powyżej.', map: 'Wszystko na mapie',
      far: 'Wygląda na to, że jesteś teraz poza Krakowem. Wybierz okolicę hotelu powyżej.', loading: 'Ładowanie…', error: 'Nie udało się wczytać listy. Spróbuj mapy.',
      type: { cafe: 'Kawiarnia', food: 'Restauracja', bar: 'Bar' }, partner: 'Partner'
    },
    zh: {
      walk: function (m) { return '步行 ' + m + ' 分钟'; }, you: '你', reviews: '条评价', ours: '我们的评分',
      guide: '收录于指南', profile: '详情', intro: function (n, a) { return a + ' 步行范围内我们推荐的 ' + n + ' 个地点'; },
      locating: '正在定位…', denied: '无法获取你的位置。请在上方选择酒店所在的区域。', map: '在地图上查看全部',
      far: '你现在似乎不在克拉科夫。请在上方选择酒店所在的区域。', loading: '加载中…', error: '列表加载失败，请改用地图。',
      type: { cafe: '咖啡馆', food: '餐厅', bar: '酒吧' }, partner: '合作伙伴'
    },
    en: {
    walk: function (m) { return m + ' min walk'; }, you: 'you', reviews: 'reviews', ours: 'Our score',
    guide: 'In the guide', profile: 'Profile', intro: function (n, a) { return n + ' places we recommend within a walk of ' + a; },
    locating: 'Finding you…', denied: 'We could not get your location. Pick the area of your hotel above.', map: 'Everything on the map',
    far: 'You seem to be outside Krakow right now. Pick the area of your hotel above.', loading: 'Loading…', error: 'Could not load the list. Try the map instead.',
    type: { cafe: 'Cafe', food: 'Restaurant', bar: 'Bar' }, partner: 'Partner'
  }
  };
  var T = TT[LANG] || TT.en;

  var chips = box.querySelectorAll('.stay-chip[data-lat]');
  var geoBtn = box.querySelector('.stay-geo');
  var track = box.querySelector('.rail-track');
  var lead = box.querySelector('.stay-lead');
  var railBox = box.querySelector('.rail');
  var venues = null, loading = null;
  var CENTER = { lat: 50.0614, lng: 19.9366 };

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
  // Na glownej: wybrane zdjecie wnetrza/fasady z Google (p=0), jesli jest, potem wlasne, potem domyslne.
  function photo(v) { return v.pa ? '/api/photo?slug=' + encodeURIComponent(v.s) + '&p=0&w=480' : v.img ? v.img : '/api/photo?slug=' + encodeURIComponent(v.s) + '&w=480'; }

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
      '<span class="rc-photo"><img src="' + esc(photo(v)) + '" alt="' + esc(v.pa ? v.palt || '' : '') + '" loading="lazy" decoding="async" width="480" height="320" onerror="this.parentNode.classList.add(\'noimg\')">' +
      (v.pa ? '<span class="rc-credit">' + ({ ar: 'الصورة: ', pl: 'Zdjęcie: ', zh: '照片：' }[LANG] || 'Photo: ') + esc(v.pa) + ' / Google</span>' : '') + '</span>' +
      '<span class="rc-body">' +
      '<span class="rc-kicker">' + esc(kicker) + '</span>' +
      '<span class="rc-title">' + esc(v.n.replace(/\s*\(.*?\)\s*/g, ' ').trim()) + '</span>' +
      '<span class="rc-meta">' + rate + ours + '</span>' +
      (v.a ? '<span class="rc-addr">' + esc(v.a) + (v.d ? ', ' + esc(v.d) : '') + '</span>' : '') +
      '</span></a>';
  }

  // Dane lokali pobieramy dopiero po pierwszym kliknieciu (nic na starcie strony).
  function load() {
    if (!loading) loading = fetch('/data/map-venues.json?v=' + (box.getAttribute('data-venues-v') || '')).then(function (r) { return r.json(); }).then(function (data) {
      venues = (data.venues || []).filter(function (v) { return v.lat && v.lng; });
    });
    return loading;
  }
  function show(lat, lng, label) {
    if (lead) lead.textContent = T.loading;
    load().then(function () { render(lat, lng, label); }, function () { loading = null; if (lead) lead.textContent = T.error; });
  }

  function render(lat, lng, label) {
    if (!venues) return;
    var list = pick(lat, lng);
    if (railBox) railBox.hidden = false;
    track.innerHTML = list.map(card).join('') +
      '<a class="rail-card stay-more" href="' + ({ ar: '/ar/map/', pl: '/pl/map/', zh: '/zh/map/' }[LANG] || '/map/') + '"><span class="rc-body"><span class="rc-title">' + T.map + (AR ? ' ←' : ' →') + '</span></span></a>';
    track.scrollTo({ left: 0 });
    if (lead) lead.textContent = T.intro(list.length, label);
    var rail = box.querySelector('.rail'); if (rail && rail._bkSync) setTimeout(function () { rail._bkSync(true); }, 60);
  }

  function select(chip) {
    Array.prototype.forEach.call(chips, function (c) { var on = c === chip; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (geoBtn) geoBtn.classList.remove('on');
    show(+chip.getAttribute('data-lat'), +chip.getAttribute('data-lng'), chip.getAttribute('data-label') || chip.textContent.trim());
  }

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () { select(chip); });
  });
  if (geoBtn) {
    if (!('geolocation' in navigator)) geoBtn.hidden = true;
    geoBtn.addEventListener('click', function () {
      var old = geoBtn.textContent; geoBtn.textContent = T.locating; geoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        geoBtn.textContent = old; geoBtn.disabled = false;
        Array.prototype.forEach.call(chips, function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
        var here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Poza Krakowem lista "w zasiegu spaceru" nie ma sensu: prosimy o wybor dzielnicy hotelu.
        if (dist(here.lat, here.lng, CENTER.lat, CENTER.lng) > 15000) { if (lead) lead.textContent = T.far; return; }
        geoBtn.classList.add('on');
        show(here.lat, here.lng, T.you);
      }, function () {
        geoBtn.textContent = old; geoBtn.disabled = false;
        if (lead) lead.textContent = T.denied;
      }, { timeout: 8000, maximumAge: 600000 });
    });
  }

  // Domyslnie bez listy: sekcja prosi o lokalizacje albo wybor dzielnicy.
  initRails();
})();
