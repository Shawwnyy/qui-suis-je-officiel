/* =============================================================================
   🏁 Classement à la moitié des questions
   À la moitié de la partie (après la question ⌈n/2⌉, dès 4 questions), le classement s'affiche à TOUS les joueurs :
   1er, 2e, 3e, 4e… avec médailles, barres de score et flèches ▲ ▼ (places gagnées ou perdues depuis la question précédente).
   Il s'intercale entre deux questions, comme la roue : l'hôte envoie l'évènement « v51Half », attend 7 secondes, puis lance la question suivante.
   L'hôte choisit dans le salon : « Affiché à tous » (par défaut) ou « Désactivé ».
   La logique (classement, moment, nettoyage des données reçues, enchaînement) est testée dans tests/half.test.js.
   ============================================================================= */
var V51Half = (function () {
  "use strict";
  var HALF_MS = 7000, MANUAL_MS = 10000, MIN_ROUNDS = 4, MAX_ROWS = 30, MAX_TEAMS = 8;
  function str(x, n) { return typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n) : ""; }
  function int(x, lo, hi, def) { x = Math.round(Number(x)); if (!isFinite(x)) return def; return Math.max(lo, Math.min(hi, x)); }
  function ordinal(r) { return r === 1 ? "1er" : r + "e"; }
  /* Moment : la moitié des questions, arrondie au-dessus ; pas avant MIN_ROUNDS questions */
  function half(total) { return Math.ceil(Number(total) / 2); }
  function due(index, total, on) { return !!on && Number(total) >= MIN_ROUNDS && Number(index) === half(total); }
  /* Classement des joueurs : score décroissant, égalités = même rang, ordre d'arrivée sinon */
  function board(players) {
    var list = Object.keys(players || {}).map(function (id, i) { var p = players[id] || {}; return { id: String(p.id || id), name: p.name, avatar: p.avatar, score: Number(p.score) || 0, i: i }; });
    list.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    return list.map(function (r, k) {
      var tie = k > 0 && list[k - 1].score === r.score;
      r.rank = tie ? list[k - 1].rank : k + 1;
      return r;
    }).map(function (r) { return { id: r.id, name: r.name, avatar: r.avatar, score: r.score, rank: r.rank, label: ordinal(r.rank) }; });
  }
  function ranksOf(rows) { var m = {}; rows.forEach(function (r) { m[r.id] = r.rank; }); return m; }
  function withMoves(rows, prev) {
    return rows.map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; o.move = prev && prev[r.id] !== undefined ? prev[r.id] - r.rank : null; return o; });
  }
  /* Évènement reçu d'un autre appareil : jamais fait confiance (taille, types, bornes) */
  function sanitize(ev) {
    if (!ev || ev.type !== "v51Half" || !Array.isArray(ev.rows)) return null;
    var rows = ev.rows.slice(0, MAX_ROWS).map(function (r) {
      r = r || {};
      var rank = int(r.rank, 1, 999, 1);
      return { id: str(String(r.id === undefined ? "" : r.id), 64), name: str(r.name, 40) || "Joueur", avatar: str(r.avatar, 12), score: int(r.score, 0, 100000000, 0), rank: rank, label: ordinal(rank),
        move: r.move === null || r.move === undefined ? null : int(r.move, -99, 99, 0) };
    });
    if (!rows.length) return null;
    var teams = Array.isArray(ev.teams) ? ev.teams.slice(0, MAX_TEAMS).map(function (t) {
      t = t || {}; var rk = int(t.rank, 1, 99, 1);
      return { name: str(t.name, 30) || "Équipe", score: int(t.score, 0, 1000000000, 0), count: int(t.count, 0, 99, 0), rank: rk, label: rk === 1 ? "1re" : rk + "e" };
    }) : [];
    return { type: "v51Half", id: int(ev.id, 0, 1e9, 0), round: int(ev.round, 1, 999, 1), total: int(ev.total, 1, 999, 1), rows: rows, teams: teams, manual: ev.manual === true };
  }
  /* Enchaînement côté hôte : à la moitié, on diffuse le classement puis on attend avant la question suivante.
     env : { isHost(), started(), players(), index(), total(), enabled(), broadcast(ev), show(ev), later(fn, ms), now }  */
  function host(env) {
    var seq = 0, shown = false, pending = false, token = 0, prev = {};
    function reset() { shown = false; pending = false; token++; prev = {}; }
    function wrap(base) {
      return function (first) {
        var self = this, args = arguments;
        if (!env.isHost()) return base.apply(self, args);
        if (first) { reset(); return base.apply(self, args); }
        if (!env.started()) return base.apply(self, args);
        if (pending) return;                                  /* appel en double pendant le classement : le bon appel part à la fin */
        var rows = board(env.players());
        if (!shown && due(env.index(), env.total(), env.enabled())) {
          shown = true; pending = true;
          var ev = { type: "v51Half", id: ++seq, round: env.index(), total: env.total(), rows: withMoves(rows, prev) }, my = ++token;
          if (env.teams) { var tm = env.teams(); if (tm && tm.length) ev.teams = tm; }
          prev = ranksOf(rows);
          try { env.broadcast(ev); } catch (e) {}
          try { env.show(ev); } catch (e) {}
          env.later(function () { if (my !== token) return; pending = false; if (!env.isHost() || !env.started()) return; base.apply(self, args); }, HALF_MS);
          return;
        }
        prev = ranksOf(rows);
        return base.apply(self, args);
      };
    }
    /* Bouton de l'hôte : classement du moment, à la demande, montré à tous sans toucher à l'enchaînement des questions */
    function manual() {
      if (!env.isHost() || !env.started()) return null;
      var rows = board(env.players()), ev = { type: "v51Half", id: ++seq, round: int(env.index(), 1, 999, 1), total: int(env.total(), 1, 999, 1), rows: withMoves(rows, prev), manual: true };
      if (env.teams) { var tm = env.teams(); if (tm && tm.length) ev.teams = tm; }
      try { env.broadcast(ev); } catch (e) {}
      try { env.show(ev); } catch (e) {}
      return ev;
    }
    return { wrap: wrap, reset: reset, manual: manual, state: function () { return { shown: shown, pending: pending }; } };
  }
  return { HALF_MS: HALF_MS, MANUAL_MS: MANUAL_MS, MIN_ROUNDS: MIN_ROUNDS, half: half, due: due, board: board, ranksOf: ranksOf, withMoves: withMoves, sanitize: sanitize, host: host, ordinal: ordinal };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V51Half;

/* ---------- Affichage et branchement dans le jeu (navigateur seulement) ---------- */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof sendNextQuestion !== "function" || typeof handleData !== "function") return;
  var KEY = "quizV51Half", mem = "on", hideTimer = 0;
  function $(id) { return document.getElementById(id); }
  function load() { try { var v = localStorage.getItem(KEY); return v === "off" ? "off" : "on"; } catch (e) { return mem; } }
  function save(v) { mem = v; try { localStorage.setItem(KEY, v); } catch (e) {} }
  function enabled() { return load() === "on"; }
  function pts(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " pts"; }
  function hide() {
    clearTimeout(hideTimer); hideTimer = 0;
    var n = $("v51Half"); if (n && n.parentNode) n.parentNode.removeChild(n);
  }
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function show(raw) {
    var ev = V51Half.sanitize(raw); if (!ev) return;
    hide();
    var ms = ev.manual ? V51Half.MANUAL_MS : V51Half.HALF_MS;
    var me = typeof myId !== "undefined" ? String(myId) : "", MEDAL = ["🥇 ", "🥈 ", "🥉 "], top = Math.max(1, ev.rows[0].score);
    var root = mk("div", "v51-half" + (ev.manual ? " v51-manual" : "")), card = mk("div", "v51-card"), x = mk("button", "v51-x", "✕");
    root.id = "v51Half"; root.setAttribute("role", "dialog"); root.setAttribute("aria-live", "polite"); root.setAttribute("aria-labelledby", "v51HalfT");
    x.type = "button"; x.setAttribute("aria-label", "Fermer le classement"); x.onclick = hide;
    var t = mk("div", "v51-title", ev.manual ? "🏁 Classement" : "🏁 Classement à la moitié"); t.id = "v51HalfT";
    card.appendChild(x); card.appendChild(t); card.appendChild(mk("div", "v51-sub", ev.manual ? "Question " + ev.round + " sur " + ev.total + " · scores du moment" : "Après la question " + ev.round + " sur " + ev.total));
    var ol = mk("ol", "v51-list"), shown = ev.rows.slice(0, 10);
    shown.forEach(function (r) {
      var li = mk("li", "v51-row" + (r.rank <= 3 ? " v51-top" + r.rank : "") + (me && r.id === me ? " v51-me" : ""));
      li.appendChild(mk("span", "v51-rank", (MEDAL[r.rank - 1] || "") + r.label));
      li.appendChild(mk("span", "v51-av", r.avatar || "🙂"));
      li.appendChild(mk("span", "v51-name", r.name + (me && r.id === me ? " (toi)" : "")));
      var bar = mk("span", "v51-bar"), fill = mk("i"); fill.style.width = Math.max(r.score > 0 ? 3 : 0, Math.round(100 * r.score / top)) + "%"; bar.appendChild(fill); li.appendChild(bar);
      li.appendChild(mk("span", "v51-pts", pts(r.score)));
      var mv = r.move === null ? "" : r.move > 0 ? "▲ " + r.move : r.move < 0 ? "▼ " + Math.abs(r.move) : "＝";
      li.appendChild(mk("span", "v51-mv" + (r.move > 0 ? " up" : r.move < 0 ? " down" : ""), mv));
      ol.appendChild(li);
    });
    card.appendChild(ol);
    if (ev.rows.length > shown.length) card.appendChild(mk("div", "v51-more", "… et " + (ev.rows.length - shown.length) + " autre" + (ev.rows.length - shown.length > 1 ? "s" : "") + " joueur" + (ev.rows.length - shown.length > 1 ? "s" : "")));
    if (ev.teams && ev.teams.length) {
      var myTeamName = ""; try { var mp = typeof players === "object" && players ? players[me] : null; myTeamName = mp && mp.team ? String(mp.team) : ""; } catch (e) {}
      card.appendChild(mk("div", "v51-teamhead", "👥 Équipes"));
      var tl = mk("ol", "v51-teams");
      ev.teams.forEach(function (tt) {
        var li = mk("li", "v51-trow" + (tt.rank === 1 ? " v51-tfirst" : "") + (myTeamName && tt.name === myTeamName ? " v51-me" : ""));
        li.appendChild(mk("span", "v51-rank", (MEDAL[tt.rank - 1] || "") + tt.label));
        li.appendChild(mk("span", "v51-name", tt.name + (myTeamName && tt.name === myTeamName ? " (ton équipe)" : "") + " · " + tt.count + " joueur" + (tt.count > 1 ? "s" : "")));
        li.appendChild(mk("span", "v51-pts", pts(tt.score)));
        tl.appendChild(li);
      });
      card.appendChild(tl);
    }
    var tm = mk("div", "v51-timer"), ti = mk("i"); ti.style.animationDuration = ms + "ms"; tm.appendChild(ti); card.appendChild(tm);
    root.appendChild(card); document.body.appendChild(root);
    hideTimer = setTimeout(hide, ms);
  }
  var ctl = V51Half.host({
    isHost: function () { return !!isHost; }, started: function () { return !!gameStarted; }, players: function () { return players; },
    index: function () { return currentQuestionIndex; }, total: function () { return totalRounds; }, enabled: enabled,
    broadcast: function (ev) { broadcast(ev); }, show: show,
    teams: function () { return window.V52Teams && window.v9GameMode === "teams" ? window.V52Teams.teamScores(players) : null; }, later: function (fn, ms) { setTimeout(fn, ms); }
  });
  sendNextQuestion = ctl.wrap(sendNextQuestion);
  var baseHandle = handleData;
  handleData = function (data) {
    if (data && data.type === "v51Half") { if (!isHost) show(data); return; }
    if (data && (data.type === "nextQuestion" || data.type === "gameStart" || data.type === "gameOver")) hide();
    return baseHandle.apply(this, arguments);
  };
  if (typeof finishGame === "function") { var baseFinish = finishGame; finishGame = function () { ctl.reset(); hide(); return baseFinish.apply(this, arguments); }; }
  if (typeof resetConnection === "function") { var baseReset = resetConnection; resetConnection = function () { ctl.reset(); hide(); return baseReset.apply(this, arguments); }; }
  /* Réglage dans le salon d'attente (hôte) */
  function mount() {
    var grid = document.querySelector("#hostSettings .settings-grid"); if (!grid || $("v51HalfMode")) return;
    var box = mk("div"), title = mk("div", "setting-title", "🏁 Classement à la moitié"), sel = mk("select", "select"), hint = mk("div", "v45-hint");
    sel.id = "v51HalfMode"; sel.setAttribute("aria-label", "Classement à la moitié des questions");
    [["on", "Affiché à tous (recommandé)"], ["off", "Désactivé"]].forEach(function (o) { var op = mk("option", "", o[1]); op.value = o[0]; sel.appendChild(op); });
    sel.value = load();
    function say() { hint.textContent = sel.value === "on" ? "À la moitié des questions (dès 4 questions), le classement 1er, 2e, 3e… s'affiche 7 secondes à tous les joueurs." : "Aucun classement n'est affiché pendant la partie."; }
    sel.addEventListener("change", function () { save(sel.value); say(); });
    say(); box.appendChild(title); box.appendChild(sel); box.appendChild(hint); grid.appendChild(box);
  }
  mount(); document.addEventListener("DOMContentLoaded", mount);
  window.V51HalfUI = { show: show, hide: hide, enabled: enabled, save: save, manual: function () { return ctl.manual(); } };
})();
