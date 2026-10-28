// Spina wersje jezykowe na wszystkich stronach (EN, PL, AR, ZH). Idempotentny.
//   - przelacznik 4 jezykow w prawym gornym rogu naglowka (link do tlumaczenia albo strony glownej jezyka),
//   - menu naglowka w jezyku strony, z linkami do wersji w tym jezyku, jesli istnieja,
//   - komplet <link rel="alternate" hreflang> (en, pl, ar, zh-Hans, x-default) z tego, co istnieje na dysku,
//   - na stronach EN przekierowanie wg jezyka przegladarki (tylko gdy tlumaczenie istnieje i nikt nie wybral jezyka recznie),
//   - brakujace adresy /pl/, /ar/, /zh/ w sitemap.xml.
// Uruchamiac po kazdym dodaniu tlumaczenia i po gen-venues.mjs (publish.mjs robi to sam).
// Uzycie: node scripts/apply-langs.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LANGS, HREFLANG, NAME, SHORT, MENU_LABEL, HOME_NOTE, NAV, splitPath, pathFor } from './langs.mjs';

const SITE = process.env.BK_SITE || new URL('../site/', import.meta.url).pathname;
const HOST = 'https://bitekrakow.com';
const SKIP = new Set(['api', 'img', 'data', 'admin', 'node_modules', 'fonts', 'icons']);

function* walk(dir) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith('_') || d.name.startsWith('.')) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) { if (!SKIP.has(d.name)) yield* walk(p); }
    else if (d.name === 'index.html') yield p;
  }
}

const exists = p => existsSync(join(SITE, p, 'index.html'));
const home = l => pathFor(l, '/');
const homeExists = l => l === 'en' || exists(home(l));
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function versionsOf(base) {
  const v = {};
  for (const l of LANGS) if (exists(pathFor(l, base))) v[l] = pathFor(l, base);
  return v;
}

const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>';

function langMenu(lang, versions) {
  const items = LANGS.filter(l => versions[l] || homeExists(l)).map(l => {
    const href = versions[l] || home(l);
    const note = versions[l] ? '' : ` <small>${HOME_NOTE[l]}</small>`;
    const cur = l === lang ? ' aria-current="true"' : '';
    const dir = l === 'ar' ? ' dir="rtl"' : lang === 'ar' ? ' dir="ltr"' : '';
    return `<a href="${href}" hreflang="${HREFLANG[l]}" lang="${HREFLANG[l]}"${dir}${cur}>${NAME[l]}${note}</a>`;
  }).join('');
  return `<!-- langs:start --><details class="lang-menu"><summary aria-label="${MENU_LABEL[lang]}">${GLOBE}<span>${SHORT[lang]}</span></summary><div class="lang-list">${items}</div></details>` +
    `<script>(function(){var m=document.currentScript.previousElementSibling;m.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(".lang-list a");if(a){try{localStorage.setItem("bk-lang",a.getAttribute("hreflang"))}catch(_){}}});document.addEventListener("click",function(e){if(m.open&&!m.contains(e.target))m.open=false})})();</script><!-- langs:end -->`;
}

function navHtml(lang, path, versions) {
  const section = path.startsWith('/restaurant/') ? '/restaurants/' : splitPath(path).base.startsWith('/news/') ? '/news/' : null;
  const links = NAV.map(([base, label]) => {
    const href = exists(pathFor(lang, base)) ? pathFor(lang, base) : base;
    const cur = href === path || base === section ? ' aria-current="page"' : '';
    return `      <a href="${href}"${cur}>${label[lang]}</a>`;
  }).join('\n');
  return `<nav class="site-nav">\n${links}\n      ${langMenu(lang, versions)}\n    </nav>`;
}

function hreflangBlock(versions) {
  const ls = LANGS.filter(l => versions[l]);
  if (ls.length < 2) return '';
  const xd = versions.en || versions[ls[0]];
  return ls.map(l => `  <link rel="alternate" hreflang="${HREFLANG[l]}" href="${HOST}${versions[l]}">`).join('\n') +
    `\n  <link rel="alternate" hreflang="x-default" href="${HOST}${xd}">`;
}

function redirectScript(versions) {
  const V = {};
  for (const l of ['pl', 'ar', 'zh']) if (versions[l]) V[l] = versions[l];
  if (!Object.keys(V).length) return '';
  return `  <!-- langredir:start --><script>(function(){try{if(localStorage.getItem("bk-lang"))return;var V=${JSON.stringify(V)};var L=navigator.languages||[navigator.language||""];for(var i=0;i<L.length;i++){var k=String(L[i]).slice(0,2).toLowerCase();if(k==="en")return;if(V[k]){location.replace(V[k]);return}}}catch(e){}})();</script><!-- langredir:end -->\n`;
}

const OLD_REDIRECT = /[ \t]*<script>\s*\(function\(\)\{try\{\s*document\.addEventListener\("click"[\s\S]*?bk-lang[\s\S]*?<\/script>\n?/;
const NEW_REDIRECT = /[ \t]*<!-- langredir:start -->[\s\S]*?<!-- langredir:end -->\n?/;

let changed = 0, same = 0;
const all = [];
for (const file of walk(SITE)) {
  const rel = '/' + relative(SITE, file).replace(/index\.html$/, '');
  const path = rel === '/' ? '/' : rel;
  const { lang, base } = splitPath(path);
  const versions = versionsOf(base);
  all.push(path);
  let html = readFileSync(file, 'utf8');
  const orig = html;

  // naglowek: logo do strony glownej jezyka, menu + przelacznik
  html = html.replace(/(<header class="site-header">[\s\S]*?<a class="logo" href=")[^"]*(")/, `$1${homeExists(lang) ? home(lang) : '/'}$2`);
  html = html.replace(/(<header class="site-header">[\s\S]*?)<nav class="site-nav">[\s\S]*?<\/nav>/, (m, pre) => pre + navHtml(lang, path, versions));

  // hreflang: usun wszystkie stare, wstaw komplet po canonical
  html = html.replace(/[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/g, '');
  const block = hreflangBlock(versions);
  if (block) {
    if (/<link rel="canonical"[^>]*>\n/.test(html)) html = html.replace(/(<link rel="canonical"[^>]*>\n)/, `$1${block}\n`);
    else html = html.replace('</head>', `${block}\n</head>`);
  }

  // przekierowanie wg jezyka przegladarki: tylko strony EN
  html = html.replace(OLD_REDIRECT, '').replace(NEW_REDIRECT, '');
  if (lang === 'en') {
    const r = redirectScript(versions);
    if (r) html = html.replace(/(<meta name="viewport"[^>]*>\n)/, `$1${r}`);
  }

  if (html !== orig) { writeFileSync(file, html); changed++; } else same++;
}

// sitemap: dopisz brakujace wersje jezykowe
const smFile = join(SITE, 'sitemap.xml');
let sm = readFileSync(smFile, 'utf8');
const today = new Date().toISOString().slice(0, 10);
let added = 0;
for (const p of all.sort()) {
  if (!/^\/(pl|ar|zh)(\/|$)/.test(p)) continue;
  const html = readFileSync(join(SITE, p, 'index.html'), 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
  if (sm.includes(`<loc>${HOST}${p}</loc>`)) continue;
  sm = sm.replace('</urlset>', `  <url>\n    <loc>${HOST}${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>\n</urlset>`);
  added++;
}
if (added) writeFileSync(smFile, sm);
console.log(`Języki: zmieniono ${changed}, bez zmian ${same}; sitemap: dopisano ${added}`);
