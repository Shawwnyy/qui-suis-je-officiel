/* =============================================================================
   V57 — Écran de configuration de l'hôte : « 📋 Ta partie en un coup d'œil » (durée estimée, questions disponibles,
   avertissements), « 🎚️ Difficulté » (Facile / Moyen / Difficile / Impossible, filtre réellement appliqué au tirage),
   « 🔗 Code de config » à copier / coller pour partager sa configuration, et réparation automatique de l'écran
   (liste des langues, listes de questions et de temps, grille des thèmes) si un autre script les a laissées vides.
   V57 est pur (testable avec Node : tests/config.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V57 = (function () {
  "use strict";
  var DIFFS = [["facile", "🟢 Facile"], ["moyen", "🔵 Moyen"], ["difficile", "🟠 Difficile"], ["impossible", "🔴 Impossible"]];
  var IDS = DIFFS.map(function (d) { return d[0]; });
  var OVERHEAD = 6;                       /* secondes entre deux questions (correction + transition) */
  var PREFIX = "QSJ1.", MARATHON = 999;
  var CTRL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
  function int(v, lo, hi, dflt) {
    if (v === "" || v === null || v === undefined || typeof v === "boolean" || typeof v === "object") return dflt;
    var n = Math.floor(Number(v)); if (!isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  }
  function nfr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }

  /* Difficultés retenues : sous-ensemble valide dans l'ordre du jeu ; vide ou invalide = toutes. */
  function cleanDiffs(v) {
    var out = [];
    if (Array.isArray(v)) IDS.forEach(function (id) { if (v.indexOf(id) >= 0) out.push(id); });
    return out.length ? out : IDS.slice();
  }
  function isAll(d) { return cleanDiffs(d).length === IDS.length; }
  function toggleDiff(current, id) {
    var cur = cleanDiffs(current), has = cur.indexOf(id) >= 0;
    if (IDS.indexOf(id) < 0) return cur;
    if (isAll(cur)) return [id];                                  /* de « toutes » à « seulement celle-ci » */
    var next = has ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]);
    return cleanDiffs(next);                                      /* plus rien de coché = toutes */
  }
  /* Filtre du tirage : les questions d'une difficulté inconnue passent toujours ; si rien ne reste, on garde tout. */
  function filterPool(pool, diffs) {
    if (!Array.isArray(pool)) return { pool: [], fellBack: false };
    var d = cleanDiffs(diffs);
    if (isAll(d)) return { pool: pool, fellBack: false };
    var out = pool.filter(function (q) { return !q || IDS.indexOf(q.difficulty) < 0 || d.indexOf(q.difficulty) >= 0; });
    return out.length ? { pool: out, fellBack: false } : { pool: pool, fellBack: true };
  }
  /* Nombre de questions jouables : table { catégorie: { difficulté: n } } + thèmes cochés + difficultés. */
  function countPool(tally, themes, diffs) {
    var d = cleanDiffs(diffs), all = isAll(d), n = 0, seen = Object.create(null);
    (Array.isArray(themes) ? themes : []).forEach(function (c) {
      if (seen[c] || !tally || !tally[c]) return; seen[c] = 1;
      Object.keys(tally[c]).forEach(function (k) { if (all || IDS.indexOf(k) < 0 || d.indexOf(k) >= 0) n += tally[c][k]; });
    });
    return n;
  }
  function tallyQuestions(questions, ok) {
    var t = Object.create(null);
    (Array.isArray(questions) ? questions : []).forEach(function (q) {
      if (!q || (ok && !ok(q))) return;
      var c = q.category, k = IDS.indexOf(q.difficulty) >= 0 ? q.difficulty : "autre";
      if (!t[c]) t[c] = Object.create(null);
      t[c][k] = (t[c][k] || 0) + 1;
    });
    return t;
  }
  function fmtDuration(sec) {
    var m = Math.round(Math.max(0, Number(sec) || 0) / 60);
    if (m < 1) return "moins d’1 min";
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " h" + (r ? " " + (r < 10 ? "0" : "") + r : "");
  }
  /* Durée estimée : chaque question dure le temps de réponse + OVERHEAD s ; on ne joue jamais plus que ce qui existe, ni plus de 999 (le « marathon »). */
  function estimate(rounds, time, available) {
    var r = int(rounds, 1, MARATHON, 10), t = int(time, 1, 600, 20);
    var a = (available === undefined || available === null) ? r : Math.max(0, Math.floor(Number(available)) || 0);
    var played = Math.min(r, a), sec = played * (t + OVERHEAD);
    return { asked: r, played: played, seconds: sec, label: fmtDuration(sec), short: r !== MARATHON && played < r, marathon: r === MARATHON, time: t };
  }
  /* Lignes du résumé : { key, text, warn }. o : { rounds, time, themes, pool, diffs, lang, langLabel, untranslated } */
  function summary(o) {
    o = o || {}; var out = [], themes = Math.max(0, Math.floor(Number(o.themes)) || 0), pool = Math.max(0, Math.floor(Number(o.pool)) || 0);
    if (!themes) return [{ key: "themes", text: "⚠️ Aucun thème sélectionné : choisis au moins un thème.", warn: true }];
    var e = estimate(o.rounds, o.time, pool);
    if (!pool) return [{ key: "pool", text: "⚠️ Aucune question ne correspond (langue ou difficulté trop restrictives pour ces thèmes).", warn: true }];
    out.push({ key: "time", text: "⏱️ " + (e.seconds < 30 ? "" : "≈ ") + e.label + " · " + (e.marathon && pool <= 999 ? "toutes les " + nfr(e.played) + " questions" : plural(e.played, "question", "questions")) + " × " + e.time + " s", warn: false });
    out.push({ key: "pool", text: "📚 " + nfr(pool) + " question" + (pool > 1 ? "s" : "") + " dans " + plural(themes, "thème", "thèmes"), warn: false });
    if (e.short) out.push({ key: "short", text: "⚠️ Seulement " + plural(pool, "question disponible", "questions disponibles") + " : la partie sera limitée à " + pool + ".", warn: true });
    var d = cleanDiffs(o.diffs);
    if (!isAll(d)) out.push({ key: "diffs", text: "🎚️ " + DIFFS.filter(function (x) { return d.indexOf(x[0]) >= 0; }).map(function (x) { return x[1].replace(/^\S+\s/, ""); }).join(", "), warn: false });
    if (o.lang && o.lang !== "fr") out.push({ key: "lang", text: "🌐 " + (o.langLabel || o.lang), warn: false });
    var u = Math.max(0, Math.floor(Number(o.untranslated)) || 0);
    if (u) out.push({ key: "untranslated", text: "ℹ️ " + plural(u, "thème coché n’a", "thèmes cochés n’ont") + " pas de traduction dans cette langue : " + (u > 1 ? "ils sont ignorés." : "il est ignoré."), warn: true });
    return out;
  }

  /* ---- code de config à partager : « QSJ1. » + JSON compact en base64 URL ---- */
  function b64e(s) {
    var b = typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s)));
    return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(s) {
    var t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "=";
    return typeof Buffer !== "undefined" ? Buffer.from(t, "base64").toString("utf8") : decodeURIComponent(escape(atob(t)));
  }
  function clean(o) {
    o = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    var themes = [], seen = Object.create(null);
    (Array.isArray(o.themes) ? o.themes : []).forEach(function (t) {
      if (typeof t !== "string" || themes.length >= 400) return;
      var s = t.replace(CTRL, "").trim().slice(0, 80);
      if (s && !seen[s]) { seen[s] = 1; themes.push(s); }
    });
    return { rounds: int(o.rounds, 1, MARATHON, 10), time: int(o.time, 1, 600, 20), lang: typeof o.lang === "string" && /^[a-z]{2,5}$/.test(o.lang) ? o.lang : "", diffs: cleanDiffs(o.diffs), themes: themes };
  }
  function encode(cfg) {
    var c = clean(cfg), j = { r: c.rounds, t: c.time, l: c.lang, th: c.themes };
    if (!isAll(c.diffs)) j.d = c.diffs;
    return PREFIX + b64e(JSON.stringify(j));
  }
  function decode(text) {
    var s = String(text == null ? "" : text).replace(/\s+/g, "");
    if (s.indexOf(PREFIX) !== 0) return null;
    var body = s.slice(PREFIX.length);
    if (!body || body.length > 30000 || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
    var o; try { o = JSON.parse(b64d(body)); } catch (e) { return null; }
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    return clean({ rounds: o.r, time: o.t, lang: o.l, diffs: o.d, themes: o.th });
  }
  var api = { DIFFS: DIFFS, OVERHEAD: OVERHEAD, PREFIX: PREFIX, cleanDiffs: cleanDiffs, isAll: isAll, toggleDiff: toggleDiff, filterPool: filterPool, countPool: countPool,
    tallyQuestions: tallyQuestions, fmtDuration: fmtDuration, estimate: estimate, summary: summary, clean: clean, encode: encode, decode: decode };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof showScreen !== "function") return;
  window.V57 = V57;
  var KEY = "quizV57Diffs", S = { diffs: V57.cleanDiffs(null), sig: "", tally: {}, tallyKey: "" };
  try { S.diffs = V57.cleanDiffs(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) {}
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(t) { var m = $("v57Msg"); if (!m) return; m.textContent = t || ""; clearTimeout(say.t); if (t) say.t = setTimeout(function () { m.textContent = ""; }, 5000); }
  function fire(el) { el.dispatchEvent(new Event("change", { bubbles: true })); }

  /* ---- le filtre de difficulté s'applique au tirage de la partie (côté hôte) ---- */
  if (typeof getQuestionPool === "function") {
    var basePool = getQuestionPool;
    getQuestionPool = function () {
      var p = basePool.apply(this, arguments);
      try { return V57.filterPool(p, S.diffs).pool; } catch (e) { return p; }
    };
  }

  /* ---- lecture de l'écran ---- */
  function checkedThemes() {
    var on = [], off = [];
    Array.prototype.forEach.call(document.querySelectorAll("#themeGrid input:checked"), function (i) { (i.disabled ? off : on).push(i.value); });
    return { on: on, off: off };
  }
  function langInfo() {
    var l = $("questionLang"), code = l && l.value || "fr", opt = l && l.options[l.selectedIndex];
    return { code: code, label: opt ? opt.textContent : code };
  }
  /* table { catégorie: { difficulté: n } } des questions jouables dans la langue ; calculée une fois par langue (la liste de traductions est lente) */
  function tallyFor(lang) {
    var key = lang + "|" + (typeof QUESTIONS !== "undefined" ? QUESTIONS.length : 0);
    if (S.tallyKey === key) return S.tally;
    var ok = null;
    if (lang !== "fr" && typeof hasTranslation === "function") ok = function (q) { try { return hasTranslation(q, lang); } catch (e) { return false; } };
    S.tally = V57.tallyQuestions(typeof QUESTIONS !== "undefined" ? QUESTIONS : [], ok); S.tallyKey = key;
    return S.tally;
  }
  function current() {
    var th = checkedThemes();
    return V57.clean({ rounds: $("roundCount") && $("roundCount").value, time: $("questionTime") && $("questionTime").value, lang: langInfo().code, diffs: S.diffs, themes: th.on.concat(th.off) });
  }

  /* ---- affichage ---- */
  function paintDiffs() {
    Array.prototype.forEach.call(document.querySelectorAll("#v57Diffs button[data-d]"), function (b) {
      var on = V57.isAll(S.diffs) ? false : S.diffs.indexOf(b.getAttribute("data-d")) >= 0;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    });
    var n = $("v57DiffNote"); if (n) n.textContent = V57.isAll(S.diffs) ? "Toutes les difficultés (aucune case = toutes)." : "Seulement : " + S.diffs.join(", ") + ".";
  }
  function refresh(force) {
    var box = $("v57Lines"); if (!box || !isHost) return;
    var th = checkedThemes(), li = langInfo(), r = $("roundCount"), t = $("questionTime");
    var sig = [r && r.value, t && t.value, li.code, S.diffs.join(), th.on.join("|"), th.off.length].join("§");
    if (!force && sig === S.sig) return; S.sig = sig;
    var pool = V57.countPool(tallyFor(li.code), th.on, S.diffs);
    var lines = V57.summary({ rounds: r && r.value, time: t && t.value, themes: th.on.length, pool: pool, diffs: S.diffs, lang: li.code, langLabel: li.label, untranslated: th.off.length });
    while (box.firstChild) box.removeChild(box.firstChild);
    lines.forEach(function (l) { var c = mk("span", "v57-chip" + (l.warn ? " warn" : ""), l.text); c.setAttribute("data-k", l.key); box.appendChild(c); });
    paintDiffs();
  }
  function setDiff(id) { S.diffs = V57.toggleDiff(S.diffs, id); try { localStorage.setItem(KEY, JSON.stringify(S.diffs)); } catch (e) {} refresh(true); }
  function setSel(id, want) {
    var s = $(id); if (!s) return null;
    var best = null; Array.prototype.forEach.call(s.options, function (o) { var v = Number(o.value); if (isFinite(v) && (best === null || Math.abs(v - want) < Math.abs(best - want) || (Math.abs(v - want) === Math.abs(best - want) && v < best))) best = v; });
    if (best === null) return null; s.value = String(best); fire(s); return best;
  }
  function copyCode() {
    var code = V57.encode(current()), f = $("v57Code"); if (f) { f.value = code; try { f.select(); } catch (e) {} }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { say("📤 Code copié : colle-le à un autre hôte."); }, function () { say("📤 Code affiché : copie-le à la main."); });
    else say("📤 Code affiché : copie-le à la main.");
  }
  function applyCode(text) {
    var c = V57.decode(text != null ? text : ($("v57Code") && $("v57Code").value));
    if (!c) { say("❌ Code invalide : il commence par QSJ1. et se copie en entier."); return false; }
    var l = $("questionLang");
    if (c.lang && l && l.value !== c.lang && Array.prototype.some.call(l.options, function (o) { return o.value === c.lang; })) { l.value = c.lang; fire(l); }
    setSel("roundCount", c.rounds); setSel("questionTime", c.time);
    S.diffs = c.diffs; try { localStorage.setItem(KEY, JSON.stringify(S.diffs)); } catch (e) {}
    setTimeout(function () {                               /* la langue reconstruit la grille des thèmes : on coche ensuite */
      var n = 0;
      if (c.themes.length) {
        var want = Object.create(null); c.themes.forEach(function (x) { want[x] = 1; });
        Array.prototype.forEach.call(document.querySelectorAll("#themeGrid input"), function (i) {
          if (i.disabled) return;
          var on = !!want[i.value]; if (on) n++;
          if (i.checked === on) return;
          var lab = i.id ? document.querySelector('label[for="' + i.id + '"]') : null;      /* le module des thèmes suit le clic sur l'étiquette */
          if (lab) lab.click(); else { i.checked = on; fire(i); }
        });
      }
      refresh(true); say("📥 Config appliquée : " + c.rounds + " questions, " + c.time + " s" + (c.themes.length ? ", " + n + " thème(s) coché(s)" : "") + ".");
    }, 300);
    return true;
  }
  function mount() {
    if (!isHost || $("v57Config")) return;
    var box = $("hostSettings"), grid = box && box.querySelector(".settings-grid"); if (!grid || !grid.parentNode) return;
    var card = mk("div", "v57-card"); card.id = "v57Config";
    card.appendChild(mk("div", "setting-title", "📋 Ta partie en un coup d’œil"));
    var lines = mk("div", "v57-lines"); lines.id = "v57Lines"; lines.setAttribute("role", "status"); card.appendChild(lines);
    card.appendChild(mk("div", "setting-title v57-sub", "🎚️ Difficulté des questions"));
    var row = mk("div", "v57-row"); row.id = "v57Diffs";
    V57.DIFFS.forEach(function (d) { var b = mk("button", "btn btn-secondary v57-b", d[1]); b.type = "button"; b.setAttribute("data-d", d[0]); b.addEventListener("click", function () { setDiff(d[0]); }); row.appendChild(b); });
    card.appendChild(row);
    var note = mk("div", "v57-note"); note.id = "v57DiffNote"; card.appendChild(note);
    card.appendChild(mk("div", "setting-title v57-sub", "🔗 Code de config"));
    var share = mk("div", "v57-row"), code = mk("input", "input v57-code"); code.id = "v57Code"; code.type = "text"; code.autocomplete = "off"; code.spellcheck = false; code.placeholder = "Coller un code QSJ1.… ici";
    code.setAttribute("aria-label", "Code de configuration");
    var cp = mk("button", "btn btn-secondary v57-b", "📤 Copier mon code"), ap = mk("button", "btn btn-secondary v57-b", "📥 Appliquer ce code");
    cp.type = ap.type = "button"; cp.id = "v57Copy"; ap.id = "v57Apply"; cp.addEventListener("click", copyCode); ap.addEventListener("click", function () { applyCode(); });
    code.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyCode(); } });
    share.appendChild(code); share.appendChild(cp); share.appendChild(ap); card.appendChild(share);
    var msg = mk("div", "v57-msg"); msg.id = "v57Msg"; msg.setAttribute("role", "status"); card.appendChild(msg);
    grid.parentNode.insertBefore(card, grid.nextSibling);
    ["roundCount", "questionTime", "questionLang"].forEach(function (id) { var s = $(id); if (s) s.addEventListener("change", function () { setTimeout(function () { refresh(true); }, 60); }); });
    var tg = $("themeGrid"); if (tg) tg.addEventListener("click", function () { setTimeout(refresh, 80); });
    refresh(true);
  }

  /* ---- réparation automatique : une liste vide ou sans sélection ne doit jamais rester affichée ---- */
  function heal() {
    var l = $("questionLang");
    if (l && (l.options.length === 0 || l.selectedIndex < 0)) {
      try { if (typeof buildLangSelect === "function") buildLangSelect(); } catch (e) {}
      if (l.options.length === 0) { var o = document.createElement("option"); o.value = "fr"; o.textContent = "🇫🇷 Français"; l.appendChild(o); }
      if (l.selectedIndex < 0) l.selectedIndex = 0;
      fire(l);
    }
    [["roundCount", 1], ["questionTime", 2]].forEach(function (p) {
      var s = $(p[0]); if (s && s.options.length && s.selectedIndex < 0) s.selectedIndex = Math.min(p[1], s.options.length - 1);
    });
    var g = $("themeGrid");
    if (g && isHost && $("hostSettings") && !g.querySelector("input")) { try { buildThemeSelector(); } catch (e) {} }
  }
  function tick() { try { heal(); mount(); refresh(); } catch (e) {} }
  setInterval(tick, 1000); document.addEventListener("DOMContentLoaded", tick); tick();
  window.V57UI = { refresh: refresh, copyCode: copyCode, applyCode: applyCode, setDiff: setDiff, current: current, heal: heal, state: S };
})();
