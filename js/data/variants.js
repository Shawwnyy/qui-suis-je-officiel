/* =============================================================================
   V64 — 🔁 Système de variantes : des questions DÉRIVÉES de la banque pour étoffer les thèmes qui en ont peu. Logique PURE (testée par tests/variants.test.js).
   Deux formes, toujours tirées de couples question / bonne réponse / mauvaises réponses déjà vérifiés :
     • inversée : « Laquelle de ces questions a pour réponse « Paris » ? » → la vraie question + 3 autres questions du MÊME thème qui n'ont pas cette réponse ;
     • duo      : « À la question « … », laquelle de ces deux réponses est la bonne : « A » ou « B » ? » → A, B, « Les deux », « Aucune des deux ».
   Ce sont des VARIANTES (même savoir, autre angle), pas de nouveaux faits : elles portent q.v64 = true, q.variant et q.srcKey (la question d'origine) ;
   le tirage d'une partie n'en met jamais deux de la même origine (voir V64Variants.spread).
   ============================================================================= */
var V64Variants = (function () {
  "use strict";
  function strip(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  var NC = Object.create(null), NCN = 0;   /* mémoire des textes déjà normalisés (la même réponse revient souvent) */
  function norm(s) {
    s = String(s == null ? "" : s); var c = NC[s]; if (c !== undefined) return c;
    c = strip(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
    if (NCN > 60000) { NC = Object.create(null); NCN = 0; } NC[s] = c; NCN++; return c;
  }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function rng32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var SKIP = /^(oui|non|vrai|faux|aucun|aucune|les deux|tous|toutes|a|b|c|d|aucune des deux)$/i;
  /* question source utilisable : texte seul, 4 réponses, bonne réponse en premier (état de la banque avant mélange) */
  function usable(q) {
    if (!q || q.v64 || q.media || q.v26Expanded || q.v42Mix || q.v41Img || q.v41Road || q.v47More || q.v35 !== true) return false;
    if (!Array.isArray(q.answers) || q.answers.length !== 4 || q.correct !== 0) return false;
    var t = strip(q.question); if (t.length < 12 || t.length > 120 || /\b(cette|cet|ce) (image|dessin|illustration|photo)\b/i.test(t)) return false;
    return q.answers.every(function (a) { var s = strip(a); return s.length >= 1 && s.length <= 60; });
  }
  function goodAnswer(R) { return R.length >= 3 && !SKIP.test(R) && !/^\d{1,2}$/.test(R); }
  function reverse(q, cands, rng) {
    var R = strip(q.answers[0]); if (!goodAnswer(R)) return null;
    var nr = norm(R), nq = norm(q.question), seen = Object.create(null), picks = [];
    seen[nq] = 1;
    shuffle(cands, rng).forEach(function (o) {
      if (picks.length >= 3 || o.q === q) return;
      var t = strip(o.q.question), k = norm(t);
      if (seen[k] || o.right === nr || o.all[nr] || (nr.length >= 4 && k.indexOf(nr) >= 0) || (o.right.length >= 4 && (o.right.indexOf(nr) >= 0 || nr.indexOf(o.right) >= 0))) return;
      seen[k] = 1; picks.push(t);
    });
    if (picks.length < 3) return null;
    return { category: q.category, difficulty: q.difficulty, question: "Laquelle de ces questions a pour réponse « " + R + " » ?", answers: [strip(q.question)].concat(picks), correct: 0,
      correction: "« " + R + " » est la bonne réponse à la question : « " + strip(q.question) + " »", source: "officiel", v64: true, variant: "reverse", srcKey: nq.slice(0, 80) };
  }
  function duo(q, rng) {
    var R = strip(q.answers[0]), nr = norm(R), ds = [1, 2, 3].map(function (i) { return strip(q.answers[i]); }).filter(function (d) { return d && norm(d) !== nr && !SKIP.test(d); });
    if (!ds.length || !R || SKIP.test(R)) return null;
    var D = ds[Math.floor(rng() * ds.length)], first = rng() < 0.5, Q = strip(q.question).replace(/\s*\?\s*$/, "");
    if (Q.length > 110) return null;
    return { category: q.category, difficulty: "facile", question: "À la question « " + Q + " ? », laquelle de ces deux réponses est la bonne : « " + (first ? R : D) + " » ou « " + (first ? D : R) + " » ?",
      answers: [R, D, "Les deux", "Aucune des deux"], correct: 0, source: "officiel", v64: true, variant: "duo", srcKey: norm(q.question).slice(0, 80) };
  }
  /* questions dérivées pour chaque thème qui a moins de `cap` questions : d'abord les inversées, puis les duos, jusqu'à `cap` (ou épuisement) */
  function expand(questions, o) {
    o = o || {}; var cap = Math.max(1, Math.floor(Number(o.cap)) || 140), by = Object.create(null), total = Object.create(null), out = [];
    (questions || []).forEach(function (q) { if (!q) return; total[q.category] = (total[q.category] || 0) + 1; if (usable(q)) { var l = by[q.category] || (by[q.category] = []); l.push(q); } });
    Object.keys(by).forEach(function (cat) {
      var srcs = by[cat], need = cap - (total[cat] || 0); if (need <= 0) return;
      var rng = rng32(hash(cat)), cands = srcs.map(function (q) { var all = Object.create(null); q.answers.forEach(function (a) { all[norm(a)] = 1; }); return { q: q, right: norm(q.answers[0]), all: all }; }), made = [], usedR = Object.create(null);
      /* une seule inversée par réponse (« Le Canada » ne sert qu'une fois par thème : deux questions identiques seraient ambiguës) */
      shuffle(srcs, rng).forEach(function (q) { if (made.length >= need) return; var nr = norm(q.answers[0]); if (usedR[nr]) return; var v = reverse(q, cands, rng); if (v) { usedR[nr] = 1; made.push(v); } });
      shuffle(srcs, rng).forEach(function (q) { if (made.length >= need) return; var v = duo(q, rng); if (v) made.push(v); });
      out = out.concat(made);
    });
    return out;
  }
  /* tirage d'une partie : dans les n premières places, jamais deux questions de la même origine (le surplus est remplacé par la suite de la liste) */
  function spread(list, n) {
    list = Array.isArray(list) ? list.slice() : []; n = Math.max(0, Math.floor(Number(n)) || 0);
    var seen = Object.create(null), head = [], rest = [];
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      if (head.length >= n) { rest = rest.concat(list.slice(i)); break; }
      var k = q && q.srcKey ? q.srcKey + "|" + q.category : (q && q.question ? norm(q.question).slice(0, 80) + "|" + q.category : "");
      if (!(k && seen[k])) { head.push(q); if (k) seen[k] = 1; } else rest.push(q);
    }
    /* une question d'origine (non dérivée) compte aussi : sa dérivée porte la même clé */
    return head.concat(rest);
  }
  var api = { expand: expand, spread: spread, usable: usable, reverse: reverse, duo: duo, norm: norm, rng32: rng32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();
