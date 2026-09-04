-- Bary koktajlowe z wpisu /cocktail-bars-krakow/, ktorych nie bylo w bazie
-- (Forty Kleparz i Hevre juz sa). Realne, otwarte. Po odpaleniu +
-- /api/refresh-places karty zaciagna zdjecie i ocene Google (place_id po
-- nazwie i adresie; jak zle dopasuje: ?fix=<slug>).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  ('mercy-brown', 'Mercy Brown', 'Stare Miasto', 'ul. Straszewskiego 28, 31-113 Kraków', '$$$',
   '{"cocktails","music bar"}',
   'Evenings, busy at weekends',
   'The marquee cocktail-and-music bar in Krakow, off the Planty at the western edge of the Old Town. Serious drinks and a crowd that came to drink well rather than cheaply. Book at weekends.'),
  ('william-rabbit', 'William Rabbit & Co', 'Kazimierz', 'ul. Bożego Ciała, Kraków', '$$$',
   '{"cocktails","speakeasy"}',
   'Evenings',
   'A proper speakeasy behind hidden doors in Kazimierz, where the bartenders build a drink to your taste rather than a menu. The best drinks-and-secret-room experience in the city.'),
  ('mr-black', 'Mr. Black', 'Stare Miasto', 'ul. Szewska 21/6, 31-009 Kraków', '$$',
   '{"cocktails","speakeasy"}',
   'Evenings, upstairs',
   'A hidden upstairs cocktail room a minute from the Main Square, up several flights off ul. Szewska. Dark, low-lit and quiet when the square below is chaos. Worth the climb.'),
  ('movida', 'Movida Cocktail Bar', 'Stare Miasto', 'ul. Mikołajska 9, 31-027 Kraków', '$$',
   '{"cocktails","classic"}',
   'Evenings',
   'A long-running classic on ul. Mikołajska just off the Small Market Square, making the standards properly without theatre. The reliable Old Town pick for a well-made drink.')
on conflict (slug) do nothing;
