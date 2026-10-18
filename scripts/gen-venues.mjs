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
import { createHash } from 'node:crypto';
import { FLAG_SPRITE, cuisineChips } from './flags.mjs';
import { footerHtml } from './footer.mjs';
import { jsVersion } from './bust-css.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
const HOST = 'https://bitekrakow.com';
// Wersja CSS (hash) do cache-bustingu: /style.css jest serwowany z dlugim cache (vercel.json).
const CSS_V = createHash('md5').update(readFileSync(join(SITE, 'style.css'))).digest('hex').slice(0, 10);
// Fonty Google wstrzykiwane dopiero po pierwszym malowaniu (preload zbijal Lighthouse do ~65,
// bo Lantern liczy fonty VeryHigh jako zaleznosc FCP). Ten sam URL co na reszcie strony (cache).
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
const FONTS_HTML = `<script>(function(){var u="${FONT_URL}",n=0;function f(){var l=document.createElement("link");l.rel="stylesheet";l.href=u;document.head.appendChild(l)}function w(){var p=performance.getEntriesByType&&performance.getEntriesByType("paint");if((p&&p.length)||n++>90)requestAnimationFrame(f);else requestAnimationFrame(w)}window.requestAnimationFrame?requestAnimationFrame(w):f()})();</script>
  <noscript><link rel="stylesheet" href="${FONT_URL.replace(/&/g, '&amp;')}"></noscript>`;
// Dzisiejsza data: trafia do lastmod TYLKO gdy tresc profilu faktycznie sie zmienila (scripts/lastmod.json).
const TODAY = new Date().toISOString().slice(0, 10);

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
    if (['api', 'img', 'restaurant', 'restaurants', 'ar', 'pl', 'data'].includes(d.name)) continue;
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
// Godziny: jesli wlasciciel publikuje je na swojej stronie (attrs.hours_override,
// ustawiane przez bk-clients.py), maja pierwszenstwo przed Google Places.
function hoursOf(v) {
  return (v.attrs && v.attrs.hours_override) || v.hours || null;
}
function hoursSpec(v) {
  const H = hoursOf(v);
  const per = H && H.periods;
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
// ---------- 3b. W poblizu: 6 najblizszych lokali z wlasnym profilem ----------
// Czysto po odleglosci (bez premii dla kogokolwiek). Daje kazdemu profilowi linki
// z sasiednich profili, czyli siatke linkow wewnetrznych zamiast samej listy /restaurants/.
const KIND = { CafeOrCoffeeShop: 'Cafe', Bakery: 'Bakery', IceCreamShop: 'Ice cream', BarOrPub: 'Bar', Winery: 'Wine bar', Restaurant: 'Restaurant', FastFoodRestaurant: 'Quick bite', LocalBusiness: 'Place' };
const profiled = venues.filter(x => featured[x.slug] && featured[x.slug].length && x.lat && x.lng);
function metres(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function nearbyHtml(v) {
  if (!v.lat || !v.lng) return '';
  const near = profiled.filter(x => x.slug !== v.slug)
    .map(x => ({ x, d: metres(v, x) })).filter(o => o.d <= 1500)
    .sort((a, b) => a.d - b.d).slice(0, 6);
  if (near.length < 2) return '';
  const fmt = d => d < 950 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`;
  return `      <section class="vp-block">
        <h2 class="vp-h">Nearby on BiteKrakow</h2>
        <ul class="vp-nearby">
${near.map(({ x, d }) => `          <li><a href="/restaurant/${x.slug}/"><span class="nb-name">${esc(x.name)}</span><span class="nb-meta">${KIND[schemaType(x)] || 'Place'} · ${fmt(d)}, ${Math.max(1, Math.round(d / 80))} min walk</span></a></li>`).join('\n')}
        </ul>
      </section>`;
}

function venuePage(v) {
  const feats = featured[v.slug] || [];
  const type = schemaType(v);
  const url = `${HOST}/restaurant/${v.slug}/`;
  const amens = amenities(v);
  const H = hoursOf(v);
  const weekday = H && H.weekdayDescriptions;
  const ownHours = !!(v.attrs && v.attrs.hours_override);
  const menu = v.attrs && v.attrs.menu;
  const heroImg = (v.attrs && v.attrs.hero_image) || `/api/photo?slug=${v.slug}`;
  const heroAbs = heroImg.startsWith('/api/') ? `${HOST}${heroImg}` : `${HOST}${heroImg}`;
  const heroAlt = (v.attrs && v.attrs.hero_alt) || null;
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
    image: heroAbs,
    address: {
      '@type': 'PostalAddress',
      streetAddress: streetOf(v.address),
      addressLocality: 'Kraków',
      addressCountry: 'PL'
    },
    servesCuisine: cuisineTags,
    priceRange: v.price_range || undefined,
    telephone: v.phone || undefined,
    // sameAs: tylko prawdziwe, zweryfikowane linki (Maps, www, Instagram z attrs.instagram).
    // Nigdy nie zgadujemy adresow profili spolecznosciowych.
    sameAs: [...new Set([v.maps_url, v.website_url, v.attrs && v.attrs.instagram].filter(Boolean))],
  };
  if (v.lat && v.lng) schema.geo = { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng };
  // Ocena Google pokazujemy na stronie ("Reviews from Google"), ale NIE oznaczamy jej
  // jako wlasny aggregateRating w schema — wytyczne Google zabraniaja oznaczania
  // ocen zewnetrznych/cudzych jako swoich (ryzyko manual action). Zostaje tylko
  // nasza autorska recenzja (Review ponizej).
  if (menu && Array.isArray(menu.sections) && menu.sections.length) {
    schema.hasMenu = {
      '@type': 'Menu',
      name: `${v.name} menu`,
      url: menu.source,
      inLanguage: 'en',
      hasMenuSection: menu.sections.filter(sec => sec.items && sec.items.length).map(sec => ({
        '@type': 'MenuSection',
        name: sec.name,
        ...(sec.note ? { description: sec.note } : {}),
        hasMenuItem: sec.items.map(it => ({
          '@type': 'MenuItem',
          name: it.name,
          ...(it.alternateName ? { alternateName: it.alternateName } : {}),
          ...(it.description ? { description: it.description } : {}),
          ...(it.price ? { offers: { '@type': 'Offer', price: it.price, priceCurrency: menu.currency || 'PLN' } } : {})
        }))
      }))
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

  // Daty strony: datePublished = kiedy lokal trafil do bazy, dateModified = ostatnie
  // odswiezenie danych z Google (ocena/godziny). LocalBusiness nie ma tych pol, wiec
  // siedza na WebPage, ktorej mainEntity to lokal.
  const day = d => (d ? String(d).slice(0, 10) : undefined);
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: `${v.name}, Kraków: hours, prices and what to order`,
    inLanguage: 'en',
    datePublished: day(v.created_at),
    dateModified: day(v.rating_synced_at) || day(v.created_at),
    isPartOf: { '@type': 'WebSite', name: 'BiteKrakow', url: `${HOST}/` },
    author: { '@type': 'Person', name: 'Cezary Musiał', url: `${HOST}/about/` },
    publisher: { '@type': 'Organization', name: 'BiteKrakow', url: `${HOST}/` },
    mainEntity: { '@id': url }
  };

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

  const fmtDate = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
  const menuHtml = menu && Array.isArray(menu.sections) && menu.sections.length ? `
      <section class="vp-block vp-menu" id="menu">
        <h2 class="vp-h">Menu</h2>
        <p class="vp-menu-src">From ${esc(v.name)}'s own menu, translated by us. Checked ${esc(fmtDate(menu.checked))}${menu.sections.some(sec => (sec.items || []).some(it => it.price)) ? '. Prices in zł' : ''}. <a href="${esc(menu.source)}" target="_blank" rel="noopener">Current menu on their site</a>.</p>
        ${menu.sections.map(sec => `<div class="vp-menu-sec">
          <h3>${esc(sec.name)}</h3>${sec.note ? `
          <p class="vp-menu-note">${esc(sec.note)}</p>` : ''}${sec.items && sec.items.length ? `
          <ul>
            ${sec.items.map(it => `<li><div class="mi-row"><span class="mi-name">${esc(it.name)}${it.alternateName ? ` <span class="mi-alt" lang="pl">${esc(it.alternateName)}</span>` : ''}</span>${it.price ? `<span class="mi-price">${esc(it.price)} zł</span>` : ''}</div>${it.description ? `<p class="mi-desc">${esc(it.description)}</p>` : ''}</li>`).join('\n            ')}
          </ul>` : ''}
        </div>`).join('\n        ')}
      </section>` : '';

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
  <meta property="og:image" content="${heroAbs}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(v.name)}, Kraków | BiteKrakow">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${heroAbs}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://lh3.googleusercontent.com" crossorigin>
  ${FONTS_HTML}
  <link rel="stylesheet" href="/style.css?v=${CSS_V}">
  <script type="application/ld+json">
${JSON.stringify(schema, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
  <script type="application/ld+json">
${JSON.stringify(webpage, null, 2).split('\n').map(l => '  ' + l).join('\n')}
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
      <a href="/map/">Map</a>
      <a href="/restaurants/">Places</a>
      <a href="/news/">News</a>
      <a href="/about/">About</a>
    </nav>
  </div>
</header>

<article class="venue-profile" data-venue-slug="${v.slug}">
  <div class="wrap vp-topwrap">
    <nav class="vp-crumb" aria-label="Breadcrumb">
      <a href="/restaurants/">All places</a>
      <span aria-hidden="true">/</span>
      <a href="/restaurants/#${displayDistrict.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${esc(displayDistrict)}</a>
      <span aria-hidden="true">/</span>
      <span class="cur">${esc(v.name)}</span>
    </nav>
    <header class="vp-head">
      <span class="pill">${esc(displayDistrict)}${v.price_range ? ` · ${esc(v.price_range)}` : ''}</span>
      <h1>${esc(v.name)}</h1>
      ${v.description_en ? `<p class="vp-tagline">${esc(v.description_en)}</p>` : ''}
    </header>
  </div>

  <div class="wrap vp-hero-wrap">
    <div class="vp-hero">
      <img src="${esc(heroImg)}" alt="${esc(heroAlt || `${v.name} in ${displayDistrict}, Kraków`)}" fetchpriority="high" decoding="async" width="720" height="420" onerror="this.parentNode.classList.add('noimg')">
    </div>
  </div>

  <div class="wrap vp-layout">
    <main class="vp-main">
      ${feats.length ? `<section class="vp-block">
        <h2 class="vp-h">Our take</h2>
        ${quotesHtml || `<p>${esc(v.description_en || `${v.name} is covered across the BiteKrakow guides.`)}</p>`}
      </section>` : ''}

      ${feats.length ? `<section class="vp-block">
        <h2 class="vp-h">Featured in our guides</h2>
        <ul class="featured-list">
${featsHtml}
        </ul>
      </section>` : ''}

${menuHtml}
${nearbyHtml(v)}
      <section class="vp-block">
        <div class="venue-reviews" hidden></div>
      </section>

      <p class="vp-editor-note">
        Every place on BiteKrakow was picked by an editor, not an algorithm.
        Browse <a href="/restaurants/">all places</a> or start from
        <a href="/guides/">the guides</a>.
      </p>
    </main>

    <aside class="vp-side">
      <div class="vp-info-card">
        <div class="venue-rating vp-grating" aria-label="Google rating"></div>
        <dl class="vp-facts">
          <div><dt>Address</dt><dd>${esc(v.address || `${displayDistrict}, Kraków`)}</dd></div>
          ${v.price_range ? `<div><dt>Price</dt><dd>${esc(v.price_range)}</dd></div>` : ''}
          ${cuisineTags.length ? `<div><dt>Cuisine</dt><dd class="vp-cuisine">${cuisineTags.map(t => esc(t)).join(', ')}</dd></div>` : ''}
          ${v.phone ? `<div><dt>Phone</dt><dd><a href="tel:${esc(v.phone.replace(/\s+/g, ''))}">${esc(v.phone)}</a></dd></div>` : ''}
        </dl>${hoursHtml}${amensHtml}
        <div class="vp-actions">
          <a class="btn btn-primary js-maps-link" href="https://maps.google.com/?q=${encodeURIComponent(v.name + ' ' + (v.address || 'Kraków'))}" target="_blank" rel="noopener">See on Google Maps</a>
          ${v.website_url ? `<a class="btn btn-ghost" href="${esc(v.website_url)}" target="_blank" rel="noopener">Website</a>` : ''}
        </div>
        <p class="vp-source">${ownHours ? 'Hours and menu from the venue\'s own website. Ratings and amenity details from Google.' : 'Ratings, hours and amenity details from Google.'}</p>
      </div>
    </aside>
  </div>
</article>

${footerHtml('en', ['Ratings, review quotes, opening hours, amenity details and some photos on this page come from Google.'])}

<script src="/venue-cards.js?v=${jsVersion('venue-cards.js')}" defer></script>
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

// ---------- 5b. Dane interaktywnej mapy /map/ ----------
// Ranking: klienci z wlasnym profilem na gorze (zawsze widoczni przy oddalonej mapie),
// potem ocena redakcji, potem ocena Google wazona liczba opinii.
const MAP_TOP = ['bruk-cafe', 'cafe-belmont', 'coppa'];
const mapType = v => { const t = schemaType(v); return ['CafeOrCoffeeShop', 'Bakery', 'IceCreamShop', 'LocalBusiness'].includes(t) ? 'cafe' : t === 'BarOrPub' ? 'bar' : 'food'; };
const edScore = v => Math.max(0, ...(featured[v.slug] || []).map(f => parseFloat(f.score) || 0));
function mapQuote(v) {
  const rs = (Array.isArray(v.reviews) ? v.reviews : []).filter(r => r && r.text && (r.rating || 0) >= 4);
  if (!rs.length) return null;
  const pick = rs.find(r => r.text.length >= 50 && r.text.length <= 240) || rs[0];
  let t = pick.text.replace(/\s+/g, ' ').trim();
  if (t.length > 180) t = t.slice(0, 180).replace(/\s+\S*$/, '') + '…';
  const parts = String(pick.author || '').trim().split(/\s+/);
  const a = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : (parts[0] || 'Google user');
  return { t, a, r: pick.rating };
}
const mapPts = madeSlugs.map(sl => bySlug[sl]).filter(v => v.lat && v.lng);
mapPts.sort((x, y) => {
  const ix = MAP_TOP.indexOf(x.slug), iy = MAP_TOP.indexOf(y.slug);
  if (ix !== -1 || iy !== -1) return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy);
  const ds = edScore(y) - edScore(x);
  if (Math.abs(ds) > 0.01) return ds;
  return (y.rating || 0) * Math.log10((y.reviews_count || 0) + 10) - (x.rating || 0) * Math.log10((x.reviews_count || 0) + 10);
});
const mapData = mapPts.map((v, i) => {
  const f = (featured[v.slug] || [])[0];
  return {
    s: v.slug, n: v.name, d: v.district || 'Kraków', t: mapType(v), p: i + 1,
    lat: +(+v.lat).toFixed(5), lng: +(+v.lng).toFixed(5),
    r: v.rating ? +v.rating : null, c: v.reviews_count || 0,
    sc: edScore(v) || null, pr: v.price_range || null, q: mapQuote(v),
    g: f ? { p: f.path, t: f.title } : null,
    k: ((v.tags || [])[0] || '').replace(/\b\w/g, ch => ch.toUpperCase()) || null,
    a: streetOf(v.address) || null,
    img: (v.attrs && v.attrs.hero_image) || null,
    // wybrane zdjecie z Google (wnetrze/fasada) do kart na glownej + autor do podpisu (wymog Places)
    pa: (v.attrs && Array.isArray(v.attrs.photo_pick) && v.attrs.photo_pick[0] && v.attrs.photo_pick[0].author) || undefined,
    palt: (v.attrs && Array.isArray(v.attrs.photo_pick) && v.attrs.photo_pick[0] && v.attrs.photo_pick[0].alt) || undefined,
    cl: ['bruk-cafe', 'cafe-belmont', 'coppa'].includes(v.slug) ? 1 : 0
  };
});
mkdirSync(join(SITE, 'data'), { recursive: true });
writeFileSync(join(SITE, 'data', 'map-venues.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), venues: mapData }));

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
        <span class="vt-photo"><img src="/api/photo?slug=${v.slug}" alt="" loading="lazy" decoding="async" width="64" height="64" onerror="this.parentNode.classList.add('noimg')"></span>
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
  <link rel="preconnect" href="https://lh3.googleusercontent.com" crossorigin>
  ${FONTS_HTML}
  <link rel="stylesheet" href="/style.css?v=${CSS_V}">
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
      <a href="/map/">Map</a>
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

${footerHtml('en', ['Ratings shown on this page come from Google.'])}

</body>
</html>
`;
mkdirSync(join(SITE, 'restaurants'), { recursive: true });
writeFileSync(join(SITE, 'restaurants', 'index.html'), indexHtml);

// ---------- 7. Sitemap ----------
const smFile = join(SITE, 'sitemap.xml');
let sm = readFileSync(smFile, 'utf8');
// lastmod = dzien ostatniej REALNEJ zmiany tresci (hash strony bez hasha CSS), nie data uruchomienia.
// Google ignoruje lastmod, ktory zmienia sie przy kazdym buildzie, a uczciwy pomaga w recrawlu.
const LM_FILE = new URL('./lastmod.json', import.meta.url).pathname;
const lm = existsSync(LM_FILE) ? JSON.parse(readFileSync(LM_FILE, 'utf8')) : {};
const stamp = (key, html) => {
  const h = createHash('md5').update(html.replace(/style\.css\?v=[0-9a-f]+/g, '').replace(/"dateModified":"[^"]*"/g, '')).digest('hex').slice(0, 12);
  if (!lm[key] || lm[key].h !== h) lm[key] = { h, d: TODAY };
  return lm[key].d;
};
const venueXml = [
  `  <url>\n    <loc>${HOST}/restaurants/</loc>\n    <lastmod>${stamp('restaurants', indexHtml)}</lastmod>\n  </url>`,
  ...madeSlugs.map(s => `  <url>\n    <loc>${HOST}/restaurant/${s}/</loc>\n    <lastmod>${stamp(s, readFileSync(join(SITE, 'restaurant', s, 'index.html'), 'utf8'))}</lastmod>\n  </url>`)
].join('\n');
writeFileSync(LM_FILE, JSON.stringify(Object.fromEntries(Object.entries(lm).sort()), null, 1) + '\n');
sm = sm.replace(/  <!-- venues:start -->[\s\S]*?<!-- venues:end -->/,
  `  <!-- venues:start -->\n${venueXml}\n  <!-- venues:end -->`);
writeFileSync(smFile, sm);

for (const f of ['index.html', 'ar/index.html']) {
  const fp = join(SITE, f);
  if (!existsSync(fp)) continue;
  const h = readFileSync(fp, 'utf8');
  const n = h.replace(/(data-stat="places">)\d+/g, `$1${madeSlugs.length}`).replace(/(data-stat="districts">)\d+/g, `$1${districts.length}`);
  if (n !== h) writeFileSync(fp, n);
}

console.log(`Profile: ${madeSlugs.length} stron, indeks: ${made.length} lokali, ${districts.length} dzielnic`);
console.log(`Pominięte (bez artykułu): ${skipped.join(', ') || 'brak'}`);
