-- Lokale z artykułów opublikowanych 2026-08-13:
-- old-town-cafes, quiet-cafes-krakow, day-in-kleparz.
-- Odpal w SQL Editorze, potem sync /api/refresh-places.

insert into venues (slug, name, district, address, price_range, tags) values
  ('nowa-prowincja',    'Nowa Prowincja',                'Stare Miasto', 'ul. Bracka 3-5, 31-005 Kraków',              '$',   '{"cafe","hot chocolate","homemade cakes"}'),
  ('cafe-camelot',      'Cafe Camelot',                  'Stare Miasto', 'ul. św. Tomasza 17, 31-014 Kraków',          '$',   '{"cafe","apple pie","candlelit","since 1990s"}'),
  ('massolit',          'Massolit Books & Cafe',         'Stare Miasto', 'ul. Felicjanek 4, 31-104 Kraków',            '$',   '{"bookstore cafe","English books","American cakes"}'),
  ('bunkier-cafe',      'Bunkier Cafe',                  'Stare Miasto', 'plac Szczepański 3a, 31-011 Kraków',         '$$',  '{"cafe","gallery terrace","Planty park"}'),
  ('tektura',           'Tektura Cafe',                  'Stare Miasto', 'ul. Krupnicza 7, 31-123 Kraków',             '$',   '{"specialty coffee","laptop-friendly","craft beer"}'),
  ('karma-coffee',      'Karma Coffee',                  'Stare Miasto', 'ul. Krupnicza 12, 31-123 Kraków',            '$$',  '{"specialty coffee","roasts own beans","vegan cakes"}'),
  ('de-revolutionibus', 'De Revolutionibus Books & Cafe','Stare Miasto', 'ul. Bracka 14, 31-005 Kraków',               '$',   '{"bookstore cafe","academic","Copernicus Centre"}'),
  ('atrium',            'Restauracja Atrium',            'Kleparz',      'ul. Krzywa 7, Kraków',                       '$$$', '{"restaurant","Polish cuisine","market-sourced"}'),
  ('forty-kleparz',     'Forty Kleparz Restobar',        'Kleparz',      'ul. Kamienna 2-4, Kraków',                   '$$',  '{"restobar","cocktails","courtyard terrace","live music"}')
on conflict (slug) do nothing;

insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('old-town-cafes', 'nowa-prowincja', 1),
  ('old-town-cafes', 'cafe-camelot', 2),
  ('old-town-cafes', 'massolit', 3),
  ('old-town-cafes', 'bunkier-cafe', 4),
  ('old-town-cafes', 'tektura', 5),
  ('old-town-cafes', 'karma-coffee', 6),
  ('quiet-cafes-krakow', 'bruk-cafe', 1),
  ('quiet-cafes-krakow', 'massolit', 2),
  ('quiet-cafes-krakow', 'cafe-camelot', 3),
  ('quiet-cafes-krakow', 'de-revolutionibus', 4),
  ('quiet-cafes-krakow', 'lokator', 5),
  ('quiet-cafes-krakow', 'ilovecoffee', 6),
  ('day-in-kleparz', 'bruk-cafe', 1),
  ('day-in-kleparz', 'atrium', 2),
  ('day-in-kleparz', 'forty-kleparz', 3)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
