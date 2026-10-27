// Cross-promocja wpisow: ramka "Read next" po 3. lokalu (gdy lokali >= 4) i sekcja
// "Keep reading" (3 wpisy) na koncu artykulu, na angielskich przewodnikach i newsach.
// Dobor: wspolne lokale (data-venue-slug) + grupy tematyczne + lekka premia dla nowych wpisow.
// Idempotentny (znaczniki related:mid / related:end). Uzycie: node scripts/apply-related.mjs
// Puszcza go tez publish.mjs; po nim zawsze bust-css + check.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = new URL('../site/', import.meta.url).pathname;
const SKIP = new Set(['', 'about', 'how-we-test', 'photo-credits', 'guides', 'restaurants', 'map', 'events', 'news']);
const CLUSTERS = {
  coffee: ['news/coppa-specialty-coffee-opens', 'specialty-coffee-krakow', 'best-flat-white-krakow', 'matcha-krakow', 'where-to-work-krakow', 'study-cafes-krakow', 'quiet-cafes-krakow', 'old-town-cafes', 'coffee-near-krakow-main-station', 'krakow-digital-nomads', 'dog-friendly-cafes-krakow', 'outdoor-cafes-krakow', 'autumn-menu-krakow'],
  breakfast: ['breakfast-krakow', 'brunch-krakow', 'vegan-breakfast-krakow', 'polish-food-krakow'],
  food: ['african-food-krakow', 'news/habit-palac-oginskich-krakow', 'news/art-food-bazar-stary-kleparz', 'news/mlaskoty-food-festival-krakow', 'news/krakow-restaurant-week-2026-restaurants', 'news/slonce-polish-restaurant-opens', 'news/new-restaurants-krakow-2026', 'news/new-restaurants-krakow-autumn-2026', 'news/green-film-festival-food', 'pierogi-krakow', 'polish-food-krakow', 'best-restaurants-krakow', 'cheap-eats-krakow', 'italian-krakow', 'ramen-krakow', 'indian-krakow', 'georgian-krakow', 'vietnamese-krakow', 'thai-krakow', 'mexican-krakow', 'kebab-krakow', 'korean-krakow', 'halal-krakow', 'krakow-restaurant-week', 'christmas-market-krakow'],
  sweet: ['ice-cream-krakow', 'autumn-menu-krakow', 'breakfast-krakow'],
  night: ['news/habit-palac-oginskich-krakow', 'nightlife-krakow', 'cocktail-bars-krakow', 'wine-bars-krakow'],
  district: ['news/art-food-bazar-stary-kleparz', 'kazimierz-guide', 'podgorze-guide', 'kleparz-guide', 'krowodrza-guide', 'day-in-kleparz', 'old-town-cafes', 'coffee-near-krakow-main-station'],
};
const FRESH = new Set(['polish-food-krakow', 'nightlife-krakow']);

function pages(dir, prefix = '') {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('_') || ['api', 'img', 'data', 'ar', 'pl', 'restaurant', 'admin'].includes(d.name)) continue;
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    if (existsSync(join(dir, d.name, 'index.html'))) out.push(rel);
    out.push(...pages(join(dir, d.name), rel));
  }
  return out;
}
const unesc = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#322;/g, 'ł').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const idx = [];
for (const rel of pages(SITE)) {
  if (SKIP.has(rel)) continue;
  const html = readFileSync(join(SITE, rel, 'index.html'), 'utf8');
  if (!/<article[\s>]/.test(html)) continue;
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const slugs = [...html.matchAll(/data-venue-slug="([^"]+)"/g)].map(m => m[1]);
  const firstImg = (html.match(/<div class="venue-photo">\s*<img src="([^"]+)"/) || [])[1];
  const img = firstImg ? (firstImg.startsWith('/api/photo') ? firstImg.replace(/&amp;w=\d+|&w=\d+/, '') + (firstImg.includes('?') ? '&amp;w=480' : '') : firstImg) : null;
  const top = rel.split('/')[0] === 'news' ? 'news' : rel;
  const clusters = Object.entries(CLUSTERS).filter(([, l]) => l.includes(rel)).map(([k]) => k);
  if (top === 'news') clusters.push('news');
  idx.push({ rel, url: `/${rel}/`, title: h1 ? unesc(h1) : rel, desc: unesc(desc), slugs: new Set(slugs), img, clusters, kicker: top === 'news' ? 'News' : 'Guide', html });
}

function score(a, b) {
  let s = 0;
  for (const x of a.slugs) if (b.slugs.has(x)) s += 3;
  for (const c of a.clusters) if (b.clusters.includes(c)) s += c === 'news' ? 1 : 4;
  if (FRESH.has(b.rel) && s > 0) s += 1.5; // nowe wpisy wyzej, ale tylko gdy sa powiazane
  if (b.kicker === 'News' && a.kicker !== 'News') s -= 2; // przewodnik polecamy przewodnikami
  return s;
}
const short = s => (s.length > 120 ? s.slice(0, 117).replace(/\s+\S*$/, '') + '…' : s);

let changed = 0;
for (const a of idx) {
  const ranked = idx.filter(b => b !== a).map(b => ({ b, s: score(a, b) })).filter(x => x.s > 0).sort((x, y) => y.s - x.s || x.b.rel.localeCompare(y.b.rel));
  if (!ranked.length) continue;
  const cards = (a.html.match(/<section class="venue-card"/g) || []).length;
  const mid = cards >= 4 ? ranked[0].b : null;
  const end = ranked.filter(x => x.b !== mid).slice(0, 3).map(x => x.b);

  // usuwamy stare bloki razem z otaczajacymi pustymi liniami, zeby kolejne uruchomienia nic nie zmienialy
  let html = a.html.replace(/\n*<!-- related:mid:start -->[\s\S]*?<!-- related:mid:end -->/g, '')
    .replace(/\n*<!-- related:end:start -->[\s\S]*?<!-- related:end:end -->\n*/g, '\n\n');

  if (mid) {
    let n = 0;
    html = html.replace(/(<section class="venue-card"[\s\S]*?<\/section>)/g, m => {
      n++;
      if (n !== 3) return m;
      return `${m}\n<!-- related:mid:start -->\n    <div class="prose"><aside class="read-next" aria-label="Read next"><span class="rn-label">Read next</span><a class="rn-title" href="${mid.url}">${esc(mid.title)}</a><span class="rn-dek">${esc(short(mid.desc))}</span></aside></div>\n<!-- related:mid:end -->`;
    });
  }
  if (end.length) {
    const block = `<!-- related:end:start -->
<section class="wrap related-end" aria-labelledby="related-h">
  <h2 class="deco" id="related-h">Keep reading</h2>
  <div class="rel-grid">
${end.map(b => `    <a class="rel-card" href="${b.url}">${b.img ? `<span class="rel-img"><img src="${b.img}" alt="" loading="lazy" decoding="async" width="480" height="320" onerror="this.parentNode.classList.add('noimg')"></span>` : ''}<span class="rel-kicker">${b.kicker}</span><span class="rel-title">${esc(b.title)}</span><span class="rel-dek">${esc(short(b.desc))}</span></a>`).join('\n')}
  </div>
</section>
<!-- related:end:end -->`;
    html = html.replace(/<\/article>/, `</article>\n\n${block}`);
  }
  if (html !== a.html) { writeFileSync(join(SITE, a.rel, 'index.html'), html); changed++; }
}
console.log(`Powiazane wpisy: zaktualizowano ${changed} z ${idx.length} artykulow`);
