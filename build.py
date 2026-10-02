#!/usr/bin/env python3
"""Složí zdroje do jedné stránky narovinu.html (pravidla, ceník a obsah zůstávají oddělená jako JSON data)."""
import json, pathlib, re, sys
src = pathlib.Path(__file__).parent / 'src'
def j(name):
    data = json.loads((src / name).read_text(encoding='utf-8'))
    return json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
parts = [
    (src / 'head.html').read_text(encoding='utf-8'),
    (src / 'body.html').read_text(encoding='utf-8'),
    '<script type="application/json" id="nzu-pravidla">' + j('nzu-pravidla.json') + '</script>',
    '<script type="application/json" id="predpoklady">' + j('predpoklady.json') + '</script>',
    '<script type="application/json" id="obsah">' + j('obsah.json') + '</script>',
    '<script>\n' + (src / 'engine.js').read_text(encoding='utf-8') + '\n</script>',
    '<script>\n' + (src / 'ill.js').read_text(encoding='utf-8') + '\n</script>',
    '<script>\n' + (src / 'app.js').read_text(encoding='utf-8') + '\n</script>',
]
out = '\n'.join(parts)
bad = [m.start() for m in re.finditer('[–—]', out)]
if bad:
    for b in bad[:10]:
        print('DASH at', b, repr(out[max(0,b-40):b+40]))
    sys.exit('Nalezeny pomlčky – a —')
pathlib.Path(__file__).parent.joinpath('narovinu.html').write_text(out, encoding='utf-8')
print('narovinu.html', len(out.encode('utf-8')), 'B')
print('Fotky: složka img/ musí ležet vedle stránky (při publikaci se posílá jako soubory).')
