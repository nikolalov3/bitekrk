// Rytuał publikacji po git push: ping IndexNow (Bing) + odświeżenie danych Google.
// Uruchomienie:
//   SYNC_SECRET=... node scripts/publish.mjs /kleparz-guide/ /breakfast-krakow/
// Bez argumentów pinguje wszystkie adresy z sitemap.xml.

import { readFileSync } from 'node:fs';

const HOST = 'https://bitekrakow.com';
const secret = process.env.SYNC_SECRET;
if (!secret) { console.error('Ustaw SYNC_SECRET w środowisku.'); process.exit(1); }

let paths = process.argv.slice(2);
if (!paths.length) {
  const sitemap = readFileSync(new URL('../site/sitemap.xml', import.meta.url), 'utf8');
  paths = [...sitemap.matchAll(/<loc>https:\/\/bitekrakow\.com([^<]*)<\/loc>/g)].map(m => m[1]);
}

const urls = paths.map(p => `${HOST}${p.startsWith('/') ? p : `/${p}`}`);
const qs = urls.map(u => `url=${encodeURIComponent(u)}`).join('&');

const ping = await fetch(`${HOST}/api/ping-indexnow?secret=${secret}&${qs}`);
console.log('IndexNow:', ping.status, await ping.text());

const sync = await fetch(`${HOST}/api/refresh-places?secret=${secret}`);
const data = await sync.json();
console.log('Sync lokali:', sync.status, `odświeżonych: ${data.refreshed ?? '?'}`);
for (const r of data.results || []) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.slug}${r.rating ? ` (${r.rating})` : ''}${r.error ? ` ${r.error}` : ''}`);
}
