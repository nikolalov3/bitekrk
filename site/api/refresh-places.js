// Odświeża oceny i opinie z Google Places dla wszystkich lokali z place_id.
// Wywołanie: GET /api/refresh-places?secret=... (ręcznie albo z crona Vercela).
//
// Zmienne środowiskowe (Vercel):
//   SUPABASE_URL               — jak w config.js
//   SUPABASE_SERVICE_ROLE_KEY  — klucz serwisowy (tylko tu, nigdy do przeglądarki)
//   GOOGLE_MAPS_API_KEY        — klucz z włączonym Places API (New)
//   SYNC_SECRET                — dowolny długi losowy string, chroni endpoint
//
// Zasady Google: ocena i opinie mogą być cache'owane do 30 dni, opinie
// pokazujemy z autorem i dopiskiem "Reviews from Google". Odświeżamy co 7 dni.

const PLACE_FIELDS = 'rating,userRatingCount,googleMapsUri,reviews';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY, SYNC_SECRET } = process.env;
  if (!SYNC_SECRET || req.query.secret !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Zły albo brakujący secret.' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_MAPS_API_KEY) {
    return res.status(503).json({ error: 'Brak konfiguracji: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY.' });
  }

  const sb = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  // Lokale z place_id, których nie odświeżaliśmy przez ostatnie 7 dni.
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const listResp = await sb(
    `venues?select=id,slug,place_id,rating_synced_at&place_id=not.is.null&or=(rating_synced_at.is.null,rating_synced_at.lt.${cutoff})`
  );
  if (!listResp.ok) {
    return res.status(502).json({ error: 'Supabase nie oddał listy lokali.', detail: await listResp.text() });
  }
  const venues = await listResp.json();

  const results = [];
  for (const v of venues) {
    try {
      const gResp = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(v.place_id)}`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': PLACE_FIELDS
          }
        }
      );
      if (!gResp.ok) {
        results.push({ slug: v.slug, ok: false, status: gResp.status });
        continue;
      }
      const place = await gResp.json();

      // Bierzemy maksymalnie 3 najnowsze opinie z tekstem, z autorem (wymóg atrybucji).
      const reviews = (place.reviews || [])
        .filter(r => r.text && r.text.text)
        .slice(0, 3)
        .map(r => ({
          author: r.authorAttribution ? r.authorAttribution.displayName : 'Google user',
          rating: r.rating,
          text: r.text.text.slice(0, 280),
          time: r.publishTime || null
        }));

      const patch = await sb(`venues?id=eq.${v.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          rating: place.rating ?? null,
          reviews_count: place.userRatingCount ?? null,
          maps_url: place.googleMapsUri ?? undefined,
          reviews,
          rating_synced_at: new Date().toISOString()
        })
      });
      results.push({ slug: v.slug, ok: patch.ok, rating: place.rating, reviews: reviews.length });
    } catch (e) {
      results.push({ slug: v.slug, ok: false, error: String(e) });
    }
  }

  return res.status(200).json({ refreshed: results.length, results });
}
