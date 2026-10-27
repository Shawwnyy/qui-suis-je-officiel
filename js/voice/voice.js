/* =============================================================================
   V43 — Voix off : la question est lue à voix haute

   Utilise la synthèse vocale du navigateur (speechSynthesis) : gratuite, sans compte, sans envoi de données.
   Chaque joueur règle sa propre voix sur son appareil (bouton 🗣️ du dock, distinct du narrateur 🔊 « bonne / mauvaise réponse » qui reste inchangé) :
     • voix off activée / désactivée (réglage gardé dans le navigateur) ;
     • lire aussi les quatre réponses (« Réponse A : … ») ;
     • lire l'explication après la réponse ;
     • vitesse et choix de la voix française.
   La lecture s'arrête dès qu'on répond, quand la correction apparaît ou quand la question suivante commence.
   Respecte le bouton « Son ON / OFF ». Si le navigateur n'a pas de synthèse vocale, le bouton l'indique.
   prepare() / questionScript() n'ont pas besoin du DOM : testables avec Node (tests/voice.test.js).
   ============================================================================= */
var V43Voice = (function () {
  "use strict";
  var KEY = "quizV43Voice", LETTERS = ["A", "B", "C", "D", "E", "F"];
  var DEFAULTS = { on: true, answers: false, explain: false, rate: 1, voice: "" };

  /* Texte → texte prononçable : emojis retirés, symboles dits en toutes lettres */
  function prepare(s) {
    s = String(s == null ? "" : s);
    s = s.replace(/<[^>]*>/g, " ");
    s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, " ");
    s = s.replace(/\s*[×x]\s*(?=\d)/g, " fois ").replace(/(\d)\s*[×]\s*(\d)/g, "$1 fois $2");
    s = s.replace(/\s*[−–]\s*(?=\d)/g, " moins ").replace(/\s*\+\s*(?=\d)/g, " plus ");
    s = s.replace(/(\d)\s*%/g, "$1 pour cent").replace(/°C/g, " degrés Celsius").replace(/\s*&\s*/g, " et ").replace(/\s*=\s*/g, " égale ");
    s = s.replace(/\b(\d+)\s*h\s*(\d{2})\b/g, "$1 heures $2").replace(/\b(\d+)\s*h\b/g, "$1 heures");
    s = s.replace(/[«»"“”]/g, " ").replace(/[_*#|\\\/^~]+/g, " ").replace(/\.{3,}/g, "…").replace(/\s+/g, " ").trim();
    return s.length > 400 ? s.slice(0, 397) + "…" : s;
  }
  /* Phrases à dire pour une question : [question] ou [question, "Réponse A : …", …] */
  function questionScript(q, opts) {
    var out = [], t = prepare(q && q.question);
    if (!t) return out;
    out.push(t);
    if (opts && opts.answers && Array.isArray(q.answers)) q.answers.slice(0, 6).forEach(function (a, i) { var p = prepare(a); if (p) out.push("Réponse " + LETTERS[i] + " : " + p); });
    return out;
  }

  var prefs = load(), voices = [], supported = typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  function load() {
    var p = {}; try { p = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    return { on: p.on === undefined ? DEFAULTS.on : !!p.on, answers: !!p.answers, explain: !!p.explain, rate: Math.min(1.4, Math.max(0.7, Number(p.rate) || 1)), voice: typeof p.voice === "string" ? p.voice.slice(0, 120) : "" };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }
  function refreshVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  function frVoices() { return voices.filter(function (v) { return /^fr/i.test(v.lang || ""); }); }
  function pickVoice() {
    var fr = frVoices(); if (!fr.length) return null;
    if (prefs.voice) { var m = fr.filter(function (v) { return v.name === prefs.voice; })[0]; if (m) return m; }
    var best = fr.filter(function (v) { return /fr[-_]FR/i.test(v.lang); }), pool = best.length ? best : fr;
    var nice = pool.filter(function (v) { return /google|thomas|am[ée]lie|audrey|denise|henri|hortense|julie|paul|claude|natural/i.test(v.name); });
    return (nice[0] || pool[0]);
  }
  function soundOn() { try { return typeof soundEnabled === "undefined" || !!soundEnabled; } catch (e) { return true; } }
  function stop() { if (!supported) return; try { window.speechSynthesis.cancel(); } catch (e) {} }
  /* queue = true : on ajoute à la suite (explication après le narrateur « Bonne réponse ») au lieu de couper la parole */
  function say(list, queue) {
    if (!supported || !prefs.on || !soundOn() || !list || !list.length) return false;
    if (!queue) stop();
    var v = pickVoice();
    list.forEach(function (text) {
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = v && v.lang ? v.lang : "fr-FR"; if (v) u.voice = v; u.rate = prefs.rate; u.pitch = 1; u.volume = 1;
      try { window.speechSynthesis.speak(u); } catch (e) {}
    });
    try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch (e) {}
    return true;
  }
  function readQuestion(q) { return say(questionScript(q, { answers: prefs.answers })); }
  function readExplanation(text) { if (!prefs.explain) return false; var t = prepare(text); return t ? say([t], true) : false; }

  /* ---------- Interface ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else if (k === "onclick") n.addEventListener("click", attrs[k]); else if (k === "onchange") n.addEventListener("change", attrs[k]); else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function check(id, label, key) {
    var i = el("input", { type: "checkbox", id: id }); i.checked = !!prefs[key];
    i.addEventListener("change", function () { prefs[key] = i.checked; save(); if (key === "on" && !i.checked) stop(); paintButton(); });
    return el("label", { "class": "v43v-row", "for": id }, [i, el("span", { text: label })]);
  }
  function paintButton() {
    var b = $("dockRead"); if (!b) return;
    b.setAttribute("aria-pressed", String(!!prefs.on && supported)); b.className = prefs.on && supported ? "on" : "off";
    b.title = supported ? (prefs.on ? "Voix off activée : réglages" : "Voix off désactivée : réglages") : "Voix off indisponible sur ce navigateur";
  }
  function panel() {
    var p = $("v43VoicePanel"); if (p) return p;
    p = el("div", { id: "v43VoicePanel", role: "dialog", "aria-label": "Réglages de la voix off", "class": "v43v-panel" });
    document.body.appendChild(p); return p;
  }
  function fill() {
    var p = panel(); while (p.firstChild) p.removeChild(p.firstChild);
    p.appendChild(el("div", { "class": "v43v-title", text: "🗣️ Voix off" }));
    if (!supported) { p.appendChild(el("p", { "class": "v43v-note", text: "Ton navigateur ne propose pas la synthèse vocale : la voix off n'est pas disponible ici (essaie Chrome, Edge ou Safari à jour)." })); return; }
    p.appendChild(check("v43vOn", "Lire les questions à voix haute", "on"));
    p.appendChild(check("v43vAns", "Lire aussi les quatre réponses", "answers"));
    p.appendChild(check("v43vExp", "Lire l'explication après la réponse", "explain"));
    var rate = el("select", { id: "v43vRate", "aria-label": "Vitesse de lecture" });
    [["0.8", "Lente"], ["1", "Normale"], ["1.2", "Rapide"], ["1.4", "Très rapide"]].forEach(function (o) { var op = el("option", { value: o[0], text: o[1] }); if (Math.abs(Number(o[0]) - prefs.rate) < 0.05) op.selected = true; rate.appendChild(op); });
    rate.addEventListener("change", function () { prefs.rate = Number(rate.value) || 1; save(); });
    p.appendChild(el("label", { "class": "v43v-row", "for": "v43vRate" }, [el("span", { text: "Vitesse" }), rate]));
    var fr = frVoices();
    if (fr.length > 1) {
      var sel = el("select", { id: "v43vVoice", "aria-label": "Voix" }); sel.appendChild(el("option", { value: "", text: "Automatique" }));
      fr.forEach(function (v) { var op = el("option", { value: v.name, text: v.name + " (" + v.lang + ")" }); if (v.name === prefs.voice) op.selected = true; sel.appendChild(op); });
      sel.addEventListener("change", function () { prefs.voice = sel.value; save(); });
      p.appendChild(el("label", { "class": "v43v-row", "for": "v43vVoice" }, [el("span", { text: "Voix" }), sel]));
    } else if (!fr.length) p.appendChild(el("p", { "class": "v43v-note", text: "Aucune voix française trouvée sur cet appareil : la voix par défaut sera utilisée." }));
    p.appendChild(el("button", { type: "button", "class": "v43v-test", text: "▶ Écouter un exemple", onclick: function () { var was = prefs.on; prefs.on = true; say(["Quelle est la capitale de la France ?"]); prefs.on = was; } }));
    p.appendChild(el("button", { type: "button", "class": "v43v-close", text: "Fermer", onclick: function () { p.classList.remove("show"); } }));
  }
  function mount() {
    var dock = $("dock");
    if (dock && !$("dockRead")) {
      var b = el("button", { id: "dockRead", type: "button", "aria-label": "Voix off : réglages", "aria-haspopup": "dialog", text: "🗣️", onclick: function () { fill(); panel().classList.toggle("show"); } });
      dock.insertBefore(b, dock.firstChild);
    }
    paintButton();
  }

  var api = { prepare: prepare, questionScript: questionScript, readQuestion: readQuestion, readExplanation: readExplanation, stop: stop, say: say, prefs: function () { return prefs; }, supported: supported, mount: mount, _pick: pickVoice };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.V43Voice = api;
    if (supported) { refreshVoices(); try { window.speechSynthesis.addEventListener("voiceschanged", refreshVoices); } catch (e) { window.speechSynthesis.onvoiceschanged = refreshVoices; } }
    (function hook() {
      if (typeof displayQuestion === "function") {
        var baseDisplay = displayQuestion;
        displayQuestion = function (q) { stop(); var r = baseDisplay.apply(this, arguments); try { readQuestion(q || (typeof currentQuestion !== "undefined" ? currentQuestion : null)); } catch (e) {} return r; };
      }
      if (typeof showQuestionResult === "function") {
        var baseResult = showQuestionResult;
        showQuestionResult = function () { stop(); return baseResult.apply(this, arguments); };
      }
      if (typeof sendAnswer === "function") {
        var baseSend = sendAnswer;
        sendAnswer = function () { stop(); return baseSend.apply(this, arguments); };
      }
      if (typeof toggleSound === "function") {
        var baseToggle = toggleSound;
        toggleSound = function () { var r = baseToggle.apply(this, arguments); if (!soundOn()) stop(); return r; };
      }
    })();
    var tries = 0, iv = setInterval(function () { mount(); if ($("dockRead") || ++tries > 40) clearInterval(iv); }, 500);
    document.addEventListener("DOMContentLoaded", mount);
    document.addEventListener("click", function (e) { var p = $("v43VoicePanel"); if (p && p.classList.contains("show") && !p.contains(e.target) && e.target.id !== "dockRead") p.classList.remove("show"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var p = $("v43VoicePanel"); if (p) p.classList.remove("show"); } });
  }
  return api;
})();
