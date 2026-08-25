// Flagi kuchni jako SVG (nie emoji: emoji-flagi na Windows renderują się jako
// "PL"/"IT" i wyglądają amatorsko). Sprite wstawiamy raz na stronę, chipy
// referują symbole przez <use>. Wspólne dla EN i AR (label per język).

export const FLAG_SPRITE = `<svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true" focusable="false">
<symbol id="fl-pl" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect y="8" width="24" height="8" fill="#dc143c"/></symbol>
<symbol id="fl-it" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#009246"/><rect x="16" width="8" height="16" fill="#ce2b37"/></symbol>
<symbol id="fl-jp" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.6" fill="#bc002d"/></symbol>
<symbol id="fl-in" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="24" height="5.33" fill="#ff9933"/><rect y="10.67" width="24" height="5.33" fill="#138808"/><g fill="none" stroke="#000080" stroke-width="0.4"><circle cx="12" cy="8" r="2"/><path d="M12 6v4M10 8h4M10.6 6.6l2.8 2.8M13.4 6.6l-2.8 2.8"/></g><circle cx="12" cy="8" r="0.4" fill="#000080"/></symbol>
<symbol id="fl-ge" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect x="10" width="4" height="16" fill="#f00"/><rect y="6" width="24" height="4" fill="#f00"/><g fill="#f00"><g transform="translate(5 3)"><rect x="-1.2" y="-0.35" width="2.4" height="0.7"/><rect x="-0.35" y="-1.2" width="0.7" height="2.4"/></g><g transform="translate(19 3)"><rect x="-1.2" y="-0.35" width="2.4" height="0.7"/><rect x="-0.35" y="-1.2" width="0.7" height="2.4"/></g><g transform="translate(5 13)"><rect x="-1.2" y="-0.35" width="2.4" height="0.7"/><rect x="-0.35" y="-1.2" width="0.7" height="2.4"/></g><g transform="translate(19 13)"><rect x="-1.2" y="-0.35" width="2.4" height="0.7"/><rect x="-0.35" y="-1.2" width="0.7" height="2.4"/></g></g></symbol>
<symbol id="fl-vn" viewBox="0 0 24 16"><rect width="24" height="16" fill="#da251d"/><path d="M12 3.4 L13.1 6.5 L16.4 6.6 L13.8 8.6 L14.7 11.7 L12 9.8 L9.3 11.7 L10.2 8.6 L7.6 6.6 L10.9 6.5 Z" fill="#ff0"/></symbol>
<symbol id="fl-th" viewBox="0 0 24 16"><rect width="24" height="16" fill="#a51931"/><rect y="2.67" width="24" height="10.67" fill="#f4f5f8"/><rect y="5.33" width="24" height="5.33" fill="#2d2a4a"/></symbol>
<symbol id="fl-mx" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="8" height="16" fill="#006847"/><rect x="16" width="8" height="16" fill="#ce1126"/><ellipse cx="12" cy="7.7" rx="1.35" ry="1.05" fill="#6b4423"/><path d="M10.4 8.9 Q12 10.4 13.6 8.9" fill="none" stroke="#3a7d2c" stroke-width="0.6"/></symbol>
<symbol id="fl-kr" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><path d="M12 4.6 A3.4 3.4 0 0 0 12 11.4 A1.7 1.7 0 0 0 12 8 A1.7 1.7 0 0 1 12 4.6 Z" fill="#cd2e3a"/><path d="M12 4.6 A1.7 1.7 0 0 1 12 8 A1.7 1.7 0 0 0 12 11.4 A3.4 3.4 0 0 1 12 4.6 Z" fill="#0047a0"/><g fill="#1a1a1a"><g transform="translate(4.7 4)"><rect x="-1.4" y="-1.05" width="2.8" height="0.5"/><rect x="-1.4" y="-0.25" width="2.8" height="0.5"/><rect x="-1.4" y="0.55" width="2.8" height="0.5"/></g><g transform="translate(19.3 4)"><rect x="-1.4" y="-1.05" width="2.8" height="0.5"/><rect x="-1.4" y="-0.25" width="1.1" height="0.5"/><rect x="0.3" y="-0.25" width="1.1" height="0.5"/><rect x="-1.4" y="0.55" width="2.8" height="0.5"/></g><g transform="translate(4.7 12)"><rect x="-1.4" y="-1.05" width="1.1" height="0.5"/><rect x="0.3" y="-1.05" width="1.1" height="0.5"/><rect x="-1.4" y="-0.25" width="2.8" height="0.5"/><rect x="-1.4" y="0.55" width="1.1" height="0.5"/><rect x="0.3" y="0.55" width="1.1" height="0.5"/></g><g transform="translate(19.3 12)"><rect x="-1.4" y="-1.05" width="1.1" height="0.5"/><rect x="0.3" y="-1.05" width="1.1" height="0.5"/><rect x="-1.4" y="-0.25" width="1.1" height="0.5"/><rect x="0.3" y="-0.25" width="1.1" height="0.5"/><rect x="-1.4" y="0.55" width="1.1" height="0.5"/><rect x="0.3" y="0.55" width="1.1" height="0.5"/></g></g></symbol>
<symbol id="fl-lb" viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><rect width="24" height="4" fill="#ed1c24"/><rect y="12" width="24" height="4" fill="#ed1c24"/><path d="M12 4.7 L13.7 8 L12.8 8 L14.1 10.4 L9.9 10.4 L11.2 8 L10.3 8 Z" fill="#0a7d34"/><rect x="11.6" y="10.4" width="0.8" height="0.9" fill="#5b3a1a"/></symbol>
</svg>`;

// Kolejność i etykiety kuchni (EN / AR). href zależy od języka strony.
export const CUISINES = [
  { key: 'pierogi',    flag: 'fl-pl', en: 'Pierogi & Polish',    ar: 'بييروغي وبولندي' },
  { key: 'italian',    flag: 'fl-it', en: 'Italian',             ar: 'إيطالي' },
  { key: 'ramen',      flag: 'fl-jp', en: 'Ramen & Japanese',    ar: 'رامن وياباني' },
  { key: 'indian',     flag: 'fl-in', en: 'Indian',              ar: 'هندي' },
  { key: 'georgian',   flag: 'fl-ge', en: 'Georgian',            ar: 'جورجي' },
  { key: 'vietnamese', flag: 'fl-vn', en: 'Vietnamese',          ar: 'فيتنامي' },
  { key: 'thai',       flag: 'fl-th', en: 'Thai',                ar: 'تايلاندي' },
  { key: 'mexican',    flag: 'fl-mx', en: 'Mexican',             ar: 'مكسيكي' },
  { key: 'kebab',      flag: 'fl-lb', en: 'Kebab & Middle East', ar: 'كباب وشرق أوسطي' },
  { key: 'korean',     flag: 'fl-kr', en: 'Korean',              ar: 'كوري' },
];

// Ktore kuchnie maja juz wersje arabska (reszta linkuje do EN).
const AR_READY = new Set(['pierogi', 'italian', 'ramen', 'indian', 'georgian', 'vietnamese', 'thai', 'mexican', 'kebab', 'korean']);

export function cuisineHref(key, lang) {
  const slug = `${key}-krakow`;
  return lang === 'ar' && AR_READY.has(key) ? `/ar/${slug}/` : `/${slug}/`;
}

// Zwraca <div class="cuisine-flags"> z chipami. lang: 'en' | 'ar'.
export function cuisineChips(lang = 'en') {
  const items = CUISINES.map(c => {
    const label = lang === 'ar' ? c.ar : c.en;
    return `    <a class="cchip" href="${cuisineHref(c.key, lang)}">` +
      `<span class="flag"><svg viewBox="0 0 24 16" aria-hidden="true"><use href="#${c.flag}"/></svg></span>` +
      `${label}</a>`;
  }).join('\n');
  return `<div class="cuisine-flags">\n${items}\n  </div>`;
}
