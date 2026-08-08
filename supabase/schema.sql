-- BiteKrakow: lokale + przypięcia do artykułów.
-- Oceny i opinie z Google trzymamy w tabeli, odświeża je /api/refresh-places
-- (Google pozwala cache'ować oceny do 30 dni, my odświeżamy co 7).

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- "bruk-cafe"
  name text not null,
  district text,                          -- "Kleparz", "Kazimierz"...
  address text,
  price_range text,                       -- "$", "$$", "$$$"
  tags text[] default '{}',               -- ["wifi","dog-friendly","breakfast"]
  description_en text,                    -- 2-3 zdania, co wyróżnia
  photo_url text,                         -- własne zdjęcie, nie stock
  place_id text unique,                   -- Google Place ID
  maps_url text,                          -- link do wizytówki Google
  website_url text,
  hours_short text,                       -- "Mon-Fri 8-18, Sat-Sun 9-17"
  google_photo text,                      -- nazwa zasobu zdjęcia z Places API
  rating numeric(2,1),                    -- z Google, synchronizowane
  reviews_count int,                      -- z Google, synchronizowane
  reviews jsonb default '[]',             -- [{author, rating, text, time}] z Google
  rating_synced_at timestamptz,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Kolejność lokali w konkretnym artykule + opcjonalna notka kontekstowa.
create table if not exists article_venues (
  article_slug text not null,             -- "where-to-work-krakow"
  venue_id uuid not null references venues(id) on delete cascade,
  position int not null default 0,
  note_en text,                           -- np. "Best sockets-per-table ratio on this list"
  primary key (article_slug, venue_id)
);

alter table venues enable row level security;
alter table article_venues enable row level security;

-- Czytanie publiczne (klucz anon), zapis tylko kluczem serwisowym z funkcji API.
create policy "public read venues" on venues
  for select using (active);

create policy "public read article_venues" on article_venues
  for select using (true);

-- Uprawnienia dla ról API Supabase (RLS i tak filtruje odczyt publiczny,
-- ale role muszą mieć bazowy GRANT, inaczej PostgREST zwraca 42501).
grant usage on schema public to anon, authenticated, service_role;
grant select on public.venues, public.article_venues to anon, authenticated;
grant all on public.venues, public.article_venues to service_role;
