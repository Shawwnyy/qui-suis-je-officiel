/* =============================================================================
   V43 — Justifications des réponses (bonne ou mauvaise)

   Après chaque question, la carte « Correction » montre :
     • un verdict (bonne réponse / réponse fausse / temps écoulé) avec le temps mis ;
     • la bonne réponse sous forme de PHRASE (« La capitale de la France est Paris. ») quand la question s'y prête ;
     • l'explication propre à la question si elle existe (questions illustrées, perso, générées) ;
     • si la réponse est fausse : ce que tu as répondu, l'écart chiffré quand les deux réponses sont des nombres
       (années, quantités…), et un « À retenir » ;
     • ce que la partie en cours dit de la question : combien de joueurs l'ont réussie, le plus rapide, ton rang de vitesse.
   Rien n'est inventé : les phrases viennent de la question et de la réponse, les chiffres du journal de la partie.
   Aucun accès au DOM dans explain() : testable avec Node (tests/justif.test.js).
   ============================================================================= */
var V43Justif = (function () {
  "use strict";
  function strip(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function cap(s) { s = strip(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function endDot(s) { s = strip(s); return /[.!?…]$/.test(s) ? s : s + "."; }
  function secs(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(".", ",") + " s"; }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }

  /* « de la France » → « de la France » ; « d'Italie » ; « du Japon » */
  var BOILER = /cette correction permet de retenir|^la bonne réponse est «[^»]*»\.?$/i;
  function specificCorrection(q) {
    var c = strip(q && q.correction);
    if (!c || BOILER.test(c) || /^(bonne réponse|correct answer|respuesta correcta)\s*:/i.test(c)) return "";
    return c;
  }

  /* Question → phrase affirmative. Une seule règle par forme de question, volontairement prudentes :
     si la forme n'est pas reconnue, on renvoie "" et la carte affiche « À retenir » à la place. */
  var RULES = [
    [/^quelle est la capitale (de la|du|des|de l'|d'|de) ?(.+?) ?\?$/i, function (m, a) { return "La capitale " + joinDe(m[1], m[2]) + " est " + a + "."; }],
    [/^quel est (le|l') ?(.+?) ?\?$/i, function (m, a) { return cap(m[1] === "l'" ? "l'" + m[2] : "le " + m[2]) + " est " + a + "."; }],
    [/^quelle est (la|l') ?(.+?) ?\?$/i, function (m, a) { return cap(m[1] === "l'" ? "l'" + m[2] : "la " + m[2]) + " est " + a + "."; }],
    [/^quels sont (les) (.+?) ?\?$/i, function (m, a) { return "Les " + m[2] + " sont " + a + "."; }],
    [/^quelles sont (les) (.+?) ?\?$/i, function (m, a) { return "Les " + m[2] + " sont " + a + "."; }],
    [/^qui est (le|la|l') ?(.+?) ?\?$/i, function (m, a) { return cap(a) + " est " + (m[1] === "l'" ? "l'" : m[1] + " ") + m[2] + "."; }],
    [/^qui (a|ont) (.+?) ?\?$/i, function (m, a) { return cap(a) + " " + m[1] + " " + m[2] + "."; }],
    [/^qui (est|était|fut) (.+?) ?\?$/i, function (m, a) { return cap(a) + " " + m[1] + " " + m[2] + "."; }],
    [/^comment s'appelle (le|la|l'|les|un|une) ?(.+?) ?\?$/i, function (m, a) { return cap((m[1] === "l'" ? "l'" : m[1] + " ") + m[2]) + " s'appelle " + a + "."; }]
  ];
  function joinDe(art, name) { return art === "de l'" || art === "d'" ? art + name : art + " " + name; }
  /* Réponse qui est déjà une phrase (« Aucun, le Capricorne ne traverse pas l'équateur », « Oui », « Tous ») : on ne la glisse pas dans « La capitale de X est … ». */
  function sentenceLike(a) {
    a = strip(a);
    return a.length > 45 || /[,;:]/.test(a) || /^(aucune?|oui|non|tous|toutes|personne|rien|jamais|ni |ils |elles |il |elle |on )/i.test(a) || (a.split(" ").length > 6);
  }
  function sentence(question, answer) {
    var q = strip(question), a = strip(answer);
    if (!q || !a || q.length > 160 || a.length > 80 || sentenceLike(a)) return "";
    for (var i = 0; i < RULES.length; i++) {
      var m = RULES[i][0].exec(q);
      if (m) { var s = RULES[i][1](m, a); return s && s.length <= 220 ? s : ""; }
    }
    return "";
  }

  /* Nombre contenu dans une réponse (« 1 789 », « 12 %», « 3,5 ») — null si ce n'est pas un nombre */
  function num(s) {
    var t = strip(s).replace(/[   ]/g, "").replace(",", ".");
    if (!/^[-−]?\d+(\.\d+)?(%|°c|°|km|m|kg|g|h|min|s|ans?)?$/i.test(t)) return null;
    var v = parseFloat(t.replace("−", "-"));
    return isFinite(v) ? v : null;
  }
  function gap(mine, right, qText) {
    var a = num(mine), b = num(right);
    if (a === null || b === null || a === b) return "";
    var d = Math.abs(a - b), year = /\b(en quelle ann[ée]e|ann[ée]e|date)\b/i.test(qText) && a >= 0 && b >= 0 && a < 3000 && b < 3000;
    var dd = Math.round(d * 100) / 100, txt = String(dd).replace(".", ",");
    if (year) return "Tu es " + plural(Math.round(d), "an", "ans") + (a < b ? " trop tôt" : " trop tard") + " : la date exacte est " + strip(right) + ".";
    return "Ta réponse est " + (a < b ? "trop basse" : "trop haute") + " de " + txt + ".";
  }


  /* ---------- Questions générées depuis un cours : q.lesson = { s: phrase source, c: passage (phrase + voisines), p: page, t: titre } ---------- */
  function lessonOf(q) {
    var l = q && q.lesson;
    if (!l || typeof l !== "object" || typeof l.s !== "string") return null;
    var s = strip(l.s).slice(0, 300); if (!s) return null;
    var c = typeof l.c === "string" ? strip(l.c).slice(0, 600) : s;
    if (!c || c.indexOf(s.slice(0, 25)) < 0) c = s;
    var p = Math.round(Number(l.p));
    return { s: s, c: c, p: p > 0 && p < 10000 ? p : 0, t: strip(typeof l.t === "string" ? l.t : "").slice(0, 80) };
  }
  function nrm(s) { return strip(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function hasWord(text, ans) {
    var a = nrm(ans); if (a.length < 1) return false;
    try { return new RegExp("(^|[^a-z0-9])" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z0-9])").test(nrm(text)); } catch (e) { return false; }
  }
  function where(L) { return L.p ? " (page " + L.p + (L.t ? " de « " + L.t + " »" : "") + ")" : (L.t ? " (« " + L.t + " »)" : ""); }

  /* « Ta réponse est en fait la bonne réponse d'une autre question » : index réponse → question, construit à partir de la banque.
     Une question illustrée (« Quel est cet animal ? ») n'a pas de sens sans son image : elle n'est jamais citée. */
  var SKIP_ANS = /^(oui|non|vrai|faux|aucun|aucune|les deux|tous|toutes|a|b|c|d|\d)$/i;
  function key(a) { return strip(a).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^(le |la |les |l'|un |une |du |des |de la |d')/, ""); }
  function buildIndex(questions) {
    var idx = Object.create(null);
    (questions || []).forEach(function (q) {
      if (!q || q.media || q.v26Expanded || q.v42Mix || q.v41Img || q.v41Road || q.v47More || !Array.isArray(q.answers) || typeof q.correct !== "number") return;
      var a = strip(q.answers[q.correct]); if (a.length < 3 || SKIP_ANS.test(a)) return;
      var k = key(a); if (!k) return;
      var list = idx[k] || (idx[k] = []);
      if (list.length < 6 && strip(q.question).length <= 140) list.push({ q: strip(q.question), c: q.category || "" });
    });
    return idx;
  }
  function related(idx, answer, q) {
    if (!idx) return "";
    var list = idx[key(answer)]; if (!list) return "";
    var here = strip(q && q.question).toLowerCase(), cat = q && q.category || "", best = "";
    for (var i = 0; i < list.length; i++) {
      var o = list[i], t = o.q.toLowerCase();
      if (t === here || here.indexOf(t) >= 0 || t.indexOf(here) >= 0) continue;
      if (o.c === cat) return o.q;
      if (!best) best = o.q;
    }
    return best;
  }

  /* Statistiques de la partie en cours pour la dernière question (journal V40 : R[i].r[k] = [état, secondes, score]) */
  function roundStats(log, myId) {
    if (!log || !Array.isArray(log.R) || !log.R.length || !Array.isArray(log.P)) return null;
    var R = log.R[log.R.length - 1], r = R && R.r;
    if (!Array.isArray(r)) return null;
    var answered = 0, good = 0, best = null, me = -1, times = [];
    log.P.forEach(function (P, k) {
      var c = r[k]; if (!c) return;
      if (P.i === myId) me = k;
      if (c[0] === 1 || c[0] === 2) { answered++; if (c[0] === 1) { good++; if (c[1] > 0 && (!best || c[1] < best.t)) best = { name: P.n, t: c[1], k: k }; } }
      if (c[0] === 1 && c[1] > 0) times.push(c[1]);
    });
    if (!answered && !r.some(function (c) { return c && c[0] === 3; })) return null;
    var inGame = r.filter(function (c) { return c && c[0] >= 1 && c[0] <= 3; }).length;
    var mine = me >= 0 && r[me] ? r[me] : null, slower = null;
    if (mine && mine[0] === 1 && mine[1] > 0 && times.length > 1) slower = times.filter(function (t) { return t > mine[1]; }).length;
    return { players: inGame, answered: answered, good: good, best: best, mineState: mine ? mine[0] : 0, mineTime: mine ? mine[1] : 0, slower: slower, rate: inGame ? good / inGame : null };
  }

  /* ---------- 💰 Tes points : d'où viennent les points gagnés ou perdus sur cette question ---------- */
  function fmt(n) { n = Math.round(Number(n) || 0); return (n < 0 ? "−" : "") + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }
  function sgn(n) { n = Math.round(Number(n) || 0); return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n)); }
  /* Lit le journal de la manche (js/stats) : score avant / après, série en cours, pouvoirs qui m'ont touché ou que j'ai lancés. */
  function pointsFromLog(log, myId, nameOf) {
    if (!log || !Array.isArray(log.R) || !log.R.length || !Array.isArray(log.P)) return null;
    var me = -1; log.P.forEach(function (P, k) { if (P && P.i === myId) me = k; });
    if (me < 0) return null;
    var n = log.R.length, cur = log.R[n - 1] && log.R[n - 1].r && log.R[n - 1].r[me];
    if (!cur || !(cur[0] >= 1 && cur[0] <= 3)) return null;
    var prev = 0, k; for (k = n - 2; k >= 0; k--) { var e = log.R[k] && log.R[k].r && log.R[k].r[me]; if (e && e[0] !== 0) { prev = Number(e[2]) || 0; break; } }
    var combo = 0; for (k = n - 1; k >= 0; k--) { var f = log.R[k] && log.R[k].r && log.R[k].r[me]; if (f && f[0] === 1) combo++; else break; }
    var powers = [];
    (Array.isArray(log.B) ? log.B : []).forEach(function (b) {
      if (!Array.isArray(b) || b[0] !== n || (b[1] !== me && b[2] !== me)) return;
      var nm = typeof nameOf === "function" ? nameOf(b) : (b[7] || b[4]);
      powers.push({ choice: b[3], amount: Number(b[5]) || 0, blocked: !!(b[6] & 1), reflected: !!(b[6] & 2), mine: b[1] === me, target: b[2] === me, name: strip(nm), giver: log.P[b[1]] ? strip(log.P[b[1]].n) : "", victim: b[2] >= 0 && log.P[b[2]] ? strip(log.P[b[2]].n) : "", wheel: /^w_/.test(String(b[4])) });
    });
    return { before: prev, after: Number(cur[2]) || 0, combo: combo, powers: powers };
  }
  /* p : { mult, streak, pts: pointsFromLog() ou null } — sans journal on explique tout de même la question (or, piège, éclair…) */
  function pointsLines(q, ok, none, p) {
    p = p || {}; var out = [], pt = p.pts || null, delta = pt ? pt.after - pt.before : null, trap = !!(q && q.trap);
    if (pt) out.push({ k: "points", t: "Tes points sur cette question : " + sgn(delta) + " pts (" + fmt(pt.before) + " → " + fmt(pt.after) + ")" + (delta === 0 ? " : rien n'a bougé." : ".") });
    if (ok) {
      var parts = ["500 de base", "+ vitesse (25 pts par seconde restante)"];
      if (pt && pt.combo > 0) parts.push("+ combo (" + fmt(Math.min(pt.combo * 100, 1000)) + " pts pour " + plural(pt.combo, "bonne réponse", "bonnes réponses") + " d'affilée)");
      else parts.push("+ combo (100 pts par bonne réponse d'affilée, 1 000 au plus)");
      out.push({ k: "points", t: "Calcul : " + parts.join(" ") + (p.mult > 0 ? ", le tout × " + p.mult + " (difficulté " + strip(q && q.difficulty) + ")" : ", le tout × le coefficient de difficulté") + "." });
    }
    if (q && q.golden) out.push({ k: "mult", t: ok ? "Question en or : tes points sont doublés (×2)." : "Question en or : les bonnes réponses valaient le double." });
    if (q && q.event === "eclair") out.push({ k: "mult", t: ok ? "Question éclair : tes points sont multipliés par 1,5 (chrono plus court)." : "Question éclair : chrono plus court, points ×1,5 pour les bonnes réponses." });
    if (q && q.event === "chance" && ok) out.push({ k: "mult", t: "Question chance : +200 pts offerts." });
    if (trap) out.push({ k: "mult", t: ok ? "Question piège déjouée : tes points sont multipliés par 5." : none ? "Question piège : sans réponse, tu ne gagnes rien." : "Question piège : une mauvaise réponse coûte 300 pts." });
    if (ok && p.streak && pt && pt.combo > 0 && pt.combo % 5 === 0) out.push({ k: "mult", t: "Série de " + pt.combo + " : palier de +" + fmt(500 * (pt.combo / 5)) + " pts." });
    if (!ok && !none && !trap && pt) out.push({ k: "mult", t: delta <= -200 ? "Pénalité de 200 pts : deux mauvaises réponses (un bouclier l'aurait annulée)." : "Pas de pénalité cette fois : elle tombe à la 2ᵉ mauvaise réponse (−200 pts)." });
    if (pt) pt.powers.slice(0, 6).forEach(function (w) {
      var nm = "« " + (w.name || "pouvoir") + " »", amt = w.amount > 0 ? " (" + fmt(w.amount) + " pts)" : "";
      if (w.choice === 1) { if (w.mine) out.push({ k: "power", t: (w.wheel ? "Roue : " : "Ton bonus ") + nm + (w.amount > 0 ? " : +" + fmt(w.amount) + " pts." : " est actif.") }); return; }
      if (w.wheel) { out.push({ k: "power", t: "Roue : malus " + nm + (w.blocked ? " bloqué." : w.amount > 0 ? " : −" + fmt(w.amount) + " pts." : ".") }); return; }
      if (w.mine && !w.target) out.push({ k: "power", t: "Ton malus " + nm + (w.victim ? " sur " + w.victim : "") + (w.blocked ? " a été bloqué." : w.reflected ? " t'est revenu : renvoyé par le Miroir." : w.amount > 0 ? " : −" + fmt(w.amount) + " pts pour lui." : " a fait effet.") });
      else if (w.target && !w.mine) out.push({ k: "power", t: "Malus " + nm + (w.giver ? " lancé par " + w.giver : "") + (w.blocked ? " : bloqué, tu ne perds rien." : w.reflected ? " : renvoyé sur lui par ton Miroir." : w.amount > 0 ? " : −" + fmt(w.amount) + " pts pour toi." : " : il fait effet sur toi.") });
    });
    return out;
  }

  /* explain(q, ctx) → { tone, headline, lines:[{k, t}], speech }
       q   : question affichée (answers, correct, question, correction, difficulty)
       ctx : { mine: index choisi ou null, correct: index, stats: roundStats(), time: secondes,
               points: { mult, streak, pts: pointsFromLog() } }                                              */
  function explain(q, ctx) {
    ctx = ctx || {};
    var answers = (q && q.answers) || [], ci = typeof ctx.correct === "number" ? ctx.correct : (q ? q.correct : -1);
    var right = strip(answers[ci]), mineIdx = typeof ctx.mine === "number" ? ctx.mine : null;
    var mine = mineIdx !== null && mineIdx >= 0 ? strip(answers[mineIdx]) : "";
    var ok = mineIdx !== null && mineIdx === ci, none = mineIdx === null || mineIdx < 0;
    var st = ctx.stats || null, time = ctx.time > 0 ? ctx.time : (st && st.mineTime > 0 ? st.mineTime : 0);
    var out = { tone: none ? "none" : ok ? "good" : "bad", headline: "", lines: [], speech: "" };
    var hard = q && (q.difficulty === "difficile" || q.difficulty === "impossible");
    if (ok) out.headline = "✅ Bonne réponse !" + (time ? " Trouvée en " + secs(time) + "." : "");
    else if (none) out.headline = "⏱️ Temps écoulé : tu n'as pas répondu.";
    else out.headline = "❌ Raté : tu as répondu « " + mine + " ».";
    var L = lessonOf(q), sen = sentence(q && q.question, right), exp = L ? "" : specificCorrection(q);
    out.lines.push({ k: "answer", t: "La bonne réponse : « " + right + " »." });
    if (sen) out.lines.push({ k: "sentence", t: sen });
    if (L) out.lines.push({ k: "lesson", t: "Ce que dit le cours" + where(L) + " :", quote: ok ? L.s : L.c, hl: right });
    if (exp) out.lines.push({ k: "explain", t: endDot(exp) });
    if (!ok && !none) {
      var g = gap(mine, right, strip(q && q.question));
      if (L) {
        if (g) out.lines.push({ k: "why", t: g });
        out.lines.push({ k: "why", t: !hasWord(L.c, right) ? "« " + mine + " » ne répond pas à la question posée : la bonne réponse est « " + right + " »."
          : hasWord(L.c, mine) ? "« " + mine + " » apparaît bien dans ce passage, mais ce n'est pas lui qui répond à la question : relis la phrase."
          : "« " + mine + " » ne figure pas dans ce passage du cours : seule « " + right + " » y est écrite." });
      } else out.lines.push({ k: "why", t: g || ("« " + mine + " » ne répond pas à la question posée : seule « " + right + " » convient.") });
      var rel = ctx.index ? related(ctx.index, mine, q) : "";
      if (rel) out.lines.push({ k: "related", t: "Attention à la confusion : « " + mine + " » est en fait la bonne réponse à une autre question : « " + rel + " »" });
    }
    if (L && !ok) out.lines.push({ k: "remember", t: "À réviser : " + (L.p ? "page " + L.p + " de " : "") + (L.t ? "« " + L.t + " »" : "le cours") + "." });
    if (!sen && !exp && !L && !sentenceLike(right)) out.lines.push({ k: "remember", t: "À retenir : la réponse à « " + strip(q && q.question).replace(/\s*\?$/, "") + " ? » est « " + right + " »." });
    if (ok && hard) out.lines.push({ k: "bonus", t: "Bravo : c'était une question " + q.difficulty + "." });
    if (!ok && !none && hard) out.lines.push({ k: "bonus", t: "Pas de honte : c'était une question " + q.difficulty + "." });
    if (ctx.points) pointsLines(q, ok, none, ctx.points).forEach(function (l) { out.lines.push(l); });
    if (st && st.players > 0) {
      var parts = [];
      parts.push(plural(st.good, "joueur a", "joueurs ont") + " trouvé la bonne réponse sur " + st.players + " (" + Math.round(st.good / st.players * 100) + " %)");
      if (st.best) parts.push("le plus rapide : " + st.best.name + " en " + secs(st.best.t));
      if (ok && st.slower !== null && st.players > 1) parts.push("tu as été plus rapide que " + plural(st.slower, "joueur", "joueurs") + " parmi les bonnes réponses");
      out.lines.push({ k: "stats", t: cap(parts.join(" · ")) + "." });
    }
    /* sans « Bonne / Mauvaise réponse » : le narrateur existant le dit déjà */
    out.speech = [none ? "Temps écoulé." : "", "La bonne réponse était " + right + ".", L ? "Le cours dit : " + L.s : (sen || exp || "")].filter(Boolean).join(" ");
    return out;
  }

  /* ---------- Rapport : « bonne réponse + pourquoi » d'une question, courts et sans chiffres de la partie ----------
     reportNote(q) → { a: bonne réponse, w: justification } (w peut être vide si rien de sensé à dire).
     Ordre : le cours (phrase source) > l'explication propre à la question > la phrase affirmative > « À retenir ». */
  function cut(s, n) { s = strip(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
  function reportNote(q, ci) {
    var answers = (q && q.answers) || [], i = typeof ci === "number" ? ci : (q && typeof q.correct === "number" ? q.correct : -1);
    var right = strip(answers[i]); if (!right) return { a: "", w: "" };
    var L = lessonOf(q), exp = L ? "" : specificCorrection(q), sen = sentence(q && q.question, right), w = "";
    if (L) w = "Le cours dit : " + L.s + where(L);
    else if (exp) w = endDot(exp);
    else if (sen) w = sen;
    else if (!sentenceLike(right)) w = "À retenir : la réponse à « " + strip(q && q.question).replace(/\s*\?$/, "") + " ? » est « " + right + " ».";
    return { a: cut(right, 100), w: cut(w, 280) };
  }

  /* ---------- Affichage (navigateur) ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ICON = { points: "💰", mult: "✨", power: "⚡", lesson: "📖", answer: "🎯", sentence: "💡", explain: "📘", why: "🔎", related: "🔀", remember: "🧠", bonus: "⭐", stats: "📊" };
  /* Texte échappé avec la réponse mise en évidence (<mark>), au plus 4 occurrences. */
  function mark(text, hl) {
    var t = String(text == null ? "" : text), a = strip(hl);
    if (a.length < 1) return esc(t);
    var re; try { re = new RegExp("(^|[^\\p{L}\\p{N}])(" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![\\p{L}\\p{N}])", "giu"); } catch (e) { return esc(t); }
    var out = "", last = 0, m, n = 0;
    while (n < 4 && (m = re.exec(t))) { var st = m.index + m[1].length; out += esc(t.slice(last, st)) + "<mark>" + esc(m[2]) + "</mark>"; last = st + m[2].length; n++; if (!m[0].length) re.lastIndex++; }
    return out + esc(t.slice(last));
  }
  function html(ex) {
    return '<div class="v43j ' + ex.tone + '" role="group" aria-label="Justification de la réponse"><div class="v43j-head">' + esc(ex.headline) + "</div><ul>"
      + ex.lines.map(function (l) { return '<li class="v43-' + l.k + '"><span aria-hidden="true">' + (ICON[l.k] || "•") + "</span> " + esc(l.t) + (l.quote ? " <q>" + mark(l.quote, l.hl) + "</q>" : "") + "</li>"; }).join("") + "</ul></div>";
  }
  return { explain: explain, lessonOf: lessonOf, mark: mark, buildIndex: buildIndex, related: related, sentence: sentence, roundStats: roundStats, pointsFromLog: pointsFromLog, pointsLines: pointsLines, sentenceLike: sentenceLike, reportNote: reportNote, gap: gap, num: num, html: html, specificCorrection: specificCorrection };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V43Justif;
if (typeof window !== "undefined") {
  window.V43Justif = V43Justif;
  (function hook() {
    if (typeof showQuestionResult !== "function" || typeof displayQuestion !== "function") return;
    var baseShow = showQuestionResult, last = null, timer = 0, indexed = null, indexedN = -1;
    function bankIndex() { try { if (typeof QUESTIONS === "undefined") return null; if (!indexed || indexedN !== QUESTIONS.length) { indexed = V43Justif.buildIndex(QUESTIONS); indexedN = QUESTIONS.length; } return indexed; } catch (e) { return null; } }
    function draw(withStats) {
      try {
        var box = document.getElementById("v26Correction");
        if (!box || !last || typeof currentQuestion === "undefined" || !currentQuestion) return;
        var log = withStats && window.V40Stats && window.V40Stats.getLive ? window.V40Stats.getLive() : null;
        var st = log ? V43Justif.roundStats(log, typeof myId !== "undefined" ? myId : "") : null;
        var pts = null;
        try {
          var nameOf = window.V40Analysis && window.V40Analysis.powerName ? window.V40Analysis.powerName : null;
          pts = { mult: typeof DIFFICULTY_INFO !== "undefined" && DIFFICULTY_INFO[currentQuestion.difficulty] ? DIFFICULTY_INFO[currentQuestion.difficulty].points : 0, streak: !!(window.gameOpts && window.gameOpts.streak), pts: log ? V43Justif.pointsFromLog(log, typeof myId !== "undefined" ? myId : "", nameOf) : null };
        } catch (e) { pts = null; }
        var ex = V43Justif.explain(currentQuestion, { mine: last.mine, correct: last.correct, stats: st, index: bankIndex(), points: pts });
        box.innerHTML = V43Justif.html(ex); box.classList.add("show");
        if (!withStats && window.V43Voice && window.V43Voice.readExplanation) window.V43Voice.readExplanation(ex.speech);
      } catch (e) { if (window.console) console.error("V43Justif", e); }
    }
    showQuestionResult = function (data) {
      var r = baseShow.apply(this, arguments);
      try { last = { mine: typeof myAnswerForQuestion === "number" ? myAnswerForQuestion : null, correct: data && typeof data.correct === "number" ? data.correct : currentQuestion.correct }; } catch (e) { last = null; }
      draw(false); clearTimeout(timer); timer = setTimeout(function () { draw(true); }, 900);   /* le journal de la manche arrive juste après le résultat */
      return r;
    };
    var baseDisplay = displayQuestion;
    displayQuestion = function () { clearTimeout(timer); last = null; return baseDisplay.apply(this, arguments); };
  })();
}
