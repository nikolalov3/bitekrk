-- Dwa lokale z matchą dodane do wpisu /matcha-krakow/ (i /ar/matcha-krakow/),
-- obok Cafe Belmont. Realne, otwarte, poza listą wykluczeń. Po odpaleniu
-- + /api/refresh-places karty zaciągną zdjęcie i ocenę Google (place_id
-- rozwiązywany po nazwie i adresie; jak źle dopasuje: ?fix=<slug>).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  ('ayko-matcha-bar', 'Ayko Matcha Bar', 'Podgórze', 'ul. Węgierska 12, 30-531 Kraków', '$$',
   '{"matcha","tea"}',
   'Tue 14-19, Wed-Sun 11-18',
   'A dedicated matcha bar in Podgorze from the team behind Boby specialty coffee. Ceremonial grade whisked to order in a small pared-back room built around the drink. Short hours and takeaway-leaning, but the purest matcha in the city.'),
  ('boby-specialty-coffee', 'Boby Specialty Coffee & Matcha', 'Dębniki', 'ul. Konfederacka 27, 30-306 Kraków', '$$',
   '{"specialty coffee","matcha"}',
   'Open daily, check hours',
   'A specialty coffee cafe in Debniki that put matcha in its name and means it. The highest rated matcha spot of the three on Google, a neighborhood favorite that does a serious flat white and an equally serious matcha.')
on conflict (slug) do nothing;
