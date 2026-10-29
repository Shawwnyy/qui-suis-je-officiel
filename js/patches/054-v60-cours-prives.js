/* =============================================================================
   V60 — 📚 Les thèmes issus d'un cours restent à part.
   Un thème créé depuis un cours (ids « qcm… » dans « Mes questions ») n'apparaît plus dans la grille des thèmes
   des salles normales : il n'est visible que dans une salle créée à partir d'un cours
   (« Jouer maintenant », « Réviser à plusieurs », ou un cours de la liste « 📚 Mes cours »).
   Il est aussi retiré du tirage tant qu'il n'est pas dévoilé : impossible qu'il entre dans une partie par accident.
   La logique est pure (V60Course, testée par tests/course.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V60Course = (function () {
  "use strict";
  function isCourseId(id) { return typeof id === "string" && /^qcm/.test(id); }
  /* thèmes « de cours » : tous leurs enregistrements perso viennent d'un cours, et aucune question officielle n'a ce thème */
  function courseCats(store, questions) {
    var perso = Object.create(null), mixed = Object.create(null), cats = [];
    (Array.isArray(store) ? store : []).forEach(function (r) {
      if (!r || typeof r.category !== "string" || !r.category) return;
      if (isCourseId(r.id)) { if (!perso[r.category]) { perso[r.category] = 0; cats.push(r.category); } perso[r.category]++; } else mixed[r.category] = 1;
    });
    (Array.isArray(questions) ? questions : []).forEach(function (q) { if (q && q.source !== "perso" && typeof q.category === "string") mixed[q.category] = 1; });
    return cats.filter(function (c) { return !mixed[c]; });
  }
  function list(store, questions) {
    var cats = courseCats(store, questions), n = Object.create(null);
    (Array.isArray(store) ? store : []).forEach(function (r) { if (r && isCourseId(r.id)) n[r.category] = (n[r.category] || 0) + 1; });
    return cats.map(function (c) { return { category: c, count: n[c] || 0 }; });
  }
  /* thèmes à cacher = thèmes de cours non dévoilés */
  function hiddenSet(store, questions, revealed) {
    var h = Object.create(null); courseCats(store, questions).forEach(function (c) { if (!revealed || !revealed[c]) h[c] = 1; }); return h;
  }
  function filterCats(cats, hidden) { return (Array.isArray(cats) ? cats : []).filter(function (c) { return !hidden[c]; }); }
  function filterPool(pool, hidden) { return Array.isArray(pool) ? pool.filter(function (q) { return !(q && hidden[q.category]); }) : pool; }
  var api = { courseCats: courseCats, list: list, hiddenSet: hiddenSet, filterCats: filterCats, filterPool: filterPool, isCourseId: isCourseId };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof getCategories !== "function" || typeof getQuestionPool !== "function" || typeof showScreen !== "function") return;
  var V = V60Course, revealed = Object.create(null), seenRoom = false, sig = "", cache = {};
  function store() { return window.v35Q && Array.isArray(window.v35Q.store) ? window.v35Q.store : []; }
  function hidden() {
    var s = store().length + "§" + (typeof QUESTIONS !== "undefined" ? QUESTIONS.length : 0) + "§" + Object.keys(revealed).sort().join("|");
    if (s !== sig) { sig = s; try { cache = V.hiddenSet(store(), typeof QUESTIONS !== "undefined" ? QUESTIONS : [], revealed); } catch (e) { cache = {}; } }
    return cache;
  }
  function rebuild() { sig = ""; try { if (typeof window.buildThemeSelector === "function") window.buildThemeSelector(); } catch (e) {} }

  var baseCats = getCategories;
  getCategories = function () { var c = baseCats.apply(this, arguments); try { return V.filterCats(c, hidden()); } catch (e) { return c; } };
  var basePool = getQuestionPool;
  getQuestionPool = function () { var p = basePool.apply(this, arguments); try { return V.filterPool(p, hidden()); } catch (e) { return p; } };

  /* dévoiler un thème de cours : pour la salle créée à partir de ce cours */
  function reveal(cat) { if (!cat) return; revealed[cat] = 1; seenRoom = false; rebuild(); }
  /* tout recacher : on décoche d'abord (la grille garde sa sélection en interne), puis on reconstruit */
  function hideAll() {
    var had = Object.keys(revealed).length; if (!had) return;
    try {
      document.querySelectorAll("#themeGrid .v163-theme input").forEach(function (i) {
        if (revealed[i.value] && i.checked && !i.disabled && i.nextElementSibling) i.nextElementSibling.click();
      });
    } catch (e) {}
    revealed = Object.create(null); seenRoom = false; rebuild();
  }

  var baseShow = showScreen;
  showScreen = function (id) {
    var r = baseShow.apply(this, arguments);
    try {
      if (id === "homeScreen") { if (seenRoom) hideAll(); }
      else if (Object.keys(revealed).length) seenRoom = true;
    } catch (e) {}
    return r;
  };

  window.V60CourseUI = { reveal: reveal, hideAll: hideAll, list: function () { return V.list(store(), typeof QUESTIONS !== "undefined" ? QUESTIONS : []); }, revealed: function () { return Object.keys(revealed); } };
})();
