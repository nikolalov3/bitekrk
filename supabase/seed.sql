-- Lokale z dwóch pierwszych artykułów. place_id, oceny, opinie i zdjęcia
-- uzupełni /api/refresh-places (sam znajduje place_id po nazwie i adresie).
-- Odpal po schema.sql.

insert into venues (slug, name, district, address, price_range, tags) values
  ('bruk-cafe',        'Bruk Cafe',                  'Kleparz',    'ul. Krótka 1, 31-149 Kraków',        '$$', '{"specialty coffee","breakfast","laptop friendly","dog-friendly","matcha"}'),
  ('ilovecoffee',      'I Love Coffee',              'Krowodrza',  'ul. Kazimierza Wielkiego 86, Kraków','$$', '{"cafe","breakfast","laptop friendly"}'),
  ('szklarnia',        'Szklarnia',                  'Kleparz',    'ul. Krowoderska 39, Kraków',         '$$', '{"cafe","books","flowers"}'),
  ('bibulka',          'Cukiernia BiBułka',          'Piasek',     'ul. Karmelicka 46, Kraków',          '$$', '{"pastry","dubai chocolate"}'),
  ('bussola',          'Bussola Coffee',             'Stare Miasto','ul. Józefa Dietla 27, Kraków',      '$$', '{"specialty coffee","laptop friendly"}'),
  ('wesola-immersive', 'Wesoła Immersive',           'Wesoła',     'ul. Mikołaja Kopernika 17A, Kraków', '$$', '{"cafe","laptop friendly","art center"}'),
  ('massolit',         'Massolit Books & Café',      'Stare Miasto','ul. Felicjanek 4, Kraków',          '$$', '{"cafe","bookstore","laptop friendly"}'),
  ('fitagain',         'Fitagain Coffee & Food',     'Stare Miasto','ul. Szczepańska 7, Kraków',         '$$', '{"cafe","laptop friendly"}'),
  ('urban-coffee',     'Urban Coffee',               'Kazimierz',  'plac Wolnica 12A, Kraków',           '$$', '{"specialty coffee","laptop friendly"}'),
  ('fornir',           'Kawiarnia Fornir',           'Kleparz',    'ul. Długa 12, Kraków',               '$$', '{"cafe","cake"}'),
  ('baqaro',           'Baqaro',                     'Kleparz',    'Stary Kleparz, Rynek Kleparski, Kraków', '$$', '{"aperitivo","wine","cicchetti"}')
on conflict (slug) do nothing;

insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('where-to-work-krakow', 'bruk-cafe', 1),
  ('where-to-work-krakow', 'ilovecoffee', 2),
  ('where-to-work-krakow', 'bussola', 3),
  ('where-to-work-krakow', 'wesola-immersive', 4),
  ('where-to-work-krakow', 'massolit', 5),
  ('where-to-work-krakow', 'fitagain', 6),
  ('where-to-work-krakow', 'urban-coffee', 7),
  ('kleparz-guide', 'bruk-cafe', 1),
  ('kleparz-guide', 'szklarnia', 2),
  ('kleparz-guide', 'fornir', 3),
  ('kleparz-guide', 'bibulka', 4),
  ('kleparz-guide', 'baqaro', 5)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
