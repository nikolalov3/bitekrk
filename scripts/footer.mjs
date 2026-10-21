// Wspolna stopka BiteKrakow (EN/PL/AR). Uzywaja jej gen-venues.mjs i apply-footer.mjs,
// zeby 200 stron mialo jedna stopke z tymi samymi linkami do przewodnikow
// (linki w stopce = silne linkowanie wewnetrzne, pomaga indeksacji).
// `notes` = zdania o zrodlach danych wlasciwe dla strony (Google, OSM, zdjecia od lokali).

const L = {
  en: {
    home: '/',
    tag: 'Independent guides to Krakow\'s food and coffee scene. Written and edited by <a href="/about/">Cezary Musiał</a> in Kraków, every place visited in person.',
    cols: [
      ['Eat and drink', [
        ['/polish-food-krakow/', 'Polish food'], ['/breakfast-krakow/', 'Breakfast'], ['/specialty-coffee-krakow/', 'Specialty coffee'], ['/matcha-krakow/', 'Matcha'],
        ['/where-to-work-krakow/', 'Cafes to work from'], ['/pierogi-krakow/', 'Pierogi'], ['/halal-krakow/', 'Halal'],
        ['/cocktail-bars-krakow/', 'Cocktail bars'], ['/wine-bars-krakow/', 'Wine bars']]],
      ['Neighborhoods', [
        ['/kazimierz-guide/', 'Kazimierz'], ['/old-town-cafes/', 'Old Town cafes'], ['/podgorze-guide/', 'Podgórze'],
        ['/kleparz-guide/', 'Kleparz'], ['/krowodrza-guide/', 'Krowodrza'], ['/coffee-near-krakow-main-station/', 'Near the main station']]],
      ['BiteKrakow', [
        ['/guides/', 'All guides'], ['/restaurants/', 'All places'], ['/map/', 'Map'],
        ['/news/', 'News'], ['/how-we-test/', 'How we test'], ['/photo-credits/', 'Photo credits'], ['/about/', 'About']]]
    ],
    langs: [['/ar/', 'العربية', 'ar']]
  },
  pl: {
    home: '/',
    tag: 'Niezależne przewodniki po jedzeniu i kawie w Krakowie. Pisze i redaguje <a href="/about/">Cezary Musiał</a> w Krakowie, każde miejsce odwiedzone osobiście.',
    cols: [
      ['Po polsku', [
        ['/pl/matcha-krakow/', 'Matcha w Krakowie'], ['/pl/specialty-coffee-krakow/', 'Kawa speciality'], ['/pl/kleparz-guide/', 'Kleparz'],
        ['/pl/cocktail-bars-krakow/', 'Bary koktajlowe'], ['/pl/autumn-menu-krakow/', 'Jesienne menu'], ['/pl/krakow-restaurant-week/', 'Restaurant Week']]],
      ['BiteKrakow', [
        ['/guides/', 'Wszystkie przewodniki (EN)'], ['/map/', 'Mapa lokali'], ['/restaurants/', 'Wszystkie lokale'],
        ['/how-we-test/', 'Jak testujemy'], ['/photo-credits/', 'Prawa do zdjęć (EN)'], ['/about/', 'O nas']]]
    ],
    langs: [['/', 'English', 'en'], ['/ar/', 'العربية', 'ar']]
  },
  ar: {
    home: '/ar/',
    tag: 'أدلة مستقلة لمشهد الطعام والقهوة في كراكوف. يحرّرها Cezary Musiał في كراكوف، وكل مكان تمت زيارته شخصياً.',
    cols: [
      ['أدلة بالعربية', [
        ['/ar/halal-krakow/', 'الطعام الحلال'], ['/ar/arab-travellers-krakow/', 'دليل المسافر العربي'], ['/ar/breakfast-krakow/', 'الفطور'],
        ['/ar/matcha-krakow/', 'الماتشا'], ['/ar/best-restaurants-krakow/', 'أفضل المطاعم'], ['/ar/kebab-krakow/', 'الكباب']]],
      ['BiteKrakow', [
        ['/ar/guides/', 'كل الأدلة'], ['/ar/map/', 'الخريطة'], ['/restaurants/', 'كل الأماكن'], ['/photo-credits/', 'حقوق الصور (EN)'], ['/about/', 'نبذة عنا وكيف نختبر']]]
    ],
    langs: [['/', 'English', 'en']]
  }
};

export function footerHtml(lang = 'en', notes = []) {
  const t = L[lang] || L.en;
  const cols = t.cols.map(([h, links]) => `      <nav class="foot-col" aria-label="${h}">
        <p class="foot-h">${h}</p>
        <ul>
${links.map(([href, label]) => `          <li><a href="${href}">${label}</a></li>`).join('\n')}
        </ul>
      </nav>`).join('\n');
  const langs = t.langs.map(([href, label, hl]) => `<a href="${href}" hreflang="${hl}" lang="${hl}">${label}</a>`).join(' ');
  const src = notes.length ? `\n      <p class="foot-src">${notes.join(' ')}</p>` : '';
  return `<footer class="site-footer" data-foot="2">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <a class="logo" href="${t.home}">Bite<span>Krakow</span></a>
        <p class="foot-tag">${t.tag}</p>
        <a class="foot-mail" href="mailto:hello@bitekrakow.com">hello@bitekrakow.com</a>
      </div>
${cols}
    </div>
    <div class="foot-bottom">${src}
      <p class="foot-meta"><span>&copy; 2026 BiteKrakow</span> ${langs}</p>
    </div>
  </div>
</footer>`;
}

// Z istniejacej stopki wyciaga zdania o zrodlach (Google, OpenStreetMap, zdjecia od lokali),
// zeby po podmianie kazda strona zachowala swoja adnotacje.
export function extractNotes(footer) {
  const own = [...footer.matchAll(/<p class="foot-src">([\s\S]*?)<\/p>/g)].map(m => m[1].trim());
  if (own.length) return own;
  const SRC = /Google|OpenStreetMap|OpenFreeMap|[Zz]djęci|[Pp]hoto|جوجل|الصور|صور/;
  const out = [];
  for (const m of footer.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    for (const s of text.split(/(?<=[.!?])\s+/)) if (SRC.test(s) && !/Cezary/.test(s)) out.push(s);
  }
  return out;
}

export function langOf(relPath) {
  return relPath.startsWith('ar/') || relPath === 'ar' ? 'ar' : relPath.startsWith('pl/') || relPath === 'pl' ? 'pl' : 'en';
}
