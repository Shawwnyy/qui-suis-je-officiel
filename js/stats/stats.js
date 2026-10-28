/* =============================================================================
   V40 — Statistiques et graphiques de la partie

   • L'hôte note, pour chaque question, ce que chaque joueur a répondu (bonne / mauvaise / pas de réponse, temps,
     score cumulé) et les infractions anti-triche. Il envoie ce journal aux joueurs (« v40Entry » à chaque question,
     « v40Final » à la fin) : tout le monde voit les mêmes graphiques, même un joueur exclu pour triche.
   • Tout ce qui arrive du réseau passe par V40Analysis.normalize() avant d'être utilisé.
   • Les 12 dernières parties sont gardées dans le navigateur (localStorage « quizV40History »).
   • Tableau de bord : fenêtre plein écran à onglets, ouverte depuis l'écran de résultats, le bouton 📊 de la barre
     latérale ou l'accueil.
   ============================================================================= */
(function V40StatsModule() {
  "use strict";
  if (typeof window === "undefined" || typeof handleData !== "function" || !window.V40Analysis || !window.V40Charts) return;
  var A = window.V40Analysis, K = window.V40Charts, el = K.el, fmt = K.fmt;
  function $(id) { return document.getElementById(id); }
  var HKEY = "quizV40History", MAX_PLAYERS_PLOTTED = K.C.palette.length;

  var live = null;           /* journal de la partie en cours, ou de la dernière partie */
  var liveDone = false;      /* la partie est terminée */
  var finalFor = "";         /* identifiant de la partie déjà envoyée / enregistrée */
  var buf = {};              /* hôte : réponses de la question en cours */
  var seenEv = {};           /* hôte : évènements bonus / malus déjà notés */
  var history = loadHistory();
  var view = { tab: "overview", src: "live", hidden: new Set(), textSrc: "all", common: false, allLetters: true, alpha: false, nWords: 15 };
  var chatAcc = A.newChat();   /* comptages du chat avant le début d'une partie (jamais le texte des messages) */

  /* ===================================================================== Historique */
  function loadHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(HKEY) || "[]");
      return (Array.isArray(raw) ? raw : []).map(A.normalize).filter(Boolean).slice(0, 12);
    } catch (e) { return []; }
  }
  function saveHistory(log) {
    if (!log || !log.R.length) return;
    history = A.addToHistory(history, log, 12, 1200000);
    try { localStorage.setItem(HKEY, JSON.stringify(history)); }
    catch (e) {                                   /* quota plein : on garde moins de parties */
      while (history.length > 1) { history.pop(); try { localStorage.setItem(HKEY, JSON.stringify(history)); return; } catch (e2) {} }
    }
  }

  /* ===================================================================== Capture (hôte) */
  function addPlayer(log, p) {
    for (var k = 0; k < log.P.length; k++) if (log.P[k].i === p.id) return k;
    log.P.push({ i: String(p.id), n: String(p.name || "Joueur").slice(0, 40), a: String(p.avatar || "").slice(0, 12), h: p.host ? 1 : 0, x: 0 });
    log.R.forEach(function (R) { R.r.push([0, 0, 0]); });
    return log.P.length - 1;
  }
  function beginLog() {
    buf = {}; liveDone = false; seenEv = {};
    live = { v: 1, id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(),
      qt: Number(questionTime) || 0, mode: String(window.v9GameMode || ""), P: [], R: [], C: [], B: [], Ch: chatAcc };
    chatAcc = A.newChat();
    Object.keys(players).forEach(function (id) { addPlayer(live, players[id]); });
    refreshEntryPoints();
    broadcast({ type: "v40Entry", kind: "begin", head: { id: live.id, at: live.at, qt: live.qt, mode: live.mode, P: live.P } });
  }
  function clampSeconds(t) {
    var qt = Number(questionTime) || 0, left = Number(t);
    if (!isFinite(left)) return 0;
    return Math.max(0, Math.min(qt || 600, Math.round((qt - left) * 10) / 10));
  }
  function recordRound() {
    if (!live) return;
    var qi = currentQuestionIndex;
    if (typeof qi !== "number" || qi < 0 || live.R[qi]) return;
    while (live.R.length < qi) live.R.push({ q: "", c: "", d: "moyen", m: 0, r: live.P.map(function () { return [0, 0, 0]; }) });
    var before = live.P.length;
    Object.keys(players).forEach(function (id) { addPlayer(live, players[id]); });
    var grew = live.P.length > before;
    var q = currentQuestion || {}, gone = [];
    var entry = { q: String(q.question || "").slice(0, 160), c: String(q.category || "").slice(0, 60), d: q.difficulty || "moyen", m: q.media ? 1 : 0, r: [] };
    live.P.forEach(function (P, k) {
      var p = players[P.i];
      if (!p) { entry.r.push([0, 0, 0]); if (!P.x) { P.x = 1; gone.push(k); } return; }
      var b = buf[P.i];
      entry.r.push([b ? b.st : 3, b && b.st !== 3 ? b.t : 0, Math.round(p.score || 0)]);
    });
    live.R[qi] = A.normalizeRound(entry, live.P.length);
    buf = {};
    broadcast({ type: "v40Entry", kind: "round", id: live.id, n: qi, e: live.R[qi], gone: gone, P: grew ? live.P : undefined });
    refreshOpen();
  }
  /* Met à jour les scores de la dernière question terminée (bonus / malus choisis ensuite). */
  function syncScores() {
    if (!live || !live.R.length) return;
    var last = live.R[live.R.length - 1];
    live.P.forEach(function (P, k) { var p = players[P.i]; if (p && last.r[k] && last.r[k][0] !== 0) last.r[k][2] = Math.round(p.score || 0); });
  }

  /* Le lancement passe par des fonctions mémorisées par d'anciens correctifs (js/patches/031-v32-stable-script.js appelle
     sendNextQuestion « à l'ancienne ») : on surveille donc les messages envoyés plutôt que cette fonction. */
  var baseBroadcast = broadcast;
  broadcast = function (data) {
    if (isHost && data && typeof data === "object") {
      if (data.type === "gameStart") { try { beginLog(); } catch (e) { if (window.console) console.error("V40Stats", e); } }
      else if (data.type === "nextQuestion") { try { buf = {}; syncScores(); } catch (e) {} }
      else if (data.type === "v35Event") { try { notePower(data); } catch (e) {} }
    }
    return baseBroadcast.apply(this, arguments);
  };
  var baseAnswer = handlePlayerAnswer;
  handlePlayerAnswer = function (data) {
    if (!isHost || !live || !data) return baseAnswer.apply(this, arguments);
    var id = data.playerId, noted = false;
    try {
      /* À noter AVANT l'appel : la dernière réponse d'une question termine la question (et enregistre la manche)
         à l'intérieur même de handlePlayerAnswer. Même règle de correction que le jeu : réponse === bonne réponse. */
      var st = $("gameStatus");
      if (players[id] && !answersReceived.has(id) && !(st && st.dataset.finished === "1")) {
        var timeout = data.answer === -1, good = !timeout && currentQuestion && data.answer === currentQuestion.correct;
        buf[id] = { st: timeout ? 3 : (good ? 1 : 2), t: timeout ? 0 : clampSeconds(data.time) };
        noted = true;
      }
    } catch (e) {}
    var r = baseAnswer.apply(this, arguments);
    if (noted && !answersReceived.has(id)) delete buf[id];          /* réponse refusée par le jeu : on l'oublie */
    return r;
  };
  var baseResult = sendQuestionResult;
  sendQuestionResult = function () {
    var st = $("gameStatus"), already = !!(st && st.dataset.finished === "1");
    var r = baseResult.apply(this, arguments);
    if (isHost && !already) { try { recordRound(); } catch (e) {} }
    return r;
  };
  var baseFinish = finishGame;
  finishGame = function () {
    var r = baseFinish.apply(this, arguments);
    if (isHost && live && finalFor !== live.id) {
      try {
        syncScores(); liveDone = true; finalFor = live.id;
        var nc = A.normalizeChat(live.Ch); if (nc) live.Ch = nc; else delete live.Ch;
        saveHistory(live);
        broadcast({ type: "v40Final", log: live });
        refreshEntryPoints(); refreshOpen();
      } catch (e) {}
    }
    return r;
  };

  /* Appelé par l'anti-triche (js/patches/039-v40-anti-triche.js), côté hôte. */
  function noteCheat(c) {
    if (!isHost || !live || !c) return;
    var k = -1;
    live.P.forEach(function (P, i) { if (P.i === c.id) k = i; });
    if (k < 0) return;
    var lvl = c.level === "kick" ? 3 : c.level === "malus" ? 2 : 1;
    live.C.push([k, Math.max(1, Math.min(99, Number(c.count) || 1)), lvl, Math.max(1, Number(c.round) || (live.R.length + 1))]);
    if (lvl === 3) live.P[k].x = 1;
    broadcast({ type: "v40Entry", kind: "cheats", id: live.id, C: live.C });
    refreshOpen();
  }

  /* Bonus / malus choisis après une question (évènement « v35Event » diffusé par l'hôte). */
  function notePower(ev) {
    if (!isHost || !live || !ev || (ev.choice !== "bonus" && ev.choice !== "malus")) return;
    var key = String(ev.id == null ? "" : ev.id);
    if (key) { if (seenEv[key]) return; seenEv[key] = 1; }
    var gi = -1, ti = -1;
    live.P.forEach(function (P, i) { if (P.i === String(ev.giverId)) gi = i; if (ev.targetId != null && P.i === String(ev.targetId)) ti = i; });
    if (gi < 0 || live.B.length >= A.MAX_POWERS) return;
    var ch = ev.choice === "malus" ? 2 : 1, kind = String(ev.kind || "").replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 16) || "x";
    var lab = A.powerName([0, 0, 0, ch, kind, 0, 0, ""]) === kind ? String(ev.label || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[+\u2212-]?\d+/g, "").trim().slice(0, 30) : "";
    live.B.push([Math.max(1, live.R.length), gi, ch === 2 ? ti : -1, ch, kind, Math.max(0, Math.round(Number(ev.amount) || 0)), (ev.blocked ? 1 : 0) | (ev.reflected ? 2 : 0), lab]);
    broadcast({ type: "v40Entry", kind: "powers", id: live.id, B: live.B });
    refreshOpen();
  }

  /* 🎡 Roue des bonus / malus : un résultat par joueur (hôte). Le malus de la roue touche le joueur lui-même. */
  function noteWheel(ev) {
    if (!isHost || !live || !ev || !Array.isArray(ev.results)) return;
    var key = "w" + String(ev.id == null ? "" : ev.id) + ":" + live.id;
    if (seenEv[key]) return; seenEv[key] = 1;
    var added = 0;
    ev.results.slice(0, 60).forEach(function (r) {
      if (!r || live.B.length >= A.MAX_POWERS) return;
      var pi = -1; live.P.forEach(function (P, i) { if (P.i === String(r.id)) pi = i; });
      if (pi < 0) return;
      var ch = r.ch === "malus" ? 2 : 1, kind = "w_" + String(r.kind || "x").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      live.B.push([Math.max(1, live.R.length), pi, ch === 2 ? pi : -1, ch, kind, Math.max(0, Math.round(Number(r.amount) || 0)), r.blocked ? 1 : 0, ""]); added++;
    });
    if (!added) return;
    broadcast({ type: "v40Entry", kind: "powers", id: live.id, B: live.B });
    refreshOpen();
  }

  /* ===================================================================== Réception (joueurs) */
  function onEntry(d) {
    if (isHost || !d) return;
    if (d.kind === "begin" && d.head) {
      var head = A.normalize({ id: d.head.id, at: d.head.at, qt: d.head.qt, mode: d.head.mode, P: d.head.P, R: [], C: [] });
      if (head) { live = head; liveDone = false; live.Ch = chatAcc; chatAcc = A.newChat(); }
    } else if (d.kind === "round" && live && live.id === d.id && typeof d.n === "number" && d.n >= 0 && d.n < A.MAX_ROUNDS) {
      var np = live.P.length;
      if (Array.isArray(d.P) && d.P.length > np && d.P.length <= A.MAX_PLAYERS) {            /* joueurs ajoutés en cours de route */
        var more = A.normalize({ P: d.P, R: [], C: [] });
        if (more) { live.P = more.P; live.R.forEach(function (R) { while (R.r.length < live.P.length) R.r.push([0, 0, 0]); }); np = live.P.length; }
      }
      while (live.R.length < d.n) live.R.push(A.normalizeRound({ r: [] }, np));          /* manche perdue : case vide, remplacée par v40Final */
      live.R[d.n] = A.normalizeRound(d.e, np);
      (Array.isArray(d.gone) ? d.gone : []).forEach(function (k) { if (live.P[k]) live.P[k].x = 1; });
    } else if (d.kind === "powers" && live && live.id === d.id) {
      var tb = A.normalize({ P: live.P, R: [], B: d.B });
      if (tb) live.B = tb.B;
    } else if (d.kind === "cheats" && live && live.id === d.id) {
      var tmp = A.normalize({ P: live.P, R: [], C: d.C });
      if (tmp) live.C = tmp.C;
    } else return;
    refreshEntryPoints(); refreshOpen();
  }
  function onFinal(d) {
    if (isHost || !d) return;
    var log = A.normalize(d.log);
    if (!log) return;
    live = log; liveDone = true;
    if (finalFor !== log.id) { finalFor = log.id; saveHistory(log); }
    refreshEntryPoints(); refreshOpen();
  }
  /* Lettres et mots écrits dans le chat : seulement des comptages, pris sur les messages déjà filtrés par la modération. */
  if (typeof addChatMessage === "function") {
    var baseChat = addChatMessage;
    addChatMessage = function (m) {
      try {
        if (m && typeof m.text === "string" && !(typeof isOneLetterMsg === "function" && isOneLetterMsg(m.text))) {
          var acc = live && !liveDone ? (live.Ch || (live.Ch = A.newChat())) : chatAcc;
          if (Array.isArray(acc.w)) acc = chatAcc;
          A.addChat(acc, m.text);
        }
      } catch (e) {}
      return baseChat.apply(this, arguments);
    };
  }
  var baseHandle = handleData;
  handleData = function (data) {
    if (data && !isHost) {
      if (data.type === "v40Entry") { try { onEntry(data); } catch (e) {} return; }
      if (data.type === "v40Final") { try { onFinal(data); } catch (e) {} return; }
    }
    return baseHandle(data);
  };

  /* ===================================================================== Tableau de bord */
  var root = null, lastFocus = null;
  function currentLog() {
    if (view.src !== "live") { var g = history.filter(function (x) { return x.id === view.src; })[0]; if (g) return g; }
    return live || history[0] || null;
  }
  function dateLabel(ts) {
    if (!ts) return "date inconnue";
    try { return new Date(ts).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }
  function label(p) { return p.name + (p.id && typeof myId !== "undefined" && p.id === myId ? " (toi)" : ""); }
  function plotted(rows) { return rows.filter(function (r) { return r.idx < MAX_PLAYERS_PLOTTED; }); }
  function colorFor(idx) { return K.colorOf(idx) || K.C.muted; }

  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = el("div", { id: "v40Stats", role: "dialog", "aria-modal": "true", "aria-labelledby": "v40sTitle", "aria-hidden": "true" });
    document.body.appendChild(root);
    root.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.stopPropagation(); close(); return; }
      if (ev.key !== "Tab") return;
      var f = [].slice.call(root.querySelectorAll('button:not([disabled]),select,[tabindex="0"],a[href]')).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    return root;
  }
  function open(tab) {
    ensureRoot();
    if (tab) view.tab = tab;
    if (view.src !== "live" && !history.some(function (g) { return g.id === view.src; })) view.src = "live";
    lastFocus = document.activeElement;
    root.classList.add("show"); root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("v40s-lock");
    render();
    var c = $("v40sClose"); if (c) c.focus();
  }
  function close() {
    if (!root) return;
    K.hideTip();
    root.classList.remove("show"); root.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("v40s-lock");
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }
  function isOpen() { return !!(root && root.classList.contains("show")); }
  var refreshTimer = 0;
  function refreshOpen() {
    if (!isOpen()) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { if (isOpen()) render(true); }, 120);
  }

  var TABS = [["overview", "Vue d’ensemble"], ["players", "Joueurs"], ["questions", "Questions"], ["detail", "Détail"], ["advanced", "Analyses"], ["text", "✍️ Mots & lettres"], ["powers", "Bonus / Malus"], ["cheat", "Triche"], ["history", "Historique"]];

  function render(keepScroll) {
    var log = currentLog();
    var scroller = root.querySelector(".v40s-scroll"), top = scroller ? scroller.scrollTop : 0;
    while (root.firstChild) root.removeChild(root.firstChild);
    var wrap = el("div", { "class": "v40s-wrap" });
    /* ---- en-tête ---- */
    var sel = el("select", { id: "v40sSrc", "aria-label": "Partie à afficher" });
    var opts = [];
    if (live) opts.push(["live", (liveDone ? "Dernière partie" : "Partie en cours") + " · " + dateLabel(live.at)]);
    history.forEach(function (g) { if (!live || g.id !== live.id) opts.push([g.id, dateLabel(g.at) + " · " + g.P.length + " joueur" + (g.P.length > 1 ? "s" : "")]); });
    opts.forEach(function (o) { var op = el("option", { value: o[0], text: o[1] }); if (o[0] === view.src) op.selected = true; sel.appendChild(op); });
    if (!opts.length) sel.disabled = true;
    sel.addEventListener("change", function () { view.src = sel.value; view.hidden = new Set(); render(); });
    var csvBtn = el("button", { type: "button", "class": "v40s-btn", text: "⬇️ CSV", title: "Télécharger toutes les réponses (tableur)", onclick: function () { exportCSV(); } });
    if (!log || !log.R.length) csvBtn.disabled = true;
    var pdfBtn = el("button", { type: "button", id: "v40sPdf", "class": "v40s-btn", text: "📄 PDF clair", title: "Télécharger tous les tableaux et graphiques en PDF, fond blanc (idéal à imprimer)", onclick: function () { exportPDF("light"); } });
    if (!log || !log.R.length) pdfBtn.disabled = true;
    var pdfDark = el("button", { type: "button", id: "v40sPdfDark", "class": "v40s-btn", text: "🌙 PDF sombre", title: "Télécharger tous les tableaux et graphiques en PDF, fond sombre (idéal à l’écran)", onclick: function () { exportPDF("dark"); } });
    if (!log || !log.R.length) pdfDark.disabled = true;
    var closeBtn = el("button", { type: "button", id: "v40sClose", "class": "v40s-btn close", "aria-label": "Fermer les statistiques", text: "✕", onclick: close });
    wrap.appendChild(el("div", { "class": "v40s-top" }, [el("h2", { id: "v40sTitle", text: "📊 Statistiques" }), el("div", { "class": "v40s-actions" }, [sel, pdfBtn, pdfDark, csvBtn, closeBtn])]));
    /* ---- onglets ---- */
    var tabs = el("div", { "class": "v40s-tabs", role: "tablist" });
    TABS.forEach(function (t) {
      var b = el("button", { type: "button", role: "tab", "aria-selected": String(view.tab === t[0]), "class": view.tab === t[0] ? "on" : "", text: t[1], onclick: function () { view.tab = t[0]; render(); } });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    var scroll = el("div", { "class": "v40s-scroll", role: "tabpanel" });
    var main = el("div", { "class": "v40s-main" });
    scroll.appendChild(main);
    try {
      if (view.tab === "history") buildHistory(main);
      else if (!log || !log.R.length) main.appendChild(emptyState(log));
      else {
        if (!liveDone && log === live) main.appendChild(el("p", { "class": "v40s-note", text: "⏳ Partie en cours : les chiffres sont à jour jusqu’à la dernière question terminée (" + log.R.length + (typeof totalRounds === "number" && totalRounds ? "/" + totalRounds : "") + ")." }));
        var fn = { overview: buildOverview, players: buildPlayers, questions: buildQuestions, detail: buildDetail, advanced: buildAdvanced, text: buildTextTab, powers: buildPowers, cheat: buildCheat }[view.tab] || buildOverview;
        fn(main, log);
      }
    } catch (e) {
      main.appendChild(el("p", { "class": "v40s-note err", text: "Impossible d’afficher ce graphique : " + (e && e.message ? e.message : "erreur inconnue") }));
      if (window.console) console.error("V40Stats", e);
    }
    wrap.appendChild(scroll);
    root.appendChild(wrap);
    [].forEach.call(root.querySelectorAll(".v40s-card"), function (c) { if (c.__redraw) { try { c.__redraw(); } catch (e) { if (window.console) console.error("V40Stats", e); } } });   /* dessiné une fois dans le DOM : largeur réelle connue */
    if (keepScroll) scroll.scrollTop = top;
  }
  function emptyState(log) {
    return el("div", { "class": "v40s-empty" }, [
      el("div", { "class": "big", text: "📊" }),
      el("h3", { text: log ? "Pas encore de question terminée" : "Aucune partie à afficher" }),
      el("p", { text: log ? "Les graphiques apparaissent dès la fin de la première question." : "Joue une partie : les graphiques se remplissent question après question et les 12 dernières parties restent dans l’onglet Historique." })
    ]);
  }
  function exportPDF(theme) {
    var log = currentLog(); if (!log || !log.R.length) return;
    try {
      if (!window.V40Pdf) throw new Error("module PDF absent");
      window.V40Pdf.download(log, { theme: theme === "dark" ? "dark" : "light" });
    } catch (e) {
      if (window.console) console.error("V40Stats PDF", e);
      try { if (typeof window.v34Toast === "function") window.v34Toast("Export PDF impossible : " + (e && e.message ? e.message : "erreur")); } catch (e2) {}
    }
  }
  function exportCSV() {
    var log = currentLog(); if (!log || !log.R.length) return;
    try {
      var blob = new Blob(["﻿" + A.toCSV(log)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "qui-suis-je-" + new Date(log.at || Date.now()).toISOString().slice(0, 10) + ".csv" });
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) {}
  }

  /* ---------- briques ---------- */
  function tile(value, name, sub) {
    return el("div", { "class": "v40s-tile" }, [el("div", { "class": "v", text: value }), el("div", { "class": "n", text: name }), sub ? el("div", { "class": "s", text: sub }) : null]);
  }
  function overflowNote(rows) {
    return rows.length > MAX_PLAYERS_PLOTTED ? el("p", { "class": "v40s-note", text: "Les courbes montrent les " + MAX_PLAYERS_PLOTTED + " premiers joueurs arrivés ; les " + (rows.length - MAX_PLAYERS_PLOTTED) + " autres figurent dans les tableaux." }) : null;
  }
  function playerLegend(rows, redraw) {
    var items = plotted(rows).map(function (r) { return { key: String(r.idx), name: label(r), color: colorFor(r.idx) }; });
    if (items.length < 2) return null;
    return K.legend(items, view.hidden, function (key) {
      if (view.hidden.has(key)) view.hidden.delete(key);
      else if (items.length - view.hidden.size > 1) view.hidden.add(key);       /* au moins une série reste visible */
      redraw();
    });
  }

  /* ---------- Vue d'ensemble ---------- */
  function buildOverview(main, log) {
    var t = A.totals(log), rows = A.perPlayer(log), best = rows.slice().sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; })[0];
    main.appendChild(el("div", { "class": "v40s-tiles" }, [
      tile(String(t.players), "Joueurs"), tile(String(t.rounds), "Questions jouées"),
      tile(fmt.pct(t.accuracy), "Réussite globale", t.correct + " bonnes sur " + t.answers + " réponses"),
      tile(fmt.sec(t.avgTime), "Temps moyen", "pour répondre"),
      tile(best ? fmt.int(best.final) + " pts" : "—", "Meilleur score", best ? best.name : ""),
      tile(String(t.cheats), "Infractions", t.cheats ? "voir l’onglet Triche" : "aucune")
    ]));
    var hl = A.highlights(log), HT = {
      streak: function (h) { return tile(h.row.bestStreak + " d’affilée", "Plus longue série", h.name); },
      fastest: function (h) { return tile(fmt.sec(h.row.fastest), "Réponse la plus rapide", h.name); },
      gain: function (h) { return tile("+" + fmt.int(h.row.bestGain), "Plus gros gain en une question", h.name); },
      accuracy: function (h) { return tile(fmt.pct(h.row.accuracy), "Meilleure réussite", h.name + " · " + h.row.correct + "/" + h.row.answered); }
    };
    if (hl.length) main.appendChild(el("div", { "class": "v40s-tiles v40s-highlights", "aria-label": "Faits marquants" }, hl.map(function (h) { return HT[h.key](h); })));
    var series = A.scoreSeries(log).filter(function (s) { return s.idx < MAX_PLAYERS_PLOTTED; }).map(function (s) {
      return { key: String(s.idx), name: label(rows[s.idx]), color: colorFor(s.idx), values: s.values };
    });
    main.appendChild(K.card({
      title: "Évolution des scores", desc: "Score cumulé de chaque joueur après chaque question. Survole ou touche le graphique pour comparer.",
      legend: function (redraw) { return playerLegend(rows, redraw); },
      draw: function (host) {
        K.line(host, { n: log.R.length, series: series, hidden: view.hidden, xTitle: "Questions", endLabels: true, ariaLabel: "Évolution des scores de " + rows.map(function (r) { return r.name; }).join(", "),
          yFmt: function (v) { return fmt.int(v); },
          header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Question " + i, sub: log.R[i - 1].q ? K.cut(log.R[i - 1].q, 80) : "" }; },
          valueText: function (s, i) { var v = s.values[i], pv = i > 0 ? s.values[i - 1] : 0; var d = (v !== null && pv !== null && i > 0) ? v - pv : null; return fmt.int(v) + " pts" + (d ? " (" + (d > 0 ? "+" : "−") + fmt.int(Math.abs(d)) + ")" : ""); } });
        var n = overflowNote(rows); if (n) host.appendChild(n);
      },
      table: function () {
        var hdr = ["Question"].concat(rows.map(label));
        var body = [];
        for (var i = 0; i <= log.R.length; i++) body.push([i === 0 ? "Départ" : i].concat(A.scoreSeries(log).map(function (s) { return s.values[i] === null ? "—" : fmt.int(s.values[i]); })));
        return K.table(hdr, body, "Score cumulé après chaque question");
      }
    }));
    var ranked = rows.slice().sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; });
    main.appendChild(K.card({
      title: (liveDone || log !== live) ? "Classement final" : "Classement actuel", desc: "Score de chaque joueur.",
      draw: function (host) {
        K.hbars(host, { rows: ranked.map(function (r) {
          return { label: label(r), avatar: r.avatar, value: Math.max(0, r.final), color: colorFor(r.idx), text: fmt.int(r.final),
            tip: { title: label(r), sub: "Rang " + r.rank, rows: [{ label: "Score", value: fmt.int(r.final) + " pts", strong: true }, { label: "Bonnes réponses", value: r.correct + " / " + r.answered }, { label: "Plus gros gain", value: "+" + fmt.int(r.bestGain) }, { label: "Infractions", value: r.cheats }] } };
        }), max: Math.max.apply(null, ranked.map(function (r) { return r.final; }).concat([1])), ariaLabel: "Classement final" });
      },
      table: function () {
        return K.table(["Rang", "Joueur", "Score", "Bonnes", "Mauvaises", "Sans réponse", "Plus gros gain", "Infractions"],
          ranked.map(function (r) { return [r.rank, label(r) + (r.left ? " (sorti)" : ""), fmt.int(r.final), r.correct, r.wrong, r.none, "+" + fmt.int(r.bestGain), r.cheats]; }), "Classement final");
      }
    }));
  }

  /* ---------- Joueurs ---------- */
  function buildPlayers(main, log) {
    var rows = A.perPlayer(log).sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; });
    var S = K.STATE;
    main.appendChild(K.card({
      title: "Bonnes et mauvaises réponses", desc: "Pour chaque joueur : réponses justes, fausses et questions sans réponse.",
      legend: function () { return K.legend([1, 2, 3].map(function (s) { return { key: String(s), name: S[s].name, color: S[s].color, glyph: S[s].glyph }; }), null, null); },
      draw: function (host) {
        K.stack(host, { rows: rows.map(function (r) {
          return { label: label(r), avatar: r.avatar, total: r.answered, parts: [
            { name: S[1].name, glyph: S[1].glyph, value: r.correct, color: S[1].color }, { name: S[2].name, glyph: S[2].glyph, value: r.wrong, color: S[2].color }, { name: S[3].name, glyph: S[3].glyph, value: r.none, color: S[3].color }] };
        }), ariaLabel: "Bonnes et mauvaises réponses par joueur" });
      },
      table: function () { return K.table(["Joueur", "✓ Bonnes", "✗ Mauvaises", "⏱ Sans réponse", "Réussite"], rows.map(function (r) { return [label(r), r.correct, r.wrong, r.none, fmt.pct(r.accuracy)]; }), "Réponses par joueur"); }
    }));
    var timed = rows.filter(function (r) { return r.avgTime !== null; }).sort(function (a, b) { return a.avgTime - b.avgTime; });
    main.appendChild(K.card({
      title: "Temps de réponse moyen", desc: "Temps moyen pour répondre (les questions sans réponse ne comptent pas). Plus court = plus rapide.",
      draw: function (host) {
        if (!timed.length) { host.appendChild(el("p", { "class": "v40s-note", text: "Aucune réponse chronométrée pour l’instant." })); return; }
        K.hbars(host, { rows: timed.map(function (r) { return { label: label(r), avatar: r.avatar, value: r.avgTime, color: colorFor(r.idx), text: fmt.sec(r.avgTime),
          tip: { title: label(r), rows: [{ label: "Temps moyen", value: fmt.sec(r.avgTime), strong: true }, { label: "Réponses chronométrées", value: r.correct + r.wrong }] } }; }),
          max: Math.max(log.qt || 0, Math.max.apply(null, timed.map(function (r) { return r.avgTime; }))), ariaLabel: "Temps de réponse moyen par joueur" });
      },
      table: function () { return K.table(["Joueur", "Temps moyen"], timed.map(function (r) { return [label(r), fmt.sec(r.avgTime)]; }), "Temps de réponse moyen"); }
    }));
    var streaks = rows.slice().sort(function (a, b) { return b.bestStreak - a.bestStreak || a.idx - b.idx; });
    main.appendChild(K.card({
      title: "Meilleure série de bonnes réponses", desc: "Le plus grand nombre de bonnes réponses d’affilée pour chaque joueur.",
      draw: function (host) {
        K.hbars(host, { rows: streaks.map(function (r) { return { label: label(r), avatar: r.avatar, value: r.bestStreak, color: colorFor(r.idx), text: r.bestStreak + " d’affilée",
          tip: { title: label(r), rows: [{ label: "Meilleure série", value: r.bestStreak + " bonne" + (r.bestStreak > 1 ? "s" : "") + " d’affilée", strong: true }, { label: "Bonnes réponses", value: r.correct + " / " + r.answered }] } }; }),
          max: Math.max.apply(null, streaks.map(function (r) { return r.bestStreak; }).concat([1])), ariaLabel: "Meilleure série de bonnes réponses par joueur" });
      },
      table: function () { return K.table(["Joueur", "Meilleure série", "Bonnes réponses"], streaks.map(function (r) { return [label(r), r.bestStreak, r.correct + " / " + r.answered]; }), "Meilleure série de bonnes réponses"); }
    }));
    var quick = rows.filter(function (r) { return r.fastest !== null; }).sort(function (a, b) { return a.fastest - b.fastest || a.idx - b.idx; });
    main.appendChild(K.card({
      title: "Réponse correcte la plus rapide", desc: "Le meilleur temps de chaque joueur sur une bonne réponse. Plus court = plus rapide.",
      draw: function (host) {
        if (!quick.length) { host.appendChild(el("p", { "class": "v40s-note", text: "Aucune bonne réponse chronométrée pour l’instant." })); return; }
        K.hbars(host, { rows: quick.map(function (r) { return { label: label(r), avatar: r.avatar, value: r.fastest, color: colorFor(r.idx), text: fmt.sec(r.fastest),
          tip: { title: label(r), rows: [{ label: "Meilleur temps", value: fmt.sec(r.fastest), strong: true }, { label: "Temps moyen", value: fmt.sec(r.avgTime) }] } }; }),
          max: Math.max(log.qt || 0, Math.max.apply(null, quick.map(function (r) { return r.fastest; }))), ariaLabel: "Réponse correcte la plus rapide par joueur" });
      },
      table: function () { return K.table(["Joueur", "Meilleur temps", "Temps moyen"], quick.map(function (r) { return [label(r), fmt.sec(r.fastest), fmt.sec(r.avgTime)]; }), "Réponse correcte la plus rapide"); }
    }));
    var gains = rows.slice().sort(function (a, b) { return b.bestGain - a.bestGain; });
    main.appendChild(K.card({
      title: "Plus gros gain en une question", desc: "Le meilleur coup de chaque joueur (combos, vitesse et bonus inclus).",
      draw: function (host) {
        K.hbars(host, { rows: gains.map(function (r) { return { label: label(r), avatar: r.avatar, value: Math.max(0, r.bestGain), color: colorFor(r.idx), text: "+" + fmt.int(r.bestGain),
          tip: { title: label(r), rows: [{ label: "Meilleur gain", value: "+" + fmt.int(r.bestGain) + " pts", strong: true }] } }; }), ariaLabel: "Plus gros gain par joueur" });
      },
      table: function () { return K.table(["Joueur", "Plus gros gain"], gains.map(function (r) { return [label(r), "+" + fmt.int(r.bestGain)]; }), "Plus gros gain en une question"); }
    }));
  }

  /* ---------- Questions ---------- */
  function rateRows(groups, tipWord) {
    return groups.map(function (g) {
      return { label: g.label, value: g.rate || 0, color: K.C.palette[0], text: fmt.pct(g.rate),
        tip: { title: g.label, rows: [{ label: "Réussite", value: fmt.pct(g.rate), strong: true }, { label: "Bonnes réponses", value: g.correct + " / " + g.answers }, { label: tipWord || "Questions", value: g.questions }] } };
    });
  }
  function rateCard(title, desc, groups) {
    return K.card({
      title: title, desc: desc,
      draw: function (host) { K.hbars(host, { rows: rateRows(groups), max: 1, ariaLabel: title }); },
      table: function () { return K.table(["Groupe", "Réussite", "Bonnes / réponses", "Questions"], groups.map(function (g) { return [g.label, fmt.pct(g.rate), g.correct + " / " + g.answers, g.questions]; }), title); }
    });
  }
  function rankedList(title, desc, list, hardest) {
    return K.card({
      title: title, desc: desc,
      draw: function (host) {
        var ul = el("ol", { "class": "v40s-rank" });
        list.forEach(function (r) {
          ul.appendChild(el("li", null, [
            el("span", { "class": "pct", text: fmt.pct(r.rate) }),
            el("span", { "class": "txt" }, [el("b", { text: "Question " + r.round }), " — " + K.cut(r.q || "(sans texte)", 140), el("small", { text: (r.c ? r.c + " · " : "") + r.d + (r.m ? " · image/vidéo" : "") + " · " + r.correct + "/" + r.answers + " bonnes" })]),
            el("span", { "class": "bar" }, [el("i", { style: "width:" + Math.round(r.rate * 100) + "%" })])
          ]));
        });
        host.appendChild(ul);
      },
      table: function () { return K.table(["Question", "Texte", "Thème", "Difficulté", "Réussite"], list.map(function (r) { return [r.round, r.q, r.c, r.d, fmt.pct(r.rate)]; }), title); }
    });
  }
  function buildQuestions(main, log) {
    var stats = A.roundStats(log);
    var many = stats.length > 40;
    main.appendChild(K.card({
      title: "Réussite question par question", desc: "Part des joueurs qui ont trouvé la bonne réponse. Survole une question pour lire son texte.",
      draw: function (host) {
        var tip = function (i) { var r = stats[i]; return { title: "Question " + r.round, sub: K.cut(r.q, 90), rows: [{ label: "Réussite", value: fmt.pct(r.rate), strong: true }, { label: "Bonnes réponses", value: r.correct + " / " + r.answers }, { label: "Temps moyen", value: fmt.sec(r.avgTime) }, { label: "Difficulté", value: r.d }] }; };
        if (!many) K.columns(host, { values: stats.map(function (r) { return r.rate; }), labels: stats.map(function (r) { return String(r.round); }), tipFor: tip, ariaLabel: "Réussite par question" });
        else K.line(host, { n: stats.length, series: [{ key: "r", name: "Réussite", color: K.C.palette[0], values: [null].concat(stats.map(function (r) { return r.rate === null ? null : r.rate * 100; })) }],
          yMax: 100, yFmt: function (v) { return Math.round(v) + " %"; }, xTitle: "Questions", ariaLabel: "Réussite par question",
          header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Question " + i, sub: K.cut(stats[i - 1].q, 90) }; }, valueText: function (s, i) { return Math.round(s.values[i]) + " %"; } });
      },
      table: function () { return K.table(["Question", "Texte", "Réussite", "Bonnes / réponses", "Temps moyen"], stats.map(function (r) { return [r.round, K.cut(r.q, 70), fmt.pct(r.rate), r.correct + " / " + r.answers, fmt.sec(r.avgTime)]; }), "Réussite par question"); }
    }));
    var hist = A.timeHistogram(log);
    if (hist.n) main.appendChild(K.card({
      title: "Répartition des temps de réponse", desc: "Combien de réponses (justes et fausses) arrivent dans chaque tranche de temps.",
      legend: function () { return K.legend([1, 2].map(function (st) { return { key: String(st), name: K.STATE[st].name, color: K.STATE[st].color, glyph: K.STATE[st].glyph }; }), null, null); },
      draw: function (host) {
        K.stack(host, { unit: "réponse", rows: hist.buckets.map(function (b) {
          return { label: b.label, total: b.correct + b.wrong, parts: [
            { name: K.STATE[1].name, glyph: K.STATE[1].glyph, value: b.correct, color: K.STATE[1].color }, { name: K.STATE[2].name, glyph: K.STATE[2].glyph, value: b.wrong, color: K.STATE[2].color }] };
        }), ariaLabel: "Répartition des temps de réponse" });
      },
      table: function () { return K.table(["Temps", "✓ Bonnes", "✗ Mauvaises", "Total"], hist.buckets.map(function (b) { return [b.label, b.correct, b.wrong, b.correct + b.wrong]; }), "Répartition des temps de réponse"); }
    }));
    main.appendChild(rateCard("Réussite par thème", "Les thèmes les mieux et les moins bien maîtrisés par le groupe.", A.byCategory(log)));
    main.appendChild(rateCard("Réussite par difficulté", "Plus la question est difficile, plus la réussite devrait baisser.", A.byDifficulty(log)));
    var media = A.byMedia(log);
    if (media.length > 1) main.appendChild(rateCard("Questions avec image ou vidéo", "Les médias aident-ils à trouver la réponse ?", media));
    main.appendChild(rankedList("Les 5 questions les plus difficiles", "Celles qui ont fait le plus d’erreurs.", A.hardest(log, 5), true));
    main.appendChild(rankedList("Les 5 questions les plus faciles", "Celles que presque tout le monde a trouvées.", A.easiest(log, 5), false));
  }

  /* ---------- Détail (joueur × question) ---------- */
  function buildDetail(main, log) {
    var rows = A.perPlayer(log), S = K.STATE;
    var sec = el("section", { "class": "v40s-card" }, [
      el("div", { "class": "v40s-cardhead" }, [el("div", null, [el("h3", { text: "Qui a répondu quoi ?" }), el("p", { text: "Une ligne par joueur, une colonne par question. Survole ou touche une case pour voir le détail." })])]),
      el("div", { "class": "v40s-legendhost" }, [K.legend([1, 2, 3].map(function (s) { return { key: String(s), name: S[s].name, color: S[s].color, glyph: S[s].glyph }; }), null, null)])
    ]);
    var host = el("div", { "class": "v40s-body" });
    sec.appendChild(host);
    K.matrix(host, { players: rows.map(function (r) { return { name: label(r), avatar: r.avatar, color: colorFor(r.idx) }; }),
      rounds: log.R.map(function (R, i) { return { label: String(i + 1), q: R.q }; }),
      cell: function (pi, ri) { var e = log.R[ri].r[pi]; return { state: e[0], seconds: e[1], score: fmt.int(e[2]) }; } });
    main.appendChild(sec);
  }

  /* ---------- Triche ---------- */
  var LV = { 1: "⚠️ Avertissement", 2: "🚨 Malus", 3: "🚫 Exclusion" };
  /* ---------- Bonus / Malus ---------- */
  function keyNote(items, extra) {
    var p = el("p", { "class": "v40s-note v40s-key" });
    items.forEach(function (it) {
      var sw = el("span", { "aria-hidden": "true" }); sw.style.cssText = "display:inline-block;width:12px;height:12px;border-radius:3px;margin:0 6px -1px 0;background:" + it[1];
      var item = el("span", null, [sw, document.createTextNode(it[0])]); item.style.marginRight = "16px"; p.appendChild(item);
    });
    if (extra) p.appendChild(document.createTextNode(extra));
    return p;
  }
  function buildPowers(main, log) {
    var P = A.powers(log), rows = P.players, BON = K.C.palette[2], MAL = K.C.palette[1], BLK = K.C.palette[0];
    if (!P.total) {
      main.appendChild(el("div", { "class": "v40s-empty" }, [el("div", { "class": "big", text: "🎁" }), el("h3", { text: "Aucun bonus ni malus pour l’instant" }), el("p", { text: "Un pouvoir se gagne en enchaînant les bonnes réponses : bonus pour soi, malus pour un adversaire." })]));
      return;
    }
    var pctB = P.malus ? Math.round(P.blocked / P.malus * 100) : 0;
    main.appendChild(el("div", { "class": "v40s-tiles" }, [
      tile(String(P.total - P.wheel.spins), "Pouvoirs utilisés", log.R.length + " question" + (log.R.length > 1 ? "s" : "")), tile(String(P.bonus), "🎁 Bonus", "pour soi"), tile(String(P.malus), "💥 Malus", "contre un adversaire"),
      tile(P.malus ? pctB + " %" : "—", "Malus bloqués", P.blocked + " bloqué" + (P.blocked > 1 ? "s" : "") + (P.reflected ? " dont " + P.reflected + " renvoyé" + (P.reflected > 1 ? "s" : "") : "")),
      tile(fmt.int(P.points), "Points déplacés", "bonus, vols, pénalités" + (P.wheel.spins ? " et roue" : ""))
    ].concat(P.wheel.spins ? [tile(String(P.wheel.spins), "🎡 Tirages de la roue", P.wheel.bonus + " bonus · " + P.wheel.malus + " malus")] : [])));
    function top(key) { var b = null; rows.forEach(function (r) { if (r[key] > 0 && (!b || r[key] > b[key])) b = r; }); return b; }
    var hl = [], g;
    if ((g = top("bonusGiven"))) hl.push(tile(g.bonusGiven + " bonus", "Le plus généreux", g.name));
    if ((g = top("malusGiven"))) hl.push(tile(g.malusGiven + " malus", "Le plus offensif", g.name));
    if ((g = top("malusReceived"))) hl.push(tile(g.malusReceived + " visé" + (g.malusReceived > 1 ? "s" : ""), "Cible n° 1", g.name));
    if ((g = top("shieldSaves"))) hl.push(tile(g.shieldSaves + " bloqué" + (g.shieldSaves > 1 ? "s" : ""), "Le meilleur rempart", g.name));
    if ((g = top("net")) ) hl.push(tile((g.net > 0 ? "+" : "") + fmt.int(g.net) + " pts", "Meilleur bilan", g.name));
    if (hl.length) main.appendChild(el("div", { "class": "v40s-tiles v40s-highlights", "aria-label": "Faits marquants des pouvoirs" }, hl));

    var launched = rows.filter(function (r) { return r.bonusGiven + r.malusGiven > 0; }).sort(function (a, b) { return (b.bonusGiven + b.malusGiven) - (a.bonusGiven + a.malusGiven) || a.idx - b.idx; });
    if (launched.length) main.appendChild(K.card({
      title: "Pouvoirs lancés par joueur", desc: "Bonus (pour soi) et malus (contre un adversaire) de chaque joueur.",
      draw: function (host) {
        K.stack(host, { unit: "pouvoir", ariaLabel: "Bonus et malus lancés par joueur", rows: launched.map(function (r) {
          return { label: label(r), avatar: r.avatar, total: r.bonusGiven + r.malusGiven, parts: [{ name: "Bonus", glyph: "🎁", value: r.bonusGiven, color: BON }, { name: "Malus", glyph: "💥", value: r.malusGiven, color: MAL }] };
        }) });
        host.appendChild(keyNote([["🎁 Bonus", BON], ["💥 Malus", MAL]]));
      },
      table: function () { return K.table(["Joueur", "Bonus", "Malus", "Total"], launched.map(function (r) { return [label(r), r.bonusGiven, r.malusGiven, r.bonusGiven + r.malusGiven]; }), "Pouvoirs lancés par joueur"); }
    }));

    var wr = rows.filter(function (r) { return r.wheelBonus + r.wheelMalus > 0; }).sort(function (a, b) { return (b.wheelGain - b.wheelLoss) - (a.wheelGain - a.wheelLoss) || a.idx - b.idx; });
    if (wr.length) main.appendChild(K.card({
      title: "🎡 Roue des bonus / malus", desc: "Résultats de la roue pour chaque joueur : bonus, malus touchés, malus annulés par un bouclier. Entre parenthèses : points gagnés moins points perdus grâce à la roue.",
      draw: function (host) {
        K.stack(host, { unit: "tirage", ariaLabel: "Résultats de la roue par joueur", rows: wr.map(function (r) {
          var net = r.wheelGain - r.wheelLoss;
          return { label: label(r) + " (" + (net > 0 ? "+" : net < 0 ? "−" : "") + fmt.int(Math.abs(net)) + ")", avatar: r.avatar, total: r.wheelBonus + r.wheelMalus,
            parts: [{ name: "Bonus", glyph: "🎁", value: r.wheelBonus, color: BON }, { name: "Malus touchés", glyph: "💥", value: r.wheelMalus - r.wheelBlocked, color: MAL }, { name: "Malus annulés", glyph: "🛡️", value: r.wheelBlocked, color: BLK }] };
        }) });
        host.appendChild(keyNote([["🎁 Bonus", BON], ["💥 Malus touchés", MAL], ["🛡️ Malus annulés", BLK]], "Entre parenthèses : bilan en points de la roue."));
      },
      table: function () { return K.table(["Joueur", "Bonus", "Malus touchés", "Malus annulés", "Points gagnés", "Points perdus"], wr.map(function (r) { return [label(r), r.wheelBonus, r.wheelMalus - r.wheelBlocked, r.wheelBlocked, fmt.int(r.wheelGain), fmt.int(r.wheelLoss)]; }), "Roue des bonus et malus"); }
    }));

    var targeted = rows.filter(function (r) { return r.malusReceived > 0; }).sort(function (a, b) { return b.malusReceived - a.malusReceived || a.idx - b.idx; });
    if (targeted.length) main.appendChild(K.card({
      title: "Malus reçus et boucliers", desc: "Parmi les malus visant chaque joueur : ceux qui ont touché, et ceux qui ont été bloqués par un bouclier ou renvoyés.",
      draw: function (host) {
        K.stack(host, { unit: "malus", ariaLabel: "Malus reçus, touchés ou bloqués", rows: targeted.map(function (r) {
          return { label: label(r), avatar: r.avatar, total: r.malusReceived, parts: [{ name: "Touchés", glyph: "💥", value: r.malusReceived - r.shieldSaves, color: MAL }, { name: "Bloqués ou renvoyés", glyph: "🛡️", value: r.shieldSaves, color: BLK }] };
        }) });
        host.appendChild(keyNote([["💥 Touchés", MAL], ["🛡️ Bloqués ou renvoyés", BLK]]));
      },
      table: function () { return K.table(["Joueur", "Malus visant", "Touchés", "Bloqués ou renvoyés", "Points perdus"], targeted.map(function (r) { return [label(r), r.malusReceived, r.malusReceived - r.shieldSaves, r.shieldSaves, fmt.int(r.lost)]; }), "Malus reçus"); }
    }));

    var money = rows.filter(function (r) { return r.gained > 0 || r.lost > 0; }).sort(function (a, b) { return b.net - a.net || a.idx - b.idx; });
    if (money.length) main.appendChild(K.card({
      title: "Points gagnés et perdus grâce aux pouvoirs", desc: "Gagnés : points bonus, jackpots et points volés. Perdus : points retirés par un malus. Les pouvoirs spéciaux sans montant ne sont pas comptés ici.",
      draw: function (host) {
        K.stack(host, { unit: "pts", ariaLabel: "Points gagnés et perdus par joueur", rows: money.map(function (r) {
          return { label: label(r) + " (" + (r.net > 0 ? "+" : r.net < 0 ? "−" : "") + fmt.int(Math.abs(r.net)) + ")", avatar: r.avatar, total: r.gained + r.lost, parts: [{ name: "Gagnés", glyph: "＋", value: r.gained, color: BON }, { name: "Perdus", glyph: "−", value: r.lost, color: MAL }] };
        }) });
        host.appendChild(keyNote([["＋ Gagnés", BON], ["− Perdus", MAL]], "Entre parenthèses : bilan net."));
      },
      table: function () { return K.table(["Joueur", "Gagnés", "Perdus", "Bilan net", "Points infligés"], money.map(function (r) { return [label(r), fmt.int(r.gained), fmt.int(r.lost), (r.net > 0 ? "+" : "") + fmt.int(r.net), fmt.int(r.dealt)]; }), "Points gagnés et perdus grâce aux pouvoirs"); }
    }));

    var nr = log.R.length, net = P.netSeries.filter(function (s) { return s.idx < MAX_PLAYERS_PLOTTED && (P.players[s.idx].gained || P.players[s.idx].lost); }).map(function (s) {
      return { key: String(s.idx), name: label(rows[s.idx]), color: colorFor(s.idx), values: s.values };
    });
    if (net.length) main.appendChild(K.card({
      title: "Bilan net des pouvoirs au fil des questions", desc: "Points gagnés moins points perdus par les pouvoirs, cumulés après chaque question.",
      legend: function (redraw) { return playerLegend(rows, redraw); },
      draw: function (host) {
        K.line(host, { n: nr, series: net, hidden: view.hidden, xTitle: "Questions", endLabels: true, ariaLabel: "Bilan net des pouvoirs de " + net.map(function (s) { return s.name; }).join(", "),
          yFmt: function (v) { return fmt.int(v); },
          header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Après la question " + i }; },
          valueText: function (s, i) { var v = s.values[i]; return (v > 0 ? "+" : "") + fmt.int(v) + " pts"; } });
      },
      table: function () {
        return K.table(["Question"].concat(net.map(function (s) { return s.name; })), (function () { var b = []; for (var i = 0; i <= nr; i++) b.push([i === 0 ? "Départ" : i].concat(net.map(function (s) { var v = s.values[i]; return (v > 0 ? "+" : "") + fmt.int(v); }))); return b; })(), "Bilan net des pouvoirs");
      }
    }));

    main.appendChild(K.card({
      title: "Types de pouvoirs utilisés", desc: "Combien de fois chaque pouvoir a servi (🎁 bonus, 💥 malus).",
      draw: function (host) {
        K.hbars(host, { rows: P.kinds.map(function (k) {
          return { label: (k.choice === 1 ? "🎁 " : "💥 ") + k.label, value: k.count, color: k.choice === 1 ? BON : MAL, text: k.count + (k.choice === 2 && k.blocked ? " · " + k.blocked + " bloqué" + (k.blocked > 1 ? "s" : "") : ""),
            tip: { title: (k.choice === 1 ? "Bonus · " : "Malus · ") + k.label, rows: [{ label: "Utilisations", value: k.count, strong: true }].concat(k.choice === 2 ? [{ label: "Bloquées ou renvoyées", value: k.blocked }] : []).concat(k.points ? [{ label: "Points déplacés", value: fmt.int(k.points) }] : []) } };
        }), max: P.kinds[0].count, ariaLabel: "Types de pouvoirs utilisés" });
      },
      table: function () { return K.table(["Pouvoir", "Type", "Utilisations", "Bloqués ou renvoyés", "Points déplacés"], P.kinds.map(function (k) { return [k.label, k.choice === 1 ? "Bonus" : "Malus", k.count, k.choice === 2 ? k.blocked : "—", k.points ? fmt.int(k.points) : "—"]; }), "Types de pouvoirs"); }
    }));

    var tgt = rows.filter(function (r) { return r.malusGiven > 0 || r.malusReceived > 0; });
    if (P.malus && tgt.length > 1) {
      var mx = 1; P.matrix.forEach(function (row) { row.forEach(function (v) { mx = Math.max(mx, v); }); });
      main.appendChild(K.card({
        title: "Qui vise qui ?", desc: "Nombre de malus lancés (en ligne) contre chaque joueur (en colonne). Plus la case est foncée, plus il y en a.",
        draw: function (host) {
          var tbl = el("table", { "class": "v40s-table v40s-heat" }), hr = el("tr", null, [el("th", { scope: "col", text: "Lanceur ↓ / Cible →" })]);
          tgt.forEach(function (c) { hr.appendChild(el("th", { scope: "col", text: K.cut((c.avatar ? c.avatar + " " : "") + c.name, 12) })); });
          tbl.appendChild(el("thead", null, [hr]));
          var tb = el("tbody");
          tgt.forEach(function (r) {
            var tr = el("tr", null, [el("th", { scope: "row", text: K.cut((r.avatar ? r.avatar + " " : "") + r.name, 14) })]);
            tgt.forEach(function (c) {
              var v = r.idx === c.idx ? null : P.matrix[r.idx][c.idx], td = el("td", { text: v === null ? "·" : (v ? String(v) : "") });
              if (v) { td.style.background = "rgba(217,89,38," + (0.18 + 0.62 * v / mx).toFixed(2) + ")"; td.style.fontWeight = "800"; td.setAttribute("title", r.name + " → " + c.name + " : " + v); }
              tr.appendChild(td);
            });
            tb.appendChild(tr);
          });
          tbl.appendChild(tb);
          host.appendChild(el("div", { "class": "v40s-tablewrap", tabindex: "0", role: "region", "aria-label": "Malus lancés, par lanceur et par cible" }, [tbl]));
        },
        table: function () { return K.table(["Lanceur"].concat(tgt.map(function (c) { return c.name; })), tgt.map(function (r) { return [r.name].concat(tgt.map(function (c) { return r.idx === c.idx ? "·" : P.matrix[r.idx][c.idx]; })); }), "Malus lancés, par lanceur et par cible"); }
      }));
    }

    var cum = [0], cb = [0], cm = [0];
    for (var q = 0; q < nr; q++) { var pr = P.perRound[q] || { bonus: 0, malus: 0 }; cb.push(cb[q] + pr.bonus); cm.push(cm[q] + pr.malus); }
    main.appendChild(K.card({
      title: "Bonus et malus cumulés", desc: "Nombre de pouvoirs utilisés depuis le début de la partie.",
      draw: function (host) {
        K.line(host, { n: nr, series: [{ key: "b", name: "🎁 Bonus", color: BON, values: cb }, { key: "m", name: "💥 Malus", color: MAL, values: cm }], hidden: new Set(), xTitle: "Questions", endLabels: true, ariaLabel: "Bonus et malus cumulés",
          yFmt: function (v) { return fmt.int(v); }, header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Après la question " + i }; },
          valueText: function (s, i) { return fmt.int(s.values[i]) + (s.key === "b" ? " bonus" : " malus"); } });
      },
      table: function () { var b = []; for (var i = 0; i <= nr; i++) b.push([i === 0 ? "Départ" : i, cb[i], cm[i]]); return K.table(["Question", "Bonus cumulés", "Malus cumulés"], b, "Bonus et malus cumulés"); }
    }));
  }

  /* ---------- Analyses avancées : course au classement, forme du moment, qui mène ---------- */
  function ordinalFr(n) { return n === 1 ? "1er" : n + "e"; }
  function rankTicks(N) { var t = [], st = Math.max(1, Math.ceil((N - 1) / 7)); for (var v = 1; v <= N; v += st) t.push(v); if (t[t.length - 1] !== N) t.push(N); return t.length > 1 ? t : [1, 2]; }   /* axe 1…N : 1er en haut (valeur = N + 1 − place) */
  function buildAdvanced(main, log) {
    var rows = A.perPlayer(log), nr = log.R.length, plotted = rows.filter(function (r) { return r.idx < MAX_PLAYERS_PLOTTED; });
    var N = Math.max(1, plotted.length);
    var rk = A.rankSeries(log).filter(function (x) { return x.idx < MAX_PLAYERS_PLOTTED; });
    var L = A.leadStats(log);
    var top = L.players.slice().sort(function (a, b) { return b.led - a.led || a.idx - b.idx; })[0];
    main.appendChild(el("div", { "class": "v40s-tiles v40s-highlights", "aria-label": "Faits marquants des analyses" }, [
      tile(String(L.changes), "Changements de leader", L.soleRounds ? "sur " + L.soleRounds + " question" + (L.soleRounds > 1 ? "s" : "") + " avec un seul leader" : "aucun leader unique"),
      tile(top && top.led ? top.led + "/" + L.n : "—", "Le plus souvent en tête", top && top.led ? top.name : ""),
      tile(top && top.longest ? String(top.longest) : "—", "Plus longue période en tête", top && top.longest ? top.name + " (questions d’affilée)" : "")
    ]));

    main.appendChild(K.card({
      title: "Course au classement", desc: "Place de chaque joueur après chaque question (1er en haut). Les ex æquo partagent la même place.",
      legend: function (redraw) { return playerLegend(rows, redraw); },
      draw: function (host) {
        var ser = rk.map(function (s) { return { key: String(s.idx), name: label(rows[s.idx]), color: colorFor(s.idx), values: s.values.map(function (v) { return v === null ? null : N + 1 - Math.min(v, N); }) }; });
        K.line(host, { n: nr, series: ser, hidden: view.hidden, xTitle: "Questions", endLabels: true, yTicks: rankTicks(N), ariaLabel: "Course au classement de " + ser.map(function (s) { return s.name; }).join(", "),
          yFmt: function (v) { return v >= 1 && v <= N ? ordinalFr(N + 1 - v) : ""; },
          header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Après la question " + i }; },
          valueText: function (s, i) { var v = s.values[i]; return v === null ? "absent" : ordinalFr(N + 1 - v); } });
      },
      table: function () {
        var b = []; for (var i = 0; i <= nr; i++) b.push([i === 0 ? "Départ" : i].concat(rk.map(function (s) { var v = s.values[i]; return v === null ? "–" : ordinalFr(v); })));
        return K.table(["Question"].concat(rk.map(function (s) { return label(rows[s.idx]); })), b, "Place après chaque question");
      }
    }));

    var fm = A.formSeries(log, 3).filter(function (x) { return x.idx < MAX_PLAYERS_PLOTTED; });
    main.appendChild(K.card({
      title: "Forme du moment", desc: "Pourcentage de bonnes réponses sur les 3 dernières questions (moyenne glissante) : montre qui monte en puissance et qui décroche.",
      legend: function (redraw) { return playerLegend(rows, redraw); },
      draw: function (host) {
        var ser = fm.map(function (s) { return { key: String(s.idx), name: label(rows[s.idx]), color: colorFor(s.idx), values: s.values }; });
        K.line(host, { n: nr, series: ser, hidden: view.hidden, xTitle: "Questions", endLabels: true, yMax: 100, ariaLabel: "Forme du moment de " + ser.map(function (s) { return s.name; }).join(", "),
          yFmt: function (v) { return Math.round(v) + " %"; },
          header: function (i) { return i === 0 ? { title: "Départ" } : { title: "Questions " + Math.max(1, i - 2) + " à " + i }; },
          valueText: function (s, i) { var v = s.values[i]; return v === null ? "pas de réponse" : Math.round(v) + " % de réussite"; } });
      },
      table: function () {
        var b = []; for (var i = 1; i <= nr; i++) b.push([i].concat(fm.map(function (s) { var v = s.values[i]; return v === null ? "–" : Math.round(v) + " %"; })));
        return K.table(["Question"].concat(fm.map(function (s) { return label(rows[s.idx]); })), b, "Forme du moment (3 dernières questions)");
      }
    }));

    var led = L.players.slice().sort(function (a, b) { return b.led - a.led || a.idx - b.idx; });
    main.appendChild(K.card({
      title: "Qui a mené la partie ?", desc: "Nombre de questions après lesquelles chaque joueur était en tête (les ex æquo comptent pour chacun) et sa plus longue période en tête.",
      draw: function (host) {
        K.hbars(host, { rows: led.map(function (r) { return { label: label(rows[r.idx]), value: r.led, color: colorFor(r.idx), text: r.led + "/" + L.n + (r.longest > 1 ? " · " + r.longest + " d’affilée" : ""),
          tip: { title: label(rows[r.idx]), rows: [{ label: "Questions en tête", value: r.led + " sur " + L.n, strong: true }, { label: "Plus longue période", value: r.longest + " d’affilée" }] } }; }), max: Math.max(1, L.n), ariaLabel: "Questions passées en tête par joueur" });
      },
      table: function () { return K.table(["Joueur", "Questions en tête", "Plus longue période"], led.map(function (r) { return [label(rows[r.idx]), r.led + "/" + L.n, r.longest]; }), "Questions passées en tête"); }
    }));
  }

  /* ---- Onglet « Mots & lettres » : rapport + lettres + mots les plus écrits ---- */
  function exportTextReport() {
    var log = currentLog(); if (!log) return;
    try {
      var title = "Rapport : mots et lettres les plus écrits — " + dateLabel(log.at || Date.now());
      var blob = new Blob(["﻿" + A.textReportTxt(log, view.common, title)], { type: "text/plain;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "qui-suis-je-mots-lettres-" + new Date(log.at || Date.now()).toISOString().slice(0, 10) + ".txt" });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
    } catch (e) { if (window.console) console.error("V40Stats", e); }
  }
  function buildTextTab(main, log) {
    var fr1 = function (x) { return (Math.round(x * 1000) / 10).toString().replace(".", ",") + " %"; };
    var fn = function (n) { return n.toLocaleString("fr-FR"); };
    var T = A.textStats(log, view.textSrc, view.common, view.nWords);
    var RP = A.textReport(log, view.common);
    var SRC = [["all", "Tout"], ["chat", "💬 Chat"], ["q", "❓ Questions"]];
    var what = view.textSrc === "chat" ? "les messages du chat" : view.textSrc === "q" ? "le texte des questions posées" : "les messages du chat et le texte des questions posées";
    main.appendChild(el("h3", { "class": "v40s-h", text: "✍️ Mots & lettres : le rapport" }));
    main.appendChild(el("p", { "class": "v40s-note", text: "Calculé sur " + what + " (" + T.messages + " message" + (T.messages > 1 ? "s" : "") + " de chat, " + T.questions + " question" + (T.questions > 1 ? "s" : "") + "). Seuls des comptages sont conservés : jamais les messages eux-mêmes. Les messages d’une seule lettre sont supprimés et ne comptent pas." }));
    var bar = el("div", { "class": "v40s-textbar", role: "group", "aria-label": "Source des textes analysés" });
    SRC.forEach(function (o) {
      bar.appendChild(el("button", { type: "button", "class": "v40s-btn" + (view.textSrc === o[0] ? " on" : ""), "aria-pressed": String(view.textSrc === o[0]), text: o[1],
        onclick: function () { view.textSrc = o[0]; render(true); } }));
    });
    bar.appendChild(el("button", { type: "button", id: "v40sCommon", "class": "v40s-btn" + (view.common ? " on" : ""), "aria-pressed": String(view.common), title: "Mots comme le, de, est, et…",
      text: view.common ? "Mots courants : affichés" : "Mots courants : masqués", onclick: function () { view.common = !view.common; render(true); } }));
    bar.appendChild(el("button", { type: "button", id: "v40sTextTxt", "class": "v40s-btn", text: "⬇️ Rapport (.txt)", title: "Télécharger le rapport en texte", onclick: exportTextReport }));
    main.appendChild(bar);
    if (!T.totalLetters) {
      main.appendChild(el("p", { "class": "v40s-note", text: view.textSrc === "chat" ? "Personne n’a écrit dans le chat pendant cette partie : choisis « Tout » ou « Questions »." : "Aucun texte à analyser pour cette partie." }));
      return;
    }
    /* ---- rapport : chiffres clés + phrases ---- */
    var top = T.letters[0], topW = T.words[0];
    main.appendChild(el("div", { "class": "v40s-tiles", "aria-label": "Chiffres clés du texte" }, [
      tile(fn(T.totalLetters), "lettres écrites", "sur " + what.replace("les messages du chat et le texte des questions posées", "le chat et les questions")),
      tile(top.ch, "lettre n° 1", fr1(top.share) + " des lettres"),
      tile(topW ? topW.w : "—", "mot n° 1", topW ? fn(topW.n) + " fois" : "aucun mot"),
      tile(fn(T.distinctWords), "mots différents", fn(T.totalWords) + " mots comptés"),
      tile(fr1(T.letters.filter(function (x) { return "AEIOUY".indexOf(x.ch) >= 0; }).reduce(function (a, x) { return a + x.n; }, 0) / T.totalLetters), "voyelles", "consonnes : " + fr1(1 - T.letters.filter(function (x) { return "AEIOUY".indexOf(x.ch) >= 0; }).reduce(function (a, x) { return a + x.n; }, 0) / T.totalLetters))
    ]));
    var rep = el("ul", { "class": "v40s-report", "aria-label": "Rapport en phrases" });
    RP.lines.forEach(function (l) { rep.appendChild(el("li", { text: l })); });
    main.appendChild(K.card({
      title: "Le rapport en quelques phrases", desc: "Résumé de toute la partie (chat et questions réunis).",
      draw: function (host) { host.appendChild(rep); },
      table: function () { return K.table(["Mesure", "Valeur"], [["Messages de chat", RP.all.messages], ["Questions analysées", RP.all.questions], ["Lettres", RP.all.totalLetters], ["Voyelles", RP.vowels + " (" + fr1(RP.vowelShare) + ")"], ["Consonnes", RP.consonants + " (" + fr1(1 - RP.vowelShare) + ")"], ["Mots différents", RP.all.distinctWords], ["Mots comptés", RP.all.totalWords]], "Rapport mots et lettres"); }
    }));
    /* ---- lettres ---- */
    var letters = view.alpha ? T.letters.slice().sort(function (a, b) { return a.ch < b.ch ? -1 : 1; }) : T.letters;
    var shown = view.allLetters ? letters : letters.slice(0, 10);
    main.appendChild(K.card({
      title: "Lettres les plus écrites", desc: "Nombre d’apparitions de chaque lettre (accents ramenés à la lettre de base) — " + fn(T.totalLetters) + " lettres au total.",
      draw: function (host) {
        var ctl = el("div", { "class": "v40s-textbar" }, [
          el("button", { type: "button", id: "v40sAlpha", "class": "v40s-btn" + (view.alpha ? " on" : ""), "aria-pressed": String(view.alpha), text: view.alpha ? "Ordre : A → Z" : "Ordre : du plus au moins écrit", onclick: function () { view.alpha = !view.alpha; render(true); } }),
          T.letters.length > 10 ? el("button", { type: "button", id: "v40sAllLetters", "class": "v40s-btn", text: view.allLetters ? "Afficher seulement 10 lettres" : "Afficher les " + T.letters.length + " lettres", onclick: function () { view.allLetters = !view.allLetters; render(true); } }) : null
        ]);
        host.appendChild(ctl);
        K.hbars(host, { rows: shown.map(function (x) { return { label: x.ch, value: x.n, text: fn(x.n) + " · " + fr1(x.share), tip: { title: "Lettre " + x.ch, rows: [{ label: "Apparitions", value: fn(x.n), strong: true }, { label: "Part des lettres", value: fr1(x.share) }, { label: "Rang", value: "n° " + (T.letters.indexOf(x) + 1) }] } }; }),
          ariaLabel: "Lettres les plus écrites : " + T.letters.slice(0, 5).map(function (x) { return x.ch + " " + x.n; }).join(", ") });
      },
      table: function () { return K.table(["Rang", "Lettre", "Apparitions", "Part"], T.letters.map(function (x, i) { return [i + 1, x.ch, x.n, fr1(x.share)]; }), "Fréquence de chaque lettre"); }
    }));
    /* ---- voyelles / consonnes ---- */
    var vow = T.letters.filter(function (x) { return "AEIOUY".indexOf(x.ch) >= 0; }), vn = vow.reduce(function (a, x) { return a + x.n; }, 0);
    main.appendChild(K.card({
      title: "Voyelles et consonnes", desc: "Part des voyelles (A E I O U Y) parmi toutes les lettres écrites.",
      draw: function (host) {
        K.hbars(host, { rows: [
          { label: "Voyelles", value: vn, color: K.C.palette[0], text: fn(vn) + " · " + fr1(vn / T.totalLetters), tip: { title: "Voyelles", rows: [{ label: "Lettres", value: fn(vn), strong: true }, { label: "Part", value: fr1(vn / T.totalLetters) }] } },
          { label: "Consonnes", value: T.totalLetters - vn, color: K.C.palette[1] || undefined, text: fn(T.totalLetters - vn) + " · " + fr1(1 - vn / T.totalLetters), tip: { title: "Consonnes", rows: [{ label: "Lettres", value: fn(T.totalLetters - vn), strong: true }, { label: "Part", value: fr1(1 - vn / T.totalLetters) }] } }
        ], ariaLabel: "Voyelles " + fr1(vn / T.totalLetters) + ", consonnes " + fr1(1 - vn / T.totalLetters) });
      },
      table: function () { return K.table(["Type", "Lettres", "Part"], [["Voyelles", vn, fr1(vn / T.totalLetters)], ["Consonnes", T.totalLetters - vn, fr1(1 - vn / T.totalLetters)]], "Voyelles et consonnes"); }
    }));
    /* ---- mots ---- */
    if (T.words.length) main.appendChild(K.card({
      title: "Mots les plus écrits", desc: "Les " + T.words.length + " mots qui reviennent le plus souvent" + (view.common ? "" : " (hors mots courants)") + " — " + fn(T.distinctWords) + " mots différents.",
      draw: function (host) {
        host.appendChild(el("div", { "class": "v40s-textbar" }, [15, 30].map(function (n) {
          return el("button", { type: "button", "class": "v40s-btn" + (view.nWords === n ? " on" : ""), "aria-pressed": String(view.nWords === n), text: "Top " + n, onclick: function () { view.nWords = n; render(true); } });
        })));
        K.hbars(host, { rows: T.words.map(function (x, i) { return { label: x.w, value: x.n, color: K.C.palette[1] || undefined, text: fn(x.n) + " fois", tip: { title: x.w, rows: [{ label: "Écrit", value: fn(x.n) + " fois", strong: true }, { label: "Rang", value: "n° " + (i + 1) }] } }; }),
          ariaLabel: "Mots les plus écrits : " + T.words.slice(0, 5).map(function (x) { return x.w + " " + x.n; }).join(", ") });
      },
      table: function () { return K.table(["Rang", "Mot", "Fois"], T.words.map(function (x, i) { return [i + 1, x.w, x.n]; }), "Mots les plus écrits"); }
    }));
    /* ---- chat contre questions ---- */
    if (RP.chat.totalLetters && RP.q.totalLetters) main.appendChild(K.card({
      title: "Chat ou questions : qui écrit quoi ?", desc: "Les 5 lettres et les 5 mots les plus écrits dans le chat, puis dans le texte des questions.",
      draw: function (host) {
        host.appendChild(K.table(["", "💬 Chat (" + RP.chat.messages + " messages)", "❓ Questions (" + RP.q.questions + ")"], [
          ["Lettres", RP.chat.letters.slice(0, 5).map(function (x) { return x.ch + " " + fr1(x.share); }).join(" · "), RP.q.letters.slice(0, 5).map(function (x) { return x.ch + " " + fr1(x.share); }).join(" · ")],
          ["Mots", RP.chat.words.slice(0, 5).map(function (x) { return x.w + " (" + x.n + ")"; }).join(" · ") || "—", RP.q.words.slice(0, 5).map(function (x) { return x.w + " (" + x.n + ")"; }).join(" · ") || "—"],
          ["Total de lettres", fn(RP.chat.totalLetters), fn(RP.q.totalLetters)]
        ], "Comparaison chat et questions"));
      },
      table: function () { return K.table(["Source", "Lettre n° 1", "Mot n° 1", "Lettres"], [["Chat", RP.chat.letters[0].ch, RP.chat.words[0] ? RP.chat.words[0].w : "—", RP.chat.totalLetters], ["Questions", RP.q.letters[0].ch, RP.q.words[0] ? RP.q.words[0].w : "—", RP.q.totalLetters]], "Comparaison chat et questions"); }
    }));
  }

  function buildCheat(main, log) {
    var rows = A.perPlayer(log);
    var pol = (window.V40Cheat && window.V40Cheat.policy) || { WARN_MAX: 2, KICK_AFTER: 4, MALUS_POINTS: 250 };
    main.appendChild(el("p", { "class": "v40s-note", text: "Règle : quitter la page pendant une question = 1 infraction. Jusqu’à " + pol.WARN_MAX + " : avertissement · à partir de la " + (pol.WARN_MAX + 1) + "ᵉ : malus (−" + pol.MALUS_POINTS + " pts, chrono réduit) · à partir de la " + (pol.KICK_AFTER + 1) + "ᵉ : exclusion jusqu’à la fin de la partie." }));
    if (!log.C.length) { main.appendChild(el("div", { "class": "v40s-empty" }, [el("div", { "class": "big", text: "🎉" }), el("h3", { text: "Aucune infraction" }), el("p", { text: "Personne n’a quitté la page pendant une question." })])); return; }
    var cheaters = rows.filter(function (r) { return r.cheats > 0; }).sort(function (a, b) { return b.cheats - a.cheats || a.idx - b.idx; });
    var maxLvl = {}; log.C.forEach(function (c) { maxLvl[c[0]] = Math.max(maxLvl[c[0]] || 0, c[2]); });
    main.appendChild(K.card({
      title: "Infractions par joueur", desc: "Nombre de fois où chaque joueur a quitté la page pendant une question.",
      draw: function (host) {
        K.hbars(host, { rows: cheaters.map(function (r) { return { label: label(r), avatar: r.avatar, value: r.cheats, color: colorFor(r.idx), text: r.cheats + " · " + (LV[maxLvl[r.idx]] || ""),
          tip: { title: label(r), rows: [{ label: "Infractions", value: r.cheats, strong: true }, { label: "Sanction la plus lourde", value: LV[maxLvl[r.idx]] || "" }] } }; }),
          max: Math.max(pol.KICK_AFTER + 1, cheaters[0].cheats), ariaLabel: "Infractions par joueur" });
      },
      table: function () { return K.table(["Joueur", "Infractions", "Sanction la plus lourde"], cheaters.map(function (r) { return [label(r), r.cheats, LV[maxLvl[r.idx]] || ""]; }), "Infractions par joueur"); }
    }));
    var ordered = log.C.slice().sort(function (a, b) { return a[3] - b[3] || a[1] - b[1]; });
    main.appendChild(K.card({
      title: "Chronologie", desc: "Dans l’ordre où les infractions ont eu lieu.",
      draw: function (host) {
        var ul = el("ol", { "class": "v40s-timeline" });
        ordered.forEach(function (c) { var p = rows[c[0]]; ul.appendChild(el("li", { "class": "lv" + c[2] }, [el("b", { text: "Q" + c[3] }), el("span", { text: label(p) + " — infraction n° " + c[1] }), el("em", { text: LV[c[2]] })])); });
        host.appendChild(ul);
      },
      table: function () { return K.table(["Question", "Joueur", "Infraction n°", "Sanction"], ordered.map(function (c) { return ["Q" + c[3], label(rows[c[0]]), c[1], LV[c[2]]]; }), "Chronologie des infractions"); }
    }));
  }

  /* ---------- Historique ---------- */
  var confirmClear = false;
  function buildHistory(main) {
    if (!history.length) {
      main.appendChild(el("div", { "class": "v40s-empty" }, [el("div", { "class": "big", text: "🗂️" }), el("h3", { text: "Pas encore de partie enregistrée" }), el("p", { text: "À la fin de chaque partie, ses statistiques sont gardées dans ce navigateur (les 12 dernières)." })]));
      return;
    }
    var sums = history.map(A.summarize);
    var ordered = sums.slice().reverse();
    main.appendChild(K.card({
      title: "Réussite des dernières parties", desc: "Part de bonnes réponses sur l’ensemble des joueurs, de la plus ancienne (gauche) à la plus récente.",
      draw: function (host) {
        K.columns(host, { values: ordered.map(function (s) { return s.accuracy; }), labels: ordered.map(function (s, i) { return String(i + 1); }),
          tipFor: function (i) { var s = ordered[i]; return { title: dateLabel(s.at), sub: s.winner ? "Gagnant : " + s.winner : "", rows: [{ label: "Réussite", value: fmt.pct(s.accuracy), strong: true }, { label: "Joueurs", value: s.players }, { label: "Questions", value: s.rounds }, { label: "Infractions", value: s.cheats }] }; },
          ariaLabel: "Réussite des dernières parties" });
      },
      table: function () { return K.table(["Partie", "Gagnant", "Score", "Joueurs", "Questions", "Réussite", "Infractions"], ordered.map(function (s) { return [dateLabel(s.at), s.winner, fmt.int(s.winnerScore), s.players, s.rounds, fmt.pct(s.accuracy), s.cheats]; }), "Parties enregistrées"); }
    }));
    var list = el("section", { "class": "v40s-card" }, [el("div", { "class": "v40s-cardhead" }, [el("div", null, [el("h3", { text: "Parties enregistrées" }), el("p", { text: "Ouvre une partie pour revoir tous ses graphiques." })])])]);
    var ul = el("ul", { "class": "v40s-games" });
    sums.forEach(function (s) {
      ul.appendChild(el("li", null, [
        el("div", { "class": "g" }, [el("b", { text: dateLabel(s.at) }), el("span", { text: (s.winner ? "🏆 " + s.winner + " (" + fmt.int(s.winnerScore) + " pts) · " : "") + s.players + " joueur" + (s.players > 1 ? "s" : "") + " · " + s.rounds + " questions · " + fmt.pct(s.accuracy) + " de réussite" + (s.cheats ? " · " + s.cheats + " infraction" + (s.cheats > 1 ? "s" : "") : "") })]),
        el("button", { type: "button", "class": "v40s-btn", text: "Ouvrir", onclick: function () { view.src = (live && s.id === live.id) ? "live" : s.id; view.tab = "overview"; view.hidden = new Set(); render(); } })
      ]));
    });
    list.appendChild(ul);
    var clr = el("button", { type: "button", "class": "v40s-btn danger", text: confirmClear ? "Confirmer : tout effacer" : "🗑️ Vider l’historique", onclick: function () {
      if (!confirmClear) { confirmClear = true; render(true); return; }
      confirmClear = false; history = []; try { localStorage.removeItem(HKEY); } catch (e) {} view.src = "live"; refreshEntryPoints(); render();
    } });
    list.appendChild(el("div", { "class": "v40s-foot" }, [clr]));
    main.appendChild(list);
  }

  /* ===================================================================== Points d'entrée */
  function hasData() { return !!(live && live.R.length) || history.length > 0; }
  function mountButtons() {
    var dock = $("dock");
    if (dock && !$("dockStats")) {
      var b = el("button", { id: "dockStats", type: "button", title: "Statistiques et graphiques", "aria-label": "Statistiques et graphiques", text: "📊", onclick: function () { open(); } });
      dock.insertBefore(b, dock.firstChild);
    }
    var res = $("resultsScreen");
    if (res) {
      var rb = $("v40sResultsBtn");
      if (!rb) rb = el("button", { id: "v40sResultsBtn", type: "button", "class": "btn btn-secondary v40s-open", text: "📊 Voir tous les graphiques", onclick: function () { view.src = "live"; open("overview"); } });
      var nav = $("v366EndNav");                       /* bloc d'actions de fin de partie (js/patches/038-v366-script.js) */
      if (nav) { if (rb.parentNode !== nav) nav.insertBefore(rb, nav.querySelector(".v366-home") || null); }
      else if (!rb.parentNode) { var wrapR = el("div", { "class": "v40s-resultsrow" }, [rb]); (res.querySelector(".card") || res).appendChild(wrapR); }   /* dans un div : le CSS existant masque « .card > button.btn » */
    }
    var hs = $("homeScreen");
    if (hs && !$("v40sHomeBtn")) {
      var hc = hs.querySelector(".card") || hs;
      var hb = el("button", { id: "v40sHomeBtn", type: "button", "class": "btn btn-secondary v40s-open v40s-home", text: "📊 Mes statistiques", onclick: function () { open(history.length && !live ? "history" : "overview"); } });
      hc.appendChild(hb);
    }
    refreshEntryPoints();
  }
  function refreshEntryPoints() {
    var hb = $("v40sHomeBtn");
    if (hb) {
      hb.style.display = hasData() ? "" : "none";
      hb.textContent = "📊 Mes statistiques" + (history.length ? " (" + history.length + " partie" + (history.length > 1 ? "s" : "") + ")" : "");
    }
  }
  var baseScreen = showScreen;
  showScreen = function (id) { var r = baseScreen.apply(this, arguments); setTimeout(mountButtons, 0); return r; };
  var baseReset = resetConnection;
  resetConnection = function () { buf = {}; close(); return baseReset.apply(this, arguments); };
  setTimeout(mountButtons, 80);
  setInterval(function () { var r = $("resultsScreen"); if (r && r.classList.contains("active")) mountButtons(); }, 1000);   /* le bloc d'actions de fin de partie se crée un peu après l'écran */

  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { if (isOpen()) render(true); }, 160); });

  window.V40Stats = { noteCheat: noteCheat, noteWheel: noteWheel, open: open, close: close, isOpen: isOpen, getLive: function () { return live; }, getHistory: function () { return history.slice(); }, exportPDF: exportPDF, _view: view };
})();
