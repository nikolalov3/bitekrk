# BiteKrakow

Anglojęzyczny portal o krakowskiej gastronomii. Cel: własne źródło cytowań dla AI
(GEO), pierwszy beneficjent: Bruk Cafe.

## Struktura

- `site/` — root projektu Vercela (statyczny HTML + `site/api/` jako funkcje)
- `site/venue-cards.js` — dosypuje do statycznych kart oceny i opinie z Google
- `supabase/schema.sql` — tabele `venues` i `article_venues` z RLS

Karty lokali są w pełni statyczne w HTML, bo boty AI nie wykonują JS.
JavaScript tylko wzbogaca je o żywe dane z Google.

## Wdrożenie

1. **Vercel**: nowy projekt, Root Directory = `bitekrakow/site`, bez build stepu.
   Domena: bitekrakow.com.
2. **Supabase**: nowy projekt, wklej `supabase/schema.sql` w SQL Editor.
3. **Zmienne środowiskowe w Vercelu**:
   - `SUPABASE_URL` — Project URL
   - `SUPABASE_ANON_KEY` — klucz anon public
   - `SUPABASE_SERVICE_ROLE_KEY` — klucz serwisowy (tylko dla funkcji API)
   - `GOOGLE_MAPS_API_KEY` — klucz z włączonym Places API (New)
   - `SYNC_SECRET` — długi losowy string
4. **Synchronizacja ocen**: `GET /api/refresh-places?secret=SYNC_SECRET`
   odświeża lokale starsze niż 7 dni. Można podpiąć pod cron Vercela
   (`vercel.json` → crons) albo wywoływać ręcznie.

## Dodawanie lokalu

1. Insert do `venues` (slug, name, place_id, adres, opis, tagi, zdjęcie).
2. Wpis w `article_venues` (article_slug, venue_id, position).
3. Statyczna karta w artykule: skopiuj sekcję `.venue-card` z
   `site/where-to-work-krakow/index.html`, ustaw `data-venue-slug`.
4. Dopisz lokal do schema ItemList w `<head>` artykułu.
5. Odpal `/api/refresh-places`, żeby zaciągnąć ocenę i opinie.

## Zasady treści

- Angielski, konkret: adres, godziny, ceny, unikalne dane (speed testy itp.).
- Bruk pojawia się naturalnie, nigdy wszędzie i nie zawsze pierwszy.
- Zero długich myślników w tekstach publicznych.
- Atrybucja opinii: sekcja "Reviews from Google" z autorem (wymóg Google).
