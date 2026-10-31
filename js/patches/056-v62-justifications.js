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
      + '<div class="v62l-body"><div class="v62l-cat">' + J.esc(q.category || "") + '</div><ul>' + lines.map(J.lineHtml).join("") + "</ul></div></details>";
  }
  function render(box) {
    var rs = list(), au = J.auto ? J.auto() : null, good = rs.filter(function (r) { return state(r) === "ok"; }).length, rev = rs.length - good;
    box.innerHTML = '<h3>📚 Justifications</h3>'
      + '<p class="v62l-sub">Pour chaque question : la bonne réponse, puis pourquoi. Ouvre une ligne pour apprendre — même quand tu avais juste !</p>'
      + '<p class="v62l-score">🎯 ' + good + ' / ' + rs.length + ' trouvées' + (rev ? ' · <b>' + rev + ' à revoir</b>' : ' · tout est bon, bravo !') + '</p>'
      + '<div class="v62l-bar" role="group" aria-label="Filtrer les justifications"><button type="button" class="v62l-btn on" data-v62="all">Toutes (' + rs.length + ')</button>'
      + '<button type="button" class="v62l-btn" data-v62="bad">À revoir (' + rev + ')</button><button type="button" class="v62l-btn" data-v62="open">Tout ouvrir</button></div>'
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
