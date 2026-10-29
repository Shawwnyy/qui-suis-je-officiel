/* =============================================================================
   🗳️ Sondage éclair : l'hôte pose une question à toute la salle, tout le monde vote, les résultats s'affichent en direct.
   - L'hôte (bouton 🗳️ dans la colonne de boutons) écrit une question et 2 à 4 choix, durée 15 / 30 / 60 s, puis lance.
   - Chaque joueur vote d'un clic (et peut changer d'avis jusqu'à la fin). Un vote = un joueur : l'identité vient de la connexion réseau.
   - Résultats anonymes (on voit les totaux, jamais qui a voté quoi), barres en direct, fermeture automatique à la fin du temps.
   - Un joueur qui arrive pendant un sondage le reçoit avec le temps restant.
   - Texte contrôlé par le filtre d'insultes ; tout ce qui est reçu est borné et affiché en textContent.
   La logique est testée dans tests/poll.test.js.
   ============================================================================= */
var V53Poll = (function () {
  "use strict";
  var MAX_Q = 100, MAX_OPT = 4, MIN_OPT = 2, MAX_LEN = 40, SECS = [15, 30, 60], MAX_COUNT = 9999;
  function str(x, n) { return typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : ""; }
  function int(x, lo, hi, def) { x = Math.round(Number(x)); if (!isFinite(x)) return def; return Math.max(lo, Math.min(hi, x)); }
  /* Brouillon de l'hôte : question de 3 à 100 caractères, 2 à 4 choix différents (≤ 40), durée parmi 15 / 30 / 60 s. bad(texte) → true si interdit */
  function cleanDraft(q, opts, secs, bad) {
    var qq = str(q, MAX_Q);
    if (qq.length < 3) return { ok: false, message: "Écris une question (3 caractères au moins)." };
    var seen = {}, list = [];
    (Array.isArray(opts) ? opts : []).forEach(function (o) { var t = str(o, MAX_LEN); if (!t) return; var k = t.toLowerCase(); if (seen[k]) return; seen[k] = true; list.push(t); });
    if (list.length < MIN_OPT) return { ok: false, message: "Il faut au moins 2 choix différents." };
    list = list.slice(0, MAX_OPT);
    if (bad && (bad(qq) || list.some(bad))) return { ok: false, message: "🚫 Le sondage contient un mot interdit." };
    var s = SECS.indexOf(Number(secs)) >= 0 ? Number(secs) : SECS[1];
    return { ok: true, q: qq, opts: list, secs: s };
  }
  /* Sondage reçu d'un autre appareil : jamais fait confiance */
  function sanitizeLaunch(ev) {
    if (!ev || ev.type !== "v53Poll" || !Array.isArray(ev.opts)) return null;
    var q = str(ev.q, MAX_Q), opts = ev.opts.slice(0, MAX_OPT).map(function (o) { return str(o, MAX_LEN); }).filter(Boolean);
    if (!q || opts.length < MIN_OPT) return null;
    return { type: "v53Poll", id: str(String(ev.id === undefined ? "" : ev.id), 40).replace(/[^\w-]/g, "") || "p", q: q, opts: opts, secs: int(ev.secs, 1, 60, 30) };
  }
  function sanitizeResult(ev, nOpts) {
    if (!ev || ev.type !== "v53Res" || !Array.isArray(ev.counts)) return null;
    var n = nOpts || ev.counts.length;
    if (ev.counts.length !== n || n < MIN_OPT || n > MAX_OPT) return null;
    var counts = ev.counts.map(function (c) { return int(c, 0, MAX_COUNT, 0); }), total = counts.reduce(function (a, b) { return a + b; }, 0);
    return { type: "v53Res", id: str(String(ev.id === undefined ? "" : ev.id), 40).replace(/[^\w-]/g, "") || "p", counts: counts, total: total, closed: ev.closed === true };
  }
  /* Pourcentages entiers dont la somme fait 100 (méthode du plus fort reste) ; 0 partout s'il n'y a aucun vote */
  function percents(counts) {
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return counts.map(function () { return 0; });
    var raw = counts.map(function (c) { return c * 100 / total; }), fl = raw.map(Math.floor), left = 100 - fl.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (r, i) { return { i: i, f: r - fl[i] }; }).sort(function (a, b) { return b.f - a.f || a.i - b.i; }).slice(0, left).forEach(function (o) { fl[o.i]++; });
    return fl;
  }
  /* Le sondage en cours côté hôte : un vote par joueur, modifiable tant que c'est ouvert */
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function create(id, draft, now) {
    var votes = Object.create(null), closed = false, endsAt = now + draft.secs * 1000;
    return {
      id: id, q: draft.q, opts: draft.opts.slice(), secs: draft.secs, endsAt: endsAt,
      isOpen: function (t) { return !closed && t < endsAt; },
      close: function () { closed = true; },
      vote: function (pid, idx, players, t) {
        if (closed || t >= endsAt) return { ok: false, why: "closed" };
        if (!has(players, pid)) return { ok: false, why: "unknown" };
        if (typeof idx !== "number" || idx !== Math.floor(idx) || idx < 0 || idx >= draft.opts.length) return { ok: false, why: "range" };
        var changed = has(votes, pid) && votes[pid] !== idx;
        votes[pid] = idx; return { ok: true, changed: changed };
      },
      counts: function (players) {
        var c = draft.opts.map(function () { return 0; });
        Object.keys(votes).forEach(function (pid) { if (has(players, pid)) c[votes[pid]]++; });   /* le vote d'un joueur parti ne compte plus */
        return c;
      },
      remaining: function (t) { return Math.max(0, Math.ceil((endsAt - t) / 1000)); }
    };
  }
  return { MAX_Q: MAX_Q, MAX_OPT: MAX_OPT, MAX_LEN: MAX_LEN, SECS: SECS, cleanDraft: cleanDraft, sanitizeLaunch: sanitizeLaunch, sanitizeResult: sanitizeResult, percents: percents, create: create, str: str };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V53Poll;

/* ---------- Branchement dans le jeu (navigateur seulement) ---------- */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof handleData !== "function" || typeof setupConnection !== "function") return;
  window.V53Poll = V53Poll;
  var cur = null,                 /* sondage en cours chez l'hôte */
      view = null,                /* sondage affiché chez moi : { id, q, opts, endsAt, counts, mine, closed } */
      hideT = 0, endT = 0, sendT = 0, lastLaunch = 0, seq = 0;
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function say(t) { try { showBanner(t); } catch (e) {} }
  function bad(t) {
    try { if (window.Moderation) { var v = window.Moderation.check(t); if (v && v.blocked) return true; } } catch (e) {}
    try { var c = profanityCheck(t); if (c && c.blocked) return true; } catch (e) {}
    return false;
  }
  function hostConn() { return Object.values(connections || {}).find(function (c) { return c && c.open; }) || null; }
  /* ----- Affichage du sondage (chez tout le monde) ----- */
  function hide() { clearTimeout(hideT); clearInterval(endT); hideT = 0; endT = 0; view = null; var n = $("v53Poll"); if (n && n.parentNode) n.parentNode.removeChild(n); }
  function paint() {
    if (!view) return;
    var root = $("v53Poll");
    if (!root) {
      root = mk("div", "v53-poll"); root.id = "v53Poll"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Sondage éclair");
      document.body.appendChild(root);
    }
    root.textContent = "";
    var x = mk("button", "v53-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fermer le sondage"); x.onclick = hide;
    root.appendChild(x);
    root.appendChild(mk("div", "v53-tag", "🗳️ Sondage éclair"));
    root.appendChild(mk("div", "v53-q", view.q));
    var open = !view.closed && Date.now() < view.endsAt, showRes = view.mine !== null || !open, pc = V53Poll.percents(view.counts), total = view.counts.reduce(function (a, b) { return a + b; }, 0);
    var list = mk("div", "v53-opts");
    view.opts.forEach(function (o, i) {
      var b = mk("button", "v53-opt" + (view.mine === i ? " mine" : "")); b.type = "button"; b.disabled = !open;
      b.setAttribute("aria-pressed", view.mine === i ? "true" : "false");
      if (showRes) { var bar = mk("i", "v53-bar"); bar.style.width = pc[i] + "%"; b.appendChild(bar); }
      b.appendChild(mk("span", "v53-label", (view.mine === i ? "✔ " : "") + o));
      if (showRes) b.appendChild(mk("span", "v53-pc", pc[i] + " % · " + view.counts[i]));
      b.onclick = function () { castVote(i); };
      list.appendChild(b);
    });
    root.appendChild(list);
    var secs = Math.max(0, Math.ceil((view.endsAt - Date.now()) / 1000));
    root.appendChild(mk("div", "v53-foot", open ? "⏱️ " + secs + " s · " + total + " vote" + (total > 1 ? "s" : "") + " · les votes sont anonymes" : "Sondage terminé · " + total + " vote" + (total > 1 ? "s" : "")));
    if (isHost && open) { var cl = mk("button", "v53-stop", "⏹️ Terminer maintenant"); cl.type = "button"; cl.onclick = function () { closePoll(); }; root.appendChild(cl); }
  }
  function startView(l, endsAt) {
    hide();
    view = { id: l.id, q: l.q, opts: l.opts, endsAt: endsAt, counts: l.opts.map(function () { return 0; }), mine: null, closed: false };
    paint();
    endT = setInterval(function () { if (!view) return; if (Date.now() >= view.endsAt + 800 && !view.closed) { view.closed = true; } paint(); if (view && view.closed) { clearInterval(endT); endT = 0; hideT = setTimeout(hide, 9000); } }, 1000);
  }
  function applyResult(r) {
    if (!view || r.id !== view.id || r.counts.length !== view.opts.length) return;
    view.counts = r.counts; if (r.closed) { view.closed = true; clearInterval(endT); endT = 0; clearTimeout(hideT); hideT = setTimeout(hide, 9000); }
    paint();
  }
  /* ----- Vote ----- */
  function castVote(i) {
    if (!view || view.closed || Date.now() >= view.endsAt) return;
    view.mine = i;
    if (isHost) { hostVote(myId, i); paint(); return; }
    var c = hostConn(); if (!c) { say("📡 Pas de connexion à l'hôte : vote non envoyé."); view.mine = null; return; }
    try { c.send({ type: "v53Vote", id: view.id, choice: i }); } catch (e) {}
    paint();
  }
  /* ----- Hôte ----- */
  function pushResults(closed) {
    if (!cur) return;
    var ev = { type: "v53Res", id: cur.id, counts: cur.counts(players), total: 0, closed: !!closed };
    ev.total = ev.counts.reduce(function (a, b) { return a + b; }, 0);
    try { broadcast(ev); } catch (e) {}
    applyResult({ type: "v53Res", id: cur.id, counts: ev.counts, total: ev.total, closed: !!closed });
  }
  function hostVote(pid, idx) {
    if (!isHost || !cur) return;
    var r = cur.vote(pid, idx, players, Date.now());
    if (!r.ok) return;
    if (!sendT) sendT = setTimeout(function () { sendT = 0; pushResults(false); }, 250);   /* au plus 4 envois par seconde, même avec beaucoup de votes */
  }
  function closePoll() { if (!isHost || !cur) return; var c = cur; c.close(); clearTimeout(sendT); sendT = 0; pushResults(true); cur = null; }
  function launch(q, opts, secs) {
    if (!isHost) return { ok: false, message: "Seul l'hôte peut lancer un sondage." };
    var now = Date.now(); if (now - lastLaunch < 3000) return { ok: false, message: "⏳ Patiente quelques secondes avant un nouveau sondage." };
    var d = V53Poll.cleanDraft(q, opts, secs, bad); if (!d.ok) return d;
    lastLaunch = now; clearTimeout(sendT); sendT = 0;
    cur = V53Poll.create("p" + now.toString(36) + (++seq), d, now);
    var ev = { type: "v53Poll", id: cur.id, q: cur.q, opts: cur.opts, secs: cur.secs };
    try { broadcast(ev); } catch (e) {}
    startView(ev, cur.endsAt);
    var mine = cur; setTimeout(function () { if (cur === mine) closePoll(); }, d.secs * 1000 + 300);
    return { ok: true };
  }
  /* ----- Panneau de l'hôte ----- */
  function compose() {
    var p = $("v53Compose"); if (p) { p.classList.toggle("open"); return; }
    p = mk("div", "v53-compose open"); p.id = "v53Compose"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Lancer un sondage éclair");
    var head = mk("div", "v53-chead"), x = mk("button", "v53-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fermer"); x.onclick = function () { p.classList.remove("open"); };
    head.appendChild(mk("b", "", "🗳️ Sondage éclair")); head.appendChild(x); p.appendChild(head);
    var q = mk("input"); q.id = "v53Q"; q.maxLength = V53Poll.MAX_Q; q.placeholder = "Ta question à toute la salle…"; q.setAttribute("aria-label", "Question du sondage"); p.appendChild(q);
    var opts = [];
    for (var i = 0; i < V53Poll.MAX_OPT; i++) { var o = mk("input"); o.maxLength = V53Poll.MAX_LEN; o.placeholder = "Choix " + (i + 1) + (i < 2 ? "" : " (facultatif)"); o.setAttribute("aria-label", "Choix " + (i + 1)); opts.push(o); p.appendChild(o); }
    var row = mk("div", "v53-crow"), sel = mk("select", "select"); sel.setAttribute("aria-label", "Durée du sondage");
    V53Poll.SECS.forEach(function (s) { var op = mk("option", "", s + " secondes"); op.value = String(s); sel.appendChild(op); }); sel.value = "30";
    var yn = mk("button", "v53-small", "👍 Oui / Non"); yn.type = "button"; yn.onclick = function () { opts[0].value = "Oui"; opts[1].value = "Non"; opts[2].value = ""; opts[3].value = ""; };
    row.appendChild(sel); row.appendChild(yn); p.appendChild(row);
    var warn = mk("div", "v53-warn"); warn.id = "v53Warn";
    var go = mk("button", "v53-go", "🚀 Lancer le sondage"); go.type = "button";
    go.onclick = function () {
      var r = launch(q.value, opts.map(function (e) { return e.value; }), Number(sel.value));
      if (!r.ok) { warn.textContent = r.message || "Sondage refusé."; return; }
      warn.textContent = ""; q.value = ""; opts.forEach(function (e) { e.value = ""; }); p.classList.remove("open");
    };
    p.appendChild(warn); p.appendChild(go); p.appendChild(mk("div", "v53-note", "Tout le monde peut voter une fois (et changer d'avis). Les résultats sont anonymes et en direct."));
    document.body.appendChild(p);
    try { q.focus({ preventScroll: true }); } catch (e) {}
  }
  window.openPollComposer = compose;
  function mountDock() {
    var dock = $("dock"); if (!dock) return;
    var b = $("dockPoll");
    if (!b) { b = mk("button", "", "🗳️"); b.id = "dockPoll"; b.type = "button"; b.title = "Lancer un sondage éclair"; b.setAttribute("aria-label", "Lancer un sondage éclair"); b.style.display = "none"; b.onclick = compose; dock.insertBefore(b, dock.firstChild); }
    b.style.display = isHost && roomCode ? "" : "none";
  }
  /* ----- Réseau ----- */
  var baseSetup = setupConnection;
  setupConnection = function (connection) {
    /* écouteur posé avant celui du jeu : le votant est celui de la connexion, jamais celui annoncé dans le message */
    try { connection.on("data", function (d) { if (isHost && d && typeof d === "object" && d.type === "v53Vote") d.playerId = String(connection.peer); }); } catch (e) {}
    return baseSetup.apply(this, arguments);
  };
  var baseHandle = handleData;
  handleData = function (data) {
    if (data && data.type === "v53Poll") { if (!isHost) { var l = V53Poll.sanitizeLaunch(data); if (l) startView(l, Date.now() + l.secs * 1000); } return; }
    if (data && data.type === "v53Res") { if (!isHost && view) { var r = V53Poll.sanitizeResult(data, view.opts.length); if (r) applyResult(r); } return; }
    if (data && data.type === "v53Vote") { if (isHost) hostVote(String(data.playerId || ""), data.choice); return; }
    var joined = isHost && data && data.type === "join" && data.player ? String(data.player.id || "") : "";
    var out = baseHandle.apply(this, arguments);
    if (joined && cur && players[joined] && cur.isOpen(Date.now())) {   /* arrivée pendant un sondage : on lui envoie avec le temps restant */
      try { sendTo(joined, { type: "v53Poll", id: cur.id, q: cur.q, opts: cur.opts, secs: Math.max(1, cur.remaining(Date.now())) }); sendTo(joined, { type: "v53Res", id: cur.id, counts: cur.counts(players), total: 0, closed: false }); } catch (e) {}
    }
    return out;
  };
  if (typeof resetConnection === "function") {
    var baseReset = resetConnection;
    resetConnection = function () { cur = null; clearTimeout(sendT); sendT = 0; hide(); var c = $("v53Compose"); if (c) c.classList.remove("open"); return baseReset.apply(this, arguments); };
  }
  setInterval(function () { try { mountDock(); } catch (e) {} }, 800);
  document.addEventListener("DOMContentLoaded", mountDock);
  window.V53PollUI = { launch: launch, close: closePoll, hide: hide, vote: castVote, state: function () { return view; }, host: function () { return cur; } };
})();
