/* =============================================================================
   V62 — ⏱️ Le chrono démarre APRÈS la lecture de la question, et on voit le temps qui reste après avoir répondu.
   • Lecture : à chaque question, les réponses sont verrouillées quelques secondes (selon la longueur du texte, 2 à 7 s, 1,5 s en
     mode 5 secondes) avec un bandeau « 📖 Lis la question » ; PUIS le chrono descend. La durée est fixée par l'hôte (q.readMs) pour que
     tout le monde attende pareil ; la fin de question de l'hôte est décalée d'autant.
   • Annonce des tours spéciaux (piège ×5, or ×2, éclair, chance) en grand pendant la lecture.
   • Après ta réponse, le chrono continue de descendre : « Il reste N s pour les autres ». Les autres joueurs voient
     « Léo a répondu · il reste N s » (sans savoir quoi).
   La logique est pure (V62Time, testée par tests/readtime.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V62Time = (function () {
  "use strict";
  var MIN = 2000, MAX = 7000, PER_CHAR = 45, MEDIA_EXTRA = 1500, FAST_CAP = 1500, FAST_AT = 5;
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
  /* durée de lecture (ms) : texte de la question + moitié du texte des réponses, un peu plus pour une image */
  function readMs(q, questionTime) {
    if (!q || typeof q !== "object") return MIN;
    var chars = String(q.question == null ? "" : q.question).length;
    if (Array.isArray(q.answers)) chars += q.answers.reduce(function (a, s) { return a + String(s == null ? "" : s).length; }, 0) * 0.5;
    var ms = Math.round(chars * PER_CHAR) + (q.media ? MEDIA_EXTRA : 0);
    ms = Math.max(MIN, Math.min(MAX, ms));
    if (num(questionTime) > 0 && num(questionTime) <= FAST_AT) ms = Math.min(ms, FAST_CAP);
    return Math.round(ms / 100) * 100;
  }
  /* valeur reçue du réseau : 0 à 10 000 ms, sinon -1 (on recalcule) */
  function cleanMs(v) { if (v === null || v === undefined || v === "" || typeof v === "boolean") return -1; v = Number(v); return isFinite(v) ? Math.max(0, Math.min(10000, Math.round(v))) : -1; }
  function cleanName(v) { return str(v, 24); }
  /* « Léo a répondu · il reste 12 s » */
  function answeredText(names, left, mine) {
    var n = (Array.isArray(names) ? names : []).filter(Boolean), l = Math.floor(num(left));
    if (l <= 0) return "⏱️ Temps écoulé";
    var tail = " · il reste " + l + " s", who;
    if (!n.length) return mine ? "⏱️ Réponse envoyée · il reste " + l + " s pour les autres" : "";
    if (n.length === 1) who = n[0] + " a répondu";
    else if (n.length === 2) who = n[0] + " et " + n[1] + " ont répondu";
    else if (n.length === 3) who = n[0] + ", " + n[1] + " et " + n[2] + " ont répondu";
    else who = n[0] + ", " + n[1] + " et " + (n.length - 2) + " autres ont répondu";
    return "✅ " + who + tail;
  }
  /* tour spécial annoncé pendant la lecture : { cls, text } ou null */
  function roundTag(q) {
    if (!q || typeof q !== "object") return null;
    if (q.trap === true) return { cls: "trap", text: "🕳️ QUESTION PIÈGE : bonne réponse ×5, mauvaise −300 pts !" };
    if (q.golden) return { cls: "gold", text: "⭐ QUESTION EN OR : points ×2 !" };
    if (q.event === "eclair") return { cls: "eclair", text: "⚡ ÉCLAIR : chrono −50 %, points ×1,5 !" };
    if (q.event === "chance") return { cls: "chance", text: "🍀 CHANCE : +200 pts pour chaque bonne réponse !" };
    return null;
  }
  var api = { MIN: MIN, MAX: MAX, readMs: readMs, cleanMs: cleanMs, cleanName: cleanName, answeredText: answeredText, roundTag: roundTag };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function V62Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof startTimer !== "function" || typeof displayQuestion !== "function"
    || typeof sendAnswer !== "function" || typeof showQuestionResult !== "function" || typeof handleData !== "function" || typeof withFxMods !== "function") return;
  var V = V62Time; window.V62Time = V;
  var S = { reading: false, tok: 0, rt: 0, ri: 0, post: 0, chip: 0, names: [] };
  function $(id) { return document.getElementById(id); }
  function ensure() {
    var a = $("answers"), st = $("gameStatus");
    if (a && !$("v62Read")) { var r = document.createElement("div"); r.id = "v62Read"; r.setAttribute("role", "status"); r.setAttribute("aria-live", "polite"); r.innerHTML = '<div class="v62-tag" id="v62Tag"></div><div class="v62-msg" id="v62Msg"></div><i id="v62Bar"></i>'; a.parentNode.insertBefore(r, a); }
    if (st && !$("v62Left")) { var c = document.createElement("div"); c.id = "v62Left"; c.setAttribute("role", "status"); c.setAttribute("aria-live", "off"); st.parentNode.insertBefore(c, st.nextSibling); }
  }

  /* ---- hôte : la fin de question tient compte de la lecture ; la durée est envoyée avec la question ---- */
  var baseMods = withFxMods;
  withFxMods = function () {
    var out = baseMods.apply(this, arguments);
    try {
      var ms = V.readMs(out, typeof questionTime !== "undefined" ? questionTime : 20);
      if (out && typeof out === "object") out.readMs = ms;
      if (typeof questionEndAt === "number") questionEndAt += ms;
      clearTimeout(window.__fxEnd);
      window.__fxEnd = setTimeout(function () { if (isHost) finishQuestionIfNeeded(); }, Math.max(0, questionEndAt - Date.now()) + 200);
    } catch (e) { if (window.console) console.error("V62 withFxMods", e); }
    return out;
  };

  /* ---- lecture puis chrono ---- */
  function tick() {   /* identique au chrono d'origine (core/20) */
    timeLeft--; updateTimer();
    if (timeLeft <= 5 && timeLeft > 0) soundCountdown();
    if (timeLeft <= 0) { clearInterval(timer); if (!answered) sendAnswer(-1); if (isHost) finishQuestionIfNeeded(); }
  }
  function endReading(tok) {
    if (tok !== S.tok || !S.reading) return;
    S.reading = false; clearInterval(S.ri); S.ri = 0;
    var a = $("answers"), r = $("v62Read"); if (a) a.classList.remove("v62-lock"); if (r) r.classList.remove("show");
    if (!answered) { clearInterval(timer); timer = setInterval(tick, 1000); }
  }
  function cancelReading() {
    S.tok++; S.reading = false; clearTimeout(S.rt); clearInterval(S.ri); S.ri = 0;
    var a = $("answers"), r = $("v62Read"); if (a) a.classList.remove("v62-lock"); if (r) r.classList.remove("show");
  }
  function beginReading(ms, q) {
    ensure(); var tok = ++S.tok, t0 = Date.now(), a = $("answers"), r = $("v62Read"), tag = V.roundTag(q);
    if (!r) { clearInterval(timer); timer = setInterval(tick, 1000); return; }
    S.reading = true; if (a) a.classList.add("v62-lock");
    var tg = $("v62Tag"); tg.textContent = tag ? tag.text : ""; tg.className = "v62-tag" + (tag ? " " + tag.cls : "");
    var bar = $("v62Bar"); bar.style.setProperty("--ms", ms + "ms"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
    var paint = function () { var left = Math.max(0, Math.ceil((ms - (Date.now() - t0)) / 1000)); $("v62Msg").textContent = "📖 Lis la question… le chrono démarre dans " + left + " s"; };
    paint(); r.classList.add("show"); clearInterval(S.ri); S.ri = setInterval(paint, 250);
    clearTimeout(S.rt); S.rt = setTimeout(function () { endReading(tok); }, ms);
  }
  var baseStart = startTimer;
  startTimer = function () {
    var r = baseStart.apply(this, arguments);
    try {
      stopPost();
      var q = typeof currentQuestion !== "undefined" ? currentQuestion : null, ms = V.cleanMs(q && q.readMs);
      if (ms < 0) ms = V.readMs(q, typeof questionTime !== "undefined" ? questionTime : 20);
      if (ms > 0) { clearInterval(timer); beginReading(ms, q); }
    } catch (e) { if (window.console) console.error("V62 startTimer", e); }
    return r;
  };
  var baseDisplay = displayQuestion;
  displayQuestion = function () { cancelReading(); stopPost(); S.names = []; hideChip(); return baseDisplay.apply(this, arguments); };

  /* ---- réponses verrouillées pendant la lecture ---- */
  var baseSend = sendAnswer;
  sendAnswer = function (index) {
    if (S.reading && index !== -1) return;
    var was = answered, r = baseSend.apply(this, arguments);
    try { if (!was && answered && index !== -1 && timeLeft > 0) startPost(); } catch (e) {}
    return r;
  };

  /* ---- après la réponse : le temps continue de descendre ---- */
  function stopPost() { clearInterval(S.post); S.post = 0; var t = $("timer"); if (t) t.classList.remove("v62-done"); }
  function startPost() {
    stopPost(); var t = $("timer"); if (t) t.classList.add("v62-done");
    S.post = setInterval(function () { timeLeft--; try { updateTimer(); } catch (e) {} paintChip(); if (timeLeft <= 0) { clearInterval(S.post); S.post = 0; } }, 1000);
    paintChip(); startChip();
  }
  function hideChip() { clearInterval(S.chip); S.chip = 0; var c = $("v62Left"); if (c) { c.classList.remove("show"); c.textContent = ""; } }
  function paintChip() {
    ensure(); var c = $("v62Left"); if (!c) return;
    var txt = V.answeredText(S.names, typeof timeLeft === "number" ? timeLeft : 0, !!(typeof answered !== "undefined" && answered));
    c.textContent = txt; c.classList.toggle("show", !!txt);
  }
  function startChip() { clearInterval(S.chip); S.chip = setInterval(paintChip, 500); }
  function noteAnswered(d) {
    var n = V.cleanName(d && d.name); if (!n || S.names.indexOf(n) >= 0 || S.names.length >= 12) return;
    S.names.push(n); paintChip(); startChip();
  }
  var baseResult = showQuestionResult;
  showQuestionResult = function () { cancelReading(); stopPost(); hideChip(); return baseResult.apply(this, arguments); };

  /* hôte : annonce qui vient de répondre (sans dire quoi) */
  if (typeof handlePlayerAnswer === "function") {
    var baseHPA = handlePlayerAnswer;
    handlePlayerAnswer = function (data) {
      var dup = !!(data && typeof answersReceived !== "undefined" && answersReceived && answersReceived.has(data.playerId));
      var r = baseHPA.apply(this, arguments);
      try {
        var p = !dup && data && data.answer !== -1 ? players[data.playerId] : null;
        if (isHost && p) { var msg = { type: "v62Answered", name: V.cleanName(p.name) }; noteAnswered(msg); broadcast(msg); }
      } catch (e) {}
      return r;
    };
  }
  var baseHandle = handleData;
  handleData = function (data) {
    if (data && data.type === "v62Answered") { if (!isHost) noteAnswered(data); return; }
    return baseHandle.apply(this, arguments);
  };
  window.V62Clock = { noteAnswered: noteAnswered, state: S };
})();
