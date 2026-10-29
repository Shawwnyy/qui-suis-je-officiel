/* =============================================================================
   V58 — Trois outils de plus pour l'hôte (carte « ✨ Outils de l'hôte », sous « Ta partie en un coup d'œil ») :
   • 🆕 Questions jamais jouées d'abord : l'appareil de l'hôte retient les questions déjà posées ; si assez de nouvelles
     questions existent pour la partie, seules elles sont tirées (sinon toutes, avec un message). Bouton pour tout oublier.
   • 📈 Difficulté progressive : les questions de la partie sont rangées du plus facile au plus difficile (ordre aléatoire
     à l'intérieur de chaque niveau).
   • ⭐ Thèmes favoris : enregistrer / rappeler sa sélection de thèmes en un clic, et inverser la sélection.
   V58 est pur (testable avec Node : tests/extras.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V58 = (function () {
  "use strict";
  var RANK = { facile: 0, moyen: 1, difficile: 2, impossible: 3 }, CAP_SEEN = 40000, CAP_FAVS = 250;
  /* clé courte et stable d'une question (FNV-1a 32 bits de « thème + énoncé ») */
  function qKey(q) {
    if (!q || typeof q !== "object") return "";
    var s = String(q.category == null ? "" : q.category) + "\u0001" + String(q.question == null ? "" : q.question), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }
  var KEYRE = /^[0-9a-z]{1,8}$/;
  function cleanSeen(list) {
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null), out = [];
    list.forEach(function (k) { if (typeof k === "string" && KEYRE.test(k) && !seen[k]) { seen[k] = 1; out.push(k); } });
    return out.length > CAP_SEEN ? out.slice(out.length - CAP_SEEN) : out;
  }
  /* ajoute des clés à la fin (les plus récentes), sans doublon, en gardant les CAP_SEEN dernières */
  function addSeen(list, keys) {
    var cur = cleanSeen(list), have = Object.create(null), added = 0;
    cur.forEach(function (k) { have[k] = 1; });
    (Array.isArray(keys) ? keys : []).forEach(function (k) { if (typeof k === "string" && KEYRE.test(k) && !have[k]) { have[k] = 1; cur.push(k); added++; } });
    return { list: cur.length > CAP_SEEN ? cur.slice(cur.length - CAP_SEEN) : cur, added: added };
  }
  function setOf(list) { var m = Object.create(null); cleanSeen(list).forEach(function (k) { m[k] = 1; }); return m; }
  function countFresh(pool, seenList) {
    var m = setOf(seenList), n = 0;
    (pool || []).forEach(function (q) { if (!m[qKey(q)]) n++; });
    return { fresh: n, total: (pool || []).length };
  }
  /* tirage : si « jamais jouées » est demandé et qu'il y en a assez pour la partie, on ne garde qu'elles ; sinon tout le lot */
  function pickPool(pool, seenList, need, on) {
    pool = Array.isArray(pool) ? pool : [];
    if (!on) return { pool: pool, mode: "off", fresh: null, total: pool.length };
    var m = setOf(seenList), fresh = pool.filter(function (q) { return !m[qKey(q)]; }), n = Math.max(1, Math.min(Number(need) || 1, pool.length || 1));
    if (fresh.length >= n) return { pool: fresh, mode: "fresh", fresh: fresh.length, total: pool.length };
    return { pool: pool, mode: "all", fresh: fresh.length, total: pool.length };
  }
  /* tri stable du plus facile au plus difficile (l'ordre aléatoire est gardé à l'intérieur d'un niveau) */
  function byDifficulty(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (q, i) { return { q: q, i: i, r: q && RANK[q.difficulty] !== undefined ? RANK[q.difficulty] : 1 }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; }).map(function (x) { return x.q; });
  }
  /* liste déjà mélangée → les n premières (celles qui seront jouées) rangées du plus facile au plus difficile, puis le reste */
  function progressiveHead(shuffled, n) {
    if (!Array.isArray(shuffled)) return [];
    var k = Math.max(0, Math.min(Math.floor(Number(n)) || 0, shuffled.length));
    return byDifficulty(shuffled.slice(0, k)).concat(shuffled.slice(k));
  }
  function looksLikeQuestions(list) {
    return Array.isArray(list) && list.length > 1 && list.every(function (q) { return q && typeof q === "object" && q.category !== undefined && q.question !== undefined && q.difficulty !== undefined; });
  }
  function cleanFavs(list, valid) {
    if (!Array.isArray(list)) return [];
    var ok = null; if (valid) { ok = Object.create(null); valid.forEach(function (v) { ok[v] = 1; }); }
    var seen = Object.create(null), out = [];
    list.forEach(function (v) { if (typeof v === "string" && v && v.length <= 120 && !seen[v] && (!ok || ok[v])) { seen[v] = 1; out.push(v); } });
    return out.slice(0, CAP_FAVS);
  }
  function invert(all, on) {
    var m = Object.create(null); (on || []).forEach(function (v) { m[v] = 1; });
    return (all || []).filter(function (v) { return !m[v]; });
  }
  function cleanOpts(o) { o = o && typeof o === "object" && !Array.isArray(o) ? o : {}; return { fresh: o.fresh === true, prog: o.prog === true }; }
  var api = { RANK: RANK, CAP_SEEN: CAP_SEEN, CAP_FAVS: CAP_FAVS, qKey: qKey, cleanSeen: cleanSeen, addSeen: addSeen, countFresh: countFresh, pickPool: pickPool, byDifficulty: byDifficulty, progressiveHead: progressiveHead, looksLikeQuestions: looksLikeQuestions, cleanFavs: cleanFavs, invert: invert, cleanOpts: cleanOpts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof showScreen !== "function") return;
  window.V58 = V58;
  var K_SEEN = "quizV58Seen", K_FAV = "quizV58Favs", K_OPT = "quizV58Opts", S = { opts: V58.cleanOpts(null), seen: [], favs: [], sig: "", prev: null };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  S.opts = V58.cleanOpts(load(K_OPT)); S.seen = V58.cleanSeen(load(K_SEEN)); S.favs = V58.cleanFavs(load(K_FAV));
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fire(el) { el.dispatchEvent(new Event("change", { bubbles: true })); }
  function say(t) { var m = $("v58Msg"); if (!m) return; m.textContent = t || ""; clearTimeout(say.t); if (t) say.t = setTimeout(function () { m.textContent = ""; }, 5000); }

  /* ---- chaque question tirée porte sa clé (même traduite) : on s'en sert pour savoir ce qui a déjà été posé ---- */
  if (typeof localizeQuestion === "function") {
    var baseLoc = localizeQuestion;
    localizeQuestion = function (q, lang) {
      var r = baseLoc.apply(this, arguments);
      try { if (r && typeof r === "object" && !r.v58k) { var k = V58.qKey(q); r = r === q ? Object.assign({}, q, { v58k: k }) : Object.assign(r, { v58k: k }); } } catch (e) {}
      return r;
    };
  }
  /* ---- tirage : « jamais jouées d'abord » ---- */
  var lastPick = null;
  if (typeof getQuestionPool === "function") {
    var basePool = getQuestionPool;
    getQuestionPool = function () {
      var p = basePool.apply(this, arguments);
      try {
        var r = $("roundCount"), pick = V58.pickPool(p, S.seen, r ? Number(r.value) : 10, S.opts.fresh);
        lastPick = pick; return pick.pool;
      } catch (e) { return p; }
    };
    S.rawPool = basePool;
  }
  /* ---- difficulté progressive : au moment du tirage de la partie (l'hôte mélange le lot puis garde les N premières),
         on range ces N questions du plus facile au plus difficile avant qu'elles ne soient gardées ---- */
  if (typeof shuffle === "function") {
    var baseShuffle = shuffle;
    shuffle = function (arr) {
      var out = baseShuffle.apply(this, arguments);
      try {
        if (S.opts.prog && typeof isHost !== "undefined" && isHost && typeof gameStarted !== "undefined" && !gameStarted && typeof totalRounds === "number" && V58.looksLikeQuestions(out)) return V58.progressiveHead(out, totalRounds);
      } catch (e) {}
      return out;
    };
  }
  /* ---- mémoire : une question compte comme « jouée » dès qu'elle a été posée (côté hôte) ---- */
  function remember() {
    if (typeof isHost === "undefined" || !isHost || typeof gameStarted === "undefined" || !gameStarted || !Array.isArray(usedQuestions)) return;
    var upto = Math.min(usedQuestions.length - 1, Number(currentQuestionIndex) || 0), keys = [];
    for (var i = 0; i <= upto; i++) if (usedQuestions[i] && usedQuestions[i].v58k) keys.push(usedQuestions[i].v58k);
    var r = V58.addSeen(S.seen, keys);
    if (r.added) { S.seen = r.list; save(K_SEEN, S.seen); S.sig = ""; }
  }

  /* ---- écran ---- */
  function themeInputs() { return Array.prototype.filter.call(document.querySelectorAll("#themeGrid input"), function (i) { return !i.disabled; }); }
  function setThemes(want) {
    var m = Object.create(null); want.forEach(function (v) { m[v] = 1; }); var n = 0;
    themeInputs().forEach(function (i) {
      var on = !!m[i.value]; if (on) n++;
      if (i.checked === on) return;
      var lab = i.id ? document.querySelector('label[for="' + i.id + '"]') : null;
      if (lab) lab.click(); else { i.checked = on; fire(i); }
    });
    return n;
  }
  function paint() {
    var f = $("v58Fresh"), p = $("v58Prog"); if (f) f.checked = S.opts.fresh; if (p) p.checked = S.opts.prog;
    var info = $("v58Info"); if (!info || typeof isHost === "undefined" || !isHost) return;
    var sig = [S.opts.fresh, S.seen.length, S.favs.length, document.querySelectorAll("#themeGrid input:checked").length].join("§"); if (sig === S.sig) return; S.sig = sig;
    var txt = "🧠 " + S.seen.length + " question" + (S.seen.length > 1 ? "s" : "") + " déjà jouée" + (S.seen.length > 1 ? "s" : "") + " sur cet appareil";
    try {
      if (S.rawPool) { var c = V58.countFresh(S.rawPool(), S.seen); txt += " · " + c.fresh + " jamais jouée" + (c.fresh > 1 ? "s" : "") + " sur " + c.total + " dans les thèmes cochés"; }
    } catch (e) {}
    info.textContent = txt + ".";
    var fb = $("v58FavLoad"); if (fb) fb.textContent = "⭐ Mes favoris" + (S.favs.length ? " (" + S.favs.length + ")" : "");
  }
  function mount() {
    if (typeof isHost === "undefined" || !isHost || $("v58Extras")) return;
    var anchor = $("v57Config") || ($("hostSettings") && $("hostSettings").querySelector(".settings-grid")); if (!anchor || !anchor.parentNode) return;
    var card = mk("div", "v58-card"); card.id = "v58Extras";
    card.appendChild(mk("div", "setting-title", "✨ Outils de l’hôte"));
    function opt(id, text, key) {
      var lab = mk("label", "v58-opt"), cb = mk("input"); cb.type = "checkbox"; cb.id = id; lab.appendChild(cb); lab.appendChild(document.createElement("span")).textContent = text;
      cb.addEventListener("change", function () { S.opts[key] = cb.checked; save(K_OPT, S.opts); S.sig = ""; paint(); });
      return lab;
    }
    card.appendChild(opt("v58Fresh", "🆕 Questions jamais jouées d’abord (sur cet appareil)", "fresh"));
    card.appendChild(opt("v58Prog", "📈 Difficulté progressive (du plus facile au plus dur)", "prog"));
    var info = mk("div", "v58-note"); info.id = "v58Info"; info.setAttribute("role", "status"); card.appendChild(info);
    var row = mk("div", "v58-row");
    function btn(id, text, fn) { var b = mk("button", "btn btn-secondary v58-b", text); b.type = "button"; b.id = id; b.addEventListener("click", fn); row.appendChild(b); return b; }
    btn("v58Reset", "🧹 Oublier les questions jouées", function () { S.seen = []; save(K_SEEN, S.seen); S.sig = ""; paint(); say("🧹 Historique effacé : toutes les questions sont de nouveau « jamais jouées »."); });
    card.appendChild(row);
    card.appendChild(mk("div", "setting-title v58-sub", "⭐ Thèmes"));
    var row2 = mk("div", "v58-row"); var save2 = mk("button", "btn btn-secondary v58-b", "💾 Enregistrer ma sélection"), load2 = mk("button", "btn btn-secondary v58-b", "⭐ Mes favoris"), inv = mk("button", "btn btn-secondary v58-b", "↔ Inverser");
    save2.type = load2.type = inv.type = "button"; save2.id = "v58FavSave"; load2.id = "v58FavLoad"; inv.id = "v58Invert";
    save2.addEventListener("click", function () {
      var on = themeInputs().filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      if (!on.length) { say("⚠️ Coche d’abord quelques thèmes à enregistrer."); return; }
      S.favs = V58.cleanFavs(on); save(K_FAV, S.favs); S.sig = ""; paint(); say("💾 " + S.favs.length + " thème(s) enregistré(s) en favoris.");
    });
    load2.addEventListener("click", function () {
      var valid = themeInputs().map(function (i) { return i.value; }), want = V58.cleanFavs(S.favs, valid);
      if (!want.length) { say("ℹ️ Pas encore de favoris : coche des thèmes puis « Enregistrer ma sélection »."); return; }
      var n = setThemes(want); setTimeout(function () { S.sig = ""; paint(); }, 120); say("⭐ " + n + " thème(s) favoris cochés.");
    });
    inv.addEventListener("click", function () {
      var all = themeInputs(), on = all.filter(function (i) { return i.checked; }).map(function (i) { return i.value; }), want = V58.invert(all.map(function (i) { return i.value; }), on);
      var n = setThemes(want); setTimeout(function () { S.sig = ""; paint(); }, 120); say("↔ Sélection inversée : " + n + " thème(s) coché(s).");
    });
    row2.appendChild(save2); row2.appendChild(load2); row2.appendChild(inv); card.appendChild(row2);
    var msg = mk("div", "v58-msg"); msg.id = "v58Msg"; msg.setAttribute("role", "status"); card.appendChild(msg);
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    S.sig = ""; paint();
    var tg = $("themeGrid"); if (tg) tg.addEventListener("click", function () { setTimeout(function () { S.sig = ""; paint(); }, 100); });
  }
  function tick() { try { remember(); mount(); paint(); } catch (e) {} }
  setInterval(tick, 1000); document.addEventListener("DOMContentLoaded", tick); tick();
  window.V58UI = { state: S, remember: remember, setThemes: setThemes, paint: paint, lastPick: function () { return lastPick; } };
})();
