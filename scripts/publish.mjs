// Rytuał publikacji po git push:
//   1. odświeża llms.txt / llms-full.txt / feed.xml / news-sitemap.xml (gen-llms, gen-feed),
//   2. pinguje IndexNow (Bing, Yandex, Naver itd.) bezpośrednio, bez sekretu
//      (klucz IndexNow jest z założenia publiczny i leży w site/<klucz>.txt),
//   3. jeśli ustawiono SYNC_SECRET, odświeża też dane Google przez /api/refresh-places.
// Uruchomienie:
//   node scripts/publish.mjs /kleparz-guide/ /pl/kleparz-guide/
//   node scripts/publish.mjs            # wszystkie adresy z sitemap.xml
//   node scripts/publish.mjs --no-gen   # bez regeneracji plików (tylko ping)
// Google nie czyta IndexNow: tam działa sitemap + linki wewnętrzne + ręczne "Request indexing".

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const HOST = 'https://bitekrakow.com';
const ROOT = new URL('..', import.meta.url).pathname;
const KEY = readFileSync(`${ROOT}site/2572829eae3d407fd390fa62bf8c04a8.txt`, 'utf8').trim();

const args = process.argv.slice(2);
const noGen = args.includes('--no-gen');
let paths = args.filter(a => !a.startsWith('--'));

if (!noGen) {
  for (const s of ['gen-llms.mjs', 'gen-feed.mjs']) {
    if (existsSync(`${ROOT}scripts/${s}`)) console.log(execSync(`node ${ROOT}scripts/${s}`, { encoding: 'utf8' }).trim());
  }
}

if (!paths.length) {
  const sitemap = readFileSync(`${ROOT}site/sitemap.xml`, 'utf8');
  paths = [...sitemap.matchAll(/<loc>https:\/\/bitekrakow\.com([^<]*)<\/loc>/g)].map(m => m[1]);
}
const urlList = [...new Set(paths.map(p => `${HOST}${p.startsWith('/') ? p : `/${p}`}`))];

// IndexNow przyjmuje do 10 000 adresów w jednym POST; tniemy na paczki po 500.
for (let i = 0; i < urlList.length; i += 500) {
  const batch = urlList.slice(i, i + 500);
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'bitekrakow.com', key: KEY, keyLocation: `${HOST}/${KEY}.txt`, urlList: batch })
  });
  console.log(`IndexNow: ${r.status} (${batch.length} adresów)${r.status >= 400 ? ' ' + (await r.text()).slice(0, 200) : ''}`);
}

const secret = process.env.SYNC_SECRET;
if (secret) {
  const sync = await fetch(`${HOST}/api/refresh-places?secret=${secret}`);
  const data = await sync.json();
  console.log('Sync lokali:', sync.status, `odświeżonych: ${data.refreshed ?? '?'}`);
  for (const r of data.results || []) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.slug}${r.rating ? ` (${r.rating})` : ''}${r.error ? ` ${r.error}` : ''}`);
  }
} else {
  console.log('Bez SYNC_SECRET: pomijam /api/refresh-places (dane Google odświeża lokalnie bk-refresh.py).');
}
