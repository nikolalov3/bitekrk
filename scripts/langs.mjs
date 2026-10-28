// Wersje jezykowe BiteKrakow: EN (bez prefiksu), PL (/pl/), AR (/ar/), ZH uproszczony (/zh/).
// Wspolne dla apply-langs.mjs, footer.mjs i gen-llms.mjs.

export const LANGS = ['en', 'pl', 'ar', 'zh'];

// atrybut hreflang i <html lang>
export const HREFLANG = { en: 'en', pl: 'pl', ar: 'ar', zh: 'zh-Hans' };

export const PREFIX = { en: '', pl: '/pl', ar: '/ar', zh: '/zh' };

// nazwa jezyka w nim samym (lista w przelaczniku) i krotki skrot (przycisk)
export const NAME = { en: 'English', pl: 'Polski', ar: 'العربية', zh: '中文' };
export const SHORT = { en: 'EN', pl: 'PL', ar: 'عربي', zh: '中文' };
export const MENU_LABEL = { en: 'Language', pl: 'Język', ar: 'اللغة', zh: '语言' };
// dopisek, gdy strony nie ma w danym jezyku i link prowadzi na jego strone glowna
export const HOME_NOTE = { en: 'home', pl: 'strona główna', ar: 'الرئيسية', zh: '首页' };

// Menu w naglowku: [sciezka EN, etykiety]
export const NAV = [
  ['/guides/', { en: 'Guides', pl: 'Przewodniki', ar: 'الأدلة', zh: '指南' }],
  ['/nightlife-krakow/', { en: 'Nightlife', pl: 'Nocne życie', ar: 'السهر', zh: '夜生活' }],
  ['/events/', { en: 'Events', pl: 'Wydarzenia', ar: 'الفعاليات', zh: '活动' }],
  ['/map/', { en: 'Map', pl: 'Mapa', ar: 'الخريطة', zh: '地图' }],
  ['/restaurants/', { en: 'Places', pl: 'Lokale', ar: 'الأماكن', zh: '店铺' }],
  ['/news/', { en: 'News', pl: 'Aktualności', ar: 'الأخبار', zh: '资讯' }]
];

// '/zh/kazimierz-guide/' -> { lang: 'zh', base: '/kazimierz-guide/' }
export function splitPath(p) {
  for (const l of ['pl', 'ar', 'zh']) {
    if (p === `/${l}/` || p === `/${l}`) return { lang: l, base: '/' };
    if (p.startsWith(`/${l}/`)) return { lang: l, base: p.slice(l.length + 1) };
  }
  return { lang: 'en', base: p };
}

export const pathFor = (lang, base) => (PREFIX[lang] + base).replace(/\/\/+/g, '/') || '/';
