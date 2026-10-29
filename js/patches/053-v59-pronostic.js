/* =============================================================================
   V59 — 🔮 Pronostic de fin de partie et 🕳️ questions pièges.
   • Pronostic : juste avant la DERNIÈRE question, chaque joueur parie sur sa place finale au classement.
     Après la dernière question : place exacte → son score est multiplié par 2 ; sinon → divisé par 2 ; pas de pari → rien.
   • Question piège : de temps en temps (jamais les 2 premières ni la dernière, jamais deux de suite, plafonnée), la question
     est annoncée « piège » : bonne réponse = points ×5, mauvaise réponse = −300 pts.
   La logique est pure (V59Predict, testée par tests/predict.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V59Predict = (function () {
  "use strict";
  var TRAP_MULT = 5, TRAP_PENALTY = 300, TRAP_CHANCE = 0.16, MAX_SCORE = 9000000, WINDOW_SECS = 15, MAX_ROWS = 60;
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, " ").trim().slice(0, max); }
  function list(players) {
    var arr = players && typeof players === "object" ? (Array.isArray(players) ? players : Object.keys(players).map(function (k) { return players[k]; })) : [];
    return arr.filter(function (p) { return p && typeof p === "object" && p.id != null; });
  }
  /* classement « à la compétition » : les ex æquo partagent la meilleure place (100, 100, 80 → 1, 1, 3). Renvoie { id: place }. */
  function ranks(players) {
    var ps = list(players), out = Object.create(null);
    ps.forEach(function (p) { var s = num(p.score), better = 0; ps.forEach(function (q) { if (num(q.score) > s) better++; }); out[String(p.id)] = better + 1; });
    return out;
  }
  /* un pari est un entier de 1 à n ; tout le reste est ignoré */
  function cleanPick(v, n) {
    if (typeof v === "string") { if (!/^\s*\d{1,5}\s*$/.test(v)) return null; } else if (typeof v !== "number") return null;
    var k = Number(v); n = Math.floor(num(n));
    return Number.isInteger(k) && k >= 1 && k <= n ? k : null;
  }
  function canRun(opts, totalRounds, nPlayers) { return !!(opts && opts.predict) && Math.floor(num(totalRounds)) >= 3 && Math.floor(num(nPlayers)) >= 2; }
  /* règlement des paris : picks = { id: place } ; renvoie un résultat par pari, dans l'ordre des joueurs */
  function settle(players, picks) {
    var rk = ranks(players), res = [];
    list(players).forEach(function (p) {
      var id = String(p.id), pick = picks && Object.prototype.hasOwnProperty.call(picks, id) ? picks[id] : null;
      if (pick == null) return;
      var before = Math.max(0, Math.round(num(p.score))), rank = rk[id], ok = pick === rank;
      var after = ok ? Math.min(MAX_SCORE, before * 2) : Math.floor(before / 2);
      res.push({ id: id, name: str(p.name, 24), pick: pick, rank: rank, ok: ok, before: before, after: after });
    });
    return res;
  }
  /* résultat reçu par le réseau : borné et nettoyé */
  function sanitizeResult(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.results)) return null;
    var out = [];
    d.results.slice(0, MAX_ROWS).forEach(function (r) {
      if (!r || typeof r !== "object") return;
      var pick = Math.floor(num(r.pick)), rank = Math.floor(num(r.rank)), before = Math.max(0, Math.min(MAX_SCORE * 2, Math.round(num(r.before)))), after = Math.max(0, Math.min(MAX_SCORE, Math.round(num(r.after))));
      if (pick < 1 || pick > 99999 || rank < 1 || rank > 99999) return;
      out.push({ id: str(r.id, 64), name: str(r.name, 24), pick: pick, rank: rank, ok: r.ok === true, before: before, after: after });
    });
    return out;
  }
  function ordinal(n) { return n === 1 ? "1ʳᵉ" : n + "ᵉ"; }
  /* ---- question piège ---- */
  var FREQ = { rare: 0.08, normale: TRAP_CHANCE, frequente: 0.30 };
  function cleanFreq(v) { return v === "rare" || v === "frequente" ? v : "normale"; }
  function chanceOf(v) { return FREQ[cleanFreq(v)]; }
  function trapMax(total) { return Math.max(1, Math.floor(num(total) / 5)); }
  /* idx : numéro de la question (1 = première) ; count : pièges déjà tombés ; lastWasTrap ; rng() ∈ [0,1[ */
  function trapPlan(o) {
    o = o || {};
    if (!o.enabled || o.golden) return false;
    var idx = Math.floor(num(o.idx)), total = Math.floor(num(o.total));
    if (total < 4 || idx < 3 || idx >= total) return false;
    if (o.lastWasTrap || Math.floor(num(o.count)) >= trapMax(total)) return false;
    return num(typeof o.rng === "function" ? o.rng() : Math.random()) < chanceOf(o.freq);
  }
  function trapScore(pts) { return Math.round(num(pts) * TRAP_MULT); }
  function trapLoss(score) { return Math.min(Math.max(0, Math.round(num(score))), TRAP_PENALTY); }
  function cleanOpts(o) { o = o && typeof o === "object" && !Array.isArray(o) ? o : {}; return { trap: o.trap !== false, predict: o.predict !== false, freq: cleanFreq(o.freq) }; }
  var api = { TRAP_MULT: TRAP_MULT, TRAP_PENALTY: TRAP_PENALTY, TRAP_CHANCE: TRAP_CHANCE, WINDOW_SECS: WINDOW_SECS, MAX_ROWS: MAX_ROWS, ranks: ranks, cleanPick: cleanPick, canRun: canRun, settle: settle,
    sanitizeResult: sanitizeResult, ordinal: ordinal, trapMax: trapMax, FREQ: FREQ, cleanFreq: cleanFreq, chanceOf: chanceOf, trapPlan: trapPlan, trapScore: trapScore, trapLoss: trapLoss, cleanOpts: cleanOpts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function V59Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof sendNextQuestion !== "function" || typeof handleData !== "function" || typeof finishGame !== "function") return;
  var V = V59Predict; window.V59Predict = V;
  var KEY = "quizV59Opts", opts = V.cleanOpts(null);
  try { opts = V.cleanOpts(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) {}
  var S = { run: null, picks: Object.create(null), n: 0, id: 0, pending: false, token: 0, mine: null, traps: 0, lastTrap: false, settled: true, resTimer: 0 };
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function nfr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function saveOpts() { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch (e) {} }

  /* ---------- réglages de l'hôte : deux cases dans « Modes fun » ---------- */
  function mountOpts() {
    var g = $("optGolden"), box = g && g.closest("div"); if (!box || $("optTrap")) return;
    var anchor = $("optImpossible") ? $("optImpossible").closest("label") : g.closest("label");
    var html = '<br/><label><input id="optTrap" type="checkbox"/> 🕳️ Questions pièges (bonne réponse ×5, mauvaise −300 pts)</label>'
      + '<select id="optTrapFreq" class="select" aria-label="Fréquence des questions pièges" style="margin:4px 0 6px 34px;max-width:260px"><option value="rare">Pièges rares</option><option value="normale">Pièges normaux</option><option value="frequente">Pièges fréquents</option></select><br/>'
      + '<label><input id="optPredict" type="checkbox"/> 🔮 Pronostic avant la dernière question (place juste : score ×2, sinon ÷2)</label>';
    anchor.insertAdjacentHTML("afterend", html);
    var t = $("optTrap"), p = $("optPredict"), f = $("optTrapFreq"); t.checked = opts.trap; p.checked = opts.predict; f.value = opts.freq;
    f.addEventListener("change", function () { opts.freq = V.cleanFreq(f.value); saveOpts(); });
    t.addEventListener("change", function () { opts.trap = t.checked; saveOpts(); });
    p.addEventListener("change", function () { opts.predict = p.checked; saveOpts(); });
  }
  function readOpts() { var t = $("optTrap"), p = $("optPredict"), f = $("optTrapFreq"); if (t) opts.trap = t.checked; if (p) opts.predict = p.checked; if (f) opts.freq = V.cleanFreq(f.value); }

  /* ---------- 🕳️ question piège ---------- */
  var baseMods = withFxMods;
  withFxMods = function (q) {
    var idx = (typeof currentQuestionIndex !== "undefined" ? currentQuestionIndex : 0) + 1;
    if (idx === 1) { readOpts(); S.traps = 0; S.lastTrap = false; }
    var out = baseMods.apply(this, arguments);
    var trap = false;
    try { trap = V.trapPlan({ enabled: opts.trap, freq: opts.freq, golden: !!(out && out.golden), idx: idx, total: typeof totalRounds === "number" ? totalRounds : 0, count: S.traps, lastWasTrap: S.lastTrap }); } catch (e) {}
    if (out && typeof out === "object") out.trap = trap;
    if (trap) S.traps++; S.lastTrap = trap;
    return out;
  };
  var baseScore = applyScoreFx;
  applyScoreFx = function (p, pts, data) {
    var trap = typeof currentQuestion !== "undefined" && currentQuestion && currentQuestion.trap === true;
    return baseScore.call(this, p, trap ? V.trapScore(pts) : pts, data);
  };
  var baseWrong = onWrongFx;
  onWrongFx = function (p) {
    try {
      if (typeof currentQuestion !== "undefined" && currentQuestion && currentQuestion.trap === true && p) {
        var l = V.trapLoss(p.score); p.score = Math.max(0, (Number(p.score) || 0) - l); p.malusPoints = (p.malusPoints || 0) + l;
      }
    } catch (e) {}
    return baseWrong.apply(this, arguments);
  };
  var baseDisplay = displayQuestion;
  displayQuestion = function (question) {
    document.body.classList.remove("v59-trap");
    var r = baseDisplay.apply(this, arguments);
    try {
      if (question && question.trap === true) {
        document.body.classList.add("v59-trap");
        if (typeof showBanner === "function") showBanner("🕳️ QUESTION PIÈGE : ×5 si tu as juste, −" + V.TRAP_PENALTY + " pts si tu te trompes !");
      }
      if (S.mine) showChip();
    } catch (e) {}
    return r;
  };

  /* écran plein vert / rouge (V50Flash) pour le résultat d'une question piège */
  function flash(f) { try { if (window.V50Flash && typeof window.V50Flash.show === "function") window.V50Flash.show(f); } catch (e) {} }
  if (typeof showQuestionResult === "function") {
    var baseResult = showQuestionResult;
    showQuestionResult = function (data) {
      try { return baseResult.apply(this, arguments); }
      finally {
        try {
          if (currentQuestion && currentQuestion.trap === true && data && typeof data.correct === "number") {
            var good = typeof myAnswerForQuestion !== "undefined" && myAnswerForQuestion === data.correct;
            flash(good ? { kind: "good", title: "PIÈGE DÉJOUÉ !", emoji: "🕳️", sub: "Bonne réponse : tes points comptent ×5 !" }
                       : { kind: "bad", title: "PIÈGE !", emoji: "🕳️", sub: "Mauvaise réponse : −" + V.TRAP_PENALTY + " pts" });
          }
        } catch (e) {}
      }
    };
  }

  /* ---------- 🔮 fenêtre de pari (hôte et invités) ---------- */
  function hideOverlay() { var o = $("v59Overlay"); if (o) o.remove(); clearInterval(S.tick); }
  function showChip() {
    var c = $("v59Chip");
    if (!S.mine) { if (c) c.remove(); return; }
    if (!c) { c = mk("div", "v59-chip"); c.id = "v59Chip"; document.body.appendChild(c); }
    c.textContent = "🔮 Ton pari : " + V.ordinal(S.mine) + " place";
  }
  function overlay(title, sub) {
    hideOverlay();
    var o = mk("div", "v59-overlay"); o.id = "v59Overlay"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", title);
    var box = mk("div", "v59-box"); box.appendChild(mk("div", "v59-emoji", "🔮")); box.appendChild(mk("h2", "v59-title", title)); if (sub) box.appendChild(mk("p", "v59-sub", sub));
    o.appendChild(box); document.body.appendChild(o); return box;
  }
  function showBet(n, secs) {
    var box = overlay("Pronostic : quelle sera ta place finale ?", "Avant la dernière question. Place exacte : ton score ×2. Sinon : ton score ÷2. Tu peux aussi ne pas parier.");
    var me = typeof players !== "undefined" && players[myId];
    if (me) {
      var rk = V.ranks(players)[String(myId)];
      box.appendChild(mk("p", "v59-now", "Aujourd’hui : " + V.ordinal(rk) + " avec " + nfr(Number(me.score) || 0) + " pts"));
    }
    var grid = mk("div", "v59-ranks"); grid.id = "v59Ranks";
    function pick(k) { choose(k); box.querySelectorAll(".v59-r").forEach(function (b) { b.classList.toggle("on", Number(b.getAttribute("data-k")) === k); }); var m = $("v59Done"); if (m) m.textContent = "✅ Pari enregistré : " + V.ordinal(k) + " place."; }
    if (n <= 16) {
      for (var k = 1; k <= n; k++) { (function (kk) { var b = mk("button", "v59-r", String(kk)); b.type = "button"; b.setAttribute("data-k", String(kk)); b.setAttribute("aria-label", V.ordinal(kk) + " place"); b.addEventListener("click", function () { pick(kk); }); grid.appendChild(b); })(k); }
    } else {
      var inp = mk("input", "v59-in"); inp.type = "number"; inp.min = "1"; inp.max = String(n); inp.id = "v59Num"; inp.placeholder = "1 à " + n; inp.setAttribute("aria-label", "Ta place finale");
      var ok = mk("button", "v59-r wide", "Valider"); ok.type = "button"; ok.addEventListener("click", function () { var k = V.cleanPick(inp.value, n); if (k) pick(k); else { var m = $("v59Done"); if (m) m.textContent = "⚠️ Entre un nombre de 1 à " + n + "."; } });
      grid.appendChild(inp); grid.appendChild(ok);
    }
    box.appendChild(grid);
    var done = mk("p", "v59-done"); done.id = "v59Done"; done.setAttribute("role", "status"); box.appendChild(done);
    var skip = mk("button", "btn btn-secondary v59-skip", "Je ne parie pas"); skip.type = "button"; skip.addEventListener("click", function () { choose(null); hideOverlay(); }); box.appendChild(skip);
    var bar = mk("div", "v59-bar"), fill = mk("i"); bar.appendChild(fill); box.appendChild(bar);
    var end = Date.now() + secs * 1000, total = secs * 1000;
    clearInterval(S.tick);
    S.tick = setInterval(function () { var left = end - Date.now(); fill.style.width = Math.max(0, 100 * left / total) + "%"; if (left <= 0) { clearInterval(S.tick); hideOverlay(); } }, 100);
  }
  function choose(k) {
    S.mine = k == null ? null : k; showChip();
    if (k == null) return;
    if (isHost) hostPick(String(myId), k);
    else { var c = Object.values(connections)[0]; if (c && c.open) { try { c.send({ type: "v59Pick", id: S.id, playerId: myId, pick: k }); } catch (e) {} } }
  }

  /* ---------- hôte : collecte des paris ---------- */
  function connectedCount() { var n = 0; Object.keys(players).forEach(function (k) { var c = connections[k]; if (String(k) === String(myId) || (c && c.open)) n++; }); return n; }
  function hostPick(id, k) {
    if (!isHost || !S.run || !players[id]) return;
    var v = V.cleanPick(k, S.n); if (v == null) return;
    S.picks[id] = v;
    if (Object.keys(S.picks).length >= connectedCount()) endWindow();
  }
  function endWindow() {
    if (!S.run) return; var go = S.run; S.run = null; clearTimeout(S.winTimer);
    try { broadcast({ type: "v59Close", id: S.id }); } catch (e) {}
    hideOverlay(); S.pending = false; S.settled = false; showChip();
    go();
  }
  var baseNext = sendNextQuestion;
  sendNextQuestion = function (first) {
    if (isHost && first) { S.picks = Object.create(null); S.mine = null; S.settled = true; S.pending = false; S.run = null; showChip(); readOpts(); }
    if (!isHost || first || !gameStarted) return baseNext.apply(this, arguments);
    if (S.pending) return;                                          /* appel en double pendant la fenêtre de pari */
    var last = typeof usedQuestions !== "undefined" && Array.isArray(usedQuestions) && currentQuestionIndex === usedQuestions.length - 1;
    var n = Object.keys(players).length;
    if (last && S.settled && V.canRun({ predict: opts.predict }, usedQuestions.length, n)) {
      var self = this, args = arguments;
      S.id++; S.n = n; S.picks = Object.create(null); S.mine = null; S.pending = true; S.settled = false;
      S.run = function () { baseNext.apply(self, args); };
      try { broadcast({ type: "v59Predict", id: S.id, n: n, secs: V.WINDOW_SECS }); } catch (e) {}
      showBet(n, V.WINDOW_SECS);
      S.winTimer = setTimeout(endWindow, V.WINDOW_SECS * 1000 + 400);
      return;
    }
    return baseNext.apply(this, arguments);
  };

  /* ---------- hôte : règlement après la dernière question ---------- */
  var baseFinish = finishGame;
  finishGame = function () {
    var self = this, args = arguments;
    if (!isHost || S.settled || !Object.keys(S.picks).length || S.resTimer) { return baseFinish.apply(this, args); }
    S.settled = true;
    var res = V.settle(players, S.picks);
    res.forEach(function (r) {
      var p = players[r.id]; if (!p) return;
      var d = r.after - r.before;
      p.score = r.after;
      if (d > 0) p.bonusPoints = (p.bonusPoints || 0) + d; else if (d < 0) p.malusPoints = (p.malusPoints || 0) - d;
    });
    S.picks = Object.create(null);
    if (!res.length) return baseFinish.apply(this, args);
    try { broadcast({ type: "v59Result", id: S.id, results: res }); } catch (e) {}
    showResult(res);
    S.resTimer = setTimeout(function () { S.resTimer = 0; hideOverlay(); S.mine = null; showChip(); baseFinish.apply(self, args); }, 8000);
  };
  function showResult(res) {
    var okN = res.filter(function (r) { return r.ok; }).length;
    var box = overlay("Résultat des pronostics", okN ? okN + " bon" + (okN > 1 ? "s" : "") + " pari" + (okN > 1 ? "s" : "") + " sur " + res.length + " : score ×2 pour eux, ÷2 pour les autres." : "Personne n’a trouvé sa place : tous les scores sont divisés par 2.");
    var rows = res.slice().sort(function (a, b) { return (b.ok - a.ok) || (b.after - a.after); });
    var mine = rows.filter(function (r) { return String(r.id) === String(myId); })[0];
    var shown = (mine ? [mine] : []).concat(rows.filter(function (r) { return r !== mine; })).slice(0, 12);
    var tbl = mk("div", "v59-table");
    shown.forEach(function (r) {
      var line = mk("div", "v59-row " + (r.ok ? "ok" : "ko") + (r === mine ? " me" : ""));
      line.appendChild(mk("span", "v59-who", (r.ok ? "✅ " : "❌ ") + r.name));
      line.appendChild(mk("span", "v59-bet", "pari " + V.ordinal(r.pick) + " · réel " + V.ordinal(r.rank)));
      line.appendChild(mk("span", "v59-pts", nfr(r.before) + " → " + nfr(r.after)));
      tbl.appendChild(line);
    });
    box.appendChild(tbl);
    if (mine) flash(mine.ok ? { kind: "good", title: "PRONOSTIC JUSTE !", emoji: "🔮", sub: "Ton score ×2 : " + nfr(mine.before) + " → " + nfr(mine.after) }
                            : { kind: "bad", title: "PRONOSTIC RATÉ", emoji: "🔮", sub: "Ton score ÷2 : " + nfr(mine.before) + " → " + nfr(mine.after) });
    if (res.length > shown.length) box.appendChild(mk("p", "v59-sub", "… et " + (res.length - shown.length) + " autre(s) pari(s)."));
  }

  /* ---------- réseau ---------- */
  var baseSetup = setupConnection;
  setupConnection = function (connection) {
    try { connection.on("data", function (d) { if (isHost && d && typeof d === "object" && d.type === "v59Pick") d.playerId = String(connection.peer); }); } catch (e) {}
    return baseSetup.apply(this, arguments);
  };
  var baseHandle = handleData;
  handleData = function (data) {
    var t = data && typeof data === "object" ? data.type : "";
    if (t === "v59Predict") { if (!isHost) { var n = Math.floor(Number(data.n)); if (n >= 2 && n <= 99999) { S.id = Number(data.id) || 0; S.mine = null; showChip(); showBet(n, Math.max(5, Math.min(60, Math.floor(Number(data.secs)) || V.WINDOW_SECS))); } } return; }
    if (t === "v59Close") { if (!isHost) hideOverlay(); return; }
    if (t === "v59Pick") { if (isHost && Number(data.id) === S.id) hostPick(String(data.playerId || ""), data.pick); return; }
    if (t === "v59Result") {
      if (!isHost) {
        var res = V.sanitizeResult(data);
        if (res && res.length) {
          res.forEach(function (r) { if (players[r.id]) players[r.id].score = r.after; });
          try { if (typeof updateMyScore === "function") updateMyScore(); } catch (e) {}
          showResult(res);
          setTimeout(function () { hideOverlay(); S.mine = null; showChip(); }, 8500);
        }
      }
      return;
    }
    return baseHandle.apply(this, arguments);
  };
  if (typeof resetConnection === "function") {
    var baseReset = resetConnection;
    resetConnection = function () { clearTimeout(S.winTimer); clearTimeout(S.resTimer); S.resTimer = 0; S.run = null; S.pending = false; S.settled = true; S.picks = Object.create(null); S.mine = null; hideOverlay(); showChip(); return baseReset.apply(this, arguments); };
  }
  setInterval(function () { try { mountOpts(); } catch (e) {} }, 1000); document.addEventListener("DOMContentLoaded", mountOpts);
  window.V59UI = { state: S, opts: function () { return opts; }, showBet: showBet, showResult: showResult, hide: hideOverlay };
})();
