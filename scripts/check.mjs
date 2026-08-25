// Strażnik jakości: sprawdza każdy artykuł przed publikacją.
// Uruchomienie: node scripts/check.mjs
// Wychodzi z kodem 1, gdy cokolwiek jest złamane, więc można go wpiąć w CI.
//
// Pilnuje standardu GEO ustalonego dla portalu:
//  - canonical zgodny ze ścieżką pliku
//  - schema: Article z autorem i datami, ItemList gdy są karty lokali,
//    FAQPage gdy jest sekcja FAQ, BreadcrumbList na artykułach
//  - każda karta lokalu ma data-venue-slug, ocenę i sekcję opinii
//  - artykuł jest w sitemap.xml
//  - zakaz długich myślników w treści (ślad AI)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = new URL('../site/', import.meta.url).pathname;
const HOST = 'https://bitekrakow.com';
const problems = [];
const ok = [];

const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); }
    catch (e) { out.push({ __parseError: String(e) }); }
  }
  return out;
}

function collectPages(dir, prefix) {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory() || ['api', 'img'].includes(d.name)) continue;
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    out.push(rel, ...collectPages(join(dir, d.name), rel));
  }
  return out;
}
const pages = ['', ...collectPages(SITE, '')];

for (const page of pages) {
  const file = join(SITE, page, 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const path = page ? `/${page}/` : '/';
  const label = path;

  // 1. Canonical
  const canonical = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  if (canonical !== `${HOST}${path}`) {
    problems.push(`${label} canonical to "${canonical}", powinno być "${HOST}${path}"`);
  }

  // 2. Długie myślniki w treści (poza JSON-LD i atrybutami to ślad AI)
  if (/—/.test(html)) problems.push(`${label} zawiera długi myślnik (—), usuń przed publikacją`);

  // 3. Schema
  const blocks = jsonLdBlocks(html);
  for (const b of blocks) {
    if (b.__parseError) problems.push(`${label} JSON-LD nie parsuje się: ${b.__parseError}`);
  }
  const types = blocks.map(b => b['@type']);
  const article = blocks.find(b => b['@type'] === 'Article' || b['@type'] === 'NewsArticle');
  const cards = [...html.matchAll(/data-venue-slug="([^"]+)"/g)].map(m => m[1]);

  const isIndexPage = types.includes('CollectionPage');
  // Profile lokali (/restaurant/<slug>/) mają własny standard:
  // typ LocalBusiness-owy z adresem i nazwą + BreadcrumbList, bez Article.
  // Strony /ar/ to lustrzane wersje językowe, sprawdzane łagodniej.
  const isVenueProfile = page.startsWith('restaurant/');
  const isArabic = page === 'ar' || page.startsWith('ar/');
  if (isVenueProfile) {
    const biz = blocks.find(b => ['Restaurant', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub', 'IceCreamShop', 'LocalBusiness'].includes(b['@type']));
    if (!biz) problems.push(`${label} profil bez schema LocalBusiness/Restaurant`);
    else {
      if (!biz.address) problems.push(`${label} profil bez adresu w schema`);
      if (!biz.name) problems.push(`${label} profil bez nazwy w schema`);
    }
    if (!types.includes('BreadcrumbList')) problems.push(`${label} brak BreadcrumbList`);
  }
  if (page && !['about'].includes(page) && !isIndexPage && !isVenueProfile && !isArabic) {
    if (!article) problems.push(`${label} brak schema Article`);
    else {
      if (!article.author || !article.author.name) problems.push(`${label} Article bez autora`);
      if (!article.dateModified) problems.push(`${label} Article bez dateModified`);
    }
    if (!types.includes('BreadcrumbList')) problems.push(`${label} brak BreadcrumbList`);
    if (cards.length) {
      const list = article && article.mainEntity && article.mainEntity.itemListElement;
      if (!list) problems.push(`${label} są karty lokali, ale brak ItemList w schema`);
      else if (list.length !== cards.length) {
        problems.push(`${label} ItemList ma ${list.length} pozycji, a kart jest ${cards.length}`);
      }
    }
    if (/class="faq"/.test(html) && !types.includes('FAQPage')) {
      problems.push(`${label} jest sekcja FAQ, ale brak schema FAQPage`);
    }
    if (!/Last verified|checked August|checked [A-Z][a-z]+ 20/.test(html) && !/Details checked/.test(html)) {
      problems.push(`${label} brak widocznej daty weryfikacji treści`);
    }
  }

  // 3b. Social/SEO meta na każdej stronie
  if (!/property="og:title"/.test(html)) problems.push(`${label} brak og:title`);
  if (!/property="og:description"/.test(html)) problems.push(`${label} brak og:description`);
  if (!/property="og:image"/.test(html)) problems.push(`${label} brak og:image`);
  if (!/rel="icon"/.test(html)) problems.push(`${label} brak favicon`);
  if (!/name="twitter:card"/.test(html)) problems.push(`${label} brak twitter:card`);

  // 4. Karty kompletne
  for (const slug of cards) {
    const cardHtml = html.split(`data-venue-slug="${slug}"`)[1] || '';
    const section = cardHtml.split('</section>')[0];
    if (!section.includes('venue-rating')) problems.push(`${label} karta ${slug} bez slotu oceny`);
    if (!section.includes('venue-reviews')) problems.push(`${label} karta ${slug} bez sekcji opinii`);
    if (!section.includes('js-maps-link')) problems.push(`${label} karta ${slug} bez linku do wizytówki Google`);
  }

  // 5. Sitemap
  if (!sitemap.includes(`${HOST}${path}`)) problems.push(`${label} nie ma w sitemap.xml`);

  ok.push(`${label} (${cards.length} kart, ${blocks.length} bloków schema)`);
}

console.log('Sprawdzone strony:');
for (const o of ok) console.log('  ✓', o);
if (problems.length) {
  console.error('\nPROBLEMY:');
  for (const p of problems) console.error('  ✗', p);
  process.exit(1);
}
console.log('\nWszystko czyste. Można publikować.');
