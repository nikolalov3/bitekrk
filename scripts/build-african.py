#!/usr/bin/env python3
# Buduje site/african-food-krakow/index.html: "first look" (bez ocen, nie bylismy jeszcze),
# fakty z Google Places i stron lokali (27.10.2026). Po wizytach: dodac karty z ocenami.
# Uzycie: python3 scripts/build-african.py  (potem apply-related + bust-css + check)
import json, re, html as H, os

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site') + '/'
URL = 'https://bitekrakow.com/african-food-krakow/'
PUB = '2026-10-27'
TITLE = 'African Food in Krakow (2026): Ethiopian Injera, Nigerian Jollof and Where to Eat'
DESC = 'Where to eat African food in Krakow: two Ethiopian restaurants serving on injera, a Nigerian kitchen built around jollof rice, and a shop for ingredients, with hours.'
AUTHOR = {'@type': 'Person', 'name': 'Cezary Musiał', 'url': 'https://bitekrakow.com/about/'}

PLACES = [
 dict(id='geez', name="Ge'ez Ethiopian Restaurant", cuisine=['Ethiopian'], street='ul. Na Zjeździe 11', postal='30-527', area='Podgórze',
      hours='Tue to Thu 15:00 to 22:00, Fri 14:00 to 22:00, Sat 13:00 to 22:00, Sun 13:00 to 21:00, closed Mon',
      rating='4.9', reviews='1,132', web='https://geez-ethiopian-restaurant.eatbu.com/', tel='+48 739 450 770',
      maps="https://maps.google.com/?q=Ge'ez+Ethiopian+Restaurant+Na+Zjeździe+11+Kraków",
      body='''Traditional Ethiopian cooking on Na Zjeździe in Podgórze, a few minutes from Rynek Podgórski. Everything comes
        on injera, the sour, spongy flatbread you tear and use instead of cutlery, with meat dishes and a vegetarian and
        vegan side of the menu. The restaurant also does the Ethiopian coffee ceremony and pours African wines. It is the
        highest rated of the three on Google, with more than a thousand reviews.''',
      hours_src='Hours from Google'),
 dict(id='abyssinia', name='Abyssinia Ethiopian & African Restaurant', cuisine=['Ethiopian', 'African'], street='ul. Stefana Batorego 1', postal='31-135', area='a short walk north-west of the Old Town',
      hours='Tue to Thu 16:00 to 21:00, Fri 16:00 to 22:00, Sat and Sun 15:00 to 22:00, closed Mon',
      rating='4.8', reviews='340', web='https://abyssiniarestobar.pl/', tel='+48 512 540 600',
      maps='https://maps.google.com/?q=Abyssinia+Ethiopian+Restaurant+Batorego+1+Kraków',
      body='''The most detailed menu of the three, and the easiest to plan around: meat dishes such as doro wot, chicken
        slow-cooked with onion, spices and a boiled egg (45 zł), kitfo (60 zł) and shekla tibs on a hot pan (65 zł), and
        sixteen vegan dishes, from misir wot red lentils (40 zł) to shiro chickpea stew (45 zł). Shared platters start at
        50 zł for a one-person vegan combo and 75 zł for a meat combo, and there is Ethiopian coffee from a jebena pot
        (15 zł) and tej, the Ethiopian honey wine (alcoholic, 11%). Groups of eight or more are asked to call ahead.''',
      hours_src="Hours and prices from the restaurant's own website"),
 dict(id='just-jollof', name='Just Jollof & More', cuisine=['Nigerian', 'West African'], street='ul. Krowoderska 46', postal='31-158', area='north of the Old Town',
      hours='Mon to Sat 13:00 to 21:00, Sun 15:00 to 20:00',
      rating='4.6', reviews='799', web='https://www.justjollofpl.com/', tel='+48 577 915 355',
      maps='https://maps.google.com/?q=Just+Jollof+%26+More+Krowoderska+46+Kraków',
      body='''A Nigerian kitchen on Krowoderska, a short walk north of the Old Town, that names itself after the dish to
        order: jollof rice, the tomato and pepper rice cooked across West Africa. Grilled fish and meat platters fill out
        the menu, and it also caters events. It is the only one of the three open on Mondays.''',
      hours_src='Hours from Google'),
]

FAQ = [
 ('Is there Ethiopian food in Krakow?', "Yes, two restaurants: Ge'ez Ethiopian Restaurant on ul. Na Zjeździe 11 in Podgórze and Abyssinia on ul. Stefana Batorego 1, north-west of the Old Town. Both serve their dishes on injera, the Ethiopian flatbread, and both close on Mondays."),
 ('Where can I eat African food in Krakow?', "Ethiopian at Ge'ez in Podgórze and Abyssinia on Batorego, and Nigerian at Just Jollof & More on Krowoderska, whose signature dish is jollof rice."),
 ('Is Ethiopian food good for vegans?', "Very. Abyssinia lists sixteen vegan dishes, including misir wot lentils and shiro chickpea stew, and a vegan combo platter from 50 zł. Ge'ez also has vegetarian and vegan dishes on its menu."),
 ('Which African restaurant in Krakow is open on Mondays?', "Just Jollof & More, from 13:00 to 21:00. Ge'ez and Abyssinia are both closed on Mondays."),
 ('Where can I buy African ingredients in Krakow?', 'Nududu Afro/Asian market on al. 29 Listopada 36 sells African and Asian groceries.'),
]

def ld(o): return '  <script type="application/ld+json">\n  ' + json.dumps(o, ensure_ascii=False, indent=2).replace('\n', '\n  ') + '\n  </script>'
tpl = open(R + 'polish-food-krakow/index.html', encoding='utf8').read()
head = tpl[:tpl.index('  <script type="application/ld+json">')]
head = re.sub(r'<title>[^<]*</title>', f'<title>{H.escape(TITLE, quote=False)}</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{H.escape(DESC)}">', head)
head = head.replace('https://bitekrakow.com/polish-food-krakow/', URL)
head = re.sub(r'\s*<link rel="alternate" hreflang="ar" href="[^"]*">', '', head)
for prop in ['og:title', 'twitter:title']:
    head = re.sub(rf'<meta (property|name)="{prop}" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{prop}" content="{H.escape(TITLE)}">', head)
for prop in ['og:description', 'twitter:description']:
    head = re.sub(rf'<meta (property|name)="{prop}" content="[^"]*">', lambda m: f'<meta {m.group(1)}="{prop}" content="{H.escape(DESC)}">', head)

schema = '\n'.join([
 ld({'@context': 'https://schema.org', '@type': 'Article', 'headline': TITLE, 'description': DESC, 'datePublished': PUB, 'dateModified': PUB, 'inLanguage': 'en',
     'author': AUTHOR, 'publisher': {'@type': 'Organization', 'name': 'BiteKrakow', 'url': 'https://bitekrakow.com'}, 'about': {'@type': 'Thing', 'name': 'African cuisine in Kraków'},
     'mentions': [{'@type': 'Restaurant', 'name': p['name'], 'servesCuisine': p['cuisine'], 'url': p['web'], 'telephone': p['tel'],
                   'address': {'@type': 'PostalAddress', 'streetAddress': p['street'], 'postalCode': p['postal'], 'addressLocality': 'Kraków', 'addressCountry': 'PL'}} for p in PLACES]}),
 ld({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
     {'@type': 'ListItem', 'position': 1, 'name': 'BiteKrakow', 'item': 'https://bitekrakow.com/'},
     {'@type': 'ListItem', 'position': 2, 'name': 'Guides', 'item': 'https://bitekrakow.com/guides/'},
     {'@type': 'ListItem', 'position': 3, 'name': 'African Food in Krakow', 'item': URL}]}),
 ld({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}),
])
header = tpl[tpl.index('<header class="site-header">'):tpl.index('</header>') + 9]
header = re.sub(r'\s*<a class="lang-switch"[^>]*>[^<]*</a>', '', header)

def block(i, p):
    return f'''      <div class="venue-h"><span class="vnum">0{i} · {H.escape(p["cuisine"][0])}</span></div>
      <h2 class="venue-title" id="{p["id"]}">{H.escape(p["name"])}</h2>
      <p>{p["body"]}</p>
      <ul class="first-look">
        <li><strong>Where:</strong> {H.escape(p["street"])}, {H.escape(p["area"])}</li>
        <li><strong>When:</strong> {H.escape(p["hours"])}</li>
        <li><strong>Google rating:</strong> {p["rating"]} from {p["reviews"]} reviews</li>
        <li><strong>Contact:</strong> <a href="{p["web"]}" target="_blank" rel="noopener">website</a> · {p["tel"]} · <a href="{p["maps"]}" target="_blank" rel="noopener">Google Maps</a></li>
      </ul>
      <p class="first-look-src">{p["hours_src"]}, checked 27 October 2026. Not reviewed by us yet.</p>'''

body = f'''<body>

{header}

<article>
  <header class="article-header wrap-narrow">
    <span class="pill">By cuisine</span>
    <h1>African Food in Krakow: Injera, Jollof and Where to Eat Them</h1>
    <p class="meta">By <a href="/about/">Cezary Musiał</a> · Published 27 October 2026 · First look, details checked October 2026 · <a href="/how-we-test/">How we test</a></p>
  </header>

  <div class="article-body wrap">
    <div class="prose">
      <p>
        Krakow's African food scene is small, which is exactly why a list helps: two Ethiopian restaurants that serve
        everything on injera, and a Nigerian kitchen named after its best dish. All three are independent restaurants,
        not chains.
      </p>
      <p>
        This is a first look. The facts below come from the restaurants' own websites and their Google listings, checked
        on 27 October 2026. We have not eaten at them for this guide yet, so there are no scores; we will visit, order and
        score them like every other place on this site, and update this page.
      </p>

      <div class="callout">
        <div class="label">The short version</div>
        <p class="thesis">Ethiopian for a shared platter, Nigerian for jollof, and none of them on a Monday except Just Jollof.</p>
        <p>Ge'ez in Podgórze has the strongest Google reputation. Abyssinia on Batorego has the clearest menu and sixteen vegan dishes. Just Jollof & More on Krowoderska is the West African option and opens every day.</p>
      </div>

      <h2 class="deco">How to order Ethiopian food</h2>
      <p>
        Ethiopian dishes arrive together on one large round of <strong>injera</strong>, a sour, spongy flatbread, with more
        rolled up on the side. You tear a piece and use it to pick up the food, traditionally with your right hand.
        <strong>Wot</strong> means stew: doro wot is chicken, misir wot red lentils. <strong>Tibs</strong> is meat sautéed
        or seared, <strong>kitfo</strong> is minced beef with spiced butter, and <strong>shiro</strong> is a smooth
        chickpea stew. Because many Ethiopians keep fasting days without animal products, the vegan side of the menu is
        large and properly cooked, not an afterthought. Order a combination platter to try several dishes at once.
      </p>

      <h2 class="deco">Three places to eat</h2>
{chr(10).join(block(i, p) for i, p in enumerate(PLACES, 1))}

      <h2 class="deco">Jollof, plantain and the rest of West Africa</h2>
      <p>
        <strong>Jollof rice</strong> is rice cooked in a tomato, pepper and onion base until it soaks up the colour, eaten
        across West Africa and the subject of a long, friendly argument about whose version is best. It usually comes
        with grilled or fried meat or fish and fried plantain. If you have never tried it, a jollof plate with grilled
        chicken is the place to start.
      </p>

      <h2 class="deco">Cooking at home</h2>
      <p>
        For ingredients, <strong>Nududu Afro/Asian market</strong> on al. 29 Listopada 36 sells African and Asian groceries.
        If you are after more spice and shared plates, our guides to <a href="/indian-krakow/">Indian</a>,
        <a href="/georgian-krakow/">Georgian</a> and <a href="/kebab-krakow/">Middle Eastern</a> food in Krakow cover the
        kitchens next door.
      </p>

      <section class="faq">
        <h2 class="deco">Questions people actually ask</h2>
{chr(10).join(f"""        <details>
          <summary>{H.escape(q, quote=False)}</summary>
          <p>{H.escape(a, quote=False)}</p>
        </details>""" for q, a in FAQ)}
      </section>
    </div>
  </div>
</article>

'''
foot = tpl[tpl.index('<footer class="site-footer"'):]
foot = re.sub(r'<script src="/venue-cards\.js[^"]*" defer></script>\n', '', foot)
os.makedirs(R + 'african-food-krakow', exist_ok=True)
open(R + 'african-food-krakow/index.html', 'w', encoding='utf8').write(head + schema + '\n</head>\n' + body + foot)
print('ok', len(PLACES), 'lokale')
