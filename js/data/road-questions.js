/* =============================================================================
   Thème « 🚦 Code de la route en images » — panneaux, feux, mises en situation et conditions de conduite,
   dessinés par le jeu (SVG), sans fichier externe. Comme pour les « Questions en images », chaque réponse est
   calculée à partir des données qui servent à DESSINER la scène : elle ne peut pas contredire l'image.
   Le lot est régénéré à chaque partie (autres couleurs, autres positions, autres panneaux).
   Les dessins sont des schémas simplifiés des panneaux français, pas des reproductions officielles.
   ============================================================================= */
var V41Road = (function () {
  "use strict";
  var THEME = "🚦 Code de la route en images";

  /* ---------- Aléatoire ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, k) { return shuffle(a).slice(0, k); }

  var RED = "#d6101e", BLUE = "#1458b8", INK = "#111111", YEL = "#f5c400";

  /* ---------- Éléments de dessin (repère 200 × 200) ---------- */
  function tri(inner) { return '<polygon points="100,12 190,172 10,172" fill="#ffffff" stroke="' + RED + '" stroke-width="14" stroke-linejoin="round"/>' + inner; }
  function disc(inner, fill) { return '<circle cx="100" cy="100" r="88" fill="' + (fill || "#ffffff") + '" stroke="' + RED + '" stroke-width="14"/>' + inner; }
  function bluedisc(inner) { return '<circle cx="100" cy="100" r="90" fill="' + BLUE + '" stroke="#ffffff" stroke-width="6"/>' + inner; }
  function bluesq(inner) { return '<rect x="10" y="10" width="180" height="180" rx="16" fill="' + BLUE + '" stroke="#ffffff" stroke-width="6"/>' + inner; }
  function mirror(inner) { return '<g transform="translate(200,0) scale(-1,1)">' + inner + '</g>'; }
  function ped(x, y, s) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">'
      + '<circle cx="0" cy="-36" r="7" fill="' + INK + '"/><path d="M0 -27 L0 -6 M-13 -18 L0 -25 L13 -14 M0 -6 L-10 12 M0 -6 L10 12"/></g>';
  }
  function car(x, y, color, s) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')"><path d="M0 24 L6 8 Q10 0 20 0 L44 0 Q54 0 58 8 L64 24 Z" fill="' + color + '"/>'
      + '<circle cx="14" cy="26" r="7" fill="' + INK + '"/><circle cx="50" cy="26" r="7" fill="' + INK + '"/></g>';
  }
  function bike(col) {
    return '<g stroke="' + (col || "#ffffff") + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="66" cy="122" r="25"/><circle cx="136" cy="122" r="25"/>'
      + '<path d="M66 122 L92 84 L124 84 L136 122 M92 84 L104 122 L66 122 M124 84 L118 68 L132 68 M86 76 L100 76"/></g>';
  }
  function octagon() {
    var pts = [], i;
    for (i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; pts.push((100 + 92 * Math.sin(a)).toFixed(1) + "," + (100 - 92 * Math.cos(a)).toFixed(1)); }
    return '<polygon points="' + pts.join(" ") + '" fill="' + RED + '" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/>'
      + '<text x="100" y="121" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="bold" text-anchor="middle" fill="#ffffff">STOP</text>';
  }
  function speedText(n) { return '<text x="100" y="' + (String(n).length > 2 ? 123 : 128) + '" font-family="Arial, Helvetica, sans-serif" font-size="' + (String(n).length > 2 ? 66 : 78) + '" font-weight="bold" text-anchor="middle" fill="' + INK + '">' + n + '</text>'; }

  /* ---------- Catalogue des panneaux ----------
     cat : danger / interdiction / obligation / indication / priorité ; shape : forme du panneau */
  var SHAPES = { "tri": "Un triangle, pointe en haut", "triInv": "Un triangle, pointe en bas", "rond": "Un rond", "octo": "Un octogone", "losange": "Un losange", "carre": "Un carré", "rect": "Un rectangle", "croix": "Une croix en X" };
  var CATS = { danger: "Un panneau de danger", interdiction: "Un panneau d'interdiction", obligation: "Un panneau d'obligation", indication: "Un panneau d'indication", priorite: "Un panneau de priorité" };
  var SIGNS = [
    { id: "virage-d", name: "Virage à droite", cat: "danger", shape: "tri", d: "moyen", draw: function () { return tri('<path d="M82 150 L82 112 Q82 86 108 86 L122 86" fill="none" stroke="' + INK + '" stroke-width="13"/><polygon points="118,66 148,86 118,106" fill="' + INK + '"/>'); } },
    { id: "virage-g", name: "Virage à gauche", cat: "danger", shape: "tri", d: "moyen", draw: function () { return tri(mirror('<path d="M82 150 L82 112 Q82 86 108 86 L122 86" fill="none" stroke="' + INK + '" stroke-width="13"/><polygon points="118,66 148,86 118,106" fill="' + INK + '"/>')); } },
    { id: "pietons", name: "Passage pour piétons à proximité", cat: "danger", shape: "tri", d: "facile", draw: function () { return tri(ped(100, 112, 1.25) + '<rect x="62" y="140" width="76" height="6" fill="' + INK + '"/><rect x="62" y="150" width="76" height="6" fill="' + INK + '"/>'); } },
    { id: "enfants", name: "Endroit fréquenté par des enfants", cat: "danger", shape: "tri", d: "facile", draw: function () { return tri(ped(82, 142, 1.1) + ped(120, 148, 0.85)); } },
    { id: "feux", name: "Feux tricolores à proximité", cat: "danger", shape: "tri", d: "moyen", draw: function () { return tri('<rect x="81" y="62" width="38" height="96" rx="7" fill="' + INK + '"/><circle cx="100" cy="80" r="10" fill="#e11d2e"/><circle cx="100" cy="110" r="10" fill="#f59e0b"/><circle cx="100" cy="140" r="10" fill="#22a447"/>'); } },
    { id: "croisement", name: "Intersection où la priorité à droite s'applique", cat: "danger", shape: "tri", d: "difficile", draw: function () { return tri('<rect x="92" y="56" width="16" height="96" fill="' + INK + '"/><rect x="56" y="96" width="88" height="16" fill="' + INK + '"/>'); } },
    { id: "glissante", name: "Chaussée glissante", cat: "danger", shape: "tri", d: "moyen", draw: function () { return tri(car(68, 94, INK, 1) + '<path d="M62 138 q8 -8 16 0 t16 0 t16 0 t16 0 M62 150 q8 -8 16 0 t16 0 t16 0 t16 0" fill="none" stroke="' + INK + '" stroke-width="5"/>'); } },
    { id: "descente", name: "Descente dangereuse", cat: "danger", shape: "tri", d: "difficile", draw: function () { return tri('<polygon points="62,118 138,148 62,148" fill="' + INK + '"/><text x="100" y="108" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" text-anchor="middle" fill="' + INK + '">10 %</text>'); } },
    { id: "danger", name: "Autre danger", cat: "danger", shape: "tri", d: "moyen", draw: function () { return tri('<text x="100" y="150" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="bold" text-anchor="middle" fill="' + INK + '">!</text>'); } },
    { id: "niveau", name: "Passage à niveau (croix de Saint-André)", cat: "danger", shape: "croix", d: "difficile", draw: function () { return '<g transform="rotate(45 100 100)"><rect x="12" y="78" width="176" height="44" rx="4" fill="#ffffff" stroke="' + RED + '" stroke-width="7"/></g><g transform="rotate(-45 100 100)"><rect x="12" y="78" width="176" height="44" rx="4" fill="#ffffff" stroke="' + RED + '" stroke-width="7"/></g><g transform="rotate(45 100 100)"><rect x="19" y="85" width="162" height="30" fill="#ffffff"/></g>'; } },
    { id: "giratoire-danger", name: "Danger : carrefour à sens giratoire", cat: "danger", shape: "tri", d: "difficile", draw: function () {
      var arc = '<path d="M100 78 A28 28 0 0 0 72 106" fill="none" stroke="' + INK + '" stroke-width="8"/><polygon points="62,104 82,104 72,120" fill="' + INK + '"/>';
      return tri(arc + '<g transform="rotate(120 100 106)">' + arc + '</g><g transform="rotate(240 100 106)">' + arc + '</g>'); } },
    { id: "retrecie", name: "Chaussée rétrécie", cat: "danger", shape: "tri", d: "difficile", draw: function () { return tri('<path d="M68 152 L68 124 L84 98 L84 66 M132 152 L132 124 L116 98 L116 66" fill="none" stroke="' + INK + '" stroke-width="11" stroke-linejoin="round"/>'); } },
    { id: "dos-ane", name: "Dos d'âne", cat: "danger", shape: "tri", d: "difficile", draw: function () { return tri('<path d="M52 142 L80 142 Q100 92 120 142 L148 142" fill="none" stroke="' + INK + '" stroke-width="12" stroke-linejoin="round"/>'); } },
    { id: "pietons-interdit", name: "Accès interdit aux piétons", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc(ped(100, 138, 1.7)); } },
    { id: "velos-interdit", name: "Accès interdit aux cyclistes", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc('<g transform="translate(100 100) scale(0.62) translate(-100 -100)">' + bike(INK) + '</g>'); } },
    { id: "zone-30", name: "Zone 30", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc('<text x="100" y="84" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="' + INK + '">ZONE</text><text x="100" y="140" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="bold" text-anchor="middle" fill="' + INK + '">30</text>'); } },
    { id: "sens-interdit", name: "Sens interdit", cat: "interdiction", shape: "rond", d: "facile", draw: function () { return '<circle cx="100" cy="100" r="90" fill="' + RED + '" stroke="#ffffff" stroke-width="6"/><rect x="30" y="84" width="140" height="32" fill="#ffffff"/>'; } },
    { id: "circ-interdite", name: "Circulation interdite dans les deux sens", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc(""); } },
    { id: "stationnement", name: "Stationnement interdit", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc('<line x1="46" y1="46" x2="154" y2="154" stroke="' + RED + '" stroke-width="16"/>', BLUE); } },
    { id: "arret-stationnement", name: "Arrêt et stationnement interdits", cat: "interdiction", shape: "rond", d: "difficile", draw: function () { return disc('<line x1="46" y1="46" x2="154" y2="154" stroke="' + RED + '" stroke-width="16"/><line x1="154" y1="46" x2="46" y2="154" stroke="' + RED + '" stroke-width="16"/>', BLUE); } },
    { id: "depasser", name: "Interdiction de dépasser", cat: "interdiction", shape: "rond", d: "moyen", draw: function () { return disc(car(34, 86, RED, 0.72) + car(104, 86, INK, 0.72)); } },
    { id: "gauche-interdit", name: "Interdiction de tourner à gauche", cat: "interdiction", shape: "rond", d: "difficile", draw: function () { return disc('<path d="M108 150 L108 106 L78 106" fill="none" stroke="' + INK + '" stroke-width="15"/><polygon points="84,86 54,106 84,126" fill="' + INK + '"/><line x1="46" y1="46" x2="154" y2="154" stroke="' + RED + '" stroke-width="14"/>'); } },
    { id: "tout-droit", name: "Direction obligatoire : tout droit", cat: "obligation", shape: "rond", d: "moyen", draw: function () { return bluedisc('<polygon points="100,36 140,86 114,86 114,162 86,162 86,86 60,86" fill="#ffffff"/>'); } },
    { id: "droite-oblig", name: "Direction obligatoire : à droite", cat: "obligation", shape: "rond", d: "moyen", draw: function () { return bluedisc('<path d="M78 164 L78 104 L116 104" fill="none" stroke="#ffffff" stroke-width="22"/><polygon points="112,76 158,104 112,132" fill="#ffffff"/>'); } },
    { id: "velo", name: "Piste cyclable obligatoire", cat: "obligation", shape: "rond", d: "moyen", draw: function () { return bluedisc(bike()); } },
    { id: "giratoire", name: "Sens giratoire obligatoire", cat: "obligation", shape: "rond", d: "difficile", draw: function () {
      var arc = '<path d="M100 54 A46 46 0 0 0 54 100" fill="none" stroke="#ffffff" stroke-width="11"/><polygon points="40,98 68,98 54,120" fill="#ffffff"/>';
      return bluedisc(arc + '<g transform="rotate(120 100 100)">' + arc + '</g><g transform="rotate(240 100 100)">' + arc + '</g>'); } },
    { id: "parking", name: "Parking", cat: "indication", shape: "carre", d: "facile", draw: function () { return bluesq('<text x="100" y="146" font-family="Arial, Helvetica, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff">P</text>'); } },
    { id: "hopital", name: "Hôpital ou clinique", cat: "indication", shape: "carre", d: "facile", draw: function () { return bluesq('<text x="100" y="146" font-family="Arial, Helvetica, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff">H</text>'); } },
    { id: "sens-unique", name: "Sens unique", cat: "indication", shape: "rect", d: "facile", draw: function () { return '<rect x="6" y="52" width="188" height="96" rx="12" fill="' + BLUE + '" stroke="#ffffff" stroke-width="6"/><polygon points="30,88 118,88 118,64 172,100 118,136 118,112 30,112" fill="#ffffff"/>'; } },
    { id: "stop", name: "Stop : arrêt obligatoire", cat: "priorite", shape: "octo", d: "facile", draw: function () { return octagon(); } },
    { id: "cedez", name: "Cédez le passage", cat: "priorite", shape: "triInv", d: "facile", draw: function () { return '<polygon points="10,26 190,26 100,188" fill="#ffffff" stroke="' + RED + '" stroke-width="15" stroke-linejoin="round"/>'; } },
    { id: "priorite", name: "Route à priorité (vous êtes prioritaire aux intersections)", cat: "priorite", shape: "losange", d: "moyen", draw: function () { return '<polygon points="100,6 194,100 100,194 6,100" fill="#ffffff" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/><polygon points="100,26 174,100 100,174 26,100" fill="' + YEL + '"/>'; } }
  ];
  var SPEEDS = [30, 50, 70, 80, 90, 110, 130];
  function speedSign(n) {
    return { id: "vitesse-" + n, name: "Limitation de vitesse à " + n + " km/h", cat: "interdiction", shape: "rond", d: n <= 50 ? "facile" : "moyen", speed: n, draw: function () { return disc(speedText(n)); } };
  }
  function catalogue() { return SIGNS.concat([speedSign(pick([30, 50, 70])), speedSign(pick([80, 90, 110, 130]))]); }
  function find(id) { for (var i = 0; i < SIGNS.length; i++) if (SIGNS[i].id === id) return SIGNS[i]; return null; }

  function svgOpen(w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'; }
  function singleSign(s) {
    return svgOpen(300, 300) + '<rect width="300" height="300" fill="#e6edf5"/><rect x="141" y="244" width="18" height="56" fill="#9aa5b1"/>'
      + '<g data-sign="' + s.id + '" transform="translate(40,20) scale(1.1)">' + s.draw() + '</g></svg>';
  }
  function mk(diff, text, answers, svg, correction, kind) {
    return { category: THEME, difficulty: diff, question: text, answers: answers, correct: 0, correction: correction,
      media: { type: "svg", svg: svg }, source: "officiel", v35: true, v41Road: true, kind: kind };
  }
  function others(list, not, k, prefer) {
    var pool = list.filter(function (x) { return x !== not; });
    var near = prefer ? pool.filter(prefer) : [];
    var first = sample(near, Math.min(k, near.length));
    var rest = sample(pool.filter(function (x) { return first.indexOf(x) < 0; }), k - first.length);
    return first.concat(rest);
  }

  /* ---------- Questions sur un panneau ---------- */
  function qSignMeaning() {
    var cat = catalogue(), s = pick(cat);
    var wrong = others(cat, s, 3, function (x) { return x.cat === s.cat && x.speed === undefined; }).map(function (x) { return x.name; });
    return mk(s.d, pick(["Que signifie ce panneau ?", "Quel est le nom de ce panneau ?", "Comment s'appelle ce panneau ?"]), [s.name].concat(wrong), singleSign(s), "C'est le panneau « " + s.name + " ».", "signe");
  }
  function qSignCategory() {
    var s = pick(catalogue()), keys = Object.keys(CATS), wrong = sample(keys.filter(function (k) { return k !== s.cat; }), 3);
    return mk("facile", "À quelle famille appartient ce panneau ?", [CATS[s.cat]].concat(wrong.map(function (k) { return CATS[k]; })), singleSign(s), "Ce panneau est " + CATS[s.cat].toLowerCase().replace("un panneau", "un panneau") + ".", "famille");
  }
  function qSignShape() {
    var s = pick(catalogue()), keys = Object.keys(SHAPES), wrong = sample(keys.filter(function (k) { return k !== s.shape; }), 3);
    return mk("facile", "Quelle est la forme de ce panneau ?", [SHAPES[s.shape]].concat(wrong.map(function (k) { return SHAPES[k]; })), singleSign(s), "Sa forme : " + SHAPES[s.shape].toLowerCase() + ".", "forme");
  }
  function qSpeed() {
    var n = pick(SPEEDS), s = speedSign(n), wrong = sample(SPEEDS.filter(function (v) { return v !== n; }), 3);
    return mk(s.d, pick(["Quelle vitesse maximale ce panneau impose-t-il ?", "À quelle vitesse maximale pouvez-vous rouler au niveau de ce panneau ?"]), [n + " km/h"].concat(wrong.map(function (v) { return v + " km/h"; })), singleSign(s), "Limitation à " + n + " km/h.", "vitesse");
  }
  var ACTIONS = {
    "stop": { q: "Que devez-vous faire devant ce panneau ?", a: "Vous arrêter complètement, puis laisser passer les autres véhicules", w: ["Ralentir seulement si un véhicule arrive", "Passer en klaxonnant", "Ralentir et passer si la voie est libre"] },
    "cedez": { q: "Que devez-vous faire devant ce panneau ?", a: "Laisser passer les véhicules de la route croisée, et vous arrêter si nécessaire", w: ["Vous arrêter obligatoirement, dans tous les cas", "Passer avant les autres", "Accélérer pour passer le premier"] },
    "sens-interdit": { q: "Que signifie ce panneau pour le conducteur qui le voit en face ?", a: "Il est interdit de s'engager dans cette voie", w: ["Il a la priorité sur cette voie", "Il doit ralentir mais peut passer", "La vitesse est limitée dans cette voie"] },
    "parking": { q: "Que vous indique ce panneau ?", a: "Une zone de stationnement", w: ["Un hôpital", "Une zone de travaux", "Un arrêt de bus"] },
    "hopital": { q: "Que vous indique ce panneau ?", a: "Un hôpital ou une clinique à proximité", w: ["Un parking", "Un poste de police", "Une pharmacie"] }
  };
  function qAction() {
    var id = pick(Object.keys(ACTIONS)), A = ACTIONS[id], s = find(id);
    return mk(s.d, A.q, [A.a].concat(A.w), singleSign(s), A.a + ".", "action");
  }
  function qWhichSign() {
    var cat = catalogue(), s = pick(cat.filter(function (x) { return x.speed === undefined; }));
    var four = shuffle([s].concat(others(cat.filter(function (x) { return x.speed === undefined; }), s, 3, function (x) { return x.cat === s.cat; })));
    var L = ["A", "B", "C", "D"], body = svgOpen(420, 420) + '<rect width="420" height="420" fill="#e6edf5"/>', right = "";
    four.forEach(function (x, i) {
      var cx = (i % 2) * 210 + 10, cy = Math.floor(i / 2) * 210 + 10;
      body += '<g data-panel="' + L[i] + '" data-sign="' + x.id + '" transform="translate(' + cx + ',' + cy + ') scale(0.82)">' + x.draw() + '</g>'
        + '<circle cx="' + (cx + 20) + '" cy="' + (cy + 20) + '" r="17" fill="#1f2937"/><text x="' + (cx + 20) + '" y="' + (cy + 27) + '" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="bold" text-anchor="middle" fill="#ffffff">' + L[i] + '</text>';
      if (x === s) right = L[i];
    });
    body += '</svg>';
    var ans = [right].concat(L.filter(function (l) { return l !== right; }));
    return mk(s.d === "difficile" ? "difficile" : "moyen", "Quel panneau signifie : « " + s.name + " » ?", ans.map(function (l, i) { return i === 0 ? "Le panneau " + l : "Le panneau " + l; }), body, "C'est le panneau " + right + ".", "quel");
  }

  /* ---------- Feux tricolores ---------- */
  var LIGHTS = {
    "rouge": { a: "S'arrêter", w: ["Passer en ralentissant", "Accélérer pour passer", "Passer si personne n'arrive"], d: "facile" },
    "orange": { a: "S'arrêter, sauf si l'arrêt est dangereux", w: ["Accélérer pour passer avant le rouge", "Passer sans ralentir", "Klaxonner et passer"], d: "moyen" },
    "vert": { a: "Passer en restant vigilant", w: ["S'arrêter obligatoirement", "Accélérer sans regarder", "Klaxonner avant de passer"], d: "facile" }
  };
  function lightSvg(lit) {
    var cols = { rouge: "#ef2b2b", orange: "#f59e0b", vert: "#22c55e" }, dark = { rouge: "#4a1a1a", orange: "#4a3512", vert: "#173d24" };
    var s = svgOpen(240, 300) + '<rect width="240" height="300" fill="#dde6ee"/><rect x="112" y="230" width="16" height="70" fill="#7b8794"/><g data-lit="' + lit + '">'
      + '<rect x="70" y="20" width="100" height="212" rx="16" fill="' + INK + '"/>';
    ["rouge", "orange", "vert"].forEach(function (c, i) {
      s += '<circle cx="120" cy="' + (66 + i * 66) + '" r="25" fill="' + (c === lit ? cols[c] : dark[c]) + '"' + (c === lit ? ' stroke="#ffffff" stroke-width="3"' : "") + '/>';
    });
    return s + '</g></svg>';
  }
  function qLight() {
    var lit = pick(Object.keys(LIGHTS)), L = LIGHTS[lit];
    return mk(L.d, pick(["Voici le feu devant vous. Que devez-vous faire ?", "Le feu est comme sur l'image. Que doit faire le conducteur ?"]), [L.a].concat(L.w), lightSvg(lit), L.a + ".", "feu");
  }

  /* ---------- Mises en situation : intersection vue de dessus ---------- */
  var ARMS = { S: { x: 210, y: 308, rot: 0, sx: 272, sy: 290 }, W: { x: 52, y: 210, rot: 90, sx: 72, sy: 272 }, N: { x: 150, y: 52, rot: 180, sx: 88, sy: 72 }, E: { x: 308, y: 150, rot: 270, sx: 288, sy: 88 } };
  var RIGHT_OF = { S: "E", E: "N", N: "W", W: "S" };      /* bras situé à droite d'un conducteur qui arrive par ce bras */
  var VCOLORS = [{ m: "bleu", hex: "#1f6feb" }, { m: "rouge", hex: "#e11d2e" }, { m: "vert", hex: "#1fa34a" }, { m: "jaune", hex: "#facc15" }, { m: "orange", hex: "#f97316" }, { m: "violet", hex: "#8b3fd1" }];
  function route(turn) {
    var line = '<g fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round">', head = "";
    if (turn === "left") { line += '<path d="M0 -50 L0 -78 Q0 -110 -32 -110 L-56 -110"/>'; head = '<polygon points="-56,-119 -56,-101 -72,-110" fill="#ffffff"/>'; }
    else if (turn === "right") { line += '<path d="M0 -50 L0 -78 Q0 -110 32 -110 L56 -110"/>'; head = '<polygon points="56,-119 56,-101 72,-110" fill="#ffffff"/>'; }
    else { line += '<path d="M0 -50 L0 -112"/>'; head = '<polygon points="-9,-110 9,-110 0,-128" fill="#ffffff"/>'; }
    return line + '</g>' + head;
  }
  function vehicle(arm, c, turn) {
    var a = ARMS[arm];
    return '<g data-v="' + c.m + '" data-arm="' + arm + '"' + (turn ? ' data-turn="' + turn + '"' : "") + ' transform="translate(' + a.x + ',' + a.y + ') rotate(' + a.rot + ')">' + (turn ? route(turn) : "") + carTop(c) + '</g>';
  }
  function carTop(c) {
    return '<rect x="-14" y="-27" width="28" height="54" rx="7" fill="' + c.hex + '" stroke="#111111" stroke-width="2"/>'
      + '<rect x="-10" y="-15" width="20" height="11" rx="3" fill="#cfe8ff"/><rect x="-10" y="9" width="20" height="9" rx="3" fill="#cfe8ff"/>'
      + '<circle cx="-9" cy="-25" r="2.5" fill="#fff3a0"/><circle cx="9" cy="-25" r="2.5" fill="#fff3a0"/>';
  }
  function signOnArm(id, arm) {
    var a = ARMS[arm], s = find(id);
    return '<g data-sign="' + id + '" data-arm="' + arm + '" transform="translate(' + (a.sx - 30) + ',' + (a.sy - 30) + ') scale(0.3)">' + s.draw() + '</g>';
  }
  function crossing(vs, signs) {
    var s = svgOpen(360, 360) + '<rect width="360" height="360" fill="#8fcf7a"/><rect x="120" y="0" width="120" height="360" fill="#4a4f57"/><rect x="0" y="120" width="360" height="120" fill="#4a4f57"/>'
      + '<g stroke="#ffffff" stroke-width="3" stroke-dasharray="14 12"><line x1="180" y1="0" x2="180" y2="120"/><line x1="180" y1="240" x2="180" y2="360"/><line x1="0" y1="180" x2="120" y2="180"/><line x1="240" y1="180" x2="360" y2="180"/></g>';
    signs.forEach(function (g) { s += signOnArm(g[0], g[1]); });
    vs.forEach(function (v) { s += vehicle(v[0], v[1], v[2]); });
    return s + '</svg>';
  }
  function pairOfArms() {
    var a = pick(["S", "W", "N", "E"]), b = pick([RIGHT_OF[a], Object.keys(RIGHT_OF).filter(function (k) { return RIGHT_OF[k] === a; })[0]]);
    return [a, b];                                                    /* deux bras voisins (jamais opposés) */
  }
  function twoColors() { var c = sample(VCOLORS, 2); return c; }
  function vehAnswers(win, lose) {
    return ["Le véhicule " + win.m, "Le véhicule " + lose.m, "Les deux en même temps", "Celui qui arrive le plus vite"];
  }
  function qRightPriority() {
    var arms = pairOfArms(), cs = twoColors(), A = arms[0], B = arms[1];
    var winnerIsB = RIGHT_OF[A] === B, win = winnerIsB ? cs[1] : cs[0], lose = winnerIsB ? cs[0] : cs[1];
    return mk("moyen", "Cette intersection n'a ni panneau ni feu. Les deux véhicules vont tout droit. Lequel est prioritaire ?", vehAnswers(win, lose),
      crossing([[A, cs[0], "straight"], [B, cs[1], "straight"]], []), "Sans signalisation, la priorité est à droite : le véhicule " + win.m + " vient de la droite de l'autre.", "droite");
  }
  function qSignPriority() {
    var arms = pairOfArms(), cs = twoColors(), A = arms[0], B = arms[1], id = pick(["stop", "cedez"]);
    var who = rnd(2);                                                 /* 0 : le premier véhicule a le panneau, 1 : le second */
    var withSign = who === 0 ? cs[0] : cs[1], other = who === 0 ? cs[1] : cs[0], armOfSign = who === 0 ? A : B;
    var name = id === "stop" ? "Stop" : "Cédez le passage";
    return mk("moyen", "Un panneau « " + name + " » est placé sur la route du véhicule " + withSign.m + ". Les deux véhicules vont tout droit. Lequel passe en premier ?", vehAnswers(other, withSign),
      crossing([[A, cs[0], "straight"], [B, cs[1], "straight"]], [[id, armOfSign]]), "Le véhicule " + withSign.m + " doit céder le passage : le véhicule " + other.m + " passe en premier.", "panneau");
  }
  function qDiamond() {
    var A = pick(["S", "W", "N", "E"]), B = RIGHT_OF[A], cs = twoColors();
    return mk("difficile", "Le véhicule " + cs[0].m + " roule sur une route à priorité (panneau losange jaune). L'autre véhicule arrive par sa droite. Lequel est prioritaire ?", vehAnswers(cs[0], cs[1]),
      crossing([[A, cs[0], "straight"], [B, cs[1], "straight"]], [["priorite", A]]), "Le losange jaune donne la priorité : le véhicule " + cs[0].m + " passe en premier, même si l'autre arrive par sa droite.", "losange");
  }


  /* ---------- Tourner à gauche face à un véhicule qui va tout droit ---------- */
  var OPP = { S: "N", N: "S", E: "W", W: "E" };
  function qLeftTurn() {
    var A = pick(["S", "W", "N", "E"]), B = OPP[A], cs = twoColors();
    return mk("moyen", "Le véhicule " + cs[0].m + " tourne à gauche. Le véhicule " + cs[1].m + " arrive en face et va tout droit. Lequel passe en premier ?", vehAnswers(cs[1], cs[0]),
      crossing([[A, cs[0], "left"], [B, cs[1], "straight"]], []), "Celui qui tourne à gauche coupe la route de l'autre : il laisse passer le véhicule " + cs[1].m + " qui va tout droit.", "gauche");
  }

  /* ---------- Rond-point : la priorité est à celui qui est déjà dans l'anneau ---------- */
  function roundabout(ringC, enterC) {
    var rot = pick([0, 90, 180, 270]);
    var s = svgOpen(360, 360) + '<rect width="360" height="360" fill="#8fcf7a"/><g data-ring="' + ringC.m + '" data-enter="' + enterC.m + '" transform="rotate(' + rot + ' 180 180)">'
      + '<rect x="120" y="0" width="120" height="360" fill="#4a4f57"/><rect x="0" y="120" width="360" height="120" fill="#4a4f57"/><circle cx="180" cy="180" r="100" fill="#4a4f57"/>'
      + '<circle cx="180" cy="180" r="48" fill="#6fbf5b" stroke="#ffffff" stroke-width="4"/>'
      + '<g data-sign="cedez" transform="translate(272 290) rotate(' + (360 - rot) % 360 + ') translate(-30 -30) scale(0.3)">' + find("cedez").draw() + '</g>'
      + '<g data-role="ring" transform="translate(126,232) rotate(135)">' + carTop(ringC) + '</g>'
      + '<g data-role="enter" transform="translate(210,312) rotate(0)">' + carTop(enterC) + '</g>'
      + '</g></svg>';
    return s;
  }
  function qRoundabout() {
    var cs = twoColors();
    return mk("moyen", "Le véhicule " + cs[0].m + " est déjà dans le rond-point. Le véhicule " + cs[1].m + " veut y entrer (panneau « Cédez le passage »). Lequel passe en premier ?", vehAnswers(cs[0], cs[1]),
      roundabout(cs[0], cs[1]), "Dans un rond-point, la priorité est à ceux qui sont déjà engagés dans l'anneau : le véhicule " + cs[0].m + " passe en premier.", "rond-point");
  }

  /* ---------- Conditions de conduite : route + météo ---------- */
  var ROADS = {
    autoroute: { label: "AUTOROUTE", box: "#1458b8", txt: "#ffffff", sec: 130, wet: 110, name: "l'autoroute" },
    chaussees: { label: "2 CHAUSSÉES", box: "#ffffff", txt: "#111111", sec: 110, wet: 100, name: "une route à chaussées séparées par un terre-plein central" },
    ville: { label: "VILLE", box: "#ffffff", txt: "#111111", sec: 50, wet: 50, name: "l'agglomération" }
  };
  function sceneSvg(road, weather) {
    var R = ROADS[road], rain = weather === "pluie";
    var s = svgOpen(360, 220) + '<g data-road="' + road + '" data-weather="' + weather + '"><rect width="360" height="220" fill="' + (rain ? "#8c97a3" : "#bfe3ff") + '"/>';
    if (rain) {
      s += '<g fill="#e5e7eb"><ellipse cx="90" cy="38" rx="52" ry="20"/><ellipse cx="130" cy="30" rx="42" ry="22"/><ellipse cx="260" cy="48" rx="56" ry="20"/><ellipse cx="300" cy="38" rx="38" ry="18"/></g><g stroke="#2b6cb0" stroke-width="3" stroke-linecap="round">';
      for (var i = 0; i < 26; i++) { var x = 14 + (i * 37) % 340, y = 66 + (i * 53) % 90; s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 5) + '" y2="' + (y + 14) + '"/>'; }
      s += '</g>';
    } else { s += '<circle cx="300" cy="46" r="26" fill="#ffd84d"/><g fill="#ffffff" opacity="0.9"><ellipse cx="80" cy="44" rx="40" ry="14"/><ellipse cx="108" cy="38" rx="28" ry="14"/></g>'; }
    s += '<rect y="150" width="360" height="70" fill="' + (road === "ville" ? "#6b7280" : "#4a4f57") + '"/><g stroke="#ffffff" stroke-width="3" stroke-dasharray="16 12"><line x1="0" y1="185" x2="360" y2="185"/></g>';
    if (road === "chaussees") s += '<rect y="176" width="360" height="5" fill="#9ca3af"/>';
    s += car(150, 160, "#e11d2e", 1.3) + '<rect x="18" y="86" width="132" height="44" rx="6" fill="' + R.box + '" stroke="#111111" stroke-width="3"/><text x="84" y="116" font-family="Arial, Helvetica, sans-serif" font-size="' + (road === "chaussees" ? 16 : 25) + '" font-weight="bold" text-anchor="middle" fill="' + R.txt + '">' + R.label + '</text>';
    return s + '</g></svg>';
  }
  function qConditions() {
    var road = pick(Object.keys(ROADS)), weather = pick(["sec", "pluie"]), R = ROADS[road], v = weather === "pluie" ? R.wet : R.sec;
    var wrong = sample([30, 50, 70, 80, 90, 100, 110, 130].filter(function (n) { return n !== v; }), 3);
    var what = road === "autoroute" ? "sur autoroute" : road === "ville" ? "en agglomération" : "sur une route à chaussées séparées";
    return mk(road === "ville" ? "facile" : "difficile", "Quelle est la vitesse maximale autorisée " + what + ", par temps " + (weather === "pluie" ? "de pluie" : "sec") + " ?",
      [v + " km/h"].concat(wrong.map(function (n) { return n + " km/h"; })), sceneSvg(road, weather),
      (weather === "pluie" && v !== R.sec ? "Par temps de pluie la limite baisse de " + (R.sec - R.wet) + " km/h : " : "") + v + " km/h.", "conditions");
  }

  /* ---------- Assemblage du lot ---------- */
  function valid(q) {
    if (!q || !q.question || !Array.isArray(q.answers) || q.answers.length !== 4) return false;
    var u = {}, ok = true;
    q.answers.forEach(function (a) { var k = String(a).toLowerCase(); if (!a || u[k]) ok = false; u[k] = 1; });
    if (!ok || q.correct !== 0) return false;
    if (typeof QMedia !== "undefined" && !QMedia.cleanSvg(q.media.svg)) return false;
    return true;
  }
  function build() {
    var plan = [[qSignMeaning, 32], [qSignCategory, 8], [qSignShape, 8], [qSpeed, 6], [qAction, 8], [qWhichSign, 12], [qLight, 8],
      [qRightPriority, 10], [qSignPriority, 10], [qDiamond, 6], [qLeftTurn, 8], [qRoundabout, 6], [qConditions, 10]];
    var out = [];
    plan.forEach(function (p) {
      var made = 0, guard = 0;
      while (made < p[1] && guard++ < p[1] * 8) { var q = p[0](); if (!q || !valid(q)) continue; out.push(q); made++; }
    });
    return out;
  }
  function register() {
    if (typeof QUESTIONS === "undefined") return 0;
    for (var i = QUESTIONS.length - 1; i >= 0; i--) if (QUESTIONS[i] && QUESTIONS[i].v41Road) QUESTIONS.splice(i, 1);
    var pool = build();
    pool.forEach(function (q) { QUESTIONS.push(q); });
    return pool.length;
  }
  return { THEME: THEME, build: build, register: register, valid: valid, SIGNS: SIGNS, SPEEDS: SPEEDS, ARMS: ARMS, RIGHT_OF: RIGHT_OF, ROADS: ROADS, LIGHTS: LIGHTS, SHAPES: SHAPES, CATS: CATS, singleSign: singleSign, catalogue: catalogue };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V41Road;
if (typeof QUESTIONS !== "undefined") {
  V41Road.register();
  /* nouveaux dessins à chaque partie lancée par l'hôte */
  if (typeof startGame === "function") {
    var __v41RoadStart = startGame;
    startGame = function () { try { V41Road.register(); } catch (e) {} return __v41RoadStart.apply(this, arguments); };
  }
}
