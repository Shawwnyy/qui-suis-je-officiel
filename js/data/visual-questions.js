/* =============================================================================
   Thème « 🖼️ Questions en images » — scènes dessinées par le jeu (SVG), sans fichier externe.
   Chaque question est calculée à partir des données qui servent à DESSINER la scène : la bonne réponse
   ne peut donc pas contredire l'image. Le lot est régénéré à chaque lancement de partie (nouvelles couleurs,
   nouvelles positions). Exemples : « De quelle couleur est le pull de la personne ? »,
   « Combien de personnes portent un pull rouge ? ».
   ============================================================================= */
var V40Visual = (function () {
  "use strict";
  var THEME = "🖼️ Questions en images";

  var COLORS = [
    { m: "Rouge", f: "rouge", fp: "rouges", hex: "#e11d2e" },
    { m: "Bleu", f: "bleue", fp: "bleues", hex: "#1f6feb" },
    { m: "Vert", f: "verte", fp: "vertes", hex: "#1fa34a" },
    { m: "Jaune", f: "jaune", fp: "jaunes", hex: "#facc15" },
    { m: "Orange", f: "orange", fp: "orange", hex: "#f97316" },
    { m: "Violet", f: "violette", fp: "violettes", hex: "#8b3fd1" },
    { m: "Rose", f: "rose", fp: "roses", hex: "#f472b6" },
    { m: "Noir", f: "noire", fp: "noires", hex: "#2a2a2e" },
    { m: "Blanc", f: "blanche", fp: "blanches", hex: "#fafafa" },
    { m: "Marron", f: "marron", fp: "marron", hex: "#8b5a2b" }
  ];
  var HAIR = [
    { m: "Blond", p: "blonds", hex: "#f1cf6b" }, { m: "Roux", p: "roux", hex: "#e2561a" }, { m: "Brun", p: "bruns", hex: "#5a3a1f" },
    { m: "Noir", p: "noirs", hex: "#1b1b1f" }, { m: "Gris", p: "gris", hex: "#b9bcc4" }
  ];
  var SKINS = ["#f6d1b1", "#e8b48c", "#c68a5e", "#8d5a3b", "#5e3b26"];
  var SCENES = [
    { sky: "#cfe8ff", ground: "#9bd08a" }, { sky: "#ffe7c7", ground: "#e8c07d" }, { sky: "#e6dcff", ground: "#b7e0c0" },
    { sky: "#d4f3ee", ground: "#f0d9a8" }, { sky: "#ffd9e2", ground: "#c7e3a0" }
  ];
  var ORD = ["1re", "2e", "3e", "4e", "5e", "6e"];

  /* ---------- Aléatoire ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }
  function without(a, x) { return a.filter(function (e) { return e !== x; }); }

  /* ---------- Dessin ---------- */
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.max(0, Math.min(255, Math.round(c * (1 - k)))); }
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  function wrap(w, h, body, scene) {
    var s = scene || pick(SCENES);
    var cloud = function (x, y, k) { return '<g fill="#ffffff" opacity="0.85"><ellipse cx="' + x + '" cy="' + y + '" rx="' + 30 * k + '" ry="' + 11 * k + '"/><ellipse cx="' + (x + 18 * k) + '" cy="' + (y - 7 * k) + '" rx="' + 18 * k + '" ry="' + 10 * k + '"/><ellipse cx="' + (x - 16 * k) + '" cy="' + (y - 4 * k) + '" rx="' + 15 * k + '" ry="' + 9 * k + '"/></g>'; };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'
      + '<rect width="' + w + '" height="' + h + '" fill="' + s.sky + '"/>'
      + '<circle cx="' + (w - 46) + '" cy="40" r="22" fill="#ffe27a"/>'
      + cloud(70 + rnd(60), 38 + rnd(14), 1) + cloud(200 + rnd(60), 70 + rnd(10), 0.7)
      + '<rect y="' + (h - 52) + '" width="' + w + '" height="52" fill="' + s.ground + '"/>'
      + body + '</svg>';
  }
  /* Personnage : origine = milieu des pieds. o = {skin, hair, style, pull, pants, hat} (couleurs hex) */
  function person(cx, by, sc, o) {
    var pd = shade(o.pull, 0.28), ld = shade(o.pants, 0.3), hd = o.hat ? shade(o.hat, 0.25) : "";
    var g = '<g transform="translate(' + r1(cx) + ' ' + r1(by) + ') scale(' + sc + ')">';
    g += '<rect x="-17" y="-44" width="15" height="44" rx="5" fill="' + o.pants + '" stroke="' + ld + '" stroke-width="2"/>';
    g += '<rect x="2" y="-44" width="15" height="44" rx="5" fill="' + o.pants + '" stroke="' + ld + '" stroke-width="2"/>';
    g += '<ellipse cx="-10" cy="1" rx="10" ry="4" fill="#2b2b33"/><ellipse cx="10" cy="1" rx="10" ry="4" fill="#2b2b33"/>';
    g += '<rect x="-44" y="-94" width="19" height="48" rx="9.5" transform="rotate(9 -34 -92)" fill="' + o.pull + '" stroke="' + pd + '" stroke-width="2"/>';
    g += '<rect x="25" y="-94" width="19" height="48" rx="9.5" transform="rotate(-9 34 -92)" fill="' + o.pull + '" stroke="' + pd + '" stroke-width="2"/>';
    g += '<circle cx="-41" cy="-44" r="7" fill="' + o.skin + '"/><circle cx="41" cy="-44" r="7" fill="' + o.skin + '"/>';
    g += '<rect x="-25" y="-98" width="50" height="60" rx="15" fill="' + o.pull + '" stroke="' + pd + '" stroke-width="2"/>';
    g += '<rect x="-25" y="-46" width="50" height="8" rx="4" fill="' + pd + '"/>';
    g += '<rect x="-6" y="-108" width="12" height="14" rx="4" fill="' + o.skin + '"/>';
    g += '<ellipse cx="0" cy="-99" rx="13" ry="6" fill="' + pd + '"/>';
    if (o.style === "long") g += '<ellipse cx="0" cy="-120" rx="27" ry="30" fill="' + o.hair + '"/>';
    g += '<circle cx="-22" cy="-121" r="5" fill="' + o.skin + '"/><circle cx="22" cy="-121" r="5" fill="' + o.skin + '"/>';
    g += '<circle cx="0" cy="-122" r="22" fill="' + o.skin + '"/>';
    if (o.style === "bun") g += '<circle cx="0" cy="-149" r="10" fill="' + o.hair + '"/>';
    g += '<path d="M-23 -124 Q0 -152 23 -124 Q11 -133 0 -131 Q-11 -133 -23 -124Z" fill="' + o.hair + '"/>';
    if (o.hat) {
      g += '<path d="M-24 -128 Q0 -170 24 -128Z" fill="' + o.hat + '" stroke="' + hd + '" stroke-width="2"/>';
      g += '<rect x="-26" y="-135" width="52" height="10" rx="5" fill="' + hd + '"/><circle cx="0" cy="-156" r="6" fill="' + o.hat + '" stroke="' + hd + '" stroke-width="1.5"/>';
    }
    g += '<circle cx="-8" cy="-120" r="2.7" fill="#222"/><circle cx="8" cy="-120" r="2.7" fill="#222"/>';
    g += '<path d="M-8 -110 Q0 -102 8 -110" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>';
    return g + "</g>";
  }
  function look(over) {
    var base = { skin: pick(SKINS), hair: pick(HAIR).hex, style: pick(["short", "long", "bun"]), pull: "#1f6feb", pants: "#3b4a6b", hat: "" };
    for (var k in over) base[k] = over[k];
    return base;
  }
  function star(cx, cy, R, fill) {
    var pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R; pts.push(r1(cx + r * Math.cos(a)) + "," + r1(cy + r * Math.sin(a))); }
    return '<polygon points="' + pts.join(" ") + '" fill="' + fill + '" stroke="' + shade(fill, 0.3) + '" stroke-width="2" stroke-linejoin="round"/>';
  }

  /* ---------- Réponses ---------- */
  function colorOptions(correct, pool) {
    var seenC = {};
    pool = (pool || COLORS).filter(function (c) { if (seenC[c.m]) return false; seenC[c.m] = 1; return true; });
    var wrong = sample(pool.filter(function (c) { return c.m !== correct.m; }), 3).map(function (c) { return c.m; });
    return [correct.m].concat(wrong);
  }
  function numberOptions(n, lo, hi) {
    var cand = [], d;
    for (d = 1; d <= 4; d++) { cand.push(n - d, n + d); }
    cand = shuffle(cand.filter(function (v) { return v >= lo && v <= hi && v !== n; }));
    var seen = {}, out = [];
    cand.forEach(function (v) { if (!seen[v] && out.length < 3) { seen[v] = 1; out.push(v); } });
    for (var v = lo; v <= hi && out.length < 3; v++) { if (v !== n && !seen[v]) { seen[v] = 1; out.push(v); } }
    return [String(n)].concat(out.map(String));
  }
  function mk(diff, text, answers, svg, correction) {
    return { category: THEME, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction,
      media: { type: "svg", svg: svg }, source: "officiel", v35: true, v40Visual: true };
  }

  /* ---------- Générateurs ---------- */
  function qSinglePull() {
    var pull = pick(COLORS), pants = pick(without(COLORS, pull));
    var svg = wrap(400, 240, person(200, 222, 1.12, look({ pull: pull.hex, pants: pants.hex })));
    var text = pick(["De quelle couleur est le pull de la personne ?", "Quelle est la couleur du pull du personnage ?", "Le pull de la personne est de quelle couleur ?"]);
    return mk("facile", text, colorOptions(pull), svg, "Le pull est " + pull.f + ".");
  }
  function qHair() {
    var h = pick(HAIR), pull = pick(COLORS);
    var svg = wrap(400, 240, person(200, 222, 1.12, look({ hair: h.hex, pull: pull.hex, pants: "#3b4a6b" })));
    var ans = [h.m].concat(sample(HAIR.filter(function (x) { return x.m !== h.m; }), 3).map(function (x) { return x.m; }));
    return mk("facile", pick(["Quelle est la couleur des cheveux de la personne ?", "De quelle couleur sont les cheveux du personnage ?"]), ans, svg, "Les cheveux sont " + h.p + ".");
  }
  function qShapeColor() {
    var cols = sample(COLORS.filter(function (c) { return c.m !== "Blanc"; }), 4);
    var names = [{ n: "le cercle", N: "Le cercle", fem: false }, { n: "le carré", N: "Le carré", fem: false }, { n: "le triangle", N: "Le triangle", fem: false }, { n: "l'étoile", N: "L'étoile", fem: true }];
    var xs = shuffle([62, 150, 250, 338]), body = "";
    body += '<circle cx="' + xs[0] + '" cy="118" r="34" fill="' + cols[0].hex + '" stroke="' + shade(cols[0].hex, 0.3) + '" stroke-width="3"/>';
    body += '<rect x="' + (xs[1] - 32) + '" y="86" width="64" height="64" rx="4" fill="' + cols[1].hex + '" stroke="' + shade(cols[1].hex, 0.3) + '" stroke-width="3"/>';
    body += '<polygon points="' + xs[2] + ',80 ' + (xs[2] - 38) + ',148 ' + (xs[2] + 38) + ',148" fill="' + cols[2].hex + '" stroke="' + shade(cols[2].hex, 0.3) + '" stroke-width="3" stroke-linejoin="round"/>';
    body += star(xs[3], 116, 40, cols[3].hex);
    var svg = wrap(400, 240, body), i = rnd(4);
    if (Math.random() < 0.5) {
      return mk("facile", "De quelle couleur est " + names[i].n + " ?", colorOptions(cols[i], cols.concat(sample(COLORS, 6))), svg, names[i].N + " est " + (names[i].fem ? cols[i].f : cols[i].m.toLowerCase()) + ".");
    }
    var shapes = names.map(function (x) { return x.N; });
    return mk("facile", "Quelle forme est " + cols[i].f + " ?", [shapes[i]].concat(shapes.filter(function (x, k) { return k !== i; })), svg, shapes[i] + " est " + (names[i].fem ? cols[i].f : cols[i].m.toLowerCase()) + ".");
  }
  function qPants() {
    var pull = pick(COLORS), pants = pick(without(COLORS, pull));
    var svg = wrap(400, 240, person(200, 222, 1.12, look({ pull: pull.hex, pants: pants.hex })));
    return mk("moyen", pick(["De quelle couleur est le pantalon de la personne ?", "Quelle est la couleur du pantalon du personnage ?"]), colorOptions(pants), svg, "Le pantalon est " + pants.m.toLowerCase() + ".");
  }
  function qHat() {
    var pull = pick(COLORS), pants = pick(without(COLORS, pull)), hat = pick(COLORS.filter(function (c) { return c !== pull && c !== pants; }));
    var svg = wrap(400, 240, person(200, 224, 1.08, look({ pull: pull.hex, pants: pants.hex, hat: hat.hex })));
    return mk("moyen", pick(["De quelle couleur est le bonnet de la personne ?", "Quelle est la couleur du bonnet du personnage ?"]), colorOptions(hat), svg, "Le bonnet est " + hat.m.toLowerCase() + ".");
  }
  function qTwo() {
    var two = sample(COLORS, 2), left = Math.random() < 0.5;
    var svg = wrap(400, 240, person(112, 224, 1.0, look({ pull: two[0].hex })) + person(288, 224, 1.0, look({ pull: two[1].hex })));
    var t = left ? two[0] : two[1];
    return mk("moyen", "De quelle couleur est le pull de la personne " + (left ? "de gauche" : "de droite") + " ?", colorOptions(t, COLORS), svg, "Le pull est " + t.f + ".");
  }
  function placeCells(n, cols, rows, w, h, x0, y0) {
    var cells = [], c, r;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) cells.push([x0 + (c + 0.5) * w / cols, y0 + (r + 0.5) * h / rows]);
    return sample(cells, n).map(function (p) { return [p[0] + rnd(15) - 7, p[1] + rnd(13) - 6]; });
  }
  function qBalloons() {
    var n = 3 + rnd(7), pos = placeCells(n, 5, 2, 390, 150, 5, 18), body = "";
    pos.forEach(function (p) {
      var c = pick(COLORS);
      body += '<path d="M' + r1(p[0]) + " " + r1(p[1] + 26) + " q 7 22 -3 46" + '" fill="none" stroke="#555" stroke-width="1.5"/>';
      body += '<ellipse cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" rx="19" ry="24" fill="' + c.hex + '" stroke="' + shade(c.hex, 0.3) + '" stroke-width="2.5"/>';
      body += '<ellipse cx="' + r1(p[0] - 7) + '" cy="' + r1(p[1] - 9) + '" rx="4.5" ry="7" fill="#fff" opacity="0.45"/>';
    });
    return mk("moyen", pick(["Combien de ballons y a-t-il sur l'image ?", "Combien y a-t-il de ballons ?"]), numberOptions(n, 2, 11), wrap(400, 240, body), "Il y a " + n + " ballons.");
  }
  function group(n, scale, colorsFor, hatsFor) {
    var step = 400 / n, body = "";
    for (var i = 0; i < n; i++) body += person(step * (i + 0.5), 226, scale, look({ pull: colorsFor[i].hex, pants: pick(["#3b4a6b", "#4a4a52", "#5a4632"]), hat: hatsFor && hatsFor[i] ? hatsFor[i].hex : "" }));
    return wrap(400, 240, body);
  }
  function qGroupCount() {
    var T = pick(COLORS), k = 1 + rnd(3), others = COLORS.filter(function (c) { return c !== T; });
    var cols = [], i;
    for (i = 0; i < k; i++) cols.push(T);
    for (i = k; i < 5; i++) cols.push(pick(others));
    cols = shuffle(cols);
    return mk("difficile", "Combien de personnes portent un pull " + T.f + " ?", numberOptions(k, 0, 5), group(5, 0.74, cols), "Il y en a " + k + ".");
  }
  function uniqueColors(n) { return sample(COLORS, n); }
  function qGroupPosition() {
    var cols = uniqueColors(5), i = rnd(5);
    var ans = ["La " + ORD[i] + " personne"].concat(sample([0, 1, 2, 3, 4].filter(function (x) { return x !== i; }), 3).map(function (x) { return "La " + ORD[x] + " personne"; }));
    return mk("difficile", "Quelle personne porte un pull " + cols[i].f + " ? (position en partant de la gauche)", ans, group(5, 0.74, cols), "C'est la " + ORD[i] + " personne en partant de la gauche.");
  }
  function qGroupNth() {
    var cols = uniqueColors(5), i = rnd(5);
    return mk("difficile", "De quelle couleur est le pull de la " + ORD[i] + " personne en partant de la gauche ?", colorOptions(cols[i], cols.concat(sample(COLORS, 5))), group(5, 0.74, cols), "Le pull est " + cols[i].f + ".");
  }
  function qStars() {
    var T = pick(COLORS.filter(function (c) { return c.m !== "Blanc"; })), k = 2 + rnd(4), total = 8 + rnd(4);
    var others = COLORS.filter(function (c) { return c !== T && c.m !== "Blanc"; });
    var cols = [], i;
    for (i = 0; i < k; i++) cols.push(T);
    for (i = k; i < total; i++) cols.push(pick(others));
    cols = shuffle(cols);
    var pos = placeCells(total, 6, 3, 390, 170, 5, 12), body = "";
    pos.forEach(function (p, j) { body += star(p[0], p[1], 19, cols[j].hex); });
    return mk("difficile", "Combien d'étoiles " + T.fp + " y a-t-il ?", numberOptions(k, 1, 7), wrap(400, 240, body), "Il y a " + k + " étoiles " + T.fp + ".");
  }
  function qHatsAndPull() {
    var pal = sample(COLORS, 3), n = 6, T = pal[0], cols = [], hats = [], k = 0, i;
    for (i = 0; i < n; i++) { cols.push(pick(pal)); hats.push(Math.random() < 0.5 ? pick(without(COLORS, cols[i])) : null); }
    for (i = 0; i < n; i++) if (cols[i] === T && hats[i]) k++;
    if (k < 1 || k > 3) return null;
    return mk("impossible", "Combien de personnes portent à la fois un pull " + T.f + " et un bonnet ?", numberOptions(k, 0, 5), group(n, 0.66, cols, hats), "Il y en a " + k + ".");
  }

  function build() {
    var plan = [[qSinglePull, 16], [qHair, 8], [qShapeColor, 9], [qPants, 8], [qHat, 8], [qTwo, 10], [qBalloons, 10],
      [qGroupCount, 10], [qGroupPosition, 8], [qGroupNth, 6], [qStars, 8], [qHatsAndPull, 10]];
    var out = [], seen = {};
    plan.forEach(function (p) {
      var made = 0, guard = 0;
      while (made < p[1] && guard++ < p[1] * 8) {
        var q = p[0]();
        if (!q || !valid(q)) continue;
        out.push(q); made++;
      }
    });
    return out;
  }
  /* Contrôle de cohérence : 4 réponses différentes, la bonne en premier, SVG accepté par le filtre de QMedia. */
  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true;
    q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }

  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].v40Visual) QUESTIONS.splice(i, 1);
    var pool = build();
    pool.forEach(function (q) { QUESTIONS.push(q); });
    return pool.length;
  }
  return { THEME: THEME, build: build, register: register, valid: valid, COLORS: COLORS };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V40Visual;
if (typeof QUESTIONS !== "undefined") {
  V40Visual.register();
  /* nouvelles scènes à chaque partie lancée par l'hôte */
  if (typeof startGame === "function") {
    var __v40VisualStart = startGame;
    startGame = function () { try { V40Visual.register(); } catch (e) {} return __v40VisualStart.apply(this, arguments); };
  }
}
