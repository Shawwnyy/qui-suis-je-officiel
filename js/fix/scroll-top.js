/* =============================================================================
   Correctif : chaque nouvelle question s'affiche en haut de la page.

   Avant : le défilement de la page était conservé d'une question à l'autre. Les questions à image (code de la route, drapeaux, horloges) sont
   hautes : on fait défiler vers les réponses, puis la question suivante apparaissait déjà décalée, image hors de l'écran.
   Maintenant : à chaque question (et au début de la partie) la page remonte en haut, sans animation, chez l'hôte comme chez les joueurs.
   ============================================================================= */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  function top() {
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { try { window.scrollTo(0, 0); } catch (e2) {} }
    try { var se = document.scrollingElement || document.documentElement; if (se) se.scrollTop = 0; if (document.body) document.body.scrollTop = 0; } catch (e) {}
    try { var g = document.getElementById("gameScreen"); if (g) g.scrollTop = 0; } catch (e) {}
  }
  window.V46ScrollTop = { top: top };
  if (typeof displayQuestion === "function") {
    var base = displayQuestion;
    displayQuestion = function () {
      var r = base.apply(this, arguments);
      top();
      try { requestAnimationFrame(top); } catch (e) {}          /* après la mise en page de la nouvelle question */
      return r;
    };
  }
})();
