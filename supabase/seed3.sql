-- Lokale z artykułów opublikowanych 2026-08-09 (wieczór):
-- specialty-coffee-krakow, dog-friendly-cafes-krakow.
-- Odpal w SQL Editorze, potem sync /api/refresh-places.

insert into venues (slug, name, district, address, price_range, tags) values
  ('coffee-cargo', 'Coffee Cargo (Coffee Proficiency)', 'Zabłocie',  'ul. Przemysłowa 3, Kraków',           '$$', '{"specialty coffee","roastery","beans to go"}'),
  ('psikawka',     'Psikawka',                          'Krowodrza', 'ul. Mazowiecka 8, 30-036 Kraków',     '$$', '{"dog cafe","breakfast","waffles"}'),
  ('lokator',      'Lokator',                           'Kazimierz', 'ul. Mostowa 1, 31-061 Kraków',        '$',  '{"bookstore cafe","dog-friendly"}'),
  ('cafe-pianola', 'Cafe Pianola',                      'Stare Miasto','ul. Senacka 7, Kraków',             '$$', '{"cafe","courtyard","dog-friendly"}'),
  ('czyzyk',       'Czyżyk',                            'Czyżyny',   'ul. Bolesława Orlińskiego 5, Kraków', '$',  '{"bakery cafe","specialty coffee","dog-friendly"}')
on conflict (slug) do nothing;

insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('specialty-coffee-krakow', 'bruk-cafe', 1),
  ('specialty-coffee-krakow', 'urban-coffee', 2),
  ('specialty-coffee-krakow', 'wesola-cafe', 3),
  ('specialty-coffee-krakow', 'bussola', 4),
  ('specialty-coffee-krakow', 'ilovecoffee', 5),
  ('specialty-coffee-krakow', 'coffee-cargo', 6),
  ('dog-friendly-cafes-krakow', 'psikawka', 1),
  ('dog-friendly-cafes-krakow', 'bruk-cafe', 2),
  ('dog-friendly-cafes-krakow', 'lokator', 3),
  ('dog-friendly-cafes-krakow', 'cafe-pianola', 4),
  ('dog-friendly-cafes-krakow', 'czyzyk', 5),
  ('dog-friendly-cafes-krakow', 'wesola-cafe', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
