// Dopisuje do kazdego <link href="/style.css"> wersje z hashem tresci (?v=...).
// /style.css ma w vercel.json cache na rok (immutable), wiec po kazdej zmianie CSS
// trzeba uruchomic ten skrypt (robi to tez publish.mjs), inaczej check.mjs zglosi blad.
// To samo dla skryptow z JS_FILES (cache 1 dzien + SWR): bez wersji powracajacy
// uzytkownik dostalby nowy HTML ze starym JS.
//   node scripts/bust-css.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const SITE = new URL('../site/', import.meta.url).pathname;
export function cssVersion() {
  return createHash('md5').update(readFileSync(join(SITE, 'style.css'))).digest('hex').slice(0, 10);
}
export const JS_FILES = ['home.js', 'map.js', 'venue-cards.js', 'live.js'];
// Dane lokali (cache 1 h + SWR 1 dzien): wersja w atrybucie data-venues-v, z ktorego home.js i map.js
// buduja adres ?v=..., inaczej przegladarka do doby podaje stary plik po gen-venues.
export function venuesVersion() {
  return createHash('md5').update(readFileSync(join(SITE, 'data', 'map-venues.json'))).digest('hex').slice(0, 10);
}
export function jsVersion(name) {
  return createHash('md5').update(readFileSync(join(SITE, name))).digest('hex').slice(0, 10);
}
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n === 'api') continue; walk(p, out); }
    else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}
export function bust() {
  const v = cssVersion();
  const jsv = Object.fromEntries(JS_FILES.map(j => [j, jsVersion(j)]));
  const dv = venuesVersion();
  let files = 0;
  for (const f of walk(SITE)) {
    const h = readFileSync(f, 'utf8');
    let n = h.replace(/href="\/style\.css(?:\?v=[0-9a-f]+)?"/g, `href="/style.css?v=${v}"`);
    for (const js of JS_FILES) {
      const re = new RegExp(`src="/${js.replace('.', '\\.')}(?:\\?v=[0-9a-f]+)?"`, 'g');
      n = n.replace(re, `src="/${js}?v=${jsv[js]}"`);
    }
    n = n.replace(/data-venues-v="[0-9a-f]*"/g, `data-venues-v="${dv}"`);
    if (n !== h) { writeFileSync(f, n); files++; }
  }
  return { v, files };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = bust();
  console.log(`style.css?v=${r.v}: zaktualizowano ${r.files} plikow`);
}
