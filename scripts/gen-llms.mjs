// Generuje site/llms.txt (kuratorowana mapa dla crawlerow AI) i site/llms-full.txt
// (kazda strona: tytul, URL, opis). Czyta title/description/canonical z gotowych HTML-i,
// wiec odpala sie po kazdej publikacji (czesc `publish`).
//   node scripts/gen-llms.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOST = 'https://bitekrakow.com';
const SITE = new URL('../site/', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (['api', 'img', 'ar', 'pl'].includes(n) && dir === SITE) { if (n === 'api' || n === 'img') continue; }
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n === 'index.html') out.push(p);
  }
  return out;
}
function meta(html, re) { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; }
function pageInfo(file) {
  const html = readFileSync(file, 'utf8');
  const canonical = meta(html, /<link rel="canonical" href="([^"]+)"/);
  if (!canonical) return null;
  const title = meta(html, /<title>([^<]+)<\/title>/).replace(/\s*\|\s*BiteKrakow.*$/i, '').replace(/\s*\|\s*بايت كراكوف.*$/, '');
  const desc = meta(html, /<meta name="description" content="([^"]*)"/);
  const lang = meta(html, /<html lang="([a-z]+)"/) || 'en';
  const path = canonical.replace(HOST, '');
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  return { path, title, desc, lang, noindex };
}

const pages = walk(SITE).map(pageInfo).filter(p => p && !p.noindex);
const by = (pred) => pages.filter(pred).sort((a, b) => a.path.localeCompare(b.path));
const isProfile = p => p.path.startsWith('/restaurant/');
const isNews = p => p.path.startsWith('/news/') && p.path !== '/news/';
const isAr = p => p.path.startsWith('/ar/');
const isPl = p => p.path.startsWith('/pl/');
const isIndex = p => ['/', '/guides/', '/news/', '/restaurants/', '/map/', '/about/', '/how-we-test/'].includes(p.path);
const guidesEn = by(p => !isProfile(p) && !isNews(p) && !isAr(p) && !isPl(p) && !isIndex(p));
const line = p => `- [${p.title}](${HOST}${p.path})${p.desc ? `: ${p.desc}` : ''}`;

const about = pages.find(p => p.path === '/about/');
const howWeTest = pages.find(p => p.path === '/how-we-test/');

const llms = `# BiteKrakow

> Independent, editor-written guide to where locals eat and drink in Kraków, Poland: cafes, restaurants and bars by cuisine and neighborhood, with real addresses, opening hours, prices and what to order. Every place is visited in person and paid for. Nobody pays to be included and nobody can pay to be removed. Published in English, with Arabic (/ar/) and Polish (/pl/) editions of the key guides.

Two kinds of ratings appear on the site and are kept separate: an editorial score out of 10 written by the editor after visits, and Google's star rating with review count, pulled live and labelled as Google. Each guide carries the date its details were last checked. Permanently closed venues are removed.

## How the site works
${howWeTest ? line(howWeTest) : ''}
${about ? line(about) : ''}
- [All guides](${HOST}/guides/): every guide in one place, by topic, cuisine and neighborhood.
- [Food map](${HOST}/map/): the city district by district, with the top pick in each.
- [All places](${HOST}/restaurants/): every venue we cover, grouped by district.

## Guides (English)
${guidesEn.map(line).join('\n')}

## News: openings, closures, events
${by(isNews).map(line).join('\n')}

## Arabic edition (العربية)
${by(isAr).map(line).join('\n')}

## Polish edition (Polski)
${by(isPl).map(line).join('\n')}

## Venue profiles
${by(isProfile).length} venue pages under ${HOST}/restaurant/<slug>/, each with address, structured opening hours, price range, Google rating, amenities from Google Places and the guides the venue appears in. The full list is in [llms-full.txt](${HOST}/llms-full.txt).

## Contact
- Editor: Cezary Musiał, hello@bitekrakow.com
- Corrections are fixed; closed venues are removed.
`;

const full = `# BiteKrakow: full page index

${pages.sort((a, b) => a.path.localeCompare(b.path)).map(line).join('\n')}
`;

writeFileSync(join(SITE, 'llms.txt'), llms.replace(/\n{3,}/g, '\n\n'));
writeFileSync(join(SITE, 'llms-full.txt'), full);
console.log(`llms.txt: ${guidesEn.length} przewodnikow, ${by(isNews).length} news, ${by(isAr).length} ar, ${by(isPl).length} pl, ${by(isProfile).length} profili; llms-full.txt: ${pages.length} stron`);
