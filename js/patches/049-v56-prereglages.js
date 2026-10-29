/* =============================================================================
   V56 — « 🎮 Préréglages » dans les paramètres de l'hôte : ⚡ Éclair, 🎯 Classique, 🏃 Marathon, 🧠 Réflexion
   (nombre de questions + temps par question en un clic) et 💾 / ↩️ pour mémoriser puis reprendre SA configuration
   (questions, temps, langue, thèmes cochés) d'une partie à l'autre, sur cet appareil.
   V56 est pur (testable avec Node : tests/presets.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V56 = (function () {
  "use strict";
  var PRESETS = [
    { id: "flash", label: "⚡ Éclair", rounds: 10, time: 10 },
    { id: "classic", label: "🎯 Classique", rounds: 15, time: 20 },
    { id: "marathon", label: "🏃 Marathon", rounds: 50, time: 20 },
    { id: "think", label: "🧠 Réflexion", rounds: 20, time: 30 }
  ];
  var CTRL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
  /* La valeur proposée par la liste la plus proche de ce qu'on veut (à égalité : la plus petite) ; null si la liste n'a aucun nombre. */
  function nearest(values, want) {
    var w = Number(want), best = null;
    if (!isFinite(w) || !Array.isArray(values)) return null;
    values.forEach(function (x) {
      if (x === "" || x === null || typeof x === "boolean" || typeof x === "object") return;
      var v = Number(x); if (!isFinite(v)) return;
      var dv = Math.abs(v - w), db = best === null ? Infinity : Math.abs(best - w);
      if (best === null || dv < db || (dv === db && v < best)) best = v;
    });
    return best;
  }
  /* Tirage sans remise de n éléments (n borné entre 0 et la taille de la liste), rng() dans [0, 1[. */
  function sample(list, n, rng) {
    var a = Array.isArray(list) ? list.slice() : [], k = Math.max(0, Math.min(a.length, Math.floor(Number(n)) || 0)), r = typeof rng === "function" ? rng : Math.random;
    for (var i = 0; i < k; i++) { var j = i + Math.floor(r() * (a.length - i)); if (j >= a.length) j = a.length - 1; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, k);
  }
  function int(v, lo, hi, dflt) {
    if (v === "" || v === null || typeof v === "boolean" || typeof v === "object") return dflt;
    var n = Math.floor(Number(v)); if (!isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  }
  /* Configuration mémorisée : tout est borné, rien d'inconnu n'est gardé ; null si ce n'est pas un objet. */
  function cleanSaved(raw) {
    var o = raw;
    if (typeof raw === "string") { try { o = JSON.parse(raw); } catch (e) { return null; } }
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    var themes = [], seen = Object.create(null);
    (Array.isArray(o.themes) ? o.themes : []).forEach(function (t) {
      if (typeof t !== "string" || themes.length >= 400) return;
      var s = t.replace(CTRL, "").trim().slice(0, 80);
      if (s && !seen[s]) { seen[s] = 1; themes.push(s); }
    });
    var lang = typeof o.lang === "string" && /^[a-z]{2,5}$/.test(o.lang) ? o.lang : "";
    return { rounds: int(o.rounds, 1, 500, 10), time: int(o.time, 1, 600, 20), lang: lang, themes: themes };
  }
  var api = { PRESETS: PRESETS, nearest: nearest, sample: sample, cleanSaved: cleanSaved };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof showScreen !== "function") return;
  window.V56 = V56;
  var KEY = "quizV56Saved";
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(t) { var m = $("v56Msg"); if (!m) return; m.textContent = t || ""; clearTimeout(say.t); if (t) say.t = setTimeout(function () { m.textContent = ""; }, 4500); }
  function fire(el) { el.dispatchEvent(new Event("change", { bubbles: true })); }
  function setSel(id, want) {
    var s = $(id); if (!s) return null;
    var v = V56.nearest(Array.prototype.map.call(s.options, function (o) { return o.value; }), want);
    if (v === null) return null;
    s.value = String(v); fire(s); return v;
  }
  function applyPreset(p) {
    var r = setSel("roundCount", p.rounds), t = setSel("questionTime", p.time);
    say(r === null || t === null ? "Réglage indisponible sur cet écran." : "✅ " + p.label + " : " + r + " questions, " + t + " s par question.");
  }
  function current() {
    var themes = Array.prototype.map.call(document.querySelectorAll("#themeGrid input:checked"), function (i) { return i.value; });
    return V56.cleanSaved({ rounds: $("roundCount") && $("roundCount").value, time: $("questionTime") && $("questionTime").value, lang: $("questionLang") && $("questionLang").value, themes: themes });
  }
  function saved() { var t = null; try { t = localStorage.getItem(KEY); } catch (e) {} return t ? V56.cleanSaved(t) : null; }
  function save() {
    var c = current();
    try { localStorage.setItem(KEY, JSON.stringify(c)); say("💾 Configuration mémorisée : " + c.rounds + " questions, " + c.time + " s, " + c.themes.length + " thème(s)."); }
    catch (e) { say("Impossible de mémoriser sur cet appareil."); }
    paint();
  }
  function restore() {
    var c = saved(); if (!c) { say("Aucune configuration mémorisée."); return; }
    var l = $("questionLang");
    if (c.lang && l && l.value !== c.lang && Array.prototype.some.call(l.options, function (o) { return o.value === c.lang; })) { l.value = c.lang; fire(l); }
    setSel("roundCount", c.rounds); setSel("questionTime", c.time);
    /* la langue reconstruit la liste des thèmes : on coche ensuite, un instant plus tard */
    setTimeout(function () {
      var want = Object.create(null); c.themes.forEach(function (t) { want[t] = 1; });
      var n = 0;
      Array.prototype.forEach.call(document.querySelectorAll("#themeGrid input"), function (i) {
        if (i.disabled) return;
        var on = !!want[i.value]; if (on) n++;
        if (i.checked === on) return;
        /* la sélection de thèmes se met à jour au clic sur l'étiquette (module des thèmes) : on clique donc l'étiquette, pas la case */
        var lab = i.id ? document.querySelector('label[for="' + i.id + '"]') : null;
        if (lab) lab.click(); else { i.checked = on; fire(i); }
      });
      say("↩️ Configuration reprise : " + c.rounds + " questions, " + c.time + " s, " + n + " thème(s).");
    }, 250);
  }
  function paint() { var b = $("v56Restore"); if (b) b.disabled = !saved(); }
  function mount() {
    if (!isHost || $("v56Presets")) return;
    var box = $("hostSettings"), grid = box && box.querySelector(".settings-grid"); if (!grid) return;
    var card = mk("div", "v56-card"); card.id = "v56Presets";
    card.appendChild(mk("div", "setting-title", "🎮 Préréglages"));
    var row = mk("div", "v56-row");
    V56.PRESETS.forEach(function (p) {
      var b = mk("button", "btn btn-secondary v56-b", p.label); b.type = "button"; b.title = p.rounds + " questions · " + p.time + " s par question";
      b.addEventListener("click", function () { applyPreset(p); }); row.appendChild(b);
    });
    var sv = mk("button", "btn btn-secondary v56-b", "💾 Mémoriser ma config"), rs = mk("button", "btn btn-secondary v56-b", "↩️ Reprendre ma config");
    sv.type = rs.type = "button"; rs.id = "v56Restore"; sv.id = "v56Save";
    sv.addEventListener("click", save); rs.addEventListener("click", restore);
    row.appendChild(sv); row.appendChild(rs); card.appendChild(row);
    var msg = mk("div", "v56-msg"); msg.id = "v56Msg"; msg.setAttribute("role", "status"); card.appendChild(msg);
    box.insertBefore(card, grid); paint();
  }
  function tick() { try { mount(); } catch (e) {} }
  setInterval(tick, 1000); document.addEventListener("DOMContentLoaded", tick); tick();
  window.V56UI = { applyPreset: applyPreset, save: save, restore: restore, current: current };
})();
