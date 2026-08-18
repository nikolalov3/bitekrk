-- COPPA — nowa kawiarnia (specialty coffee + tiramisu), Mazowiecka 60, Krowodrza.
-- Wpis do bazy, zeby karta w /news/coppa-specialty-coffee-opens/ zaciagnela
-- zdjecie i ocene Google. Odpal w SQL Editorze, potem sync /api/refresh-places
-- (endpoint sam znajdzie wizytowke po nazwie i adresie; ?audit=1 sprawdza dopasowanie).

insert into venues (slug, name, district, address, price_range, tags, hours_short, description_en) values
  ('coppa', 'COPPA', 'Krowodrza', 'ul. Mazowiecka 60, 30-019 Kraków', '$$',
   '{"specialty coffee","tiramisu","desserts","open 7 days"}',
   'Mon-Fri 8-17, Sat-Sun 9-17',
   'A specialty coffee cafe on Mazowiecka that specializes in tiramisu. The dessert leads, with a homemade kogel-mogel richness, and the coffee is taken seriously. Open seven days a week.')
on conflict (slug) do nothing;
