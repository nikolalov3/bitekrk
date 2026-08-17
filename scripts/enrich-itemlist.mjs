// Wzbogaca JSON-LD ItemList w artykułach o dane, które siedzą już w kartach lokali,
// ale nie były maszynowo czytelne: nasza ocena (Review/reviewRating), werdykt
// (reviewBody) oraz kotwicę (@id + url do #slug). Źródłem prawdy są karty w HTML.
//
// Użycie:  node scripts/enrich-itemlist.mjs site/where-to-work-krakow/index.html
//          node scripts/enrich-itemlist.mjs $(find site -name index.html)
//
// Idempotentny: ponowne uruchomienie nadpisuje review/@id/url tymi samymi wartościami.

import { readFileSync, writeFileSync } from 'fs';

const AUTHOR = { '@type': 'Person', name: 'Cezary Musiał', url: 'https://bitekrakow.com/about/' };

function decodeEntities(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#322;/g, 'ł')
    .replace(/\s+/g, ' ')
    .trim();
}

function processFile(file) {
  let html = readFileSync(file, 'utf8');

  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canon) return `SKIP ${file}: brak canonical`;
  const base = canon[1]; // z ukośnikiem na końcu, np. https://bitekrakow.com/where-to-work-krakow/

  // Karty lokali w kolejności DOM: slug, ocena, werdykt.
  const cards = [];
  const cardRe = /<section class="venue-card" id="([^"]+)"[\s\S]*?<\/section>/g;
  let m;
  while ((m = cardRe.exec(html))) {
    const block = m[0];
    const scoreM = block.match(/<div class="score">\s*([\d.]+)/);
    const verdictM = block.match(/<p class="verdict">([\s\S]*?)<\/p>/);
    cards.push({
      slug: m[1],
      score: scoreM ? scoreM[1] : null,
      verdict: verdictM ? decodeEntities(verdictM[1]) : null,
    });
  }
  if (!cards.length) return `SKIP ${file}: brak kart lokali`;

  let note = '';
  const scriptRe = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  let enriched = 0;

  html = html.replace(scriptRe, (full, jsonText) => {
    let obj;
    try { obj = JSON.parse(jsonText); } catch { return full; }
    if (obj['@type'] !== 'Article' || !obj.mainEntity || obj.mainEntity['@type'] !== 'ItemList') return full;

    const items = obj.mainEntity.itemListElement;
    if (!Array.isArray(items)) return full;
    items.sort((a, b) => (a.position || 0) - (b.position || 0));

    if (items.length !== cards.length) {
      note = ` (UWAGA: ItemList ${items.length} vs karty ${cards.length})`;
    }
    const n = Math.min(items.length, cards.length);
    for (let i = 0; i < n; i++) {
      const it = items[i].item;
      const card = cards[i];
      if (!it) continue;
      it['@id'] = base + '#' + card.slug;
      it.url = base + '#' + card.slug;
      if (card.score) {
        const rev = {
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: card.score, bestRating: '10', worstRating: '1' },
          author: AUTHOR,
        };
        if (obj.datePublished) rev.datePublished = obj.datePublished;
        if (card.verdict) rev.reviewBody = card.verdict;
        it.review = rev;
        enriched++;
      }
    }

    const body = JSON.stringify(obj, null, 2).split('\n').map((l) => '  ' + l).join('\n');
    return `<script type="application/ld+json">\n${body}\n  </script>`;
  });

  writeFileSync(file, html);
  return `OK ${file}: ${cards.length} lokali, ${enriched} z oceną${note}`;
}

const files = process.argv.slice(2);
if (!files.length) { console.error('Podaj pliki, np. site/where-to-work-krakow/index.html'); process.exit(1); }
for (const f of files) console.log(processFile(f));
