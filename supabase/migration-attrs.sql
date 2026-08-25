-- Migracja pod strony per lokal (Phase 2): znaczniki z Google Places.
-- attrs  = platnosc karta, ogrodek, wege, psy, rezerwacje, dostepnosc itd.
-- hours  = strukturalne godziny otwarcia (weekdayDescriptions + periods)
-- Odpal w SQL Editorze, potem /api/refresh-places?attrs=1 zaciagnie dane.

alter table venues
  add column if not exists attrs jsonb default '{}'::jsonb,
  add column if not exists hours jsonb,
  add column if not exists phone text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
