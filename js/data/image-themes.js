/* =============================================================================
   Deux thèmes de plus en images, dessinés par le jeu (SVG) comme « Questions en images » :
     🏳️ Drapeaux en images — « À quel pays appartient ce drapeau ? » (schémas simplifiés, sans armoiries)
     🕐 Lire l'heure — horloge à aiguilles : « Quelle heure est-il ? »
   La bonne réponse est calculée à partir des données qui servent à dessiner l'image (tests/images.test.js la relit).
   ============================================================================= */
var V41Images = (function () {
  "use strict";
  var FLAGS_THEME = "🏳️ Drapeaux en images", CLOCK_THEME = "🕐 Lire l'heure";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }
  function open(w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'; }
  function mk(theme, kind, diff, text, answers, svg, correction) {
    return { category: theme, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction, media: { type: "svg", svg: svg }, source: "officiel", v35: true, v41Img: true, kind: kind };
  }

  /* ---------- Drapeaux ---------- */
  /* layout : v = bandes verticales, h = bandes horizontales, nordic = croix décentrée, disc = disque ; d = difficulté */
  var FLAGS = [
    { id: "fr", name: "la France", lay: "v", c: ["#0055A4", "#FFFFFF", "#EF4135"], d: "facile" },
    { id: "it", name: "l'Italie", lay: "v", c: ["#009246", "#FFFFFF", "#CE2B37"], d: "facile" },
    { id: "ie", name: "l'Irlande", lay: "v", c: ["#169B62", "#FFFFFF", "#FF883E"], d: "moyen" },
    { id: "be", name: "la Belgique", lay: "v", c: ["#000000", "#FAE042", "#ED2939"], d: "facile" },
    { id: "ro", name: "la Roumanie", lay: "v", c: ["#002B7F", "#FCD116", "#CE1126"], d: "difficile" },
    { id: "ml", name: "le Mali", lay: "v", c: ["#14B53A", "#FCD116", "#CE1126"], d: "difficile" },
    { id: "gn", name: "la Guinée", lay: "v", c: ["#CE1126", "#FCD116", "#009460"], d: "difficile" },
    { id: "ng", name: "le Nigeria", lay: "v", c: ["#008751", "#FFFFFF", "#008751"], d: "moyen" },
    { id: "ci", name: "la Côte d'Ivoire", lay: "v", c: ["#F77F00", "#FFFFFF", "#009E60"], d: "moyen" },
    { id: "pe", name: "le Pérou", lay: "v", c: ["#D91023", "#FFFFFF", "#D91023"], d: "moyen" },
    { id: "de", name: "l'Allemagne", lay: "h", c: ["#000000", "#DD0000", "#FFCE00"], d: "facile" },
    { id: "nl", name: "les Pays-Bas", lay: "h", c: ["#AE1C28", "#FFFFFF", "#21468B"], d: "facile" },
    { id: "lu", name: "le Luxembourg", lay: "h", c: ["#ED2939", "#FFFFFF", "#00A1DE"], d: "moyen" },
    { id: "at", name: "l'Autriche", lay: "h", c: ["#ED2939", "#FFFFFF", "#ED2939"], d: "moyen" },
    { id: "hu", name: "la Hongrie", lay: "h", c: ["#CD2A3E", "#FFFFFF", "#436F4D"], d: "moyen" },
    { id: "bg", name: "la Bulgarie", lay: "h", c: ["#FFFFFF", "#00966E", "#D62612"], d: "moyen" },
    { id: "lt", name: "la Lituanie", lay: "h", c: ["#FDB913", "#006A44", "#C1272D"], d: "difficile" },
    { id: "ee", name: "l'Estonie", lay: "h", c: ["#0072CE", "#000000", "#FFFFFF"], d: "difficile" },
    { id: "ru", name: "la Russie", lay: "h", c: ["#FFFFFF", "#0039A6", "#D52B1E"], d: "facile" },
    { id: "ga", name: "le Gabon", lay: "h", c: ["#009E60", "#FCD116", "#3A75C4"], d: "difficile" },
    { id: "ye", name: "le Yémen", lay: "h", c: ["#CE1126", "#FFFFFF", "#000000"], d: "difficile" },
    { id: "pl", name: "la Pologne", lay: "h2", c: ["#FFFFFF", "#DC143C"], d: "facile" },
    { id: "ua", name: "l'Ukraine", lay: "h2", c: ["#0057B7", "#FFD700"], d: "facile" },
    { id: "se", name: "la Suède", lay: "nordic", c: ["#006AA7", "#FECC02"], d: "moyen" },
    { id: "dk", name: "le Danemark", lay: "nordic", c: ["#C8102E", "#FFFFFF"], d: "moyen" },
    { id: "fi", name: "la Finlande", lay: "nordic", c: ["#FFFFFF", "#003580"], d: "moyen" },
    { id: "no", name: "la Norvège", lay: "nordic3", c: ["#BA0C2F", "#FFFFFF", "#00205B"], d: "moyen" },
    { id: "ch", name: "la Suisse", lay: "swiss", c: ["#DA291C", "#FFFFFF"], d: "facile" },
    { id: "jp", name: "le Japon", lay: "disc", c: ["#FFFFFF", "#BC002D"], d: "facile" },
    { id: "bd", name: "le Bangladesh", lay: "disc2", c: ["#006A4E", "#F42A41"], d: "difficile" }
  ];
  function flagBody(f) {
    var c = f.c, s = "", i;
    if (f.lay === "v") for (i = 0; i < 3; i++) s += '<rect x="' + i * 100 + '" y="0" width="100" height="200" fill="' + c[i] + '"/>';
    else if (f.lay === "h") for (i = 0; i < 3; i++) s += '<rect x="0" y="' + Math.round(i * 66.67) + '" width="300" height="67" fill="' + c[i] + '"/>';
    else if (f.lay === "h2") for (i = 0; i < 2; i++) s += '<rect x="0" y="' + i * 100 + '" width="300" height="100" fill="' + c[i] + '"/>';
    else if (f.lay === "nordic") s = '<rect width="300" height="200" fill="' + c[0] + '"/><rect x="80" y="0" width="38" height="200" fill="' + c[1] + '"/><rect x="0" y="81" width="300" height="38" fill="' + c[1] + '"/>';
    else if (f.lay === "nordic3") s = '<rect width="300" height="200" fill="' + c[0] + '"/><rect x="72" y="0" width="54" height="200" fill="' + c[1] + '"/><rect x="0" y="73" width="300" height="54" fill="' + c[1] + '"/><rect x="87" y="0" width="24" height="200" fill="' + c[2] + '"/><rect x="0" y="88" width="300" height="24" fill="' + c[2] + '"/>';
    else if (f.lay === "swiss") s = '<rect width="300" height="200" fill="' + c[0] + '"/><rect x="132" y="40" width="36" height="120" fill="' + c[1] + '"/><rect x="90" y="82" width="120" height="36" fill="' + c[1] + '"/>';
    else if (f.lay === "disc") s = '<rect width="300" height="200" fill="' + c[0] + '"/><circle cx="150" cy="100" r="60" fill="' + c[1] + '"/>';
    else s = '<rect width="300" height="200" fill="' + c[0] + '"/><circle cx="135" cy="100" r="60" fill="' + c[1] + '"/>';
    return '<g data-flag="' + f.id + '">' + s + '</g>';
  }
  function flagSvg(f) { return open(300, 200) + '<rect width="300" height="200" fill="#d8dee6"/>' + flagBody(f).replace('<g data-flag', '<g stroke="#9aa5b1" stroke-width="1" data-flag') + '</svg>'; }
  function qFlag() {
    var f = pick(FLAGS), same = FLAGS.filter(function (x) { return x !== f && (x.lay === f.lay || (x.lay.indexOf("nordic") === 0 && f.lay.indexOf("nordic") === 0)); });
    var rest = FLAGS.filter(function (x) { return x !== f && same.indexOf(x) < 0; });
    var pool = sample(same, Math.min(2, same.length)); pool = pool.concat(sample(rest, 3 - pool.length));
    var cap = function (n) { return n.charAt(0).toUpperCase() + n.slice(1); };
    return mk(FLAGS_THEME, "drapeau", f.d, pick(["À quel pays appartient ce drapeau ?", "De quel pays est ce drapeau ?"]), [cap(f.name)].concat(pool.map(function (x) { return cap(x.name); })), flagSvg(f), "C'est le drapeau de " + f.name + ".");
  }

  /* ---------- Horloges ---------- */
  function fmt(h, m) { return h + " h " + (m < 10 ? "0" : "") + m; }
  function clockSvg(h, m) {
    var s = open(240, 240) + '<rect width="240" height="240" fill="#e6edf5"/><circle cx="120" cy="120" r="108" fill="#ffffff" stroke="#1f2937" stroke-width="6"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 90 : 98, r2 = 104;
      s += '<line x1="' + (120 + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (120 - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (120 + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (120 - r2 * Math.cos(a)).toFixed(1) + '" stroke="#1f2937" stroke-width="' + (big ? 3 : 1) + '"/>';
    }
    for (var n = 1; n <= 12; n++) { var b = n * Math.PI / 6; s += '<text x="' + (120 + 72 * Math.sin(b)).toFixed(1) + '" y="' + (120 - 72 * Math.cos(b) + 8).toFixed(1) + '" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="#111111">' + n + '</text>'; }
    var ha = ((h % 12) * 30 + m * 0.5) * Math.PI / 180, ma = m * 6 * Math.PI / 180;
    function hand(kind, ang, len, w, col) { return '<line data-hand="' + kind + '" x1="120" y1="120" x2="' + (120 + len * Math.sin(ang)).toFixed(2) + '" y2="' + (120 - len * Math.cos(ang)).toFixed(2) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
    return s + '<g data-time="' + fmt(h, m) + '">' + hand("hour", ha, 52, 9, "#111111") + hand("minute", ma, 82, 5, "#d6101e") + '</g><circle cx="120" cy="120" r="7" fill="#111111"/></svg>';
  }
  function clockAnswers(h, m) {
    var cand = [], set = {}, correct = fmt(h, m);
    function add(hh, mm) { hh = ((hh + 11) % 12) + 1; mm = (mm + 60) % 60; var t = fmt(hh, mm); if (t !== correct && !set[t]) { set[t] = 1; cand.push(t); } }
    if (m % 5 === 0 && fmt(m / 5 || 12, h * 5 % 60) !== correct) add(m / 5 || 12, (h % 12) * 5);     /* aiguilles confondues */
    add(h + 1, m); add(h - 1, m); add(h, m + 5); add(h, m - 5); add(h, m + 15); add(h, m - 15); add(h + 2, m); add(h + 6, m);
    var first = cand.slice(0, 1), rest = shuffle(cand.slice(1)).slice(0, 2);
    return [correct].concat(first.concat(rest).slice(0, 3));
  }
  function qClock() {
    var lvl = pick(["facile", "moyen", "moyen", "difficile"]), h = 1 + rnd(12), m;
    m = lvl === "facile" ? pick([0, 30]) : lvl === "moyen" ? pick([0, 15, 30, 45]) : 5 * rnd(12);
    var ans = clockAnswers(h, m);
    return mk(CLOCK_THEME, "heure", lvl, pick(["Quelle heure indique cette horloge ?", "Quelle heure est-il sur cette horloge ?"]) + " (la petite aiguille noire indique l'heure, la grande rouge les minutes)", ans, clockSvg(h, m), "Il est " + fmt(h, m) + ".");
  }

  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true; q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  function build() {
    var out = [];
    [[qFlag, 48], [qClock, 40]].forEach(function (p) { var made = 0, guard = 0; while (made < p[1] && guard++ < p[1] * 8) { var q = p[0](); if (q && valid(q)) { out.push(q); made++; } } });
    return out;
  }
  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].v41Img) QUESTIONS.splice(i, 1);
    var pool = build(); pool.forEach(function (q) { QUESTIONS.push(q); }); return pool.length;
  }
  return { FLAGS_THEME: FLAGS_THEME, CLOCK_THEME: CLOCK_THEME, FLAGS: FLAGS, build: build, register: register, valid: valid };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V41Images;
if (typeof QUESTIONS !== "undefined") {
  V41Images.register();
  if (typeof startGame === "function") {
    var __v41ImgStart = startGame;
    startGame = function () { try { V41Images.register(); } catch (e) {} return __v41ImgStart.apply(this, arguments); };
  }
}
