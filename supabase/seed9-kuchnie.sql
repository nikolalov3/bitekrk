-- 30 lokali z 5 przewodnikow kuchennych (Italian, Ramen/Japanese, Georgian,
-- Vietnamese, Indian). Odpal w SQL Editorze, potem sync /api/refresh-places
-- (endpoint sam znajdzie wizytowki po nazwie i adresie; ?audit=1 sprawdza dopasowanie).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  -- Italian
  ('nolio',              'Nolio',                  'Kazimierz',    'ul. Krakowska 27, 31-062 Kraków',              '$$',  '{"italian","neapolitan pizza","wood-fired"}',            'Tue-Sun, dinner focused', 'The pizzeria credited with starting Krakow''s Neapolitan wave; eight-hour dough blistered in a wood oven.'),
  ('npizza',             'N''Pizza',               'Stare Miasto', 'ul. Rajska 3, 31-124 Kraków',                  '$',   '{"italian","neapolitan pizza","tytano","best value"}',   'Lunch and dinner',       'Top-tier Neapolitan pizza at the best value in town, inside the Tytano courtyard.'),
  ('trattoria-soprano',  'Trattoria Soprano',      'Stare Miasto', 'ul. Świętej Anny 7, 31-008 Kraków',            '$$',  '{"italian","homemade pasta","off the rynek"}',           'Lunch and dinner',       'Rustic trattoria two minutes from the Main Square with a wood oven and homemade pasta.'),
  ('la-campana',         'Trattoria La Campana',   'Stare Miasto', 'ul. Kanonicza 7, 31-002 Kraków',               '$$$', '{"italian","garden","truffle","special occasion"}',      'Lunch and dinner',       'Truffle pasta under an ivy garden on Kanonicza, the prettiest street in the Old Town.'),
  ('corleone',           'Restauracja Corleone',   'Stare Miasto', 'ul. Poselska 19, 31-002 Kraków',               '$$',  '{"italian","late night","traditional"}',                 'Daily 12:00-24:00',      'Traditional Italian just off the Main Square with a kitchen open to midnight daily.'),
  ('aqua-e-vino',        'Aqua e Vino',            'Stare Miasto', 'ul. Wiślna 5/10, 31-007 Kraków',               '$$$', '{"italian","seafood","fine dining"}',                    'Lunch and dinner',       'The fine-dining Italian in the center, Veneto seafood cooking Italian-run since 2005.'),
  -- Ramen / Japanese
  ('akita-ramen',        'Akita Ramen',            'Kazimierz',    'ul. Węgłowa 4, 31-063 Kraków',                 '$$',  '{"japanese","ramen","tonkotsu"}',                        'Tue-Sun, closed Mon',    'Ranked the city''s best ramen by Krakow''s official guide; a thick, collagen-rich tonkotsu.'),
  ('kinki-ramen',        'Kinki Ramen',            'Stare Miasto', 'ul. Marszałka Józefa Piłsudskiego 1, 31-110 Kraków', '$$', '{"japanese","ramen","in-house noodles"}',           'Daily',                  'The best central all-round ramen bar, in-house noodles and both paitan and shoyu broths.'),
  ('ramen-people',       'Ramen People',           'Stare Miasto', 'ul. Karmelicka 22, 31-128 Kraków',             '$$',  '{"japanese","ramen","fresh noodles"}',                   'Tue-Sun, closed Mon',    'The most-reviewed Japanese kitchen in the city, split between light assari and rich kotteri broths.'),
  ('hana-sushi',         'Hana Sushi',             'Kazimierz',    'ul. Kupa 12, 31-057 Kraków',                   '$$$', '{"japanese","sushi","michelin listed"}',                 'Lunch and dinner',       'The traditional sushi benchmark, in the Michelin Guide selection with a Tokyo-trained chef.'),
  ('youmiko-sushi',      'Youmiko Sushi',          'Kazimierz',    'ul. Józefa 2, 30-056 Kraków',                  '$$$', '{"japanese","sushi","omakase","vegan"}',                 'Evenings, booking advised','The most creative sushi in Krakow, omakase with no frozen fish and the best vegan sushi.'),
  ('nami-beef-reef',     'Nami Beef and Reef',     'Stare Miasto', 'ul. Stolarska 13, 31-043 Kraków',              '$$$', '{"japanese","robata","izakaya","michelin listed"}',      'Lunch and dinner',       'Upscale robata grill with wagyu and sake, also in the Michelin Guide selection.'),
  -- Georgian
  ('tbilisuri',          'Tbilisuri',              'Kazimierz',    'ul. Beera Meiselsa 5, 31-058 Kraków',          '$$',  '{"georgian","khachapuri","summer garden"}',              'Tue-Sun, closed Mon',    'Widely called the best Georgian in Krakow; Georgian chef, wine straight from Georgia.'),
  ('chinkalnia',         'Chinkalnia',             'Kazimierz',    'ul. Mostowa 14, 31-061 Kraków',                '$$',  '{"georgian","khinkali","riverside terrace"}',            'Daily',                  'A dedicated khinkali house with a terrace over the Vistula by the Bernatek footbridge.'),
  ('nesis-home-kitchen', 'Nesi''s Home Kitchen',   'Kazimierz',    'ul. Świętego Wawrzyńca 3, 31-060 Kraków',      '$$',  '{"georgian","home style","top rated"}',                  'Tue-Sun, closed Mon',    'A tiny home-style Georgian kitchen, one of the highest-rated despite being one of the newest.'),
  ('smaki-gruzji',       'Smaki Gruzji',           'Kazimierz',    'ul. Józefa Dietla 33, 31-054 Kraków',          '$',   '{"georgian","wine bar","good value"}',                   'Daily',                  'A Georgian kitchen and wine bar for tasting Saperavi and amber wines by the glass.'),
  ('gruzinskie-chaczapuri','Gruzińskie Chaczapuri','Stare Miasto', 'ul. Grodzka 3, 31-006 Kraków',                 '$$',  '{"georgian","central","walk-in"}',                       'Daily 12:00-22:00',      'The most central and longest-running Georgian on the Royal Route, steps from the Rynek.'),
  ('nasze-tbilisi',      'Nasze Tbilisi',          'Kazimierz',    'ul. Starowiślna 49, 31-038 Kraków',            '$',   '{"georgian","bakery","house-made cheese"}',              'Morning-evening, closed Sat','The only Georgian kitchen in Krakow making its own sulguni and imeruli cheese.'),
  -- Vietnamese
  ('pho-ever',           'Pho Ever',               'Kazimierz',    'ul. Dajwór 25c, 31-052 Kraków',                '$$',  '{"vietnamese","pho","handmade noodles"}',                'Daily 11:30-21:30',      'The pho benchmark, a sixteen-hour beef-bone broth with handmade noodles.'),
  ('bonjour-pho',        'Bonjour Pho',            'Stare Miasto', 'ul. Krupnicza 12, 31-123 Kraków',              '$$',  '{"vietnamese","pho","central"}',                         'Daily from 12:00',       'The best-known polished pho house, most convenient authentic bowl in the center.'),
  ('wietnam',            'Wietnam',                'Podgórze',     'ul. Kazimierza Brodzińskiego 2, 30-506 Kraków','$$',  '{"vietnamese","family run","home style"}',               'Lunch and dinner',       'Family-run with the mother as head chef, one of the first and most home-style Vietnamese kitchens.'),
  ('yum-yum-vietnam',    'Yum Yum Viet Nam',       'Kazimierz',    'ul. Józefa 20, 31-056 Kraków',                 '$$',  '{"vietnamese","tableside pho","vegan options"}',         'Daily',                  'Pho tai poured tableside over rare beef on the main Kazimierz restaurant street.'),
  ('banh-mi-dzien-dobry','Banh Mi Dzień Dobry',    'Krowodrza',    'ul. Mazowiecka 26B, 30-019 Kraków',            '$',   '{"vietnamese","banh mi","street food"}',                 'Mon-Fri, closed weekends','A tiny couple-run window doing the best banh mi in the city, under 25 zloty.'),
  ('tre-viet',           'Tre Viet',               'Kleparz',      'ul. Szlak 77, 31-153 Kraków',                  '$',   '{"vietnamese","near station","budget"}',                 'Lunch and dinner',       'The cheapest, most convenient Vietnamese for travelers, a few minutes from the main station.'),
  -- Indian
  ('indian-flame',       'Indian Flame Wielopole', 'Stare Miasto', 'ul. Wielopole 22, 31-072 Kraków',              '$$',  '{"indian","north indian","halal"}',                      'Lunch and dinner',       'The city''s current highest-rated Indian, modern halal North Indian with generous portions.'),
  ('tandoori-flame',     'Tandoori Flame',         'Stare Miasto', 'ul. Zwierzyniecka 10, 31-102 Kraków',          '$$',  '{"indian","tandoor","travellers choice"}',               'Daily 12:00-22:00',      'The consistency pick, a clay-tandoor kitchen with five straight Travellers'' Choice awards.'),
  ('madras-bistro',      'Madras Bistro',          'Podgórze',     'Plac Bohaterów Getta 2, 30-547 Kraków',        '$$',  '{"indian","south indian","dosa"}',                       'Tue-Sun, closed Mon',    'Poland''s oldest South Indian kitchen, a Kerala chef cooking dosa and uttapam.'),
  ('bhajan-cafe',        'Bhajan Cafe',            'Stare Miasto', 'ul. Stradomska 17, 31-068 Kraków',             '$$',  '{"indian","vegetarian","vegan"}',                        'Daily',                  'Fully vegetarian and vegan sattvic Indian, the best plant-based Indian in the city.'),
  ('taste-of-india',     'Taste of India',         'Kazimierz',    'ul. Dietla 46, 31-039 Kraków',                 '$$',  '{"indian","curry row","pick your spice"}',               'Daily 12:00-22:00',      'A Dietla curry-row classic where you set your own heat across three spice levels.'),
  ('zayka',              'Zayka',                  'Kazimierz',    'ul. Dietla 50/1, 31-039 Kraków',               '$',   '{"indian","halal","budget"}',                            'Daily 13:00-22:00',      'Fully halal, over ten years old, the best-value Indian in the city on curry row.')
on conflict (slug) do nothing;

-- Mapowania artykul -> lokal (pod przyszle strony per lokal: "featured in")
insert into article_venues (article_slug, venue_id, position)
select a.slug_art, v.id, a.pos
from (values
  ('italian-krakow','nolio',1),('italian-krakow','npizza',2),('italian-krakow','trattoria-soprano',3),('italian-krakow','la-campana',4),('italian-krakow','corleone',5),('italian-krakow','aqua-e-vino',6),
  ('ramen-krakow','akita-ramen',1),('ramen-krakow','kinki-ramen',2),('ramen-krakow','ramen-people',3),('ramen-krakow','hana-sushi',4),('ramen-krakow','youmiko-sushi',5),('ramen-krakow','nami-beef-reef',6),
  ('georgian-krakow','tbilisuri',1),('georgian-krakow','chinkalnia',2),('georgian-krakow','nesis-home-kitchen',3),('georgian-krakow','smaki-gruzji',4),('georgian-krakow','gruzinskie-chaczapuri',5),('georgian-krakow','nasze-tbilisi',6),
  ('vietnamese-krakow','pho-ever',1),('vietnamese-krakow','bonjour-pho',2),('vietnamese-krakow','wietnam',3),('vietnamese-krakow','yum-yum-vietnam',4),('vietnamese-krakow','banh-mi-dzien-dobry',5),('vietnamese-krakow','tre-viet',6),
  ('indian-krakow','indian-flame',1),('indian-krakow','tandoori-flame',2),('indian-krakow','madras-bistro',3),('indian-krakow','bhajan-cafe',4),('indian-krakow','taste-of-india',5),('indian-krakow','zayka',6)
) as a(slug_art, slug_venue, pos)
join venues v on v.slug = a.slug_venue
on conflict do nothing;
