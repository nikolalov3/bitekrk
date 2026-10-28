/* BiteKrakow: interaktywna mapa Krakowa (MapLibre GL + OpenFreeMap).
   Dane: /data/map-venues.json (generuje scripts/gen-venues.mjs).
   Oddalona mapa pokazuje 10 najwyzej ocenianych miejsc, przyblizanie odslania kolejne. */
(function () {
  var el = document.getElementById('bkMap');
  if (!el || !window.maplibregl) return;
  var LANG = el.getAttribute('data-lang') || 'en', AR = LANG === 'ar';
  var TT = {
    ar: {
      showing: function (n, t) { return 'نعرض ' + n + ' من ' + t + ' مكانًا'; }, more: 'قرّب الخريطة لترى المزيد',
      reviews: 'مراجعة على جوجل', ours: 'تقييمنا', profile: 'الملف الكامل', guide: 'في الدليل', gr: 'مراجعة من جوجل',
      type: { cafe: 'مقهى', food: 'مطعم', bar: 'بار' }, close: 'إغلاق', none: 'لا توجد تقييمات بعد',
      mich: { '2s': 'نجمتا ميشلان', '1s': 'نجمة ميشلان', bib: 'ميشلان Bib Gourmand', guide: 'في دليل ميشلان' }, why: 'لماذا نختاره'
    },
    pl: {
      showing: function (n, t) { return 'Widać ' + n + ' z ' + t + ' miejsc'; }, more: 'przybliż, by zobaczyć więcej',
      reviews: 'opinii w Google', ours: 'Nasza ocena', profile: 'Pełny profil', guide: 'W przewodniku', gr: 'opinia z Google',
      type: { cafe: 'Kawiarnia', food: 'Restauracja', bar: 'Bar' }, close: 'Zamknij', none: 'Brak opinii',
      mich: { '2s': 'Dwie gwiazdki Michelin', '1s': 'Gwiazdka Michelin', bib: 'Michelin Bib Gourmand', guide: 'W przewodniku Michelin' }, why: 'Dlaczego go wybieramy'
    },
    zh: {
      showing: function (n, t) { return '显示 ' + n + ' / ' + t + ' 个地点'; }, more: '放大地图查看更多',
      reviews: '条谷歌评价', ours: '我们的评分', profile: '店铺详情', guide: '收录于指南', gr: '谷歌评价',
      type: { cafe: '咖啡馆', food: '餐厅', bar: '酒吧' }, close: '关闭', none: '暂无评价',
      mich: { '2s': '米其林二星', '1s': '米其林一星', bib: '米其林必比登推介', guide: '米其林指南推荐' }, why: '我们为什么推荐'
    },
    en: {
      showing: function (n, t) { return 'Showing ' + n + ' of ' + t + ' places'; }, more: 'zoom in for more',
      reviews: 'Google reviews', ours: 'Our score', profile: 'Full profile', guide: 'In the guide', gr: 'Google review',
      type: { cafe: 'Cafe', food: 'Restaurant', bar: 'Bar' }, close: 'Close', none: 'No reviews yet',
      mich: { '2s': 'Two Michelin stars', '1s': 'One Michelin star', bib: 'Michelin Bib Gourmand', guide: 'In the Michelin Guide' }, why: 'Why we pick it'
    }
  };
  var T = TT[LANG] || TT.en;
  function L(o) { return o ? (o[LANG] || o.en) : ''; }
  // pierwszy prog = zestaw "wyrozniony" z danych (fc): klienci, Michelin, kuchnie polska i swiata
  var FC = 10, TIERS = [[0, 10], [13.4, 35], [14.5, 999]];
  var MICH_SHORT = { '2s': '★★ Michelin', '1s': '★ Michelin', bib: 'Bib Gourmand', guide: 'Michelin' };
  var LABEL_ALL_ZOOM = 15.6;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mobile = window.matchMedia('(max-width: 640px)').matches;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function maxFor(z) { var m = 10; for (var i = 0; i < TIERS.length; i++) if (z >= TIERS[i][0]) m = TIERS[i][1]; return m; }
  function stars(r) {
    var w = Math.max(0, Math.min(100, (r / 5) * 100));
    return '<span class="k-stars" aria-hidden="true"><span class="k-s0">★★★★★</span><span class="k-s1" style="width:' + w + '%">★★★★★</span></span>';
  }

  var map = new maplibregl.Map({
    container: el,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [19.9395, 50.0605], zoom: mobile ? 12.4 : 12.9,
    minZoom: 11, maxZoom: 18.5,
    maxBounds: [[19.70, 49.95], [20.25, 50.15]],
    attributionControl: { compact: true },
    cooperativeGestures: !canHover,
    dragRotate: false, pitchWithRotate: false, touchPitch: false
  });
  map.touchZoomRotate.disableRotation();
  window.bkMap = map;
  map.on('error', function (e) { if (window.console) console.warn('BiteKrakow map:', e && e.error && e.error.message); });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');

  map.on('load', function () {
    try {
      map.getStyle().layers.forEach(function (l) {
        if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#f3efe7');
        else if (l.type === 'fill' && /water/.test(l.id)) map.setPaintProperty(l.id, 'fill-color', '#cddde4');
        else if (l.type === 'fill' && /park|wood|grass|landcover/.test(l.id)) map.setPaintProperty(l.id, 'fill-color', '#e3e7d4');
      });
    } catch (e) { /* styl bez tych warstw: zostaje domyslny */ }
  });

  var card = document.createElement('div');
  card.className = 'bk-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
  if (AR) card.setAttribute('dir', 'rtl');
  el.appendChild(card);
  var countEl = document.getElementById('bkCount');
  var chips = document.querySelectorAll('.bk-chips button');
  var filter = 'all', venues = [], pins = [], open = null, pinned = false, closeT = null;

  function cardHtml(v) {
    var meta = [T.type[v.t] || '', v.d, v.pr].filter(Boolean).join(' · ');
    var rating = v.r ? '<div class="k-rate">' + stars(v.r) + '<b>' + v.r.toFixed(1) + '</b><span>' + (v.c ? v.c + ' ' + T.reviews : '') + '</span></div>' : '<div class="k-rate"><span>' + T.none + '</span></div>';
    var quote = v.q ? '<blockquote class="k-quote" dir="auto">“' + esc(v.q.t) + '”<cite>' + esc(v.q.a) + ', ' + T.gr + '</cite></blockquote>' : '';
    var ours = v.sc ? '<div class="k-ours">' + T.ours + ' <b>' + v.sc + '/10</b>' + (v.g ? ' · <a href="' + esc(v.g.p) + '">' + T.guide + '</a>' : '') + '</div>' : '';
    return '<button type="button" class="k-x" aria-label="' + T.close + '">×</button>' +
      '<div class="k-type">' + esc(meta) + '</div>' +
      '<div class="k-name">' + esc(v.n) + '</div>' + (v.aw ? '<div class="k-pick">' + esc(L(v.aw.label)) + '<span>' + esc(L(v.aw.line)) + '</span></div>' : '') + (v.m ? '<div class="k-mich">' + (v.m === '2s' ? '★★ ' : v.m === '1s' ? '★ ' : '') + T.mich[v.m] + '</div>' : '') + rating + quote + ours + (v.aw ? '<details class="k-why"><summary>' + T.why + '</summary><p>' + esc(L(v.aw.why)) + '</p></details>' : '') +
      '<a class="k-go" href="/restaurant/' + esc(v.s) + '/">' + T.profile + (AR ? ' ←' : ' →') + '</a>';
  }

  function place() {
    if (!open) return;
    if (mobile) { card.style.left = ''; card.style.top = ''; return; }
    var pt = map.project([open.v.lng, open.v.lat]);
    var W = el.clientWidth, H = el.clientHeight, cw = card.offsetWidth || 290, ch = card.offsetHeight || 220;
    var x = pt.x + 18, y = pt.y - ch / 2;
    if (x + cw > W - 10) x = pt.x - cw - 18;
    y = Math.max(10, Math.min(H - ch - 10, y));
    x = Math.max(10, x);
    card.style.left = x + 'px'; card.style.top = y + 'px';
  }
  function show(p, pin) {
    clearTimeout(closeT);
    if (open && open !== p) { open.el.classList.remove('active'); open.wrap.style.zIndex = ''; }
    open = p; pinned = !!pin;
    p.el.classList.add('active'); p.wrap.style.zIndex = 5;
    card.innerHTML = cardHtml(p.v);
    card.classList.add('on');
    place();
    card.querySelector('.k-x').addEventListener('click', hide);
  }
  function hide() {
    clearTimeout(closeT);
    card.classList.remove('on');
    if (open) { open.el.classList.remove('active'); open.wrap.style.zIndex = ''; }
    open = null; pinned = false;
  }
  function softHide() { if (!pinned) closeT = setTimeout(hide, 220); }
  card.addEventListener('mouseenter', function () { clearTimeout(closeT); });
  card.addEventListener('mouseleave', softHide);
  map.on('move', place);
  map.on('click', function () { hide(); });

  var raf = 0;
  function update() {
    raf = 0;
    var z = map.getZoom(), max = maxFor(z), list = venues.filter(function (v) { return filter === 'all' || (filter === 'michelin' ? !!v.m : v.t === filter); });
    var vis = {}; list.slice(0, max).forEach(function (v) { vis[v.s] = 1; });
    var top = {}; list.slice(0, FC).forEach(function (v) { top[v.s] = 1; });
    var lblMax = z >= LABEL_ALL_ZOOM ? 999 : (z >= 14.2 ? Math.max(35, FC) : FC), lblSet = {};
    list.slice(0, lblMax).forEach(function (v) { lblSet[v.s] = 1; });
    var shown = 0, boxes = [];
    function free(r) { for (var i = 0; i < boxes.length; i++) { var o = boxes[i]; if (r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]) return false; } return true; }
    pins.forEach(function (p) {
      var on = !!vis[p.v.s], want = on && !!lblSet[p.v.s], lbl = false;
      if (want) {
        var pt = map.project([p.v.lng, p.v.lat]), lw = (p.lw || (p.lw = p.el.querySelector('.lbl').offsetWidth || 90));
        var r = [pt.x - 9, pt.y - 13, pt.x + 22 + lw, pt.y + 13];
        if (free(r)) { boxes.push(r); lbl = true; }
      }
      p.el.classList.toggle('off', !on);
      p.el.tabIndex = on ? 0 : -1;
      p.el.classList.toggle('lbl-on', lbl);
      p.el.classList.toggle('top', !!top[p.v.s]);
      p.wrap.style.zIndex = open === p ? 5 : (top[p.v.s] ? 2 : '');
      p.wrap.style.pointerEvents = on ? '' : 'none';
      if (on) shown++;
    });
    if (open && !vis[open.v.s]) hide();
    if (countEl) countEl.textContent = T.showing(shown, list.length) + (shown < list.length ? ' · ' + T.more : '');
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }
  map.on('zoom', schedule);
  map.on('moveend', schedule);

  Array.prototype.forEach.call(chips, function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      Array.prototype.forEach.call(chips, function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      hide(); update();
    });
  });

  fetch('/data/map-venues.json?v=' + (el.getAttribute('data-venues-v') || '')).then(function (r) { return r.json(); }).then(function (data) {
    venues = (data.venues || []).slice().sort(function (a, b) { return a.p - b.p; });
    FC = data.fc || 10; TIERS = [[0, FC], [13.4, Math.max(35, FC + 12)], [14.5, 999]];
    venues.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bk-pin t-' + v.t + (v.m ? ' is-mich' : '') + (v.aw ? ' is-pick' : '') + ' off';
      b.setAttribute('aria-label', v.n + ', ' + v.d + (v.r ? ', ' + v.r.toFixed(1) + ' ★' : ''));
      var short = v.n.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      b.innerHTML = '<span class="dot"></span><span class="lbl">' + esc(short) + (v.m ? '<span class="mi">' + MICH_SHORT[v.m] + '</span>' : '') + (v.aw ? '<span class="pk">' + esc(L(v.aw.label)) + '</span>' : '') + '</span>';
      var p = { v: v, el: b };
      if (canHover) {
        b.addEventListener('mouseenter', function () { if (!pinned || open === p) show(p, pinned && open === p); });
        b.addEventListener('mouseleave', softHide);
      }
      b.addEventListener('focus', function () { show(p, false); });
      b.addEventListener('click', function (e) { e.stopPropagation(); show(p, true); });
      // MapLibre steruje transformacja i przezroczystoscia glownego elementu znacznika,
      // wiec widocznosc i animacje sa na wewnetrznym przycisku.
      var wrap = document.createElement('div');
      wrap.className = 'bk-mk';
      wrap.appendChild(b);
      p.wrap = wrap;
      new maplibregl.Marker({ element: wrap, anchor: 'left', offset: [-9, 0] }).setLngLat([v.lng, v.lat]).addTo(map);
      pins.push(p);
    });
    update();
    var top = venues.slice(0, FC);
    if (top.length) {
      var bb = new maplibregl.LngLatBounds();
      top.forEach(function (v) { bb.extend([v.lng, v.lat]); });
      map.fitBounds(bb, { padding: mobile ? 40 : 80, maxZoom: 13.3, duration: 0 });
    }
  }).catch(function () { if (countEl) countEl.textContent = ''; });
})();
