/* =============================================================================
   D'autres drapeaux et d'autres thèmes en images, dessinés par le jeu (SVG, aucune image extérieure, aucun droit d'auteur) :
     🚩 Drapeaux du monde (suite) — 51 drapeaux de plus (Afrique, Amériques, Asie, Europe, Océanie), schémas simplifiés sans armoiries :
        « À quel pays appartient ce drapeau ? », « Quelle est la capitale… ? », « Quel est le drapeau de… ? » (4 drapeaux A à D)
     🎼 Lire une partition — nom d'une note sur la portée (clé de sol), nombre de notes
     🎲 Dés et dominos — somme des points, face opposée, total d'un domino
     🧭 Boussole et orientation — direction de la flèche
     🌡️ Thermomètres — température lue sur la graduation
     🔷 Solides et volumes — nom, faces, sommets
     🏛️ Chiffres romains — nombre écrit en chiffres romains
     📊 Lire un graphique — barre la plus haute, valeur d'une barre, total
   La bonne réponse est calculée à partir des données qui servent à DESSINER l'image (tests/more.test.js la relit dans le SVG).
   Les questions sont régénérées à chaque partie, comme celles de image-themes.js.
   ============================================================================= */
var V47More = (function () {
  "use strict";
  var T_FLAGS = "🚩 Drapeaux du monde (suite)", T_NOTES = "🎼 Lire une partition", T_DICE = "🎲 Dés et dominos", T_COMPASS = "🧭 Boussole et orientation",
    T_THERMO = "🌡️ Thermomètres", T_SOLIDS = "🔷 Solides et volumes", T_ROMAN = "🏛️ Chiffres romains", T_CHART = "📊 Lire un graphique";
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }
  function cap(n) { return n.charAt(0).toUpperCase() + n.slice(1); }
  /* « le Sénégal » → « du Sénégal », « la Chine » → « de la Chine », « l'Inde » → « de l'Inde », « Cuba » → « de Cuba », « Israël » → « d'Israël » */
  function de(name) {
    if (/^le /.test(name)) return "du " + name.slice(3);
    if (/^les /.test(name)) return "des " + name.slice(4);
    if (/^la /.test(name)) return "de la " + name.slice(3);
    if (/^l'/.test(name)) return "de " + name;
    return /^[AEIOUÉÈÊHÎÔÂ]/.test(name) ? "d'" + name : "de " + name;
  }
  function f1(x) { return (Math.round(x * 10) / 10).toString(); }
  function open(w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'; }
  function mk(theme, kind, diff, text, answers, svg, correction) {
    return { category: theme, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction, media: { type: "svg", svg: svg }, source: "officiel", v35: true, v47More: true, kind: kind };
  }
  var uidN = 0;
  function uid(p) { uidN++; return (p || "u") + uidN; }

  /* ---------- Petites briques de dessin ---------- */
  function R(x, y, w, h, f) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + f + '"/>'; }
  function Ci(cx, cy, r, f, st, sw) { return '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + f + '"' + (st ? ' stroke="' + st + '" stroke-width="' + sw + '"' : "") + '/>'; }
  function Po(pts, f, st, sw) { return '<polygon points="' + pts.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ") + '" fill="' + f + '"' + (st ? ' stroke="' + st + '" stroke-width="' + sw + '" stroke-linejoin="round"' : "") + '/>'; }
  function Ln(x1, y1, x2, y2, st, sw) { return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + st + '" stroke-width="' + sw + '"/>'; }
  function starPts(cx, cy, Rr, n, rot) {
    var pts = [], ri = Rr * (n === 5 ? 0.382 : 0.45), a0 = -Math.PI / 2 + (rot || 0);
    for (var i = 0; i < n * 2; i++) { var r = i % 2 ? ri : Rr, a = a0 + i * Math.PI / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  function St(cx, cy, Rr, f, n, st, sw) { return Po(starPts(cx, cy, Rr, n || 5), f, st, sw); }
  function HS(cols, wts) {            /* bandes horizontales (poids optionnels) */
    var tot = (wts || cols.map(function () { return 1; })).reduce(function (a, b) { return a + b; }, 0), y = 0, s = "";
    cols.forEach(function (c, i) { var h = 200 * (wts ? wts[i] : 1) / tot; s += R(0, y, 300, h + 0.4, c); y += h; });
    return s;
  }
  function VS(cols, wts) {
    var tot = (wts || cols.map(function () { return 1; })).reduce(function (a, b) { return a + b; }, 0), x = 0, s = "";
    cols.forEach(function (c, i) { var w = 300 * (wts ? wts[i] : 1) / tot; s += R(x, 0, w + 0.4, 200, c); x += w; });
    return s;
  }
  function crescent(cx, cy, Rr, d, r, f) {      /* croissant ouvert vers la droite : disque (cx,cy,Rr) moins disque (cx+d,cy,r) */
    var a = (Rr * Rr - r * r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, Rr * Rr - a * a)), x = cx + a;
    return '<path d="M' + f1(x) + " " + f1(cy - h) + " A" + f1(Rr) + " " + f1(Rr) + " 0 " + (a > 0 ? 1 : 0) + " 0 " + f1(x) + " " + f1(cy + h) +
      " A" + f1(r) + " " + f1(r) + " 0 " + (a - d > 0 ? 1 : 0) + " 1 " + f1(x) + " " + f1(cy - h) + ' Z" fill="' + f + '"/>';
  }
  function pentagram(cx, cy, Rr, st, sw) {
    var p = [0, 1, 2, 3, 4].map(function (i) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)]; }), o = [0, 2, 4, 1, 3, 0];
    return '<polyline points="' + o.map(function (i) { return f1(p[i][0]) + "," + f1(p[i][1]); }).join(" ") + '" fill="none" stroke="' + st + '" stroke-width="' + sw + '" stroke-linejoin="miter"/>';
  }
  function jack() {          /* Union Jack simplifié, dans un cadre 300 × 200 (découpé par un clipPath) */
    var id = uid("cj");
    return '<defs><clipPath id="' + id + '"><rect width="300" height="200"/></clipPath></defs><g clip-path="url(#' + id + ')">' + R(0, 0, 300, 200, "#012169") +
      Ln(0, 0, 300, 200, "#FFFFFF", 40) + Ln(300, 0, 0, 200, "#FFFFFF", 40) + Ln(0, 0, 300, 200, "#C8102E", 14) + Ln(300, 0, 0, 200, "#C8102E", 14) +
      R(120, 0, 60, 200, "#FFFFFF") + R(0, 70, 300, 60, "#FFFFFF") + R(132, 0, 36, 200, "#C8102E") + R(0, 82, 300, 36, "#C8102E") + "</g>";
  }
  function jackCanton() { return '<g transform="scale(0.5)">' + jack() + "</g>"; }
  var MAPLE = [[150, 28], [164, 60], [184, 50], [178, 98], [204, 88], [198, 112], [224, 120], [196, 146], [203, 160], [158, 152], [158, 178], [142, 178], [142, 152], [97, 160], [104, 146], [76, 120], [102, 112], [96, 88], [122, 98], [116, 50], [136, 60]];

  /* ---------- Les 51 drapeaux ---------- */
  /* id, name (avec article), cont, d = difficulté, cap = capitale, c = couleurs dessinées (contrôlées par les tests), draw = dessin 300 × 200 */
  var FLAGS = [
    /* Afrique */
    { id: "sn", name: "le Sénégal", cont: "Afrique", d: "moyen", cap: "Dakar", c: ["#00853F", "#FDEF42", "#E31B23"], draw: function () { return VS(["#00853F", "#FDEF42", "#E31B23"]) + St(150, 100, 34, "#00853F"); } },
    { id: "cm", name: "le Cameroun", cont: "Afrique", d: "difficile", cap: "Yaoundé", c: ["#007A5E", "#CE1126", "#FCD116"], draw: function () { return VS(["#007A5E", "#CE1126", "#FCD116"]) + St(150, 100, 34, "#FCD116"); } },
    { id: "et", name: "l'Éthiopie", cont: "Afrique", d: "difficile", cap: "Addis-Abeba", c: ["#078930", "#FCDD09", "#DA121A", "#0F47AF"], draw: function () { return HS(["#078930", "#FCDD09", "#DA121A"]) + Ci(150, 100, 40, "#0F47AF") + St(150, 100, 30, "#FCDD09"); } },
    { id: "gh", name: "le Ghana", cont: "Afrique", d: "moyen", cap: "Accra", c: ["#CE1126", "#FCD116", "#006B3F", "#000000"], draw: function () { return HS(["#CE1126", "#FCD116", "#006B3F"]) + St(150, 100, 34, "#000000"); } },
    { id: "bj", ambig: true, name: "le Bénin", cont: "Afrique", d: "difficile", cap: "Porto-Novo", c: ["#008751", "#FCD116", "#E8112D"], draw: function () { return R(0, 0, 120, 200, "#008751") + R(120, 0, 180, 100, "#FCD116") + R(120, 100, 180, 100, "#E8112D"); } },
    { id: "tg", name: "le Togo", cont: "Afrique", d: "difficile", cap: "Lomé", c: ["#006A4E", "#FFCE00", "#D21034", "#FFFFFF"], draw: function () { return HS(["#006A4E", "#FFCE00", "#006A4E", "#FFCE00", "#006A4E"]) + R(0, 0, 120, 120, "#D21034") + St(60, 62, 40, "#FFFFFF"); } },
    { id: "za", ambig: true, name: "l'Afrique du Sud", cont: "Afrique", d: "moyen", cap: "Pretoria", c: ["#DE3831", "#002395", "#007A4D", "#FFB612", "#000000"], draw: function () {
      return R(0, 0, 300, 100.4, "#DE3831") + R(0, 100, 300, 100, "#002395") +
        '<polyline points="0,0 118,100 300,100" fill="none" stroke="#FFFFFF" stroke-width="70" stroke-linejoin="miter"/><polyline points="0,200 118,100" fill="none" stroke="#FFFFFF" stroke-width="70"/>' +
        '<polyline points="0,0 118,100 300,100" fill="none" stroke="#007A4D" stroke-width="44" stroke-linejoin="miter"/><polyline points="0,200 118,100" fill="none" stroke="#007A4D" stroke-width="44"/>' +
        Po([[0, 0], [100, 100], [0, 200]], "#FFB612") + Po([[0, 22], [76, 100], [0, 178]], "#000000"); } },
    { id: "ke", name: "le Kenya", cont: "Afrique", d: "difficile", cap: "Nairobi", c: ["#000000", "#BB0000", "#006600", "#FFFFFF"], draw: function () {
      return R(0, 0, 300, 58, "#000000") + R(0, 58, 300, 8, "#FFFFFF") + R(0, 66, 300, 68, "#BB0000") + R(0, 134, 300, 8, "#FFFFFF") + R(0, 142, 300, 58, "#006600") +
        '<ellipse cx="150" cy="100" rx="24" ry="52" fill="#BB0000" stroke="#000000" stroke-width="8"/>' + R(146, 56, 8, 88, "#FFFFFF"); } },
    { id: "ma", name: "le Maroc", cont: "Afrique", d: "moyen", cap: "Rabat", c: ["#C1272D", "#006233"], draw: function () { return R(0, 0, 300, 200, "#C1272D") + pentagram(150, 104, 52, "#006233", 7); } },
    { id: "dz", name: "l'Algérie", cont: "Afrique", d: "moyen", cap: "Alger", c: ["#006233", "#FFFFFF", "#D21034"], draw: function () { return R(0, 0, 150, 200, "#006233") + R(150, 0, 150, 200, "#FFFFFF") + crescent(150, 100, 50, 14, 41, "#D21034") + St(166, 100, 22, "#D21034"); } },
    { id: "tn", name: "la Tunisie", cont: "Afrique", d: "moyen", cap: "Tunis", c: ["#E70013", "#FFFFFF"], draw: function () { return R(0, 0, 300, 200, "#E70013") + Ci(150, 100, 58, "#FFFFFF") + crescent(148, 100, 38, 9, 31, "#E70013") + St(158, 100, 18, "#E70013"); } },
    { id: "mg", name: "Madagascar", cont: "Afrique", d: "difficile", cap: "Antananarivo", c: ["#FFFFFF", "#FC3D32", "#007E3A"], draw: function () { return R(0, 0, 100, 200, "#FFFFFF") + R(100, 0, 200, 100, "#FC3D32") + R(100, 100, 200, 100, "#007E3A"); } },
    { id: "sd", name: "le Soudan", cont: "Afrique", d: "difficile", cap: "Khartoum", c: ["#D21034", "#FFFFFF", "#000000", "#007229"], draw: function () { return HS(["#D21034", "#FFFFFF", "#000000"]) + Po([[0, 0], [120, 100], [0, 200]], "#007229"); } },
    { id: "bi", ambig: true, name: "le Burundi", cont: "Afrique", d: "difficile", cap: "Gitega", c: ["#CE1126", "#1EB53A", "#FFFFFF"], draw: function () {
      return Po([[0, 0], [300, 0], [150, 100]], "#CE1126") + Po([[0, 200], [300, 200], [150, 100]], "#CE1126") + Po([[0, 0], [0, 200], [150, 100]], "#1EB53A") + Po([[300, 0], [300, 200], [150, 100]], "#1EB53A") +
        Ln(0, 0, 300, 200, "#FFFFFF", 16) + Ln(0, 200, 300, 0, "#FFFFFF", 16) + Ci(150, 100, 46, "#FFFFFF") + St(150, 80, 10, "#CE1126") + St(132, 112, 10, "#CE1126") + St(168, 112, 10, "#CE1126"); } },
    /* Amériques */
    { id: "ca", name: "le Canada", cont: "Amérique", d: "facile", cap: "Ottawa", c: ["#FF0000", "#FFFFFF"], draw: function () { return R(0, 0, 75, 200, "#FF0000") + R(75, 0, 150, 200, "#FFFFFF") + R(225, 0, 75, 200, "#FF0000") + Po(MAPLE, "#FF0000"); } },
    { id: "br", name: "le Brésil", cont: "Amérique", d: "facile", cap: "Brasilia", c: ["#009C3B", "#FFDF00", "#002776"], draw: function () { return R(0, 0, 300, 200, "#009C3B") + Po([[150, 20], [280, 100], [150, 180], [20, 100]], "#FFDF00") + Ci(150, 100, 48, "#002776"); } },
    { id: "ar", name: "l'Argentine", cont: "Amérique", d: "moyen", cap: "Buenos Aires", c: ["#74ACDF", "#FFFFFF", "#F6B40E"], draw: function () { return HS(["#74ACDF", "#FFFFFF", "#74ACDF"]) + Ci(150, 100, 22, "#F6B40E"); } },
    { id: "co", name: "la Colombie", cont: "Amérique", d: "moyen", cap: "Bogota", c: ["#FCD116", "#003893", "#CE1126"], draw: function () { return HS(["#FCD116", "#003893", "#CE1126"], [2, 1, 1]); } },
    { id: "cl", name: "le Chili", cont: "Amérique", d: "moyen", cap: "Santiago", c: ["#FFFFFF", "#D52B1E", "#0039A6"], draw: function () { return R(0, 0, 300, 100, "#FFFFFF") + R(0, 100, 300, 100, "#D52B1E") + R(0, 0, 100, 100, "#0039A6") + St(50, 52, 28, "#FFFFFF"); } },
    { id: "cu", name: "Cuba", cont: "Amérique", d: "moyen", cap: "La Havane", c: ["#002A8F", "#FFFFFF", "#CF142B"], draw: function () { return HS(["#002A8F", "#FFFFFF", "#002A8F", "#FFFFFF", "#002A8F"]) + Po([[0, 0], [173, 100], [0, 200]], "#CF142B") + St(55, 102, 30, "#FFFFFF"); } },
    { id: "bo", ambig: true, name: "la Bolivie", cont: "Amérique", d: "difficile", cap: "Sucre", c: ["#D52B1E", "#F9E300", "#007934"], draw: function () { return HS(["#D52B1E", "#F9E300", "#007934"]); } },
    { id: "jm", name: "la Jamaïque", cont: "Amérique", d: "moyen", cap: "Kingston", c: ["#000000", "#009B3A", "#FED100"], draw: function () {
      return R(0, 0, 300, 200, "#000000") + Po([[0, 0], [300, 0], [150, 100]], "#009B3A") + Po([[0, 200], [300, 200], [150, 100]], "#009B3A") + Ln(0, 0, 300, 200, "#FED100", 26) + Ln(0, 200, 300, 0, "#FED100", 26); } },
    { id: "bs", name: "les Bahamas", cont: "Amérique", d: "difficile", cap: "Nassau", c: ["#00ABC9", "#FAE042", "#000000"], draw: function () { return HS(["#00ABC9", "#FAE042", "#00ABC9"]) + Po([[0, 0], [130, 100], [0, 200]], "#000000"); } },
    { id: "us", name: "les États-Unis", cont: "Amérique", d: "facile", cap: "Washington", c: ["#B22234", "#FFFFFF", "#3C3B6E"], draw: function () {
      var s = "", i, j; for (i = 0; i < 13; i++) s += R(0, i * 200 / 13, 300, 200 / 13 + 0.4, i % 2 ? "#FFFFFF" : "#B22234");
      s += R(0, 0, 130, 7 * 200 / 13, "#3C3B6E");
      for (i = 0; i < 4; i++) for (j = 0; j < 5; j++) s += Ci(16 + j * 24.5, 17 + i * 21, 4, "#FFFFFF");
      return s; } },
    { id: "uy", name: "l'Uruguay", cont: "Amérique", d: "difficile", cap: "Montevideo", c: ["#FFFFFF", "#0038A8", "#FCD116"], draw: function () {
      var s = "", i; for (i = 0; i < 9; i++) s += R(0, i * 200 / 9, 300, 200 / 9 + 0.4, i % 2 ? "#0038A8" : "#FFFFFF");
      return s + R(0, 0, 111, 111, "#FFFFFF") + Ci(55, 55, 22, "#FCD116"); } },
    /* Asie */
    { id: "cn", name: "la Chine", cont: "Asie", d: "facile", cap: "Pékin", c: ["#EE1C25", "#FFFF00"], draw: function () { return R(0, 0, 300, 200, "#EE1C25") + St(62, 62, 34, "#FFFF00") + St(122, 24, 10, "#FFFF00") + St(144, 50, 10, "#FFFF00") + St(144, 84, 10, "#FFFF00") + St(122, 108, 10, "#FFFF00"); } },
    { id: "vn", name: "le Viêt Nam", cont: "Asie", d: "moyen", cap: "Hanoï", c: ["#DA251D", "#FFFF00"], draw: function () { return R(0, 0, 300, 200, "#DA251D") + St(150, 104, 62, "#FFFF00"); } },
    { id: "tr", name: "la Turquie", cont: "Asie", d: "facile", cap: "Ankara", c: ["#E30A17", "#FFFFFF"], draw: function () { return R(0, 0, 300, 200, "#E30A17") + crescent(112, 100, 52, 14, 42, "#FFFFFF") + St(170, 100, 22, "#FFFFFF"); } },
    { id: "in", name: "l'Inde", cont: "Asie", d: "facile", cap: "New Delhi", c: ["#FF9933", "#FFFFFF", "#138808", "#000080"], draw: function () {
      var s = HS(["#FF9933", "#FFFFFF", "#138808"]) + '<circle cx="150" cy="100" r="26" fill="none" stroke="#000080" stroke-width="3"/>' + Ci(150, 100, 4, "#000080");
      for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; s += Ln(150 + 4 * Math.cos(a), 100 + 4 * Math.sin(a), 150 + 26 * Math.cos(a), 100 + 26 * Math.sin(a), "#000080", 1.6); }
      return s; } },
    { id: "th", name: "la Thaïlande", cont: "Asie", d: "moyen", cap: "Bangkok", c: ["#A51931", "#F4F5F8", "#2D2A4A"], draw: function () { return HS(["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1]); } },
    { id: "id", name: "l'Indonésie", cont: "Asie", d: "moyen", cap: "Jakarta", c: ["#E70011", "#FFFFFF"], draw: function () { return HS(["#E70011", "#FFFFFF"]); } },
    { id: "il", ambig: true, name: "Israël", cont: "Asie", d: "facile", cap: "Jérusalem", c: ["#FFFFFF", "#0038B8"], draw: function () {
      return R(0, 0, 300, 200, "#FFFFFF") + R(0, 24, 300, 28, "#0038B8") + R(0, 148, 300, 28, "#0038B8") +
        Po([[150, 62], [184, 121], [116, 121]], "none", "#0038B8", 6) + Po([[150, 138], [184, 79], [116, 79]], "none", "#0038B8", 6); } },
    { id: "la", name: "le Laos", cont: "Asie", d: "difficile", cap: "Vientiane", c: ["#CE1126", "#002868", "#FFFFFF"], draw: function () { return HS(["#CE1126", "#002868", "#CE1126"], [1, 2, 1]) + Ci(150, 100, 34, "#FFFFFF"); } },
    { id: "pk", name: "le Pakistan", cont: "Asie", d: "moyen", cap: "Islamabad", c: ["#01411C", "#FFFFFF"], draw: function () { return R(0, 0, 300, 200, "#01411C") + R(0, 0, 75, 200, "#FFFFFF") + crescent(184, 100, 52, 14, 42, "#FFFFFF") + St(222, 76, 18, "#FFFFFF"); } },
    { id: "ph", name: "les Philippines", cont: "Asie", d: "difficile", cap: "Manille", c: ["#0038A8", "#CE1126", "#FFFFFF", "#FCD116"], draw: function () {
      return R(0, 0, 300, 100.4, "#0038A8") + R(0, 100, 300, 100, "#CE1126") + Po([[0, 0], [173, 100], [0, 200]], "#FFFFFF") + Ci(52, 100, 16, "#FCD116") + St(16, 30, 9, "#FCD116") + St(16, 170, 9, "#FCD116") + St(112, 100, 9, "#FCD116"); } },
    { id: "jo", name: "la Jordanie", cont: "Asie", d: "difficile", cap: "Amman", c: ["#000000", "#FFFFFF", "#007A3D", "#CE1126"], draw: function () { return HS(["#000000", "#FFFFFF", "#007A3D"]) + Po([[0, 0], [160, 100], [0, 200]], "#CE1126") + St(52, 102, 18, "#FFFFFF", 7); } },
    { id: "kw", name: "le Koweït", cont: "Asie", d: "difficile", cap: "Koweït", c: ["#007A3D", "#FFFFFF", "#CE1126", "#000000"], draw: function () { return HS(["#007A3D", "#FFFFFF", "#CE1126"]) + Po([[0, 0], [75, 67], [75, 133], [0, 200]], "#000000"); } },
    { id: "ae", name: "les Émirats arabes unis", cont: "Asie", d: "difficile", cap: "Abou Dhabi", c: ["#FF0000", "#009739", "#FFFFFF", "#000000"], draw: function () { return R(75, 0, 225, 67, "#009739") + R(75, 66.6, 225, 66.8, "#FFFFFF") + R(75, 133, 225, 67, "#000000") + R(0, 0, 75, 200, "#FF0000"); } },
    { id: "sg", name: "Singapour", cont: "Asie", d: "difficile", cap: "Singapour", c: ["#EF3340", "#FFFFFF"], draw: function () {
      var s = R(0, 0, 300, 100.4, "#EF3340") + R(0, 100, 300, 100, "#FFFFFF") + crescent(66, 50, 34, 10, 28, "#FFFFFF");
      [[112, 28], [132, 42], [124, 66], [100, 66], [92, 42]].forEach(function (p) { s += St(p[0], p[1], 8, "#FFFFFF"); });
      return s; } },
    { id: "am", name: "l'Arménie", cont: "Asie", d: "difficile", cap: "Erevan", c: ["#D90012", "#0033A0", "#F2A800"], draw: function () { return HS(["#D90012", "#0033A0", "#F2A800"]); } },
    { id: "ge", name: "la Géorgie", cont: "Asie", d: "difficile", cap: "Tbilissi", c: ["#FFFFFF", "#FF0000"], draw: function () {
      var s = R(0, 0, 300, 200, "#FFFFFF") + R(130, 0, 40, 200, "#FF0000") + R(0, 80, 300, 40, "#FF0000");
      [[65, 40], [235, 40], [65, 160], [235, 160]].forEach(function (p) { s += R(p[0] - 5, p[1] - 18, 10, 36, "#FF0000") + R(p[0] - 18, p[1] - 5, 36, 10, "#FF0000"); });
      return s; } },
    /* Europe */
    { id: "gb", name: "le Royaume-Uni", cont: "Europe", d: "facile", cap: "Londres", c: ["#012169", "#FFFFFF", "#C8102E"], draw: function () { return jack(); } },
    { id: "en", name: "l'Angleterre", cont: "Europe", d: "moyen", cap: "Londres", c: ["#FFFFFF", "#CE1124"], draw: function () { return R(0, 0, 300, 200, "#FFFFFF") + R(125, 0, 50, 200, "#CE1124") + R(0, 75, 300, 50, "#CE1124"); } },
    { id: "sct", name: "l'Écosse", cont: "Europe", d: "moyen", cap: "Édimbourg", c: ["#0065BD", "#FFFFFF"], draw: function () { return R(0, 0, 300, 200, "#0065BD") + Ln(0, 0, 300, 200, "#FFFFFF", 36) + Ln(300, 0, 0, 200, "#FFFFFF", 36); } },
    { id: "gr", name: "la Grèce", cont: "Europe", d: "facile", cap: "Athènes", c: ["#0D5EAF", "#FFFFFF"], draw: function () {
      var s = "", i; for (i = 0; i < 9; i++) s += R(0, i * 200 / 9, 300, 200 / 9 + 0.4, i % 2 ? "#FFFFFF" : "#0D5EAF");
      return s + R(0, 0, 111, 111, "#0D5EAF") + R(44.5, 0, 22, 111, "#FFFFFF") + R(0, 44.5, 111, 22, "#FFFFFF"); } },
    { id: "cz", name: "la Tchéquie", cont: "Europe", d: "moyen", cap: "Prague", c: ["#FFFFFF", "#D7141A", "#11457E"], draw: function () { return R(0, 0, 300, 100, "#FFFFFF") + R(0, 100, 300, 100, "#D7141A") + Po([[0, 0], [150, 100], [0, 200]], "#11457E"); } },
    { id: "is", name: "l'Islande", cont: "Europe", d: "moyen", cap: "Reykjavik", c: ["#02529C", "#FFFFFF", "#DC1E35"], draw: function () { return R(0, 0, 300, 200, "#02529C") + R(80, 0, 50, 200, "#FFFFFF") + R(0, 75, 300, 50, "#FFFFFF") + R(93, 0, 24, 200, "#DC1E35") + R(0, 88, 300, 24, "#DC1E35"); } },
    { id: "lv", name: "la Lettonie", cont: "Europe", d: "difficile", cap: "Riga", c: ["#9E3039", "#FFFFFF"], draw: function () { return R(0, 0, 300, 200, "#9E3039") + R(0, 80, 300, 40, "#FFFFFF"); } },
    /* Océanie */
    { id: "au", name: "l'Australie", cont: "Océanie", d: "moyen", cap: "Canberra", c: ["#012169", "#FFFFFF", "#C8102E"], draw: function () {
      var s = R(0, 0, 300, 200, "#012169") + jackCanton() + St(75, 152, 26, "#FFFFFF", 7);
      [[222, 34, 9], [200, 84, 9], [246, 98, 9], [222, 156, 9], [236, 70, 5]].forEach(function (p) { s += St(p[0], p[1], p[2], "#FFFFFF", p[2] > 6 ? 7 : 5); });
      return s; } },
    { id: "nz", name: "la Nouvelle-Zélande", cont: "Océanie", d: "moyen", cap: "Wellington", c: ["#012169", "#C8102E", "#FFFFFF"], draw: function () {
      var s = R(0, 0, 300, 200, "#012169") + jackCanton();
      [[222, 52], [192, 96], [256, 90], [224, 152]].forEach(function (p) { s += St(p[0], p[1], 13, "#CC142B", 5, "#FFFFFF", 2); });
      return s; } },
    { id: "pw", name: "les Palaos", cont: "Océanie", d: "difficile", cap: "Ngerulmud", c: ["#4AADD6", "#FFDE00"], draw: function () { return R(0, 0, 300, 200, "#4AADD6") + Ci(125, 100, 56, "#FFDE00"); } }
  ];
  var BYID = {}; FLAGS.forEach(function (f) { BYID[f.id] = f; });
  function flagInner(f) { return f.draw(); }
  function flagSvg(f) {
    return open(300, 200) + '<rect width="300" height="200" fill="#d8dee6"/><g data-flag="' + f.id + '">' + flagInner(f) + '</g><rect width="300" height="200" fill="none" stroke="#9aa5b1" stroke-width="2"/></svg>';
  }
  /* distracteurs : 2 du même continent, 1 d'ailleurs, + éventuellement des drapeaux de image-themes.js */
  function ext(name) { if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name]; try { return require("./image-themes.js"); } catch (e) { return null; } }
  function nameDistractors(f) {
    var I = ext("V41Images"), base = FLAGS.filter(function (x) { return x !== f; });
    var same = sample(base.filter(function (x) { return x.cont === f.cont; }), 2), rest = sample(base.filter(function (x) { return same.indexOf(x) < 0; }), 1);
    var out = same.concat(rest).map(function (x) { return cap(x.name); });
    if (I && I.FLAGS && Math.random() < 0.4) { var v = pick(I.FLAGS); if (v && out.indexOf(cap(v.name)) < 0 && cap(v.name) !== cap(f.name)) out[2] = cap(v.name); }
    return out;
  }
  function qFlagName() {
    var f = pick(FLAGS);
    return mk(T_FLAGS, "drapeau2", f.d, pick(["À quel pays appartient ce drapeau ?", "De quel pays est ce drapeau ?"]), [cap(f.name)].concat(nameDistractors(f)), flagSvg(f),
      "C'est le drapeau " + de(f.name) + " (" + f.cont + (f.ambig ? "" : ", capitale : " + f.cap) + ").");
  }
  function qFlagCapital() {
    var f = pick(FLAGS.filter(function (x) { return !x.ambig; })), caps = FLAGS.filter(function (x) { return x !== f && x.cap !== f.cap && !x.ambig; }), same = sample(caps.filter(function (x) { return x.cont === f.cont; }), 2);
    var more = sample(caps.filter(function (x) { return same.indexOf(x) < 0; }), 3 - same.length), all = same.concat(more).map(function (x) { return x.cap; });
    var u = {}; var ans = [f.cap].concat(all).filter(function (c) { if (u[c]) return false; u[c] = 1; return true; }).slice(0, 4);
    return mk(T_FLAGS, "capitale2", f.d === "facile" ? "moyen" : "difficile", "Quelle est la capitale du pays de ce drapeau ?", ans, flagSvg(f), "C'est le drapeau " + de(f.name) + " : sa capitale est " + f.cap + ".");
  }
  function qFlagGrid() {
    var f = pick(FLAGS), group = shuffle(sample(FLAGS.filter(function (x) { return x !== f; }), 3).concat([f])), letters = ["A", "B", "C", "D"], s = open(300, 244) + '<rect width="300" height="244" fill="#e6edf5"/>', good = "";
    group.forEach(function (g, i) {
      var x = 8 + (i % 2) * 148, y = 8 + Math.floor(i / 2) * 112, L = letters[i];
      if (g === f) good = L;
      s += '<g data-cell="' + L + '" data-flag="' + g.id + '"><g transform="translate(' + x + ' ' + (y + 22) + ') scale(0.46)">' + R(0, 0, 300, 200, "#ffffff") + flagInner(g) + '</g>' +
        '<rect x="' + x + '" y="' + (y + 22) + '" width="138" height="92" fill="none" stroke="#9aa5b1" stroke-width="1.5"/>' +
        '<text x="' + (x + 69) + '" y="' + (y + 17) + '" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" text-anchor="middle" fill="#1f2937">' + L + '</text></g>';
    });
    s += "</svg>";
    return mk(T_FLAGS, "grille", "moyen", "Lequel de ces quatre drapeaux est celui " + de(f.name) + " ?", ["Le drapeau " + good].concat(letters.filter(function (l) { return l !== good; }).map(function (l) { return "Le drapeau " + l; })), s,
      "Le drapeau " + good + " est celui " + de(f.name) + ".");
  }

  /* ---------- 🎼 Lire une partition ---------- */
  var NOTE_NAMES = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
  var STAFF_Y = [130, 115, 100, 85, 70];       /* ligne 1 (en bas) à ligne 5 (en haut) */
  function noteY(d) { return 130 - (d - 2) * 7.5; }      /* d = 0 pour Do4, 2 pour Mi4 (1re ligne), 10 pour Fa5 (5e ligne) */
  function staffBase() {
    var s = open(300, 190) + '<rect width="300" height="190" fill="#fdfaf2"/>';
    STAFF_Y.forEach(function (y) { s += Ln(16, y, 284, y, "#222222", 1.6); });
    s += Ln(16, 70, 16, 130, "#222222", 2);
    /* clé de sol (dessin simplifié) */
    s += '<path d="M44 150 C38 158 28 154 30 146 C32 138 44 140 44 148 C44 160 42 168 38 172" fill="none" stroke="#222222" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M44 148 C46 110 60 96 56 76 C54 62 44 62 44 76 C44 100 70 106 66 126 C64 138 48 140 46 128 C45 120 54 116 58 122" fill="none" stroke="#222222" stroke-width="3" stroke-linecap="round"/>' +
      Ci(57.5, 122, 3, "#222222") +
      '<text x="48" y="184" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="middle" fill="#6b7280">clé de sol</text>';
    return s;
  }
  function noteSvgPart(d, x) {
    var y = noteY(d), s = "";
    if (d === 0) s += Ln(x - 15, 145, x + 15, 145, "#222222", 1.6);
    if (d >= 12) s += Ln(x - 15, 55, x + 15, 55, "#222222", 1.6);
    s += '<ellipse data-note="' + d + '" cx="' + x + '" cy="' + f1(y) + '" rx="9.5" ry="6.6" transform="rotate(-20 ' + x + " " + f1(y) + ')" fill="#111111"/>';
    s += d >= 6 ? Ln(x - 8.6, y + 1, x - 8.6, y + 42, "#111111", 2) : Ln(x + 8.6, y - 1, x + 8.6, y - 42, "#111111", 2);
    return s;
  }
  function qNoteName() {
    var d = rnd(13), name = NOTE_NAMES[d % 7], diff = d >= 2 && d <= 10 ? "moyen" : "difficile";
    var wrong = shuffle(NOTE_NAMES.filter(function (n) { return n !== name; })).slice(0, 3);
    return mk(T_NOTES, "note", diff, "Quelle est cette note, écrite en clé de sol ?", [name].concat(wrong), staffBase() + noteSvgPart(d, 190) + "</svg>",
      "En clé de sol, cette note s'appelle " + name + " (la 1re ligne du bas est un Mi, la 2e un Sol).");
  }
  function qNoteCount() {
    var n = 2 + rnd(7), xs = [], s = staffBase(), i, ds = [];
    for (i = 0; i < n; i++) { var d = 2 + rnd(9); ds.push(d); var x = 100 + i * (170 / Math.max(n - 1, 1)); if (n === 1) x = 190; s += noteSvgPart(d, Math.min(x, 270)); }
    var ans = [String(n)].concat([n - 2, n - 1, n + 1, n + 2, n + 3].filter(function (v) { return v >= 1; }).slice(0, 3).map(String));
    return mk(T_NOTES, "notes-nombre", n > 6 ? "moyen" : "facile", "Combien de notes y a-t-il sur cette portée ?", ans, s + "</svg>", "Il y a " + n + " notes sur la portée.");
  }

  /* ---------- 🎲 Dés et dominos ---------- */
  var PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function dieSvg(v, x, y, sz, col) {
    var s = '<g data-die="' + v + '"><rect x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="' + (sz * 0.16) + '" fill="' + (col || "#ffffff") + '" stroke="#1f2937" stroke-width="3"/>', u = sz / 4;
    PIPS[v].forEach(function (p) { s += '<circle data-pip="1" cx="' + f1(x + sz / 2 + p[0] * u) + '" cy="' + f1(y + sz / 2 + p[1] * u) + '" r="' + f1(sz * 0.085) + '" fill="#111111"/>'; });
    return s + "</g>";
  }
  function distinctNums(correct, cands, lo) {
    var out = [String(correct)], seen = {}; seen[correct] = 1;
    shuffle(cands).forEach(function (c) { if (out.length < 4 && c >= lo && !seen[c]) { seen[c] = 1; out.push(String(c)); } });
    var k = 1; while (out.length < 4) { var v = correct + k++; if (!seen[v]) { seen[v] = 1; out.push(String(v)); } }
    return out;
  }
  function qDiceSum() {
    var n = pick([2, 2, 3]), vals = [], i, s = open(300, 140) + '<rect width="300" height="140" fill="#14532d"/>', sum = 0, sz = 84;
    for (i = 0; i < n; i++) vals.push(1 + rnd(6));
    vals.forEach(function (v, k) { sum += v; s += dieSvg(v, (300 - n * sz - (n - 1) * 14) / 2 + k * (sz + 14), 28, sz); });
    return mk(T_DICE, "des-somme", n === 3 ? "moyen" : "facile", "Quel est le total des points sur " + (n === 3 ? "ces trois dés" : "ces deux dés") + " ?", distinctNums(sum, [sum - 2, sum - 1, sum + 1, sum + 2, sum + 3, sum - 3], 2), s + "</svg>",
      "Les points : " + vals.join(" + ") + " = " + sum + ".");
  }
  function qDiceOpposite() {
    var v = 1 + rnd(6), opp = 7 - v, s = open(300, 140) + '<rect width="300" height="140" fill="#14532d"/>' + dieSvg(v, 108, 24, 84);
    return mk(T_DICE, "des-oppose", "moyen", "Sur un dé classique, la somme des deux faces opposées vaut toujours 7. Quelle face est opposée à celle-ci ?", [String(opp)].concat(shuffle([1, 2, 3, 4, 5, 6].filter(function (x) { return x !== opp; })).slice(0, 3).map(String)), s + "</svg>",
      "Les faces opposées d'un dé font 7 : 7 − " + v + " = " + opp + ".");
  }
  function dominoHalf(v, x, y, sz) {
    var s = "", u = sz / 4; (v ? PIPS[v] : []).forEach(function (p) { s += '<circle data-pip="1" cx="' + f1(x + sz / 2 + p[0] * u) + '" cy="' + f1(y + sz / 2 + p[1] * u) + '" r="' + f1(sz * 0.085) + '" fill="#f8fafc"/>'; });
    return s;
  }
  function qDomino() {
    var a = rnd(7), b = rnd(7), sum = a + b, s = open(300, 150) + '<rect width="300" height="150" fill="#e6edf5"/><g data-domino="' + a + "," + b + '"><rect x="40" y="20" width="220" height="110" rx="14" fill="#111827" stroke="#000000" stroke-width="3"/>' +
      Ln(150, 28, 150, 122, "#f8fafc", 3) + dominoHalf(a, 52, 26, 98) + dominoHalf(b, 152, 26, 98) + "</g>";
    return mk(T_DICE, "domino", sum > 8 ? "moyen" : "facile", "Combien de points y a-t-il au total sur ce domino ?", distinctNums(sum, [sum - 2, sum - 1, sum + 1, sum + 2, sum - 3, sum + 3], 0), s + "</svg>", "Les deux moitiés : " + a + " + " + b + " = " + sum + " points.");
  }

  /* ---------- 🧭 Boussole ---------- */
  var DIRS = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"];
  function compassSvg(k) {
    var s = open(300, 300) + '<rect width="300" height="300" fill="#eef2f7"/>' + Ci(150, 150, 120, "#ffffff", "#1f2937", 5);
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8, r1 = i % 2 ? 108 : 102; s += Ln(150 + r1 * Math.sin(a), 150 - r1 * Math.cos(a), 150 + 114 * Math.sin(a), 150 - 114 * Math.cos(a), "#1f2937", i % 2 ? 1.5 : 3); }
    var F = 'font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" text-anchor="middle"';
    s += '<text x="150" y="82" ' + F + ' fill="#b91c1c">N</text><text x="150" y="228" ' + F + ' fill="#1f2937">S</text><text x="228" y="159" ' + F + ' fill="#1f2937">E</text><text x="72" y="159" ' + F + ' fill="#1f2937">O</text>';
    s += '<g data-needle="' + (k * 45) + '" transform="rotate(' + (k * 45) + ' 150 150)">' + Po([[150, 98], [162, 150], [138, 150]], "#dc2626") + Po([[150, 202], [162, 150], [138, 150]], "#475569") + "</g>" + Ci(150, 150, 8, "#111827");
    return s + "</svg>";
  }
  function qCompass() {
    var k = rnd(8), card = k % 2 === 0;
    var wrong = shuffle(DIRS.filter(function (d, i) { return i !== k; }));
    var near = [DIRS[(k + 1) % 8], DIRS[(k + 7) % 8]], ans = [DIRS[k]].concat(shuffle(near).concat(wrong.filter(function (d) { return near.indexOf(d) < 0; })).slice(0, 3));
    return mk(T_COMPASS, "boussole", card ? "facile" : "moyen", "Dans quelle direction pointe la flèche rouge ? (le N est en haut de la rose des vents)", ans, compassSvg(k),
      "La flèche est tournée de " + (k * 45) + "° vers la droite à partir du Nord : c'est le " + DIRS[k] + ".");
  }

  /* ---------- 🌡️ Thermomètres ---------- */
  var TH = { y0: 250, y1: 30, tmin: -20, tmax: 50 };        /* y0 = position du -20 °C, y1 = position du 50 °C */
  function thermoSvg(t) {
    var s = open(240, 300) + '<rect width="240" height="300" fill="#eef2f7"/>', k;
    s += '<rect x="96" y="20" width="26" height="244" rx="13" fill="#ffffff" stroke="#1f2937" stroke-width="3"/>';
    for (k = TH.tmin; k <= TH.tmax; k += 10) {
      var y = TH.y0 + (k - TH.tmin) * (TH.y1 - TH.y0) / (TH.tmax - TH.tmin);
      s += Ln(126, y, 142, y, "#1f2937", 2.2) + '<text x="150" y="' + f1(y + 5) + '" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1f2937">' + k + '</text>';
      if (k < TH.tmax) { var y5 = TH.y0 + (k + 5 - TH.tmin) * (TH.y1 - TH.y0) / (TH.tmax - TH.tmin); s += Ln(126, y5, 134, y5, "#6b7280", 1.5); }
    }
    var top = TH.y0 + (t - TH.tmin) * (TH.y1 - TH.y0) / (TH.tmax - TH.tmin);
    s += '<rect data-merc="1" x="104" y="' + f1(top) + '" width="10" height="' + f1(TH.y0 + 14 - top) + '" fill="#dc2626"/>' + Ci(109, 268, 22, "#dc2626", "#1f2937", 3) + '<text x="196" y="30" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#6b7280">°C</text>';
    return s + "</svg>";
  }
  function qThermo() {
    var step = pick([5, 5, 10]), t = TH.tmin + step * rnd((TH.tmax - TH.tmin) / step + 1);
    if (t === TH.tmin) t += step;
    var cands = [t - 10, t - 5, t + 5, t + 10, t - 2, t + 2, t + 15, t - 15].filter(function (v) { return v >= TH.tmin && v <= TH.tmax; });
    var ans = [t + " °C"], seen = {}; seen[t] = 1;
    shuffle(cands).forEach(function (v) { if (ans.length < 4 && !seen[v]) { seen[v] = 1; ans.push(v + " °C"); } });
    return mk(T_THERMO, "thermometre", t % 10 === 0 ? "facile" : "moyen", "Quelle température indique ce thermomètre ?", ans, thermoSvg(t), "Le haut de la colonne rouge est à " + t + " °C.");
  }

  /* ---------- 🔷 Solides ---------- */
  var SOLIDS = [
    { id: "cube", name: "Un cube", faces: 6, vertices: 8, draw: function () { return Po([[100, 90], [180, 90], [180, 170], [100, 170]], "#60a5fa", "#1e3a8a", 3) + Po([[100, 90], [135, 60], [215, 60], [180, 90]], "#93c5fd", "#1e3a8a", 3) + Po([[180, 90], [215, 60], [215, 140], [180, 170]], "#3b82f6", "#1e3a8a", 3); } },
    { id: "pave", name: "Un pavé droit", faces: 6, vertices: 8, draw: function () { return Po([[60, 100], [190, 100], [190, 165], [60, 165]], "#fbbf24", "#78350f", 3) + Po([[60, 100], [95, 70], [225, 70], [190, 100]], "#fde68a", "#78350f", 3) + Po([[190, 100], [225, 70], [225, 135], [190, 165]], "#f59e0b", "#78350f", 3); } },
    { id: "cylindre", name: "Un cylindre", faces: null, vertices: 0, draw: function () { return '<rect x="95" y="62" width="110" height="100" fill="#34d399" stroke="#065f46" stroke-width="3"/>' + '<ellipse cx="150" cy="162" rx="55" ry="18" fill="#34d399" stroke="#065f46" stroke-width="3"/>' + '<rect x="97" y="62" width="106" height="98" fill="#34d399"/>' + '<ellipse cx="150" cy="62" rx="55" ry="18" fill="#6ee7b7" stroke="#065f46" stroke-width="3"/>'; } },
    { id: "cone", name: "Un cône", faces: null, vertices: 1, draw: function () { return '<ellipse cx="150" cy="160" rx="62" ry="20" fill="#f87171" stroke="#7f1d1d" stroke-width="3"/>' + Po([[88, 160], [150, 30], [212, 160]], "#f87171", "#7f1d1d", 3) + '<path d="M88 160 A62 20 0 0 0 212 160" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/>'; } },
    { id: "sphere", name: "Une sphère", faces: null, vertices: 0, draw: function () { var id = uid("rg"); return '<defs><radialGradient id="' + id + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ddd6fe"/><stop offset="1" stop-color="#6d28d9"/></radialGradient></defs>' + Ci(150, 100, 72, "url(#" + id + ")", "#4c1d95", 3); } },
    { id: "pyramide", name: "Une pyramide", faces: 5, vertices: 5, draw: function () { return Po([[70, 150], [150, 175], [235, 140], [150, 30]], "#fb923c", "#7c2d12", 3) + Po([[70, 150], [150, 175], [150, 30]], "#fdba74", "#7c2d12", 3) + Po([[150, 175], [235, 140], [150, 30]], "#ea580c", "#7c2d12", 3); } },
    { id: "prisme", name: "Un prisme à base triangulaire", faces: 5, vertices: 6, draw: function () { return Po([[70, 150], [150, 150], [110, 80]], "#c084fc", "#581c87", 3) + Po([[70, 150], [150, 150], [215, 120], [135, 120]], "#a855f7", "#581c87", 3) + Po([[110, 80], [150, 150], [215, 120], [175, 50]], "#d8b4fe", "#581c87", 3); } }
  ];
  function solidSvg(sd) { return open(300, 200) + '<rect width="300" height="200" fill="#eef2f7"/><g data-solid="' + sd.id + '">' + sd.draw() + "</g></svg>"; }
  function qSolidName() {
    var sd = pick(SOLIDS), wrong = sample(SOLIDS.filter(function (x) { return x !== sd; }), 3);
    return mk(T_SOLIDS, "solide", ["cube", "sphere", "cylindre"].indexOf(sd.id) >= 0 ? "facile" : "moyen", "Comment s'appelle ce solide ?", [sd.name].concat(wrong.map(function (x) { return x.name; })), solidSvg(sd), "C'est " + sd.name.toLowerCase() + ".");
  }
  function qSolidCount() {
    var poly = SOLIDS.filter(function (x) { return x.faces; }), sd = pick(poly), faces = Math.random() < 0.5;
    var val = faces ? sd.faces : sd.vertices;
    return mk(T_SOLIDS, faces ? "solide-faces" : "solide-sommets", "difficile", faces ? "Combien de faces a ce solide ?" : "Combien de sommets a ce solide ?", distinctNums(val, [val - 2, val - 1, val + 1, val + 2, val + 3], 1), solidSvg(sd),
      sd.name + " a " + val + (faces ? " faces." : " sommets."));
  }

  /* ---------- 🏛️ Chiffres romains ---------- */
  function toRoman(n) {
    var m = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], s = "";
    m.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }
  function qRoman() {
    var lvl = pick(["facile", "moyen", "moyen", "difficile"]), n = lvl === "facile" ? 1 + rnd(20) : lvl === "moyen" ? 20 + rnd(80) : 100 + rnd(900), r = toRoman(n);
    var cands = [n + 1, n - 1, n + 10, n - 10, n + 5, n - 5, n + 11, n - 11, n + 9, n - 9];
    var rev = r.match(/(IV|IX|XL|XC|CD|CM)/);
    if (rev) cands.unshift(n + 2 * ({ IV: 1, IX: 1, XL: 10, XC: 10, CD: 100, CM: 100 })[rev[1]]);          /* piège : lire « IX » comme 11 */
    var ans = distinctNums(n, cands.filter(function (v) { return v > 0; }), 1);
    var s = open(300, 130) + '<rect width="300" height="130" fill="#f5efe0"/><text data-roman="' + r + '" x="150" y="84" font-family="Georgia, \'Times New Roman\', serif" font-size="' + (r.length > 8 ? 40 : r.length > 5 ? 54 : 68) + '" font-weight="700" text-anchor="middle" fill="#3f2d12">' + r + "</text></svg>";
    return mk(T_ROMAN, "romain", lvl, "Quel nombre est écrit en chiffres romains ?", ans, s, r + " = " + n + " (un chiffre plus petit placé avant un plus grand se soustrait : IV = 4, IX = 9, XL = 40…).");
  }

  /* ---------- 📊 Lire un graphique ---------- */
  var CH = { x0: 50, y0: 190, hmax: 150, vmax: 50 };       /* le sommet de l'axe vaut 50 */
  function chartSvg(labels, vals) {
    var s = open(300, 230) + '<rect width="300" height="230" fill="#ffffff"/>', k, n = labels.length, bw = 28, gap = (240 - n * bw) / (n + 1);
    for (k = 0; k <= 5; k++) {
      var y = CH.y0 - k * CH.hmax / 5;
      s += Ln(CH.x0, y, 290, y, k === 0 ? "#111827" : "#d1d5db", k === 0 ? 2 : 1) + '<text x="42" y="' + f1(y + 4) + '" font-family="Arial, Helvetica, sans-serif" font-size="11" text-anchor="end" fill="#374151">' + (k * 10) + "</text>";
    }
    s += Ln(CH.x0, CH.y0 - CH.hmax, CH.x0, CH.y0, "#111827", 2);
    var colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    labels.forEach(function (L, i) {
      var h = vals[i] / CH.vmax * CH.hmax, x = CH.x0 + gap + i * (bw + gap);
      s += '<rect data-bar="' + L + '" data-v="' + vals[i] + '" x="' + f1(x) + '" y="' + f1(CH.y0 - h) + '" width="' + bw + '" height="' + f1(h) + '" fill="' + colors[i % colors.length] + '"/>' +
        '<text x="' + f1(x + bw / 2) + '" y="' + (CH.y0 + 18) + '" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="#111827">' + L + "</text>";
    });
    return s + "</svg>";
  }
  function chartData() {
    var n = pick([4, 5, 5]), labels = ["A", "B", "C", "D", "E", "F"].slice(0, n), vals = [], seen = {};
    while (vals.length < n) { var v = 5 * (1 + rnd(10)); if (!seen[v]) { seen[v] = 1; vals.push(v); } }
    return { labels: labels, vals: vals };
  }
  function qChartMax() {
    var d = chartData(), mx = Math.max.apply(null, d.vals), mn = Math.min.apply(null, d.vals), hi = Math.random() < 0.5, tgt = d.labels[d.vals.indexOf(hi ? mx : mn)];
    return mk(T_CHART, "graph-extreme", "facile", hi ? "Quelle barre est la plus haute ?" : "Quelle barre est la plus basse ?", ["La barre " + tgt].concat(d.labels.filter(function (l) { return l !== tgt; }).slice(0, 3).map(function (l) { return "La barre " + l; })), chartSvg(d.labels, d.vals),
      "La barre " + tgt + " vaut " + (hi ? mx : mn) + " : c'est la plus " + (hi ? "haute." : "basse."));
  }
  function qChartValue() {
    var d = chartData(), i = rnd(d.labels.length), v = d.vals[i];
    return mk(T_CHART, "graph-valeur", "moyen", "Quelle est la valeur de la barre " + d.labels[i] + " ?", distinctNums(v, [v - 5, v + 5, v - 10, v + 10, v + 15, v - 15], 5), chartSvg(d.labels, d.vals), "La barre " + d.labels[i] + " atteint " + v + ".");
  }
  function qChartSum() {
    var d = chartData(), a = 0, b = 1 + rnd(d.labels.length - 1), tot;
    var pairs = shuffle(d.labels.map(function (l, i) { return i; })).slice(0, 2); a = pairs[0]; b = pairs[1]; tot = d.vals[a] + d.vals[b];
    return mk(T_CHART, "graph-somme", "difficile", "Quel est le total des barres " + d.labels[a] + " et " + d.labels[b] + " ?", distinctNums(tot, [tot - 5, tot + 5, tot - 10, tot + 10, tot + 15, tot - 15], 10), chartSvg(d.labels, d.vals), d.labels[a] + " (" + d.vals[a] + ") + " + d.labels[b] + " (" + d.vals[b] + ") = " + tot + ".");
  }

  /* ---------- Assemblage ---------- */
  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true; q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  var PLAN = [[qFlagName, 26], [qFlagCapital, 10], [qFlagGrid, 12], [qNoteName, 22], [qNoteCount, 10], [qDiceSum, 12], [qDiceOpposite, 6], [qDomino, 10], [qCompass, 24], [qThermo, 24], [qSolidName, 18], [qSolidCount, 8], [qRoman, 30], [qChartMax, 10], [qChartValue, 12], [qChartSum, 8]];
  function build() {
    var out = [];
    PLAN.forEach(function (p) { var made = 0, guard = 0; while (made < p[1] && guard++ < p[1] * 8) { var q = p[0](); if (q && valid(q)) { out.push(q); made++; } } });
    return out;
  }
  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].v47More) QUESTIONS.splice(i, 1);
    var pool = build(); pool.forEach(function (q) { QUESTIONS.push(q); }); return pool.length;
  }
  return { de: de, FLAGS: FLAGS, THEMES: [T_FLAGS, T_NOTES, T_DICE, T_COMPASS, T_THERMO, T_SOLIDS, T_ROMAN, T_CHART], flagSvg: flagSvg, toRoman: toRoman, noteY: noteY, TH: TH, CH: CH, SOLIDS: SOLIDS, DIRS: DIRS, NOTE_NAMES: NOTE_NAMES, build: build, register: register, valid: valid };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V47More;
if (typeof QUESTIONS !== "undefined") {
  V47More.register();
  if (typeof startGame === "function") {
    var __v47MoreStart = startGame;
    startGame = function () { try { V47More.register(); } catch (e) {} return __v47MoreStart.apply(this, arguments); };
  }
}
