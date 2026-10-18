// Podmienia stopke na wszystkich statycznych stronach na wspolna z footer.mjs,
// zachowujac adnotacje o zrodlach danych wlasciwe dla strony.
// Idempotentny. Uzycie: node scripts/apply-footer.mjs
// (profile /restaurant/ i /restaurants/ generuje gen-venues.mjs tym samym modulem)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { footerHtml, extractNotes, langOf } from './footer.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
const SKIP = new Set(['api', 'img', 'data', 'admin', 'node_modules']);

function* walk(dir) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith('_') || d.name.startsWith('.')) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) { if (!SKIP.has(d.name)) yield* walk(p); }
    else if (d.name.endsWith('.html')) yield p;
  }
}

let changed = 0, same = 0, none = 0;
for (const file of walk(SITE)) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(/<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/);
  if (!m) { none++; continue; }
  const rel = relative(SITE, file).replace(/\/?index\.html$/, '');
  const next = footerHtml(langOf(rel), extractNotes(m[0]));
  if (next === m[0]) { same++; continue; }
  writeFileSync(file, html.replace(m[0], next));
  changed++;
}
console.log(`Stopka: zmieniono ${changed}, bez zmian ${same}, bez stopki ${none}`);
