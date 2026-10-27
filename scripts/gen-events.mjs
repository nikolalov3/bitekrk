// Kalendarz wydarzen jedzenia i picia: site/data/events.json -> /events/ + pasek "What's on"
// i sekcja na stronie glownej (miedzy znacznikami). Plakietki "Live now" liczy w przegladarce
// site/live.js (czas Krakowa), wiec strona nie wymaga przebudowy, zeby "zyc".
// Wydarzenia po terminie wypadaja przy kazdym uruchomieniu; status "tbc" = bez schema Event.
// Uzycie: node scripts/gen-events.mjs   (potem bust-css + check, jak zawsze)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { footerHtml } from './footer.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
const HOST = 'https://bitekrakow.com';
const data = JSON.parse(readFileSync(join(SITE, 'data', 'events.json'), 'utf8'));
const now = Date.now();
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = iso => { const d = iso.slice(0, 10).split('-'); return { d: +d[2], m: MON[+d[1] - 1] }; };

const upcoming = data.events.filter(e => Date.parse(e.end) >= now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

function attrs(e) {
  return `data-start="${e.start}" data-end="${e.end}"${e.daily ? ` data-daily="${e.daily}"` : ''} data-hide-past`;
}
function card(e, h = 'h3') {
  const s = day(e.start), en = day(e.end), multi = e.start.slice(0, 10) !== e.end.slice(0, 10);
  const title = e.url ? `<a href="${e.url}">${esc(e.title)}</a>` : esc(e.title);
  const tbc = e.status === 'tbc' ? '<span class="live-badge is-tbc">Dates to be confirmed</span>' : '';
  return `<article class="ev-card${e.status === 'tbc' ? ' is-tbc' : ''}" ${attrs(e)}>
  <div class="ev-date" aria-hidden="true"><span class="ev-day">${s.d}</span><span class="ev-mon">${s.m}</span>${multi ? `<span class="ev-to">to ${en.d} ${en.m}</span>` : ''}</div>
  <div class="ev-body">
    <div class="live-slot">${tbc}</div>
    <p class="ev-cat">${esc(e.category)} · ${esc(e.venue)}</p>
    <${h} class="ev-title">${title}</${h}>
    <p class="ev-when">${esc(e.when)}</p>
    <p class="ev-desc">${esc(e.desc)}</p>
    <p class="ev-meta">${esc(e.price)}${e.source ? ` · <a href="${esc(e.source)}" target="_blank" rel="noopener">Organiser</a>` : ''}</p>
  </div>
</article>`;
}
function weekly(w) {
  const name = w.url ? `<a href="${w.url}">${esc(w.name)}</a>` : esc(w.name);
  return `<li class="wk-row" data-hours='${JSON.stringify(w.hours)}'>
  <span class="live-slot"></span>
  <span class="wk-name">${name}</span>
  <span class="wk-what">${esc(w.what)}</span>
  <span class="wk-meta">${esc(w.address)}, ${esc(w.district)} · ${esc(w.hours_text)}</span>
</li>`;
}

// ---------- 1. /events/ ----------
const tpl = readFileSync(join(SITE, 'photo-credits', 'index.html'), 'utf8');
const URL_ = `${HOST}/events/`;
const TITLE = 'Food and Drink Events in Krakow: What\'s On This Week | BiteKrakow';
const DESC = 'Food festivals, markets, wine fairs and Restaurant Week in Krakow, with dates, places and what is on right now. Updated by the BiteKrakow editors.';
let head = tpl.slice(0, tpl.indexOf('  <script type="application/ld+json">'));
head = head.replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`)
  .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(DESC)}">`)
  .replaceAll('https://bitekrakow.com/photo-credits/', URL_)
  .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(TITLE)}">`)
  .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(DESC)}">`)
  .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(TITLE)}">`)
  .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(DESC)}">`);

const evSchema = upcoming.filter(e => e.status === 'confirmed').map((e, i) => ({
  '@type': 'ListItem', position: i + 1,
  item: {
    '@type': /fair|festival|market|Restaurant/i.test(e.category) ? 'FoodEvent' : 'Event',
    name: e.title, startDate: e.start, endDate: e.end, description: e.desc,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: e.venue, address: { '@type': 'PostalAddress', streetAddress: e.address, addressLocality: 'Kraków', addressCountry: 'PL' } },
    organizer: { '@type': 'Organization', name: e.organizer.name, url: e.organizer.url },
    url: e.url ? `${HOST}${e.url}` : e.source,
    ...(/Free/i.test(e.price) ? { isAccessibleForFree: true } : {})
  }
}));
const ld = o => `  <script type="application/ld+json">\n  ${JSON.stringify(o, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;
const schema = [
  ld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Food and drink events in Krakow', url: URL_, description: DESC, inLanguage: 'en', dateModified: data.updated,
       publisher: { '@type': 'Organization', name: 'BiteKrakow', url: HOST }, mainEntity: { '@type': 'ItemList', name: 'Upcoming food and drink events in Krakow', itemListElement: evSchema } }),
  ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
       { '@type': 'ListItem', position: 1, name: 'BiteKrakow', item: `${HOST}/` },
       { '@type': 'ListItem', position: 2, name: 'Events', item: URL_ }] })
].join('\n');

const header = tpl.slice(tpl.indexOf('<header class="site-header">'), tpl.indexOf('</header>') + 9);
const upd = new Date(data.updated + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const page = `${head}${schema}
</head>
<body>

${header}

<main class="events-page">
  <header class="article-header wrap-narrow">
    <span class="pill">What's on</span>
    <h1>Food and drink events in Krakow</h1>
    <p class="meta">Festivals, markets, wine fairs and restaurant weeks, with what is happening right now marked live. Dates checked with the organisers, updated ${upd}.</p>
  </header>

  <section class="wrap events-list" aria-label="Upcoming events">
${upcoming.map(e => card(e, 'h2')).join('\n')}
  </section>

  <section class="wrap events-weekly">
    <h2 class="deco">Every week</h2>
    <p class="section-lead">Markets and late food that run all year, with what is open right now. Hours from Google, checked ${upd}.</p>
    <ul class="wk-list">
${data.weekly.map(weekly).join('\n')}
    </ul>
    <p class="section-lead">Going out tonight? <a href="/nightlife-krakow/">Our nightlife guide</a> shows which bars are open right now and who closes last.</p>
  </section>

  <section class="wrap-narrow events-note">
    <p>Running a food event in Krakow? Send the dates, place and a link to <a href="mailto:hello@bitekrakow.com">hello@bitekrakow.com</a>. We list events for free once we can confirm them with the organiser.</p>
  </section>
</main>

${footerHtml('en', ['Event dates come from the organisers; weekly market hours from Google.'])}

<script src="/live.js" defer></script>
</body>
</html>
`;
mkdirSync(join(SITE, 'events'), { recursive: true });
writeFileSync(join(SITE, 'events', 'index.html'), page);

// ---------- 2. Strona glowna: pasek + sekcja ----------
const strip = `<div class="season-strip live-strip" role="region" aria-label="What's on in Krakow">
  <div class="wrap">
    <span class="ss-label"><span class="pulse-dot" aria-hidden="true"></span>What's on</span>
${upcoming.slice(0, 4).map(e => `    <a href="${e.url || '/events/'}" ${attrs(e)}><span class="live-slot"></span>${esc(e.title.replace(/, autumn 2026$/, '').replace(/ at Stary Kleparz$/, ''))}, ${esc(e.status === 'tbc' ? 'from late Nov' : (e.start.slice(0, 10) === e.end.slice(0, 10) ? `${day(e.start).d} ${day(e.start).m}` : Date.parse(e.start) <= now ? `until ${day(e.end).d} ${day(e.end).m}` : `${day(e.start).d}${day(e.start).m === day(e.end).m ? '' : ' ' + day(e.start).m} to ${day(e.end).d} ${day(e.end).m}`))}</a>`).join('\n')}
    <a href="/events/" class="ss-all">All events →</a>
  </div>
</div>`;
const section = `<section class="wrap whats-on" id="whats-on">
  <div class="rail-head">
    <div>
      <span class="eyebrow">What's on</span>
      <h2 class="deco">Happening in Krakow</h2>
      <p class="section-lead">Food festivals, markets and fairs, with what is on right now marked live.</p>
    </div>
  </div>
  <div class="ev-grid">
${upcoming.slice(0, 4).map(e => card(e)).join('\n')}
  </div>
  <p class="section-lead" style="margin-top:14px;"><a href="/events/">All events and weekly markets →</a></p>
</section>`;

const homeFile = join(SITE, 'index.html');
let home = readFileSync(homeFile, 'utf8');
const put = (name, html) => {
  const re = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!re.test(home)) throw new Error(`brak znacznikow ${name} na stronie glownej`);
  home = home.replace(re, `<!-- ${name}:start -->\n${html}\n<!-- ${name}:end -->`);
};
put('events-strip', strip);
put('whats-on', section);
if (!home.includes('src="/live.js')) home = home.replace('<script src="/home.js', '<script src="/live.js" defer></script>\n<script src="/home.js');
writeFileSync(homeFile, home);

console.log(`Wydarzenia: ${upcoming.length} nadchodzacych (${evSchema.length} w schema), ${data.weekly.length} cotygodniowych; strona glowna zaktualizowana`);
