/* =============================================================================
   Deux thèmes en images « jeu des 7 erreurs », dessinés par le jeu (SVG, aucune image extérieure) :
     🔍 Trouve la différence — deux images côte à côte ; une, deux ou trois choses changent dans l'image 2
                               (couleur, forme, taille, disparition, apparition) : qu'est-ce qui a changé ? où ? combien ?
     🧐 Trouve l'intrus      — une grille de formes identiques sauf une : laquelle ? de quelle couleur ? où ? combien d'autres ?
   La bonne réponse vient des données qui servent à DESSINER les images ; tests/diff.test.js la relit dans le SVG
   (attributs data-*), indépendamment du générateur. Chaque bonne réponse est accompagnée d'une explication (correction).
   Les questions sont régénérées à chaque partie, comme celles de image-v50.js.
   ============================================================================= */
var VDiff = (function () {
  "use strict";
  var T_DIFF = "🔍 Trouve la différence", T_ODD = "🧐 Trouve l'intrus";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function f1(x) { return (Math.round(x * 10) / 10).toString(); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var SH = [{ n: "cercle", f: 0 }, { n: "carré", f: 0 }, { n: "triangle", f: 0 }, { n: "étoile", f: 1 }, { n: "losange", f: 0 }];
  var CO = [{ m: "rouge", f: "rouge", h: "#dc2626" }, { m: "bleu", f: "bleue", h: "#2563eb" }, { m: "vert", f: "verte", h: "#16a34a" },
    { m: "jaune", f: "jaune", h: "#eab308" }, { m: "violet", f: "violette", h: "#7c3aed" }, { m: "orange", f: "orange", h: "#f97316" }];
  var POS = ["en haut à gauche", "en haut au centre", "en haut à droite", "en bas à gauche", "en bas au centre", "en bas à droite"];

  /* ---------- Noms ---------- */
  function colorOf(it) { return SH[it.s].f ? CO[it.c].f : CO[it.c].m; }
  function nameOf(it) { return (SH[it.s].f ? "L'" : "Le ") + SH[it.s].n + " " + colorOf(it); }
  function indefOf(it) { return (SH[it.s].f ? "Une " : "Un ") + SH[it.s].n + " " + colorOf(it); }
  function becomes(it) { return SH[it.s].f ? "devenue" : "devenu"; }
  function posOf(cell) { return POS[cell]; }
  function key(it) { return it.s + "/" + it.c; }

  /* ---------- Dessin ---------- */
  var PW = 164, PH = 152, PX = [8, 188], PY = 28, CW = PW / 3, CH = PH / 2;
  function open() { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 190" width="360" height="190"><rect width="360" height="190" fill="#f8fafc"/>'; }
  function Tx(x, y, t) { return '<text x="' + x + '" y="' + y + '" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#334155">' + t + '</text>'; }
  function shapeSvg(it, cx, cy, att) {
    var r = it.k > 0 ? 22 : it.k < 0 ? 11 : 17, col = CO[it.c].h, st = ' stroke="#1f2937" stroke-width="1.5"', pts, i, a;
    var data = ' ' + att + ' data-shape="' + SH[it.s].n + '" data-col="' + CO[it.c].m + '" data-size="' + (it.k > 0 ? "grand" : it.k < 0 ? "petit" : "normal") + '"';
    var s = SH[it.s].n;
    if (s === "cercle") return '<circle' + data + ' cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + r + '" fill="' + col + '"' + st + '/>';
    if (s === "carré") return '<rect' + data + ' x="' + f1(cx - r * 0.85) + '" y="' + f1(cy - r * 0.85) + '" width="' + f1(r * 1.7) + '" height="' + f1(r * 1.7) + '" fill="' + col + '"' + st + '/>';
    if (s === "triangle") pts = [[cx, cy - r], [cx + r, cy + r * 0.8], [cx - r, cy + r * 0.8]];
    else if (s === "losange") pts = [[cx, cy - r * 1.1], [cx + r * 0.8, cy], [cx, cy + r * 1.1], [cx - r * 0.8, cy]];
    else { pts = []; for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; pts.push([cx + (i % 2 ? r * 1.15 * 0.4 : r * 1.15) * Math.cos(a), cy + (i % 2 ? r * 1.15 * 0.4 : r * 1.15) * Math.sin(a)]); } }
    return '<polygon' + data + ' points="' + pts.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ") + '" fill="' + col + '"' + st + ' stroke-linejoin="round"/>';
  }
  function panel(items, panelNo) {
    var s = '<rect x="' + PX[panelNo - 1] + '" y="' + PY + '" width="' + PW + '" height="' + PH + '" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" data-panel="' + panelNo + '"/>';
    items.forEach(function (it) {
      var cx = PX[panelNo - 1] + (it.cell % 3 + 0.5) * CW, cy = PY + (Math.floor(it.cell / 3) + 0.5) * CH;
      s += shapeSvg(it, cx, cy, 'data-panel="' + panelNo + '" data-cell="' + it.cell + '"');
    });
    return s;
  }
  function pairSvg(left, right) { return open() + Tx(PX[0] + PW / 2, 18, "Image 1") + Tx(PX[1] + PW / 2, 18, "Image 2") + panel(left, 1) + panel(right, 2) + "</svg>"; }

  function mk(theme, kind, diff, text, answers, svg, correction) {
    return { category: theme, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction, media: { type: "svg", svg: svg }, source: "officiel", v35: true, vDiff: true, kind: kind };
  }

  /* ---------- Scènes et changements ---------- */
  function scene(n) {
    var cells = shuffle([0, 1, 2, 3, 4, 5]).slice(0, n), items = [], used = {};
    cells.forEach(function (cell) {
      var it, g = 0; do { it = { cell: cell, s: rnd(SH.length), c: rnd(CO.length), k: 0 }; } while (used[key(it)] && g++ < 50);
      used[key(it)] = 1; items.push(it);
    });
    return items;
  }
  function clone(items) { return items.map(function (it) { return { cell: it.cell, s: it.s, c: it.c, k: it.k }; }); }
  function has(items, s, c) { return items.some(function (it) { return it.s === s && it.c === c; }); }
  function atCell(items, cell) { for (var i = 0; i < items.length; i++) if (items[i].cell === cell) return items[i]; return null; }
  /* Applique UN changement de type `type` sur `items` (copie), hors des cases `avoid`. Renvoie { right, desc, old, now, cell, type } ou null. */
  function change(items, type, avoid) {
    var right = clone(items), cand = shuffle(items.filter(function (it) { return !avoid[it.cell]; })), old, now, i, g, c, s;
    if (type === "added") {
      var empty = shuffle([0, 1, 2, 3, 4, 5].filter(function (cl) { return !atCell(items, cl) && !avoid[cl]; }));
      if (!empty.length) return null;
      for (g = 0; g < 60; g++) { s = rnd(SH.length); c = rnd(CO.length); if (!has(items, s, c)) break; }
      if (has(items, s, c)) return null;
      now = { cell: empty[0], s: s, c: c, k: 0 }; right.push(now);
      return { right: right, type: type, cell: now.cell, old: null, now: now, desc: indefOf(now) + " est apparu" + (SH[s].f ? "e " : " ") + posOf(now.cell) + "." };
    }
    if (!cand.length) return null;
    old = cand[0];
    var tgt = atCell(right, old.cell);
    if (type === "missing") { right.splice(right.indexOf(tgt), 1); return { right: right, type: type, cell: old.cell, old: old, now: null, desc: nameOf(old) + " a disparu." }; }
    if (type === "color") {
      var cs = shuffle(CO.map(function (_, k) { return k; })).filter(function (k) { return k !== old.c && !has(items, old.s, k); });
      if (!cs.length) return null;
      tgt.c = cs[0]; now = { cell: old.cell, s: old.s, c: cs[0], k: old.k };
      return { right: right, type: type, cell: old.cell, old: old, now: now, desc: nameOf(old) + " est " + becomes(old) + " " + colorOf(now) + "." };
    }
    if (type === "shape") {
      var ss = shuffle(SH.map(function (_, k) { return k; })).filter(function (k) { return k !== old.s && !has(items, k, old.c); });
      if (!ss.length) return null;
      tgt.s = ss[0]; now = { cell: old.cell, s: ss[0], c: old.c, k: old.k };
      return { right: right, type: type, cell: old.cell, old: old, now: now, desc: nameOf(old) + " est " + becomes(old) + " " + (SH[ss[0]].f ? "une " : "un ") + SH[ss[0]].n + "." };
    }
    if (type === "size") {
      tgt.k = pick([1, -1]); now = { cell: old.cell, s: old.s, c: old.c, k: tgt.k };
      return { right: right, type: type, cell: old.cell, old: old, now: now, desc: nameOf(old) + " est " + becomes(old) + " plus " + (tgt.k > 0 ? "grand" : "petit") + (SH[old.s].f ? "e" : "") + "." };
    }
    return null;
  }
  var TYPES = ["color", "shape", "size", "missing", "added"];
  function oneChange(items, type) { var g = 0, ch = null; while (!ch && g++ < 30) ch = change(items, type || pick(TYPES), {}); return ch; }
  var DIFFIC = { color: "facile", missing: "facile", shape: "moyen", added: "moyen", size: "difficile" };
  var HOWTO = { color: "a changé de couleur", shape: "a été remplacée par une autre forme", size: "a changé de taille", missing: "a disparu", added: "est apparue" };

  /* Explication pédagogique : ce qu'il faut comparer et ce qui change */
  function explain(ch) { return "Dans l'image 2, " + ch.desc.charAt(0).toLowerCase() + ch.desc.slice(1) + " C'est la seule différence entre les deux images."; }

  /* ---------- Questions ---------- */
  function qWhat() {
    var left = scene(4 + rnd(2)), ch = oneChange(left); if (!ch) return null;
    var wrong = [], seen = {}, g = 0; seen[ch.desc] = 1;
    while (wrong.length < 3 && g++ < 80) { var w = oneChange(left); if (w && !seen[w.desc]) { seen[w.desc] = 1; wrong.push(w.desc); } }
    if (wrong.length < 3) return null;
    return mk(T_DIFF, "diff-quoi", DIFFIC[ch.type], "Compare les deux images : qu'est-ce qui a changé dans l'image 2 ?", [ch.desc].concat(wrong), pairSvg(left, ch.right), explain(ch));
  }
  function qWhere() {
    var left = scene(4 + rnd(2)), ch = oneChange(left); if (!ch) return null;
    var others = shuffle([0, 1, 2, 3, 4, 5].filter(function (c) { return c !== ch.cell; })).slice(0, 3);
    return mk(T_DIFF, "diff-ou", ch.type === "size" || ch.type === "shape" ? "moyen" : "facile", "Dans quelle partie de l'image se trouve la différence ? (compare l'image 1 et l'image 2)", [cap(posOf(ch.cell))].concat(others.map(function (c) { return cap(posOf(c)); })), pairSvg(left, ch.right), "La différence est " + posOf(ch.cell) + " : " + ch.desc.charAt(0).toLowerCase() + ch.desc.slice(1));
  }
  function qCount() {
    var n = 3 + rnd(2), left = scene(n), k = 1 + rnd(3), right = clone(left), avoid = {}, descs = [], i, g = 0, types = shuffle(TYPES);
    var cur = left;
    for (i = 0; i < k; i++) {
      var ch = null, t = 0; g = 0;
      while (!ch && g++ < 40) { ch = change(cur, types[(i + t++) % types.length], avoid); }
      if (!ch) return null;
      avoid[ch.cell] = 1; cur = ch.right; descs.push(ch.desc);
    }
    /* chaque changement est appliqué à partir de l'image précédente : les cases touchées sont distinctes (avoid) */
    var cnt = function (m) { return m + (m > 1 ? " différences" : " différence"); }, others = shuffle([1, 2, 3, 4, 5].filter(function (m) { return m !== k; })).slice(0, 3);
    return mk(T_DIFF, "diff-combien", k === 1 ? "facile" : k === 2 ? "moyen" : "difficile", "Combien de différences y a-t-il entre l'image 1 et l'image 2 ?", [cnt(k)].concat(others.map(cnt)), pairSvg(left, cur), "Il y a " + cnt(k) + " : " + descs.map(function (d) { return d.charAt(0).toLowerCase() + d.slice(1).replace(/\.$/, ""); }).join(" ; ") + ".");
  }
  function qItem() {
    var left = scene(5), type = pick(["color", "shape", "size", "missing", "added"]), ch = change(left, type, {}); if (!ch) return null;
    var asked = { color: "Quelle forme a changé de couleur dans l'image 2 ? (décris-la comme dans l'image 1)", shape: "Quelle forme a été remplacée par une autre dans l'image 2 ? (décris-la comme dans l'image 1)",
      size: "Quelle forme a changé de taille dans l'image 2 ? (décris-la comme dans l'image 1)", missing: "Quelle forme a disparu dans l'image 2 ?", added: "Quelle forme est apparue dans l'image 2 ?" }[type];
    var ans;
    if (type === "added") {
      var wrong = [], seen = {}, g = 0; seen[key(ch.now)] = 1;
      while (wrong.length < 3 && g++ < 100) { var s = rnd(SH.length), c = rnd(CO.length), it = { s: s, c: c }; if (!seen[key(it)] && !has(left, s, c)) { seen[key(it)] = 1; wrong.push(indefOf(it)); } }
      if (wrong.length < 3) return null; ans = [indefOf(ch.now)].concat(wrong);
    } else {
      var others = shuffle(left.filter(function (it) { return it.cell !== ch.cell; })).slice(0, 3); if (others.length < 3) return null;
      ans = [nameOf(ch.old)].concat(others.map(nameOf));
    }
    return mk(T_DIFF, "diff-forme", DIFFIC[type], asked, ans, pairSvg(left, ch.right), explain(ch));
  }
  function qNewColor() {
    var left = scene(5), ch = oneChange(left, "color"); if (!ch) return null;
    var wrong = shuffle(CO.map(function (_, k) { return k; }).filter(function (k) { return k !== ch.now.c; })).slice(0, 3), f = SH[ch.old.s].f;
    var nm = function (k) { return cap(f ? CO[k].f : CO[k].m); };
    return mk(T_DIFF, "diff-couleur", "moyen", nameOf(ch.old) + " de l'image 1 a changé de couleur : quelle est sa nouvelle couleur dans l'image 2 ?", [nm(ch.now.c)].concat(wrong.map(nm)), pairSvg(left, ch.right), explain(ch));
  }

  /* ---------- 🧐 Trouve l'intrus : grille 4 × 3 ---------- */
  var GW = 4, GH = 3, GX = 30, GY = 12, GC = 75, GR = 57;
  function oddSvg(base, odd, oc, oneIdx) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 190" width="360" height="190"><rect width="360" height="190" fill="#f8fafc"/><rect x="26" y="8" width="308" height="174" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>';
    for (var i = 0; i < GW * GH; i++) {
      var it = i === oneIdx ? odd : base, cx = GX + (i % GW) * GC + GC / 2, cy = GY + Math.floor(i / GW) * GR + GR / 2 - 4;
      s += shapeSvg(it, cx, cy, 'data-odd="' + (i === oneIdx ? 1 : 0) + '" data-row="' + (Math.floor(i / GW) + 1) + '" data-cell="' + (i % GW + 1) + '"');
    }
    return s + "</svg>";
  }
  function oddScene(kind) {
    var base = { s: rnd(SH.length), c: rnd(CO.length), k: 0 }, odd = { s: base.s, c: base.c, k: 0 };
    if (kind === "forme") odd.s = pick(SH.map(function (_, k) { return k; }).filter(function (k) { return k !== base.s; }));
    else odd.c = pick(CO.map(function (_, k) { return k; }).filter(function (k) { return k !== base.c; }));
    return { base: base, odd: odd, idx: rnd(GW * GH) };
  }
  function plur(w) { return /(s|x|orange)$/.test(w) ? w : w + "s"; }
  function qOddShape() {
    var o = oddScene("forme"), others = shuffle(SH.map(function (_, k) { return k; }).filter(function (k) { return k !== o.odd.s; })).slice(0, 3);
    var nm = function (k) { return (SH[k].f ? "Une " : "Un ") + SH[k].n; };
    return mk(T_ODD, "intrus-forme", "facile", "Toutes les formes sont identiques sauf une (l'intrus) : quelle forme est l'intrus ?", [nm(o.odd.s)].concat(others.map(nm)), oddSvg(o.base, o.odd, 0, o.idx),
      "Les " + (GW * GH - 1) + " autres formes sont des " + plur(SH[o.base.s].n) + " " + plur(colorOf(o.base)) + " ; la seule différente est " + nm(o.odd.s).toLowerCase() + ".");
  }
  function qOddColor() {
    var o = oddScene("couleur"), others = shuffle(CO.map(function (_, k) { return k; }).filter(function (k) { return k !== o.odd.c; })).slice(0, 3);
    var nm = function (k) { return cap(CO[k].m); };
    return mk(T_ODD, "intrus-couleur", "facile", "Toutes les formes ont la même couleur sauf une (l'intrus) : de quelle couleur est l'intrus ?", [nm(o.odd.c)].concat(others.map(nm)), oddSvg(o.base, o.odd, 0, o.idx),
      "L'intrus est " + CO[o.odd.c].m + ", alors que les " + (GW * GH - 1) + " autres formes sont " + plur(CO[o.base.c].f) + ".");
  }
  function qOddWhere() {
    var o = oddScene(pick(["forme", "couleur"])), row = Math.floor(o.idx / GW) + 1, col = o.idx % GW + 1, ans = [], seen = {}, g = 0, lab = function (r, c) { return "Ligne " + r + ", colonne " + c; };
    ans.push(lab(row, col)); seen[ans[0]] = 1;
    while (ans.length < 4 && g++ < 80) { var t = lab(1 + rnd(GH), 1 + rnd(GW)); if (!seen[t]) { seen[t] = 1; ans.push(t); } }
    return mk(T_ODD, "intrus-ou", "moyen", "Où se trouve l'intrus ? (lignes de haut en bas, colonnes de gauche à droite)", ans, oddSvg(o.base, o.odd, 0, o.idx), "L'intrus est à la ligne " + row + " (en comptant depuis le haut), colonne " + col + " (en comptant depuis la gauche).");
  }
  function qOddCount() {
    var o = oddScene(pick(["forme", "couleur"])), k = GW * GH - 1, ans = [String(k)], seen = {}; seen[String(k)] = 1;
    shuffle([k - 3, k - 2, k - 1, k + 1, k + 2, k + 3, k - 4]).forEach(function (v) { if (ans.length < 4 && v > 0 && !seen[String(v)]) { seen[String(v)] = 1; ans.push(String(v)); } });
    return mk(T_ODD, "intrus-nombre", "moyen", "Combien de formes sont identiques entre elles (l'intrus n'est pas compté) ?", ans, oddSvg(o.base, o.odd, 0, o.idx), "La grille compte " + GW + " × " + GH + " = " + (GW * GH) + " formes : " + (GW * GH) + " − 1 intrus = " + k + " formes identiques.");
  }

  /* ---------- Assemblage ---------- */
  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true; q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0 || !q.correction) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  var PLAN = [[qWhat, 26], [qWhere, 16], [qCount, 18], [qItem, 24], [qNewColor, 12], [qOddShape, 14], [qOddColor, 14], [qOddWhere, 14], [qOddCount, 8]];
  function build() {
    var out = [];
    PLAN.forEach(function (p) { var made = 0, guard = 0; while (made < p[1] && guard++ < p[1] * 10) { var q = p[0](); if (q && valid(q)) { out.push(q); made++; } } });
    return out;
  }
  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].vDiff) QUESTIONS.splice(i, 1);
    var pool = build(); pool.forEach(function (q) { QUESTIONS.push(q); }); return pool.length;
  }
  return { THEMES: [T_DIFF, T_ODD], SH: SH, CO: CO, POS: POS, GW: GW, GH: GH, build: build, register: register, valid: valid, nameOf: nameOf, indefOf: indefOf, change: change, scene: scene, pairSvg: pairSvg };
})();
if (typeof module !== "undefined" && module.exports) module.exports = VDiff;
if (typeof QUESTIONS !== "undefined") {
  VDiff.register();
  if (typeof startGame === "function") {
    var __vDiffStart = startGame;
    startGame = function () { try { VDiff.register(); } catch (e) {} return __vDiffStart.apply(this, arguments); };
  }
}
