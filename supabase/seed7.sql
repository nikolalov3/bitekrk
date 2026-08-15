-- Lokale z artykułów opublikowanych 2026-08-15 (batch 4):
-- outdoor-cafes-krakow, krowodrza-guide
-- Odpal w SQL Editorze, potem sync /api/refresh-places.

-- Nowe lokale (outdoor-cafes-krakow)
insert into venues (slug, name, district, address, price_range, tags) values
  ('meho-cafe',       'Meho Cafe',               'Stare Miasto', 'ul. Krupnicza 26, 31-123 Kraków',            '$',   '{"hidden garden","art nouveau","museum cafe","seasonal"}'),
  ('stara-zajezdnia', 'Stara Zajezdnia',          'Kazimierz',    'ul. Św. Wawrzyńca 12, 31-060 Kraków',       '$$',  '{"beer garden","brewery","industrial heritage","outdoor"}'),
  ('la-campana',      'Trattoria La Campana',     'Stare Miasto', 'ul. Kanonicza 7, 31-002 Kraków',            '$$$', '{"italian","medieval garden","near wawel","romantic"}')
on conflict (slug) do nothing;

-- Nowe lokale (krowodrza-guide)
insert into venues (slug, name, district, address, price_range, tags) values
  ('pietka',             'Pietka Artisan Bakery',  'Krowodrza',  'ul. Łobzowska 5, 33-332 Kraków',            '$',   '{"artisan bakery","sourdough","breakfast","budget-friendly"}'),
  ('bococa',             'Bococa Bistro',          'Krowodrza',  'Plac Inwalidów 7, 30-033 Kraków',           '$$',  '{"brunch","european bistro","pet-friendly","eggs benedict"}'),
  ('good-lood-krowodrza','Good Lood Krowodrza',   'Krowodrza',  'Plac Teodora Axentowicza, 30-034 Kraków',   '$',   '{"artisan ice cream","natural ingredients","vegan options"}'),
  ('moti-wine-bar',      'Moti Wine Bar & Shop',  'Kleparz',    'Rynek Kleparski 14, 31-150 Kraków',          '$$',  '{"polish wine","wine bar","stary kleparz","hidden gem"}')
on conflict (slug) do nothing;

-- Mapowania artykuł → lokal (outdoor-cafes-krakow)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('outdoor-cafes-krakow', 'meho-cafe', 1),
  ('outdoor-cafes-krakow', 'mleczarnia', 2),
  ('outdoor-cafes-krakow', 'kolanko-no6', 3),
  ('outdoor-cafes-krakow', 'stara-zajezdnia', 4),
  ('outdoor-cafes-krakow', 'la-campana', 5),
  ('outdoor-cafes-krakow', 'drukarnia', 6),
  ('outdoor-cafes-krakow', 'baqaro', 7)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;

-- Mapowania artykuł → lokal (krowodrza-guide)
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('krowodrza-guide', 'ilovecoffee', 1),
  ('krowodrza-guide', 'pietka', 2),
  ('krowodrza-guide', 'bococa', 3),
  ('krowodrza-guide', 'good-lood-krowodrza', 4),
  ('krowodrza-guide', 'moti-wine-bar', 5),
  ('krowodrza-guide', 'forty-kleparz', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
