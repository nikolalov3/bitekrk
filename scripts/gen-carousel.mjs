// Generator karuzel na Instagram z artykułów BiteKrakow.
// Użycie: node scripts/gen-carousel.mjs <slug-artykulu>
// np.    node scripts/gen-carousel.mjs vegan-breakfast-krakow
//
// Tworzy plik HTML ze slajdami 1080x1350 w estetyce Paper & Ink.
// Otwierasz w przeglądarce, klikasz "Pobierz PNG" pod każdym slajdem.
// Slide 1 (okładka) + slajdy z lokalami + CTA na koniec.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const SITE = new URL('../site/', import.meta.url).pathname;
const slug = process.argv[2];

if (!slug) {
  console.error('Podaj slug artykułu, np.: node scripts/gen-carousel.mjs vegan-breakfast-krakow');
  process.exit(1);
}

const file = join(SITE, slug, 'index.html');
let html;
try { html = readFileSync(file, 'utf8'); } catch {
  const newsFile = join(SITE, 'news', slug, 'index.html');
  try { html = readFileSync(newsFile, 'utf8'); } catch {
    console.error(`Nie znaleziono: ${file} ani ${newsFile}`);
    process.exit(1);
  }
}

const title = (html.match(/<h1>(.*?)<\/h1>/) || [])[1] || slug;
const cleanTitle = title.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&oacute;/g, 'ó')
  .replace(/&eacute;/g, 'é').replace(/&aacute;/g, 'á');

const venues = [];
const parts = html.split(/<h2 class="venue-title">/);
for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i];
  const name = (chunk.match(/^(.*?)<\/h2>/) || [])[1] || '';
  const cleanName = name.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
    .replace(/&amp;/g, '&').replace(/&oacute;/g, 'ó').replace(/&eacute;/g, 'é');

  const addr = (chunk.match(/venue-meta[\s\S]*?<span>(.*?)<\/span>/) || [])[1] || '';
  const cleanAddr = addr.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
    .replace(/&amp;/g, '&').replace(/&oacute;/g, 'ó');

  const score = (chunk.match(/class="score">([\d.]+)/) || [])[1] || '';

  const dish = (chunk.match(/class="dish">(.*?)<\/div>/) || [])[1] || '';
  const cleanDish = dish.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
    .replace(/&amp;/g, '&');

  const verdict = (chunk.match(/class="verdict">(.*?)<\/p>/) || [])[1] || '';
  const cleanVerdict = verdict.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
    .replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');

  const proseMatch = parts[i - 1] ? parts[i - 1].split('<div class="venue-h">').pop() : '';
  const proseChunk = chunk.split('</section>')[0];
  const proseParas = [...proseChunk.matchAll(/<p>\s*([\s\S]*?)\s*<\/p>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
      .replace(/&amp;/g, '&').replace(/&oacute;/g, 'ó').replace(/&eacute;/g, 'é')
      .replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 20 && !p.includes('What I ordered'));

  const desc = cleanVerdict || proseParas[0] || '';

  const tags = [...chunk.matchAll(/class="pill">(.*?)<\/span>/g)].map(m => m[1]).slice(0, 3);

  venues.push({ name: cleanName, addr: cleanAddr, score, dish: cleanDish, desc, tags });
}

const outputHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IG Carousel: ${cleanTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #e8e6e1; font-family: Inter, sans-serif; padding: 40px; }
  h1 { font-family: Fraunces, serif; font-size: 24px; color: #1b1b18; margin-bottom: 8px; }
  .toolbar { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
  .info { color: #666; font-size: 14px; }
  .ratio-btn {
    background: #fff; border: 2px solid #ccc; padding: 8px 16px; border-radius: 6px;
    cursor: pointer; font-family: Inter; font-weight: 600; font-size: 13px;
  }
  .ratio-btn.active { border-color: #bc5a34; color: #bc5a34; }
  .slides { display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; }
  .slide-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .slide {
    background: #faf9f6; border-radius: 8px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }
  .dl-btn {
    background: #bc5a34; color: #fff; border: none; padding: 10px 20px;
    border-radius: 6px; cursor: pointer; font-family: Inter; font-weight: 600;
    font-size: 13px; letter-spacing: 0.02em;
  }
  .dl-btn:hover { background: #a04e2d; }
  .photo-btn {
    background: #1b1b18; color: #fff; border: none; padding: 10px 20px;
    border-radius: 6px; cursor: pointer; font-family: Inter; font-weight: 600;
    font-size: 13px;
  }
  .photo-btn:hover { background: #333; }
  .label { font-size: 12px; color: #999; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
  .cover-actions { display: flex; gap: 8px; }
</style>
</head>
<body>
<h1>${cleanTitle}</h1>
<div class="toolbar">
  <p class="info">${venues.length} slajdow + okladka + CTA</p>
  <button class="ratio-btn active" data-ratio="4:5" onclick="setRatio(1080,1350)">4:5</button>
  <button class="ratio-btn" data-ratio="1:1" onclick="setRatio(1080,1080)">1:1</button>
</div>
<div class="slides" id="slides"></div>

<script>
let W = 1080, H = 1350;
const PAPER = '#faf9f6';
const INK = '#1b1b18';
const TERRA = '#bc5a34';
const MUTED = '#8a8882';

const title = ${JSON.stringify(cleanTitle)};
const slug = ${JSON.stringify(slug)};
const venues = ${JSON.stringify(venues)};

let coverPhoto = null;

async function loadFonts() {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('600 96px Fraunces'),
    document.fonts.load('600 280px Fraunces'),
    document.fonts.load('400 36px Inter'),
    document.fonts.load('600 34px Inter'),
    document.fonts.load('500 48px Inter'),
  ]);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', ly = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, ly);
      line = w; ly += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, ly);
  return ly + lineH;
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawLogo(ctx, y, light) {
  ctx.save();
  ctx.font = '400 28px Inter';
  ctx.fillStyle = light ? 'rgba(255,255,255,0.5)' : '#c8c5be';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('bitekrakow', W / 2, y);
  ctx.restore();
}

function thinLine(ctx, x1, x2, y, light) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.25)' : '#d9d6cf';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCover(ctx) {
  if (coverPhoto) { drawCoverWithPhoto(ctx); return; }

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  const pad = 60;

  ctx.font = '600 96px Fraunces';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  const lines = wrapLines(ctx, title, W - pad * 2);
  const blockH = lines.length * 112;
  const startY = H / 2 - blockH / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * 112));

  thinLine(ctx, pad, W - pad, startY + blockH + 50);

  ctx.font = '400 36px Inter';
  ctx.fillStyle = MUTED;
  ctx.fillText(venues.length + ' places, tested in person', W / 2, startY + blockH + 105);

  ctx.font = '400 34px Inter';
  ctx.fillStyle = '#c8c5be';
  ctx.fillText('\\u2192', W / 2, H - 100);

  drawLogo(ctx, H - 50);
  ctx.textAlign = 'left';
}

function drawCoverWithPhoto(ctx) {
  const img = coverPhoto;
  const imgR = img.width / img.height, canR = W / H;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
  else { sh = img.width / canR; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

  const grad = ctx.createLinearGradient(0, H * 0.25, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.4, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.font = '600 96px Fraunces';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  const lines = wrapLines(ctx, title, W - 100);
  const startY = H - 140 - (lines.length * 112);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * 112));

  ctx.font = '400 34px Inter';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('\\u2192', W / 2, H - 60);

  drawLogo(ctx, H - 20, true);
  ctx.textAlign = 'left';
}

function drawVenue(ctx, v, idx) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  const pad = 60;
  const num = String(idx + 1);

  ctx.font = '600 280px Fraunces';
  ctx.fillStyle = '#ece9e2';
  ctx.textAlign = 'right';
  ctx.fillText(num, W - pad + 30, 310);
  ctx.textAlign = 'left';

  ctx.font = '600 76px Fraunces';
  ctx.fillStyle = INK;
  let ny = wrapText(ctx, v.name, pad, 420, W - pad * 2, 90);

  ctx.font = '400 34px Inter';
  ctx.fillStyle = '#a09d96';
  ny = wrapText(ctx, v.addr, pad, ny + 16, W - pad * 2, 44);

  thinLine(ctx, pad, W - pad, ny + 28);

  if (v.dish) {
    ctx.font = '500 38px Inter';
    ctx.fillStyle = INK;
    ny = wrapText(ctx, v.dish, pad, ny + 76, W - pad * 2, 50);
  }

  if (v.desc) {
    ctx.font = '400 36px Inter';
    ctx.fillStyle = '#5a5850';
    ny = wrapText(ctx, v.desc, pad, ny + 24, W - pad * 2, 50);
  }

  if (v.score) {
    ctx.font = '600 34px Inter';
    ctx.fillStyle = TERRA;
    ctx.fillText(v.score + '/10', pad, H - 100);
  }

  drawLogo(ctx, H - 50);
}

function drawCTA(ctx) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  ctx.font = '600 72px Fraunces';
  ctx.fillStyle = INK;
  ctx.fillText('Full guide at', W / 2, H / 2 - 60);

  ctx.font = '500 48px Inter';
  ctx.fillStyle = TERRA;
  const url = 'bitekrakow.com/' + slug + '/';
  ctx.fillText(url.length > 38 ? 'bitekrakow.com' : url, W / 2, H / 2 + 30);

  thinLine(ctx, 60, W - 60, H / 2 + 90);

  ctx.font = '400 34px Inter';
  ctx.fillStyle = '#a09d96';
  ctx.fillText('link in bio', W / 2, H / 2 + 150);

  drawLogo(ctx, H - 50);
  ctx.textAlign = 'left';
}

function makeSlide(drawFn, label, idx, ...args) {
  const wrap = document.createElement('div');
  wrap.className = 'slide-wrap';

  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const div = document.createElement('div');
  div.className = 'slide';
  const scale = Math.min(540 / W, 675 / H);
  div.style.width = Math.round(W * scale) + 'px';
  div.style.height = Math.round(H * scale) + 'px';
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%'; canvas.style.height = '100%';
  canvas.id = 'canvas-' + idx;
  div.appendChild(canvas);
  wrap.appendChild(div);

  const actions = document.createElement('div');
  actions.className = 'cover-actions';

  if (idx === 0) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'cover-file';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        coverPhoto = img;
        const ctx = canvas.getContext('2d');
        drawCover(ctx);
      };
      img.src = URL.createObjectURL(file);
    };
    wrap.appendChild(fileInput);

    const photoBtn = document.createElement('button');
    photoBtn.className = 'photo-btn';
    photoBtn.textContent = 'Wybierz zdjecie';
    photoBtn.onclick = () => fileInput.click();
    actions.appendChild(photoBtn);
  }

  const btn = document.createElement('button');
  btn.className = 'dl-btn';
  btn.textContent = 'Pobierz PNG';
  btn.onclick = () => {
    const a = document.createElement('a');
    a.download = slug + '-slide-' + String(idx).padStart(2, '0') + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  actions.appendChild(btn);
  wrap.appendChild(actions);

  const ctx = canvas.getContext('2d');
  drawFn(ctx, ...args);
  return wrap;
}

function renderAll() {
  const container = document.getElementById('slides');
  container.innerHTML = '';
  container.appendChild(makeSlide(drawCover, 'Okladka (slide 1)', 0));
  venues.forEach((v, i) => {
    container.appendChild(makeSlide(drawVenue, 'Slide ' + (i + 2) + ': ' + v.name, i + 1, v, i));
  });
  container.appendChild(makeSlide(drawCTA, 'CTA (ostatni slide)', venues.length + 1));
}

window.setRatio = function(w, h) {
  W = w; H = h;
  document.querySelectorAll('.ratio-btn').forEach(b => b.classList.toggle('active', b.dataset.ratio === w + ':' + h));
  renderAll();
};

loadFonts().then(renderAll);
</script>
</body>
</html>`;

const outPath = join(SITE, '..', `_carousel-${slug}.html`);
writeFileSync(outPath, outputHtml);
console.log(`Gotowe: ${outPath}`);
console.log(`Otwieranie w przeglądarce...`);
try { execSync(`open "${outPath}"`); } catch {}
