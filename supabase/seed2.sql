-- Lokale z artykułów opublikowanych 2026-08-09:
-- kazimierz-guide, ice-cream-krakow, coffee-near-krakow-main-station, breakfast-krakow.
-- Odpal w SQL Editorze PO seed.sql, potem sync /api/refresh-places.

insert into venues (slug, name, district, address, price_range, tags) values
  ('hevre',            'Hevre',                          'Kazimierz',   'ul. Beera Meiselsa 18, 31-058 Kraków', '$$', '{"cafe-bar","breakfast","historic interior"}'),
  ('mleczarnia',       'Mleczarnia',                     'Kazimierz',   'ul. Beera Meiselsa 20, Kraków',        '$',  '{"cafe","garden","cheesecake"}'),
  ('cheder',           'Cheder',                         'Kazimierz',   'ul. Józefa 36, Kraków',                '$',  '{"cafe","finjan coffee","culture"}'),
  ('kolanko-no6',      'Kolanko No 6',                   'Kazimierz',   'ul. Józefa 17, Kraków',                '$$', '{"breakfast buffet","crepes","garden"}'),
  ('cytat-cafe',       'Cytat Cafe',                     'Kazimierz',   'ul. Miodowa 23/1, Kraków',             '$',  '{"cafe","books","breakfast"}'),
  ('lody-starowislna', 'Lody na Starowiślnej (Pracownia Stanisław Sarga)', 'Grzegórzki', 'ul. Starowiślna 83, Kraków', '$', '{"ice cream","family-run","since 1985"}'),
  ('bracia-hodurek',   'Lody Tradycyjne Bracia Hodurek', 'Stare Miasto','ul. Zwierzyniecka 3, Kraków',          '$',  '{"ice cream","family-run","vegan"}'),
  ('lody-u-marysi',    'Lody U Marysi',                  'Piasek',      'ul. Karmelicka 43, Kraków',            '$',  '{"ice cream","family-run","since 1990"}'),
  ('lodowa-huta',      'Lodowa Huta',                    'Nowa Huta',   'os. Centrum C 9, Kraków',              '$',  '{"ice cream","family-run","daily flavors"}'),
  ('lody-mona',        'Lody Włoskie Mona',              'Nowa Huta',   'os. Centrum D, Kraków',                '$',  '{"ice cream","soft serve","one flavor a day"}'),
  ('wesola-cafe',      'Wesoła Cafe',                    'Wesoła',      'ul. Rakowicka 17/4B, Kraków',          '$$', '{"specialty coffee","breakfast","pour-over"}'),
  ('handelek',         'Handelek',                       'Kleparz',     'ul. św. Filipa 16/2, Kraków',          '$',  '{"breakfast","sandwiches","opens 6:30"}'),
  ('blossom',          'Blossom',                        'Wesoła',      'ul. Rakowicka 20, Kraków',             '$$', '{"cafe","breakfast"}'),
  ('charlotte',        'Charlotte',                      'Stare Miasto','plac Szczepański 2, Kraków',           '$',  '{"bakery","breakfast","french"}'),
  ('milkbar-tomasza',  'Milkbar Tomasza',                'Stare Miasto','ul. św. Tomasza 24, Kraków',           '$',  '{"milk bar","breakfast"}'),
  ('osma-rano',        'Ósma Rano',                      'Stare Miasto','ul. Podwale 7, Kraków',                '$$', '{"breakfast","bakery bread"}'),
  ('ranny-ptaszek',    'Ranny Ptaszek',                  'Kazimierz',   'ul. Augustiańska 5, Kraków',           '$$', '{"breakfast","vegetarian","garden"}')
on conflict (slug) do nothing;

insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('kazimierz-guide', 'urban-coffee', 1),
  ('kazimierz-guide', 'hevre', 2),
  ('kazimierz-guide', 'mleczarnia', 3),
  ('kazimierz-guide', 'cheder', 4),
  ('kazimierz-guide', 'kolanko-no6', 5),
  ('kazimierz-guide', 'cytat-cafe', 6),
  ('ice-cream-krakow', 'lody-starowislna', 1),
  ('ice-cream-krakow', 'bracia-hodurek', 2),
  ('ice-cream-krakow', 'lody-u-marysi', 3),
  ('ice-cream-krakow', 'lodowa-huta', 4),
  ('ice-cream-krakow', 'lody-mona', 5),
  ('coffee-near-krakow-main-station', 'bruk-cafe', 1),
  ('coffee-near-krakow-main-station', 'handelek', 2),
  ('coffee-near-krakow-main-station', 'wesola-cafe', 3),
  ('coffee-near-krakow-main-station', 'fornir', 4),
  ('coffee-near-krakow-main-station', 'blossom', 5),
  ('breakfast-krakow', 'handelek', 1),
  ('breakfast-krakow', 'charlotte', 2),
  ('breakfast-krakow', 'bruk-cafe', 3),
  ('breakfast-krakow', 'osma-rano', 4),
  ('breakfast-krakow', 'milkbar-tomasza', 5),
  ('breakfast-krakow', 'ranny-ptaszek', 6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
