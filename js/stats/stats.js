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
  var history = loadHistory();
  var view = { tab: "overview", src: "live", hidden: new Set() };

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
    buf = {}; liveDone = false;
    live = { v: 1, id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(),
      qt: Number(questionTime) || 0, mode: String(window.v9GameMode || ""), P: [], R: [], C: [] };
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

  /* ===================================================================== Réception (joueurs) */
  function onEntry(d) {
    if (isHost || !d) return;
    if (d.kind === "begin" && d.head) {
      var head = A.normalize({ id: d.head.id, at: d.head.at, qt: d.head.qt, mode: d.head.mode, P: d.head.P, R: [], C: [] });
      if (head) { live = head; liveDone = false; }
    } else if (d.kind === "round" && live && live.id === d.id && typeof d.n === "number" && d.n >= 0 && d.n < A.MAX_ROUNDS) {
      var np = live.P.length;
      if (Array.isArray(d.P) && d.P.length > np && d.P.length <= A.MAX_PLAYERS) {            /* joueurs ajoutés en cours de route */
        var more = A.normalize({ P: d.P, R: [], C: [] });
        if (more) { live.P = more.P; live.R.forEach(function (R) { while (R.r.length < live.P.length) R.r.push([0, 0, 0]); }); np = live.P.length; }
      }
      while (live.R.length < d.n) live.R.push(A.normalizeRound({ r: [] }, np));          /* manche perdue : case vide, remplacée par v40Final */
      live.R[d.n] = A.normalizeRound(d.e, np);
      (Array.isArray(d.gone) ? d.gone : []).forEach(function (k) { if (live.P[k]) live.P[k].x = 1; });
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

  var TABS = [["overview", "Vue d’ensemble"], ["players", "Joueurs"], ["questions", "Questions"], ["detail", "Détail"], ["cheat", "Triche"], ["history", "Historique"]];

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
    var pdfBtn = el("button", { type: "button", id: "v40sPdf", "class": "v40s-btn", text: "📄 PDF", title: "Télécharger les tableaux et les graphiques en PDF", onclick: function () { exportPDF(); } });
    if (!log || !log.R.length) pdfBtn.disabled = true;
    var closeBtn = el("button", { type: "button", id: "v40sClose", "class": "v40s-btn close", "aria-label": "Fermer les statistiques", text: "✕", onclick: close });
    wrap.appendChild(el("div", { "class": "v40s-top" }, [el("h2", { id: "v40sTitle", text: "📊 Statistiques" }), el("div", { "class": "v40s-actions" }, [sel, pdfBtn, csvBtn, closeBtn])]));
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
        var fn = { overview: buildOverview, players: buildPlayers, questions: buildQuestions, detail: buildDetail, cheat: buildCheat }[view.tab] || buildOverview;
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
  function exportPDF() {
    var log = currentLog(); if (!log || !log.R.length) return;
    try {
      if (!window.V40Pdf) throw new Error("module PDF absent");
      window.V40Pdf.download(log);
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

  window.V40Stats = { noteCheat: noteCheat, open: open, close: close, isOpen: isOpen, getLive: function () { return live; }, getHistory: function () { return history.slice(); }, exportPDF: exportPDF, _view: view };
})();
