/* NA ROVINU: ilustrační systém. Technická kresba na grafitu, jedna červená pro motiv.
   Místa pro fotografie realizací: v ostrém provozu se nahradí <img> z CMS. */
(function (root) {
  'use strict';

  /* Logo NA ROVINU: N ze dvou sloupků a tří červených diagonál (podle dodaného loga). */
  function symbol(cls) {
    var st = '';
    [2, 19, 36].forEach(function (L) { st += '<path d="M' + L + ' 0L' + (L + 12.5) + ' 0L' + (L + 91.5) + ' 105L' + (L + 79) + ' 105Z" style="fill:var(--red)"/>'; });
    return '<svg viewBox="0 0 134 105" class="sym ' + (cls || '') + '" aria-hidden="true" focusable="false">' +
      '<path d="M0 7.5L40 60.7L40 105L0 105Z" style="fill:currentColor"/><path d="M92 0L134 0L134 104.5L92 48.6Z" style="fill:currentColor"/>' + st + '</svg>';
  }

  function stripes(cls, style) {
    var p = '';
    [0, 86, 172].forEach(function (x) { p += '<path d="M' + x + ' 200 L' + (x + 52) + ' 200 L' + (x + 152) + ' 0 L' + (x + 100) + ' 0 Z"/>'; });
    return '<svg viewBox="0 0 330 200" class="stripes ' + (cls || '') + '"' + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true" focusable="false">' + p + '</svg>';
  }

  function raster(w, h, step) {
    var s = '';
    for (var x = step; x < w; x += step) s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '" class="rs"/>';
    return s;
  }

  function lbl(ex, ey, ax, ay, text, side) {
    var tx = side === 'end' ? ax - 6 : ax + 6;
    return '<g class="lbl"><line x1="' + ex + '" y1="' + ey + '" x2="' + ax + '" y2="' + ay + '"/><circle cx="' + ex + '" cy="' + ey + '" r="3"/>' +
      '<text x="' + tx + '" y="' + (ay + 4) + '" text-anchor="' + side + '">' + text + '</text></g>';
  }

  function win(x, y, w, h, isNew) {
    var s = '';
    if (isNew) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="frnew"/>';
      s += '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="' + (h - 8) + '" class="glassnew"/>';
      s += '<line x1="' + (x + w * 0.55) + '" y1="' + (y + 9) + '" x2="' + (x + w * 0.3) + '" y2="' + (y + h * 0.5) + '" class="glint"/>';
      s += '<line x1="' + (x + w * 0.75) + '" y1="' + (y + 9) + '" x2="' + (x + w * 0.58) + '" y2="' + (y + h * 0.35) + '" class="glint"/>';
      s += '<rect x="' + (x - 3) + '" y="' + (y + h) + '" width="' + (w + 6) + '" height="3" class="frnew"/>';
    } else {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="frold"/>';
      s += '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="' + (h - 8) + '" class="glass"/>';
      s += '<line x1="' + (x + w / 2) + '" y1="' + y + '" x2="' + (x + w / 2) + '" y2="' + (y + h) + '" class="mull"/>';
      s += '<line x1="' + x + '" y1="' + (y + h * 0.38) + '" x2="' + (x + w) + '" y2="' + (y + h * 0.38) + '" class="mull"/>';
      s += '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (w - 16) + '" height="' + (h - 16) + '" class="dimf"/>';
    }
    return s;
  }

  /* Dům v pohledu na okapovou stranu. cfg: okna, fasada, strecha, tc, fve, elektro, koure, roof, scaffold, labels, hl */
  function house(cfg) {
    cfg = cfg || {};
    var flat = cfg.roof === 'flat';
    var L = cfg.lbl || {};
    var vb = cfg.crop ? '120 70 580 380' : '0 0 780 470';
    var s = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice" class="ill" role="img" aria-label="' + (cfg.alt || 'Ilustrace rodinného domu') + '">';
    s += '<rect width="780" height="470" class="bg"/>';
    if (cfg.raster !== false) s += raster(780, 470, 38);
    var pop = function (k) { return cfg.hl === k ? ' pop' : ''; };

    // terén
    s += '<rect x="0" y="380" width="780" height="18" class="ground"/>';
    s += '<line x1="0" y1="380" x2="780" y2="380" class="ln"/>';
    // výšková kóta
    s += '<g><polygon points="150,380 143,369 157,369" class="lvl"/><line x1="128" y1="369" x2="172" y2="369" class="dim"/><text x="128" y="362" font-size="12" class="wtext">±0,000</text></g>';

    // komín (jen šikmá střecha)
    if (!flat) {
      s += '<rect x="470" y="98" width="24" height="60" class="' + (cfg.fasada ? 'wallnew' : 'wall') + '"/><rect x="466" y="94" width="32" height="6" class="dark"/>';
      if (cfg.koure && !cfg.tc) s += '<g class="smoke"><path d="M482 88 C474 76 492 70 484 58 C478 48 494 42 488 30" class="dim"/><path d="M490 86 C500 74 486 66 498 54" class="dim"/></g>';
    }

    // zdi
    s += '<rect x="200" y="210" width="360" height="170" class="' + (cfg.fasada ? 'wallnew' : 'wall') + '"/>';
    if (!cfg.fasada) {
      s += '<polyline points="232,286 240,296 236,306 244,318" class="dim"/><polyline points="520,226 512,240 518,252" class="dim"/><polyline points="372,350 380,358 376,368" class="dim"/>';
      s += '<rect x="200" y="360" width="360" height="20" class="plinth"/>';
    } else {
      s += '<rect x="188" y="360" width="384" height="20" class="plinthnew"/>';
      s += '<line x1="200" y1="295" x2="560" y2="295" class="seam"/>';
    }
    if (cfg.fasada || cfg.rozpracovano) {
      var izw = cfg.rozpracovano ? '<rect x="200" y="214" width="150" height="146" class="izol' + pop('fasada') + '"/>' : '';
      s += '<g class="part' + pop('fasada') + '">' + izw + (cfg.fasada ? '<rect x="188" y="210" width="12" height="150" class="izol"/><rect x="560" y="210" width="12" height="150" class="izol"/><rect x="188" y="210" width="12" height="150" class="ln"/><rect x="560" y="210" width="12" height="150" class="ln"/>' : '') + '</g>';
    }

    // střecha
    if (!flat) {
      s += '<polygon points="184,212 576,212 548,126 212,126" class="roof"/>';
      if (cfg.strecha) {
        for (var sx = 228; sx < 548; sx += 22) s += '<line x1="' + sx + '" y1="128" x2="' + (sx - 6) + '" y2="210" class="seamdark"/>';
        s += '<g class="part' + pop('strecha') + '"><polygon points="187,212 573,212 570,202 190,202" class="izol"/><polygon points="187,212 573,212 570,202 190,202" class="ln"/></g>';
      } else {
        for (var ty = 136; ty < 210; ty += 10) { var dx = (ty - 126) * 28 / 86; s += '<line x1="' + (212 - dx + 6) + '" y1="' + ty + '" x2="' + (548 + dx - 6) + '" y2="' + ty + '" class="tile"/>'; }
        s += '<rect x="400" y="160" width="18" height="10" class="bg"/>';
      }
      s += '<polygon points="184,212 576,212 548,126 212,126" class="ln2"/>';
    } else {
      s += '<rect x="192" y="194" width="376" height="16" class="roof"/>';
      if (cfg.strecha) s += '<g class="part' + pop('strecha') + '"><rect x="192" y="186" width="376" height="8" class="izol"/><rect x="192" y="186" width="376" height="8" class="ln"/></g>';
      s += '<rect x="192" y="194" width="376" height="16" class="ln2"/>';
    }

    // FVE
    if (cfg.fve) {
      var pv = '<g class="part' + pop('fve') + '">';
      if (!flat) {
        for (var row = 0; row < 2; row++) {
          var py = 136 + row * 32;
          for (var c = 0; c < 9; c++) { var px = 238 + c * 32; pv += '<rect x="' + px + '" y="' + py + '" width="29" height="27" class="pv"/><line x1="' + (px + 14.5) + '" y1="' + py + '" x2="' + (px + 14.5) + '" y2="' + (py + 27) + '" class="pvl"/>'; }
        }
      } else {
        for (var c2 = 0; c2 < 8; c2++) { var qx = 214 + c2 * 44; pv += '<polygon points="' + qx + ',184 ' + (qx + 34) + ',184 ' + (qx + 30) + ',166 ' + (qx + 4) + ',166" class="pv"/>'; }
      }
      s += pv + '</g>';
    }

    // okna
    var wy2 = 228, wy1 = 312, ws = [228, 306, 406, 484];
    var wg = '<g class="part' + pop('okna') + '">';
    ws.forEach(function (x) { wg += win(x, wy2, 48, 46, cfg.okna); });
    [228, 406, 484].forEach(function (x) { wg += win(x, wy1, 48, 46, cfg.okna); });
    // dveře
    if (cfg.okna) wg += '<rect x="316" y="298" width="38" height="82" class="frnew"/><rect x="322" y="304" width="8" height="70" class="glassnew"/><rect x="344" y="336" width="3" height="14" class="dark"/>';
    else wg += '<rect x="316" y="298" width="38" height="82" class="frold"/><rect x="322" y="306" width="26" height="28" class="dimf"/><rect x="322" y="342" width="26" height="30" class="dimf"/>';
    s += wg + '</g>';

    if (cfg.reku) s += '<g class="part' + pop('reku') + '"><circle cx="382" cy="234" r="7" class="unit"/><circle cx="382" cy="234" r="3" class="dark"/><circle cx="460" cy="234" r="7" class="unit"/><circle cx="460" cy="234" r="3" class="dark"/></g>';

    // TČ
    if (cfg.tc) {
      s += '<g class="part' + pop('tc') + '"><rect x="590" y="372" width="84" height="8" class="dark"/><rect x="596" y="330" width="72" height="44" class="unit"/>' +
        '<circle cx="620" cy="352" r="16" class="fan"/><line x1="604" y1="352" x2="636" y2="352" class="fanl"/><line x1="620" y1="336" x2="620" y2="368" class="fanl"/>' +
        '<line x1="646" y1="338" x2="662" y2="338" class="fanl"/><line x1="646" y1="346" x2="662" y2="346" class="fanl"/><line x1="646" y1="354" x2="662" y2="354" class="fanl"/><line x1="646" y1="362" x2="662" y2="362" class="fanl"/>' +
        '<path d="M596 346 H580 V338 H572" class="ln"/><path d="M596 356 H584 V350 H572" class="ln"/></g>';
    }
    // wallbox
    if (cfg.elektro) {
      s += '<g class="part' + pop('elektro') + '"><rect x="537" y="316" width="16" height="26" class="unit"/><path d="M547 320 L541 330 H546 L543 338 L550 327 H545 Z" class="red"/><path d="M545 342 C545 362 560 368 586 376" class="ln"/></g>';
    }

    // lešení
    if (cfg.scaffold) {
      var sc = '<g class="scaf">';
      for (var px2 = 176; px2 <= 584; px2 += 68) sc += '<line x1="' + px2 + '" y1="196" x2="' + px2 + '" y2="380" class="ln"/>';
      [380, 296, 212].forEach(function (yy) { sc += '<line x1="176" y1="' + yy + '" x2="584" y2="' + yy + '" class="ln2"/>'; });
      for (var bx = 176; bx < 584; bx += 136) sc += '<line x1="' + bx + '" y1="380" x2="' + (bx + 68) + '" y2="296" class="brace"/><line x1="' + (bx + 68) + '" y1="296" x2="' + (bx + 136) + '" y2="212" class="brace"/>';
      s += sc + '</g>';
    }

    // kóta šířky
    s += '<line x1="200" y1="398" x2="200" y2="418" class="dim"/><line x1="560" y1="398" x2="560" y2="418" class="dim"/><line x1="192" y1="412" x2="568" y2="412" class="dim"/>' +
      '<line x1="195" y1="417" x2="205" y2="407" class="ln"/><line x1="555" y1="417" x2="565" y2="407" class="ln"/>' +
      '<text x="380" y="434" text-anchor="middle" font-size="12" class="wtext">12 000</text>';

    // popisky
    if (cfg.labels) {
      if (cfg.strecha) s += lbl(232, flat ? 190 : 196, 160, flat ? 170 : 176, L.strecha || 'Střecha 240 mm', 'end');
      if (cfg.fasada) s += lbl(194, 250, 160, 250, L.fasada || 'Fasáda EPS 200 mm', 'end');
      if (cfg.okna) s += lbl(252, 335, 160, 326, L.okna || 'Okna Uw 0,7', 'end');
      if (cfg.fve) s += lbl(flat ? 520 : 526, flat ? 176 : 150, 600, 118, L.fve || 'FVE 8 kWp', 'start');
      if (cfg.elektro) s += lbl(553, 322, 600, 252, L.elektro || 'Wallbox 11 kW', 'start');
      if (cfg.tc) s += lbl(640, 330, 640, 300, L.tc || 'TČ vzduch-voda', 'start');
    }
    return s + '</svg>';
  }

  function okna() {
    var s = '<svg viewBox="0 0 600 450" class="ill" role="img" aria-label="Okno s trojsklem v řezu">';
    s += '<rect width="600" height="450" class="bg"/>' + raster(600, 450, 30);
    // ostění s izolací
    s += '<rect x="40" y="40" width="34" height="380" class="izol"/><rect x="326" y="40" width="34" height="380" class="izol"/><rect x="40" y="40" width="34" height="380" class="ln"/><rect x="326" y="40" width="34" height="380" class="ln"/>';
    // rám
    s += '<rect x="74" y="56" width="252" height="340" class="frnew"/>';
    s += '<rect x="90" y="72" width="104" height="308" class="frnew2"/><rect x="206" y="72" width="104" height="308" class="frnew2"/>';
    s += '<rect x="100" y="82" width="84" height="288" class="glassnew"/><rect x="216" y="82" width="84" height="288" class="glassnew"/>';
    s += '<line x1="160" y1="96" x2="112" y2="190" class="glint"/><line x1="176" y1="96" x2="146" y2="152" class="glint"/><line x1="276" y1="96" x2="228" y2="190" class="glint"/><line x1="292" y1="96" x2="262" y2="152" class="glint"/>';
    s += '<rect x="196" y="214" width="6" height="26" class="dark"/>';
    s += '<rect x="64" y="396" width="272" height="8" class="frnew"/>';
    // detail řezu
    s += '<circle cx="306" cy="226" r="16" class="sred"/><line x1="322" y1="226" x2="396" y2="190" class="sred"/>';
    s += '<g transform="translate(400 96)">';
    s += '<rect x="0" y="0" width="170" height="232" class="detailbg"/>';
    s += '<rect x="16" y="24" width="64" height="184" class="frnew"/>';
    [[22, 30], [42, 30], [62, 30], [22, 90], [42, 90], [62, 90], [22, 150], [42, 150], [62, 150]].forEach(function (p) { s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="14" height="50" class="chamber"/>'; });
    [96, 116, 136].forEach(function (x) { s += '<rect x="' + x + '" y="24" width="6" height="184" class="glassedge"/>'; });
    s += '<rect x="102" y="40" width="14" height="10" class="dark"/><rect x="122" y="40" width="14" height="10" class="dark"/><rect x="102" y="182" width="14" height="10" class="dark"/><rect x="122" y="182" width="14" height="10" class="dark"/>';
    s += '<text x="0" y="-14" font-size="12">Řez rámem a zasklením</text>';
    s += '<text x="0" y="252" font-size="12">4/16/4/16/4</text>';
    s += '<text x="0" y="270" font-size="12" class="redt">Uw 0,7 W/m²K</text>';
    s += '</g></svg>';
    return s;
  }

  function teplo() {
    var s = '<svg viewBox="0 0 600 450" class="ill" role="img" aria-label="Tepelné čerpadlo a podlahové topení">';
    s += '<rect width="600" height="450" class="bg"/>' + raster(600, 450, 30);
    // jednotka
    s += '<rect x="36" y="360" width="260" height="14" class="dark"/>';
    s += '<rect x="48" y="170" width="236" height="190" class="unit"/>';
    s += '<circle cx="140" cy="265" r="66" class="fan"/><circle cx="140" cy="265" r="12" class="dark"/>';
    for (var a = 0; a < 5; a++) { var ang = a * Math.PI * 2 / 5; s += '<path d="M140 265 Q' + (140 + 50 * Math.cos(ang + .5)).toFixed(1) + ' ' + (265 + 50 * Math.sin(ang + .5)).toFixed(1) + ' ' + (140 + 60 * Math.cos(ang)).toFixed(1) + ' ' + (265 + 60 * Math.sin(ang)).toFixed(1) + '" class="fanl"/>'; }
    for (var gy = 192; gy < 350; gy += 12) s += '<line x1="226" y1="' + gy + '" x2="268" y2="' + gy + '" class="fanl"/>';
    // potrubí do stěny
    s += '<rect x="318" y="60" width="26" height="330" class="izol"/><rect x="318" y="60" width="26" height="330" class="ln"/>';
    s += '<path d="M284 200 H331 V120 H560" class="pipe-r"/><path d="M284 216 H331 V136 H560" class="ln2"/>';
    // podlahové topení v půdorysu
    var d = 'M372 170';
    for (var i = 0; i < 6; i++) { var y = 170 + i * 34; d += ' H556 V' + (y + 17) + ' H372 V' + (y + 34); }
    s += '<rect x="360" y="156" width="210" height="226" class="detailbg"/>';
    s += '<path d="' + d + '" class="loop"/>';
    s += '<text x="360" y="108" font-size="12" class="redt">výstup 35 °C</text><text x="360" y="152" font-size="12">zpátečka 30 °C</text>';
    s += '<text x="48" y="156" font-size="12">TČ vzduch-voda</text>';
    s += '</svg>';
    return s;
  }

  function energie() {
    var s = '<svg viewBox="0 0 600 450" class="ill" role="img" aria-label="Fotovoltaika a baterie">';
    s += '<rect width="600" height="450" class="bg"/>' + raster(600, 450, 30);
    // pole panelů v perspektivě
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 5; c++) {
        var x0 = 40 + c * 68 + r * 22, y0 = 70 + r * 64;
        s += '<polygon points="' + x0 + ',' + (y0 + 54) + ' ' + (x0 + 62) + ',' + (y0 + 54) + ' ' + (x0 + 80) + ',' + y0 + ' ' + (x0 + 18) + ',' + y0 + '" class="pv"/>';
        s += '<line x1="' + (x0 + 31) + '" y1="' + (y0 + 54) + '" x2="' + (x0 + 49) + '" y2="' + y0 + '" class="pvl"/>';
        s += '<line x1="' + (x0 + 9) + '" y1="' + (y0 + 27) + '" x2="' + (x0 + 71) + '" y2="' + (y0 + 27) + '" class="pvl"/>';
      }
    }
    // střídač a baterie
    s += '<rect x="180" y="300" width="110" height="80" class="unit"/><rect x="194" y="316" width="50" height="22" class="dark"/><circle cx="268" cy="326" r="5" class="red"/>';
    s += '<rect x="400" y="250" width="120" height="160" class="unit"/>';
    for (var b = 0; b < 5; b++) s += '<rect x="418" y="' + (270 + b * 26) + '" width="84" height="18" class="' + (b === 0 ? 'batoff' : 'baton') + '"/>';
    s += '<path d="M240 248 V300" class="ln2"/><path d="M290 340 H400" class="pipe-r"/>';
    s += '<text x="180" y="400" font-size="12">střídač</text><text x="400" y="430" font-size="12" class="redt">baterie 10 kWh</text><text x="40" y="52" font-size="12">FVE 8 kWp</text>';
    s += '</svg>';
    return s;
  }

  function elektro() {
    var s = '<svg viewBox="0 0 600 450" class="ill" role="img" aria-label="Rozvaděč s jističi a chrániči">';
    s += '<rect width="600" height="450" class="bg"/>' + raster(600, 450, 30);
    s += '<rect x="120" y="40" width="360" height="370" rx="8" class="unit"/><rect x="136" y="56" width="328" height="338" rx="4" class="boardbg"/>';
    var labels = [['FI', 'B16', 'B16', 'B10', 'B10', 'B16', 'C32'], ['FI', 'B16', 'B16', 'B10', 'C20', 'C16', 'B6'], ['HDO', 'B16', 'C25', 'B10', 'SPD', 'B6', 'B6']];
    [96, 196, 296].forEach(function (y, ri) {
      s += '<rect x="150" y="' + (y + 18) + '" width="300" height="8" class="rail"/>';
      for (var m = 0; m < 7; m++) {
        var x = 156 + m * 42, wide = labels[ri][m].indexOf('FI') === 0;
        var main = ri === 0 && m === 6;
        s += '<rect x="' + x + '" y="' + y + '" width="' + (wide ? 38 : 34) + '" height="58" class="' + (main ? 'modred' : 'mod') + '"/>';
        s += '<rect x="' + (x + 11) + '" y="' + (y + 10) + '" width="12" height="18" class="' + (main ? 'dark' : 'tog') + '"/>';
        s += '<text x="' + (x + 2) + '" y="' + (y + 74) + '" font-size="10.5">' + labels[ri][m] + '</text>';
      }
    });
    s += '<path d="M240 410 V440 M300 410 V440 M360 410 V440" class="ln2"/>';
    s += '<text x="120" y="28" font-size="12">Rozvaděč RD, 3 × 25 A, FI 30 mA</text>';
    s += '</svg>';
    return s;
  }

  function divizeIll(key) {
    if (key === 'okna') return okna();
    if (key === 'teplo') return teplo();
    if (key === 'energie') return energie();
    if (key === 'elektro') return elektro();
    return house({ scaffold: true, rozpracovano: true, strecha: true, okna: true, labels: false, alt: 'Rodinný dům s lešením během zateplení' });
  }

  var defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<pattern id="nr-izol" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" style="fill:#FFF1F0"/><path d="M0 0 L6 12 L12 0" style="fill:none;stroke:#EF3E42;stroke-width:1;opacity:.7"/></pattern>' +
    '<pattern id="nr-ground" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" style="stroke:#B9B4AB;stroke-width:1.1"/></pattern>' +
    '</defs></svg>';

  root.NRIll = { symbol: symbol, stripes: stripes, house: house, divizeIll: divizeIll, defs: defs };
})(this);
