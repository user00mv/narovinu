/* NA ROVINU: aplikace (router, stránky, kalkulačka, konfigurátor, poptávka). */
(function () {
  'use strict';
  var RULES = JSON.parse(document.getElementById('nzu-pravidla').textContent);
  var PRED = JSON.parse(document.getElementById('predpoklady').textContent);
  var OB = JSON.parse(document.getElementById('obsah').textContent);
  var EN = window.NREngine, IL = window.NRIll;

  /* Architektura divizí: první fáze běží na cestách (narovinu.cz/okna), později na subdoménách (okna.narovinu.cz).
     Stránky divizí berou vše z dat divize, takže oddělení znamená změnit tuto konstantu a nasadit stejné šablony. */
  var DIVISION_BASE = 'path';
  function divUrl(d) { return DIVISION_BASE === 'subdomain' ? 'https://' + d.subdomena : 'https://narovinu.cz' + d.cesta; }

  var DIV = {}; OB.divize.forEach(function (d) { DIV[d.key] = d; });
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(x) { return new Intl.NumberFormat('cs-CZ').format(Math.round(x)); }
  function kc(x) { return n(x) + ' Kč'; }
  function kcm(x) { return n(x) + ' Kč / měs.'; }
  function dec(x) { return String(x).replace('.', ','); }

  /* ---------- analytika ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var p = { event: event, route: S.route, ts: Date.now() };
    for (var k in params || {}) p[k] = params[k];
    window.dataLayer.push(p);
  }

  function toast(t) {
    var el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t;
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600);
  }

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('nr-' + k) || 'null'); localStorage.setItem('nr-' + k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- stav ---------- */
  var S = {
    route: 'domu',
    calc: { i: 0, started: false, done: false, helper: null, data: { typ: null, rok: '', podlazi: null, plocha: '', psc: '', obec: '', vytapeni: null, stav: null, domacnost: null, vyber: [], o: {} } },
    last: null,
    lead: { step: 0, sluzby: [], psc: '', obec: '', termin: null, files: [], jmeno: '', telefon: '', email: '', pozn: '', souhlas: false, sent: false, fromCalc: false, payload: null },
    cfg: { plocha: 140, rok: 1975, vytapeni: 'plyn', on: { okna: true, fasada: false, strecha: false, tc: true, fve: false, elektro: false }, hl: null },
    filtr: 'vse', tema: 'vse', proto: true
  };
  var draft = store('calc'); if (draft && draft.data) { S.calc.data = draft.data; }

  /* ---------- drobné komponenty ---------- */
  function go_(route, label, cls, cta) { return '<a href="#' + route + '" data-go="' + route + '"' + (cta ? ' data-cta="' + esc(cta) + '"' : '') + ' class="' + (cls || 'btn btn-primary') + '">' + label + '</a>'; }
  function arrow() { return ' <span class="arr" aria-hidden="true">→</span>'; }
  function lockup(d, lg) {
    return '<span class="lockup' + (lg ? ' lg' : '') + '">' + IL.symbol() + '<span class="t"><b>' + d.nazev + '</b><span><i class="acc" style="background:' + d.akcent + '"></i>NA ROVINU</span></span></span>';
  }
  /* Logo: jediné místo pro výměnu (symbol + slovní značka). */
  function logoMark() { return IL.symbol() + '<b>NA ROVINU</b>'; }
  /* Fotka: v prototypu ilustrační (Pexels), v ostrém provozu fotky realizací z CMS. */
  function photo(f, opt) {
    opt = opt || {};
    return '<img class="ph" src="' + esc(f.src) + '" alt="' + esc(f.alt || '') + '" width="1400" height="933" ' + (opt.eager ? 'fetchpriority="high" ' : 'loading="lazy" ') + 'decoding="async">' + (opt.tag === false ? '' : '<span class="ilu">Ilustrační foto</span>');
  }
  function eyebrow(t, cls) { return '<p class="eyebrow ' + (cls || '') + '">' + t + '</p>'; }
  function placeholder(t) { return '<div class="placeholder">' + t + '</div>'; }

  /* ---------- chrome ---------- */
  var NAV = [['rekonstrukce', 'Řešení pro dům'], ['sluzby', 'Služby'], ['nzu', 'NZÚ a financování'], ['realizace', 'Realizace'], ['o-nas', 'O nás'], ['poradna', 'Poradna'], ['kontakt', 'Kontakt']];
  var MNAV = [['rekonstrukce', 'Řešení domu'], ['nzu-kalkulacka', 'NZÚ kalkulačka'], ['sluzby', 'Naše služby'], ['realizace', 'Realizace'], ['nzu', 'Financování'], ['kontakt', 'Kontakt']];

  function chrome() {
    $('#hdr').innerHTML = '<div class="wrap"><a href="#domu" data-go="domu" class="logo" aria-label="NA ROVINU, úvodní stránka">' + logoMark() + '</a>' +
      '<nav class="nav" aria-label="Hlavní navigace">' + NAV.map(function (x) { return '<a href="#' + x[0] + '" data-go="' + x[0] + '">' + x[1] + '</a>'; }).join('') + '</nav>' +
      go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-dark', 'header') +
      '<button class="burger" type="button" aria-label="Otevřít menu" aria-expanded="false" data-act="menu"><span></span></button></div>';
    $('#mmenu').innerHTML = '<div class="mmenu-top"><a href="#domu" data-go="domu" class="logo">' + logoMark() + '</a><button class="close" type="button" aria-label="Zavřít menu" data-act="menu-close">×</button></div>' +
      '<nav aria-label="Mobilní navigace">' + MNAV.map(function (x) { return '<a href="#' + x[0] + '" data-go="' + x[0] + '">' + x[1] + '<span>→</span></a>'; }).join('') + '</nav>' +
      go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-primary', 'mobilni-menu');
    $('#mcta').innerHTML = go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-primary', 'mobilni-lista');
    var f = OB.firma;
    $('#ftr').innerHTML = '<div class="wrap"><div class="ftr-grid">' +
      '<div style="display:grid;gap:16px;align-content:start"><a href="#domu" data-go="domu" class="logo">' + logoMark() + '</a><p style="margin:0;max-width:32ch">Jeden partner pro celý dům. Od návrhu po realizaci.</p></div>' +
      '<div><h4>Divize</h4><ul>' + OB.divize.map(function (d) { return '<li><a href="#' + d.key + '" data-go="' + d.key + '">' + d.nazev.charAt(0) + d.nazev.slice(1).toLowerCase() + ' na rovinu</a></li>'; }).join('') + '</ul></div>' +
      '<div><h4>Na rovinu</h4><ul><li><a href="#nzu" data-go="nzu">NZÚ</a></li><li><a href="#nzu" data-go="nzu">Financování</a></li><li><a href="#realizace" data-go="realizace">Realizace</a></li><li><a href="#o-nas" data-go="o-nas">O nás</a></li><li><a href="#kontakt" data-go="kontakt">Kontakt</a></li></ul></div>' +
      '<div><h4>Firemní údaje</h4><ul style="font-size:15px"><li>IČO: ' + esc(f.ico) + '</li><li>Sídlo: ' + esc(f.sidlo) + '</li><li><span style="user-select:all">' + esc(f.email) + '</span></li><li><a href="#pravidla-nzu" data-go="pravidla-nzu">Pravidla kalkulačky</a></li></ul></div>' +
      '</div><div class="ftr-bottom"><span>© ' + new Date().getFullYear() + ' NA ROVINU</span><span style="display:flex;gap:20px;flex-wrap:wrap"><a href="#pravni" data-go="pravni">GDPR</a><a href="#pravni" data-go="pravni">Cookies</a><a href="#pravni" data-go="pravni">Obchodní podmínky</a></span></div></div>';
  }

  function setActiveNav() {
    var r = S.route, top = r;
    if (DIV[r.split('-')[0]] && r.split('-')[0] !== r) top = 'sluzby';
    if (DIV[r]) top = 'sluzby';
    if (r.indexOf('realizace-') === 0) top = 'realizace';
    if (r.indexOf('poradna-') === 0) top = 'poradna';
    if (r === 'nzu-kalkulacka' || r === 'plan' || r === 'pravidla-nzu') top = 'nzu';
    if (r === 'konfigurator') top = 'rekonstrukce';
    $$('.nav a').forEach(function (a) { if (a.dataset.go === top) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  /* ---------- router ---------- */
  function parse() { var h = (location.hash || '').replace(/^#/, ''); return h || 'domu'; }
  function go(r, opts) {
    opts = opts || {};
    var prev = S.route;
    if (prev === 'nzu-kalkulacka' && r !== 'nzu-kalkulacka' && S.calc.started && !S.calc.done) track('calc_abandon', { otazka: currentQ() ? currentQ().key : null });
    var pd = divOf(prev), nd = divOf(r);
    if (pd && nd && pd !== nd) track('division_switch', { z: pd, na: nd });
    S.route = r;
    try { if (location.hash.slice(1) !== r) history.pushState(null, '', '#' + r); } catch (e) { /* sandbox */ }
    render();
    if (!opts.keep) window.scrollTo(0, 0);
  }
  function divOf(r) { if (!r) return null; var k = r.split('-')[0]; return DIV[k] ? k : null; }
  window.addEventListener('popstate', function () { S.route = parse(); render(); });
  window.addEventListener('hashchange', function () { var r = parse(); if (r !== S.route) { S.route = r; render(); window.scrollTo(0, 0); } });

  function resolve(r) {
    var map = { domu: vHome, sluzby: vSluzby, rekonstrukce: vRekonstrukce, nzu: vNzu, 'nzu-kalkulacka': vCalc, konfigurator: vKonfig, realizace: vRealizace, 'o-nas': vONas, poradna: vPoradna, kontakt: vKontakt, plan: vPlan, 'pravidla-nzu': vPravidla, pravni: vPravni };
    if (map[r]) return function () { return map[r](); };
    if (DIV[r]) return function () { return vDivize(DIV[r]); };
    var k = r.split('-')[0];
    if (DIV[k]) { var slug = r.slice(k.length + 1), d = DIV[k]; var ob = d.oblasti.concat(d.dalsi).filter(function (x) { return x.slug === slug; })[0]; if (ob) return function () { return vOblast(d, ob); }; }
    if (r.indexOf('realizace-') === 0) { var p = OB.realizace.filter(function (x) { return x.id === r.slice(10); })[0]; if (p) return function () { return vProjekt(p); }; }
    if (r.indexOf('poradna-') === 0) { var a = OB.poradna.filter(function (x) { return x.slug === r.slice(8); })[0]; if (a) return function () { return vClanek(a); }; }
    return function () { return v404(); };
  }

  function render() {
    var html = resolve(S.route)();
    var v = $('#view');
    v.innerHTML = '<div class="view">' + html + '</div>';
    setActiveNav();
    document.body.classList.toggle('no-mcta', S.route === 'nzu-kalkulacka' || S.route === 'kontakt');
    after();
  }

  /* ---------- HOMEPAGE ---------- */
  var ICONS = {"kontakt": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6\"/></svg>", "rozpocet": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M8 8h8M8 12h8M8 16h5\"/></svg>", "odpovednost": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\"/></svg>"};
  function vHome() {
    var hero = '<section class="hero"><div class="gridbg" aria-hidden="true"><i class="b1"></i><i class="b2"></i></div><div class="wrap hero-in">' +
      '<div class="hero-copy"><span class="hero-badge"><span style="width:7px;height:7px;border-radius:50%;background:var(--red)"></span>Okna<span class="dot"></span>Stavby<span class="dot"></span>Teplo<span class="dot"></span>Energie<span class="dot"></span>Elektro</span>' +
      '<h1 class="display">Váš dům.<br><span class="ac">Na rovinu.</span></h1>' +
      '<p class="lead">Od oken a rekonstrukce až po vytápění, elektro a energie. Jeden partner pro celý dům.</p>' +
      '<div class="btns">' + go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-primary', 'hero') + go_('sluzby', 'Prohlédnout služby', 'btn btn-ghost', 'hero-sluzby') + '</div>' +
      '<div class="hero-meta"><div class="m"><b>1 kontakt</b>za celý projekt</div><div class="m"><b>5 divizí</b>od oken po elektro</div><div class="m"><b>2 mil. Kč</b>bezúročný úvěr NZÚ</div><div class="m"><b>Nezávazně</b>první konzultace</div></div></div>' +
      '<div class="ba" role="group" aria-label="Stejný dům před rekonstrukcí a po ní">' +
      '<figure class="ba-card old">' + photo(OB.hero.pred, { eager: true }) + '<figcaption class="cap old">Před</figcaption></figure>' +
      '<span class="ba-arrow" aria-hidden="true"><b class="h">→</b><b class="v">↓</b></span>' +
      '<figure class="ba-card">' + photo(OB.hero.po, { eager: true }) + '<figcaption class="cap">Po rekonstrukci</figcaption></figure></div>' +
      '</div></section>';

    var stats = '<section class="stats"><div class="wrap stats-grid">' +
      '<div class="stat"><div class="n">750 000<span class="u">Kč</span></div><span>bezúročný úvěr NZÚ na dílčí opatření</span></div>' +
      '<div class="stat"><div class="n">2 mil.<span class="u">Kč</span></div><span>na komplexní renovaci celého domu</span></div>' +
      '<div class="stat"><div class="n">25<span class="u">let</span></div><span>bez úroků u vybraných komplexních renovací</span></div>' +
      '<div class="stat"><div class="n">1<span class="u">firma</span></div><span>od projektu po servis celého domu</span></div></div></section>';

    var why = [['01', 'kontakt', 'Jeden kontakt', 'Jeden projektový manažer od první prohlídky po servis. Pět firem koordinovat nemusíte.'],
      ['02', 'rozpocet', 'Jeden rozpočet', 'Stavba, okna, teplo, energie i elektro v jedné nabídce, včetně NZÚ a financování.'],
      ['03', 'odpovednost', 'Jedna odpovědnost', 'Za výsledek celého domu odpovídá jedna firma a jeden stavbyvedoucí.']];
    var partner = '<section class="sec"><div class="wrap"><div class="sec-head split"><div class="t">' + eyebrow('Proč NA ROVINU') + '<h2 class="h2">Jeden dům.<br>Jedna odpovědnost.</h2></div>' +
      '<p class="right">Místo několika dodavatelů propojujeme stavbu, okna, vytápění, elektro, energetiku, financování a administrativu do jednoho projektu.</p></div>' +
      '<div class="why">' + why.map(function (w) { return '<div class="wcard"><span class="no">' + w[0] + '</span><span class="ic">' + ICONS[w[1]] + '</span><h3 class="h3">' + w[2] + '</h3><p>' + w[3] + '</p></div>'; }).join('') + '</div></div></section>';

    var divs = '<section class="sec surface"><div class="wrap"><div class="sec-head split"><div class="t">' + eyebrow('Pět divizí, jedna značka') + '<h2 class="h2">Co řešíme</h2></div><p class="right">Nemusíte vědět, kterou divizi potřebujete. Řekněte nám, co chcete s domem udělat, a rozdělíme to sami.</p></div>' + divBlocks() + '</div></section>';

    var nzu = '<section class="sec"><div class="wrap nzu-grid"><div style="display:grid;gap:22px">' +
      eyebrow('NZÚ a financování', 'nzu') + '<h2 class="h2">Zjistěte, co můžete využít.</h2>' +
      '<p class="lead">Spočítáme orientační podporu, financování a vhodná opatření podle parametrů vašeho domu.</p>' +
      '<div class="nzu-fact"><b>2 000 000 Kč</b><span>bezúročný úvěr NZÚ na komplexní renovaci domu. Stát platí úroky, vy splácíte jen jistinu.</span></div>' +
      '<div class="btns">' + go_('nzu-kalkulacka', 'Spustit NZÚ kalkulačku' + arrow(), 'btn btn-nzu', 'home-nzu') + go_('konfigurator', 'Sestavit dům v konfigurátoru →', 'link', 'home-konfigurator') + '</div></div>' +
      '<div>' + sampleDash() + '</div></div></section>';

    var proc = '<section class="sec surface"><div class="wrap"><div class="sec-head split"><div class="t">' + eyebrow('Proces') + '<h2 class="h2">Jak pracujeme</h2></div><p class="right">Osm kroků od první prohlídky po servis. Každý krok má výstup, který dostanete do ruky.</p></div>' + processList() + '</div></section>';

    var real = '<section class="sec"><div class="wrap"><div class="sec-head split"><div class="t">' + eyebrow('Realizace') + '<h2 class="h2">Domy, které už jsou na rovinu.</h2></div><p class="right">' + go_('realizace', 'Všechny realizace →', 'link', 'home-realizace') + '</p></div>' +
      '<div class="projects p3">' + OB.realizace.slice(0, 3).map(projCard).join('') + '</div></div></section>';

    return hero + stats + partner + divs + nzu + proc + real + finalCta();
  }

  function mergeSvg() {
    var items = ['Stavba', 'Okna', 'Vytápění', 'Elektro', 'Energetika', 'Financování', 'Administrativa'];
    var h = 44, top = 20, H = top * 2 + h * (items.length - 1);
    var s = '<svg viewBox="0 0 560 ' + H + '" class="merge" role="img" aria-label="Sedm samostatných oblastí se spojuje do jednoho projektu">';
    var hubY = H / 2;
    items.forEach(function (t, i) {
      var y = top + i * h;
      s += '<text x="0" y="' + (y + 5) + '">' + t + '</text><circle cx="150" cy="' + y + '" r="4" class="dot"/>';
      s += '<path d="M154 ' + y + ' C 260 ' + y + ', 300 ' + hubY + ', 380 ' + hubY + '" class="ln"/>';
    });
    s += '<line x1="380" y1="' + hubY + '" x2="430" y2="' + hubY + '" class="ln-r"/><rect x="424" y="' + (hubY - 9) + '" width="18" height="18" class="hub" transform="skewX(-20)" style="transform-origin:433px ' + hubY + 'px"/>';
    s += '<text x="458" y="' + (hubY - 4) + '" class="end">Jeden</text><text x="458" y="' + (hubY + 16) + '" class="end">projekt</text>';
    return s + '</svg>';
  }

  function divBlocks() {
    return '<div class="divs">' + OB.divize.map(function (d) {
      return '<a class="div-block" href="#' + d.key + '" data-go="' + d.key + '" data-cta="divize-' + d.key + '">' +
        '<div class="div-ill">' + photo(d.foto) + '</div>' +
        '<div class="div-body">' + lockup(d) + '<h3 class="h2" style="font-size:clamp(24px,2.8vw,36px)">' + d.headline + '</h3><p>' + d.veta + '</p>' +
        '<ul class="div-areas">' + d.oblasti.map(function (o) { return '<li>' + o.nazev + '</li>'; }).join('') + '</ul>' +
        '<span class="more">' + d.cta + ' →</span></div></a>';
    }).join('') + '</div>';
  }

  function sampleDash() {
    var inp = { typ: 'rd', rok: 1978, podlazi: 'p2', plocha: 150, vytapeni: 'plyn', stav: 'puvodni', domacnost: 'bezna', opatreni: { fasada: {}, strecha: {}, okna: { material: 'plast' }, tc: { typ: 'vzduch-voda', tuv: true } } };
    var r = EN.calc(inp, RULES, PRED);
    return dash(r, { title: 'Ukázkový výpočet', sub: 'Dům z roku 1978, 150 m², plyn. Fasáda, střecha, okna a tepelné čerpadlo.', compact: true });
  }

  function processList(light) {
    return '<ol class="process' + (light ? ' light' : '') + '">' + OB.proces.map(function (p) { return '<li><div><b>' + p.nazev + '</b><p>' + p.text + '</p></div></li>'; }).join('') + '</ol>';
  }

  function finalCta() {
    return '<section class="cta"><div class="wrap cta-in"><div style="display:grid;gap:16px"><p class="eyebrow" style="color:#fff;opacity:.85">Začněte domem</p><h2 class="h1">Nejdřív spočítáme.<br>Potom stavíme.</h2></div>' +
      '<div style="display:grid;gap:22px"><p>Zadejte pár údajů o domě. Uvidíte cenu, financování, splátku i úsporu ještě před první schůzkou.</p>' +
      '<div class="btns">' + go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-white', 'final') + go_('kontakt', 'Nezávazná konzultace', 'btn btn-ghost', 'final-konzultace') + '</div></div></div>' + IL.stripes('', '') + '</section>';
  }

  function projCard(p) {
    return '<a class="proj" href="#realizace-' + p.id + '" data-go="realizace-' + p.id + '"><div class="ill">' + photo(p.foto, { tag: false }) + '<span class="ukazka">Ukázka</span></div>' +
      '<div class="body"><div class="meta"><span>' + esc(p.lokalita) + '</span><span>' + p.typy.map(typLabel).join(' · ') + '</span></div><h3 class="h4" style="font-size:21px">' + esc(p.nazev) + '</h3>' +
      '<div class="facts"><span class="muted">' + esc(p.cas) + '</span><b>' + kc(p.cena) + '</b></div></div></a>';
  }
  function typLabel(k) { var f = OB.filtry.filter(function (x) { return x.key === k; })[0]; return f ? f.nazev : k; }

  /* ---------- finanční dashboard ---------- */
  function dash(r, opt) {
    opt = opt || {};
    var M = '<small> / měs.</small>';
    function mo(x) { return n(x) + ' Kč' + M; }
    var dop = r.uver > 0 ? r.cistyDopad : r.uspora;
    var dopK = r.uver > 0 ? (dop >= 0 ? 'Čistý dopad: ušetříte' : 'Čistý dopad: zaplatíte navíc') : 'Čistý dopad: ušetříte';
    var cells = [
      ['Cena projektu', kc(r.investice), 'orientační odhad', ''],
      [r.light ? 'Možná přímá dotace' : 'Podporované financování', r.light ? kc(r.dotace) : kc(r.uver), r.light ? 'NZÚ Light' : (r.uver ? 'bezúročný úvěr NZÚ, ' + r.doba + ' let' : 'mimo podmínky NZÚ'), 'g'],
      ['Vlastní zdroje', kc(r.vlastni), r.light && r.uver ? 'po dotaci a úvěru ' + kc(r.uver) : 'hotovost nebo běžný úvěr', ''],
      ['Orientační splátka', r.splatka ? mo(r.splatka) : '0 Kč', r.uver ? 'jen jistina, úroky platí stát' : 'bez úvěru NZÚ', ''],
      ['Úspora energie', mo(r.uspora), 'z ' + kcm(r.nakladyPred) + ' na ' + kcm(r.nakladyPo), 'g'],
      [dopK, mo(Math.abs(dop)), r.uver ? 'úspora mínus splátka, po splacení ušetříte ' + kcm(r.uspora) : 'úspora energie', 'total']
    ];
    return '<div class="dash"><div class="dash-head"><div><b>' + esc(opt.title || 'Ekonomika celé akce') + '</b>' + (opt.sub ? '<div class="muted" style="font-size:14px">' + esc(opt.sub) + '</div>' : '') + '</div><span class="tag">Orientační</span></div>' +
      '<div class="dash-grid' + (opt.compact ? '' : ' c3') + '">' + cells.map(function (c) { return '<div class="dash-cell ' + c[3] + '"><span class="k">' + c[0] + '</span><span class="v">' + c[1] + '</span><span class="s">' + c[2] + '</span></div>'; }).join('') + '</div>' +
      '<div class="dash-foot">Předběžná kalkulace podle Závazných pokynů NZÚ platných od 24. 6. 2026 a orientačního ceníku. Výsledek podléhá ověření.</div></div>';
  }

  /* ---------- SLUŽBY a DIVIZE ---------- */
  function vSluzby() {
    return pageHead('Služby', 'Co řešíme', 'Pět divizí pod jednou značkou. Nemusíte vědět, kterou potřebujete. Řekněte nám, co chcete s domem udělat, a rozdělíme to sami.', go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-primary', 'sluzby-head')) +
      '<section class="sec-sm" style="padding-top:0"><div class="wrap">' + divBlocks() + '</div></section>' + finalCta();
  }

  function pageHead(eb, title, lead, actions, crumbs) {
    return '<section class="phead"><div class="gridbg" aria-hidden="true"><i class="b1"></i></div><div class="wrap phead-in">' + (crumbs || '') + eyebrow(eb) + '<h1 class="h1">' + title + '</h1>' + (lead ? '<p class="lead" style="max-width:56ch">' + lead + '</p>' : '') + (actions ? '<div class="btns">' + actions + '</div>' : '') + '</div></section>';
  }

  function nzuRulesFor(codes) {
    var rows = [];
    codes.forEach(function (c) {
      var rr = RULES.pravidla.filter(function (x) { return x.kod === c; })[0]; if (!rr) return;
      var l = RULES.pravidla.filter(function (x) { return x.program === 'NZU-LIGHT' && x.opatreni === rr.opatreni; })[0];
      rows.push('<tr><td class="nm">' + esc(rr.nazev) + '<span class="sub">' + esc(rr.omezeni.slice(0, 2).join(' · ')) + '</span></td><td class="n" data-label="Bezúročný úvěr">' + sazba(rr) + '</td><td class="n" data-label="NZÚ Light dotace">' + (l ? sazba(l) : '<span class="muted">nepodporuje</span>') + '</td></tr>');
    });
    if (!rows.length) return '';
    return '<div class="tbl-wrap"><table class="tbl narrow"><thead><tr><th>Opatření</th><th class="n">Bezúročný úvěr</th><th class="n">NZÚ Light dotace</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function sazba(rr) {
    if (rr.typVypoctu === 'pausal') return 'až ' + kc(rr.maximum);
    var u = { m2: 'm²', kWp: 'kWp', kWh: 'kWh' }[rr.jednotka] || rr.jednotka;
    return kc(rr.jednotkovaPodpora) + ' / ' + u + (rr.maximum ? ', max. ' + kc(rr.maximum) : '');
  }

  function vDivize(d) {
    var crumbs = '<div class="crumbs"><a href="#sluzby" data-go="sluzby">Služby</a><span>/</span>' + d.nazev.charAt(0) + d.nazev.slice(1).toLowerCase() + '</div>';
    var allNzu = []; d.oblasti.concat(d.dalsi).forEach(function (o) { o.nzu.forEach(function (c) { if (allNzu.indexOf(c) < 0) allNzu.push(c); }); });
    var calcPre = d.kalkulace.join(',');
    var head = '<section class="phead" style="box-shadow:inset 0 4px 0 ' + d.akcent + '"><div class="gridbg" aria-hidden="true"><i class="b1"></i></div><div class="wrap hero-in" style="padding-block:clamp(40px,6vw,80px)">' +
      '<div class="hero-copy">' + crumbs + lockup(d, true) + '<h1 class="h1">' + d.headline + '</h1><p class="lead">' + d.veta + '</p>' +
      '<div class="btns"><a href="#nzu-kalkulacka" data-go="nzu-kalkulacka" data-pre="' + calcPre + '" data-cta="divize-spocitat" class="btn btn-primary">Spočítat možnosti' + arrow() + '</a>' + go_('kontakt', 'Nezávazná konzultace', 'btn btn-ghost', 'divize-konzultace') + '</div></div>' +
      '<div class="div-ill" style="aspect-ratio:4/3;min-height:0;margin:0;border:1px solid var(--line);border-radius:var(--radius)">' + photo(d.foto, { eager: true }) + '</div></div></section>';
    var areas = '<section class="sec surface"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('Oblasti') + '<h2 class="h2">' + d.cta + '</h2></div>' +
      '<ul class="rows">' + d.oblasti.concat(d.dalsi).map(function (o) { return '<li><a class="row" href="#' + d.key + '-' + o.slug + '" data-go="' + d.key + '-' + o.slug + '" data-svc="' + o.slug + '"><div><span class="h3">' + o.nazev + '</span><p>' + o.lead + '</p></div><span class="go" aria-hidden="true">→</span></a></li>'; }).join('') + '</ul></div></section>';
    var xs = '<section class="sec-sm"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('Celý dům') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">S čím to v domě souvisí</h2><p class="muted" style="margin:0;max-width:40ch">Doporučujeme jen to, co navazuje technicky. Rozhodnutí je na vás.</p></div>' + xsell(d.souvisi) + '</div></section>';
    var nzuSec = '<section class="sec-sm"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('NZÚ', 'nzu') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Podpora a financování</h2><p class="muted" style="margin:0;max-width:44ch">' + d.nzuText + '</p>' + go_('nzu-kalkulacka', 'Spočítat možnosti' + arrow(), 'link', 'divize-nzu') + '</div>' + (nzuRulesFor(allNzu) || placeholder('Elektroinstalace do NZÚ nespadá. Spočítáme ji jako součást projektu.')) + '</div></section>';
    var proj = OB.realizace.filter(function (p) { return p.typy.some(function (t) { return mapDivTyp(d.key).indexOf(t) >= 0; }); });
    var projSec = proj.length ? '<section class="sec-sm" style="padding-top:0"><div class="wrap"><div class="sec-head">' + eyebrow('Realizace') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">' + d.cta + ' v praxi</h2></div><div class="projects p3">' + proj.slice(0, 3).map(projCard).join('') + '</div></div></section>' : '';
    return head + areas + xs + nzuSec + projSec + finalCta();
  }
  function mapDivTyp(k) { return { okna: ['okna'], stavby: ['rekonstrukce', 'zatepleni', 'novostavby'], teplo: ['tc'], energie: ['fve'], elektro: ['elektro'] }[k] || []; }

  function xsell(list) {
    return '<div class="xsell">' + list.map(function (x) {
      var d = DIV[x.div], o = d.oblasti.concat(d.dalsi).filter(function (y) { return y.slug === x.slug; })[0];
      return '<a href="#' + x.div + '-' + x.slug + '" data-go="' + x.div + '-' + x.slug + '" data-cta="cross-sell"><span class="who">' + d.nazev.charAt(0) + d.nazev.slice(1).toLowerCase() + ' na rovinu: ' + (o ? o.nazev.toLowerCase() : '') + '</span><span class="why">' + x.proc + '</span><span class="go" aria-hidden="true">→</span></a>';
    }).join('') + '</div>';
  }

  function vOblast(d, o) {
    var crumbs = '<div class="crumbs"><a href="#sluzby" data-go="sluzby">Služby</a><span>/</span><a href="#' + d.key + '" data-go="' + d.key + '">' + d.nazev.charAt(0) + d.nazev.slice(1).toLowerCase() + '</a><span>/</span>' + o.nazev + '</div>';
    var pre = o.calc ? '<a href="#nzu-kalkulacka" data-go="nzu-kalkulacka" data-pre="' + o.calc + '" data-cta="oblast-spocitat" class="btn btn-primary">Spočítat možnosti' + arrow() + '</a>' : go_('kontakt', 'Poptat realizaci' + arrow(), 'btn btn-primary', 'oblast-poptat');
    var head = '<section class="phead"><div class="gridbg" aria-hidden="true"><i class="b1"></i></div><div class="wrap phead-in">' + crumbs + lockup(d) + '<h1 class="h1">' + o.nazev + '</h1><p class="lead" style="max-width:52ch">' + o.lead + '</p><div class="btns">' + pre + go_('kontakt', 'Nezávazná konzultace', 'btn btn-ghost', 'oblast-konzultace') + '</div></div></section>';
    var tech = o.nzu.length ? '<section class="sec-sm surface"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('NZÚ', 'nzu') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Podmínky a limity</h2><p class="muted" style="margin:0">Podle Závazných pokynů NZÚ platných od 24. 6. 2026.</p></div>' + nzuRulesFor(o.nzu) + '</div></section>' : '';
    var xs = '<section class="sec-sm"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('Celý dům') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Co s tím souvisí</h2></div>' + xsell(d.souvisi) + '</div></section>';
    return head + tech + xs + finalCta();
  }

  /* ---------- REKONSTRUKCE ---------- */
  function vRekonstrukce() {
    var head = pageHead('Řešení pro dům', 'Jeden dům.<br>Jeden projekt.', 'Rekonstrukci vedeme od prvního měření po předání. Každý krok má výstup, který dostanete do ruky.', go_('konfigurator', 'Sestavit si dům' + arrow(), 'btn btn-primary', 'rekonstrukce-konfigurator') + go_('nzu-kalkulacka', 'Spočítat možnosti', 'btn btn-ghost', 'rekonstrukce-kalkulacka'));
    var flow = '<section class="sec-sm" style="padding-top:0"><div class="wrap"><ol class="flow">' + OB.rekonstrukce.map(function (s) { return '<li><span class="st">' + s.nazev + '</span><p>' + s.text + '</p><span class="out">' + s.vystup + '</span></li>'; }).join('') + '</ol></div></section>';
    var ill = '<section class="sec surface"><div class="wrap two even" style="align-items:center"><div style="display:grid;gap:24px">' + eyebrow('Původní stav a návrh') + '<h2 class="h2">Stejný dům. Jiná ekonomika.</h2><p class="lead">Všechna opatření kreslíme a počítáme na jednom modelu domu. Ve konfigurátoru si je můžete zapínat sami.</p><div class="btns">' + go_('konfigurator', 'Otevřít konfigurátor' + arrow(), 'btn btn-primary', 'rekonstrukce-ill') + '</div></div>' +
      '<div class="ba"><figure class="ba-card old">' + photo(OB.hero.pred) + '<figcaption class="cap old">Před</figcaption></figure><span class="ba-arrow" aria-hidden="true"><b class="h">→</b><b class="v">↓</b></span><figure class="ba-card">' + photo(OB.hero.po) + '<figcaption class="cap">Po rekonstrukci</figcaption></figure></div></div></section>';
    return head + flow + ill + finalCta();
  }

  /* ---------- NZÚ a FINANCOVÁNÍ ---------- */
  function vNzu() {
    var head = pageHead('NZÚ a financování', 'Nejdřív spočítáme.<br>Potom stavíme.', 'Od 28. 5. 2026 funguje Nová zelená úsporám pro rodinné domy hlavně jako bezúročný úvěr. Stát platí úroky, vy splácíte jen to, co si půjčíte.', go_('nzu-kalkulacka', 'Spustit NZÚ kalkulačku' + arrow(), 'btn btn-nzu', 'nzu-head'));
    var branches = '<section class="sec-sm" style="padding-top:0"><div class="wrap split2">' +
      '<div class="panel nzu">' + eyebrow('Běžné domácnosti', 'nzu') + '<h2 class="h3">Bezúročný úvěr NZÚ</h2><div class="big g">až 2 000 000 Kč</div><ul class="list g"><li>Dílčí opatření do 750 000 Kč na dům</li><li>Komplexní renovace do 2 000 000 Kč</li><li>Úroky platí stát 10 až 15 let, u vybraných komplexních renovací až 25 let</li><li>Minimální vypočtená výše úvěru 100 000 Kč</li><li>O úvěru rozhoduje banka podle bonity</li></ul></div>' +
      '<div class="panel">' + eyebrow('Nízkopříjmové domácnosti') + '<h2 class="h3">NZÚ Light: přímá dotace</h2><div class="big">až 400 000 Kč</div><ul class="list"><li>Až 250 000 Kč na zateplení</li><li>Až 150 000 Kč na zdroje energie</li><li>Minimum 50 000 Kč v jedné žádosti</li><li>Lze čerpat předem jako zálohu</li><li>Doplňkový úvěr do výše dotace</li></ul></div></div></section>';
    var dashS = '<section class="sec-sm surface"><div class="wrap two"><div style="display:grid;gap:20px;align-content:start">' + eyebrow('Ekonomika celé akce') + '<h2 class="h2" style="font-size:clamp(30px,4vw,52px)">Dotace není celý příběh.</h2><p class="muted" style="margin:0;max-width:44ch">Ukazujeme cenu projektu, financování, vlastní zdroje, splátku a úsporu vedle sebe. Teprve pak víte, co renovace udělá s rodinným rozpočtem.</p></div>' + sampleDash() + '</div></section>';
    var limity = '<section class="sec-sm"><div class="wrap"><div class="sec-head">' + eyebrow('Limity podle opatření', 'nzu') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Kolik lze financovat</h2></div>' +
      nzuRulesFor(['ZAT-STENA', 'ZAT-STRECHA', 'ZAT-STROP', 'ZAT-ZEMINA', 'VYPLNE', 'STINENI', 'TC-VZ-VO', 'TC-ZEME', 'TC-VZ-VZ', 'TUV-TC', 'TUV-SOL', 'FVE-KWP', 'FVE-BAT', 'REKU']) + '</div></section>';
    var lhuty = '<section class="sec-sm" style="padding-top:0"><div class="wrap"><div class="sec-head">' + eyebrow('Termíny') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Co si pohlídat</h2></div><div class="tbl-wrap"><table class="tbl narrow"><thead><tr><th>Situace</th><th>Bezúročný úvěr</th><th>NZÚ Light</th></tr></thead><tbody>' +
      RULES.lhuty.map(function (l) { return '<tr><td class="nm"><b>' + l.nazev + '</b></td><td data-label="Bezúročný úvěr">' + l.uver + '</td><td data-label="NZÚ Light">' + l.light + '</td></tr>'; }).join('') + '</tbody></table></div></div></section>';
    var src = '<section class="sec-sm surface"><div class="wrap two"><div style="display:grid;gap:18px">' + eyebrow('Zdroje') + '<h2 class="h3">Počítáme podle oficiálních pokynů</h2><p class="muted" style="margin:0">Pravidla jsou v kalkulačce uložená jako data se zdrojem a verzí dokumentu.</p>' + go_('pravidla-nzu', 'Zobrazit pravidla kalkulačky' + arrow(), 'link', 'nzu-pravidla') + '</div><ul class="rows">' +
      RULES.programy.map(function (p) { return '<li><a class="row" href="' + p.odkaz + '" target="_blank" rel="noopener"><div><span class="h4">' + esc(p.zdroj) + '</span><p>' + esc(p.verzeDokumentu) + ', platnost od 24. 6. 2026</p></div><span class="go">↗</span></a></li>'; }).join('') + '</ul></div></section>';
    return head + branches + dashS + limity + lhuty + src + finalCta();
  }

  /* ---------- KALKULAČKA ---------- */
  var STEPS = ['Váš dům', 'Co chcete řešit', 'Podrobnosti', 'Domácnost'];
  var MEAS = [
    { k: 'okna', t: 'Okna a dveře' }, { k: 'fasada', t: 'Fasáda' }, { k: 'strecha', t: 'Střecha' }, { k: 'strop', t: 'Strop pod půdou' }, { k: 'podlaha', t: 'Podlaha' },
    { k: 'tc', t: 'Tepelné čerpadlo' }, { k: 'fve', t: 'Fotovoltaika' }, { k: 'baterie', t: 'Baterie' }, { k: 'reku', t: 'Rekuperace' }, { k: 'elektro', t: 'Elektro' },
    { k: 'tuv', t: 'Ohřev vody' }, { k: 'zelena', t: 'Zelená střecha' }, { k: 'destovka', t: 'Dešťová voda' },
    { k: 'komplet', t: 'Kompletní rekonstrukce', s: 'Celá obálka domu a nový zdroj tepla' }
  ];
  var DETAIL_ORDER = ['okna', 'fasada', 'strecha', 'strop', 'podlaha', 'tc', 'fve', 'reku', 'elektro', 'tuv', 'zelena'];

  function questions() {
    var d = S.calc.data;
    var q = [{ key: 'typ', step: 0 }, { key: 'rok', step: 0 }, { key: 'podlazi', step: 0 }, { key: 'plocha', step: 0 }, { key: 'psc', step: 0 }, { key: 'vytapeni', step: 0 }, { key: 'stav', step: 0 }, { key: 'vyber', step: 1 }];
    DETAIL_ORDER.forEach(function (m) { var sel = d.vyber.indexOf(m) >= 0 || (m === 'fve' && d.vyber.indexOf('baterie') >= 0); if (sel) q.push({ key: 'd-' + m, step: 2, m: m }); });
    q.push({ key: 'domacnost', step: 3 });
    return q;
  }
  function currentQ() { var q = questions(); return q[Math.min(S.calc.i, q.length - 1)]; }
  function est() { var d = S.calc.data; return EN.odhadPloch(+d.plocha || 120, d.podlazi || 'p2'); }
  function saveDraft() { store('calc', { data: S.calc.data }); }

  function vCalc() {
    if (S.calc.done && S.last) return vResult(S.last);
    var qs = questions(), i = Math.min(S.calc.i, qs.length - 1), q = qs[i];
    var stepIdx = q.step;
    var top = '<div class="calc-top"><div class="wrap"><div class="prog-steps">' + STEPS.map(function (s, k) { return '<span class="' + (k === stepIdx ? 'on' : k < stepIdx ? 'done' : '') + '">' + (k + 1) + ' ' + s + '</span>'; }).join('') + '<span>Výsledek</span></div>' +
      '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(i / qs.length * 100) + '"><i style="width:' + (i / qs.length * 100).toFixed(1) + '%"></i></div></div></div>';
    return '<div class="calc">' + top + '<div class="wrap"><form class="q" id="qform" novalidate>' + qHtml(q, i, qs.length) + '</form></div></div>';
  }

  function opt(val, label, pressed, small, name) { return '<button type="button" class="opt" data-opt="' + (name || '') + '" data-val="' + esc(val) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '"><span class="box" aria-hidden="true"></span><span class="t">' + label + (small ? '<small>' + small + '</small>' : '') + '</span></button>'; }
  function nav(i, nextLabel) { return '<div class="q-nav"><button type="submit" class="btn btn-primary">' + (nextLabel || 'Pokračovat') + arrow() + '</button>' + (i > 0 ? '<button type="button" class="back" data-act="q-back">Zpět</button>' : '') + '</div>'; }
  function numField(id, label, val, unit, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><div class="inp-unit"><input class="inp" id="' + id + '" name="' + id + '" inputmode="decimal" value="' + esc(val) + '" autocomplete="off"' + (extra || '') + '><span>' + unit + '</span></div></div>'; }
  function helperBtn(kind) { return '<button type="button" class="link" data-act="helper" data-kind="' + kind + '" style="justify-self:start">Nevím, pomozte mi ji spočítat</button>'; }

  function qHtml(q, i, total) {
    var d = S.calc.data, num = '<span class="qn">' + STEPS[q.step] + ' · otázka ' + (i + 1) + ' z ' + total + '</span>';
    var e = est();
    switch (q.key) {
      case 'typ':
        return num + '<h2>Jaký je to dům?</h2><div class="opts c2" data-single="typ">' +
          [['rd', 'Samostatně stojící rodinný dům'], ['dvojdum', 'Dvojdům'], ['radovy', 'Řadový dům'], ['rekreacni', 'Rekreační stavba užívaná k bydlení'], ['usedlost', 'Obytná část usedlosti']].map(function (x) { return opt(x[0], x[1], d.typ === x[0], '', 'typ'); }).join('') +
          '</div><p class="help">Stavíte nový dům? <a href="#stavby-novostavby" data-go="stavby-novostavby" class="link">Novostavby na rovinu</a></p>' + (i > 0 ? nav(i) : '');
      case 'rok':
        return num + '<h2>Kdy byl dům dokončen?</h2><p class="help">Stačí přibližně. Rok rozhoduje o tom, která opatření NZÚ podporuje.</p>' + numField('f-rok', 'Rok dokončení', d.rok, 'rok', ' maxlength="4" placeholder="1978"') +
          '<div class="btns">' + [['1955', 'před 1960'], ['1975', '1960 až 1989'], ['1995', '1990 až 2001'], ['2008', '2002 až 2012'], ['2016', 'po 2013']].map(function (x) { return '<button type="button" class="chip" data-act="fill" data-target="f-rok" data-val="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' + nav(i);
      case 'podlazi':
        return num + '<h2>Kolik má dům podlaží?</h2><div class="opts c2" data-single="podlazi">' + Object.keys(EN.PODLAZI).map(function (k) { return opt(k, EN.PODLAZI[k].label, d.podlazi === k, '', 'podlazi'); }).join('') + '</div>' + nav(i);
      case 'plocha':
        return num + '<h2>Jaká je podlahová plocha?</h2><p class="help">Obytná plocha všech vytápěných podlaží.</p>' + numField('f-plocha', 'Podlahová plocha', d.plocha, 'm²', ' placeholder="140"') + helperBtn('plocha') + helperHtml('plocha') + nav(i);
      case 'psc':
        return num + '<h2>Kde dům stojí?</h2><p class="help">PSČ potřebujeme kvůli dostupnosti a technické návštěvě.</p><div class="fields c2">' +
          '<div class="field"><label for="f-psc">PSČ</label><input class="inp" id="f-psc" inputmode="numeric" maxlength="6" value="' + esc(d.psc) + '" placeholder="344 01" autocomplete="postal-code"></div>' +
          '<div class="field"><label for="f-obec">Obec (nepovinné)</label><input class="inp sm" id="f-obec" value="' + esc(d.obec) + '" placeholder="Domažlice" autocomplete="address-level2" style="min-height:62px"></div></div>' + nav(i);
      case 'vytapeni':
        return num + '<h2>Čím dnes topíte?</h2><div class="opts c2" data-single="vytapeni">' + Object.keys(EN.VYTAPENI).map(function (k) { return opt(k, EN.VYTAPENI[k], d.vytapeni === k, '', 'vytapeni'); }).join('') + '</div>' + nav(i);
      case 'stav':
        return num + '<h2>V jakém stavu je dům?</h2><div class="opts" data-single="stav">' + [['puvodni', 'Původní stav', 'Nezateplený, původní okna'], ['castecne', 'Částečně renovovaný', 'Například nová okna nebo zateplený strop'], ['zatepleny', 'Zateplený', 'Zateplená fasáda i střecha, nová okna']].map(function (x) { return opt(x[0], x[1], d.stav === x[0], x[2], 'stav'); }).join('') + '</div>' + nav(i);
      case 'vyber':
        return '<span class="qn">' + STEPS[1] + '</span><h2>Co chcete řešit?</h2><p class="help">Vyberte vše, co vás zajímá. Kombinace spočítáme dohromady.</p><div class="opts c3" data-multi="vyber">' +
          MEAS.map(function (m) { return opt(m.k, m.t, d.vyber.indexOf(m.k) >= 0, m.s || '', 'vyber'); }).join('') + '</div><p class="err" id="q-err" hidden>Vyberte alespoň jedno opatření.</p>' + nav(i);
      case 'domacnost':
        return '<span class="qn">' + STEPS[3] + '</span><h2>Jakou podporu prověřit?</h2><p class="help">Podle toho vybereme větev programu NZÚ. Příjem se dokládá až při žádosti.</p><div class="opts" data-single="domacnost">' +
          opt('bezna', 'Běžná domácnost', d.domacnost === 'bezna', 'Bezúročný úvěr NZÚ', 'domacnost') +
          opt('nizsi', 'Nižší příjmy, do 4. příjmového decilu', d.domacnost === 'nizsi', 'U komplexní renovace kompenzace úroků až 25 let', 'domacnost') +
          opt('light', 'Nízkopříjmová domácnost', d.domacnost === 'light', 'Dávka jednotné sociální pomoci, příjem do 3. decilu, u seniorů do 5. decilu. NZÚ Light s přímou dotací.', 'domacnost') +
          '</div><p class="help">Svůj příjmový decil zjistíte v <a class="link" href="https://novazelenausporam.cz/" target="_blank" rel="noopener">nástroji na webu NZÚ</a>.</p>' + nav(i, 'Zobrazit výsledek');
    }
    if (q.key.indexOf('d-') === 0) return num + detailHtml(q.m, e) + nav(i);
    return '';
  }

  function detailHtml(m, e) {
    var o = S.calc.data.o[m] || {};
    var d = S.calc.data;
    function single(name, list, cur) { return '<div class="opts c3" data-single-d="' + m + '.' + name + '">' + list.map(function (x) { return opt(x[0], x[1], cur === x[0], x[2] || '', m + '.' + name); }).join('') + '</div>'; }
    function tg(name, label, cur, small) { return '<div class="opts" data-toggle-d="' + m + '.' + name + '">' + opt('1', label, !!cur, small || '', m + '.' + name) + '</div>'; }
    switch (m) {
      case 'okna': return '<h2>Okna a dveře</h2><p class="help">Plocha všech oken, která chcete vyměnit. Odhad podle domu: ' + e.okna + ' m².</p>' +
        numField('f-okna', 'Plocha oken', o.plocha || e.okna, 'm²') + helperBtn('okna') + helperHtml('okna') +
        '<div class="field"><span class="lbl">Materiál</span>' + single('material', [['plast', 'Plast'], ['drevo', 'Dřevo'], ['hlinik', 'Hliník']], o.material || 'plast') + '</div>' +
        numField('f-dvere', 'Vchodové dveře', o.dvere || 0, 'ks') + tg('stineni', 'Přidat venkovní žaluzie', o.stineni, 'Podpora jen spolu s výměnou okna');
      case 'fasada': return '<h2>Fasáda</h2><p class="help">Plocha obvodových stěn bez oken. Odhad podle domu: ' + e.fasada + ' m².</p>' + numField('f-fasada', 'Plocha fasády', o.plocha || e.fasada, 'm²') + helperBtn('fasada') + helperHtml('fasada');
      case 'strecha': return '<h2>Střecha</h2><p class="help">Plocha střešní roviny. Odhad podle domu: ' + e.strecha + ' m².</p>' + numField('f-strecha', 'Plocha střechy', o.plocha || e.strecha, 'm²') + helperBtn('strecha') + helperHtml('strecha');
      case 'strop': return '<h2>Strop pod půdou</h2><p class="help">Plocha stropu nad posledním vytápěným podlažím. Odhad: ' + e.strop + ' m².</p>' + numField('f-strop', 'Plocha stropu', o.plocha || e.strop, 'm²') + helperBtn('strop') + helperHtml('strop');
      case 'podlaha': return '<h2>Podlaha</h2><div class="field"><span class="lbl">Na čem podlaha leží</span>' + single('typ', [['zemina', 'Na terénu'], ['sklep', 'Nad sklepem'], ['venk', 'Nad venkovním prostorem']], o.typ || 'zemina') + '</div>' +
        numField('f-podlaha', 'Plocha podlahy', o.plocha || e.podlaha, 'm²') + helperBtn('podlaha') + helperHtml('podlaha');
      case 'tc':
        return '<h2>Tepelné čerpadlo</h2><p class="help">Dnes topíte: ' + (EN.VYTAPENI[d.vytapeni] || 'neuvedeno').toLowerCase() + '.</p>' +
          '<div class="field"><span class="lbl">Typ systému</span>' + single('typ', [['vzduch-voda', 'Vzduch-voda', 'nejčastější volba'], ['zeme-voda', 'Země-voda', 'vrty, vyšší účinnost'], ['vzduch-vzduch', 'Vzduch-vzduch', 'bez vodní soustavy'], ['nevim', 'Nevím', 'doporučíme']], o.typ || 'vzduch-voda') + '</div>' +
          '<div class="field"><span class="lbl">Otopná soustava</span>' + single('soustava', [['radiatory', 'Radiátory'], ['podlahove', 'Podlahové topení'], ['nove-podlahove', 'Chci nové podlahové']], o.soustava || 'radiatory') + '</div>' +
          tg('tuv', 'Ohřívat i teplou vodu', o.tuv !== false, 'Zásobník teplé vody');
      case 'fve':
        var batOnly = d.vyber.indexOf('fve') < 0;
        return '<h2>' + (batOnly ? 'Baterie' : 'Fotovoltaika') + '</h2>' +
          (batOnly ? '<div class="field"><span class="lbl">Máte už fotovoltaiku?</span>' + single('existujici', [['1', 'Ano, mám'], ['0', 'Ne, chci novou i s baterií']], o.existujici ? '1' : '0') + '</div>' : '') +
          numField('f-kwp', 'Výkon fotovoltaiky', o.kwp || 8, 'kWp') +
          tg('baterie', 'Baterie', batOnly ? true : o.baterie, 'Posune výrobu do večera') + numField('f-kwh', 'Kapacita baterie', o.kwh || 8, 'kWh') +
          tg('rizeni', 'Energetický management', o.rizeni, 'Řízení přebytků do bojleru, TČ, auta') + tg('wallbox', 'Wallbox', o.wallbox, 'Domácí nabíjení elektromobilu') +
          '<div class="field"><span class="lbl">Přípojka</span>' + single('fazy', [['3', 'Třífázová'], ['1', 'Jednofázová'], ['nevim', 'Nevím']], o.fazy || 'nevim') + '</div>';
      case 'reku': return '<h2>Rekuperace</h2><div class="field"><span class="lbl">Systém</span>' + single('typ', [['centralni', 'Centrální', 'jednotka a rozvody'], ['decentralni', 'Decentrální', 'jednotky ve stěnách']], o.typ || 'centralni') + '</div>';
      case 'elektro': return '<h2>Elektro</h2><div class="field"><span class="lbl">Rozsah</span>' + single('rozsah', [['kompletni', 'Nové rozvody v celém domě'], ['rozvadec', 'Nový rozvaděč a revize']], o.rozsah || 'kompletni') + '</div>' + tg('smart', 'Příprava na smart home', o.smart, 'Sběrnice a řízení světel, žaluzií, topení');
      case 'tuv': return '<h2>Ohřev vody</h2><div class="field"><span class="lbl">Způsob</span>' + single('typ', [['solar', 'Solární kolektory'], ['tc', 'Tepelné čerpadlo pro vodu']], o.typ || 'solar') + '</div>';
      case 'zelena': return '<h2>Zelená střecha</h2><p class="help">Jen v kombinaci se zateplením nebo novým zdrojem energie.</p>' + numField('f-zelena', 'Plocha zelené střechy', o.plocha || 30, 'm²');
    }
    return '';
  }

  var HELPERS = {
    plocha: { title: 'Podlahová plocha z rozměrů domu', f: ['delka', 'sirka'], calc: function (v) { var p = EN.PODLAZI[S.calc.data.podlazi || 'p2']; return Math.round(v.delka * v.sirka * p.div * 0.85); } },
    fasada: { title: 'Plocha fasády z rozměrů domu', f: ['delka', 'sirka', 'vyska'], calc: function (v) { return Math.round(2 * (v.delka + v.sirka) * v.vyska * 0.85); } },
    strecha: { title: 'Plocha střechy z půdorysu', f: ['delka', 'sirka'], calc: function (v) { return Math.round(v.delka * v.sirka * (S.calc.helperRoof === 'plocha' ? 1.1 : 1.35)); } },
    strop: { title: 'Plocha stropu z půdorysu', f: ['delka', 'sirka'], calc: function (v) { return Math.round(v.delka * v.sirka * 0.9); } },
    podlaha: { title: 'Plocha podlahy z půdorysu', f: ['delka', 'sirka'], calc: function (v) { return Math.round(v.delka * v.sirka * 0.9); } },
    okna: { title: 'Plocha oken z jejich počtu', f: ['pocet', 'velikost'], calc: function (v) { return Math.round(v.pocet * v.velikost); } }
  };
  var HF = { delka: ['Délka domu', 'm'], sirka: ['Šířka domu', 'm'], vyska: ['Výška domu', 'm'], pocet: ['Počet oken', 'ks'], velikost: ['Průměrná velikost okna', 'm²'] };
  function helperHtml(kind) {
    if (S.calc.helper !== kind) return '';
    var h = HELPERS[kind], e = est(), p = EN.PODLAZI[S.calc.data.podlazi || 'p2'];
    var defs = { delka: e.delka, sirka: e.sirka, vyska: p.vyska, pocet: Math.max(4, Math.round(e.okna / 1.6)), velikost: 1.6 };
    return '<div class="helper" id="helper"><b>' + h.title + '</b><div class="fields c3">' + h.f.map(function (k) { return '<div class="field"><label for="h-' + k + '">' + HF[k][0] + '</label><div class="inp-unit"><input class="inp sm" id="h-' + k + '" data-h="' + k + '" inputmode="decimal" value="' + dec(defs[k]) + '"><span>' + HF[k][1] + '</span></div></div>'; }).join('') + '</div>' +
      (kind === 'strecha' ? '<div class="btns"><button type="button" class="chip" data-act="roof" data-val="sikma" aria-pressed="' + (S.calc.helperRoof !== 'plocha') + '">Šikmá</button><button type="button" class="chip" data-act="roof" data-val="plocha" aria-pressed="' + (S.calc.helperRoof === 'plocha') + '">Plochá</button></div>' : '') +
      (kind === 'okna' ? '<div class="btns">' + [['1', 'Malá 1 m²'], ['1.6', 'Střední 1,6 m²'], ['2.6', 'Velká 2,6 m²']].map(function (x) { return '<button type="button" class="chip" data-act="fill" data-target="h-velikost" data-val="' + dec(x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="res" id="h-res"></div><button type="button" class="btn btn-ghost btn-sm" data-act="helper-use" data-kind="' + kind + '" style="justify-self:start">Použít hodnotu</button></div>';
  }
  function helperCompute(kind) {
    var v = {}; $$('[data-h]').forEach(function (i) { v[i.dataset.h] = parseFloat(String(i.value).replace(',', '.')) || 0; });
    var val = HELPERS[kind].calc(v);
    var res = $('#h-res'); if (res) res.textContent = 'Orientačně ' + n(val) + (kind === 'okna' ? ' m² oken' : ' m²');
    return val;
  }

  function readNum(id) { var el = $('#' + id); if (!el) return null; var v = parseFloat(String(el.value).replace(/\s/g, '').replace(',', '.')); return isNaN(v) ? null : v; }

  function submitQ() {
    var q = currentQ(), d = S.calc.data, err = function (t) { var p = $('#q-err') || (function () { var x = document.createElement('p'); x.className = 'err'; x.id = 'q-err'; $('.q-nav').before(x); return x; })(); p.hidden = false; p.textContent = t; };
    if (!S.calc.started) { S.calc.started = true; track('calc_start'); }
    switch (q.key) {
      case 'typ': if (!d.typ) return err('Vyberte typ domu.'); break;
      case 'rok': var r = readNum('f-rok'); if (!r || r < 1800 || r > 2026) return err('Zadejte rok dokončení mezi 1800 a 2026.'); d.rok = Math.round(r); break;
      case 'podlazi': if (!d.podlazi) return err('Vyberte počet podlaží.'); break;
      case 'plocha': var p = readNum('f-plocha'); if (!p || p < 20 || p > 1500) return err('Zadejte plochu mezi 20 a 1 500 m².'); d.plocha = Math.round(p); break;
      case 'psc': var ps = ($('#f-psc').value || '').replace(/\s/g, ''); if (!/^\d{5}$/.test(ps)) return err('PSČ má pět číslic, například 344 01.'); d.psc = ps; d.obec = $('#f-obec').value.trim(); break;
      case 'vytapeni': if (!d.vytapeni) return err('Vyberte, čím topíte.'); break;
      case 'stav': if (!d.stav) return err('Vyberte stav domu.'); break;
      case 'vyber': if (!d.vyber.length) return err('Vyberte alespoň jedno opatření.'); break;
      case 'domacnost': if (!d.domacnost) return err('Vyberte jednu možnost.'); break;
      default:
        if (q.m) {
          var o = d.o[q.m] = d.o[q.m] || {};
          var map = { okna: 'f-okna', fasada: 'f-fasada', strecha: 'f-strecha', strop: 'f-strop', podlaha: 'f-podlaha', zelena: 'f-zelena' };
          if (map[q.m]) { var v = readNum(map[q.m]); if (!v || v <= 0) return err('Zadejte plochu v m².'); o.plocha = v; }
          if (q.m === 'okna') o.dvere = Math.max(0, Math.round(readNum('f-dvere') || 0));
          if (q.m === 'fve') { var kw = readNum('f-kwp'); if (!kw || kw <= 0 || kw > 50) return err('Zadejte výkon mezi 1 a 50 kWp.'); o.kwp = kw; o.kwh = readNum('f-kwh') || 0; if (d.vyber.indexOf('baterie') >= 0) o.baterie = true; }
          track('service_select', { opatreni: q.m });
        }
    }
    S.calc.helper = null;
    saveDraft();
    var qs = questions();
    if (S.calc.i >= qs.length - 1) { finishCalc(); return; }
    S.calc.i++;
    renderCalcOnly();
  }

  function renderCalcOnly() { render(); var f = $('#qform input'); var top = $('.calc'); if (top) window.scrollTo(0, 0); if (f && window.innerWidth > 760) f.focus({ preventScroll: true }); }

  function buildInput(d) {
    var o = {};
    d.vyber.forEach(function (k) { if (k === 'komplet') { o.komplet = true; return; } if (k === 'baterie') return; o[k] = Object.assign({}, d.o[k] || {}); });
    if (d.vyber.indexOf('baterie') >= 0) { o.fve = Object.assign({ kwp: 8, kwh: 8 }, d.o.fve || {}, { baterie: true }); }
    if (o.fve && !o.fve.kwp) o.fve.kwp = 8;
    return { typ: d.typ, rok: d.rok, podlazi: d.podlazi, plocha: d.plocha, psc: d.psc, vytapeni: d.vytapeni, stav: d.stav, domacnost: d.domacnost, opatreni: o };
  }

  function finishCalc() {
    var inp = buildInput(S.calc.data);
    S.last = EN.calc(inp, RULES, PRED);
    S.calc.done = true;
    track('calc_complete', { investice: S.last.investice, uver: S.last.uver, dotace: S.last.dotace, rezim: S.last.rezim });
    render(); window.scrollTo(0, 0);
  }

  function applyKomplet(d) {
    ['fasada', 'okna', 'podlaha'].forEach(function (k) { if (d.vyber.indexOf(k) < 0) d.vyber.push(k); });
    if (d.vyber.indexOf('strecha') < 0 && d.vyber.indexOf('strop') < 0) d.vyber.push('strecha');
    if (d.vytapeni !== 'tc' && d.vyber.indexOf('tc') < 0 && d.vyber.indexOf('fve') < 0) d.vyber.push('tc');
  }

  function vResult(r) {
    var d = S.calc.data;
    var lead;
    if (r.light) lead = r.dotace > 0 ? 'Podle zadaných údajů můžete orientačně využít přímou dotaci NZÚ Light ' + kc(r.dotace) + (r.uver ? ' a doplňkový úvěr do ' + kc(r.uver) : '') + '.' : 'Podle zadaných údajů vám kalkulace dotaci NZÚ Light nevychází. Podívejte se na upozornění níže.';
    else lead = r.uver > 0 ? 'Podle zadaných údajů můžete orientačně využít bezúročný úvěr NZÚ ' + kc(r.uver) + '. Úroky by po dobu ' + r.doba + ' let platil stát.' : 'Podle zadaných údajů vám kalkulace bezúročný úvěr NZÚ nevychází. Projekt přesto spočítáme a najdeme jiné financování.';
    var head = '<section style="background:#fff;border-bottom:1px solid var(--line)"><div class="wrap result-head">' + eyebrow('Předběžná kalkulace', 'nzu') + '<h1 class="h2">' + (r.komplexni ? 'Komplexní renovace' : r.light ? 'NZÚ Light' : 'Váš dům') + ', ' + n(d.plocha) + ' m², ' + d.rok + '</h1><p class="lead" style="max-width:60ch">' + lead + '</p>' +
      '<div class="btns">' + '<button type="button" class="btn btn-primary" data-act="overit">Nechat ověřit výpočet' + arrow() + '</button><a href="#plan" data-go="plan" data-cta="vysledek-plan" class="btn btn-ghost">Plán modernizace domu</a><button type="button" class="link" data-act="calc-edit">Upravit zadání</button></div></div></section>';

    var split = r.investice ? '<div class="panel" style="gap:12px"><b>Jak se skládá cena projektu</b><div class="splitbar">' +
      (r.dotace ? '<i class="d" style="width:' + (r.dotace / r.investice * 100).toFixed(1) + '%"></i>' : '') + (r.uver ? '<i class="u" style="width:' + (r.uver / r.investice * 100).toFixed(1) + '%"></i>' : '') + '<i class="o" style="width:' + (r.vlastni / r.investice * 100).toFixed(1) + '%"></i></div>' +
      '<div class="legend">' + (r.dotace ? '<span><i style="background:var(--green)"></i>Dotace ' + kc(r.dotace) + '</span>' : '') + (r.uver ? '<span><i style="background:#7CCBA6"></i>Bezúročný úvěr ' + kc(r.uver) + '</span>' : '') + '<span><i style="background:#CFCBC4"></i>Vlastní zdroje ' + kc(r.vlastni) + '</span></div></div>' : '';

    var maxM = Math.max(r.nakladyPred, r.splatka + r.nakladyPo, 1);
    var month = '<div class="panel"><b>Měsíční rozpočet domu</b><div class="month">' +
      '<div class="bar"><span>Dnes energie</span><i class="b" style="width:' + (r.nakladyPred / maxM * 100) + '%;background:#CFCBC4"></i><b>' + kc(r.nakladyPred) + '</b></div>' +
      '<div class="bar"><span>Po: energie</span><i class="b" style="width:' + (r.nakladyPo / maxM * 100) + '%;background:var(--green)"></i><b>' + kc(r.nakladyPo) + '</b></div>' +
      (r.splatka ? '<div class="bar"><span>Po: + splátka</span><i class="b" style="width:' + ((r.nakladyPo + r.splatka) / maxM * 100) + '%;background:#7CCBA6"></i><b>' + kc(r.nakladyPo + r.splatka) + '</b></div>' : '') +
      '</div><p class="muted" style="margin:0;font-size:14px">Energie pro vytápění, teplou vodu a domácnost. Odhad podle typické spotřeby domu tohoto stáří.</p></div>';

    var rows = r.polozky.map(function (it) {
      var lim = it.mimo ? '<span class="muted">' + esc(it.mimo) + '</span>' : (it.sazba ? kc(it.sazba) + ' / ' + it.jednotka + ' → ' : '') + (it.mimo ? '' : 'limit ' + kc(it.limit));
      return '<tr><td class="nm"><b>' + esc(it.nazev) + '</b><span class="sub">' + esc(it.popis || '') + '</span></td><td class="n" data-label="Rozsah">' + (it.jednotka === 'ks' ? '1 ks' : dec(it.mnozstvi) + ' ' + it.jednotka) + '</td><td class="n" data-label="Orientační cena">' + kc(it.cena) + '</td><td class="rule" data-label="Pravidlo NZÚ" style="min-width:200px;font-size:14px">' + lim + '</td><td class="n" data-label="Možná podpora" style="color:var(--green);font-weight:700">' + (it.podpora ? kc(it.podpora) : '0 Kč') + '</td></tr>';
    }).join('');
    var tbl = '<div class="tbl-wrap"><table class="tbl rtbl"><thead><tr><th>Opatření</th><th class="n">Rozsah</th><th class="n">Orientační cena</th><th>Pravidlo NZÚ</th><th class="n">Možná podpora</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td class="nm">Celkem</td><td class="hide-m"></td><td class="n" data-label="Investice">' + kc(r.investice) + '</td><td class="rule" data-label="Režim" style="font-size:14px;font-weight:600">' + (r.light ? 'NZÚ Light: zateplení max. 250 000 Kč, zdroje max. 150 000 Kč' : (r.komplexni ? 'Komplexní renovace, limit ' : 'Dílčí opatření, limit ') + kc(r.uverLimit)) + '</td><td class="n" data-label="' + (r.light ? 'Dotace' : 'Bezúročný úvěr') + '" style="color:var(--green)">' + kc(r.light ? r.dotace : r.uver) + '</td></tr></tfoot></table></div>';

    var notes = r.upozorneni.length ? '<div class="notes">' + r.upozorneni.map(function (w) { return '<div class="note ' + (w.level === 'w' ? 'w' : w.level === 'r' ? 'w r' : '') + '"><span>' + esc(w.text) + '</span></div>'; }).join('') + '</div>' : '';
    var tips = r.tipy.length ? '<div class="panel"><b>Technicky navazuje</b>' + r.tipy.map(function (t) { return '<div style="display:grid;gap:4px;border-top:1px solid var(--line);padding-top:12px"><b style="font-size:16px">' + esc(t.t) + '</b><span class="muted" style="font-size:15px">' + esc(t.d) + '</span>' + (t.calc ? '<button type="button" class="link" data-act="add-measure" data-m="' + t.calc + '" style="justify-self:start;font-size:15px">Přidat do výpočtu</button>' : '') + '</div>'; }).join('') + '</div>' : '';
    var postup = '<div class="panel"><b>Doporučený postup</b><ol class="recs">' + r.postup.map(function (p) { return '<li><div><b>' + esc(p.t) + '</b><span>' + esc(p.d) + '</span></div></li>'; }).join('') + '</ol></div>';

    return head + '<section class="sec-sm surface"><div class="wrap res-grid"><div style="display:grid;gap:24px;min-width:0">' + dash(r) + split + '<h2 class="h3" style="margin-top:12px">Rozpis opatření</h2>' + tbl + notes + '</div>' +
      '<aside class="side">' + month + tips + postup + '<div class="panel dark"><b>Výsledek podléhá ověření.</b><span class="muted" style="font-size:15px">Technik ověří plochy, stav domu a podmínky NZÚ na místě. Teprve pak připravíme nabídku.</span><button type="button" class="btn btn-primary" data-act="overit">Nechat ověřit výpočet</button></div></aside></div></section>';
  }

  /* ---------- KONFIGURÁTOR ---------- */
  var CFG_T = [
    { k: 'okna', t: 'Okna', s: 'trojsklo' }, { k: 'fasada', t: 'Fasáda', s: 'EPS 200 mm' }, { k: 'strecha', t: 'Střecha', s: 'zateplení' },
    { k: 'tc', t: 'Tepelné čerpadlo', s: 'vzduch-voda' }, { k: 'fve', t: 'Fotovoltaika', s: '8 kWp, baterie' }, { k: 'elektro', t: 'Elektro', s: 'rozvody, wallbox' }
  ];
  function cfgResult() {
    var c = S.cfg, o = {};
    if (c.on.okna) o.okna = { material: 'plast' };
    if (c.on.fasada) o.fasada = {};
    if (c.on.strecha) o.strecha = {};
    if (c.on.tc) o.tc = { typ: 'vzduch-voda', tuv: true };
    if (c.on.fve) o.fve = { kwp: 8, baterie: true, kwh: 8, fazy: '3', wallbox: !!c.on.elektro };
    if (c.on.elektro) o.elektro = { rozsah: 'kompletni' };
    return EN.calc({ typ: 'rd', rok: c.rok, podlazi: 'p2', plocha: c.plocha, vytapeni: c.vytapeni, stav: 'puvodni', domacnost: 'bezna', opatreni: o }, RULES, PRED);
  }
  function vKonfig() {
    var head = pageHead('Konfigurátor', 'Sestavte si svůj dům', 'Zapínejte opatření a sledujte, jak se mění cena, úspora, možná podpora a splátka. Pro přesný výpočet použijte kalkulačku.', '', '<div class="crumbs"><a href="#rekonstrukce" data-go="rekonstrukce">Řešení pro dům</a><span>/</span>Konfigurátor</div>');
    return head + '<section class="sec-sm" style="padding-top:0"><div class="wrap cfg" id="cfg">' + cfgInner() + '</div></section>';
  }
  function cfgInner() {
    var c = S.cfg, r = cfgResult();
    var rokOpts = [[1955, 'před 1960'], [1975, '1960 až 1989'], [1995, '1990 až 2001'], [2008, '2002 až 2012']];
    var stage = '<div style="display:grid;gap:12px;min-width:0"><div class="cfg-stage" id="cfg-stage">' + IL.house({ okna: c.on.okna, fasada: c.on.fasada, strecha: c.on.strecha, tc: c.on.tc, fve: c.on.fve, elektro: c.on.elektro, koure: c.vytapeni !== 'elektrina' && c.vytapeni !== 'tc', labels: true, hl: c.hl, alt: 'Váš dům podle zapnutých opatření' }) + '</div>' +
      '<div class="toggles">' + CFG_T.map(function (t) { return '<button type="button" class="tgl" data-act="cfg-t" data-k="' + t.k + '" aria-pressed="' + (!!c.on[t.k]) + '">' + t.t + '<small>' + t.s + '</small></button>'; }).join('') + '</div>' +
      '<div class="fields c3" style="margin-top:8px"><div class="field"><label for="cfg-plocha">Plocha domu: <span id="cfg-pl">' + c.plocha + '</span> m²</label><input type="range" class="range" id="cfg-plocha" min="70" max="300" step="5" value="' + c.plocha + '"></div>' +
      '<div class="field"><label for="cfg-rok">Rok dokončení</label><select class="inp sm" id="cfg-rok">' + rokOpts.map(function (x) { return '<option value="' + x[0] + '"' + (c.rok == x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="cfg-vyt">Dnes topíte</label><select class="inp sm" id="cfg-vyt">' + ['plyn', 'elektrina', 'uhli', 'drevo'].map(function (k) { return '<option value="' + k + '"' + (c.vytapeni === k ? ' selected' : '') + '>' + EN.VYTAPENI[k] + '</option>'; }).join('') + '</select></div></div></div>';
    var any = CFG_T.some(function (t) { return c.on[t.k]; });
    var panel = '<div class="cfg-panel">' + (any ? dash(r, { title: 'Orientační ekonomika', compact: true }) : '<div class="panel"><b>Zapněte první opatření.</b><span class="muted">Cena, úspora a financování se spočítají hned.</span></div>') +
      (any && !r.komplexni && r.sumPodpora > r.uverLimit ? '<div class="note g"><span>Součet opatření je nad limitem 750 000 Kč pro dílčí opatření. S celou obálkou včetně podlahy a obnovitelným zdrojem jde o komplexní renovaci s limitem 2 000 000 Kč.</span></div>' : '') +
      '<div class="btns"><button type="button" class="btn btn-primary" data-act="cfg-calc">Spočítat přesně' + arrow() + '</button>' + go_('kontakt', 'Nezávazná konzultace', 'btn btn-ghost', 'konfigurator-konzultace') + '</div></div>';
    return stage + panel;
  }
  function cfgRefresh() { var el = $('#cfg'); if (el) { el.innerHTML = cfgInner(); bindCfg(); } }
  function bindCfg() {
    var pl = $('#cfg-plocha');
    if (pl) pl.addEventListener('input', function () { $('#cfg-pl').textContent = pl.value; });
    if (pl) pl.addEventListener('change', function () { S.cfg.plocha = +pl.value; S.cfg.hl = null; cfgRefresh(); });
    var rk = $('#cfg-rok'); if (rk) rk.addEventListener('change', function () { S.cfg.rok = +rk.value; S.cfg.hl = null; cfgRefresh(); });
    var vy = $('#cfg-vyt'); if (vy) vy.addEventListener('change', function () { S.cfg.vytapeni = vy.value; S.cfg.hl = null; cfgRefresh(); });
  }

  /* ---------- REALIZACE ---------- */
  function vRealizace() {
    var list = OB.realizace.filter(function (p) { return S.filtr === 'vse' || p.typy.indexOf(S.filtr) >= 0; });
    return pageHead('Realizace', 'Realizace', 'Každý projekt s rozsahem, cenou, časem a financováním.', '') +
      '<section class="sec-sm" style="padding-top:0"><div class="wrap"><div class="note w" style="margin-bottom:24px"><span>Ukázkový obsah prototypu. Před spuštěním ho nahradí skutečné realizace s fotografiemi před a po.</span></div><div class="filters" role="group" aria-label="Filtr realizací">' +
      OB.filtry.map(function (f) { return '<button type="button" class="chip" data-act="filtr" data-val="' + f.key + '" aria-pressed="' + (S.filtr === f.key) + '">' + f.nazev + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="projects p3">' + list.map(projCard).join('') + '</div>' : '<p class="muted">V této kategorii zatím nic není.</p>') + '</div></section>' + finalCta();
  }
  function vProjekt(p) {
    var crumbs = '<div class="crumbs"><a href="#realizace" data-go="realizace">Realizace</a><span>/</span>' + esc(p.lokalita) + '</div>';
    var head = '<section class="phead"><div class="gridbg" aria-hidden="true"><i class="b1"></i></div><div class="wrap phead-in">' + crumbs + '<span class="tag" style="justify-self:start">Ukázkový projekt</span><h1 class="h1">' + esc(p.nazev) + '</h1><p class="lead">' + esc(p.lokalita) + ' · ' + p.typy.map(typLabel).join(', ') + '</p></div></section>';
    var ba = '<section class="sec-sm" style="padding-top:0"><div class="wrap proj-ba"><figure class="ba-card big">' + photo(p.foto, { eager: true }) + '<figcaption class="cap">Po</figcaption></figure><figure class="ba-card">' + photo(p.fotoPred) + '<figcaption class="cap old">Před</figcaption></figure></div></section>';
    var facts = '<section class="sec-sm surface"><div class="wrap"><div class="kv" style="margin-bottom:40px"><div><span>Lokalita</span><b>' + esc(p.lokalita) + '</b></div><div><span>Cena</span><b>' + kc(p.cena) + '</b></div><div><span>Čas realizace</span><b>' + esc(p.cas) + '</b></div><div><span>Technologie</span><b>' + esc(p.technologie.join(', ')) + '</b></div><div><span>NZÚ a financování</span><b>' + esc(p.financovani) + '</b></div><div><span>Výsledek</span><b>' + esc(p.vysledek) + '</b></div></div>' +
      '<div class="two even"><div style="display:grid;gap:14px;align-content:start">' + eyebrow('Zadání klienta') + '<p class="lead" style="max-width:44ch">' + esc(p.zadani) + '</p>' + eyebrow('Návrh') + '<p style="margin:0;max-width:52ch">' + esc(p.navrh) + '</p></div>' +
      '<div style="display:grid;gap:14px;align-content:start">' + eyebrow('Rozsah') + '<ul class="list">' + p.rozsah.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><div class="btns" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="podobne" data-id="' + p.id + '">Chci podobné řešení' + arrow() + '</button></div></div></div></div></section>';
    return head + ba + facts;
  }

  /* ---------- O NÁS ---------- */
  function vONas() {
    var head = pageHead('O nás', 'Proč vzniklo Na rovinu.', '', '');
    var why = '<section class="sec-sm" style="padding-top:0"><div class="wrap two"><div class="prose" style="font-size:19px"><p>Kdo dnes rekonstruuje dům, většinou shání zvlášť firmu na okna, na topení, na elektro, na fotovoltaiku a k tomu projektanta. Každý řeší svůj kus. Za celek neodpovídá nikdo.</p><p>NA ROVINU vzniklo proto, aby měl majitel domu jeden kontakt a jednu odpovědnost za celý projekt. Od prvního měření po servis.</p></div>' +
      '<div class="split2"><div class="panel"><b class="mono muted">DNES</b><ul class="list" style="opacity:.75"><li>Firma na okna</li><li>Firma na topení</li><li>Elektrikář</li><li>Firma na fotovoltaiku</li><li>Projektant</li><li>Žádost o podporu sami</li></ul></div><div class="panel dark"><b class="mono" style="color:rgba(255,255,255,.65)">NA ROVINU</b><div class="big" style="font-size:clamp(28px,3vw,40px)">Jeden kontakt.<br>Jedna odpovědnost.</div><span class="muted">Jeden rozpočet, jeden harmonogram, jeden stavbyvedoucí.</span></div></div></div></section>';
    var proc = '<section class="sec-sm"><div class="wrap"><div class="sec-head">' + eyebrow('Jak to probíhá') + '<h2 class="h2">Jak to probíhá</h2></div>' + processList(true) + '</div></section>';
    var trust = '<section class="sec-sm surface"><div class="wrap two"><div style="display:grid;gap:18px;align-content:start">' + eyebrow('Důvěryhodnost') + '<h2 class="h3" style="font-size:clamp(26px,3vw,40px)">Jen doložitelné údaje</h2><p class="muted" style="margin:0;max-width:40ch">Tato část se před spuštěním vyplní skutečnými a ověřitelnými informacemi.</p></div>' +
      '<div class="kv">' + [['Tým', 'Jména, role a fotky'], ['IČO a sídlo', OB.firma.ico], ['Oprávnění', 'Živnostenská a odborná oprávnění'], ['Certifikace', 'Například montáž TČ a FVE'], ['Pojištění', 'Odpovědnost za škodu'], ['Partneři a výrobci', 'Technologičtí partneři'], ['Záruky', 'Délka záruk podle divizí'], ['Servis', 'Servisní podmínky'], ['Reference', 'Skutečné realizace a hodnocení']].map(function (x) { return '<div><span>' + x[0] + '</span><b style="font-weight:600;color:var(--graphite)">' + x[1] + ' · doplní klient</b></div>'; }).join('') + '</div></div></section>';
    return head + why + proc + trust + finalCta();
  }

  /* ---------- PORADNA ---------- */
  function vPoradna() {
    var temata = ['vse'].concat(OB.poradna.map(function (a) { return a.tema; }).filter(function (t, i, arr) { return arr.indexOf(t) === i; }));
    var list = OB.poradna.filter(function (a) { return S.tema === 'vse' || a.tema === S.tema; });
    return pageHead('Poradna', 'Poradna', 'NZÚ, financování, rekonstrukce a technologie domu. Krátce a bez prodejních řečí.', '') +
      '<section class="sec-sm" style="padding-top:0"><div class="wrap"><div class="filters" role="group" aria-label="Témata">' + temata.map(function (t) { return '<button type="button" class="chip" data-act="tema" data-val="' + esc(t) + '" aria-pressed="' + (S.tema === t) + '">' + (t === 'vse' ? 'Vše' : esc(t)) + '</button>'; }).join('') + '</div>' +
      '<ul class="rows">' + list.map(function (a) { return '<li><a class="row" href="#poradna-' + a.slug + '" data-go="poradna-' + a.slug + '"><div><span class="mono muted">' + esc(a.tema) + ' · ' + a.cteni + '</span><span class="h3" style="display:block;margin-top:6px">' + esc(a.nazev) + '</span><p>' + esc(a.perex) + '</p></div><span class="go" aria-hidden="true">→</span></a></li>'; }).join('') + '</ul></div></section>';
  }
  function vClanek(a) {
    var crumbs = '<div class="crumbs"><a href="#poradna" data-go="poradna">Poradna</a><span>/</span>' + esc(a.tema) + '</div>';
    return '<section class="phead"><div class="gridbg" aria-hidden="true"><i class="b1"></i></div><div class="wrap phead-in">' + crumbs + '<h1 class="h1" style="max-width:22ch">' + esc(a.nazev) + '</h1><p class="lead" style="max-width:56ch">' + esc(a.perex) + '</p><span class="mono muted">' + a.cteni + ' čtení</span></div></section>' +
      '<section class="sec-sm" style="padding-top:0"><div class="wrap two"><div class="article" style="font-size:18px">' + a.telo.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<aside class="side"><div class="panel nzu">' + eyebrow('Váš dům', 'nzu') + '<b style="font-size:20px">Spočítejte si to na svém domě.</b><span class="muted">Cena, financování, splátka a úspora za pár minut.</span>' + go_('nzu-kalkulacka', 'Spočítat možnosti' + arrow(), 'btn btn-nzu', 'clanek') + '</div></aside></div></section>';
  }

  /* ---------- POPTÁVKA ---------- */
  var LSTEPS = ['Co chcete řešit?', 'Kde je dům?', 'Kdy chcete realizovat?', 'Fotografie a dokumentace', 'Kontakt'];
  var LSERV = ['Okna a dveře', 'Rekonstrukce domu', 'Zateplení', 'Střecha', 'Tepelné čerpadlo', 'Fotovoltaika', 'Elektro', 'Novostavba', 'Nevím, poraďte'];
  function contactBox() {
    var f = OB.firma;
    return '<div class="panel" style="gap:8px">' + eyebrow('Kontakt') + '<div class="contact-box">' +
      '<div><span>Telefon</span><a href="tel:' + f.telefon.replace(/\s/g, '') + '" data-act="phone" style="text-decoration:none"><b>' + esc(f.telefon) + '</b></a><button type="button" data-act="copy" data-val="' + esc(f.telefon) + '" data-kind="phone">Kopírovat číslo</button></div>' +
      '<div><span>E-mail</span><a href="mailto:' + esc(f.email) + '" data-act="email" style="text-decoration:none"><b>' + esc(f.email) + '</b></a><button type="button" data-act="copy" data-val="' + esc(f.email) + '" data-kind="email">Kopírovat adresu</button></div>' +
      '<div><span>Sídlo</span><b style="font-size:16px;font-weight:600">' + esc(f.sidlo) + '</b></div></div><p class="muted" style="margin:8px 0 0;font-size:13px">Telefon a sídlo jsou zástupné údaje prototypu.</p></div>';
  }
  function vKontakt() {
    var L = S.lead;
    var head = pageHead('Kontakt', 'Nezávazná konzultace', L.fromCalc ? 'Pošlete nám výpočet k ověření. Technik zkontroluje plochy, stav domu a podmínky NZÚ.' : 'Pět krátkých kroků. Stačí, co víte teď.', '');
    var body;
    if (L.sent) {
      body = '<div class="lead-form"><h2 class="h2">Hotovo.</h2><p class="lead">Poptávka je připravená k předání do CRM.</p><div class="note w"><span>V prototypu se nic neodesílá. V ostrém provozu se data níže pošlou do CRM a obchodník se ozve.</span></div>' +
        '<details class="panel"><summary style="cursor:pointer;font-weight:700">Data pro CRM</summary><pre style="white-space:pre-wrap;font-family:var(--f-body);font-size:12.5px;margin:12px 0 0;overflow-x:auto">' + esc(JSON.stringify(L.payload, null, 2)) + '</pre></details>' +
        '<div class="btns"><button type="button" class="btn btn-ghost" data-act="lead-new">Nová poptávka</button>' + go_('domu', 'Zpět na úvod', 'link') + '</div></div>';
    } else {
      var st = L.step, inner = '';
      if (st === 0) inner = '<div class="opts c2" data-multi-lead="sluzby">' + LSERV.map(function (s) { return opt(s, s, L.sluzby.indexOf(s) >= 0, '', 'lead-sluzby'); }).join('') + '</div>';
      if (st === 1) inner = '<div class="fields c2"><div class="field"><label for="l-psc">PSČ</label><input class="inp" id="l-psc" inputmode="numeric" maxlength="6" value="' + esc(L.psc) + '" autocomplete="postal-code"></div><div class="field"><label for="l-obec">Obec</label><input class="inp sm" id="l-obec" value="' + esc(L.obec) + '" autocomplete="address-level2" style="min-height:62px"></div></div>';
      if (st === 2) inner = '<div class="opts c2" data-single-lead="termin">' + ['Do 3 měsíců', 'Do půl roku', 'Do roka', 'Zatím zjišťuji'].map(function (s) { return opt(s, s, L.termin === s, '', 'lead-termin'); }).join('') + '</div>';
      if (st === 3) inner = '<label class="drop" id="drop"><input type="file" id="l-files" multiple accept="image/*,.pdf,.dwg,.doc,.docx"><b>Přetáhněte fotky nebo dokumenty</b><span class="muted">nebo klikněte a vyberte soubory. Fotky domu, projekt, průkaz energetické náročnosti.</span></label>' +
        (L.files.length ? '<ul class="files">' + L.files.map(function (f, k) { return '<li><span>' + esc(f.name) + '</span><span>' + Math.max(1, Math.round(f.size / 1024)) + ' kB <button type="button" class="link" data-act="file-rm" data-k="' + k + '" style="font-size:12px">odebrat</button></span></li>'; }).join('') + '</ul>' : '<p class="muted" style="margin:0">Tento krok můžete přeskočit.</p>');
      if (st === 4) inner = '<div class="fields"><div class="field"><label for="l-jmeno">Jméno a příjmení</label><input class="inp sm" id="l-jmeno" value="' + esc(L.jmeno) + '" autocomplete="name" style="min-height:58px"></div><div class="fields c2"><div class="field"><label for="l-tel">Telefon</label><input class="inp sm" id="l-tel" type="tel" value="' + esc(L.telefon) + '" autocomplete="tel" style="min-height:58px"></div><div class="field"><label for="l-email">E-mail</label><input class="inp sm" id="l-email" type="email" value="' + esc(L.email) + '" autocomplete="email" style="min-height:58px"></div></div>' +
        '<div class="field"><label for="l-pozn">Poznámka (nepovinné)</label><textarea class="inp" id="l-pozn">' + esc(L.pozn) + '</textarea></div><label class="check"><input type="checkbox" id="l-souhlas"' + (L.souhlas ? ' checked' : '') + '><span>Souhlasím se zpracováním osobních údajů pro účely nabídky. <a href="#pravni" data-go="pravni" class="link">Zásady GDPR</a></span></label></div>' +
        (L.fromCalc && S.last ? '<div class="note g"><span>Přikládáme výpočet: investice ' + kc(S.last.investice) + ', ' + (S.last.light ? 'dotace ' + kc(S.last.dotace) : 'bezúročný úvěr ' + kc(S.last.uver)) + '.</span></div>' : '');
      body = '<form class="lead-form" id="lform" novalidate><div class="prog"><i style="width:' + (st / 5 * 100) + '%"></i></div><span class="qn mono muted">Krok ' + (st + 1) + ' z 5</span><h2 class="h2" style="font-size:clamp(28px,4vw,48px)">' + LSTEPS[st] + '</h2>' + inner +
        '<p class="err" id="l-err" hidden></p><div class="q-nav"><button type="submit" class="btn btn-primary">' + (st === 4 ? 'Odeslat poptávku' : st === 3 && !L.files.length ? 'Přeskočit' : 'Pokračovat') + arrow() + '</button>' + (st > 0 ? '<button type="button" class="back" data-act="l-back">Zpět</button>' : '') + '</div></form>';
    }
    return head + '<section class="sec-sm" style="padding-top:0"><div class="wrap two form">' + '<div style="min-width:0">' + body + '</div><aside class="side">' + contactBox() + '</aside></div></section>';
  }

  function utm() {
    var p = {}; try { var q = new URLSearchParams(location.search); ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { if (q.get(k)) p[k] = q.get(k); }); } catch (e) { }
    return p;
  }
  function submitLead() {
    var L = S.lead, err = function (t) { var e = $('#l-err'); e.hidden = false; e.textContent = t; };
    if (L.step === 0 && !L.sluzby.length) return err('Vyberte alespoň jednu oblast.');
    if (L.step === 1) { var ps = $('#l-psc').value.replace(/\s/g, ''); L.obec = $('#l-obec').value.trim(); if (!/^\d{5}$/.test(ps) && !L.obec) return err('Zadejte PSČ nebo obec.'); L.psc = ps; }
    if (L.step === 2 && !L.termin) return err('Vyberte termín.');
    if (L.step === 4) {
      L.jmeno = $('#l-jmeno').value.trim(); L.telefon = $('#l-tel').value.trim(); L.email = $('#l-email').value.trim(); L.pozn = $('#l-pozn').value.trim(); L.souhlas = $('#l-souhlas').checked;
      if (!L.jmeno) return err('Doplňte jméno.');
      if (!L.telefon && !L.email) return err('Doplňte telefon nebo e-mail, ať se vám můžeme ozvat.');
      if (L.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(L.email)) return err('E-mail nemá správný tvar.');
      if (!L.souhlas) return err('Bez souhlasu se zpracováním údajů poptávku nemůžeme přijmout.');
      var r = S.last, d = S.calc.data;
      L.payload = {
        jmeno: L.jmeno, telefon: L.telefon, email: L.email,
        lokalita: { psc: L.psc || d.psc, obec: L.obec || d.obec },
        sluzby: L.sluzby, typDomu: d.typ || null,
        pozadovaneReseni: d.vyber && d.vyber.length ? d.vyber : L.sluzby,
        vysledekKalkulace: L.fromCalc && r ? { rezim: r.rezim, investice: r.investice, uver: r.uver, dotace: r.dotace, vlastni: r.vlastni, splatka: r.splatka, uspora: r.uspora } : null,
        rozpocet: r ? r.investice : null, termin: L.termin, poznamka: L.pozn,
        utm: utm(), zdrojLeadu: L.fromCalc ? 'kalkulacka' : 'formular', referrer: document.referrer || null,
        dokumenty: L.files.map(function (f) { return { nazev: f.name, velikost: f.size, typ: f.type }; }),
        vytvoreno: new Date().toISOString()
      };
      L.sent = true;
      track('lead_submit', { zdroj: L.payload.zdrojLeadu, sluzby: L.sluzby.join('|') });
      render(); window.scrollTo(0, 0); return;
    }
    L.step++; render(); window.scrollTo(0, 0);
  }

  /* ---------- PLÁN MODERNIZACE (dokument pro PDF) ---------- */
  function vPlan() {
    var r = S.last;
    if (!r) return '<section class="wrap empty"><h1 class="h2">Plán modernizace domu</h1><p class="lead">Plán vznikne z výsledku kalkulačky. Zadejte údaje o domě a plán se vyplní sám.</p>' + go_('nzu-kalkulacka', 'Řešit můj dům' + arrow(), 'btn btn-primary', 'plan-prazdny') + '</section>';
    var d = S.calc.data, today = new Date().toLocaleDateString('cs-CZ');
    var doc = '<article class="doc" aria-label="Plán modernizace domu"><div class="doc-head"><div style="display:grid;gap:8px"><span class="logo">' + logoMark() + '</span><h1 class="h3" style="font-size:30px">Plán modernizace domu</h1></div><div class="mono muted" style="text-align:right">Předběžná kalkulace<br>' + today + '</div></div>' +
      '<div><h3>Základní údaje domu</h3><div class="kv"><div><span>Typ</span><b>' + esc(({ rd: 'Rodinný dům', dvojdum: 'Dvojdům', radovy: 'Řadový dům', rekreacni: 'Rekreační stavba', usedlost: 'Usedlost' })[d.typ] || 'Rodinný dům') + '</b></div><div><span>Rok dokončení</span><b>' + d.rok + '</b></div><div><span>Plocha</span><b>' + n(d.plocha) + ' m²</b></div><div><span>Podlaží</span><b>' + esc((EN.PODLAZI[d.podlazi] || {}).label || '') + '</b></div><div><span>Vytápění</span><b>' + esc(EN.VYTAPENI[d.vytapeni] || '') + '</b></div><div><span>PSČ</span><b>' + esc(d.psc) + '</b></div></div></div>' +
      '<div><h3>Zvolená opatření a orientační investice</h3><div class="tbl-wrap" style="border:0"><table class="tbl" style="min-width:520px"><tbody>' + r.polozky.map(function (it) { return '<tr><td>' + esc(it.nazev) + '<span class="sub">' + (it.mimo ? esc(it.mimo) : 'NZÚ ' + esc(it.kod || '')) + '</span></td><td class="n">' + kc(it.cena) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr><td>Orientační investice</td><td class="n">' + kc(r.investice) + '</td></tr></tfoot></table></div></div>' +
      '<div><h3>NZÚ a financování</h3><div class="kv"><div><span>Program</span><b>' + (r.light ? 'NZÚ Light' : 'Bezúročný úvěr NZÚ') + '</b></div><div><span>Režim</span><b>' + ({ dilci: 'Dílčí opatření', komplexni: 'Komplexní renovace', light: 'Přímá dotace' })[r.rezim] + '</b></div><div><span>Možná dotace</span><b>' + kc(r.dotace) + '</b></div><div><span>Bezúročný úvěr</span><b>' + kc(r.uver) + '</b></div><div><span>Vlastní zdroje</span><b>' + kc(r.vlastni) + '</b></div><div><span>Splátka</span><b>' + (r.splatka ? kcm(r.splatka) + ', ' + r.doba + ' let' : '0 Kč') + '</b></div></div></div>' +
      '<div><h3>Očekávané úspory</h3><div class="kv"><div><span>Energie dnes</span><b>' + kcm(r.nakladyPred) + '</b></div><div><span>Energie po</span><b>' + kcm(r.nakladyPo) + '</b></div><div><span>Úspora</span><b style="color:var(--green)">' + kcm(r.uspora) + '</b></div></div></div>' +
      '<div><h3>Doporučený postup</h3><ol class="recs">' + r.postup.map(function (p) { return '<li><div><b>' + esc(p.t) + '</b><span>' + esc(p.d) + '</span></div></li>'; }).join('') + '</ol></div>' +
      '<div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-top:3px solid var(--ink);padding-top:18px"><div><b>NA ROVINU</b><br><span class="muted">' + esc(OB.firma.telefon) + ' · ' + esc(OB.firma.email) + '</span></div><div style="width:120px">' + IL.stripes() + '</div></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Předběžná kalkulace podle Závazných pokynů NZÚ ve znění platném od 24. 6. 2026 a orientačního ceníku. Výsledek podléhá ověření technikem a bankou.</p></article>';
    var send = '<div class="wrap" style="max-width:900px;display:grid;gap:14px;padding-bottom:24px"><form id="pdfform" class="panel" novalidate style="gap:12px"><b>Poslat plán jako PDF</b><div class="fields c2" style="align-items:end"><div class="field"><label for="pdf-email">E-mail</label><input class="inp sm" id="pdf-email" type="email" autocomplete="email" style="min-height:54px"></div><button type="submit" class="btn btn-primary">Poslat PDF' + arrow() + '</button></div><p class="err" id="pdf-err" hidden></p><p class="muted" id="pdf-ok" style="margin:0;font-size:14px">PDF se generuje na serveru. V prototypu se nic neodesílá.</p></form></div>';
    return '<section class="sec-sm"><div class="wrap" style="display:grid;gap:24px"><div class="crumbs" style="max-width:900px;margin-inline:auto;width:100%"><a href="#nzu-kalkulacka" data-go="nzu-kalkulacka">Výsledek kalkulace</a><span>/</span>Plán modernizace</div>' + doc + '</div></section>' + send;
  }

  /* ---------- PRAVIDLA ---------- */
  function vPravidla() {
    var head = pageHead('Transparentnost', 'Pravidla kalkulačky', esc(RULES.meta.poznamka), go_('nzu-kalkulacka', 'Spustit NZÚ kalkulačku' + arrow(), 'btn btn-nzu', 'pravidla'));
    var cols = ['Kód', 'Opatření', 'Program', 'Podpora', 'Minimum', 'Kombinace', 'Omezení', 'Platnost', 'Zdroj a verze', 'Poznámka'];
    var rows = RULES.pravidla.map(function (r) {
      return '<tr><td><code>' + r.kod + '</code></td><td>' + esc(r.nazev) + '</td><td>' + r.program + '</td><td class="n">' + sazba(r) + '</td><td class="n">' + (r.minimum ? r.minimum + ' ' + r.jednotka : '') + '</td><td style="min-width:200px">' + esc(r.kombinace.join('; ')) + '</td><td style="min-width:220px">' + esc(r.omezeni.join('; ')) + '</td><td>od ' + r.platnostOd.split('-').reverse().join('. ') + (r.platnostDo ? ' do ' + r.platnostDo : '') + '</td><td><a class="link" href="' + r.odkaz + '" target="_blank" rel="noopener">' + esc(r.zdroj) + '</a><span class="sub">' + esc(r.verzeDokumentu) + '</span></td><td style="min-width:180px">' + esc(r.poznamka || '') + '</td></tr>';
    }).join('');
    var lim = RULES.limity.map(function (l) { return '<tr><td><code>' + l.kod + '</code></td><td>' + esc(l.nazev) + '</td><td>' + l.program + '</td><td class="n">' + (l.jednotka === 'Kč' ? kc(l.hodnota) : l.hodnota + ' ' + l.jednotka) + '</td></tr>'; }).join('');
    return head + '<section class="sec-sm" style="padding-top:0"><div class="wrap" style="display:grid;gap:40px"><div style="display:grid;gap:16px"><h2 class="h3">Limity programu</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kód</th><th>Limit</th><th>Program</th><th class="n">Hodnota</th></tr></thead><tbody>' + lim + '</tbody></table></div></div>' +
      '<div style="display:grid;gap:16px"><h2 class="h3">Pravidla opatření</h2><div class="tbl-wrap"><table class="tbl" style="min-width:1400px"><thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div style="display:grid;gap:16px"><h2 class="h3">Ceník a energetické předpoklady</h2><p class="muted" style="margin:0">' + esc(PRED.meta.poznamka) + '</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Položka</th><th>Jednotka</th><th class="n">Cena</th></tr></thead><tbody>' + Object.keys(PRED.cenik).map(function (k) { var c = PRED.cenik[k]; return '<tr><td>' + esc(c.nazev) + '</td><td>' + c.jednotka.replace('m2', 'm²') + '</td><td class="n">' + kc(c.cena) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div></section>';
  }

  function vPravni() { var Z = OB.fotoZdroje; return pageHead('Právní informace', 'GDPR, cookies a obchodní podmínky', 'Texty dodá klient nebo jeho právník. Tady bude zpracování osobních údajů, nastavení cookies a obchodní podmínky.', '') + '<section class="sec-sm" style="padding-top:0"><div class="wrap" style="display:grid;gap:28px">' + placeholder('Obsah doplní klient před spuštěním webu.') + '<div class="panel"><b>Zdroje fotografií</b><p class="muted" style="margin:0">' + esc(Z.poznamka) + ' <a class="link" href="' + Z.licence + '" target="_blank" rel="noopener">Licence Pexels</a></p><ul class="list">' + Z.polozky.map(function (x) { return '<li><span>' + esc(x.soubor) + ': <a class="link" href="' + x.url + '" target="_blank" rel="noopener">' + x.url.replace('https://www.', '') + '</a></span></li>'; }).join('') + '</ul></div></div></section>'; }
  function v404() { return '<section class="wrap empty"><h1 class="h2">Tahle stránka tu není.</h1><p class="lead">Odkaz je možná starý. Začněte domem.</p>' + go_('domu', 'Na úvod' + arrow(), 'btn btn-primary') + '</section>'; }

  /* ---------- události ---------- */
  function after() {
    var qf = $('#qform');
    if (qf) {
      qf.addEventListener('submit', function (e) { e.preventDefault(); submitQ(); });
      var hk = S.calc.helper; if (hk && $('#helper')) { helperCompute(hk); $$('[data-h]').forEach(function (i) { i.addEventListener('input', function () { helperCompute(hk); }); }); }
    }
    var lf = $('#lform'); if (lf) lf.addEventListener('submit', function (e) { e.preventDefault(); submitLead(); });
    var fi = $('#l-files');
    if (fi) {
      fi.addEventListener('change', function () { Array.prototype.forEach.call(fi.files, function (f) { S.lead.files.push({ name: f.name, size: f.size, type: f.type }); }); render(); });
      var dr = $('#drop'); ['dragenter', 'dragover'].forEach(function (ev) { dr.addEventListener(ev, function () { dr.classList.add('over'); }); }); ['dragleave', 'drop'].forEach(function (ev) { dr.addEventListener(ev, function () { dr.classList.remove('over'); }); });
    }
    var pf = $('#pdfform');
    if (pf) pf.addEventListener('submit', function (e) {
      e.preventDefault(); var v = $('#pdf-email').value.trim(), er = $('#pdf-err');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { er.hidden = false; er.textContent = 'Zadejte e-mail ve tvaru jmeno@domena.cz.'; return; }
      er.hidden = true; track('pdf_download', { zpusob: 'email' }); $('#pdf-ok').textContent = 'Připraveno. V ostrém provozu přijde PDF na ' + v + '. V prototypu se nic neodesílá.';
    });
    if ($('#cfg')) bindCfg();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-act],[data-opt]');
    if (!t) return;
    if (t.dataset.go) {
      e.preventDefault();
      if (t.dataset.cta) track('cta_click', { cta: t.dataset.cta, cil: t.dataset.go });
      if (t.dataset.svc) track('service_select', { sluzba: t.dataset.svc });
      if (t.dataset.pre) preselect(t.dataset.pre.split(','));
      closeMenu();
      go(t.dataset.go);
      return;
    }
    var a = t.dataset.act;
    if (t.dataset.opt !== undefined && !a) { onOpt(t); return; }
    switch (a) {
      case 'menu': openMenu(); break;
      case 'menu-close': closeMenu(); break;
      case 'q-back': S.calc.i = Math.max(0, S.calc.i - 1); S.calc.helper = null; renderCalcOnly(); break;
      case 'fill': var el = $('#' + t.dataset.target); if (el) { el.value = t.dataset.val; el.dispatchEvent(new Event('input')); } break;
      case 'helper': S.calc.helper = S.calc.helper === t.dataset.kind ? null : t.dataset.kind; keepFieldValues(); render(); var h = $('#helper'); if (h) h.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); break;
      case 'roof': S.calc.helperRoof = t.dataset.val; keepFieldValues(); render(); break;
      case 'helper-use':
        var val = helperCompute(t.dataset.kind);
        var target = { plocha: 'f-plocha', fasada: 'f-fasada', strecha: 'f-strecha', strop: 'f-strop', podlaha: 'f-podlaha', okna: 'f-okna' }[t.dataset.kind];
        var inp = $('#' + target); if (inp) inp.value = val; S.calc.helper = null; var hh = $('#helper'); if (hh) hh.remove(); toast('Hodnota doplněna: ' + n(val) + ' m²'); break;
      case 'calc-edit': S.calc.done = false; S.calc.i = 0; render(); window.scrollTo(0, 0); break;
      case 'overit': S.lead.fromCalc = true; S.lead.sent = false; S.lead.step = 0; S.lead.sluzby = mapToLead(S.calc.data.vyber); track('cta_click', { cta: 'nechat-overit' }); go('kontakt'); break;
      case 'add-measure': addMeasure(t.dataset.m); break;
      case 'cfg-t': var k = t.dataset.k; S.cfg.on[k] = !S.cfg.on[k]; S.cfg.hl = S.cfg.on[k] ? k : null; track('service_select', { konfigurator: k, zapnuto: S.cfg.on[k] }); cfgRefresh(); break;
      case 'cfg-calc': cfgToCalc(); break;
      case 'filtr': S.filtr = t.dataset.val; render(); break;
      case 'tema': S.tema = t.dataset.val; render(); break;
      case 'podobne': var p = OB.realizace.filter(function (x) { return x.id === t.dataset.id; })[0]; S.lead = Object.assign(S.lead, { step: 0, sent: false, fromCalc: false, sluzby: p.typy.map(typToLead).filter(Boolean), pozn: 'Podobné řešení jako: ' + p.nazev + ' (' + p.lokalita + ')' }); track('cta_click', { cta: 'chci-podobne', projekt: p.id }); go('kontakt'); break;
      case 'l-back': S.lead.step = Math.max(0, S.lead.step - 1); render(); break;
      case 'lead-new': S.lead = { step: 0, sluzby: [], psc: '', obec: '', termin: null, files: [], jmeno: '', telefon: '', email: '', pozn: '', souhlas: false, sent: false, fromCalc: false, payload: null }; render(); break;
      case 'file-rm': S.lead.files.splice(+t.dataset.k, 1); render(); break;
      case 'phone': track('phone_click'); break;
      case 'email': track('email_click'); break;
      case 'copy':
        track(t.dataset.kind === 'phone' ? 'phone_click' : 'email_click', { zpusob: 'kopirovat' });
        var txt = t.dataset.val;
        try { navigator.clipboard.writeText(txt).then(function () { toast('Zkopírováno: ' + txt); }, function () { selectText(t); }); } catch (er) { selectText(t); }
        break;
      case 'proto-hide': $('#proto').hidden = true; break;
    }
  });

  function selectText(btn) { var b = btn.parentElement.querySelector('b'); if (!b) return; var r = document.createRange(); r.selectNodeContents(b); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('Označeno, zkopírujte pomocí Ctrl+C'); }

  function keepFieldValues() {
    var q = currentQ(), d = S.calc.data;
    if (q.key === 'plocha') { var v = readNum('f-plocha'); if (v) d.plocha = v; }
    if (q.m) { var map = { okna: 'f-okna', fasada: 'f-fasada', strecha: 'f-strecha', strop: 'f-strop', podlaha: 'f-podlaha' }; if (map[q.m]) { var x = readNum(map[q.m]); if (x) { d.o[q.m] = d.o[q.m] || {}; d.o[q.m].plocha = x; } } }
  }

  function onOpt(t) {
    var name = t.dataset.opt, val = t.dataset.val, d = S.calc.data;
    if (name === 'vyber') {
      var i = d.vyber.indexOf(val);
      if (i >= 0) d.vyber.splice(i, 1); else { d.vyber.push(val); if (val === 'komplet') applyKomplet(d); }
      track('service_select', { opatreni: val, vybrano: i < 0 });
      saveDraft(); keepScrollRender(); return;
    }
    if (['typ', 'podlazi', 'vytapeni', 'stav', 'domacnost'].indexOf(name) >= 0) {
      d[name] = val; saveDraft();
      if (!S.calc.started) { S.calc.started = true; track('calc_start'); }
      if (name === 'domacnost') { keepScrollRender(); return; }
      submitQ(); return;
    }
    if (name.indexOf('.') > 0) {
      var parts = name.split('.'), m = parts[0], f = parts[1];
      keepFieldValues();
      var o = d.o[m] = d.o[m] || {};
      readDetailNums(m, o);
      var isToggle = t.closest('[data-toggle-d]');
      if (isToggle) o[f] = f === 'tuv' ? (o.tuv === false ? true : false) : !o[f];
      else o[f] = f === 'existujici' ? val === '1' : val;
      saveDraft(); keepScrollRender(); return;
    }
    if (name === 'lead-sluzby') { var L = S.lead, j = L.sluzby.indexOf(val); if (j >= 0) L.sluzby.splice(j, 1); else L.sluzby.push(val); keepScrollRender(); return; }
    if (name === 'lead-termin') { S.lead.termin = val; submitLead(); return; }
  }
  function readDetailNums(m, o) {
    var map = { okna: 'f-okna', fasada: 'f-fasada', strecha: 'f-strecha', strop: 'f-strop', podlaha: 'f-podlaha', zelena: 'f-zelena' };
    if (map[m]) { var v = readNum(map[m]); if (v) o.plocha = v; }
    if (m === 'okna') { var dv = readNum('f-dvere'); if (dv != null) o.dvere = dv; }
    if (m === 'fve') { var kw = readNum('f-kwp'); if (kw) o.kwp = kw; var kh = readNum('f-kwh'); if (kh != null) o.kwh = kh; }
  }
  function keepScrollRender() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  function preselect(list) {
    var d = S.calc.data;
    list.forEach(function (m) { if (!m) return; if (m === 'komplet') { if (d.vyber.indexOf('komplet') < 0) d.vyber.push('komplet'); applyKomplet(d); } else if (d.vyber.indexOf(m) < 0) d.vyber.push(m); });
    S.calc.done = false;
    S.calc.i = 0;
    saveDraft();
  }
  function addMeasure(m) {
    var d = S.calc.data;
    if (m === 'baterie') { d.o.fve = Object.assign({}, d.o.fve || {}, { baterie: true, kwh: (d.o.fve && d.o.fve.kwp) || 8 }); }
    else if (m === 'komplet') { if (d.vyber.indexOf('komplet') < 0) d.vyber.push('komplet'); applyKomplet(d); }
    else if (d.vyber.indexOf(m) < 0) d.vyber.push(m);
    track('service_select', { opatreni: m, zdroj: 'doporuceni' });
    finishCalc();
    toast('Přidáno do výpočtu');
  }
  function cfgToCalc() {
    var d = S.calc.data, c = S.cfg;
    d.typ = d.typ || 'rd'; d.rok = c.rok; d.plocha = c.plocha; d.podlazi = d.podlazi || 'p2'; d.vytapeni = c.vytapeni; d.stav = d.stav || 'puvodni';
    d.vyber = Object.keys(c.on).filter(function (k) { return c.on[k]; });
    if (c.on.fve) d.o.fve = Object.assign({ kwp: 8, baterie: true, kwh: 8, fazy: '3' }, d.o.fve || {});
    S.calc.done = false; S.calc.i = 4; saveDraft();
    track('cta_click', { cta: 'konfigurator-spocitat' });
    go('nzu-kalkulacka');
  }
  function mapToLead(v) {
    var m = { okna: 'Okna a dveře', fasada: 'Zateplení', strecha: 'Střecha', strop: 'Zateplení', podlaha: 'Zateplení', tc: 'Tepelné čerpadlo', fve: 'Fotovoltaika', baterie: 'Fotovoltaika', elektro: 'Elektro', komplet: 'Rekonstrukce domu', reku: 'Rekonstrukce domu' }, out = [];
    (v || []).forEach(function (k) { if (m[k] && out.indexOf(m[k]) < 0) out.push(m[k]); });
    return out;
  }
  function typToLead(t) { return { rekonstrukce: 'Rekonstrukce domu', okna: 'Okna a dveře', fve: 'Fotovoltaika', tc: 'Tepelné čerpadlo', zatepleni: 'Zateplení', elektro: 'Elektro', novostavby: 'Novostavba' }[t]; }

  function openMenu() { $('#mmenu').hidden = false; document.body.style.overflow = 'hidden'; var b = $('.burger'); if (b) b.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { var m = $('#mmenu'); if (m && !m.hidden) { m.hidden = true; document.body.style.overflow = ''; var b = $('.burger'); if (b) b.setAttribute('aria-expanded', 'false'); } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && S.route === 'nzu-kalkulacka' && S.calc.started && !S.calc.done) track('calc_abandon', { otazka: currentQ().key, duvod: 'skryto' }); });

  /* ---------- start ---------- */
  document.body.insertAdjacentHTML('afterbegin', IL.defs);
  document.body.classList.add('has-mcta');
  chrome();
  S.route = parse();
  render();
})();
