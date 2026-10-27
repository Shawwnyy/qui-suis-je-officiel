/* =============================================================================
   V44 — Horloge permanente : l'heure (HH:MM:SS) en gras, en bas à gauche, sur tous les écrans

   • Heure locale de l'appareil du joueur, à la seconde près (chaque joueur voit l'heure de son propre appareil).
   • Se recale sur le début de chaque seconde et se rafraîchit au retour sur l'onglet (les navigateurs ralentissent les minuteurs en arrière-plan).
   • Ne capte jamais un clic (pointer-events: none) et reste au-dessus des fenêtres ; se place juste au-dessus du bouton « Son ON / OFF ».
   format() n'a pas besoin du DOM : testable avec Node (tests/clock.test.js).
   ============================================================================= */
var V44Clock = (function () {
  "use strict";
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  /* Date → « HH:MM:SS » (24 h). Une date invalide donne « --:--:-- » au lieu de « NaN:NaN:NaN ». */
  function format(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "--:--:--";
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  /* Délai avant le prochain début de seconde (+ petite marge pour ne jamais retomber sur la seconde précédente) */
  function untilNextSecond(nowMs) { return 1000 - (nowMs % 1000) + 15; }

  var api = { format: format, untilNextSecond: untilNextSecond };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.V44Clock = api;
    var node = null, last = "", timer = 0;
    var paint = function () {
      var s = format(new Date());
      if (node && s !== last) { last = s; node.textContent = s; }
    };
    var loop = function () { paint(); clearTimeout(timer); timer = setTimeout(loop, untilNextSecond(Date.now())); };
    var mount = function () {
      if (node || !document.body) return;
      node = document.getElementById("v44Clock");
      if (!node) {
        node = document.createElement("div");
        node.id = "v44Clock"; node.setAttribute("role", "timer"); node.setAttribute("aria-label", "Heure actuelle"); node.setAttribute("translate", "no");
        node.title = "Heure de ton appareil";
        document.body.appendChild(node);
      }
      loop();
    };
    document.addEventListener("visibilitychange", function () { if (!document.hidden) loop(); });
    window.addEventListener("focus", loop);
    window.addEventListener("pageshow", loop);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  }
  return api;
})();
