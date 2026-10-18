// Dopisuje do kazdego <link href="/style.css"> wersje z hashem tresci (?v=...).
// /style.css ma w vercel.json cache na rok (immutable), wiec po kazdej zmianie CSS
// trzeba uruchomic ten skrypt (robi to tez publish.mjs), inaczej check.mjs zglosi blad.
//   node scripts/bust-css.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const SITE = new URL('../site/', import.meta.url).pathname;
export function cssVersion() {
  return createHash('md5').update(readFileSync(join(SITE, 'style.css'))).digest('hex').slice(0, 10);
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
  let files = 0;
  for (const f of walk(SITE)) {
    const h = readFileSync(f, 'utf8');
    const n = h.replace(/href="\/style\.css(?:\?v=[0-9a-f]+)?"/g, `href="/style.css?v=${v}"`);
    if (n !== h) { writeFileSync(f, n); files++; }
  }
  return { v, files };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = bust();
  console.log(`style.css?v=${r.v}: zaktualizowano ${r.files} plikow`);
}
