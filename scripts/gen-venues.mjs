// Generator stron per lokal (/restaurant/<slug>/) + indeksu (/restaurants/).
//
// Źródła prawdy:
//  - Supabase (REST, klucz anon z /api/config): nazwa, adres, ocena, godziny,
//    znaczniki z Google Places (attrs), telefon, geo
//  - lokalne artykuły: gdzie lokal jest opisany ("featured in"), nasza ocena
//    i werdykt (cytaty redakcyjne)
//
// Strony generujemy TYLKO dla lokali opisanych w co najmniej jednym artykule,
// więc lokale usunięte z treści (konkurencja partnera, zamknięte) nie dostają
// profili automatycznie.
//
// Użycie: node scripts/gen-venues.mjs
// Idempotentny: nadpisuje wygenerowane pliki i sekcję venues w sitemap.xml.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FLAG_SPRITE, cuisineChips } from './flags.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
const HOST = 'https://bitekrakow.com';
const TODAY = '2026-08-19';

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- 1. Dane z Supabase ----------
const cfg = await (await fetch(`${HOST}/api/config`)).json();
const sbHeaders = { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` };
const venues = await (await fetch(
  `${cfg.url}/rest/v1/venues?select=*&active=eq.true&order=slug`, { headers: sbHeaders }
)).json();
if (!Array.isArray(venues)) { console.error('Supabase nie oddał lokali:', venues); process.exit(1); }
const bySlug = Object.fromEntries(venues.map(v => [v.slug, v]));

// ---------- 2. Skan artykułów: featured-in + cytaty ----------
function walkPages(dir, prefix) {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    if (['api', 'img', 'restaurant', 'restaurants', 'ar'].includes(d.name)) continue;
    const rel = prefix ? `${prefix}/${d.name}` : d.name;
    out.push(rel, ...walkPages(join(dir, d.name), rel));
  }
  return out;
}
const featured = {}; // slug -> [{path, title, score, verdict}]
for (const page of walkPages(SITE, '')) {
  const file = join(SITE, page, 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1];
  const title = h1 ? h1.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : page;
  const re = /<section class="venue-card"[^>]*data-venue-slug="([^"]+)"[\s\S]*?<\/section>/g;
  let m;
  while ((m = re.exec(html))) {
    const block = m[0], slug = m[1];
    const score = (block.match(/<div class="score">\s*([\d.]+|NEW)/) || [])[1] || null;
    const verdict = (block.match(/<p class="verdict">([\s\S]*?)<\/p>/) || [])[1];
    (featured[slug] ||= []).push({
      path: `/${page}/`, title,
      score,
      verdict: verdict ? verdict.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null
    });
  }
}

// ---------- 3. Mapowania ----------
function schemaType(v) {
  const t = (v.tags || []).join(' ').toLowerCase();
  if (/coworking/.test(t)) return 'LocalBusiness';
  if (/bakery|patisserie|cukiernia/.test(t)) return 'Bakery';
  if (/ice cream|lody/.test(t)) return 'IceCreamShop';
  if (/wine bar|aperitivo|oyster|jazz|cocktail|pub|beer garden|brewery/.test(t)) return 'BarOrPub';
  if (/coffee|cafe|matcha|tiramisu/.test(t) && !/restaurant/.test(t)) return 'CafeOrCoffeeShop';
  return 'Restaurant';
}

const AMENITY_LABELS = {
  outdoorSeating: 'Outdoor seating',
  servesVegetarianFood: 'Vegetarian options',
  allowsDogs: 'Dogs welcome',
  reservable: 'Takes reservations',
  delivery: 'Delivery',
  takeout: 'Takeout',
  goodForChildren: 'Good for kids',
  goodForGroups: 'Good for groups',
  servesBreakfast: 'Breakfast',
  servesLunch: 'Lunch',
  servesDinner: 'Dinner',
  servesCoffee: 'Coffee',
  servesDessert: 'Desserts',
  servesBeer: 'Beer',
  servesWine: 'Wine',
  servesCocktails: 'Cocktails',
};

// Wi-Fi, klimatyzacja i "laptop-friendly" nie są dostępne w Google Places API,
// więc bierzemy je z tagów lokalu (wpisywanych ręcznie w bazie).
const TAG_AMENITIES = [
  [/\bwi-?fi\b|free wifi/i, 'Free WiFi'],
  [/laptop|work.?friendly|do pracy/i, 'Laptop-friendly'],
  [/\bsockets?\b|power|gniazdka/i, 'Power sockets'],
  [/air.?con|klimatyzacj|\ba\/?c\b/i, 'Air conditioning'],
  [/pet.?friendly|dog.?friendly/i, 'Dogs welcome'],
];

function amenities(v) {
  const a = v.attrs || {};
  const out = [];
  const seen = new Set();
  const add = (label, warn) => { if (!seen.has(label)) { seen.add(label); out.push(warn ? { label, warn } : { label }); } };
  const pay = a.paymentOptions || {};
  if (pay.acceptsCreditCards) add('Cards accepted');
  if (pay.acceptsNfc) add('Contactless pay');
  if (pay.acceptsCashOnly) add('Cash only', true);
  for (const [k, label] of Object.entries(AMENITY_LABELS)) {
    if (a[k] === true) add(label);
  }
  const acc = a.accessibilityOptions || {};
  if (acc.wheelchairAccessibleEntrance) add('Wheelchair accessible');
  // Znaczniki z tagów (Wi-Fi, laptop, klimatyzacja) - czego Places nie oddaje
  const tagStr = (v.tags || []).join(' ');
  for (const [re, label] of TAG_AMENITIES) {
    if (re.test(tagStr)) add(label);
  }
  return out;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function hoursSpec(v) {
  const per = v.hours && v.hours.periods;
  if (!Array.isArray(per)) return null;
  return per.filter(p => p.open && p.close).map(p => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAYS[p.open.day],
    opens: `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute || 0).padStart(2, '0')}`,
    closes: `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute || 0).padStart(2, '0')}`
  }));
}

function streetOf(addr) {
  return (addr || '').split(',')[0].trim();
}

// ---------- 4. Strona profilu ----------
function venuePage(v) {
  const feats = featured[v.slug] || [];
  const type = schemaType(v);
  const url = `${HOST}/restaurant/${v.slug}/`;
  const amens = amenities(v);
  const weekday = v.hours && v.hours.weekdayDescriptions;
  const cuisineTags = (v.tags || []).slice(0, 6);
  const displayDistrict = v.district || 'Kraków';
  const desc = v.description_en ||
    `${v.name} in ${displayDistrict}, Kraków: address, opening hours, prices and what to order, from the BiteKrakow guides.`;
  const metaDesc = `${v.name}, ${displayDistrict}, Kraków: ${desc.length > 110 ? desc.slice(0, 110).replace(/\s+\S*$/, '') + '…' : desc} Hours, prices, Google rating and what to order.`.slice(0, 300);

  const schema = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': url,
    name: v.name,
    url,
    image: `${HOST}/api/photo?slug=${v.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: streetOf(v.address),
      addressLocality: 'Kraków',
      addressCountry: 'PL'
    },
    servesCuisine: cuisineTags,
    priceRange: v.price_range || undefined,
    telephone: v.phone || undefined,
    sameAs: [v.maps_url, v.website_url].filter(Boolean),
  };
  if (v.lat && v.lng) schema.geo = { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng };
  if (v.rating && v.reviews_count) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(v.rating), reviewCount: v.reviews_count,
      bestRating: '5', worstRating: '1'
    };
  }
  const spec = hoursSpec(v);
  if (spec && spec.length) schema.openingHoursSpecification = spec;
  const realQuotes = feats.filter(f => f.verdict && f.score && f.score !== 'NEW');
  if (realQuotes.length) {
    const q = realQuotes[0];
    schema.review = {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: q.score, bestRating: '10', worstRating: '1' },
      author: { '@type': 'Person', name: 'Cezary Musiał', url: `${HOST}/about/` },
      reviewBody: q.verdict
    };
  }
  if (feats.length) schema.subjectOf = feats.map(f => ({ '@type': 'Article', headline: f.title, url: `${HOST}${f.path}` }));

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BiteKrakow', item: `${HOST}/` },
      { '@type': 'ListItem', position: 2, name: 'All places', item: `${HOST}/restaurants/` },
      { '@type': 'ListItem', position: 3, name: v.name, item: url }
    ]
  };

  const quotesHtml = feats.filter(f => f.verdict).map(f => `
      <div class="bk-quote">
        <div class="bk-score">${f.score === 'NEW' ? 'NEW OPENING' : `${esc(f.score)}/10 · BITEKRAKOW SCORE`}</div>
        <blockquote>${esc(f.verdict)}</blockquote>
        <p class="bk-src">From <a href="${f.path}">${esc(f.title)}</a></p>
      </div>`).join('');

  const featsHtml = feats.map(f => `        <li><a href="${f.path}">${esc(f.title)}</a></li>`).join('\n');

  const amensHtml = amens.length ? `
        <div class="amenity-grid">
          ${amens.map(a => `<span class="amen${a.warn ? ' warn' : ''}">${esc(a.label)}</span>`).join('\n          ')}
        </div>` : '';

  const hoursHtml = weekday && weekday.length ? `
        <div class="venue-hours">
          <div class="hrs-title">Opening hours</div>
          <dl>
            ${weekday.map(d => {
              const i = d.indexOf(':');
              return `<dt>${esc(d.slice(0, i))}</dt><dd>${esc(d.slice(i + 1).trim())}</dd>`;
            }).join('\n            ')}
          </dl>
        </div>` : '';

  const tagsHtml = cuisineTags.map(t => `<span class="pill">${esc(t)}</span>`).join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(v.name)}, Kraków: Hours, Prices and What to Order | BiteKrakow</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:site_name" content="BiteKrakow">
  <meta property="og:type" content="business.business">
  <meta property="og:title" content="${esc(v.name)}, ${esc(displayDistrict)}, Kraków">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${HOST}/api/photo?slug=${v.slug}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(v.name)}, Kraków | BiteKrakow">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${HOST}/api/photo?slug=${v.slug}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
${JSON.stringify(schema, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">Bite<span>Krakow</span></a>
    <nav class="site-nav">
      <a href="/guides/">Guides</a>
      <a href="/restaurants/">Places</a>
      <a href="/news/">News</a>
      <a href="/about/">About</a>
    </nav>
  </div>
</header>

<article>
  <header class="article-header wrap-narrow">
    <span class="pill">${esc(displayDistrict)}${v.price_range ? ` · ${esc(v.price_range)}` : ''}</span>
    <h1>${esc(v.name)}</h1>
    <p class="meta">Place profile · Details and ratings from Google and the BiteKrakow guides · Updated ${TODAY.split('-').reverse().join('.')}</p>
  </header>

  <div class="article-body wrap">
    <section class="venue-card" id="${v.slug}" data-venue-slug="${v.slug}">
      <div class="venue-photo">
        <img src="/api/photo?slug=${v.slug}" alt="${esc(v.name)} in ${esc(displayDistrict)}, Kraków" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="venue-body">
        <div class="venue-rating" aria-label="Google rating"></div>
        <div class="venue-meta">
          <span>${esc(v.address || '')}</span>
          ${v.hours_short ? `<span>${esc(v.hours_short)}</span>` : ''}
          ${v.price_range ? `<span>${esc(v.price_range)}</span>` : ''}
        </div>${amensHtml}${hoursHtml}
        <div class="venue-tags">
          ${tagsHtml}
        </div>
        <div class="venue-reviews" hidden></div>
        <div class="venue-actions">
          <a class="btn btn-primary js-maps-link" href="https://maps.google.com/?q=${encodeURIComponent(v.name + ' ' + (v.address || 'Kraków'))}" target="_blank" rel="noopener">See on Google Maps</a>
          ${v.website_url ? `<a class="btn btn-ghost" href="${esc(v.website_url)}" target="_blank" rel="noopener">Website</a>` : ''}
        </div>
      </div>
    </section>

    <div class="prose">
      ${v.description_en ? `<p>${esc(v.description_en)}</p>` : ''}
      ${quotesHtml}
      ${feats.length ? `
      <h2 class="deco">Featured in our guides</h2>
      <ul class="featured-list">
${featsHtml}
      </ul>` : ''}
      <p style="margin-top:28px;">
        Every place on BiteKrakow was picked by an editor, not an algorithm.
        Browse <a href="/restaurants/">all places</a> or start from
        <a href="/guides/">the guides</a>.
      </p>
    </div>
  </div>
</article>

<footer class="site-footer">
  <div class="wrap">
    <a class="logo" href="/">Bite<span>Krakow</span></a>
    <nav class="foot-nav">
      <a href="/guides/">All guides</a>
      <a href="/restaurants/">All places</a>
      <a href="/news/">News</a>
      <a href="mailto:hello@bitekrakow.com">hello@bitekrakow.com</a>
    </nav>
    <p>Independent guides to Krakow's food and coffee scene. Written by locals, updated year-round.</p>
    <p>Ratings, review quotes, opening hours, amenity details and some photos on this page come from Google.</p>
  </div>
</footer>

<script src="/venue-cards.js" defer></script>
</body>
</html>
`;
}

// ---------- 5. Generacja profili ----------
const madeSlugs = [];
const skipped = [];
for (const v of venues) {
  if (!featured[v.slug] || !featured[v.slug].length) { skipped.push(v.slug); continue; }
  const dir = join(SITE, 'restaurant', v.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), venuePage(v));
  madeSlugs.push(v.slug);
}

// ---------- 6. Indeks /restaurants/ ----------
const made = madeSlugs.map(s => bySlug[s]);
const byDistrict = {};
for (const v of made) (byDistrict[v.district || 'Kraków'] ||= []).push(v);
const districts = Object.keys(byDistrict).sort((a, b) => byDistrict[b].length - byDistrict[a].length);

const CUISINE_LINKS = [
  ['Italian', '/italian-krakow/'], ['Ramen & Japanese', '/ramen-krakow/'],
  ['Georgian', '/georgian-krakow/'], ['Vietnamese', '/vietnamese-krakow/'],
  ['Indian', '/indian-krakow/'], ['Pierogi \u0026 Polish', '/pierogi-krakow/'], ['Thai', '/thai-krakow/'],
  ['Mexican', '/mexican-krakow/'], ['Kebab \u0026 Middle East', '/kebab-krakow/'], ['Korean', '/korean-krakow/'],
  ['Specialty coffee', '/specialty-coffee-krakow/'],
  ['Breakfast', '/breakfast-krakow/'], ['Ice cream', '/ice-cream-krakow/'],
];

const indexSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'All Places on BiteKrakow',
  url: `${HOST}/restaurants/`,
  publisher: { '@type': 'Organization', name: 'BiteKrakow', url: HOST },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: made.length,
    itemListElement: made.map((v, i) => ({
      '@type': 'ListItem', position: i + 1, name: v.name, url: `${HOST}/restaurant/${v.slug}/`
    }))
  }
};

const districtSections = districts.map(d => `
    <section class="venue-district" id="${d.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">
      <h2 class="deco">${esc(d)} <small class="vd-count">${byDistrict[d].length} places</small></h2>
      <div class="venue-grid">
      ${byDistrict[d].map(v => {
        const cuisine = (v.tags || [])[0] || '';
        const meta = [cuisine, v.price_range].filter(Boolean).join(' · ');
        return `<a class="venue-tile" href="/restaurant/${v.slug}/">
        <span class="vt-photo"><img src="/api/photo?slug=${v.slug}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg')"></span>
        <span class="vt-body">
          <span class="vt-name">${esc(v.name)}</span>
          <span class="vt-meta">${esc(meta)}</span>
        </span>
        ${v.rating ? `<span class="vt-rating">★ ${v.rating}</span>` : ''}
      </a>`;
      }).join('\n      ')}
      </div>
    </section>`).join('\n');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All ${made.length} Places We Cover in Krakow | BiteKrakow</title>
  <meta name="description" content="Every cafe, restaurant and bar on BiteKrakow in one index: ${made.length} places across ${districts.length} Krakow districts, each with hours, prices, Google rating and what to order.">
  <link rel="canonical" href="${HOST}/restaurants/">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:site_name" content="BiteKrakow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="All ${made.length} Places We Cover in Krakow | BiteKrakow">
  <meta property="og:description" content="Every cafe, restaurant and bar on BiteKrakow in one index, district by district.">
  <meta property="og:url" content="${HOST}/restaurants/">
  <meta property="og:image" content="${HOST}/img/og-default.jpg">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="All ${made.length} Places We Cover in Krakow | BiteKrakow">
  <meta name="twitter:description" content="Every cafe, restaurant and bar on BiteKrakow in one index, district by district.">
  <meta name="twitter:image" content="${HOST}/img/og-default.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
${JSON.stringify(indexSchema, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "BiteKrakow", "item": "${HOST}/" },
      { "@type": "ListItem", "position": 2, "name": "All places", "item": "${HOST}/restaurants/" }
    ]
  }
  </script>
</head>
<body>
${FLAG_SPRITE}

<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">Bite<span>Krakow</span></a>
    <nav class="site-nav">
      <a href="/guides/">Guides</a>
      <a href="/restaurants/" aria-current="page">Places</a>
      <a href="/news/">News</a>
      <a href="/about/">About</a>
    </nav>
  </div>
</header>

<article>
  <header class="article-header wrap-narrow">
    <span class="pill">Index</span>
    <h1>Every place we cover, one page</h1>
    <p class="meta">${made.length} places · ${districts.length} districts · Each with hours, prices, Google rating and what to order</p>
  </header>

  <div class="article-body wrap">
    <div class="prose">
      <p>
        Every cafe, restaurant and bar that appears in a BiteKrakow guide has its own
        profile here: address, opening hours, live Google rating, what to order and
        which of our guides it earned a place in. Start with a cuisine, a district,
        or just browse.
      </p>
      ${cuisineChips('en')}
      <div class="chip-alt" style="margin-top: 12px;"><span class="lbl">Also</span><a href="/specialty-coffee-krakow/">Coffee</a><a href="/breakfast-krakow/">Breakfast</a><a href="/ice-cream-krakow/">Ice cream</a></div>
    </div>
${districtSections}
  </div>
</article>

<footer class="site-footer">
  <div class="wrap">
    <a class="logo" href="/">Bite<span>Krakow</span></a>
    <nav class="foot-nav">
      <a href="/guides/">All guides</a>
      <a href="/news/">News</a>
      <a href="/about/">About</a>
      <a href="mailto:hello@bitekrakow.com">hello@bitekrakow.com</a>
    </nav>
    <p>Independent guides to Krakow's food and coffee scene. Written by locals, updated year-round.</p>
    <p>Ratings shown on this page come from Google.</p>
  </div>
</footer>

</body>
</html>
`;
mkdirSync(join(SITE, 'restaurants'), { recursive: true });
writeFileSync(join(SITE, 'restaurants', 'index.html'), indexHtml);

// ---------- 7. Sitemap ----------
const smFile = join(SITE, 'sitemap.xml');
let sm = readFileSync(smFile, 'utf8');
const venueXml = [
  `  <url>\n    <loc>${HOST}/restaurants/</loc>\n    <lastmod>${TODAY}</lastmod>\n  </url>`,
  ...madeSlugs.map(s => `  <url>\n    <loc>${HOST}/restaurant/${s}/</loc>\n    <lastmod>${TODAY}</lastmod>\n  </url>`)
].join('\n');
sm = sm.replace(/  <!-- venues:start -->[\s\S]*?<!-- venues:end -->/,
  `  <!-- venues:start -->\n${venueXml}\n  <!-- venues:end -->`);
writeFileSync(smFile, sm);

console.log(`Profile: ${madeSlugs.length} stron, indeks: ${made.length} lokali, ${districts.length} dzielnic`);
console.log(`Pominięte (bez artykułu): ${skipped.join(', ') || 'brak'}`);
