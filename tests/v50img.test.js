/* Cohérence des huit thèmes en images de js/data/image-v50.js : la bonne réponse est recalculée en LISANT le SVG dessiné
   (nombre d'éléments, couleurs, position des aiguilles, bras des angles, sommets des figures, cases coloriées, points d'une grille),
   avec des tables indépendantes du générateur.   node tests/v50img.test.js [nombre de lots]   */
global.QMedia = require("../js/media/media.js");
const fs = require("fs"), V = require("../js/data/image-v50.js");
const BATCHES = Number(process.argv[2]) || 12;
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; if (bad <= 25) console.log("ÉCHEC :", label); } }
const HEX = { "#dc2626": "rouge", "#2563eb": "bleu", "#16a34a": "vert", "#eab308": "jaune" };
const PAINT = { "#dc2626": "Rouge", "#2563eb": "Bleu", "#16a34a": "Vert", "#facc15": "Jaune", "#f97316": "Orange", "#7c3aed": "Violet", "#ec4899": "Rose", "#92400e": "Marron", "#111827": "Noir", "#9ca3af": "Gris", "#ffffff": "Blanc", "#14b8a6": "Turquoise" };
const MIX = { "Rouge+Jaune": "Orange", "Bleu+Jaune": "Vert", "Rouge+Bleu": "Violet", "Rouge+Blanc": "Rose", "Noir+Blanc": "Gris" };
const AXES = { "triangle-equilateral": 3, carre: 4, rectangle: 2, losange: 2, pentagone: 5, hexagone: 6, "triangle-isocele": 1, "cerf-volant": 1, parallelogramme: 0, "trapeze-isocele": 1 };
const attr = (tag, n) => { const m = tag.match(new RegExp("\\s" + n + '="([^"]*)"')); return m ? m[1] : null; };
const tags = (svg, name) => [...svg.matchAll(new RegExp("<" + name + "\\s[^>]*>", "g"))].map(m => m[0]);
const pts = tag => attr(tag, "points").trim().split(/\s+/).map(p => p.split(",").map(Number));

/* ---- structure ---- */
t("8 thèmes distincts", new Set(V.THEMES).size === 8);
const bankNames = new Set(); fs.readdirSync(__dirname + "/../js/data/bank").forEach(f => { for (const m of fs.readFileSync(__dirname + "/../js/data/bank/" + f, "utf8").matchAll(/V35_BANK\["([^"]+)"\]/g)) bankNames.add(m[1]); });
t("aucun thème en image n'a le même nom qu'un thème de questions", V.THEMES.every(x => !bankNames.has(x)));
t("accord de « peinture »", V.fem("Noir") === "noire" && V.fem("Blanc") === "blanche" && V.fem("Bleu") === "bleue" && V.fem("Vert") === "verte" && V.fem("Rouge") === "rouge" && V.fem("Jaune") === "jaune");
t("l'heure : 3 h / 3 h 05 / 12 h", V.hm(3, 0) === "3 h" && V.hm(3, 5) === "3 h 05" && V.hm(12, 45) === "12 h 45");

/* ---- symétrie géométrique : on compte les réflexions qui renvoient la figure sur elle-même ---- */
function axesOf(P) {
  const n = P.length, cx = P.reduce((a, p) => a + p[0], 0) / n, cy = P.reduce((a, p) => a + p[1], 0) / n, dirs = [];
  P.forEach((p, i) => { dirs.push(Math.atan2(p[1] - cy, p[0] - cx)); const q = P[(i + 1) % n]; dirs.push(Math.atan2((p[1] + q[1]) / 2 - cy, (p[0] + q[0]) / 2 - cx)); });
  const found = [];
  dirs.forEach(th => {
    const refl = p => { const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(2 * th), s = Math.sin(2 * th); return [cx + dx * c + dy * s, cy + dx * s - dy * c]; };
    if (P.every(p => { const r = refl(p); return P.some(q => Math.hypot(q[0] - r[0], q[1] - r[1]) < 0.6); })) {
      const a = ((th % Math.PI) + Math.PI) % Math.PI; if (!found.some(f => Math.min(Math.abs(f - a), Math.PI - Math.abs(f - a)) < 1e-3)) found.push(a);
    }
  });
  return found.length;
}
V.FIGS.forEach(f => { t("axes géométriques de " + f.id + " = " + AXES[f.id], axesOf(f.pts) === AXES[f.id] && f.axes === AXES[f.id]); });

/* ---- lecture des questions ---- */
const kinds = {}, byTheme = {};
for (let b = 0; b < BATCHES; b++) {
  V.build().forEach(q => {
    kinds[q.kind] = (kinds[q.kind] || 0) + 1; byTheme[q.category] = (byTheme[q.category] || 0) + 1;
    const svg = q.media.svg, A = q.answers, good = A[0], lab = q.kind + " | " + q.question + " | " + good;
    t("valide " + q.kind, V.valid(q) && new Set(A.map(a => a.toLowerCase())).size === 4 && q.correct === 0 && V.THEMES.includes(q.category));
    if (q.kind === "compter-forme") {
      const sh = { cercles: "cercle", carrés: "carré", triangles: "triangle", étoiles: "étoile" }[q.question.match(/Combien (?:de |d')(\S+) /)[1]];
      const n = [...svg.matchAll(/<(circle|rect|polygon)\s[^>]*data-shape="([^"]+)"/g)].filter(m => m[2] === sh).length;
      const geo = tags(svg, "circle").filter(x => attr(x, "data-shape")).length;
      const tri = tags(svg, "polygon").filter(x => attr(x, "data-shape") && pts(x).length === 3).length, star = tags(svg, "polygon").filter(x => attr(x, "data-shape") && pts(x).length === 10).length, sq = tags(svg, "rect").filter(x => attr(x, "data-shape")).length;
      const geoN = sh === "cercle" ? geo : sh === "carré" ? sq : sh === "triangle" ? tri : star;
      t("compter-forme " + lab, String(n) === good && geoN === n);
    } else if (q.kind === "compter-couleur") {
      const col = { rouges: "rouge", bleues: "bleu", vertes: "vert", jaunes: "jaune" }[q.question.match(/formes (\S+) voyez/)[1]];
      const n = [...svg.matchAll(/<(?:circle|rect|polygon)\s[^>]*data-shape="[^"]+"[^>]*>/g)].filter(m => HEX[attr(m[0], "fill")] === col).length;
      t("compter-couleur " + lab, String(n) === good);
    } else if (q.kind === "couleur-nom") {
      t("couleur-nom " + lab, PAINT[attr(tags(svg, "rect").filter(x => attr(x, "data-color"))[0], "fill")] === good);
    } else if (q.kind === "melange") {
      const c = tags(svg, "circle").map(x => PAINT[attr(x, "fill")]), asked = q.question.match(/peinture (\S+) et de la peinture (\S+) /), FEMT = { Bleu: "bleue", Vert: "verte", Blanc: "blanche", Noir: "noire" }, fm = n => FEMT[n] || n.toLowerCase();
      const key = [c[0], c[1]].sort().join("+"), want = Object.keys(MIX).find(k => k.split("+").sort().join("+") === key);
      t("melange " + lab, MIX[want] === good && [asked[1], asked[2]].sort().join() === [fm(c[0]), fm(c[1])].sort().join() && !/ (noir|blanc|bleu|vert) /.test(" " + q.question.split("peinture").slice(1).join(" ") + " "));
    } else if (q.kind === "horloge") {
      const hands = {}; tags(svg, "line").filter(x => attr(x, "data-hand")).forEach(x => { const dx = attr(x, "x2") - attr(x, "x1"), dy = attr(x, "y2") - attr(x, "y1"); hands[attr(x, "data-hand")] = ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360; });
      const m = Math.round(hands.m / 6) % 60; let h = Math.round((hands.h - m / 2) / 30) % 12; if (!h) h = 12;
      t("horloge " + lab, V.hm(h, m) === good && Math.abs(hands.h - ((h % 12) + m / 60) * 30) < 0.7);
    } else if (q.kind === "suite-forme") {
      const boxes = [...svg.matchAll(/<g data-box="(\d)"( data-hidden="1")?>(.*?)<\/g>/g)].map(m => ({ i: +m[1], hidden: !!m[2], inner: m[3] }));
      const items = boxes.filter(x => !x.hidden).map(x => { const e = x.inner.match(/<(circle|rect|polygon)\s[^>]*data-shape="([^"]+)" data-col="([^"]+)"/g)[0]; return attr(e, "data-shape") + " " + attr(e, "data-col"); });
      let p = 0; for (const cand of [2, 3]) if (items.every((it, i) => it === items[i % cand]) && new Set(items.slice(0, cand)).size === cand) { p = cand; break; }
      const nxt = items[5 % p];
      const [shp, col] = nxt.split(" ");
      t("suite-forme " + lab, boxes.length === 6 && items.length === 5 && p > 0 && good === "Un " + shp + " " + col && A.slice(1).every(a => a !== good));
    } else if (q.kind === "suite-points") {
      const boxes = [...svg.matchAll(/<g data-box="(\d)"( data-n="(\d+)")?( data-hidden="1")?>(.*?)<\/g>/g)].map(m => ({ n: m[3] ? +m[3] : null, dots: (m[5].match(/<circle/g) || []).length }));
      const vals = boxes.filter(b => b.n !== null);
      t("suite-points " + lab, vals.length === 4 && vals.every(b => b.n === b.dots) && String(vals[3].n + (vals[1].n - vals[0].n)) === good && vals.every((b, i) => i === 0 || b.n - vals[i - 1].n === vals[1].n - vals[0].n));
    } else if (q.kind === "angle-type" || q.kind === "angle-mesure") {
      const arm = n => { const x = tags(svg, "line").find(e => attr(e, "data-arm") === n); return [attr(x, "x2") - attr(x, "x1"), attr(x, "y2") - attr(x, "y1")]; };
      const a = arm("1"), b = arm("2"), deg = Math.round(Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI);
      const type = deg < 90 ? "Un angle aigu" : deg === 90 ? "Un angle droit" : deg < 180 ? "Un angle obtus" : "Un angle plat";
      t("angle " + lab + " (" + deg + "°)", Number(svg.match(/data-angle="(\d+)"/)[1]) === deg && (q.kind === "angle-type" ? good === type : good === deg + "°"));
    } else if (q.kind === "symetrie") {
      const e = tags(svg, "polygon")[0], P = pts(e);
      t("symétrie " + lab, String(axesOf(P)) === good && String(AXES[attr(e, "data-fig")]) === good);
    } else if (q.kind === "fraction-disque" || q.kind === "fraction-barre") {
      const parts = [...svg.matchAll(/<(?:path|rect)\s[^>]*data-part="\d+"[^>]*>/g)].map(m => m[0]), on = parts.filter(p => attr(p, "fill") !== "#ffffff").length;
      t("fraction " + lab, parts.every(p => (attr(p, "data-on") === "1") === (attr(p, "fill") !== "#ffffff")) && good === on + "/" + parts.length && A.slice(1).every(s => { const [x, y] = s.split("/").map(Number); return x * parts.length !== on * y; }));
    } else if (q.kind === "coord-point" || q.kind === "coord-trouver") {
      const P = tags(svg, "circle").filter(x => attr(x, "data-pt")).map(x => ({ l: attr(x, "data-pt"), x: (attr(x, "cx") - V.GR.ox) / V.GR.st, y: (V.GR.oy - attr(x, "cy")) / V.GR.st, dx: +attr(x, "data-x"), dy: +attr(x, "data-y") }));
      t("grille " + lab, P.every(p => p.x === p.dx && p.y === p.dy));
      if (q.kind === "coord-point") t("coord-point " + lab, good === "(" + P[0].x + " ; " + P[0].y + ")");
      else { const m = q.question.match(/\((\d+) ; (\d+)\)/), hit = P.filter(p => p.x === +m[1] && p.y === +m[2]); t("coord-trouver " + lab, P.length === 4 && hit.length === 1 && good === "Le point " + hit[0].l && new Set(P.map(p => p.x)).size === 4 && new Set(P.map(p => p.y)).size === 4); }
    } else t("genre inconnu " + q.kind, false);
  });
}
t("« Combien d'étoiles » (élision)", V.build().filter(q => q.kind === "compter-forme").every(q => !/Combien de [aeiouéèê]/.test(q.question)));
t("14 types de questions", Object.keys(kinds).length === 14);
t("chaque thème a au moins 20 questions par lot", V.THEMES.every(x => byTheme[x] >= 20 * BATCHES));
console.log(ok + " vérifications réussies, " + bad + " échec(s) — " + Object.keys(kinds).length + " types, " + Object.values(byTheme).reduce((a, b) => a + b, 0) + " questions relues dans le SVG");
process.exit(bad ? 1 : 0);
