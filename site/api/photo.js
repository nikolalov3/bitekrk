// Oddaje zdjecie lokalu z Google Places bez ujawniania klucza API.
// Uzycie w karcie: <img src="/api/photo?slug=hevre&w=640">
// Endpoint pobiera po stronie serwera krotko zyjacy adres zdjecia (photoUri, bez klucza)
// przez skipHttpRedirect i przekierowuje przegladarke prosto na googleusercontent.
// Dzieki temu klucz nie trafia do przegladarki, odpada jeden skok sieciowy przy LCP,
// a CDN Vercela trzyma przekierowanie przez godzine, wiec Google nie liczy kazdej odslony.
// Lokale z wlasnym zdjeciem w /img/ nie korzystaja z tego endpointu.
// ?p=N wybiera N-te zdjecie z recznie wybranych (attrs.photo_pick: wnetrza, fasady),
// a gdy Google je uniewazni, wraca do domyslnego google_photo.

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');

  const { SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY } = process.env;
  const slug = String(req.query.slug || '');
  const w = Math.max(160, Math.min(1200, parseInt(req.query.w, 10) || 900));
  const p = req.query.p === undefined ? -1 : Math.max(0, Math.min(9, parseInt(req.query.p, 10) || 0));
  if (!slug || !SUPABASE_URL || !SUPABASE_ANON_KEY || !GOOGLE_MAPS_API_KEY) {
    return res.status(404).end();
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/venues?select=google_photo,attrs->photo_pick&slug=eq.${encodeURIComponent(slug)}`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!r.ok) return res.status(404).end();
  const rows = await r.json();
  const row = rows[0] || {};
  const picks = Array.isArray(row.photo_pick) ? row.photo_pick : [];
  const candidates = [p >= 0 && picks[p] && picks[p].name, row.google_photo].filter(Boolean);
  if (!candidates.length) return res.status(404).end();

  let data = null;
  for (const photo of candidates) {
    const m = await fetch(
      `https://places.googleapis.com/v1/${photo}/media?maxWidthPx=${w}&skipHttpRedirect=true&key=${GOOGLE_MAPS_API_KEY}`
    );
    if (!m.ok) continue;
    data = await m.json().catch(() => null);
    if (data && data.photoUri) break;
  }
  if (!data || !data.photoUri) return res.status(404).end();

  // photoUri jest krotko zyjacy: godzina w przegladarce i na CDN, potem nowy adres.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600');
  return res.redirect(302, data.photoUri);
}
