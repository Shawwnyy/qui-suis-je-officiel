/* =============================================================================
   Huit nouveaux thèmes en images, dessinés par le jeu (SVG, aucune image extérieure, aucun droit d'auteur) :
     🔢 Compter les formes     — combien de cercles / carrés / triangles / étoiles ? combien de formes rouges / bleues… ?
     🎨 Couleurs & mélanges    — nom d'une couleur, couleur obtenue en mélangeant deux peintures
     ⏰ Lire l'heure           — heure lue sur une horloge à aiguilles
     🧩 Suites logiques        — forme suivante d'une suite (alternance, cycle de 3), point suivant d'une suite de nombres
     📐 Angles                 — type d'angle (aigu, droit, obtus, plat), mesure approximative
     🪞 Axes de symétrie       — nombre d'axes de symétrie d'une figure
     🍕 Fractions en images    — fraction d'un disque ou d'une barre qui est coloriée
     📍 Coordonnées            — coordonnées d'un point, point situé à des coordonnées données
   La bonne réponse est calculée à partir des données qui servent à DESSINER l'image
   (tests/v50img.test.js la relit dans le SVG, avec des tables indépendantes du générateur).
   Les questions sont régénérées à chaque partie, comme celles de image-more.js.
   ============================================================================= */
var V50Img = (function () {
  "use strict";
  var T_COUNT = "🔢 Compter les formes", T_MIX = "🎨 Couleurs & mélanges", T_CLOCK = "⏰ Lire l'heure", T_SUITE = "🧩 Suites logiques",
    T_ANGLE = "📐 Angles", T_SYM = "🪞 Axes de symétrie", T_FRAC = "🍕 Fractions en images", T_COORD = "📍 Coordonnées";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }
  function f1(x) { return (Math.round(x * 10) / 10).toString(); }
  function open(w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"><rect width="' + w + '" height="' + h + '" fill="#f8fafc"/>'; }
  function mk(theme, kind, diff, text, answers, svg, correction) {
    return { category: theme, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction, media: { type: "svg", svg: svg }, source: "officiel", v35: true, v50Img: true, kind: kind };
  }
  function Ci(cx, cy, r, f, st, sw, extra) { return '<circle ' + (extra || "") + ' cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + f + '"' + (st ? ' stroke="' + st + '" stroke-width="' + sw + '"' : "") + '/>'; }
  function Rc(x, y, w, h, f, st, sw, extra) { return '<rect ' + (extra || "") + ' x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + f + '"' + (st ? ' stroke="' + st + '" stroke-width="' + sw + '"' : "") + '/>'; }
  function Po(pts, f, st, sw, extra) { return '<polygon ' + (extra || "") + ' points="' + pts.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ") + '" fill="' + f + '"' + (st ? ' stroke="' + st + '" stroke-width="' + sw + '" stroke-linejoin="round"' : "") + '/>'; }
  function Ln(x1, y1, x2, y2, st, sw, extra) { return '<line ' + (extra || "") + ' x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + st + '" stroke-width="' + sw + '" stroke-linecap="round"/>'; }
  function Tx(x, y, t, size, fill, anchor) { return '<text x="' + f1(x) + '" y="' + f1(y) + '" font-family="Arial, Helvetica, sans-serif" font-size="' + size + '" font-weight="700" text-anchor="' + (anchor || "middle") + '" fill="' + (fill || "#111827") + '">' + t + '</text>'; }
  function starPts(cx, cy, Rr, n) {
    var pts = [], ri = Rr * 0.4, a0 = -Math.PI / 2;
    for (var i = 0; i < n * 2; i++) { var r = i % 2 ? ri : Rr, a = a0 + i * Math.PI / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  function numAns(val, cands, fmt) {
    var ans = [fmt(val)], seen = {}; seen[fmt(val)] = 1;
    shuffle(cands).forEach(function (v) { var s = fmt(v); if (ans.length < 4 && !seen[s]) { seen[s] = 1; ans.push(s); } });
    return ans;
  }

  /* ---------- Palette commune ---------- */
  var COLS = [{ n: "rouge", f: "rouges", h: "#dc2626" }, { n: "bleu", f: "bleues", h: "#2563eb" }, { n: "vert", f: "vertes", h: "#16a34a" }, { n: "jaune", f: "jaunes", h: "#eab308" }];
  var SHAPES = [{ n: "cercle", p: "cercles" }, { n: "carré", p: "carrés" }, { n: "triangle", p: "triangles" }, { n: "étoile", p: "étoiles" }];
  function shapeSvg(type, cx, cy, r, col, att) {
    var extra = att + ' data-shape="' + type + '" data-col="' + col.n + '"';
    if (type === "cercle") return Ci(cx, cy, r, col.h, "#1f2937", 1.5, extra);
    if (type === "carré") return Rc(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7, col.h, "#1f2937", 1.5, extra);
    if (type === "triangle") return Po([[cx, cy - r], [cx + r * 1.0, cy + r * 0.8], [cx - r * 1.0, cy + r * 0.8]], col.h, "#1f2937", 1.5, extra);
    return Po(starPts(cx, cy, r * 1.15, 5), col.h, "#1f2937", 1.5, extra);
  }

  /* ---------- 🔢 Compter les formes ---------- */
  function countScene() {
    var cells = shuffle((function () { var a = [], i; for (i = 0; i < 24; i++) a.push(i); return a; })()).slice(0, 6 + rnd(9)), s = open(300, 200), items = [];
    cells.forEach(function (c) {
      var t = pick(SHAPES), col = pick(COLS), cx = 12 + (c % 6) * 46 + 23, cy = 12 + Math.floor(c / 6) * 44 + 22;
      items.push({ t: t.n, c: col.n });
      s += shapeSvg(t.n, cx, cy, 14, col, "");
    });
    return { svg: s + "</svg>", items: items };
  }
  function qCountShape() {
    var sc = countScene(), sh = pick(SHAPES), n = sc.items.filter(function (i) { return i.t === sh.n; }).length;
    if (n < 1 || n > 8) return null;
    return mk(T_COUNT, "compter-forme", n <= 3 ? "facile" : n <= 5 ? "moyen" : "difficile", "Combien de " + sh.p + " voyez-vous dans cette image ?",
      numAns(n, [n - 2, n - 1, n + 1, n + 2, n + 3].filter(function (v) { return v >= 0; }), String), sc.svg, "Il y a " + n + " " + (n > 1 ? sh.p : sh.n) + ".");
  }
  function qCountColor() {
    var sc = countScene(), col = pick(COLS), n = sc.items.filter(function (i) { return i.c === col.n; }).length;
    if (n < 1 || n > 8) return null;
    return mk(T_COUNT, "compter-couleur", n <= 3 ? "facile" : n <= 5 ? "moyen" : "difficile", "Combien de formes " + col.f + " voyez-vous dans cette image ?",
      numAns(n, [n - 2, n - 1, n + 1, n + 2, n + 3].filter(function (v) { return v >= 0; }), String), sc.svg, "Il y a " + n + " forme" + (n > 1 ? "s " + col.f : " " + col.f.slice(0, -1)) + ".");
  }

  /* ---------- 🎨 Couleurs & mélanges ---------- */
  var PAINT = [{ n: "Rouge", h: "#dc2626" }, { n: "Bleu", h: "#2563eb" }, { n: "Vert", h: "#16a34a" }, { n: "Jaune", h: "#facc15" }, { n: "Orange", h: "#f97316" }, { n: "Violet", h: "#7c3aed" },
    { n: "Rose", h: "#ec4899" }, { n: "Marron", h: "#92400e" }, { n: "Noir", h: "#111827" }, { n: "Gris", h: "#9ca3af" }, { n: "Blanc", h: "#ffffff" }, { n: "Turquoise", h: "#14b8a6" }];
  var MIXES = [["Rouge", "Jaune", "Orange"], ["Bleu", "Jaune", "Vert"], ["Rouge", "Bleu", "Violet"], ["Rouge", "Blanc", "Rose"], ["Noir", "Blanc", "Gris"]];
  function paint(name) { return PAINT.filter(function (p) { return p.n === name; })[0]; }
  function qSwatch() {
    var c = pick(PAINT), wrong = sample(PAINT.filter(function (x) { return x !== c; }), 3);
    var s = open(300, 160) + Rc(90, 20, 120, 120, c.h, "#1f2937", 3, 'data-color="' + c.n + '"') + "</svg>";
    return mk(T_MIX, "couleur-nom", ["Rouge", "Bleu", "Vert", "Jaune", "Noir", "Blanc"].indexOf(c.n) >= 0 ? "facile" : "moyen", "De quelle couleur est ce carré ?", [c.n].concat(wrong.map(function (w) { return w.n; })), s, "Ce carré est " + c.n.toLowerCase() + ".");
  }
  function qMix() {
    var m = pick(MIXES), A = paint(m[0]), B = paint(m[1]), swap = Math.random() < 0.5, first = swap ? B : A, second = swap ? A : B;
    var wrong = sample(PAINT.filter(function (x) { return x.n !== m[2] && x.n !== m[0] && x.n !== m[1]; }), 3);
    var s = open(300, 130) + '<g data-mix="' + m[0] + "+" + m[1] + '">' + Ci(55, 65, 36, first.h, "#1f2937", 3, 'data-paint="' + first.n + '"') + Tx(112, 80, "+", 40, "#1f2937") + Ci(170, 65, 36, second.h, "#1f2937", 3, 'data-paint="' + second.n + '"') +
      Tx(228, 78, "=", 36, "#1f2937") + Rc(244, 40, 44, 50, "#e5e7eb", "#6b7280", 2.5) + Tx(266, 78, "?", 34, "#6b7280") + "</g></svg>";
    return mk(T_MIX, "melange", ["Orange", "Vert", "Violet"].indexOf(m[2]) >= 0 ? "moyen" : "facile", "Quelle couleur obtient-on en mélangeant de la peinture " + m[0].toLowerCase() + " et de la peinture " + m[1].toLowerCase() + " ?", [m[2]].concat(wrong.map(function (w) { return w.n; })), s,
      m[0] + " + " + m[1] + " = " + m[2].toLowerCase() + ".");
  }

  /* ---------- ⏰ Lire l'heure ---------- */
  function hm(h, m) { return h + " h" + (m ? " " + (m < 10 ? "0" + m : m) : ""); }
  function clockSvg(h, m) {
    var cx = 110, cy = 110, R = 98, s = open(220, 220) + Ci(cx, cy, R, "#ffffff", "#1f2937", 5), i, a;
    for (i = 0; i < 60; i++) {
      a = i * Math.PI / 30; var r1 = R - (i % 5 === 0 ? 11 : 6), r2 = R - 2;
      s += Ln(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a), cx + r2 * Math.sin(a), cy - r2 * Math.cos(a), "#1f2937", i % 5 === 0 ? 2.6 : 1);
    }
    for (i = 1; i <= 12; i++) { a = i * Math.PI / 6; s += Tx(cx + 74 * Math.sin(a), cy - 74 * Math.cos(a) + 6, String(i), 17, "#111827"); }
    var ah = ((h % 12) + m / 60) * Math.PI / 6, am = m * Math.PI / 30;
    s += '<g data-h="' + h + '" data-m="' + m + '">' + Ln(cx, cy, cx + 50 * Math.sin(ah), cy - 50 * Math.cos(ah), "#111827", 8, 'data-hand="h"') + Ln(cx, cy, cx + 76 * Math.sin(am), cy - 76 * Math.cos(am), "#2563eb", 4.5, 'data-hand="m"') + "</g>" + Ci(cx, cy, 6, "#111827");
    return s + "</svg>";
  }
  function qClock() {
    var lvl = pick(["facile", "moyen", "moyen", "difficile"]), h = 1 + rnd(12), m = lvl === "facile" ? pick([0, 30]) : lvl === "moyen" ? pick([0, 15, 30, 45]) : 5 * rnd(12);
    var good = hm(h, m), pool = [[h % 12 + 1, m], [(h + 10) % 12 + 1, m], [h, (m + 15) % 60], [h, (m + 45) % 60], [h, (m + 30) % 60]];
    if (m % 5 === 0 && (m / 5 || 12) !== h) pool.unshift([m / 5 || 12, (h % 12) * 5]);         /* piège : aiguilles lues à l'envers */
    var ans = [good], seen = {}; seen[good] = 1;
    pool.forEach(function (p) { var t = hm(p[0], p[1]); if (ans.length < 4 && !seen[t]) { seen[t] = 1; ans.push(t); } });
    return mk(T_CLOCK, "horloge", lvl, "Quelle heure indique cette horloge ? (la petite aiguille épaisse indique les heures)", ans, clockSvg(h, m), "Petite aiguille sur le " + h + ", grande aiguille sur le " + (m / 5) + " : il est " + good + ".");
  }

  /* ---------- 🧩 Suites logiques ---------- */
  var SSH = ["cercle", "carré", "triangle"];
  function combo() { return { s: pick(SSH), c: pick(COLS) }; }
  function sameC(a, b) { return a.s === b.s && a.c.n === b.c.n; }
  function cName(x) { return "Un " + x.s + " " + x.c.n; }
  function boxItem(i, x, y, it) {
    return '<g data-box="' + i + '">' + Rc(x, y, 40, 40, "#ffffff", "#94a3b8", 2) + shapeSvg(it.s, x + 20, y + 20, 11, it.c, "") + "</g>";
  }
  function qSuiteShape() {
    var p = pick([2, 2, 3]), base = [], guard = 0;
    while (base.length < p && guard++ < 50) { var c = combo(); if (!base.some(function (b) { return sameC(b, c); })) base.push(c); }
    if (base.length < p) return null;
    var s = open(300, 130), i, seq = [];
    for (i = 0; i < 6; i++) seq.push(base[i % p]);
    for (i = 0; i < 5; i++) s += boxItem(i, 5 + i * 49, 45, seq[i]);
    s += '<g data-box="5" data-hidden="1">' + Rc(250, 45, 40, 40, "#e5e7eb", "#6b7280", 2) + Tx(270, 74, "?", 28, "#6b7280") + "</g></svg>";
    var ans = seq[5], pool = [];
    SSH.forEach(function (sh) { COLS.forEach(function (c) { var x = { s: sh, c: c }; if (!sameC(x, ans)) pool.push(x); }); });
    var wrong = [seq[4]];
    shuffle(pool).forEach(function (x) { if (wrong.length < 3 && !wrong.some(function (w) { return sameC(w, x); }) && !sameC(x, ans)) wrong.push(x); });
    return mk(T_SUITE, "suite-forme", p === 2 ? "facile" : "moyen", "Quelle forme complète la suite à la place du point d'interrogation ?", [cName(ans)].concat(wrong.map(cName)), s, "La suite se répète toutes les " + p + " formes : la suivante est " + cName(ans).toLowerCase() + ".");
  }
  function dotsBox(i, x, y, n) {
    var s = '<g data-box="' + i + '" data-n="' + n + '">' + Rc(x, y, 50, 50, "#ffffff", "#94a3b8", 2), k;
    for (k = 0; k < n; k++) s += Ci(x + 9 + (k % 5) * 8, y + 17 + Math.floor(k / 5) * 16, 3.6, "#2563eb");
    return s + "</g>";
  }
  function qSuiteGrow() {
    var st = 1 + rnd(3), d = 1 + rnd(2), s = open(300, 130), i, vals = [];
    for (i = 0; i < 4; i++) { vals.push(st + i * d); s += dotsBox(i, 5 + i * 58, 40, vals[i]); }
    s += '<g data-box="4" data-hidden="1">' + Rc(237, 40, 50, 50, "#e5e7eb", "#6b7280", 2) + Tx(262, 76, "?", 28, "#6b7280") + "</g></svg>";
    var v = st + 4 * d;
    return mk(T_SUITE, "suite-points", "moyen", "Combien de points y aura-t-il dans la case suivante ?", numAns(v, [v - 2, v - 1, v + 1, v + 2, v + 3].filter(function (x) { return x > 0; }), String), s,
      "On ajoute " + d + " point" + (d > 1 ? "s" : "") + " à chaque case : " + vals.join(", ") + ", puis " + v + ".");
  }

  /* ---------- 📐 Angles ---------- */
  function angleSvg(deg) {
    var vx = deg > 90 ? 170 : 60, vy = 165, L1 = deg > 90 ? 110 : 170, L2 = 130, a = deg * Math.PI / 180, s = open(300, 200);
    var x2 = vx + L2 * Math.cos(a), y2 = vy - L2 * Math.sin(a);
    s += Ln(vx, vy, vx + L1, vy, "#1f2937", 4, 'data-arm="1"') + Ln(vx, vy, x2, y2, "#dc2626", 4, 'data-arm="2"');
    if (deg === 90) s += '<polyline points="' + (vx + 20) + "," + vy + " " + (vx + 20) + "," + (vy - 20) + " " + vx + "," + (vy - 20) + '" fill="none" stroke="#2563eb" stroke-width="3"/>';
    else s += '<path d="M ' + f1(vx + 34) + " " + vy + " A 34 34 0 0 0 " + f1(vx + 34 * Math.cos(a)) + " " + f1(vy - 34 * Math.sin(a)) + '" fill="none" stroke="#2563eb" stroke-width="3"/>';
    return s + Ci(vx, vy, 4.5, "#111827") + '<g data-angle="' + deg + '"></g></svg>';
  }
  var A_NAME = { aigu: "Un angle aigu", droit: "Un angle droit", obtus: "Un angle obtus", plat: "Un angle plat" };
  function angleKind(d) { return d < 90 ? "aigu" : d === 90 ? "droit" : d < 180 ? "obtus" : "plat"; }
  function qAngleType() {
    var d = pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180]), k = angleKind(d);
    var order = ["aigu", "droit", "obtus", "plat"].filter(function (x) { return x !== k; });
    return mk(T_ANGLE, "angle-type", d === 90 || d === 180 ? "facile" : "moyen", "Quel est le type de cet angle ?", [A_NAME[k]].concat(order.map(function (x) { return A_NAME[x]; })), angleSvg(d),
      "Un angle de " + d + "° est " + (k === "aigu" ? "aigu (moins de 90°)" : k === "droit" ? "droit (exactement 90°)" : k === "obtus" ? "obtus (entre 90° et 180°)" : "plat (exactement 180°)") + ".");
  }
  function qAngleMeasure() {
    var set = [30, 60, 90, 120, 150], d = pick(set);
    return mk(T_ANGLE, "angle-mesure", "difficile", "Quelle est la mesure approximative de cet angle ?", [d + "°"].concat(sample(set.filter(function (x) { return x !== d; }), 3).map(function (x) { return x + "°"; })), angleSvg(d), "Cet angle mesure " + d + "°.");
  }

  /* ---------- 🪞 Axes de symétrie ---------- */
  function reg(n, r, rot) { var p = [], i; for (i = 0; i < n; i++) { var a = -Math.PI / 2 + (rot || 0) + i * 2 * Math.PI / n; p.push([150 + r * Math.cos(a), 100 + r * Math.sin(a)]); } return p; }
  var FIGS = [
    { id: "triangle-equilateral", name: "un triangle équilatéral", axes: 3, pts: reg(3, 80) },
    { id: "carre", name: "un carré", axes: 4, pts: [[90, 40], [210, 40], [210, 160], [90, 160]] },
    { id: "rectangle", name: "un rectangle", axes: 2, pts: [[65, 55], [235, 55], [235, 145], [65, 145]] },
    { id: "losange", name: "un losange", axes: 2, pts: [[150, 20], [225, 100], [150, 180], [75, 100]] },
    { id: "pentagone", name: "un pentagone régulier", axes: 5, pts: reg(5, 80) },
    { id: "hexagone", name: "un hexagone régulier", axes: 6, pts: reg(6, 80) },
    { id: "triangle-isocele", name: "un triangle isocèle", axes: 1, pts: [[150, 25], [215, 175], [85, 175]] },
    { id: "cerf-volant", name: "un cerf-volant", axes: 1, pts: [[150, 20], [205, 85], [150, 180], [95, 85]] },
    { id: "parallelogramme", name: "un parallélogramme", axes: 0, pts: [[90, 55], [250, 55], [210, 145], [50, 145]] },
    { id: "trapeze-isocele", name: "un trapèze isocèle", axes: 1, pts: [[105, 55], [195, 55], [245, 145], [55, 145]] }
  ];
  function qSym() {
    var fg = pick(FIGS), col = pick(["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"]);
    var s = open(300, 200) + Po(fg.pts, col, "#1f2937", 3.5, 'data-fig="' + fg.id + '" data-axes="' + fg.axes + '"') + "</svg>";
    return mk(T_SYM, "symetrie", fg.axes >= 5 || fg.axes === 0 ? "difficile" : "moyen", "Combien d'axes de symétrie a cette figure ?", numAns(fg.axes, [0, 1, 2, 3, 4, 5, 6], String), s,
      fg.name.charAt(0).toUpperCase() + fg.name.slice(1) + " a " + fg.axes + " axe" + (fg.axes > 1 ? "s" : "") + " de symétrie.");
  }

  /* ---------- 🍕 Fractions ---------- */
  function fracAns(k, n) {
    var cands = [[n - k, n], [k + 1, n], [k - 1, n], [k, n + 1], [k, n - k], [n - k, k], [k + 1, n + 1]].filter(function (f) { return f[0] > 0 && f[1] > 0 && f[0] < f[1] + 1 && f[0] * n !== k * f[1]; });
    return numAns(k * 1000 + n, cands.map(function (f) { return f[0] * 1000 + f[1]; }), function (v) { return Math.floor(v / 1000) + "/" + (v % 1000); });
  }
  function qFracPie() {
    var n = pick([2, 3, 4, 6, 8]), k = 1 + rnd(n - 1), s = open(300, 200), i, cx = 150, cy = 100, r = 85;
    for (i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n;
      s += '<path data-part="' + i + '" data-on="' + (i < k ? 1 : 0) + '" d="M ' + cx + " " + cy + " L " + f1(cx + r * Math.cos(a0)) + " " + f1(cy + r * Math.sin(a0)) + " A " + r + " " + r + " 0 0 1 " + f1(cx + r * Math.cos(a1)) + " " + f1(cy + r * Math.sin(a1)) + ' Z" fill="' + (i < k ? "#f97316" : "#ffffff") + '" stroke="#1f2937" stroke-width="3" stroke-linejoin="round"/>';
    }
    var ans = fracAns(k, n);
    return mk(T_FRAC, "fraction-disque", n <= 4 ? "facile" : n === 6 ? "moyen" : "difficile", "Quelle fraction du disque est coloriée ?", ans, s + "</svg>", k + " parts coloriées sur " + n + " parts égales : " + k + "/" + n + ".");
  }
  function qFracBar() {
    var n = pick([3, 4, 5, 6, 8, 10]), k = 1 + rnd(n - 1), s = open(300, 160), i, w = 260 / n;
    for (i = 0; i < n; i++) s += Rc(20 + i * w, 45, w, 70, i < k ? "#16a34a" : "#ffffff", "#1f2937", 3, 'data-part="' + i + '" data-on="' + (i < k ? 1 : 0) + '"');
    return mk(T_FRAC, "fraction-barre", n <= 4 ? "facile" : n <= 6 ? "moyen" : "difficile", "Quelle fraction de la barre est coloriée ?", fracAns(k, n), s + "</svg>", k + " cases coloriées sur " + n + " cases égales : " + k + "/" + n + ".");
  }

  /* ---------- 📍 Coordonnées ---------- */
  var GR = { ox: 40, oy: 200, st: 30, nx: 8, ny: 6 };
  function gridSvg(points) {
    var s = open(300, 230), i;
    for (i = 0; i <= GR.nx; i++) s += Ln(GR.ox + i * GR.st, GR.oy, GR.ox + i * GR.st, GR.oy - GR.ny * GR.st, i === 0 ? "#111827" : "#cbd5e1", i === 0 ? 2.5 : 1) + Tx(GR.ox + i * GR.st, GR.oy + 17, String(i), 12, "#374151");
    for (i = 0; i <= GR.ny; i++) s += Ln(GR.ox, GR.oy - i * GR.st, GR.ox + GR.nx * GR.st, GR.oy - i * GR.st, i === 0 ? "#111827" : "#cbd5e1", i === 0 ? 2.5 : 1) + Tx(GR.ox - 12, GR.oy - i * GR.st + 4, String(i), 12, "#374151");
    points.forEach(function (p) {
      s += Ci(GR.ox + p.x * GR.st, GR.oy - p.y * GR.st, 7, "#dc2626", "#7f1d1d", 2, 'data-pt="' + p.l + '" data-x="' + p.x + '" data-y="' + p.y + '"') + Tx(GR.ox + p.x * GR.st + 11, GR.oy - p.y * GR.st - 9, p.l, 15, "#7f1d1d", "start");
    });
    return s + "</svg>";
  }
  function cf(x, y) { return "(" + x + " ; " + y + ")"; }
  function qCoordPoint() {
    var x = 1 + rnd(GR.nx), y = 1 + rnd(GR.ny), cands = [[y, x], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1]].filter(function (c) { return c[0] >= 0 && c[0] <= GR.nx && c[1] >= 0 && c[1] <= GR.ny; });
    var ans = [cf(x, y)], seen = {}; seen[cf(x, y)] = 1;
    shuffle(cands).forEach(function (c) { var t = cf(c[0], c[1]); if (ans.length < 4 && !seen[t]) { seen[t] = 1; ans.push(t); } });
    return mk(T_COORD, "coord-point", "moyen", "Quelles sont les coordonnées du point A ? (d'abord l'abscisse horizontale, puis l'ordonnée verticale)", ans, gridSvg([{ l: "A", x: x, y: y }]), "A est à " + x + " vers la droite et " + y + " vers le haut : " + cf(x, y) + ".");
  }
  function qCoordFind() {
    var pts = [], guard = 0, letters = ["A", "B", "C", "D"];
    while (pts.length < 4 && guard++ < 100) {
      var x = 1 + rnd(GR.nx), y = 1 + rnd(GR.ny);
      if (!pts.some(function (p) { return p.x === x || p.y === y; })) pts.push({ l: letters[pts.length], x: x, y: y });
    }
    if (pts.length < 4) return null;
    var t = pick(pts);
    return mk(T_COORD, "coord-trouver", "difficile", "Quel point a pour coordonnées " + cf(t.x, t.y) + " ?", ["Le point " + t.l].concat(pts.filter(function (p) { return p !== t; }).map(function (p) { return "Le point " + p.l; })), gridSvg(pts), "Le point " + t.l + " est en " + cf(t.x, t.y) + ".");
  }

  /* ---------- Assemblage ---------- */
  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true; q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  var PLAN = [[qCountShape, 14], [qCountColor, 12], [qSwatch, 14], [qMix, 10], [qClock, 30], [qSuiteShape, 14], [qSuiteGrow, 10], [qAngleType, 14], [qAngleMeasure, 10], [qSym, 20], [qFracPie, 14], [qFracBar, 10], [qCoordPoint, 14], [qCoordFind, 10]];
  function build() {
    var out = [];
    PLAN.forEach(function (p) { var made = 0, guard = 0; while (made < p[1] && guard++ < p[1] * 10) { var q = p[0](); if (q && valid(q)) { out.push(q); made++; } } });
    return out;
  }
  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].v50Img) QUESTIONS.splice(i, 1);
    var pool = build(); pool.forEach(function (q) { QUESTIONS.push(q); }); return pool.length;
  }
  return { THEMES: [T_COUNT, T_MIX, T_CLOCK, T_SUITE, T_ANGLE, T_SYM, T_FRAC, T_COORD], FIGS: FIGS, GR: GR, PAINT: PAINT, MIXES: MIXES, COLS: COLS, build: build, register: register, valid: valid, hm: hm, clockSvg: clockSvg, angleSvg: angleSvg, gridSvg: gridSvg };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V50Img;
if (typeof QUESTIONS !== "undefined") {
  V50Img.register();
  if (typeof startGame === "function") {
    var __v50ImgStart = startGame;
    startGame = function () { try { V50Img.register(); } catch (e) {} return __v50ImgStart.apply(this, arguments); };
  }
}
