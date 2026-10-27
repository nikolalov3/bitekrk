#!/usr/bin/env python3
# Buduje site/nightlife-krakow/index.html: nasze ocenione bary (baza) + lokale z Google Places
# (oznaczone "not reviewed yet") + tabela "kto zamyka najpozniej" z plakietkami live.js.
import json, re, html as H, urllib.request as u

R = '/Users/nikola/Desktop/bitekrakow/site/'
S = '/Users/nikola/Desktop/bitekrakow/scripts/data/'
URL = 'https://bitekrakow.com/nightlife-krakow/'
PUB = '2026-10-27'
TITLE = 'Krakow Nightlife Guide (2026): Bars, Clubs and Who Closes Last'
DESC = 'Where to go out in Krakow: cocktail and wine bars we reviewed, the clubs and late bars that stay open until 4, 5 or 8 am, what is open right now, and how to get home.'
AUTHOR = {'@type': 'Person', 'name': 'Cezary Musiał', 'url': 'https://bitekrakow.com/about/'}

cfg = json.load(u.urlopen('https://bitekrakow.com/api/config'))
HDR = {'apikey': cfg['anonKey'], 'Authorization': 'Bearer ' + cfg['anonKey']}
REV = ['mercy-brown', 'mr-black', 'william-rabbit', 'movida', 'ciutciut', 'krako-slow-wines', 'moti-wine-bar', 'hevre', 'stara-zajezdnia', 'drukarnia']
rows = json.load(u.urlopen(u.Request(cfg['url'] + '/rest/v1/venues?select=slug,name,address,district,hours,hours_short,price_range&slug=in.(' + ','.join(REV) + ')', headers=HDR)))
DB = {r['slug']: r for r in rows}
EN_DIST = {'Stare Miasto': 'Old Town'}
for r in rows: r['district'] = EN_DIST.get(r['district'], r['district'])

def periods_db(h):
    out = []
    for p in (h or {}).get('periods', []):
        o, c = p['open'], p.get('close')
        if not c: continue
        om = o['hour'] * 60 + o.get('minute', 0); cm = c['hour'] * 60 + c.get('minute', 0)
        if c['day'] != o['day']: cm += 1440
        out.append([o['day'], om, cm])
    return out

DAYS = {'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6}
def tmin(t):
    t = t.strip().replace(' ', ' ').replace(' ', ' ')
    m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', t)
    hh, mm, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == 'PM' and hh != 12: hh += 12
    if ap == 'AM' and hh == 12: hh = 0
    return hh * 60 + mm
def periods_places(desc):
    out = []
    for line in desc:
        d, rest = line.split(':', 1)
        rest = rest.strip()
        if 'Closed' in rest or not rest: continue
        if 'Open 24 hours' in rest: out.append([DAYS[d], 0, 1440]); continue
        for span in rest.split(','):
            a, b = re.split(r'\s*[–-]\s*', span.strip())
            # "12:00 – 11:00 PM": brak AM/PM przy otwarciu = to samo co zamkniecie albo poludnie
            if not re.search(r'AM|PM', a): a = a + (' PM' if a.startswith('12') else re.search(r'(AM|PM)', b).group(1) if re.search(r'(AM|PM)', b) else '')
            om, cm = tmin(a), tmin(b)
            if cm <= om: cm += 1440
            out.append([DAYS[d], om, cm])
    return out

def close_label(per, wd):
    c = [p[2] for p in per if p[0] == wd]
    if not c: return 'closed'
    m = max(c) % 1440
    return 'midnight' if m == 0 else f'{m // 60}:{m % 60:02d}'
def sort_key(per):
    return max([p[2] for p in per if p[0] in (5, 6)] or [0])

# ---------- nasze ocenione (wartosci z istniejacych przewodnikow) ----------
PICK = {
 'mercy-brown': ('Cocktails', '9.5', 'Whatever the bartender is proud of that night', "The city's marquee cocktail-and-music bar, off the Planty. Serious drinks, a proper crowd, and the highest rated of our cocktail six.", '/cocktail-bars-krakow/', 'The big night out in the Old Town: cocktails built on house ferments, live jazz or a show most weeks, and a crowd that dresses up a little. Book at weekends.'),
 'mr-black': ('Cocktails', '9', 'A classic, done without theatre', 'Up several flights off Szewska, a dark cocktail room a minute from the Main Square that most people walk past. Worth the stairs.', '/cocktail-bars-krakow/', 'A dark room up the stairs off Szewska, a minute from the Main Square, and open until 2:30 on Fridays and Saturdays, which makes it the Old Town cocktail bar for after the others close.'),
 'william-rabbit': ('Cocktails', '9', 'Tell the bartender your taste, let them build it', 'A proper speakeasy behind hidden doors, where the bartenders build to your taste, not a menu. The best secret-room drinks in the city.', '/cocktail-bars-krakow/', 'The Kazimierz speakeasy: find the door, sit at the bar, describe what you like and let them build it. Open until 2:00 at weekends.'),
 'movida': ('Cocktails', '8.5', 'A negroni or an old fashioned', 'A long-running classic on Mikołajska that does the standards properly, without theatre. The reliable Old Town pick.', '/cocktail-bars-krakow/', 'No concept, no hidden door, just the classics made properly on Mikołajska, until 2:00 on Thursdays. The safe bet when a group cannot agree.'),
 'ciutciut': ('Wine', '8.5', 'A by-the-glass flight, then a bottle to take home', 'Wine bar and bottle shop in one, 250 labels leaning natural. Drink in at close to retail, or take the one you liked home.', '/wine-bars-krakow/', 'The Kazimierz wine stop: 250 bottles leaning natural, poured by the glass, and open until 1:00 at weekends.'),
 'krako-slow-wines': ('Wine', '9', 'Whatever is open by the glass that week', "The natural wine reference point in Zablocie, focused on small Central and Eastern European growers. Where the city's wine people actually drink.", '/wine-bars-krakow/', "Across the river in Zabłocie, the room where Krakow's wine people drink. Open until midnight Friday and Saturday, closed Mondays."),
 'moti-wine-bar': ('Wine', '9', "A Polish glass, on the staff's recommendation", 'The best place in the city to drink Polish wine, by the Stary Kleparz market. Small, knowledgeable, and the highest rated wine room in Krakow.', '/wine-bars-krakow/', 'The quiet start to a night in Kleparz, five minutes from the main station: Polish wine by the glass until midnight, every day.'),
 'hevre': ('Late room', '8.5', 'A cocktail under the frescoes', 'Cocktails under the faded frescoes of a former prayer house. You come as much for the room as the drink, and both hold up.', '/kazimierz-guide/', 'A former prayer house on Meiselsa with faded frescoes, busy from breakfast to 1:00 at weekends. The room you show visitors on their first night.'),
 'stara-zajezdnia': ('Beer', '8', 'Tasting set of four house beers + burger', 'The pear wheat is the surprise. The burger is solid. The setting, a beer garden inside a tram depot, is the thing you tell people about.', '/outdoor-cafes-krakow/', 'A brewery in an old tram depot on św. Wawrzyńca, with house beers brewed on site. Good for groups, until midnight at weekends.'),
 'drukarnia': ('Live music', '8', 'A drink upstairs, then the jazz in the basement', 'Reliable bar by the river, the view does heavy lifting, and the jazz in the basement later is the bonus.', '/podgorze-guide/', 'By the river in Podgórze: drinks upstairs with a view of the Vistula, jazz in the basement later, and open until 2:00 at weekends.'),
}

places = {p['name']: p for p in json.load(open(S + 'places-night.json'))}
UNREV = [  # nazwa w Places, wyswietlana, typ, dzielnica, opis faktow (bez ocen, bez werdyktow)
 ('Prozak 2.0', 'Prozak 2.0', 'Club', 'Old Town', 'Long-running club in the cellars on plac Dominikański, the one people mean by "until morning".'),
 ('Singer', 'Singer', 'Bar', 'Kazimierz', 'Candlelit Kazimierz bar with old sewing-machine tables, open into the early morning.'),
 ('Pijalnia Wódki i Piwa', 'Pijalnia Wódki i Piwa (Szewska)', 'Shot bar', 'Old Town', 'The cheap vodka-and-beer chain; this branch on Szewska stays open until 5:00.'),
 ('Alchemia', 'Alchemia', 'Bar and concerts', 'Kazimierz', 'Classic Kazimierz bar on Estery with concerts in the cellar.'),
 ('Harris Piano Jazz Bar', 'Harris Piano Jazz Bar', 'Jazz', 'Old Town', 'Jazz cellar under the Main Square at Rynek Główny 28.'),
 ('Eszeweria', 'Eszeweria', 'Bar', 'Kazimierz', 'Vintage-furnished bar on Józefa with a garden at the back.'),
 ('Jazz Club u Muniaka', 'Jazz Club u Muniaka', 'Jazz', 'Old Town', 'The jazz club founded by saxophonist Janusz Muniak, in a cellar on Floriańska.'),
 ('PIEC Art whisky & cocktail bar', "Piec'Art", 'Whisky and cocktails', 'Old Town', 'Whisky and cocktail cellar on Szewska.'),
 ('Weźże Krafta', 'Weźże Krafta', 'Craft beer', 'Kazimierz', 'Multitap on Dajwór with a long list of Polish craft beer.'),
 ('Multi Qlti Tap Bar | Craft Beer', 'Multi Qlti Tap Bar', 'Craft beer', 'Old Town', 'Craft beer taps on Szewska, a minute from the Main Square.'),
 ('House of Beer', 'House of Beer', 'Craft beer', 'Old Town', 'Beer bar on św. Tomasza with a big bottle and tap list.'),
 ('Mleczarnia', 'Mleczarnia', 'Bar and garden', 'Kazimierz', 'Café by day, bar by night, with a garden across the street on Meiselsa.'),
 ('Pergamin 2.0 Lounge & Skybar', 'Pergamin 2.0 Skybar', 'Rooftop', 'Old Town (west)', 'Lounge bar on the 7th floor at al. Krasińskiego 1.'),
]

# ---------- tabela "kto zamyka najpozniej" ----------
table = []
for s in REV:
    r = DB[s]; per = periods_db(r['hours'])
    table.append({'name': r['name'], 'href': f'/restaurant/{s}/', 'type': PICK[s][0], 'dist': r['district'], 'per': per, 'rev': True, 'rating': None})
for key, name, typ, dist, _ in UNREV:
    p = places[key]; per = periods_places(p['hours'])
    table.append({'name': name, 'href': p['maps'], 'type': typ, 'dist': dist, 'per': per, 'rev': False, 'rating': (p['rating'], p['n'])})
table.sort(key=lambda x: -sort_key(x['per']))

def row(x):
    link = f'<a href="{H.escape(x["href"])}"' + ('' if x['rev'] else ' target="_blank" rel="noopener"') + f'>{H.escape(x["name"])}</a>'
    tag = '<span class="nt-rev">Reviewed</span>' if x['rev'] else '<span class="nt-new">Not reviewed yet</span>'
    return f'''        <tr data-hours='{json.dumps(x["per"])}'>
          <td class="nt-name">{link}<span class="nt-sub">{H.escape(x["type"])} · {H.escape(x["dist"])}</span></td>
          <td class="nt-close">{close_label(x["per"], 5)}</td>
          <td class="nt-close">{close_label(x["per"], 6)}</td>
          <td class="nt-now"><span class="live-slot"></span>{tag}</td>
        </tr>'''

# ---------- karty ocenionych ----------
def card(s):
    r = DB[s]; typ, score, order, verdict, guide, para = PICK[s]
    street = r['address'].split(',')[0]
    q = (r['name'] + ' ' + street + ' Kraków').replace(' ', '+')
    return f'''    <div class="prose">
      <div class="venue-h"><span class="vnum">{H.escape(typ)} · {H.escape(r["district"])}</span></div>
      <h3 class="venue-title">{H.escape(r["name"])}</h3>
      <p>{H.escape(para)}</p>
    </div>

    <section class="venue-card" id="{s}" data-venue-slug="{s}">
      <div class="venue-photo">
        <img src="/api/photo?slug={s}" alt="{H.escape(r["name"])}, {H.escape(street)}, {H.escape(r["district"])}, Krakow" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="venue-body">
        <div class="venue-rating" aria-label="Google rating"></div>
        <div class="venue-meta" data-hours='{json.dumps(periods_db(r["hours"]))}'>
          <span>{H.escape(street)}, {H.escape(r["district"])}</span>
          <span>{H.escape(r["hours_short"] or "")}</span>
          <span>{H.escape(r["price_range"] or "$$")}</span>
          <span class="live-slot"></span>
        </div>
        <div class="menu-pick">
          <div class="score">{score}<small>/10</small></div>
          <div>
            <div class="what">What to order</div>
            <div class="dish">{H.escape(order)}</div>
            <p class="verdict">{H.escape(verdict)}</p>
          </div>
        </div>
        <div class="venue-reviews" hidden></div>
        <div class="venue-actions">
          <a class="btn btn-primary js-maps-link" href="https://maps.google.com/?q={q}" target="_blank" rel="noopener">See on Google Maps</a>
          <a class="btn btn-ghost" href="/restaurant/{s}/">Full profile</a>
          <a class="btn btn-ghost" href="{guide}">More in the guide</a>
        </div>
      </div>
    </section>
'''

GROUPS = [('Cocktail bars', ['mercy-brown', 'mr-black', 'william-rabbit', 'movida']),
          ('Wine bars', ['ciutciut', 'krako-slow-wines', 'moti-wine-bar']),
          ('Beer, live music and late rooms', ['hevre', 'stara-zajezdnia', 'drukarnia'])]
ORDER = [s for _, g in GROUPS for s in g]

def unrev_list(types):
    out = []
    for key, name, typ, dist, what in UNREV:
        if typ not in types: continue
        p = places[key]; per = periods_places(p['hours'])
        out.append(f'''        <li class="wk-row" data-hours='{json.dumps(per)}'>
          <span class="live-slot"></span>
          <span class="wk-name"><a href="{H.escape(p["maps"])}" target="_blank" rel="noopener">{H.escape(name)}</a></span>
          <span class="wk-what">{H.escape(what)}</span>
          <span class="wk-meta">{H.escape(p["addr"].split(",")[0])}, {H.escape(dist)} · Fri {close_label(per, 5)}, Sat {close_label(per, 6)} close · Google {p["rating"]} ({p["n"]:,} reviews)</span>
        </li>''')
    return '\n'.join(out)

FAQ = [
 ('Where is the best area for nightlife in Krakow?', 'Kazimierz, around Plac Nowy, Estery, Józefa and Szeroka, has the densest mix of bars and stays busy latest. The Old Town has the cellar bars, jazz clubs and big clubs within a few streets of the Main Square. For a quieter night, Kleparz by the main station and Zabłocie across the river have the wine bars.'),
 ('What time do bars close in Krakow?', 'There is no fixed closing time. Most cocktail and wine bars close between midnight and 2:00, later on Friday and Saturday. Some bars run much longer: Singer in Kazimierz until 6:00 and Pijalnia Wódki i Piwa on Szewska until 5:00 at weekends, and the club Prozak 2.0 until 8:00, according to their Google listings.'),
 ('Can you buy alcohol at night in Krakow?', 'Not in shops. Since July 2023 shops and petrol stations across Krakow cannot sell alcohol between midnight and 5:30. Bars, pubs and restaurants are not affected. Drinking in the street or in parks is illegal and fined.'),
 ('Is Krakow nightlife safe?', 'Generally yes, with one known trap. The US Embassy in Poland has warned about drink spiking and inflated card bills at some clubs. Ignore street promoters and friendly strangers inviting you to a bar near the Main Square, check prices before you order, and keep your card in sight.'),
 ('How do I get home at night in Krakow?', 'Night trams 62, 64 and 69 and night buses numbered 6xx run through the night, and ride-hailing apps such as Uber and Bolt work across the city. Avoid unmarked taxis waiting outside clubs.'),
 ('What is the best cocktail bar in Krakow?', 'Our top score goes to Mercy Brown, off the Planty on Straszewskiego: house ferments, live music most weeks, open until 1:00 at weekends. For later drinks, Mr. Black on Szewska stays open until 2:30 on Friday and Saturday.'),
 ('Are bars open on Monday in Krakow?', 'Most are, but check first. Mercy Brown and Krakó Slow Wines close on Mondays, while Mr. Black, Movida, William Rabbit, CiutCiut, Moti and Hevre all open every day. The live table on this page shows who is open right now.'),
]

tpl = open(R + 'polish-food-krakow/index.html', encoding='utf8').read()
head = tpl[:tpl.index('  <script type="application/ld+json">')]
head = re.sub(r'<title>[^<]*</title>', f'<title>{H.escape(TITLE)}</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{H.escape(DESC)}">', head)
head = head.replace('https://bitekrakow.com/polish-food-krakow/', URL)
for prop in ['og:title', 'twitter:title']:
    head = re.sub(rf'<meta (property|name)="{prop}" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{prop}" content="{H.escape(TITLE)}">', head)
for prop in ['og:description', 'twitter:description']:
    head = re.sub(rf'<meta (property|name)="{prop}" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{prop}" content="{H.escape(DESC)}">', head)

items = []
for i, s in enumerate(ORDER, 1):
    r = DB[s]; typ, score, order, verdict, *_ = PICK[s]
    items.append({'@type': 'ListItem', 'position': i, 'item': {'@type': 'BarOrPub', 'name': r['name'],
        'address': {'@type': 'PostalAddress', 'streetAddress': r['address'].split(',')[0], 'addressLocality': 'Kraków', 'addressCountry': 'PL'},
        '@id': f'{URL}#{s}', 'url': f'{URL}#{s}',
        'review': {'@type': 'Review', 'reviewRating': {'@type': 'Rating', 'ratingValue': score, 'bestRating': '10', 'worstRating': '1'}, 'author': AUTHOR, 'datePublished': PUB, 'reviewBody': verdict}}})
def ld(o): return '  <script type="application/ld+json">\n  ' + json.dumps(o, ensure_ascii=False, indent=2).replace('\n', '\n  ') + '\n  </script>'
schema = '\n'.join([
 ld({'@context': 'https://schema.org', '@type': 'Article', 'headline': TITLE, 'description': DESC, 'datePublished': PUB, 'dateModified': PUB, 'inLanguage': 'en', 'author': AUTHOR,
     'publisher': {'@type': 'Organization', 'name': 'BiteKrakow', 'url': 'https://bitekrakow.com'}, 'about': {'@type': 'Thing', 'name': 'Nightlife in Kraków'},
     'mainEntity': {'@type': 'ItemList', 'name': 'Krakow bars we reviewed', 'itemListElement': items}}),
 ld({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
     {'@type': 'ListItem', 'position': 1, 'name': 'BiteKrakow', 'item': 'https://bitekrakow.com/'},
     {'@type': 'ListItem', 'position': 2, 'name': 'Guides', 'item': 'https://bitekrakow.com/guides/'},
     {'@type': 'ListItem', 'position': 3, 'name': 'Krakow Nightlife', 'item': URL}]}),
 ld({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}),
])

header = tpl[tpl.index('<header class="site-header">'):tpl.index('</header>') + 9]
body = f'''<body>

{header}

<article>
  <header class="article-header wrap-narrow">
    <span class="pill">Nightlife</span>
    <h1>Krakow Nightlife: Where to Go Out, and Who Is Still Open</h1>
    <p class="meta">By <a href="/about/">Cezary Musiał</a> · Published 27 October 2026 · Hours checked October 2026 · <a href="/how-we-test/">How we test</a></p>
  </header>

  <div class="article-body wrap">
    <div class="prose">
      <p>
        Krakow goes out late and goes out underground. Half the good bars are in brick cellars under
        the Old Town or in the old Jewish quarter of Kazimierz, there is no fixed closing time, and a
        normal Friday ends somewhere between 2:00 and the first tram. The trick is knowing which room
        fits the night you want, and which ones are still open when you want the next one.
      </p>
      <p>
        So this guide does two things. It names the bars we have reviewed, with what to order and our
        score, and it lists every place here with its Friday and Saturday closing time, marked live
        with what is open right now. Places we have not reviewed yet are labelled that way, with facts
        from their Google listings and no verdict.
      </p>

      <div class="callout">
        <div class="label">One good night, in order</div>
        <p class="thesis">A glass of Polish wine at Moti, cocktails at Mercy Brown, Kazimierz after midnight, zapiekanka on Plac Nowy on the way home.</p>
        <p>Start early in Kleparz, walk ten minutes to Mercy Brown off the Planty, then cross to Kazimierz, where Singer and Alchemia are still going long after the cocktail bars close. Endzior on Plac Nowy serves zapiekanka until 2:00.</p>
      </div>
    </div>

    <section class="night-table-wrap" id="who-is-open">
      <div class="prose">
        <h2 class="deco">Who is open now, and who closes last</h2>
        <p>Sorted by weekend closing time. Badges update live with Krakow time. <button type="button" class="stay-chip" data-open-filter="who-is-open" aria-pressed="false">Show only open now (<span data-open-count>0</span>)</button></p>
      </div>
      <div class="night-table-scroll">
      <table class="night-table">
        <thead><tr><th scope="col">Place</th><th scope="col">Fri closes</th><th scope="col">Sat closes</th><th scope="col">Right now</th></tr></thead>
        <tbody>
{chr(10).join(row(x) for x in table)}
        </tbody>
      </table>
      </div>
      <p class="nt-note">Hours from Google, checked 27 October 2026. Reviewed places link to our profile; the others open in Google Maps.</p>
    </section>

    <div class="prose">
      <h2 class="deco">Where to go, by district</h2>
      <p><strong>Kazimierz</strong> is the answer for most nights: Plac Nowy, Estery, Józefa and Szeroka have more bars per street than anywhere else in the city, from Singer and Alchemia to the Hevre prayer house, CiutCiut for wine and William Rabbit's hidden door. It also has the latest food, at the zapiekanka windows on Plac Nowy.</p>
      <p><strong>Old Town</strong> means cellars: jazz under the Main Square at Harris and on Floriańska at u Muniaka, cocktails at Mercy Brown, Mr. Black and Movida, craft beer on Szewska and św. Tomasza, and the late clubs. Floriańska and the streets right off the Square are also where the promoters and stag groups gather, so walk one street further.</p>
      <p><strong>Podgórze and Zabłocie</strong>, across the river, are calmer: Drukarnia on the waterfront with jazz in the basement, and Krakó Slow Wines for natural wine. <strong>Kleparz</strong>, by the main station, is the quiet start: Moti on the market square pours Polish wine until midnight.</p>

      <h2 class="deco">The bars we reviewed</h2>
    </div>
'''
for title, group in GROUPS:
    body += f'    <div class="prose"><h2>{H.escape(title)}</h2></div>\n' + ''.join(card(s) for s in group)

body += f'''
    <div class="prose">
      <h2 class="deco">Clubs, jazz and craft beer: on our list, not reviewed yet</h2>
      <p>These are well known and verified as open, but we have not scored them yet, so there is no verdict here. Addresses, closing times and ratings come from their Google listings.</p>
      <h3>Late bars and clubs</h3>
      <ul class="wk-list">
{unrev_list(['Club', 'Bar', 'Shot bar', 'Bar and concerts', 'Bar and garden'])}
      </ul>
      <h3>Jazz and live music</h3>
      <ul class="wk-list">
{unrev_list(['Jazz', 'Whisky and cocktails'])}
      </ul>
      <h3>Craft beer and a rooftop</h3>
      <ul class="wk-list">
{unrev_list(['Craft beer', 'Rooftop'])}
      </ul>

      <h2 class="deco">Food after midnight</h2>
      <p>The classic is a <a href="/polish-food-krakow/#zapiekanka">zapiekanka</a> from the round hall on Plac Nowy, where Endzior serves until 2:00 every night. The grilled kiełbasa from the blue van by Hala Targowa runs in the evenings, usually Monday to Saturday. More in <a href="/polish-food-krakow/">our Polish food guide</a>.</p>

      <h2 class="deco">The rules, and getting home</h2>
      <p><strong>Shops stop selling alcohol at midnight.</strong> Since July 2023 shops and petrol stations across Krakow cannot sell alcohol from midnight to 5:30. Bars and restaurants are not affected.</p>
      <p><strong>No drinking in the street.</strong> Open alcohol in streets, squares and parks is illegal and fined, Planty included. Smoking is banned inside bars, and you need to be 18 to buy a drink, so carry ID.</p>
      <p><strong>Watch for the club trap.</strong> The US Embassy in Poland has warned about drink spiking and inflated card bills at some clubs. Ignore promoters and friendly strangers inviting you somewhere near the Main Square, ask for prices before you order, and keep your card in sight.</p>
      <p><strong>Getting home.</strong> Night trams 62, 64 and 69 and night buses numbered 6xx run through the night, and Uber and Bolt work across the city. Skip the unmarked taxis waiting outside clubs. Tipping is around ten percent at table service, nothing at the bar.</p>
      <p>Planning around a date? <a href="/events/">Our events calendar</a> shows the food and drink events coming up, with what is on right now.</p>

      <section class="faq">
        <h2 class="deco">Questions people actually ask</h2>
{chr(10).join(f"""        <details>
          <summary>{H.escape(q)}</summary>
          <p>{H.escape(a)}</p>
        </details>""" for q, a in FAQ)}
      </section>
    </div>
  </div>
</article>

'''
foot = tpl[tpl.index('<footer class="site-footer"'):]
foot = foot.replace('<script src="/venue-cards.js', '<script src="/live.js" defer></script>\n<script src="/venue-cards.js')
out = head + schema + '\n</head>\n' + body + foot
import os; os.makedirs(R + 'nightlife-krakow', exist_ok=True)
open(R + 'nightlife-krakow/index.html', 'w', encoding='utf8').write(out)
print('ok; wierszy w tabeli:', len(table), '| kart:', len(ORDER))
for x in table[:8]: print('  ', x['name'], 'Fri', close_label(x['per'], 5), 'Sat', close_label(x['per'], 6))
