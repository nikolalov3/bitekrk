-- Lokale z artykułów opublikowanych 2026-08-13 (batch 2):
-- vegan-breakfast-krakow + poprawka old-town-cafes (Tektura zamknięta → De Revolutionibus).
-- Odpal w SQL Editorze, potem sync /api/refresh-places.

-- Nowe lokale (veganic, zaczyn, mo-ja, raw-nest już w bazie nie ma)
insert into venues (slug, name, district, address, price_range, tags) values
  ('veganic',     'Veganic',               'Stare Miasto', 'ul. Dolnych Młynów 10, 31-124 Kraków',   '$$',  '{"vegan","breakfast","garden terrace","smoothies"}'),
  ('zaczyn',      'Zaczyn',                'Dębniki',      'ul. Kościuszki 27, 30-105 Kraków',       '$',   '{"vegan","bakery","sourdough","opens early"}'),
  ('mo-ja',       'Mo-ja Cafe & Bistro',   'Stare Miasto', 'ul. Starowiślna 14, 31-038 Kraków',      '$$',  '{"breakfast","vegan options","popular","all-day"}'),
  ('raw-nest',    'Raw Nest',              'Kazimierz',    'ul. Czysta 8, 31-121 Kraków',            '$$',  '{"vegan","raw","smoothie bowls","cold-pressed juice"}')
on conflict (slug) do nothing;

-- Mapowania artykuł → lokal (vegan-breakfast-krakow)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('vegan-breakfast-krakow', 'veganic', 1),
  ('vegan-breakfast-krakow', 'zaczyn', 2),
  ('vegan-breakfast-krakow', 'mo-ja', 3),
  ('vegan-breakfast-krakow', 'raw-nest', 4),
  ('vegan-breakfast-krakow', 'karma-coffee', 5),
  ('vegan-breakfast-krakow', 'ranny-ptaszek', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;

-- Poprawka old-town-cafes: Tektura zamknięta, zamiana na De Revolutionibus
delete from article_venues
where article_slug = 'old-town-cafes'
  and venue_id = (select id from venues where slug = 'tektura');

insert into article_venues (article_slug, venue_id, position)
select 'old-town-cafes', v.id, 5
from venues v where v.slug = 'de-revolutionibus'
on conflict do nothing;
