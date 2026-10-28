// Wspolna stopka BiteKrakow (EN/PL/AR/ZH). Uzywaja jej gen-venues.mjs i apply-footer.mjs,
// zeby 200 stron mialo jedna stopke z tymi samymi linkami do przewodnikow
// (linki w stopce = silne linkowanie wewnetrzne, pomaga indeksacji).
// `notes` = zdania o zrodlach danych wlasciwe dla strony (Google, OSM, zdjecia od lokali).

import { LANGS, HREFLANG, NAME, PREFIX, splitPath } from './langs.mjs';

const L = {
  en: {
    home: '/',
    tag: 'Independent guides to Krakow\'s food and coffee scene. Written and edited by <a href="/about/">Cezary Musiał</a> in Kraków, every place visited in person.',
    cols: [
      ['Eat and drink', [
        ['/polish-food-krakow/', 'Polish food'], ['/nightlife-krakow/', 'Nightlife'], ['/breakfast-krakow/', 'Breakfast'], ['/specialty-coffee-krakow/', 'Specialty coffee'], ['/matcha-krakow/', 'Matcha'],
        ['/where-to-work-krakow/', 'Cafes to work from'], ['/pierogi-krakow/', 'Pierogi'], ['/halal-krakow/', 'Halal'],
        ['/cocktail-bars-krakow/', 'Cocktail bars'], ['/wine-bars-krakow/', 'Wine bars']]],
      ['Neighborhoods', [
        ['/kazimierz-guide/', 'Kazimierz'], ['/old-town-cafes/', 'Old Town cafes'], ['/podgorze-guide/', 'Podgórze'],
        ['/kleparz-guide/', 'Kleparz'], ['/krowodrza-guide/', 'Krowodrza'], ['/coffee-near-krakow-main-station/', 'Near the main station']]],
      ['BiteKrakow', [
        ['/guides/', 'All guides'], ['/restaurants/', 'All places'], ['/events/', 'Events'], ['/map/', 'Map'],
        ['/news/', 'News'], ['/how-we-test/', 'How we test'], ['/photo-credits/', 'Photo credits'], ['/about/', 'About']]]
    ],
  },
  pl: {
    home: '/pl/',
    tag: 'Niezależne przewodniki po jedzeniu i kawie w Krakowie. Pisze i redaguje <a href="/pl/about/">Cezary Musiał</a> w Krakowie, każde miejsce odwiedzone osobiście.',
    cols: [
      ['Jedzenie i picie', [
        ['/pl/polish-food-krakow/', 'Polska kuchnia'], ['/pl/nightlife-krakow/', 'Nocne życie'], ['/pl/breakfast-krakow/', 'Śniadania'], ['/pl/specialty-coffee-krakow/', 'Kawa specialty'], ['/pl/matcha-krakow/', 'Matcha'],
        ['/pl/where-to-work-krakow/', 'Kawiarnie do pracy'], ['/pl/pierogi-krakow/', 'Pierogi'], ['/pl/halal-krakow/', 'Halal'],
        ['/pl/cocktail-bars-krakow/', 'Bary koktajlowe'], ['/pl/wine-bars-krakow/', 'Bary z winem']]],
      ['Dzielnice', [
        ['/pl/kazimierz-guide/', 'Kazimierz'], ['/pl/old-town-cafes/', 'Kawiarnie na Starym Mieście'], ['/pl/podgorze-guide/', 'Podgórze'],
        ['/pl/kleparz-guide/', 'Kleparz'], ['/pl/krowodrza-guide/', 'Krowodrza'], ['/pl/coffee-near-krakow-main-station/', 'Przy dworcu głównym']]],
      ['BiteKrakow', [
        ['/pl/guides/', 'Wszystkie przewodniki'], ['/restaurants/', 'Wszystkie lokale (EN)'], ['/events/', 'Wydarzenia (EN)'], ['/pl/map/', 'Mapa'],
        ['/pl/news/', 'Aktualności'], ['/pl/how-we-test/', 'Jak testujemy'], ['/pl/photo-credits/', 'Prawa do zdjęć'], ['/pl/about/', 'O nas']]]
    ]
  },
  zh: {
    home: '/zh/',
    tag: '克拉科夫美食与咖啡的独立指南。由 <a href="/zh/about/">Cezary Musiał</a> 在克拉科夫撰写和编辑，每个地方都亲自去过。',
    cols: [
      ['吃喝', [
        ['/zh/polish-food-krakow/', '波兰菜'], ['/zh/nightlife-krakow/', '夜生活'], ['/zh/breakfast-krakow/', '早餐'], ['/zh/specialty-coffee-krakow/', '精品咖啡'], ['/zh/matcha-krakow/', '抹茶'],
        ['/zh/where-to-work-krakow/', '适合办公的咖啡馆'], ['/zh/pierogi-krakow/', '波兰饺子'], ['/zh/halal-krakow/', '清真美食'],
        ['/zh/cocktail-bars-krakow/', '鸡尾酒吧'], ['/zh/wine-bars-krakow/', '葡萄酒吧']]],
      ['街区', [
        ['/zh/kazimierz-guide/', '卡齐米日'], ['/zh/old-town-cafes/', '老城咖啡馆'], ['/zh/podgorze-guide/', '波德古热'],
        ['/zh/kleparz-guide/', '克莱帕日'], ['/zh/krowodrza-guide/', '克罗沃扎'], ['/zh/coffee-near-krakow-main-station/', '中央火车站附近']]],
      ['BiteKrakow', [
        ['/zh/guides/', '全部指南'], ['/restaurants/', '全部店铺（英文）'], ['/events/', '活动（英文）'], ['/zh/map/', '地图'],
        ['/zh/news/', '资讯'], ['/zh/how-we-test/', '我们如何评测'], ['/zh/photo-credits/', '图片版权'], ['/zh/about/', '关于我们']]]
    ]
  },
  ar: {
    home: '/ar/',
    tag: 'أدلة مستقلة لمشهد الطعام والقهوة في كراكوف. يحرّرها Cezary Musiał في كراكوف، وكل مكان تمت زيارته شخصياً.',
    cols: [
      ['أدلة بالعربية', [
        ['/ar/halal-krakow/', 'الطعام الحلال'], ['/ar/arab-travellers-krakow/', 'دليل المسافر العربي'], ['/ar/breakfast-krakow/', 'الفطور'],
        ['/ar/matcha-krakow/', 'الماتشا'], ['/ar/polish-food-krakow/', 'المطبخ البولندي'], ['/ar/kazimierz-guide/', 'حي كازيميَش'],
        ['/ar/best-restaurants-krakow/', 'أفضل المطاعم'], ['/ar/kebab-krakow/', 'الكباب']]],
      ['BiteKrakow', [
        ['/ar/guides/', 'كل الأدلة'], ['/ar/map/', 'الخريطة'], ['/restaurants/', 'كل الأماكن'], ['/photo-credits/', 'حقوق الصور (EN)'], ['/about/', 'نبذة عنا وكيف نختبر']]]
    ],
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
  const langs = LANGS.filter(l => l !== lang).map(l => `<a href="${PREFIX[l] + '/'}" hreflang="${HREFLANG[l]}" lang="${HREFLANG[l]}">${NAME[l]}</a>`).join(' ');
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
  return splitPath('/' + relPath.replace(/^\/+/, '') + (relPath ? '/' : '')).lang;
}
