-- Cafe Belmont — kawiarnia specialty + matcha bar na Kazimierzu, ul. Berka
-- Joselewicza 12. Robia wlasna matche pod marka Yume Matcha. Wpis do bazy,
-- zeby karta w /matcha-krakow/ (i /ar/matcha-krakow/) zaciagnela zdjecie
-- i ocene Google. Odpal w SQL Editorze, potem sync /api/refresh-places
-- (endpoint sam znajdzie wizytowke po nazwie i adresie; jak zle dopasuje,
--  popraw przez /api/refresh-places?fix=cafe-belmont).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  ('cafe-belmont', 'Café Belmont', 'Kazimierz', 'ul. Berka Joselewicza 12, 31-051 Kraków', '$$',
   '{"matcha","specialty coffee","open 7 days"}',
   'Mon-Sat 10-20, Sun 11-20',
   'A specialty coffee and matcha bar in Kazimierz that whisks its own matcha, sold under the Yume Matcha brand, instead of generic culinary powder. The matcha latte is vivid green and smooth, with seasonal iced versions in summer. A short walk from Galeria Kazimierz and the Hala Targowa market.')
on conflict (slug) do nothing;
