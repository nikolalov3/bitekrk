// Porownuje godziny na kartach lokali w przewodnikach (EN i PL) z godzinami z bazy
// (godziny wlasciciela z attrs.hours_override maja pierwszenstwo przed Google) i poprawia
// rozbiezne. Uzycie:
//   node scripts/sync-card-hours.mjs          # tylko raport
//   node scripts/sync-card-hours.mjs --write  # zapis poprawek
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = new URL('../site/', import.meta.url).pathname;
const WRITE = process.argv.includes('--write');
const cfg = await (await fetch('https://bitekrakow.com/api/config')).json();
const sb = { apikey: cfg.supabaseAnonKey || cfg.anonKey || cfg.key, Authorization: `Bearer ${cfg.supabaseAnonKey || cfg.anonKey || cfg.key}` };
const venues = await (await fetch(`${cfg.supabaseUrl || cfg.url}/rest/v1/venues?select=slug,name,hours,attrs,active&active=eq.true`, { headers: sb })).json();
const bySlug = Object.fromEntries(venues.map(v => [v.slug, v]));

const EN_D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PL_D = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const AR_D = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const hm = (h, m) => `${h}:${String(m || 0).padStart(2, '0')}`;

function daySpecs(v) {
  const H = (v.attrs && v.attrs.hours_override) || v.hours;
  if (!H || !Array.isArray(H.periods) || !H.periods.length) return null;
  const per = {}; ORDER.forEach(d => (per[d] = []));
  for (const p of H.periods) {
    if (!p.open || !p.close) return null; // 24h itp.
    per[p.open.day].push([hm(p.open.hour, p.open.minute), hm(p.close.hour, p.close.minute)]);
  }
  return per;
}
function fmt(per, lang) {
  if (lang === 'ar') {
    const specA = d => per[d].map(([o, c]) => `${o}-${c}`).join(' و ');
    const gs = [];
    for (const d of ORDER) { const sp = per[d].length ? specA(d) : null; const l = gs[gs.length - 1]; if (l && l.s === sp) l.days.push(d); else gs.push({ s: sp, days: [d] }); }
    const lab = g => g.days.length === 1 ? AR_D[g.days[0]] : `${AR_D[g.days[0]]} إلى ${AR_D[g.days[g.days.length - 1]]}`;
    const op = gs.filter(g => g.s), cl = gs.filter(g => !g.s);
    if (op.length === 1 && op[0].days.length === 7) return `يوميًا ${op[0].s}`;
    return op.map(g => `${lab(g)} ${g.s}`).join('، ') + (cl.length ? `، مغلق ${cl.map(lab).join('، ')}` : '');
  }
  const D = lang === 'pl' ? PL_D : EN_D;
  const spec = d => per[d].map(([o, c]) => (lang === 'pl' ? `${o}-${c}` : `${o} to ${c}`)).join(lang === 'pl' ? ' i ' : ' and ');
  const groups = [];
  for (const d of ORDER) {
    const s = per[d].length ? spec(d) : null;
    const last = groups[groups.length - 1];
    if (last && last.s === s) last.days.push(d); else groups.push({ s, days: [d] });
  }
  const label = g => g.days.length === 1 ? D[g.days[0]] : `${D[g.days[0]]}${lang === 'pl' ? '-' : ' to '}${D[g.days[g.days.length - 1]]}`;
  const open = groups.filter(g => g.s);
  if (open.length === 1 && open[0].days.length === 7) return lang === 'pl' ? `Codziennie ${open[0].s}` : `Daily ${open[0].s}`;
  const closed = groups.filter(g => !g.s);
  let out = open.map(g => `${label(g)} ${g.s}`).join(', ');
  if (closed.length) out += lang === 'pl' ? `, ${closed.map(label).join(', ')} nieczynne` : `, closed ${closed.map(label).join(', ')}`;
  if (lang !== 'pl') out = out.replace(/to 0:00\b/g, 'to midnight');
  return out;
}
// zbior godzin z tekstu (np. "8:00", "18:00") do porownania
const timesIn = t => new Set((t.match(/\b\d{1,2}:\d{2}\b/g) || []).map(x => x.replace(/^0(\d)/, '$1')));
const eqSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (['api', 'img', 'restaurant'].includes(n) && dir === SITE) continue; walk(p, out); }
    else if (n === 'index.html') out.push(p);
  }
  return out;
}

let changed = 0, files = 0;
const report = [];
for (const file of walk(SITE)) {
  const lang = file.includes('/site/pl/') ? 'pl' : file.includes('/site/ar/') ? 'ar' : 'en';
  let html = readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/(<section class="venue-card" id="[^"]*" data-venue-slug="([^"]+)">[\s\S]*?<div class="venue-meta">)([\s\S]*?)(<\/div>)/g, (all, head, slug, meta, tail) => {
    const v = bySlug[slug];
    if (!v) return all;
    const per = daySpecs(v);
    if (!per) return all;
    const spans = [...meta.matchAll(/<span>([^<]*)<\/span>/g)];
    let cur;
    if (lang === 'ar') { if (!spans.length) return all; cur = spans[0][1]; }
    else { if (spans.length < 2) return all; cur = spans[1][1]; }
    // dopisek po godzinach (np. ", breakfast until 12") zachowujemy
    const suffix = (cur.match(/,\s*(breakfast[^,]*|śniadania[^,]*)$/i) || [])[0] || '';
    const keep = (cur.match(/(no reservations|booking advised|book ahead|reservations advised|rezerwacja wskazana|يُنصح بالحجز)/i) || [])[0];
    const want = fmt(per, lang) + (keep ? `${lang === 'ar' ? '، ' : ', '}${keep.toLowerCase()}` : '') + suffix.replace(/until 12\b|until noon/i, 'until 13:00').replace(/do 12\b/i, 'do 13:00');
    const curT = timesIn(cur.replace(suffix, '').replace(/midnight/g, '0:00')), wantT = timesIn(fmt(per, lang).replace(/midnight/g, '0:00'));
    if (eqSet(curT, wantT) && curT.size) return all;
    report.push(`${file.replace(SITE, '/')}  ${slug}\n    było: ${cur}\n    jest: ${want}`);
    changed++;
    const newMeta = meta.replace(`<span>${cur}</span>`, `<span>${want}</span>`);
    return head + newMeta + tail;
  });
  if (html !== before) { files++; if (WRITE) writeFileSync(file, html); }
}
console.log(report.join('\n'));
console.log(`\n${WRITE ? 'Zapisano' : 'Do poprawy'}: ${changed} kart w ${files} plikach`);
