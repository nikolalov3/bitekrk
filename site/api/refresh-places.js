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

const PLACE_FIELDS = 'rating,userRatingCount,googleMapsUri,reviews,photos';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY, SYNC_SECRET, CRON_SECRET } = process.env;
  // Dwie drogi wejścia: ręcznie z ?secret= albo cron Vercela z nagłówkiem
  // Authorization: Bearer CRON_SECRET (Vercel dokleja go sam, gdy env istnieje).
  const fromCron = CRON_SECRET && (req.headers.authorization === `Bearer ${CRON_SECRET}`);
  if (!fromCron && (!SYNC_SECRET || req.query.secret !== SYNC_SECRET)) {
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

  // Tryb audytu: ?audit=1 porównuje nazwę w bazie z nazwą wizytówki Google,
  // żeby wyłapać błędne dopasowania place_id. Nic nie zapisuje.
  if (req.query.audit) {
    const aResp = await sb(`venues?select=slug,name,address,place_id&place_id=not.is.null&order=slug`);
    const rows = await aResp.json();
    const audit = [];
    for (const v of rows) {
      const g = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(v.place_id)}`, {
        headers: { 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'displayName,formattedAddress' }
      });
      const place = g.ok ? await g.json() : null;
      audit.push({
        slug: v.slug,
        nasza_nazwa: v.name,
        google_nazwa: place && place.displayName ? place.displayName.text : `BŁĄD ${g.status}`,
        google_adres: place ? place.formattedAddress : null
      });
    }
    return res.status(200).json({ audit });
  }

  // Tryb znaczników: ?attrs=1 dociąga dla wszystkich lokali z place_id
  // atrybuty wizytówki (płatność, ogródek, wege, psy, rezerwacje, dostępność),
  // strukturalne godziny, telefon i współrzędne. Zapisuje do kolumn
  // attrs/hours/phone/lat/lng (patrz supabase/migration-attrs.sql).
  if (req.query.attrs) {
    const FIELDS = [
      'internationalPhoneNumber', 'websiteUri', 'regularOpeningHours', 'location',
      'paymentOptions', 'outdoorSeating', 'servesVegetarianFood', 'servesBeer',
      'servesWine', 'servesCocktails', 'servesCoffee', 'servesDessert',
      'servesBreakfast', 'servesLunch', 'servesDinner', 'allowsDogs',
      'goodForChildren', 'goodForGroups', 'accessibilityOptions',
      'delivery', 'dineIn', 'takeout', 'reservable', 'curbsidePickup', 'restroom'
    ].join(',');
    const listR = await sb(`venues?select=id,slug,place_id&place_id=not.is.null&active=eq.true&order=slug`);
    if (!listR.ok) return res.status(502).json({ error: 'Supabase nie oddał listy.', detail: await listR.text() });
    const rows = await listR.json();
    const out = [];
    for (const v of rows) {
      try {
        const g = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(v.place_id)}`, {
          headers: { 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': FIELDS }
        });
        if (!g.ok) { out.push({ slug: v.slug, ok: false, status: g.status }); continue; }
        const p = await g.json();
        const attrs = {};
        for (const k of ['outdoorSeating','servesVegetarianFood','servesBeer','servesWine','servesCocktails','servesCoffee','servesDessert','servesBreakfast','servesLunch','servesDinner','allowsDogs','goodForChildren','goodForGroups','delivery','dineIn','takeout','reservable','curbsidePickup','restroom']) {
          if (typeof p[k] === 'boolean') attrs[k] = p[k];
        }
        if (p.paymentOptions) attrs.paymentOptions = p.paymentOptions;
        if (p.accessibilityOptions) attrs.accessibilityOptions = p.accessibilityOptions;
        const patchBody = {
          attrs,
          hours: p.regularOpeningHours ? {
            weekdayDescriptions: p.regularOpeningHours.weekdayDescriptions || null,
            periods: p.regularOpeningHours.periods || null
          } : null,
          phone: p.internationalPhoneNumber || null,
          lat: p.location ? p.location.latitude : null,
          lng: p.location ? p.location.longitude : null
        };
        if (p.websiteUri) patchBody.website_url = p.websiteUri;
        const patch = await sb(`venues?id=eq.${v.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(patchBody)
        });
        out.push({ slug: v.slug, ok: patch.ok, attrs: Object.keys(attrs).length, hours: !!p.regularOpeningHours });
      } catch (e) {
        out.push({ slug: v.slug, ok: false, error: String(e) });
      }
    }
    return res.status(200).json({ mode: 'attrs', updated: out.length, results: out });
  }

  // Tryb naprawy: ?fix=<slug>&q=<własne zapytanie> wyszukuje wizytówkę od
  // nowa po podanej frazie, nadpisuje place_id i czyści datę syncu.
  if (req.query.fix && req.query.q) {
    const sResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      },
      body: JSON.stringify({ textQuery: String(req.query.q), languageCode: 'pl' })
    });
    const found = sResp.ok ? (await sResp.json()).places : null;
    if (!found || !found.length) return res.status(404).json({ error: 'Nic nie znaleziono dla tej frazy.' });
    const upd = await sb(`venues?slug=eq.${encodeURIComponent(String(req.query.fix))}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ place_id: found[0].id, rating_synced_at: null })
    });
    return res.status(200).json({
      fixed: req.query.fix, ok: upd.ok,
      nowa_wizytowka: found[0].displayName ? found[0].displayName.text : null,
      adres: found[0].formattedAddress
    });
  }

  // Lokale nieodświeżane przez ostatnie 7 dni. Brakujące place_id
  // uzupełniamy sami wyszukiwaniem po nazwie i adresie.
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const listResp = await sb(
    `venues?select=id,slug,name,address,place_id,rating_synced_at&active=eq.true&or=(rating_synced_at.is.null,rating_synced_at.lt.${cutoff})`
  );
  if (!listResp.ok) {
    return res.status(502).json({ error: 'Supabase nie oddał listy lokali.', detail: await listResp.text() });
  }
  const venues = await listResp.json();

  const results = [];
  for (const v of venues) {
    try {
      if (!v.place_id) {
        const sResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName'
          },
          body: JSON.stringify({ textQuery: `${v.name}, ${v.address || ''} Kraków`, languageCode: 'pl' })
        });
        if (!sResp.ok) {
          results.push({ slug: v.slug, ok: false, error: 'searchText nieudany.', status: sResp.status, detail: (await sResp.text()).slice(0, 300) });
          continue;
        }
        const found = (await sResp.json()).places;
        if (!found || !found.length) {
          results.push({ slug: v.slug, ok: false, error: 'Nie znaleziono place_id.' });
          continue;
        }
        v.place_id = found[0].id;
        await sb(`venues?id=eq.${v.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ place_id: v.place_id })
        });
      }
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
          google_photo: (place.photos && place.photos[0] && place.photos[0].name) || null,
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
