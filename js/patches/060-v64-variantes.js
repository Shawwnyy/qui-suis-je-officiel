/* =============================================================================
   V64 — 🔁 Colle du système de variantes : ajoute les questions DÉRIVÉES (js/data/variants.js) à la fin de QUESTIONS (les index des traductions ne bougent pas)
   pour que chaque thème atteigne ~200 questions quand la banque le permet (≈140 en moyenne sur tous les thèmes), et fait en sorte qu'une partie ne pose
   jamais une question ET sa variante (même origine) dans les premiers tours. Chargé en dernier parmi les scripts de données.
   ============================================================================= */
(function V64Variantes() {
  "use strict";
  if (typeof window === "undefined" || typeof QUESTIONS === "undefined" || !Array.isArray(QUESTIONS) || typeof V64Variants === "undefined") return;
  var CAP = 200, before = QUESTIONS.length, added = 0;
  try {
    var d = V64Variants.expand(QUESTIONS, { cap: CAP });
    for (var i = 0; i < d.length; i++) QUESTIONS.push(d[i]);
    added = d.length;
  } catch (e) { if (window.console) console.error("V64 variantes", e); }
  window.V64_DERIVED = added; window.V64_BASE_COUNT = before; window.V64_CAP = CAP;
  if (typeof shuffle === "function") {
    var baseShuffle = shuffle;
    shuffle = function (arr) {
      var r = baseShuffle.apply(this, arguments);
      try {
        if (Array.isArray(r) && r.length > 8 && r[0] && typeof r[0] === "object" && typeof r[0].question === "string") {
          var n = typeof totalRounds === "number" && totalRounds > 0 ? totalRounds : 20;
          return V64Variants.spread(r, n);
        }
      } catch (e) {}
      return r;
    };
  }
})();
