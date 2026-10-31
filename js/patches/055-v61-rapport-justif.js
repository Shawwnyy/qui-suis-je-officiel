/* =============================================================================
   V61 — 📖 Le rapport de partie contient, pour chaque question, la bonne réponse ET pourquoi (pour apprendre).
   Le journal des questions de la session (window.__log, repris par « Rapport Qui suis-je N » et par l'export de l'historique)
   reçoit un champ `why` : la justification de V43Justif.reportNote() (cours > explication > phrase > « À retenir »).
   La logique est dans V43Justif (testée par tests/justif.test.js) ; ceci n'est que la colle navigateur.
   ============================================================================= */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof showQuestionResult !== "function" || !window.V43Justif || typeof window.V43Justif.reportNote !== "function") return;
  var base = showQuestionResult;
  showQuestionResult = function (data) {
    var r = base.apply(this, arguments);
    try {
      var log = window.__log, last = Array.isArray(log) && log.length ? log[log.length - 1] : null;
      if (last && !last.why && typeof currentQuestion !== "undefined" && currentQuestion && last.q === currentQuestion.question) {
        var note = window.V43Justif.reportNote(currentQuestion, data && typeof data.correct === "number" ? data.correct : undefined, window.V43Justif.auto ? window.V43Justif.auto() : null);
        if (note && note.w) last.why = note.w;
      }
    } catch (e) { if (window.console) console.error("V61 rapport", e); }
    return r;
  };
})();
