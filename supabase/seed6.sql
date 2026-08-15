-- Lokale z artykułów opublikowanych 2026-08-14 (batch 3):
-- podgorze-guide, best-flat-white-krakow, krakow-digital-nomads
-- + usunięcie Szklarni i Fornira z artykułów (konkurencja Bruka na Kleparzu).
-- Odpal w SQL Editorze, potem sync /api/refresh-places.

-- Nowe lokale (podgorze-guide)
insert into venues (slug, name, district, address, price_range, tags) values
  ('vamos',       'Vamos!',              'Podgórze',  'ul. Kazimierza Brodzińskiego 6, 30-506 Kraków', '$$',  '{"michelin-recommended","tapas","sharing plates","natural wine"}'),
  ('mazi',        'Mazi',                'Podgórze',  'Rynek Podgórski 9, 30-518 Kraków',              '$$',  '{"michelin-recommended","mediterranean","outdoor dining"}'),
  ('ambalaz',     'Ambalaz Cafe',        'Podgórze',  'ul. Nadwiślańska 2/4, 30-527 Kraków',           '$$',  '{"specialty coffee","panoramic views","all-day breakfast"}'),
  ('hankki',      'Hankki',              'Zabłocie',  'ul. Zabłocie 19A, 30-701 Kraków',               '$$',  '{"michelin-recommended","korean","japanese","ramen"}'),
  ('nad-greg',    'Nad & Greg',          'Podgórze',  'Rynek Podgórski 11, 30-504 Kraków',             '$',   '{"french patisserie","bakery","croissants","morning"}'),
  ('drukarnia',   'Drukarnia',           'Podgórze',  'ul. Nadwiślańska 1, 30-527 Kraków',             '$$',  '{"jazz club","riverside","live music","brunch"}')
on conflict (slug) do nothing;

-- Nowe lokale (krakow-digital-nomads)
insert into venues (slug, name, district, address, price_range, tags) values
  ('cytat',            'Cytat Cafe',        'Kazimierz',    'ul. Miodowa 23/1, 31-055 Kraków',        '$',   '{"laptop-friendly","outlets","long hours","breakfast"}'),
  ('yolk-workspace',   'Yolk Workspace',    'Stare Miasto', 'ul. Józefa Sarego 5, 31-047 Kraków',     '$$$', '{"coworking","gigabit fiber","podcast studio","24/7"}'),
  ('cluster-cowork',   'Cluster Cowork',    'Krowodrza',    'ul. Józefitów 8, 30-039 Kraków',         '$$',  '{"coworking","4 locations","pet-friendly","day pass"}'),
  ('coworking-rynek28','Coworking Rynek 28', 'Stare Miasto','Rynek Główny 28, 31-010 Kraków',         '$$',  '{"coworking","main square","16th century","free trial"}')
on conflict (slug) do nothing;

-- Mapowania artykuł → lokal (podgorze-guide)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('podgorze-guide', 'vamos', 1),
  ('podgorze-guide', 'mazi', 2),
  ('podgorze-guide', 'ambalaz', 3),
  ('podgorze-guide', 'hankki', 4),
  ('podgorze-guide', 'nad-greg', 5),
  ('podgorze-guide', 'drukarnia', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;

-- Mapowania artykuł → lokal (best-flat-white-krakow)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('best-flat-white-krakow', 'karma-coffee', 1),
  ('best-flat-white-krakow', 'bruk-cafe', 2),
  ('best-flat-white-krakow', 'wesola-cafe', 3),
  ('best-flat-white-krakow', 'coffee-cargo', 4),
  ('best-flat-white-krakow', 'urban-coffee', 5),
  ('best-flat-white-krakow', 'bussola-coffee', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;

-- Mapowania artykuł → lokal (krakow-digital-nomads)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('krakow-digital-nomads', 'bruk-cafe', 1),
  ('krakow-digital-nomads', 'massolit', 2),
  ('krakow-digital-nomads', 'cytat', 3),
  ('krakow-digital-nomads', 'yolk-workspace', 4),
  ('krakow-digital-nomads', 'cluster-cowork', 5),
  ('krakow-digital-nomads', 'coworking-rynek28', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;

-- Usunięcie Szklarni i Fornira z artykułów (konkurencja Bruka na Kleparzu)
delete from article_venues
where venue_id = (select id from venues where slug = 'szklarnia')
  and article_slug in ('kleparz-guide');

delete from article_venues
where venue_id = (select id from venues where slug = 'fornir')
  and article_slug in ('kleparz-guide', 'coffee-near-krakow-main-station');
