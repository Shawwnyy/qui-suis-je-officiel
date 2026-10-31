/* =============================================================================
   V64 — 🗣️ Voix grave de l'annonceur, 🔥 flammes de série, 💣 « Bombe » et ⚡ « Vitesse », commandes son / effets / micro à droite.
   • Voix grave : « La partie commence. Trois. Deux. Un. » (à partir de 3 secondes avant le départ), puis « Bonne chance ! » ; aussi
     « Dernière question ! » et l'annonce des questions spéciales. Voix du navigateur la plus grave possible (hauteur au minimum, débit lent).
   • 🔥 Flammes : à partir de 3 bonnes réponses d'affilée, l'écran de jeu s'enflamme (3, 5 puis 8 d'affilée).
   • Nouvelles questions spéciales (hôte, case « événements » cochée, jamais deux de suite) :
       ⚡ Vitesse : le bonus de rapidité compte triple · 💣 Bombe : −400 pts si on se trompe ou ne répond pas.
   • Les boutons Son, Effets et le micro vont en bas à droite, à gauche de la colonne de boutons.
   La logique est pure (V64Voice, testée par tests/voice64.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V64Voice = (function () {
  "use strict";
  var DEEP = /thomas|paul|henri|nicolas|jean|claude|male|homme|daniel|bernard|antoine|google fran[cç]ais/i;
  /* voix la plus adaptée : française, de préférence masculine ; null si aucune voix française */
  function pickVoice(voices) {
    var list = (Array.isArray(voices) ? voices : []).filter(function (v) { return v && /^fr([-_]|$)/i.test(String(v.lang || "")); });
    if (!list.length) return null;
    var deep = list.filter(function (v) { return DEEP.test(String(v.name || "")); });
    return (deep[0] || list[0]);
  }
  /* départ : [{ at (secondes après le début du compte à rebours), text }] — les chiffres sont dits à partir de 3 s avant le départ */
  function countdownLines(seconds) {
    var n = Math.floor(Number(seconds)); if (!(n >= 1)) return [];
    var W = { 3: "Trois.", 2: "Deux.", 1: "Un." }, lead = "La partie commence.", out = [], k;
    if (n >= 4) out.push({ at: n - 4, text: lead });
    for (k = Math.min(3, n); k >= 1; k--) out.push({ at: n - k, text: (n < 4 && k === Math.min(3, n) ? lead + " " : "") + W[k] });
    out.push({ at: n, text: "Bonne chance !" });
    return out;
  }
  /* annonce d'une question : { say, banner } ou null */
  function announce(q, round, total) {
    var parts = [], banner = [], r = Math.floor(Number(round)), t = Math.floor(Number(total));
    if (t >= 3 && r === t) { parts.push("Dernière question !"); banner.push("🏁 DERNIÈRE QUESTION : tout peut encore changer !"); }
    if (q && typeof q === "object") {
      if (q.trap === true) { parts.push("Question piège ! Réponse juste, points fois cinq. Erreur, moins trois cents."); banner.push("🕳️ QUESTION PIÈGE"); }
      else if (q.golden) { parts.push("Question en or ! Points doublés."); banner.push("⭐ QUESTION EN OR"); }
      else if (q.event === "eclair") { parts.push("Question éclair !"); banner.push("⚡ QUESTION ÉCLAIR"); }
      else if (q.event === "chance") { parts.push("Question chance !"); banner.push("🍀 QUESTION CHANCE"); }
      else if (q.event === "vitesse") { parts.push("Question vitesse ! Le bonus de rapidité compte triple."); banner.push("⚡ QUESTION VITESSE"); }
      else if (q.event === "bombe") { parts.push("Attention, question bombe ! Moins quatre cents points si tu te trompes."); banner.push("💣 QUESTION BOMBE"); }
    }
    return parts.length ? { say: parts.join(" "), banner: banner.join(" · ") } : null;
  }
  /* flammes : niveau 0–3 selon la série en cours */
  function fireLevel(combo) { combo = Math.floor(Number(combo)) || 0; return combo >= 8 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1 : 0; }
  /* choix d'une nouvelle question spéciale : "vitesse" | "bombe" | null ; rng() ∈ [0,1[ */
  var NEW_CHANCE = 0.11;
  function newEvent(o) {
    o = o || {};
    if (!o.enabled || o.golden || o.event || o.trap || o.lastSpecial) return null;
    var idx = Math.floor(Number(o.idx)) || 0, total = Math.floor(Number(o.total)) || 0;
    if (total < 5 || idx < 4 || idx >= total) return null;
    var r = typeof o.rng === "function" ? o.rng() : Math.random();
    if (!(r < NEW_CHANCE)) return null;
    return r < NEW_CHANCE / 2 ? "vitesse" : "bombe";
  }
  var BOMB_LOSS = 400, SPEED_EXTRA = 50;
  function bombLoss(score) { return Math.min(Math.max(0, Math.round(Number(score) || 0)), BOMB_LOSS); }
  function speedExtra(time, qTime) { var t = Math.max(0, Math.min(Number(time) || 0, Number(qTime) || 0)); return Math.round(t * SPEED_EXTRA); }
  var api = { pickVoice: pickVoice, countdownLines: countdownLines, announce: announce, fireLevel: fireLevel, newEvent: newEvent, bombLoss: bombLoss, speedExtra: speedExtra, BOMB_LOSS: BOMB_LOSS, SPEED_EXTRA: SPEED_EXTRA, NEW_CHANCE: NEW_CHANCE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function V64Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof displayQuestion !== "function" || typeof withFxMods !== "function") return;
  var V = V64Voice; window.V64Voice = V;
  function $(id) { return document.getElementById(id); }

  /* ---- voix grave ---- */
  var voice = null;
  function loadVoice() { try { voice = V.pickVoice(window.speechSynthesis.getVoices()); } catch (e) { voice = null; } }
  try { if (window.speechSynthesis) { loadVoice(); window.speechSynthesis.addEventListener("voiceschanged", loadVoice); } } catch (e) {}
  function say(text, o) {
    try {
      if (!window.speechSynthesis || (typeof soundEnabled !== "undefined" && !soundEnabled) || !text) return false;
      if (!voice) loadVoice();
      var u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; if (voice) u.voice = voice;
      u.pitch = 0; u.rate = (o && o.rate) || 0.82; u.volume = 1;
      if (!o || !o.queue) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  }
  var cdTimers = [];
  if (typeof showStartCountdown === "function") {
    var baseCd = showStartCountdown;
    showStartCountdown = function (seconds, onDone) {
      var r = baseCd.apply(this, arguments);
      try {
        cdTimers.forEach(clearTimeout); cdTimers = [];
        V.countdownLines(seconds).forEach(function (l) { cdTimers.push(setTimeout(function () { say(l.text, { rate: 0.8 }); }, l.at * 1000)); });
      } catch (e) {}
      return r;
    };
  }
  /* ---- annonces de question ---- */
  var baseDisplay = displayQuestion;
  displayQuestion = function (question, round) {
    var r = baseDisplay.apply(this, arguments);
    try {
      var a = V.announce(question, round, typeof totalRounds !== "undefined" ? totalRounds : 0);
      if (a) { if (typeof showBanner === "function" && !(question && (question.golden || question.event === "eclair" || question.event === "chance" || question.trap === true))) showBanner(a.banner); say(a.say, { queue: true }); }
    } catch (e) {}
    return r;
  };

  /* ---- nouvelles questions spéciales (hôte) ---- */
  var S = { lastSpecial: false, idx: 0 };
  var baseMods = withFxMods;
  withFxMods = function () {
    var out = baseMods.apply(this, arguments);
    try {
      var idx = (typeof currentQuestionIndex !== "undefined" ? currentQuestionIndex : 0) + 1;
      if (idx === 1) S.lastSpecial = false;
      var special = !!(out && (out.golden || out.event || out.trap === true));
      var ev = out ? V.newEvent({ enabled: !(window.gameOpts && window.gameOpts.events === false), golden: out.golden, event: out.event, trap: out.trap === true, lastSpecial: S.lastSpecial, idx: idx, total: typeof totalRounds === "number" ? totalRounds : 0 }) : null;
      if (ev) { out.event = ev; special = true; }
      S.lastSpecial = special;
    } catch (e) { if (window.console) console.error("V64 withFxMods", e); }
    return out;
  };
  if (typeof applyScoreFx === "function") {
    var baseScore = applyScoreFx;
    applyScoreFx = function (p, pts, data) {
      var g = baseScore.apply(this, arguments);
      try { if (typeof currentQuestion !== "undefined" && currentQuestion && currentQuestion.event === "vitesse") g += V.speedExtra(data && data.time, typeof questionTime !== "undefined" ? questionTime : 0); } catch (e) {}
      return g;
    };
  }
  if (typeof onWrongFx === "function") {
    var baseWrong = onWrongFx;
    onWrongFx = function (p) {
      try {
        if (typeof currentQuestion !== "undefined" && currentQuestion && currentQuestion.event === "bombe" && p) { var l = V.bombLoss(p.score); p.score = Math.max(0, (Number(p.score) || 0) - l); p.malusPoints = (p.malusPoints || 0) + l; }
      } catch (e) {}
      return baseWrong.apply(this, arguments);
    };
  }

  /* ---- flammes de série ---- */
  function fire() {
    var lv = 0;
    try { var me = typeof players !== "undefined" && typeof myId !== "undefined" ? players[myId] : null; lv = V.fireLevel(me && me.combo); } catch (e) {}
    document.body.setAttribute("data-v64-fire", String(lv));
  }
  if (typeof updateMyScore === "function") { var baseUpd = updateMyScore; updateMyScore = function () { var r = baseUpd.apply(this, arguments); fire(); return r; }; }
  var baseShow = showScreen; showScreen = function (id) { var r = baseShow.apply(this, arguments); if (id !== "gameScreen") document.body.setAttribute("data-v64-fire", "0"); return r; };

  /* ---- Son, Effets et micro à droite ---- */
  function side() {
    var box = $("v64Side");
    if (!box) { box = document.createElement("div"); box.id = "v64Side"; box.setAttribute("role", "toolbar"); box.setAttribute("aria-label", "Son, effets et micro"); document.body.appendChild(box); }
    ["vcFab", "soundToggle", "v63FxToggle"].forEach(function (id) { var e = $(id); if (e && e.parentNode !== box) box.appendChild(e); });
  }
  side(); document.addEventListener("DOMContentLoaded", side); setInterval(side, 1500);
  window.V64Glue = { say: say, side: side };
})();
