// Oddaje zdjęcie lokalu z Google Places bez ujawniania klucza API.
// Użycie w karcie: <img src="/api/photo?slug=szklarnia">
// Endpoint znajduje w bazie nazwę zasobu zdjęcia (google_photo, zapisuje ją
// /api/refresh-places) i przekierowuje do medialnego URL-a Places API.
// Lokale z własnym zdjęciem w /img/ nie korzystają z tego endpointu.

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');

  const { SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_MAPS_API_KEY } = process.env;
  const slug = String(req.query.slug || '');
  if (!slug || !SUPABASE_URL || !SUPABASE_ANON_KEY || !GOOGLE_MAPS_API_KEY) {
    return res.status(404).end();
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/venues?select=google_photo&slug=eq.${encodeURIComponent(slug)}`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!r.ok) return res.status(404).end();
  const rows = await r.json();
  const photo = rows[0] && rows[0].google_photo;
  if (!photo) return res.status(404).end();

  // Zdjęcia zmieniają się rzadko: dzień cache w przeglądarce, tydzień na CDN.
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.redirect(
    302,
    `https://places.googleapis.com/v1/${photo}/media?maxWidthPx=900&key=${GOOGLE_MAPS_API_KEY}`
  );
}
