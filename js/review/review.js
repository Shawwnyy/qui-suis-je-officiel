/* =============================================================================
   V46 — Mode révision (QCM générés depuis un cours)

   Une partie « révision » se joue comme les autres (combos, bonus, classement) mais :
     • aucune roue des bonus / malus ;
     • aucun malus : un combo ne donne que des BONUS (l'hôte l'impose, même si un joueur envoie autre chose) ;
     • pas de question « impossible » (son ÷4 est une pénalité) ;
     • chaque réponse est justifiée avec le passage du cours (voir justif.js).
   Réglage de l'hôte dans le salon d'attente : « Automatique » (par défaut : révision seulement si TOUTES les questions
   viennent d'un cours), « Activé » ou « Désactivé ». La décision est prise une fois, au début de la partie, puis diffusée aux joueurs.
   Les fonctions pures (decide, forceBonus, cleanMode) sont testables avec Node (tests/review.test.js).
   ============================================================================= */
var V46Review = (function () {
  "use strict";
  var MODES = { auto: "Automatique (QCM de cours seulement)", on: "Activé", off: "Désactivé" };
  function cleanMode(m) { return m === "on" || m === "off" ? m : "auto"; }
  /* La partie est-elle une révision ? questions = questions de la partie. La question « impossible » ajoutée en fin de partie est ignorée. */
  function decide(mode, questions) {
    mode = cleanMode(mode);
    if (mode === "on") return true;
    if (mode === "off") return false;
    var qs = Array.isArray(questions) ? questions.filter(function (q) { return q && !q.impossible; }) : [];
    return qs.length > 0 && qs.every(function (q) { return !!(q.lesson && typeof q.lesson === "object" && typeof q.lesson.s === "string"); });
  }
  /* Choix de pouvoir imposé en révision : un bonus pour soi, sans cible, d'un type autorisé (sinon des points bonus). */
  function forceBonus(data, bonusKinds) {
    var d = Object.assign({}, data || {});
    d.choice = "bonus"; d.targetId = null;
    if (!Array.isArray(bonusKinds) || bonusKinds.indexOf(d.kind) < 0) d.kind = "xp";
    return d;
  }

  var api = { MODES: MODES, cleanMode: cleanMode, decide: decide, forceBonus: forceBonus };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window === "undefined" || typeof document === "undefined") return api;
  window.V46Review = api;

  /* ---------- Navigateur ---------- */
  var KEY = "quizV46ReviewMode", snap = null, flag = false;
  function loadMode() { try { return cleanMode(localStorage.getItem(KEY)); } catch (e) { return "auto"; } }
  api.getMode = loadMode;
  api.setMode = function (m) { m = cleanMode(m); try { localStorage.setItem(KEY, m); } catch (e) {} return m; };
  /* Hôte : décision figée au premier appel après le début de la partie ; joueurs : valeur reçue de l'hôte. */
  api.active = function () {
    try {
      if (typeof isHost !== "undefined" && isHost) {
        if (snap === null && typeof gameStarted !== "undefined" && gameStarted && typeof usedQuestions !== "undefined" && usedQuestions && usedQuestions.length) snap = decide(loadMode(), usedQuestions);
        return !!snap;
      }
    } catch (e) {}
    return flag;
  };
  function paint() { try { document.body.classList.toggle("v46-review", api.active()); } catch (e) {} }
  function reset() { snap = null; flag = false; paint(); }

  if (typeof startGame === "function") { var baseStart = startGame; startGame = function () { snap = null; flag = false; return baseStart.apply(this, arguments); }; }
  if (typeof sendNextQuestion === "function") {
    var baseNext = sendNextQuestion;
    sendNextQuestion = function () {
      var host = typeof isHost !== "undefined" && isHost && typeof gameStarted !== "undefined" && gameStarted;
      if (host && api.active() && window.gameOpts) window.gameOpts.impossible = false;      /* le ÷4 de la question impossible est une pénalité */
      var r = baseNext.apply(this, arguments);
      if (host) { paint(); try { broadcast({ type: "v46Review", on: api.active() }); } catch (e) {} }
      return r;
    };
  }
  if (typeof handlePowerChoice === "function") {
    var basePower = handlePowerChoice;
    handlePowerChoice = function (data) {
      if (typeof isHost !== "undefined" && isHost && api.active()) { try { data = forceBonus(data, typeof POWER_KINDS !== "undefined" ? POWER_KINDS.bonus : []); } catch (e) {} }
      return basePower.call(this, data);
    };
  }
  if (typeof openPowerModal === "function") {
    var baseOpen = openPowerModal;
    openPowerModal = function (level) {
      var r = baseOpen.apply(this, arguments);
      if (api.active()) {
        paint();
        var say = function () { var d = document.getElementById("powerModalDescription"); if (d) d.textContent = (Number(level) >= 4 ? "4 bonnes réponses d'affilée !" : "2 bonnes réponses d'affilée !") + " Révision : choisis ton bonus."; };
        say(); setTimeout(say, 120);
      }
      return r;
    };
  }
  if (typeof handleData === "function") {
    var baseHandle = handleData;
    handleData = function (data) {
      if (data && data.type === "v46Review") { if (typeof isHost === "undefined" || !isHost) { flag = !!data.on; paint(); } return; }
      return baseHandle.apply(this, arguments);
    };
  }
  if (typeof resetConnection === "function") { var baseReset = resetConnection; resetConnection = function () { reset(); return baseReset.apply(this, arguments); }; }

  /* ---------- Réglage dans le salon d'attente (hôte) ---------- */
  function mountMode() {
    var grid = document.querySelector("#hostSettings .settings-grid"); if (!grid || document.getElementById("v46ReviewMode")) return;
    var box = document.createElement("div"), title = document.createElement("div"), sel = document.createElement("select"), hint = document.createElement("div");
    title.className = "setting-title"; title.textContent = "📚 Mode révision (QCM de cours)";
    sel.className = "select"; sel.id = "v46ReviewMode"; sel.setAttribute("aria-label", "Mode révision");
    Object.keys(MODES).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = MODES[k]; sel.appendChild(o); });
    sel.value = loadMode();
    hint.className = "v45-hint"; hint.id = "v46ReviewHint";
    var say = function () { hint.textContent = sel.value === "off" ? "Partie normale : roue, bonus et malus." : "Sans roue ni malus (bonus uniquement), pas de question impossible, et chaque réponse est justifiée avec le passage du cours." + (sel.value === "auto" ? " Seulement si toutes les questions viennent d'un cours." : ""); };
    sel.addEventListener("change", function () { api.setMode(sel.value); say(); });
    say(); box.appendChild(title); box.appendChild(sel); box.appendChild(hint); grid.appendChild(box);
  }
  mountMode(); document.addEventListener("DOMContentLoaded", mountMode);
  return api;
})();
