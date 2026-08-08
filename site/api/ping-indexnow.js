// Pinguje IndexNow (Bing) o nowych albo zaktualizowanych adresach.
// ChatGPT przy wyszukiwaniu korzysta z indeksu Binga, więc szybka
// indeksacja tutaj to szybsza obecność w odpowiedziach AI.
//
// Wywołanie po publikacji wpisu:
//   GET /api/ping-indexnow?secret=SYNC_SECRET&url=https://bitekrakow.com/nowy-wpis/
// Kilka adresów naraz: url powtórzony (?url=...&url=...).
//
// Klucz IndexNow nie jest sekretem: musi być publiczny, leży w
// site/<klucz>.txt i to nim Bing weryfikuje własność domeny.

const INDEXNOW_KEY = '2572829eae3d407fd390fa62bf8c04a8';
const HOST = 'bitekrakow.com';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const { SYNC_SECRET } = process.env;
  if (!SYNC_SECRET || req.query.secret !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Zły albo brakujący secret.' });
  }

  const raw = req.query.url;
  const urls = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter(u => { try { return new URL(u).hostname === HOST; } catch { return false; } });

  if (!urls.length) {
    return res.status(400).json({ error: `Podaj ?url= z adresem w domenie ${HOST}.` });
  }

  const ping = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    })
  });

  return res.status(200).json({ submitted: urls, indexnowStatus: ping.status });
}
