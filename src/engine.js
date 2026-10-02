/* NA ROVINU: výpočetní jádro kalkulačky.
   Čistá funkce: vstup domu + data pravidel NZÚ + ceník/předpoklady -> výsledek.
   Žádné sazby ani limity nejsou v tomto souboru; vše se čte z dat. */
(function (root) {
  'use strict';

  var PODLAZI = {
    p1:  { label: 'Přízemí', div: 1, vyska: 3.0 },
    p1k: { label: 'Přízemí a obytné podkroví', div: 1.7, vyska: 4.4 },
    p2:  { label: 'Dvě podlaží', div: 2, vyska: 6.0 },
    p2k: { label: 'Dvě podlaží a podkroví', div: 2.7, vyska: 7.4 },
    p3:  { label: 'Tři podlaží', div: 3, vyska: 9.0 }
  };

  var VYTAPENI = {
    plyn: 'Plynový kotel', elektrina: 'Elektřina (přímotop, akumulace)', tc: 'Tepelné čerpadlo',
    uhli: 'Kotel na uhlí', drevo: 'Dřevo, pelety, biomasa', jine: 'Jiné'
  };

  function r(n, step) { step = step || 1; return Math.round(n / step) * step; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }

  function odhadPloch(plocha, podlazi) {
    var p = PODLAZI[podlazi] || PODLAZI.p2;
    var fp = Math.max(20, plocha / p.div);
    var L = Math.sqrt(fp * 1.4), W = fp / L;
    var okna = Math.round(plocha * 0.16);
    var fasada = Math.max(0, Math.round(2 * (L + W) * p.vyska - okna - 2.2));
    return { pudorys: Math.round(fp), delka: +L.toFixed(1), sirka: +W.toFixed(1), okna: okna, fasada: fasada, strecha: Math.round(fp * 1.35), strop: Math.round(fp), podlaha: Math.round(fp) };
  }

  function ruleFor(rules, program, opatreni) {
    for (var i = 0; i < rules.pravidla.length; i++) {
      var x = rules.pravidla[i];
      if (x.program === program && x.opatreni === opatreni) return x;
    }
    return null;
  }
  function limit(rules, kod) {
    for (var i = 0; i < rules.limity.length; i++) if (rules.limity[i].kod === kod) return rules.limity[i].hodnota;
    return null;
  }
  function datum(rok) { return rok === 2013 ? '1. 7. 2013' : rok === 2023 ? '1. 1. 2023' : String(rok); }

  function calc(inp, rules, P) {
    var C = P.cenik, E = P.energie;
    var o = inp.opatreni || {};
    var rok = +inp.rok || 1980;
    var plocha = Math.max(20, +inp.plocha || 120);
    var stav = inp.stav || 'puvodni';
    var est = odhadPloch(plocha, inp.podlazi);
    var light = inp.domacnost === 'light';
    var program = light ? 'NZU-LIGHT' : 'NZU-RD-UVER';
    var has = function (k) { return !!o[k]; };
    var items = [], warn = [], tipy = [];
    function w(text, level) { warn.push({ text: text, level: level || 'w' }); }

    /* ---------- položky a ceny ---------- */
    function item(id, key, nazev, mnozstvi, jednotka, cena, opatreniRule, nzuMnozstvi, extra) {
      var it = { id: id, key: key, nazev: nazev, mnozstvi: mnozstvi, jednotka: jednotka, cena: r(cena, 1000), rule: opatreniRule, nzuMnozstvi: nzuMnozstvi == null ? mnozstvi : nzuMnozstvi, podpora: 0, limit: 0, mimo: null, kod: null };
      if (extra) for (var k in extra) it[k] = extra[k];
      items.push(it);
      return it;
    }

    if (has('okna')) {
      var ok = o.okna, mat = ok.material || 'plast';
      var plo = +ok.plocha || est.okna, dv = +ok.dvere || 0;
      var cOkna = plo * C['okna-' + mat].cena + dv * C.dvere.cena;
      item('okna', 'okna', 'Okna a dveře', plo, 'm²', cOkna, 'okna', plo + dv * C.dvere.plochaKs, { popis: C['okna-' + mat].nazev + (dv ? ', vchodové dveře ' + dv + ' ks' : '') });
      if (ok.stineni) {
        var st = Math.round(plo * 0.6);
        item('stineni', 'stineni', 'Venkovní stínění', st, 'm²', st * C.stineni.cena, 'stineni', st, { popis: C.stineni.nazev });
      }
    }
    if (has('fasada')) { var f = +o.fasada.plocha || est.fasada; item('fasada', 'fasada', 'Zateplení fasády', f, 'm²', f * C.fasada.cena, 'fasada', f, { popis: C.fasada.nazev }); }
    if (has('strecha')) { var s = +o.strecha.plocha || est.strecha; item('strecha', 'strecha', 'Zateplení střechy', s, 'm²', s * C.strecha.cena, 'strecha', s, { popis: C.strecha.nazev }); }
    if (has('strop')) { var sp = +o.strop.plocha || est.strop; item('strop', 'strop', 'Zateplení stropu pod půdou', sp, 'm²', sp * C.strop.cena, 'strop', sp, { popis: C.strop.nazev }); }
    if (has('podlaha')) {
      var pt = o.podlaha.typ || 'zemina', pp = +o.podlaha.plocha || est.podlaha;
      item('podlaha', 'podlaha', 'Zateplení podlahy', pp, 'm²', pp * C['podlaha-' + pt].cena, 'podlaha-' + pt, pp, { popis: C['podlaha-' + pt].nazev });
    }
    var tcTyp = null;
    if (has('tc')) {
      tcTyp = o.tc.typ && o.tc.typ !== 'nevim' ? o.tc.typ : 'vzduch-voda';
      var tcLbl = { 'vzduch-voda': 'vzduch-voda', 'zeme-voda': 'země-voda', 'vzduch-vzduch': 'vzduch-vzduch' }[tcTyp];
      item('tc', 'tc', 'Tepelné čerpadlo ' + tcLbl, 1, 'ks', C['tc-' + tcTyp].cena, 'tc-' + tcTyp, 1, { popis: C['tc-' + tcTyp].nazev });
      if (o.tc.soustava === 'nove-podlahove') {
        item('podlahove', 'podlahove', 'Podlahové topení', plocha, 'm²', plocha * C.podlahove.cena, null, 0, { popis: C.podlahove.nazev, mimoText: 'Otopná soustava se v limitu NZÚ nepočítá. Způsobilost ověříme u konkrétního projektu.' });
      }
      if (inp.vytapeni === 'tc') w('Dům už tepelné čerpadlo má. NZÚ nepodporuje rozšíření ani úpravu stávajícího podporovaného zdroje. Výměnu dožilého čerpadla posoudíme individuálně.', 'w');
    }
    var fveIt = null, batIt = null;
    var fv = o.fve || null;
    if (has('fve') && !(fv && fv.existujici)) {
      var kwp = Math.max(0, +fv.kwp || 0);
      var cF = kwp * C['fve-kwp'].cena + (fv.rizeni ? C['fve-rizeni'].cena : 0) + (fv.wallbox ? C.wallbox.cena : 0);
      fveIt = item('fve', 'fve', 'Fotovoltaika ' + String(kwp).replace('.', ',') + ' kWp', kwp, 'kWp', cF, 'fve', kwp, { popis: C['fve-kwp'].nazev + (fv.rizeni ? ', energetický management' : '') + (fv.wallbox ? ', wallbox' : '') });
    }
    if (fv && fv.baterie && +fv.kwh > 0) {
      var kwh = +fv.kwh;
      batIt = item('baterie', 'baterie', 'Baterie ' + String(kwh).replace('.', ',') + ' kWh', kwh, 'kWh', kwh * C['fve-kwh'].cena, 'baterie', kwh, { popis: C['fve-kwh'].nazev });
      if (fv.existujici) { batIt.mimo = 'Baterii ke stávající fotovoltaice NZÚ nepodporuje. Financovat ji lze jen spolu s novou FVE.'; batIt.rule = null; }
    }
    if (has('reku')) {
      var rt = o.reku.typ === 'decentralni' ? 'decentralni' : 'centralni';
      item('reku', 'reku', 'Rekuperace ' + (rt === 'centralni' ? 'centrální' : 'decentrální'), 1, 'ks', C['reku-' + rt].cena, 'reku', 1, { popis: C['reku-' + rt].nazev });
      w('Rekuperace v NZÚ vyžaduje větrání všech obytných místností, účinnost alespoň 75 % a test těsnosti domu.', 'i');
    }
    if (has('tuv')) {
      var tt = o.tuv.typ === 'tc' ? 'tc' : 'solar';
      if (tt === 'tc' && has('tc') && o.tc.tuv !== false) {
        w('Ohřev vody už zajistí hlavní tepelné čerpadlo. Samostatné čerpadlo pro vodu jsme z kalkulace vynechali.', 'i');
      } else {
        item('tuv', 'tuv', tt === 'tc' ? 'Tepelné čerpadlo pro ohřev vody' : 'Solární ohřev vody', 1, 'ks', C['tuv-' + tt].cena, 'tuv-' + tt, 1, { popis: C['tuv-' + tt].nazev });
      }
    }
    if (has('zelena')) { var z = +o.zelena.plocha || 30; item('zelena', 'zelena', 'Zelená střecha', z, 'm²', z * C.zelena.cena, 'zelena', z, { popis: C.zelena.nazev }); }
    if (has('destovka')) { item('destovka', 'destovka', 'Využití dešťové vody', 1, 'ks', C.destovka.cena, 'destovka', 1, { popis: C.destovka.nazev }); }
    if (has('elektro')) {
      var el = o.elektro, cE = 0, popisE = [];
      if (el.rozsah === 'kompletni') { cE += plocha * C['elektro-kompletni'].cena + C['elektro-rozvadec'].cena; popisE.push('Nové rozvody a rozvaděč'); }
      else { cE += C['elektro-rozvadec'].cena; popisE.push('Nový rozvaděč a revize'); }
      if (el.smart) { cE += C['elektro-smart'].cena; popisE.push('smart home'); }
      item('elektro', 'elektro', 'Elektro', 1, 'ks', cE, null, 0, { popis: popisE.join(', '), mimoText: 'Elektroinstalace, rozvaděče a revize do NZÚ nespadají.' });
    }

    /* ---------- komplexní, nebo dílčí ---------- */
    var obalka = has('fasada') && (has('strecha') || has('strop')) && has('okna') && has('podlaha');
    var komplexniZadano = !!o.komplet || obalka;
    var selectedKeys = items.map(function (i) { return i.key; });
    var hasKey = function (k) { return selectedKeys.indexOf(k) >= 0 || (k === 'podlaha' && has('podlaha')); };

    /* ---------- vyhodnocení pravidel ---------- */
    items.forEach(function (it) {
      if (!it.rule) { if (!it.mimo) it.mimo = it.mimoText || 'Mimo podporu NZÚ.'; return; }
      var rule = ruleFor(rules, program, it.rule);
      if (!rule) { it.mimo = light ? 'Ve větvi NZÚ Light toto opatření podporováno není.' : 'Mimo podporu NZÚ.'; return; }
      var pod = rule.podminky || {};
      if (pod.dokoncenPred && rok >= pod.dokoncenPred) { it.mimo = 'Podpora je jen pro domy dokončené před ' + datum(pod.dokoncenPred) + '.'; return; }
      if (pod.vyzadujeJedno) {
        var okj = pod.vyzadujeJedno.some(function (k) { return k !== it.key && hasKey(k); });
        if (!okj) { it.mimo = rule.kombinace && rule.kombinace[0] ? rule.kombinace[0] + '.' : 'Jen v kombinaci s dalším opatřením.'; return; }
      }
      if (pod.minKwp && it.key === 'fve' && it.mnozstvi < pod.minKwp) { it.mimo = 'Podporovaná fotovoltaika má alespoň ' + pod.minKwp + ' kWp.'; return; }
      if (pod.trifaze && fv && fv.fazy === '1') { it.mimo = 'Podmínkou je třífázové připojení. Přípojku umíme upravit.'; return; }
      if (it.key === 'baterie' && !fveIt) { it.mimo = 'Baterii lze financovat jen spolu s novou fotovoltaikou.'; return; }
      var cap = rule.typVypoctu === 'pausal' ? rule.maximum : rule.jednotkovaPodpora * it.nzuMnozstvi;
      if (rule.typVypoctu !== 'pausal' && rule.maximum) cap = Math.min(cap, rule.maximum);
      it.kod = rule.kod;
      it.kategorie = rule.kategorie;
      it.limit = cap;
      it.podpora = Math.min(cap, it.cena);
      it.skupinaMax = rule.skupinaMax || null;
      it.sazba = rule.typVypoctu === 'pausal' ? null : rule.jednotkovaPodpora;
    });

    if (fv && fv.fazy === 'nevim' && fveIt && !fveIt.mimo) w('U fotovoltaiky ověříme, zda máte třífázovou přípojku. Je podmínkou NZÚ.', 'i');
    if (light && fveIt && !fveIt.mimo) w('Fotovoltaika v NZÚ Light musí ohřívat vodu se zásobníkem alespoň 200 l.', 'i');

    // skupinový limit FVE + baterie
    var fveMax = limit(rules, 'FVE-MAX');
    if (!light && fveMax) {
      var g = items.filter(function (i) { return i.skupinaMax === 'FVE-MAX' && !i.mimo; });
      var gs = sum(g, function (i) { return i.podpora; });
      if (gs > fveMax) {
        var over = gs - fveMax;
        g.slice().reverse().forEach(function (i) { var cut = Math.min(over, i.podpora); i.podpora -= cut; over -= cut; });
        w('Fotovoltaika a baterie dosáhly limitu ' + fmt(fveMax) + ' Kč na celý systém.', 'i');
      }
    }

    var podporovane = items.filter(function (i) { return !i.mimo && i.podpora > 0; });
    var podporovanaCast = sum(podporovane, function (i) { return i.cena; });
    var nzuAny = podporovane.length > 0;

    // příprava a administrace
    var komplexni = false, rezim = light ? 'light' : 'dilci';
    if (!light && komplexniZadano) {
      var oze = podporovane.some(function (i) { return ['tc', 'fve', 'tuv'].indexOf(i.key) >= 0; });
      var envOk = ['fasada', 'okna'].every(function (k) { return podporovane.some(function (i) { return i.key === k; }); }) && podporovane.some(function (i) { return i.key === 'strecha' || i.key === 'strop'; }) && podporovane.some(function (i) { return i.key === 'podlaha'; });
      if (!envOk) {
        w('Pro komplexní renovaci je potřeba zateplit celou obálku: fasádu, střechu nebo strop, okna a podlahu. Kalkulace proto počítá s limitem dílčích opatření.', 'w');
      } else if (!oze) {
        w('U komplexní renovace musí být nejpozději při dokončení instalován obnovitelný zdroj (tepelné čerpadlo, solární ohřev vody nebo fotovoltaika). Bez něj kalkulace počítá s limitem dílčích opatření.', 'w');
      } else {
        komplexni = true; rezim = 'komplexni';
        if (inp.vytapeni === 'uhli' && !has('tc')) w('Kotel na uhlí musí být nejpozději při dokončení komplexní renovace odstraněn nebo nahrazen.', 'r');
        w('Komplexní renovace vyžaduje projektovou dokumentaci, energetické hodnocení a snížení dodané i neobnovitelné primární energie alespoň o 30 %. Na dům lze podat jen jednu žádost o komplexní opatření.', 'i');
      }
    }
    if (nzuAny) {
      var pk = komplexni ? 'priprava-komplexni' : 'priprava-dilci';
      item('priprava', 'priprava', komplexni ? 'Projektová příprava a administrace' : 'Renovační pas a administrace NZÚ', 1, 'ks', C[pk].cena, null, 0, { popis: C[pk].nazev, mimo: 'Náklad přípravy, v limitech NZÚ nepočítáme.' });
    }

    var investice = sum(items, function (i) { return i.cena; });
    var sumPodpora = sum(podporovane, function (i) { return i.podpora; });

    /* ---------- financování ---------- */
    var dotace = 0, uver = 0, doba = 0, uverLimit = 0, uverPodMinimem = false, dotaceZat = 0, dotaceZdroje = 0;
    if (!light) {
      uverLimit = komplexni ? limit(rules, 'UVER-MAX-DUM') : limit(rules, 'UVER-MAX-DILCI');
      uver = Math.min(sumPodpora, uverLimit);
      if (sumPodpora > uverLimit) w('Součet opatření přesahuje limit ' + fmt(uverLimit) + ' Kč pro ' + (komplexni ? 'jeden dům' : 'dílčí opatření') + '. Zbytek kalkulace kryje z vlastních zdrojů.', 'i');
      var umin = limit(rules, 'UVER-MIN');
      if (uver > 0 && uver < umin) { uverPodMinimem = true; w('Vypočtená výše úvěru ' + fmt(r(uver, 1000)) + ' Kč je pod minimem ' + fmt(umin) + ' Kč pro podání žádosti. Pomůže spojit víc opatření do jedné žádosti.', 'w'); uver = 0; }
      var hr = limit(rules, 'KOMP-HRANICE');
      doba = uver <= hr ? limit(rules, 'KOMP-ZAKLAD') : limit(rules, 'KOMP-VYSSI');
      if (komplexni && inp.domacnost === 'nizsi' && uver > 0) { doba = limit(rules, 'KOMP-KOMPLEX'); w('Kompenzace úroků až 25 let platí pro zajištěný úvěr na komplexní renovaci a domácnost do 4. příjmového decilu.', 'i'); }
      if (uver > 0) w('O úvěru rozhoduje banka podle bonity domácnosti. Výsledná částka může být nižší.', 'i');
    } else {
      var zat = podporovane.filter(function (i) { return i.kategorie === 'zatepleni'; });
      var zdr = podporovane.filter(function (i) { return i.kategorie === 'zdroje'; });
      dotaceZat = Math.min(sum(zat, function (i) { return i.podpora; }), limit(rules, 'LIGHT-ZAT-MAX'));
      dotaceZdroje = Math.min(sum(zdr, function (i) { return i.podpora; }), limit(rules, 'LIGHT-ZDROJE-MAX'));
      dotace = dotaceZat + dotaceZdroje;
      var lmin = limit(rules, 'LIGHT-MIN');
      if (dotace > 0 && dotace < lmin) { w('Možná dotace ' + fmt(r(dotace, 1000)) + ' Kč je pod minimem ' + fmt(lmin) + ' Kč na jednu žádost.', 'w'); dotace = 0; dotaceZat = 0; dotaceZdroje = 0; }
      uver = Math.max(0, Math.min(dotace, podporovanaCast - dotace));
      doba = limit(rules, 'LIGHT-UVER-KOMP');
      if (stav === 'zatepleny') w('NZÚ Light je pro domy s obálkou ve třídě E až G. U zatepleného domu to pravděpodobně nesplníte.', 'r');
      else w('Podmínkou NZÚ Light je obálka domu ve třídě E až G a Renovační pas. Příjem domácnosti se dokládá.', 'i');
      if (dotace > 0) w('Doplňkový zvýhodněný úvěr je nejvýše do výše dotace a jen na náklady, které dotace nepokryje.', 'i');
    }
    dotace = r(dotace, 1000); uver = r(uver, 1000);
    var vlastni = Math.max(0, investice - dotace - uver);
    var splatka = uver > 0 && doba ? uver / (doba * 12) : 0;

    /* ---------- energie ---------- */
    var spec = E.potreba.filter(function (b) { return rok <= b.do; })[0].kwhm2 * (E.stavKoef[stav] || 1);
    var Q = spec * plocha;
    var src0 = inp.vytapeni || 'plyn';
    var ceny = E.ceny;
    function zakladCena(src) { return src === 'tc' ? ceny['elektrina-tc'] : src === 'elektrina' ? ceny['elektrina-akumulace'] : ceny.elektrina; }
    function teplo(qh, src, scop) {
      if (src === 'tc') { var el = qh / (scop || E.ucinnost.tc); return { cost: el * ceny['elektrina-tc'], elec: el }; }
      if (src === 'elektrina') { var e2 = qh / E.ucinnost.elektrina; return { cost: e2 * ceny['elektrina-akumulace'], elec: e2 }; }
      if (src === 'bojler') { var e3 = qh / E.ucinnost.elektrina; return { cost: e3 * scop, elec: e3 }; }
      var u = E.ucinnost[src] || E.ucinnost.jine, c = ceny[src] || ceny.jine;
      return { cost: qh / u * c, elec: 0 };
    }
    var bp0 = zakladCena(src0);
    var h0 = teplo(Q, src0);
    var tuvSrc0 = ['plyn', 'tc', 'elektrina'].indexOf(src0) >= 0 ? src0 : 'bojler';
    var t0 = tuvSrc0 === 'bojler' ? teplo(E.tuvKwh, 'bojler', bp0) : teplo(E.tuvKwh, tuvSrc0);
    var pred = h0.cost + t0.cost + E.zakladniElektrina * bp0;

    var fac = E.efektDleStavu[stav] || 1, U = E.uspory, red = [];
    ['fasada', 'okna', 'podlaha', 'reku', 'stineni'].forEach(function (k) { if (items.some(function (i) { return i.key === k; })) red.push(U[k]); });
    var hS = items.some(function (i) { return i.key === 'strecha'; }), hP = items.some(function (i) { return i.key === 'strop'; });
    if (hS || hP) red.push(hS && hP ? Math.max(U.strecha, U.strop) + 0.02 : hS ? U.strecha : U.strop);
    var Q1 = red.reduce(function (q, s) { return q * (1 - s * fac); }, Q);
    var src1 = has('tc') ? 'tc' : src0;
    var scop1 = has('tc') ? E.scop['tc-' + tcTyp] : null;
    var bp1 = zakladCena(src1);
    var h1 = teplo(Q1, src1, scop1);
    var t1;
    if (has('tc') && o.tc.tuv !== false && tcTyp !== 'vzduch-vzduch') t1 = teplo(E.tuvKwh, 'tc', scop1 * 0.85);
    else if (items.some(function (i) { return i.key === 'tuv'; }) && o.tuv.typ === 'tc') { var et = E.tuvKwh / E.scop['tuv-tc']; t1 = { cost: et * bp1, elec: et }; }
    else if (items.some(function (i) { return i.key === 'tuv'; })) { var rest = E.tuvKwh * (1 - E.solarPokryti); t1 = tuvSrc0 === 'bojler' ? teplo(rest, 'bojler', bp1) : teplo(rest, tuvSrc0, scop1 || null); }
    else t1 = tuvSrc0 === 'bojler' ? teplo(E.tuvKwh, 'bojler', bp1) : (tuvSrc0 === 'tc' ? teplo(E.tuvKwh, 'tc', scop1 || E.ucinnost.tc) : teplo(E.tuvKwh, tuvSrc0));
    var rekuKwh = has('reku') ? E.rekuSpotreba : 0;
    var elec1 = E.zakladniElektrina + h1.elec + t1.elec + rekuKwh;
    var fveBenefit = 0, fveVyroba = 0, fveVlastni = 0;
    if (fveIt) {
      fveVyroba = fveIt.mnozstvi * E.fveVynos;
      var share = E.fveVlastniZaklad + (batIt && !fv.existujici ? E.fveVlastniBaterie * Math.min(batIt.mnozstvi / Math.max(fveIt.mnozstvi, 1), 1) : 0) + (fv.rizeni ? E.fveVlastniRizeni : 0) + (src1 === 'tc' ? E.fveVlastniTc : 0);
      share = Math.min(share, E.fveVlastniMax);
      fveVlastni = Math.min(fveVyroba * share, elec1 * 0.85);
      fveBenefit = fveVlastni * bp1 + (fveVyroba - fveVlastni) * ceny.vykup;
    }
    var po = Math.max(0, h1.cost + t1.cost + (E.zakladniElektrina + rekuKwh) * bp1 - fveBenefit);
    var predM = r(pred / 12, 100), poM = r(po / 12, 100);
    var usporaM = Math.max(0, predM - poM);
    var splatkaM = r(splatka, 100);

    /* ---------- doporučení a postup ---------- */
    var env = items.filter(function (i) { return ['okna', 'stineni', 'fasada', 'strecha', 'strop', 'podlaha'].indexOf(i.key) >= 0; });
    var postup = [];
    postup.push({ t: 'Technická prohlídka domu', d: 'Zaměření, fotodokumentace a rozbor spotřeby.' });
    if (nzuAny) postup.push({ t: komplexni ? 'Projektová dokumentace a energetické hodnocení' : 'Renovační pas NZÚ', d: komplexni ? 'Podklad pro žádost o komplexní opatření a průkaz energetické náročnosti.' : 'Určí pořadí opatření a je podkladem žádosti.' });
    if (nzuAny) postup.push({ t: light ? 'Žádost NZÚ Light' : 'Žádost o schválení projektu na SFŽP', d: light ? 'Dotaci lze čerpat předem jako zálohu nebo po realizaci.' : 'Po schválení podáte žádost o úvěr u zapojené banky do 12 měsíců.' });
    if (has('elektro') || (has('tc') || fveIt)) postup.push({ t: has('elektro') ? 'Elektroinstalace a rozvaděč' : 'Kontrola přípojky a rozvaděče', d: 'Rezerva pro tepelné čerpadlo, fotovoltaiku a wallbox.' });
    if (env.length) postup.push({ t: 'Obálka domu', d: env.map(function (i) { return i.nazev.toLowerCase(); }).join(', ') + '.' });
    if (has('tc')) postup.push({ t: 'Zdroj tepla', d: 'Tepelné čerpadlo dimenzované na tepelnou ztrátu po úpravách obálky.' });
    if (has('reku')) postup.push({ t: 'Rekuperace', d: 'Řízené větrání a test těsnosti.' });
    if (fveIt || batIt) postup.push({ t: 'Fotovoltaika', d: 'Výroba pro vlastní spotřebu domu' + (batIt ? ' a baterie.' : '.') });
    postup.push({ t: 'Revize a předání', d: nzuAny ? 'Doložení realizace pro NZÚ do ' + (light ? '24' : '36') + ' měsíců od rozhodnutí.' : 'Revizní zprávy a předávací protokol.' });

    if (has('tc') && stav === 'puvodni' && !env.length) tipy.push({ t: 'Nezateplený dům má vysokou tepelnou ztrátu.', d: 'Zateplení stropu pod půdou patří k nejlevnějším opatřením. Tepelné čerpadlo pak může být menší a levnější.', calc: 'strop' });
    if (has('okna') && !has('fasada') && stav !== 'zatepleny') tipy.push({ t: 'Při výměně oken zvažte fasádu.', d: 'Okno pak sedí v rovině izolace a ostění se řeší jen jednou.', calc: 'fasada' });
    if (fveIt && !batIt) tipy.push({ t: 'Bez baterie spotřebujete doma zhruba třetinu výroby.', d: 'Baterie nebo řízení spotřeby zvyšují podíl vlastní elektřiny.', calc: 'baterie' });
    if (!light && !komplexni && sumPodpora > limit(rules, 'UVER-MAX-DILCI') && !obalka) tipy.push({ t: 'Blížíte se komplexní renovaci.', d: 'S celkovým zateplením obálky a obnovitelným zdrojem je limit úvěru 2 000 000 Kč místo 750 000 Kč.', calc: 'komplet' });
    if ((has('tc') || fveIt) && !has('elektro') && rok < 1990) tipy.push({ t: 'Starší elektroinstalace.', d: 'Tepelné čerpadlo a fotovoltaika výrazně zatíží rozvody. Doporučujeme kontrolu rozvaděče.', calc: 'elektro' });

    return {
      vstup: inp, odhad: est, rezim: rezim, komplexni: komplexni, light: light, program: program,
      polozky: items, upozorneni: warn, tipy: tipy, postup: postup,
      investice: investice, podporovanaCast: podporovanaCast, sumPodpora: r(sumPodpora, 1000),
      dotace: dotace, dotaceZat: r(dotaceZat, 1000), dotaceZdroje: r(dotaceZdroje, 1000),
      uver: uver, uverLimit: uverLimit, uverPodMinimem: uverPodMinimem, doba: doba,
      vlastni: vlastni, splatka: splatkaM,
      nakladyPred: predM, nakladyPo: poM, uspora: usporaM,
      cistyDopad: usporaM - splatkaM,
      fve: { vyroba: r(fveVyroba, 100), vlastni: r(fveVlastni, 100) },
      potreba: { pred: r(Q, 100), po: r(Q1, 100) }
    };
  }

  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var api = { calc: calc, odhadPloch: odhadPloch, PODLAZI: PODLAZI, VYTAPENI: VYTAPENI, ruleFor: ruleFor, limit: limit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NREngine = api;
})(this);
