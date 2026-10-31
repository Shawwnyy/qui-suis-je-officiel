/* =============================================================================
   V62 — 📚 « Justifications » sur l'écran final : pour CHAQUE question de la partie (juste ou fausse), la bonne réponse,
   une phrase pour comprendre, les pièges à ne pas confondre, une question voisine du même thème, un mot d'encouragement.
   Chaque joueur a sa propre carte (elle part de ce qu'il a vu) ; filtre « À revoir », « Tout ouvrir ».
   La logique est dans V43Justif.learn() (testée par tests/justif.test.js) ; ceci n'est que la colle navigateur.
   ============================================================================= */
(function V62Learn() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || !window.V43Justif || typeof window.V43Justif.learn !== "function"
    || typeof showQuestionResult !== "function" || typeof displayQuestion !== "function" || typeof showScreen !== "function") return;
  var J = window.V43Justif, rounds = [], cur = 0, MAX = 200;
  function $(id) { return document.getElementById(id); }

  var baseDisplay = displayQuestion;
  displayQuestion = function (question, round) {
    var n = Math.floor(Number(round)) || 0;
    if (n <= 1 || n < cur) rounds = [];     /* nouvelle partie */
    cur = n;
    return baseDisplay.apply(this, arguments);
  };
  var baseResult = showQuestionResult;
  showQuestionResult = function (data) {
    var r = baseResult.apply(this, arguments);
    try {
      var q = currentQuestion;
      if (q && Array.isArray(q.answers) && rounds.length < MAX) {
        var ci = data && typeof data.correct === "number" ? data.correct : q.correct;
        rounds[Math.max(0, cur - 1)] = { n: cur || rounds.length + 1, q: q, mine: typeof myAnswerForQuestion === "number" ? myAnswerForQuestion : null, correct: ci };
      }
    } catch (e) { if (window.console) console.error("V62 justifications", e); }
    return r;
  };

  function list() { return rounds.filter(Boolean); }
  function state(r) { return r.mine === null || r.mine < 0 ? "none" : r.mine === r.correct ? "ok" : "bad"; }
  function item(r, au) {
    var st = state(r), q = r.q, mark = st === "ok" ? "✅" : st === "bad" ? "❌" : "⏱️";
    var lines = J.learn(q, { mine: r.mine, correct: r.correct, idx: au && au.idx, theme: au && au.theme, coda: true, leurres: true });
    return '<details class="v62l-item ' + st + '" data-ok="' + (st === "ok" ? "1" : "0") + '"><summary><span class="v62l-n">' + r.n + '</span><span class="v62l-q">' + (q.media ? "🖼️ " : "") + J.esc(q.question) + '</span><span class="v62l-st" aria-label="' + (st === "ok" ? "juste" : st === "bad" ? "faux" : "sans réponse") + '">' + mark + '</span></summary>'
      + '<div class="v62l-body"><div class="v62l-cat">' + J.esc(q.category || "") + (window.speechSynthesis ? ' <button type="button" class="v62l-read" data-v62="read" data-i="' + (r.n - 1) + '">🔊 Lire</button>' : "") + '</div><ul>' + lines.map(J.lineHtml).join("") + "</ul></div></details>";
  }

  /* ---- V63 : fiches, partage, rattrapage, lecture à voix haute ---- */
  var F = window.V63Fiches || null;
  function items() {
    var au = J.auto ? J.auto() : null;
    return list().map(function (r) {
      var q = r.q;
      return { n: r.n, q: q.question, cat: q.category || "", state: state(r), media: !!q.media, answers: (q.answers || []).slice(), correct: r.correct, mine: r.mine,
        lines: J.learn(q, { mine: r.mine, correct: r.correct, idx: au && au.idx, theme: au && au.theme, leurres: true }) };
    });
  }
  function say(box, txt) { var m = box && box.querySelector(".v62l-msg"); if (m) { m.textContent = txt; clearTimeout(say.t); say.t = setTimeout(function () { m.textContent = ""; }, 5000); } }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    return new Promise(function (ok, ko) { try { var a = document.createElement("textarea"); a.value = txt; a.setAttribute("readonly", ""); a.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(a); a.select(); var r = document.execCommand("copy"); a.remove(); r ? ok() : ko(); } catch (e) { ko(e); } });
  }
  function myScoreNow() { try { return players && players[myId] ? Number(players[myId].score) || 0 : 0; } catch (e) { return 0; } }
  function readAloud(i, btn) {
    try {
      var ss = window.speechSynthesis; if (!ss) return;
      if (ss.speaking) { ss.cancel(); if (btn && btn.dataset.on === "1") { btn.dataset.on = "0"; btn.textContent = "🔊 Lire"; return; } }
      var it = items()[i]; if (!it) return;
      var u = new SpeechSynthesisUtterance([it.q].concat(it.lines.filter(function (l) { return l.k !== "coda"; }).map(function (l) { return l.t + (l.quote ? " " + l.quote : ""); })).join(". "));
      u.lang = "fr-FR"; u.onend = u.onerror = function () { if (btn) { btn.dataset.on = "0"; btn.textContent = "🔊 Lire"; } };
      if (btn) { btn.dataset.on = "1"; btn.textContent = "⏹️ Stop"; }
      ss.speak(u);
    } catch (e) {}
  }
  function openRetry() {
    var deck = F ? F.retryDeck(items()) : []; if (!deck.length) return;
    var old = $("v63Retry"); if (old) old.remove();
    var m = document.createElement("div"); m.id = "v63Retry"; m.className = "v63r"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Refais tes erreurs");
    document.body.appendChild(m);
    var i = 0, got = 0, locked = false, e = J.esc;
    function close() { m.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    function show() {
      if (i >= deck.length) return end();
      var d = deck[i]; locked = false;
      m.innerHTML = '<div class="v63r-card"><div class="v63r-top"><span>🔁 Rattrapage ' + (i + 1) + " / " + deck.length + '</span><button type="button" data-v63="close" aria-label="Fermer">✕</button></div>'
        + '<div class="v63r-cat">' + e(d.cat) + '</div><div class="v63r-q">' + e(d.q) + '</div><div class="v63r-a">' + d.answers.map(function (a, k) { return '<button type="button" class="v63r-ans" data-k="' + k + '">' + e(a) + "</button>"; }).join("")
        + '</div><div class="v63r-fb" role="status" aria-live="polite"></div><button type="button" class="v63r-next" data-v63="next" hidden>' + (i + 1 >= deck.length ? "Voir le résultat" : "Suivant →") + "</button></div>";
      var f = m.querySelector(".v63r-ans"); if (f) f.focus();
    }
    function end() {
      m.innerHTML = '<div class="v63r-card v63r-end"><div class="v63r-big">' + (got === deck.length ? "🏆" : got ? "💪" : "📖") + '</div><div class="v63r-q">Rattrapage : ' + got + " / " + deck.length + " retrouvée" + (got > 1 ? "s" : "") + '</div><p>'
        + (got === deck.length ? "Tout est rattrapé : plus aucune erreur !" : "Relis les explications des questions restantes : elles reviendront.") + '</p><button type="button" class="v63r-next" data-v63="close">Fermer</button></div>';
      try { if (got === deck.length) soundVictory(); else if (got) soundCorrect(); else soundWrong(); } catch (x) {}
    }
    m.addEventListener("click", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest("button") : null; if (!t) return;
      if (t.dataset.v63 === "close") return close();
      if (t.dataset.v63 === "next") { i++; return show(); }
      if (!t.classList.contains("v63r-ans") || locked) return;
      locked = true; var d = deck[i], k = Number(t.dataset.k), ok = k === d.correct;
      Array.prototype.forEach.call(m.querySelectorAll(".v63r-ans"), function (b) { b.disabled = true; var bk = Number(b.dataset.k); if (bk === d.correct) b.classList.add("good"); else if (bk === k) b.classList.add("bad"); });
      var why = d.lines.filter(function (l) { return l.k !== "answer"; }).slice(0, 3).map(function (l) { return "<li>" + e(l.t) + (l.quote ? " <q>" + e(l.quote) + "</q>" : "") + "</li>"; }).join("");
      m.querySelector(".v63r-fb").innerHTML = "<b>" + (ok ? "✅ Rattrapé !" : "❌ Pas encore : la bonne réponse est « " + e(d.answers[d.correct]) + " ».") + "</b>" + (why ? "<ul>" + why + "</ul>" : "");
      if (ok) got++;
      try { ok ? soundCorrect() : soundWrong(); } catch (x) {}
      var nx = m.querySelector(".v63r-next"); nx.hidden = false; nx.focus();
    });
    show();
  }
  function doAction(k, b, box) {
    var it = items(), url = ""; try { url = location.origin + location.pathname; } catch (e) {}
    if (k === "retry") return openRetry();
    if (k === "fx") { try { soundVictory(); } catch (e) {} return; }
    if (k === "read") return readAloud(Number(b.dataset.i), b);
    if (!F) return;
    if (k === "share") {
      var txt = F.shareText(it, { score: myScoreNow(), url: url });
      if (navigator.share) navigator.share({ text: txt }).catch(function () {}); else copyText(txt).then(function () { say(box, "📤 Copié : colle-le dans un message !"); }, function () { say(box, "Copie impossible : sélectionne le texte à la main."); });
      return;
    }
    if (k === "copy") return copyText(F.fichesText(it, { date: new Date().toLocaleDateString("fr-FR") })).then(function () { say(box, "📋 Fiches copiées !"); }, function () { say(box, "Copie impossible depuis ce navigateur."); });
    if (k === "dl") {
      try {
        var blob = new Blob([F.fichesText(it, { date: new Date().toLocaleDateString("fr-FR") })], { type: "text/plain;charset=utf-8" }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = F.fileName(new Date().toISOString().slice(0, 10)); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); say(box, "⬇️ Fiches téléchargées.");
      } catch (e) { say(box, "Téléchargement impossible."); }
    }
  }
  function render(box) {
    var rs = list(), au = J.auto ? J.auto() : null, good = rs.filter(function (r) { return state(r) === "ok"; }).length, rev = rs.length - good;
    box.innerHTML = '<h3>📚 Justifications</h3>'
      + '<p class="v62l-sub">Pour chaque question : la bonne réponse, puis pourquoi. Ouvre une ligne pour apprendre — même quand tu avais juste !</p>'
      + '<p class="v62l-score">🎯 ' + good + ' / ' + rs.length + ' trouvées' + (rev ? ' · <b>' + rev + ' à revoir</b>' : ' · tout est bon, bravo !') + '</p>'
      + '<div class="v62l-bar" role="group" aria-label="Filtrer les justifications"><button type="button" class="v62l-btn on" data-v62="all">Toutes (' + rs.length + ')</button>'
      + '<button type="button" class="v62l-btn" data-v62="bad">À revoir (' + rev + ')</button><button type="button" class="v62l-btn" data-v62="open">Tout ouvrir</button></div>'
      + '<div class="v62l-bar v62l-tools" role="group" aria-label="Outils de révision">' + (F && F.retryDeck(items()).length ? '<button type="button" class="v62l-btn hot" data-v62="retry">🔁 Refais tes erreurs</button>' : "")
      + '<button type="button" class="v62l-btn" data-v62="share">📤 Partager mon score</button><button type="button" class="v62l-btn" data-v62="copy">📋 Copier mes fiches</button><button type="button" class="v62l-btn" data-v62="dl">⬇️ Télécharger</button><button type="button" class="v62l-btn" data-v62="fx">🎆 Feu d\'artifice</button></div>'
      + '<p class="v62l-msg" role="status" aria-live="polite"></p>'
      + '<div class="v62l-list">' + rs.map(function (r) { return item(r, au); }).join("") + "</div>";
    box.dataset.n = String(rs.length);
    box.dataset.f = "all";
  }
  function mount() {
    var screen = $("resultsScreen"), card = screen && screen.querySelector(".card");
    if (!card || !list().length) return;
    var box = $("v62Learn");
    if (!box) {
      box = document.createElement("section"); box.id = "v62Learn"; box.className = "v62l";
      box.addEventListener("click", function (e) {
        var b = e.target && e.target.closest ? e.target.closest("[data-v62]") : null; if (!b) return;
        var k = b.getAttribute("data-v62");
        if (k === "retry" || k === "share" || k === "copy" || k === "dl" || k === "fx" || k === "read") { e.preventDefault(); doAction(k, b, box); return; }
        if (k === "open") {
          var items = box.querySelectorAll(".v62l-item"), allOpen = Array.prototype.every.call(items, function (d) { return d.open || d.offsetParent === null; });
          Array.prototype.forEach.call(items, function (d) { if (d.offsetParent !== null || allOpen) d.open = !allOpen; });
          b.textContent = allOpen ? "Tout ouvrir" : "Tout fermer"; return;
        }
        box.dataset.f = k;
        Array.prototype.forEach.call(box.querySelectorAll(".v62l-btn[data-v62='all'],.v62l-btn[data-v62='bad']"), function (x) { x.classList.toggle("on", x === b); });
      });
    }
    var anchor = $("finalScores");
    if (anchor) { if (box.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", box); } else if (box.parentNode !== card) card.appendChild(box);
    if (box.dataset.n !== String(list().length)) render(box);
  }
  var baseShow = showScreen;
  showScreen = function (id) {
    var r = baseShow.apply(this, arguments);
    if (id === "resultsScreen") { setTimeout(mount, 200); setTimeout(mount, 1500); }
    return r;
  };
  /* d'autres écrans peuvent reconstruire la carte des résultats : on remet la nôtre */
  setInterval(function () { try { var s = $("resultsScreen"); if (s && s.classList.contains("active")) mount(); } catch (e) {} }, 1500);
  window.V62Learn = { rounds: list, mount: mount };
})();
