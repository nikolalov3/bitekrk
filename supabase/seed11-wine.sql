-- Trzy bary winne z wpisu /wine-bars-krakow/, ktorych jeszcze nie bylo w bazie
-- (Moti, Vamos, Smaki Gruzji juz sa). Realne, otwarte. Po odpaleniu +
-- /api/refresh-places karty zaciagna zdjecie i ocene Google (place_id po
-- nazwie i adresie; jak zle dopasuje: ?fix=<slug>).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  ('krako-slow-wines', 'Krakó Slow Wines', 'Zabłocie', 'ul. Lipowa 6F, 30-702 Kraków', '$$',
   '{"natural wine","wine bar","small growers"}',
   'Check hours',
   'The natural wine reference point in Zablocie, focused on small growers from Central and Eastern Europe. A short walk from the Schindler factory and MOCAK, and where Krakow''s wine people drink on their nights off.'),
  ('noto-wine-bar', 'NOTO Wine Bar', 'Kazimierz', 'ul. Beera Meiselsa 14, 31-058 Kraków', '$$',
   '{"wine bar","natural wine"}',
   'Check hours',
   'A wine bar in the heart of Kazimierz with over eighty wines that run from classic bottles to properly natural. The easy central option for a first glass before dinner in the quarter.'),
  ('ciutciut', 'CiutCiut Wine Bar & Wine Shop', 'Kazimierz', 'ul. Krakowska 6, 31-062 Kraków', '$$',
   '{"wine bar","wine shop","natural wine"}',
   'Check hours',
   'A wine bar and bottle shop in one at the southern edge of Kazimierz, with over 250 labels leaning natural and low-intervention. Drink in at close to retail, or take the bottle home.')
on conflict (slug) do nothing;
