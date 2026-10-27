#!/usr/bin/env python3
# FAQPage w JSON-LD = dokladnie widoczne FAQ na stronie (wymog Google: oznaczone tresci musza byc widoczne).
# Buduje mainEntity z <details><summary>…</summary><p>…</p></details> w <section class="faq">.
# Strony z FAQPage bez widocznego FAQ tylko zglasza (do decyzji: dodac FAQ albo usunac schema).
# Uzycie: python3 scripts/sync-faq-schema.py          (podglad)
#         python3 scripts/sync-faq-schema.py --write  (zapis)
import os, re, sys, json, html as H

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
WRITE = '--write' in sys.argv
txt = lambda x: ' '.join(H.unescape(re.sub(r'<[^>]+>', ' ', x)).split()).replace(' ,', ',').replace(' .', '.')

changed, schema_only, same = [], [], 0
for d, _, fs in os.walk(R):
    if 'index.html' not in fs or os.sep + '_' in d: continue
    p = os.path.join(d, 'index.html'); s = open(p, encoding='utf8').read()
    m = re.search(r'(<script type="application/ld\+json">\s*)(\{[^<]*?"@type":\s*"FAQPage"[\s\S]*?)(\s*</script>)', s)
    if not m: continue
    rel = '/' + os.path.relpath(d, R).replace('.', '').strip('/') + '/'
    sec = re.search(r'<section class="faq"[^>]*>([\s\S]*?)</section>', s)
    vis = [(txt(q), txt(a)) for q, a in re.findall(r'<summary>([\s\S]*?)</summary>\s*<p>([\s\S]*?)</p>', sec.group(1))] if sec else []
    if not vis: schema_only.append(rel); continue
    o = json.loads(m.group(2))
    cur = [(q['name'], q['acceptedAnswer']['text']) for q in o.get('mainEntity', [])]
    if cur == vis: same += 1; continue
    o['mainEntity'] = [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in vis]
    new = json.dumps(o, ensure_ascii=False, indent=2).replace('\n', '\n  ')
    changed.append((rel, len(cur), len(vis)))
    if WRITE: open(p, 'w', encoding='utf8').write(s[:m.start(2)] + new + s[m.end(2):])

print(f"zgodne: {same} | {'poprawione' if WRITE else 'do poprawy'}: {len(changed)} | schema bez widocznego FAQ: {len(schema_only)}")
for r, a, b in changed: print(f'  {r}  schema {a} pytan -> widoczne {b}')
for r in schema_only: print('  BEZ WIDOCZNEGO FAQ:', r)
