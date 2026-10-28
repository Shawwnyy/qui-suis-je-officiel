/* =============================================================================
   V40 — Analyse des parties (aucun accès au DOM : testable avec Node)

   Format d'un journal de partie (« log »), volontairement compact pour passer par PeerJS :
   {
     v:1, id:"g…", at:<ms>, qt:<temps par question en s>, mode:"…",
     P:[{i:<id>, n:<nom>, a:<avatar>, h:0|1 (hôte), x:0|1 (exclu / parti)}],            joueurs, dans l'ordre d'arrivée
     R:[{q:<texte>, c:<thème>, d:<difficulté>, m:0|1 (image/vidéo),
         r:[[état, secondes, score cumulé], …]}],                                         une entrée par joueur de P
     C:[[indexJoueur, n° d'infraction, niveau 1=avert. 2=malus 3=exclusion, n° de question]],
     B:[[n° de question (après laquelle le pouvoir a été choisi), indexLanceur, indexCible ou -1, 1=bonus 2=malus,
         type (« xp », « shield »…), points déplacés, drapeaux (1=bloqué 2=renvoyé), libellé des pouvoirs spéciaux]]
   }
   état : 0 = pas dans la partie à ce moment-là · 1 = bonne réponse · 2 = mauvaise réponse · 3 = pas de réponse
   ============================================================================= */
var V40Analysis = (function () {
  "use strict";
  var MAX_PLAYERS = 60, MAX_ROUNDS = 300, MAX_CHEATS = 400, MAX_POWERS = 600, SCORE_LIMIT = 9999999;
  var DIFFS = ["facile", "moyen", "difficile", "impossible"];

  function str(x, n) { return typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n) : ""; }
  function int(x, lo, hi, def) { x = Math.round(Number(x)); if (!isFinite(x)) return def; return Math.max(lo, Math.min(hi, x)); }
  function dec(x, lo, hi, def) { x = Number(x); if (!isFinite(x)) return def; x = Math.max(lo, Math.min(hi, x)); return Math.round(x * 10) / 10; }

  /* Nettoie une manche : np = nombre de joueurs du journal. */
  function normalizeRound(r, np) {
    r = r || {};
    var d = DIFFS.indexOf(r.d) >= 0 ? r.d : "moyen";
    var row = { q: str(r.q, 160), c: str(r.c, 60), d: d, m: r.m ? 1 : 0, r: [] };
    var src = Array.isArray(r.r) ? r.r : [];
    for (var k = 0; k < np; k++) {
      var e = Array.isArray(src[k]) ? src[k] : [0, 0, 0];
      var st = int(e[0], 0, 3, 0);
      row.r.push([st, st === 1 || st === 2 ? dec(e[1], 0, 3600, 0) : 0, int(e[2], -SCORE_LIMIT, SCORE_LIMIT, 0)]);
    }
    return row;
  }

  /* Nettoie un journal reçu du réseau ou du stockage : renvoie un journal sûr, ou null s'il est inutilisable. */
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.P) || !Array.isArray(raw.R)) return null;
    if (!raw.P.length || raw.P.length > MAX_PLAYERS || raw.R.length > MAX_ROUNDS) return null;
    var log = {
      v: 1, id: str(raw.id, 40) || ("g" + Date.now()), at: int(raw.at, 0, 4102444800000, 0),
      qt: int(raw.qt, 0, 600, 0), mode: str(raw.mode, 20), P: [], R: [], C: [], B: []
    };
    raw.P.forEach(function (p) {
      p = p || {};
      log.P.push({ i: str(p.i, 64), n: str(p.n, 40) || "Joueur", a: str(p.a, 12), h: p.h ? 1 : 0, x: p.x ? 1 : 0 });
    });
    var np = log.P.length;
    raw.R.forEach(function (r) { log.R.push(normalizeRound(r, np)); });
    var ch = normalizeChat(raw.Ch);
    if (ch) log.Ch = ch;
    (Array.isArray(raw.C) ? raw.C : []).slice(0, MAX_CHEATS).forEach(function (c) {
      if (!Array.isArray(c)) return;
      var pi = Math.round(Number(c[0]));
      if (!(pi >= 0 && pi < np)) return;                 /* joueur inconnu : ignoré (pas ramené au bord) */
      log.C.push([pi, int(c[1], 1, 99, 1), int(c[2], 1, 3, 1), int(c[3], 1, MAX_ROUNDS, 1)]);
    });
    (Array.isArray(raw.B) ? raw.B : []).slice(0, MAX_POWERS).forEach(function (b) {
      if (!Array.isArray(b)) return;
      var gi = Math.round(Number(b[1])), ti = b[2] === null || b[2] === undefined ? -1 : Math.round(Number(b[2])), ch = Math.round(Number(b[3]));
      if (!(gi >= 0 && gi < np) || !(ch === 1 || ch === 2)) return;
      var kind = str(b[4], 16).replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 16);
      if (!kind) return;
      if (!(ti >= 0 && ti < np) || (ti === gi && !/^w_/.test(kind))) ti = -1;          /* roue : le malus touche le joueur lui-même (cible = joueur) */
      log.B.push([int(b[0], 1, MAX_ROUNDS, 1), gi, ch === 2 ? ti : -1, ch, kind, int(b[5], 0, SCORE_LIMIT, 0), int(b[6], 0, 3, 0), str(b[7], 30)]);
    });
    return log;
  }


  /* ===================================================================== Lettres et mots écrits */
  /* Chat de la salle : on ne garde QUE des comptages (26 lettres + les mots les plus fréquents), jamais les messages. */
  var MAX_CHAT_WORDS = 120, MAX_WORD_LEN = 24, ACC_WORD_CAP = 600;
  var STOP = {};
  ("le la les un une des de du d l au aux et ou ni mais donc or car que qui quoi dont où se sa son ses ce cet cette ces leur leurs mon ma mes ton ta tes notre nos votre vos je tu il elle on nous vous ils elles me te lui y en ne pas plus par pour sur sous dans avec sans chez vers entre comme si est sont était été être a ai as avons avez ont avait avoir fait faire c j m n s t qu the of and to in is it that for on as are with was be by at an or from this have has not but you your we they he she his her its our their there what which who will would can could do does did so if then than too very just about out up one"
  ).split(" ").forEach(function (w) { if (w) STOP[w] = 1; });

  function foldWord(w) { return w.normalize ? w.normalize("NFD").replace(/[̀-ͯ]/g, "") : w; }
  /* Découpe un texte : renvoie { l: [26 comptes a–z, accents ramenés à la lettre de base], w: [mots en minuscules] } */
  function tokenize(text) {
    var l = []; for (var i = 0; i < 26; i++) l.push(0);
    var t = String(text == null ? "" : text).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss");
    var words = (t.replace(/[’'`´]/g, " ").match(/[a-zà-öø-ÿ]+/g) || []).filter(function (w) { return w.length <= MAX_WORD_LEN; });
    words.forEach(function (w) {
      var f = foldWord(w);
      for (var k = 0; k < f.length; k++) { var c = f.charCodeAt(k) - 97; if (c >= 0 && c < 26) l[c]++; }
    });
    return { l: l, w: words };
  }
  function newChat() { var l = []; for (var i = 0; i < 26; i++) l.push(0); return { m: 0, l: l, w: {} }; }
  function addChat(acc, text) {
    var tk = tokenize(text);
    acc.m++;
    tk.l.forEach(function (n, i) { acc.l[i] += n; });
    tk.w.forEach(function (w) {
      if (w.length < 2) return;
      if (acc.w[w] !== undefined) acc.w[w]++;
      else if (Object.keys(acc.w).length < ACC_WORD_CAP) acc.w[w] = 1;
    });
    return acc;
  }
  function wordPairs(w) {
    var pairs = [];
    if (Array.isArray(w)) w.forEach(function (e) { if (Array.isArray(e)) pairs.push([e[0], e[1]]); });
    else if (w && typeof w === "object") Object.keys(w).forEach(function (k) { pairs.push([k, w[k]]); });
    return pairs;
  }
  function normalizeChat(raw) {
    if (!raw || typeof raw !== "object") return null;
    var out = { m: int(raw.m, 0, 100000, 0), l: [], w: [] };
    for (var i = 0; i < 26; i++) out.l.push(int(Array.isArray(raw.l) ? raw.l[i] : 0, 0, 10000000, 0));
    var seen = {};
    wordPairs(raw.w).forEach(function (e) {
      var w = typeof e[0] === "string" ? e[0].toLowerCase().replace(/[^a-zà-öø-ÿ]/g, "").slice(0, MAX_WORD_LEN) : "";
      var n = int(e[1], 0, 10000000, 0);
      if (w.length >= 2 && n > 0 && !seen[w]) { seen[w] = 1; out.w.push([w, n]); }
    });
    out.w.sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); });
    out.w = out.w.slice(0, MAX_CHAT_WORDS);
    return out.m || out.w.length || out.l.some(function (n) { return n > 0; }) ? out : null;
  }
  /* Lettres et mots d'un journal.  src : "all" | "chat" | "q" (textes des questions posées) ; common : garder les mots courants (le, de, est…) */
  function textStats(log, src, common, topWords) {
    src = src === "chat" || src === "q" ? src : "all";
    var letters = [], wc = {}, msgs = 0, nq = 0, tw = 0, i;
    for (i = 0; i < 26; i++) letters.push(0);
    function addWord(w, n) { if (!common && (STOP[w] || STOP[foldWord(w)])) return; if (w.length < 2) return; wc[w] = (wc[w] || 0) + n; tw += n; }
    if (src !== "q" && log && log.Ch) {
      msgs = log.Ch.m; log.Ch.l.forEach(function (n, k) { letters[k] += n; });
      wordPairs(log.Ch.w).forEach(function (e) { addWord(e[0], e[1]); });
    }
    if (src !== "chat" && log && log.R) {
      log.R.forEach(function (R) {
        if (!R.q) return; nq++;
        var tk = tokenize(R.q); tk.l.forEach(function (n, k) { letters[k] += n; }); tk.w.forEach(function (w) { addWord(w, 1); });
      });
    }
    var total = letters.reduce(function (a, b) { return a + b; }, 0);
    var L = letters.map(function (n, k) { return { ch: String.fromCharCode(65 + k), n: n, share: total ? n / total : 0 }; })
      .filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n || (a.ch < b.ch ? -1 : 1); });
    var W = Object.keys(wc).map(function (w) { return { w: w, n: wc[w] }; }).sort(function (a, b) { return b.n - a.n || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0); }).slice(0, topWords || 15);
    return { src: src, letters: L, words: W, totalLetters: total, totalWords: tw, messages: msgs, questions: nq, distinctWords: Object.keys(wc).length };
  }

  /* ---------- Rapport « mots et lettres » : phrases + chiffres prêts à afficher, à télécharger ou à mettre dans le PDF ---------- */
  var VOWELS = "AEIOUY";
  function pctFr(x) { return (Math.round(x * 1000) / 10).toString().replace(".", ",") + " %"; }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }
  function listFr(items) { return items.length > 1 ? items.slice(0, -1).join(", ") + " et " + items[items.length - 1] : items.join(""); }
  function textReport(log, common) {
    var all = textStats(log, "all", common, 30), chat = textStats(log, "chat", common, 10), qs = textStats(log, "q", common, 10);
    var vowels = 0;
    all.letters.forEach(function (x) { if (VOWELS.indexOf(x.ch) >= 0) vowels += x.n; });
    var consonants = all.totalLetters - vowels;
    var byLetter = {}; all.letters.forEach(function (x) { byLetter[x.ch] = x; });
    var alpha = [];
    for (var k = 0; k < 26; k++) { var ch = String.fromCharCode(65 + k); alpha.push(byLetter[ch] || { ch: ch, n: 0, share: 0 }); }
    var missing = alpha.filter(function (x) { return x.n === 0; }).map(function (x) { return x.ch; });
    var lines = [];
    if (all.totalLetters) {
      lines.push("Analyse de " + plural(chat.messages, "message de chat", "messages de chat") + " et du texte de " + plural(all.questions, "question posée", "questions posées") + " : " + all.totalLetters.toLocaleString("fr-FR") + " lettres et " + all.distinctWords.toLocaleString("fr-FR") + " mots différents" + (common ? "" : " (hors mots courants)") + ".");
      var top3 = all.letters.slice(0, 3);
      lines.push("La lettre la plus écrite est " + top3[0].ch + " (" + pctFr(top3[0].share) + ", " + top3[0].n.toLocaleString("fr-FR") + " fois)" + (top3.length > 1 ? ", suivie de " + listFr(top3.slice(1).map(function (x) { return x.ch + " (" + pctFr(x.share) + ")"; })) : "") + ".");
      lines.push("Voyelles : " + pctFr(vowels / all.totalLetters) + " des lettres ; consonnes : " + pctFr(consonants / all.totalLetters) + ".");
      if (missing.length && missing.length < 26) lines.push("Lettre" + (missing.length > 1 ? "s jamais écrites" : " jamais écrite") + " : " + missing.join(", ") + ".");
      if (all.words.length) {
        var tw = all.words.slice(0, 3);
        lines.push("Le mot le plus écrit est « " + tw[0].w + " » (" + plural(tw[0].n, "fois", "fois") + ")" + (tw.length > 1 ? ", puis " + listFr(tw.slice(1).map(function (x) { return "« " + x.w + " » (" + x.n + ")"; })) : "") + ".");
      }
      if (chat.totalLetters && qs.totalLetters) {
        lines.push("Dans le chat, la lettre la plus écrite est " + chat.letters[0].ch + (chat.words.length ? " et le mot le plus écrit « " + chat.words[0].w + " »" : "") + " ; dans les questions, la lettre " + qs.letters[0].ch + (qs.words.length ? " et le mot « " + qs.words[0].w + " »" : "") + ".");
      } else if (!chat.totalLetters) lines.push("Personne n’a écrit dans le chat : le rapport ne porte que sur les questions.");
    }
    return { all: all, chat: chat, q: qs, vowels: vowels, consonants: consonants, vowelShare: all.totalLetters ? vowels / all.totalLetters : 0, alpha: alpha, missing: missing, lines: lines };
  }
  /* Rapport au format texte (téléchargement) */
  function textReportTxt(log, common, title) {
    var R = textReport(log, common), out = [title || "Rapport : mots et lettres les plus écrits", ""];
    if (!R.all.totalLetters) { out.push("Aucun texte à analyser pour cette partie."); return out.join("\n"); }
    R.lines.forEach(function (l) { out.push("• " + l); });
    out.push("", "LETTRES (de la plus à la moins écrite)");
    R.all.letters.forEach(function (x, i) { out.push((i + 1) + ". " + x.ch + " — " + x.n + " (" + pctFr(x.share) + ")"); });
    out.push("", "MOTS LES PLUS ÉCRITS" + (common ? "" : " (hors mots courants)"));
    R.all.words.forEach(function (x, i) { out.push((i + 1) + ". " + x.w + " — " + x.n + " fois"); });
    out.push("", "Seuls des comptages sont conservés : jamais les messages eux-mêmes.");
    return out.join("\n");
  }


  /* ---------- Temps de réaction : statistiques poussées (médiane, quartiles, régularité, tendance, qui est le plus rapide…) ---------- */
  function quantile(sorted, q) {
    if (!sorted.length) return null;
    var i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function describe(times) {
    var t = times.slice().sort(function (a, b) { return a - b; }), m = mean(t), sd = null;
    if (t.length > 1) sd = Math.sqrt(t.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / t.length);
    return { n: t.length, mean: m, median: quantile(t, 0.5), q1: quantile(t, 0.25), q3: quantile(t, 0.75), min: t.length ? t[0] : null, max: t.length ? t[t.length - 1] : null, sd: sd };
  }
  function reactionStats(log) {
    var np = log.P.length, nr = log.R.length, S0 = 0;
    var pl = log.P.map(function (p, idx) { return { idx: idx, times: [], good: [], bad: [], perRound: [null], wins: 0, answered: 0, correct: 0 }; });
    var all = [], rounds = [], gThemes = {}, gDiffs = {}, fastest = null, slowest = null;
    log.R.forEach(function (R, i) {
      var best = null, rt = [];
      R.r.forEach(function (e, k) {
        var P = pl[k]; if (!P) return;
        var t = (e[0] === 1 || e[0] === 2) && e[1] > 0 ? e[1] : null;
        if (e[0] >= 1) P.answered++;
        if (e[0] === 1) P.correct++;
        P.perRound[i + 1] = t;
        if (t === null) return;
        P.times.push(t); all.push(t); rt.push(t); if (t > S0) S0 = t;
        (e[0] === 1 ? P.good : P.bad).push(t);
        if (e[0] === 1 && (best === null || t < best)) best = t;
        if (!fastest || t < fastest.t) fastest = { t: t, idx: k, round: i + 1 };
        if (!slowest || t > slowest.t) slowest = { t: t, idx: k, round: i + 1 };
        var th = R.c || "Autre", df = R.d;
        (gThemes[th] = gThemes[th] || []).push(t); (gDiffs[df] = gDiffs[df] || []).push(t);
      });
      if (best !== null && np > 1) R.r.forEach(function (e, k) { if (e[0] === 1 && e[1] === best && pl[k]) pl[k].wins++; });
      var d = describe(rt);
      rounds.push({ round: i + 1, n: d.n, median: d.median, min: d.min, max: d.max });
    });
    pl.forEach(function (P) {
      var d = describe(P.times); for (var k in d) P[k] = d[k];
      P.meanGood = mean(P.good); P.meanBad = mean(P.bad);
      P.accuracy = P.answered ? P.correct / P.answered : null;
      var h = Math.floor(P.times.length / 2);                               /* tendance : 2ᵉ moitié de la partie moins 1ʳᵉ moitié (négatif = il accélère) */
      P.trend = P.times.length >= 4 ? mean(P.times.slice(P.times.length - h)) - mean(P.times.slice(0, h)) : null;
    });
    var S = Math.max(1, Math.min(60, Math.ceil(Math.max(log.qt || 0, S0))));
    var ecdf = pl.map(function (P) {
      var v = []; for (var i = 0; i <= S; i++) v.push(P.times.length ? P.times.filter(function (t) { return t <= i; }).length / P.times.length : null);
      return v;
    });
    function groups(map, order) {
      return Object.keys(map).map(function (k) { var d = describe(map[k]); return { key: k, n: d.n, mean: d.mean, median: d.median }; })
        .sort(order);
    }
    var diffRank = { facile: 0, moyen: 1, difficile: 2, impossible: 3 };
    return {
      n: all.length, players: pl, rounds: rounds, overall: describe(all), fastest: fastest, slowest: slowest, S: S, ecdf: ecdf, nr: nr,
      meanGood: mean(pl.reduce(function (a, P) { return a.concat(P.good); }, [])), meanBad: mean(pl.reduce(function (a, P) { return a.concat(P.bad); }, [])),
      byDifficulty: groups(gDiffs, function (a, b) { return (diffRank[a.key] || 0) - (diffRank[b.key] || 0); }),
      byTheme: groups(gThemes, function (a, b) { return b.n - a.n || (a.key < b.key ? -1 : 1); }).slice(0, 8)
    };
  }

  function isAnswer(st) { return st >= 1 && st <= 3; }

  /* ---------- Chiffres clés ---------- */
  function totals(log) {
    var t = { players: log.P.length, rounds: log.R.length, answers: 0, correct: 0, wrong: 0, none: 0, accuracy: null, avgTime: null, cheats: log.C.length };
    var timeSum = 0, timeN = 0;
    log.R.forEach(function (R) {
      R.r.forEach(function (e) {
        if (!isAnswer(e[0])) return;
        t.answers++;
        if (e[0] === 1) t.correct++; else if (e[0] === 2) t.wrong++; else t.none++;
        if (e[0] === 1 || e[0] === 2) { timeSum += e[1]; timeN++; }
      });
    });
    t.accuracy = t.answers ? t.correct / t.answers : null;
    t.avgTime = timeN ? timeSum / timeN : null;
    return t;
  }

  /* ---------- Une ligne par joueur ---------- */
  function perPlayer(log) {
    var rows = log.P.map(function (p, idx) {
      return { idx: idx, id: p.i, name: p.n, avatar: p.a, host: !!p.h, left: !!p.x,
        correct: 0, wrong: 0, none: 0, absent: 0, answered: 0, accuracy: null, avgTime: null,
        final: 0, bestGain: 0, cheats: 0, rank: 0, bestStreak: 0, fastest: null, _t: 0, _tn: 0, _run: 0 };
    });
    var prev = rows.map(function () { return 0; });
    log.R.forEach(function (R) {
      R.r.forEach(function (e, k) {
        var row = rows[k]; if (!row) return;
        var st = e[0];
        if (st === 0) { row.absent++; return; }
        row.answered++;
        if (st === 1) row.correct++; else if (st === 2) row.wrong++; else row.none++;
        if (st === 1) { row._run++; if (row._run > row.bestStreak) row.bestStreak = row._run; if (e[1] > 0 && (row.fastest === null || e[1] < row.fastest)) row.fastest = e[1]; } else row._run = 0;
        if (st === 1 || st === 2) { row._t += e[1]; row._tn++; }
        row.bestGain = Math.max(row.bestGain, e[2] - prev[k]);
        prev[k] = e[2];
        row.final = e[2];
      });
    });
    log.C.forEach(function (c) { var row = rows[c[0]]; if (row) row.cheats = Math.max(row.cheats, c[1]); });
    rows.forEach(function (r) {
      r.accuracy = r.answered ? r.correct / r.answered : null;
      r.avgTime = r._tn ? r._t / r._tn : null;
      delete r._t; delete r._tn; delete r._run;
    });
    rows.slice().sort(function (a, b) { return b.final - a.final || a.idx - b.idx; })
      .forEach(function (r, i, arr) { r.rank = i > 0 && arr[i - 1].final === r.final ? arr[i - 1].rank : i + 1; });
    return rows;
  }

  /* ---------- Évolution des scores : valeurs[0] = 0 avant la 1ʳᵉ question, null = hors partie ---------- */
  function scoreSeries(log) {
    return log.P.map(function (p, idx) {
      var values = [0];
      log.R.forEach(function (R) { var e = R.r[idx]; values.push(e && e[0] !== 0 ? e[2] : null); });
      return { idx: idx, name: p.n, avatar: p.a, values: values };
    });
  }


  /* ---------- Analyses avancées ---------- */
  /* Classement après chaque question (1 = en tête ; ex æquo : même rang, le suivant saute). values[0] = départ (tous 1er). null = joueur absent. */
  function rankSeries(log) {
    var sc = scoreSeries(log), n = log.R.length;
    return sc.map(function (s) {
      var values = [];
      for (var q = 0; q <= n; q++) {
        var v = s.values[q]; if (v === null || v === undefined) { values.push(null); continue; }
        var better = 0; sc.forEach(function (o) { var w = o.values[q]; if (w !== null && w !== undefined && w > v) better++; });
        values.push(better + 1);
      }
      return { idx: s.idx, name: s.name, avatar: s.avatar, values: values };
    });
  }
  /* Forme du moment : % de bonnes réponses sur les w dernières questions auxquelles le joueur était présent (null s'il n'en avait aucune). */
  function formSeries(log, w) {
    w = Math.max(1, Math.min(10, Math.round(Number(w) || 3)));
    return log.P.map(function (p, idx) {
      var values = [null];
      for (var q = 1; q <= log.R.length; q++) {
        var good = 0, tot = 0;
        for (var k = Math.max(0, q - w); k < q; k++) { var e = log.R[k].r[idx]; if (e && e[0] !== 0) { tot++; if (e[0] === 1) good++; } }
        values.push(tot ? Math.round(good / tot * 1000) / 10 : null);
      }
      return { idx: idx, name: p.n, avatar: p.a, values: values };
    });
  }
  /* Qui mène ? Manches passées en tête (ex æquo compté pour chacun), plus longue période en tête, nombre de changements de leader (leader unique). */
  function leadStats(log) {
    var sc = scoreSeries(log), n = log.R.length, np = log.P.length;
    var rows = log.P.map(function (p, idx) { return { idx: idx, name: p.n, avatar: p.a, led: 0, longest: 0, run: 0 }; });
    var changes = 0, soleRounds = 0, prevSole = -1;
    for (var q = 1; q <= n; q++) {
      var best = null, leaders = [];
      for (var i = 0; i < np; i++) { var v = sc[i].values[q]; if (v === null || v === undefined) continue; if (best === null || v > best) { best = v; leaders = [i]; } else if (v === best) leaders.push(i); }
      rows.forEach(function (r) { if (leaders.indexOf(r.idx) >= 0) { r.led++; r.run++; if (r.run > r.longest) r.longest = r.run; } else r.run = 0; });
      if (leaders.length === 1) { soleRounds++; if (prevSole >= 0 && prevSole !== leaders[0]) changes++; prevSole = leaders[0]; }
    }
    rows.forEach(function (r) { delete r.run; });
    return { players: rows, changes: changes, soleRounds: soleRounds, n: n };
  }

  /* ---------- Réussite par thème / difficulté / présence d'un média ---------- */
  function groupBy(log, keyFn, labelFn) {
    var map = {}, order = [];
    log.R.forEach(function (R) {
      var key = keyFn(R); if (key === null) return;
      var g = map[key]; if (!g) { g = map[key] = { key: key, label: labelFn ? labelFn(key) : key, answers: 0, correct: 0, questions: 0 }; order.push(key); }
      g.questions++;
      R.r.forEach(function (e) { if (!isAnswer(e[0])) return; g.answers++; if (e[0] === 1) g.correct++; });
    });
    return order.map(function (k) { var g = map[k]; g.rate = g.answers ? g.correct / g.answers : null; return g; });
  }
  function byCategory(log) {
    return groupBy(log, function (R) { return R.c || "Sans thème"; })
      .sort(function (a, b) { return (a.rate === null) - (b.rate === null) || b.rate - a.rate || a.label.localeCompare(b.label); });
  }
  function byDifficulty(log) {
    return groupBy(log, function (R) { return R.d; }).sort(function (a, b) { return DIFFS.indexOf(a.key) - DIFFS.indexOf(b.key); });
  }
  function byMedia(log) {
    return groupBy(log, function (R) { return R.m ? "media" : "texte"; }, function (k) { return k === "media" ? "Avec image / vidéo" : "Texte seul"; });
  }

  /* ---------- Réussite question par question ---------- */
  function roundStats(log) {
    return log.R.map(function (R, i) {
      var a = 0, c = 0, tSum = 0, tN = 0;
      R.r.forEach(function (e) { if (!isAnswer(e[0])) return; a++; if (e[0] === 1) c++; if (e[0] === 1 || e[0] === 2) { tSum += e[1]; tN++; } });
      return { round: i + 1, q: R.q, c: R.c, d: R.d, m: R.m, answers: a, correct: c, rate: a ? c / a : null, avgTime: tN ? tSum / tN : null };
    });
  }
  function hardest(log, n) {
    return roundStats(log).filter(function (r) { return r.answers > 0; })
      .sort(function (a, b) { return a.rate - b.rate || b.answers - a.answers || a.round - b.round; }).slice(0, n || 5);
  }
  function easiest(log, n) {
    return roundStats(log).filter(function (r) { return r.answers > 0; })
      .sort(function (a, b) { return b.rate - a.rate || b.answers - a.answers || a.round - b.round; }).slice(0, n || 5);
  }

  /* ---------- Répartition des temps de réponse (6 tranches égales) ---------- */
  function timeHistogram(log) {
    var times = [], maxT = 0;
    log.R.forEach(function (R) { R.r.forEach(function (e) { if (e[0] === 1 || e[0] === 2) { times.push([e[0], e[1]]); if (e[1] > maxT) maxT = e[1]; } }); });
    if (!times.length) return { n: 0, width: 0, buckets: [] };
    var top = Math.max(log.qt || 0, maxT, 1), width = Math.max(1, Math.ceil(top / 6)), n = Math.min(6, Math.ceil(top / width));
    var buckets = [];
    for (var i = 0; i < n; i++) buckets.push({ lo: i * width, hi: (i + 1) * width, label: (i * width) + "–" + ((i + 1) * width) + " s", correct: 0, wrong: 0 });
    times.forEach(function (t) { var b = buckets[Math.min(n - 1, Math.floor(t[1] / width))]; if (t[0] === 1) b.correct++; else b.wrong++; });
    return { n: times.length, width: width, buckets: buckets };
  }

  /* ---------- Faits marquants : série, rapidité, gain, régularité ---------- */
  function highlights(log) {
    var rows = perPlayer(log), out = [];
    function pick(key, keep, cmp) { var c = rows.filter(keep).sort(cmp)[0]; if (c) out.push({ key: key, idx: c.idx, name: c.name, avatar: c.avatar, row: c }); }
    pick("streak", function (r) { return r.bestStreak >= 2; }, function (a, b) { return b.bestStreak - a.bestStreak || a.idx - b.idx; });
    pick("fastest", function (r) { return r.fastest !== null; }, function (a, b) { return a.fastest - b.fastest || a.idx - b.idx; });
    pick("gain", function (r) { return r.bestGain > 0; }, function (a, b) { return b.bestGain - a.bestGain || a.idx - b.idx; });
    pick("accuracy", function (r) { return r.answered >= 3 && r.accuracy !== null; }, function (a, b) { return b.accuracy - a.accuracy || b.answered - a.answered || a.idx - b.idx; });
    return out;
  }

  /* ---------- Historique ---------- */
  function summarize(log) {
    var rows = perPlayer(log), t = totals(log);
    var best = rows.slice().sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; })[0];
    return { id: log.id, at: log.at, players: log.P.length, rounds: log.R.length, accuracy: t.accuracy, cheats: t.cheats,
      winner: best ? best.name : "", winnerScore: best ? best.final : 0 };
  }
  /* Ajoute une partie en tête de liste (sans doublon d'identifiant) en gardant l'ensemble sous maxBytes. */
  function addToHistory(list, log, max, maxBytes) {
    max = max || 12; maxBytes = maxBytes || 1200000;
    var out = [log].concat((list || []).filter(function (g) { return g && g.id !== log.id; })).slice(0, max);
    while (out.length > 1 && JSON.stringify(out).length > maxBytes) out.pop();
    return out;
  }

  /* ---------- Export CSV (séparateur « ; », ouvrable dans Excel / LibreOffice) ---------- */
  function csvCell(v) {
    var s = String(v === null || v === undefined ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;           /* neutralise les formules de tableur */
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(log) {
    var names = { 0: "hors partie", 1: "bonne réponse", 2: "mauvaise réponse", 3: "pas de réponse" };
    var lines = [["question", "thème", "difficulté", "média", "joueur", "résultat", "temps_s", "score_cumulé"].join(";")];
    log.R.forEach(function (R, i) {
      R.r.forEach(function (e, k) {
        lines.push([i + 1 + ". " + R.q, R.c, R.d, R.m ? "oui" : "non", log.P[k].n, names[e[0]], e[0] === 1 || e[0] === 2 ? String(e[1]).replace(".", ",") : "", e[2]].map(csvCell).join(";"));
      });
    });
    return lines.join("\r\n");
  }

  /* ---------- Bonus et malus (pouvoirs gagnés en enchaînant les bonnes réponses) ---------- */
  var POWER_NAMES = { "1:xp": "Points bonus", "1:shield": "Bouclier", "1:double": "Points ×2", "1:jackpot": "Jackpot", "1:triple": "Points ×3",
    "2:xp": "Pénalité", "2:freeze": "Gel du combo", "2:steal": "Vol de points", "2:crush": "Impact", "2:halve": "Moitié du score",
    "1:w_xp": "Roue : +300", "1:w_jackpot": "Roue : jackpot +1000", "1:w_double": "Roue : points ×2", "1:w_shield": "Roue : bouclier",
    "2:w_xp": "Roue : −200", "2:w_crush": "Roue : −500", "2:w_tax": "Roue : impôt −15 %", "2:w_freeze": "Roue : série brisée" };
  function powerName(b) { return POWER_NAMES[b[3] + ":" + b[4]] || b[7] || b[4]; }
  /* « Gagnés » : points bonus, jackpot, points volés. « Perdus » : points retirés par un malus non bloqué. Les pouvoirs
     spéciaux (sans montant) comptent dans les effectifs mais pas dans les points. */
  function powers(log) {
    var np = log.P.length, nr = log.R.length, B = log.B || [];
    var pl = log.P.map(function (p, i) { return { idx: i, name: p.n, avatar: p.a, bonusGiven: 0, malusGiven: 0, malusReceived: 0, shieldSaves: 0, blockedOnMe: 0, reflected: 0, gained: 0, lost: 0, dealt: 0, net: 0, wheelBonus: 0, wheelMalus: 0, wheelBlocked: 0, wheelGain: 0, wheelLoss: 0 }; });
    var kinds = {}, matrix = pl.map(function () { return pl.map(function () { return 0; }); });
    var perRound = []; for (var r = 0; r < Math.max(nr, 1); r++) perRound.push({ bonus: 0, malus: 0, points: 0 });
    var delta = pl.map(function () { var a = []; for (var q = 0; q <= Math.max(nr, 1); q++) a.push(0); return a; });
    var out = { total: B.length, bonus: 0, malus: 0, blocked: 0, reflected: 0, points: 0, players: pl, kinds: [], matrix: matrix, perRound: perRound, netSeries: [], wheel: { spins: 0, bonus: 0, malus: 0, blocked: 0, gained: 0, lost: 0 } };
    B.forEach(function (b) {
      var round = Math.min(b[0], Math.max(nr, 1)), g = pl[b[1]], t = b[2] >= 0 ? pl[b[2]] : null, blocked = !!(b[6] & 1), refl = !!(b[6] & 2), amt = b[5];
      var key = b[3] + ":" + b[4], k = kinds[key] || (kinds[key] = { key: key, label: powerName(b), choice: b[3], count: 0, points: 0, blocked: 0 });
      k.count++;
      if (/^w_/.test(b[4])) {                                  /* 🎡 roue : comptée à part (ni « lancé » ni « visé »), mais incluse dans les points et le bilan net */
        var rr = perRound[round - 1]; out.wheel.spins++;
        if (b[3] === 1) { out.wheel.bonus++; g.wheelBonus++; rr.bonus++; if (amt > 0) { g.gained += amt; g.wheelGain += amt; k.points += amt; out.points += amt; rr.points += amt; delta[g.idx][round] += amt; out.wheel.gained += amt; } }
        else {
          out.wheel.malus++; g.wheelMalus++; rr.malus++;
          if (blocked) { k.blocked++; out.wheel.blocked++; g.wheelBlocked++; }
          else if (amt > 0) { g.lost += amt; g.wheelLoss += amt; k.points += amt; out.points += amt; rr.points += amt; delta[g.idx][round] -= amt; out.wheel.lost += amt; }
        }
        return;
      }
      if (b[3] === 1) { g.bonusGiven++; out.bonus++; perRound[round - 1].bonus++; if (amt > 0) { g.gained += amt; k.points += amt; out.points += amt; perRound[round - 1].points += amt; delta[g.idx][round] += amt; } return; }
      g.malusGiven++; out.malus++; perRound[round - 1].malus++;
      if (t) { t.malusReceived++; matrix[g.idx][t.idx]++; }
      if (blocked || refl) {
        k.blocked++; out.blocked++; if (refl) { out.reflected++; if (t) t.reflected++; }
        if (t) t.shieldSaves++; g.blockedOnMe++;
        return;
      }
      if (amt > 0 && t) {
        t.lost += amt; g.dealt += amt; k.points += amt; out.points += amt; perRound[round - 1].points += amt; delta[t.idx][round] -= amt;
        if (b[4] === "steal") { g.gained += amt; delta[g.idx][round] += amt; }
      }
    });
    pl.forEach(function (p) { p.net = p.gained - p.lost; });
    out.kinds = Object.keys(kinds).map(function (x) { return kinds[x]; }).sort(function (a, b) { return b.count - a.count || (a.key < b.key ? -1 : 1); });
    out.netSeries = pl.map(function (p, i) { var v = [0], run = 0; for (var q = 1; q <= nr; q++) { run += delta[i][q]; v.push(run); } return { idx: i, values: v }; });
    return out;
  }

  return { DIFFS: DIFFS, powers: powers, powerName: powerName, MAX_POWERS: MAX_POWERS, MAX_ROUNDS: MAX_ROUNDS, MAX_PLAYERS: MAX_PLAYERS, normalize: normalize, normalizeRound: normalizeRound, totals: totals, perPlayer: perPlayer, scoreSeries: scoreSeries, rankSeries: rankSeries, formSeries: formSeries, leadStats: leadStats, byCategory: byCategory,
    byDifficulty: byDifficulty, byMedia: byMedia, roundStats: roundStats, timeHistogram: timeHistogram, highlights: highlights, hardest: hardest, easiest: easiest, summarize: summarize,
    addToHistory: addToHistory, toCSV: toCSV, csvCell: csvCell,
    tokenize: tokenize, newChat: newChat, addChat: addChat, normalizeChat: normalizeChat, textStats: textStats, textReport: textReport, textReportTxt: textReportTxt, reactionStats: reactionStats, quantile: quantile };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V40Analysis;
if (typeof window !== "undefined") window.V40Analysis = V40Analysis;
