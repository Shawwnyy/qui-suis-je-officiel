/* =============================================================================
   V64 — 🗣️ Voix grave de l'annonceur, 🔥 flammes de série, 💣 « Bombe » et ⚡ « Vitesse », commandes son / effets / micro à droite.
   • Voix grave : « La partie commence dans trois secondes… Deux. Un. Zéro. » puis « Bonne chance à toutes et à tous ! », calées sur le compte à rebours affiché ; aussi
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
  /* Départ de partie, synchronisé sur le VRAI compte à rebours affiché (#v32Launch / #v32Count, côté hôte comme côté invités).
     launchTick(état, vue) → { st: nouvel état, say: [{ text, delay?, queue? }] }.  vue = { shown: bool, text: chiffre affiché }.
     « La partie commence dans trois secondes. » démarre juste après l'apparition du compte à rebours (pour tomber sur le « 3 »), puis « Deux. » quand « 2 » s'affiche,
     « Un. » à « 1 », puis, quand le compte à rebours se ferme après le 1 : « Zéro. » suivi de « Bonne chance à toutes et à tous ! ». Un lancement annulé reste muet. */
  var LEAD = "La partie commence dans trois secondes.", LUCK = "Bonne chance à toutes et à tous !";
  function launchTick(st, v) {
    var on = !!(st && st.on), last = st && st.last != null ? String(st.last) : "", zero = !!(st && st.zero), shown = !!(v && v.shown), txt = String(v && v.text != null ? v.text : "").trim(), n = Number(txt);
    var out = { st: { on: shown, last: shown ? txt : "", zero: shown && on ? zero : false }, say: [], cancelled: false };
    if (shown && !on) {
      if (n >= 4) out.say.push({ text: LEAD, delay: 400, rate: 0.88 }); else if (n === 3) out.say.push({ text: LEAD, delay: 0, rate: 0.95 });
    } else if (shown && on && txt !== last) {
      if (n === 2) out.say.push({ text: "Deux.", rate: 0.82 });
      else if (n === 1) {   /* « Zéro » et « Bonne chance » partent à la fin de cette seconde, juste avant la 1re question (qui sera lue après) */
        out.say.push({ text: "Un.", rate: 0.82 }, { text: "Zéro.", delay: 880, rate: 0.8 }, { text: LUCK, delay: 880, queue: true, rate: 0.82 }); out.st.zero = true;
      }
    } else if (!shown && on) {
      if (Number(last) === 1) { if (!zero) out.say.push({ text: "Zéro.", rate: 0.8 }, { text: LUCK, queue: true, rate: 0.82 }); } else out.cancelled = true;
    }
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
  var api = { pickVoice: pickVoice, launchTick: launchTick, announce: announce, fireLevel: fireLevel, newEvent: newEvent, bombLoss: bombLoss, speedExtra: speedExtra, BOMB_LOSS: BOMB_LOSS, SPEED_EXTRA: SPEED_EXTRA, NEW_CHANCE: NEW_CHANCE };
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
  /* La voix du navigateur est capricieuse : (1) elle doit être « débloquée » par un premier geste de l'utilisateur (iPhone, Android, Chrome),
     (2) un speak() collé à un cancel() est parfois avalé par Chrome, (3) une phrase non référencée peut être ramassée avant d'être dite. */
  var KEEP = [], pendingQ = [], drainT = 0, unlocked = false, warned = false;
  function speakNow(it) {
    try {
      var u = new SpeechSynthesisUtterance(it.text); u.lang = "fr-FR"; if (voice) u.voice = voice;
      u.pitch = 0; u.rate = it.rate || 0.82; u.volume = 1;
      u.onend = u.onerror = function (ev) { var i = KEEP.indexOf(u); if (i >= 0) KEEP.splice(i, 1); if (ev && ev.error === "not-allowed") needGesture(); };
      u.__t = Date.now(); KEEP.push(u); window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function needGesture() {
    unlocked = false; armUnlock();
    if (!warned) { warned = true; try { if (typeof showBanner === "function") showBanner("🔈 Touche l'écran une fois pour activer la voix"); } catch (e) {} }
  }
  function say(text, o) {
    try {
      var ss = window.speechSynthesis;
      if (!ss || (typeof soundEnabled !== "undefined" && !soundEnabled) || !text) return false;
      if (!voice) loadVoice();
      var wait = 0, it = { text: text, rate: (o && o.rate) || 0.82 };
      if (!o || !o.queue) {
        pendingQ = []; clearTimeout(drainT); drainT = 0;
        if (ss.speaking || ss.pending) { ss.cancel(); wait = 70; }
      }
      if (ss.paused) ss.resume();
      pendingQ.push(it);
      if (!drainT) drainT = setTimeout(function () { drainT = 0; var q = pendingQ; pendingQ = []; q.forEach(speakNow); }, wait);
      return true;
    } catch (e) { return false; }
  }
  /* vrai tant qu'une de nos phrases est en cours ou en attente : la lecture des questions (voice.js) ne doit alors ni la couper ni passer devant */
  function busy() { var now = Date.now(); return pendingQ.length > 0 || !!drainT || KEEP.some(function (u) { return now - (u.__t || 0) < 12000; }); }
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; u.lang = "fr-FR"; window.speechSynthesis.speak(u); } catch (e) {}
  }
  function armUnlock() { ["pointerdown", "touchend", "keydown", "click"].forEach(function (ev) { document.addEventListener(ev, unlock, { once: true, passive: true, capture: true }); }); }
  if (window.speechSynthesis) armUnlock();
  /* « Son ON » : une petite phrase confirme que la voix marche */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("#soundToggle") : null; if (!b) return;
    setTimeout(function () { try { if (typeof soundEnabled !== "undefined" && soundEnabled) say("Voix activée.", { rate: 0.8 }); else if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }, 80);
  }, true);
  /* ---- compte à rebours de lancement : on suit celui qui s'affiche vraiment (31-v32 : #v32Launch / #v32Count) ---- */
  var LS = { st: null, ts: [] };
  function pollLaunch() {
    try {
      var o = $("v32Launch"), c = $("v32Count");
      var r = V.launchTick(LS.st, { shown: !!(o && o.classList.contains("show")), text: c ? c.textContent : "" });
      LS.st = r.st;
      if (r.cancelled) { LS.ts.forEach(clearTimeout); LS.ts = []; }
      r.say.forEach(function (a) {
        if (a.delay) LS.ts.push(setTimeout(function () { say(a.text, { rate: a.rate, queue: !!a.queue }); }, a.delay));
        else say(a.text, { rate: a.rate, queue: !!a.queue });
      });
    } catch (e) {}
  }
  setInterval(pollLaunch, 120);
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
  window.V64Glue = { say: say, side: side, busy: busy };
})();
