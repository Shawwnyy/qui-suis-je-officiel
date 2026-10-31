/* =============================================================================
   V63 — Fiches de révision : logique PURE (aucun accès au DOM), testée par tests/fiches.test.js.
     items : [{ n, q, cat, state: "ok" | "bad" | "none", media, answers: [...], correct, mine, lines: [{ k, t, quote? }] }]
   • shareText   : message à partager, façon Wordle (🟩 juste · 🟥 faux · ⬜ sans réponse) ;
   • fichesText  : fiches de révision en texte brut (à copier ou à télécharger) ;
   • retryDeck   : le jeu « Refais tes erreurs » (questions ratées ou sans réponse, réponses mélangées, sans images) ;
   • fileName    : nom de fichier sûr.
   ============================================================================= */
var V63Fiches = (function () {
  "use strict";
  function strip(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  var SQ = { ok: "🟩", bad: "🟥", none: "⬜" }, MARK = { ok: "✅", bad: "❌", none: "⏱️" };
  function norm(items) { return (Array.isArray(items) ? items : []).filter(function (it) { return it && typeof it === "object" && strip(it.q); }); }
  function stateOf(it) { return it.state === "bad" || it.state === "none" ? it.state : "ok"; }
  function shareText(items, o) {
    items = norm(items); o = o || {};
    if (!items.length) return "";
    var good = items.filter(function (it) { return stateOf(it) === "ok"; }).length, rows = [], sq = items.map(function (it) { return SQ[stateOf(it)]; });
    for (var i = 0; i < sq.length; i += 10) rows.push(sq.slice(i, i + 10).join(""));
    var head = "🎯 Qui suis-je ? " + good + "/" + items.length + (good === items.length ? " · sans faute ! 🏆" : "");
    var out = [head, rows.join("\n")];
    if (o.score > 0) out.push("🏆 " + String(Math.round(o.score)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " pts");
    if (o.url) out.push(strip(o.url));
    return out.join("\n");
  }
  function fichesText(items, o) {
    items = norm(items); o = o || {};
    if (!items.length) return "";
    var out = ["FICHES DE RÉVISION — Qui suis-je ?" + (o.date ? " — " + strip(o.date) : ""), "=".repeat(44), ""];
    items.forEach(function (it) {
      out.push(MARK[stateOf(it)] + " " + it.n + ". " + strip(it.q) + (it.cat ? "  [" + strip(it.cat) + "]" : ""));
      (Array.isArray(it.lines) ? it.lines : []).forEach(function (l) {
        if (!l || !strip(l.t)) return;
        out.push("   - " + strip(l.t) + (l.quote ? " « " + strip(l.quote) + " »" : ""));
      });
      out.push("");
    });
    var bad = items.filter(function (it) { return stateOf(it) !== "ok"; }).length;
    out.push(bad ? "À revoir : " + bad + " question" + (bad > 1 ? "s" : "") + " sur " + items.length + "." : "Aucune erreur : bravo !");
    return out.join("\n");
  }
  function rng32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* à rejouer : seulement les questions ratées ou sans réponse, texte seulement, 4 réponses au plus, réponses mélangées */
  function retryDeck(items, rng) {
    rng = typeof rng === "function" ? rng : rng32(Date.now());
    var deck = [];
    norm(items).forEach(function (it) {
      if (stateOf(it) === "ok" || it.media || !Array.isArray(it.answers) || it.answers.length < 2 || typeof it.correct !== "number" || !strip(it.answers[it.correct])) return;
      var idx = it.answers.map(function (_, i) { return i; }), mixed = shuffle(idx, rng);
      deck.push({ n: it.n, q: strip(it.q), cat: strip(it.cat), answers: mixed.map(function (i) { return strip(it.answers[i]); }), correct: mixed.indexOf(it.correct), lines: (Array.isArray(it.lines) ? it.lines : []).filter(function (l) { return l && l.k !== "coda"; }).slice(0, 5) });
    });
    return shuffle(deck, rng).slice(0, 20);
  }
  function fileName(date) { var d = strip(date).replace(/[^0-9A-Za-z-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20); return "fiches-qui-suis-je" + (d ? "-" + d : "") + ".txt"; }
  var api = { shareText: shareText, fichesText: fichesText, retryDeck: retryDeck, fileName: fileName, rng32: rng32, shuffle: shuffle };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();
