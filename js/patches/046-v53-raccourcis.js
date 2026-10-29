/* =============================================================================
   ⌨️ Raccourcis clavier pour répondre : touches 1 2 3 4 (rangée du haut ou pavé numérique) ou A B C D.
   Une petite pastille sur chaque réponse rappelle la touche (masquée sur écran tactile). Rien ne se passe quand on écrit dans un champ
   (chat, sondage…), quand une fenêtre est ouverte (règles, pouvoirs, statistiques), avec Ctrl / Alt / ⌘, ou quand la touche reste enfoncée.
   La logique est testée dans tests/keys.test.js.
   ============================================================================= */
var V53Keys = (function () {
  "use strict";
  /* Numéro de réponse (0 à 3) pour une touche, ou -1. Les chiffres se lisent sur « code » (marche aussi sur clavier AZERTY sans Maj), les lettres sur « key ». */
  function choice(key, code) {
    var m = /^(?:Digit|Numpad)([1-4])$/.exec(String(code || ""));
    if (m) return Number(m[1]) - 1;
    var k = String(key || "").toLowerCase();
    return k.length === 1 && k >= "a" && k <= "d" ? k.charCodeAt(0) - 97 : -1;
  }
  function typing(tag, editable) { return !!editable || /^(INPUT|TEXTAREA|SELECT)$/.test(String(tag || "").toUpperCase()); }
  return { choice: choice, typing: typing };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V53Keys;

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  function buttons() {
    var g = document.getElementById("gameScreen");
    if (!g || !g.classList.contains("active")) return [];
    return [].slice.call(g.querySelectorAll("button.answer"));
  }
  function blocked() {
    return !!document.querySelector(".modal.show") || document.documentElement.classList.contains("v40s-lock");
  }
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var t = e.target || {};
    if (V53Keys.typing(t.tagName, t.isContentEditable)) return;
    var i = V53Keys.choice(e.key, e.code);
    if (i < 0 || blocked()) return;
    var b = buttons()[i];
    if (!b || b.disabled || b.offsetParent === null) return;
    e.preventDefault();
    b.click();
  });
  /* pastilles « 1 2 3 4 » : attribut lu par le CSS, le texte des boutons n'est pas modifié */
  var raf = 0;
  function label() { raf = 0; buttons().forEach(function (b, i) { if (i < 4 && b.getAttribute("data-v53k") !== String(i + 1)) b.setAttribute("data-v53k", String(i + 1)); }); }
  function schedule() { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(label); }
  function watch() { var g = document.getElementById("gameScreen"); if (!g || g.__v53k) return; g.__v53k = true; new MutationObserver(schedule).observe(g, { childList: true, subtree: true }); schedule(); }
  watch(); document.addEventListener("DOMContentLoaded", watch); setInterval(watch, 1500);
})();
