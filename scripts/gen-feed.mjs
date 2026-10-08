// Generuje site/feed.xml (RSS 2.0, 40 najnowszych artykulow i newsow) oraz
// site/news-sitemap.xml (Google News: tylko /news/ z ostatnich 48 h; czesto pusty,
// to normalne). Daty bierze z JSON-LD (datePublished / dateModified).
//   node scripts/gen-feed.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOST = 'https://bitekrakow.com';
const SITE = new URL('../site/', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (['api', 'img', 'restaurant'].includes(n) && dir === SITE) continue; walk(p, out); }
    else if (n === 'index.html') out.push(p);
  }
  return out;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function pick(html, re) { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; }

const items = [];
for (const file of walk(SITE)) {
  const html = readFileSync(file, 'utf8');
  const canonical = pick(html, /<link rel="canonical" href="([^"]+)"/);
  if (!canonical) continue;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let art = null;
  for (const b of blocks) {
    try { const j = JSON.parse(b[1]); if (['Article', 'NewsArticle'].includes(j['@type'])) { art = j; break; } } catch { /* ignore */ }
  }
  if (!art || !art.datePublished) continue;
  items.push({
    url: canonical,
    title: art.headline || pick(html, /<title>([^<]+)<\/title>/),
    desc: pick(html, /<meta name="description" content="([^"]*)"/),
    lang: pick(html, /<html lang="([a-z]+)"/) || 'en',
    published: art.datePublished,
    modified: art.dateModified || art.datePublished,
    isNews: canonical.includes('/news/') && !canonical.endsWith('/news/')
  });
}
items.sort((a, b) => (b.modified > a.modified ? 1 : b.modified < a.modified ? -1 : 0));

const rfc = d => new Date(`${d}T09:00:00+02:00`).toUTCString();
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>BiteKrakow</title>
  <link>${HOST}/</link>
  <atom:link href="${HOST}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Independent guides to where locals eat and drink in Kraków: openings, neighborhood guides and cuisine rankings, every place visited in person.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.slice(0, 40).map(i => `  <item>
    <title>${esc(i.title)}</title>
    <link>${i.url}</link>
    <guid isPermaLink="true">${i.url}</guid>
    <pubDate>${rfc(i.published)}</pubDate>
    <description>${esc(i.desc)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;
writeFileSync(join(SITE, 'feed.xml'), rss);

const cutoff = Date.now() - 48 * 3600 * 1000;
const fresh = items.filter(i => i.isNews && new Date(i.published).getTime() >= cutoff);
const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${fresh.map(i => `  <url>
    <loc>${i.url}</loc>
    <news:news>
      <news:publication><news:name>BiteKrakow</news:name><news:language>${i.lang}</news:language></news:publication>
      <news:publication_date>${i.published}</news:publication_date>
      <news:title>${esc(i.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(SITE, 'news-sitemap.xml'), newsSitemap);
console.log(`feed.xml: ${Math.min(items.length, 40)} pozycji (z ${items.length}); news-sitemap.xml: ${fresh.length} swiezych newsow (48 h)`);
