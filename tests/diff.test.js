/* Cohérence des thèmes « 🔍 Trouve la différence » et « 🧐 Trouve l'intrus » (js/data/image-diff.js) :
   la bonne réponse est recalculée en LISANT le SVG (attributs data-*), avec des tables indépendantes du générateur,
   et chaque mauvaise réponse est vérifiée FAUSSE.   node tests/diff.test.js [nombre de lots]   */
global.QMedia = require("../js/media/media.js");
const fs = require("fs"), V = require("../js/data/image-diff.js");
const BATCHES = Number(process.argv[2]) || 8;
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; if (bad <= 25) console.log("ÉCHEC :", label); } }
const FEM = { "étoile": 1 }, COLF = { rouge: "rouge", bleu: "bleue", vert: "verte", jaune: "jaune", violet: "violette", orange: "orange" };
const POS = ["en haut à gauche", "en haut au centre", "en haut à droite", "en bas à gauche", "en bas au centre", "en bas à droite"];
const attr = (tag, n) => { const m = tag.match(new RegExp("\\s" + n + '="([^"]*)"')); return m ? m[1] : null; };
const shapes = svg => [...svg.matchAll(/<(circle|rect|polygon)\s[^>]*data-shape=[^>]*>/g)].map(m => m[0]);
const name = it => (FEM[it.s] ? "L'" : "Le ") + it.s + " " + (FEM[it.s] ? COLF[it.c] : it.c);
const indef = it => (FEM[it.s] ? "Une " : "Un ") + it.s + " " + (FEM[it.s] ? COLF[it.c] : it.c);
function panels(svg) {
  const P = { 1: {}, 2: {} };
  shapes(svg).forEach(tag => { const p = attr(tag, "data-panel"), c = Number(attr(tag, "data-cell")); P[p][c] = { cell: c, s: attr(tag, "data-shape"), c: attr(tag, "data-col"), k: attr(tag, "data-size") }; });
  return P;
}
/* différences réelles, case par case */
function diffs(P) {
  const out = [];
  for (let c = 0; c < 6; c++) {
    const a = P[1][c], b = P[2][c];
    if (!a && !b) continue;
    if (a && !b) out.push({ cell: c, type: "missing", a });
    else if (!a && b) out.push({ cell: c, type: "added", b });
    else if (a.c !== b.c) out.push({ cell: c, type: "color", a, b });
    else if (a.s !== b.s) out.push({ cell: c, type: "shape", a, b });
    else if (a.k !== b.k) out.push({ cell: c, type: "size", a, b });
  }
  return out;
}
function truth(d) {
  if (d.type === "missing") return name(d.a) + " a disparu.";
  if (d.type === "added") return indef(d.b) + " est apparu" + (FEM[d.b.s] ? "e " : " ") + POS[d.cell] + ".";
  const dev = FEM[d.a.s] ? "devenue" : "devenu";
  if (d.type === "color") return name(d.a) + " est " + dev + " " + (FEM[d.a.s] ? COLF[d.b.c] : d.b.c) + ".";
  if (d.type === "shape") return name(d.a) + " est " + dev + " " + (FEM[d.b.s] ? "une " : "un ") + d.b.s + ".";
  return name(d.a) + " est " + dev + " plus " + (d.b.k === "grand" ? "grand" : "petit") + (FEM[d.a.s] ? "e" : "") + ".";
}
/* une description « X est devenu … » proposée en mauvaise réponse est fausse : l'image 2 ne la réalise pas */
function holds(desc, P) {
  let m;
  const find = (art, sh, col) => { for (let c = 0; c < 6; c++) { const it = P[1][c]; if (it && it.s === sh && (it.c === col || COLF[it.c] === col)) return it; } return null; };
  if ((m = /^(?:Le|L')\s?(\S+) (\S+) a disparu\.$/.exec(desc))) { const it = find(0, m[1], m[2]); return !it || !P[2][it.cell]; }
  if ((m = /^(?:Un|Une) (\S+) (\S+) est apparue? (.+)\.$/.exec(desc))) { const cell = POS.indexOf(m[3]), b = P[2][cell]; return !!b && !P[1][cell] && b.s === m[1] && (b.c === m[2] || COLF[b.c] === m[2]); }
  if ((m = /^(?:Le|L')\s?(\S+) (\S+) est devenue? plus (grande?|petite?)\.$/.exec(desc))) { const it = find(0, m[1], m[2]), b = it && P[2][it.cell]; return !!b && b.s === it.s && b.c === it.c && b.k === (/^grand/.test(m[3]) ? "grand" : "petit"); }
  if ((m = /^(?:Le|L')\s?(\S+) (\S+) est devenue? (?:un|une) (\S+)\.$/.exec(desc))) { const it = find(0, m[1], m[2]), b = it && P[2][it.cell]; return !!b && b.s === m[3] && b.c === it.c; }
  if ((m = /^(?:Le|L')\s?(\S+) (\S+) est devenue? (\S+)\.$/.exec(desc))) { const it = find(0, m[1], m[2]), b = it && P[2][it.cell]; return !!b && b.s === it.s && (b.c === m[3] || COLF[b.c] === m[3]); }
  return null;   /* forme non reconnue */
}

/* ---- structure ---- */
t("2 thèmes distincts", new Set(V.THEMES).size === 2);
const bankNames = new Set(); fs.readdirSync(__dirname + "/../js/data/bank").forEach(f => { for (const m of fs.readFileSync(__dirname + "/../js/data/bank/" + f, "utf8").matchAll(/V35_BANK\["([^"]+)"\]/g)) bankNames.add(m[1]); });
t("aucun thème en image n'a le même nom qu'un thème de questions", V.THEMES.every(x => !bankNames.has(x)));
t("noms : « L'étoile jaune »", V.nameOf({ s: 3, c: 3, k: 0 }) === "L'étoile jaune" && V.nameOf({ s: 0, c: 1, k: 0 }) === "Le cercle bleu" && V.nameOf({ s: 3, c: 4, k: 0 }) === "L'étoile violette");

const kinds = {}; let asked = 0, unreadable = 0;
for (let b = 0; b < BATCHES; b++) {
  const pool = V.build();
  t("lot : au moins 140 questions", pool.length >= 140);
  pool.forEach(q => {
    kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    t("valide : " + q.kind, V.valid(q) && q.media.type === "svg" && QMedia.cleanSvg(q.media.svg) === q.media.svg);
    t("thème connu", V.THEMES.includes(q.category));
    t("explication fournie : " + q.kind, typeof q.correction === "string" && q.correction.length > 20);
    t("4 réponses distinctes : " + q.kind, new Set(q.answers.map(a => a.toLowerCase())).size === 4);
    const svg = q.media.svg, isDiff = /^diff-/.test(q.kind), P = isDiff ? panels(svg) : null, D = isDiff ? diffs(P) : [], good = q.answers[0];
    asked++;
    if (/^diff-/.test(q.kind)) {
      t("deux images de même taille de grille : " + q.kind, Object.keys(P[1]).length >= 3 && Object.keys(P[2]).length >= 2);
      if (q.kind === "diff-combien") {
        t("combien : nombre de cases qui changent = réponse", good === D.length + (D.length > 1 ? " différences" : " différence"));
        t("combien : explication cite chaque différence", (q.correction.match(/;/g) || []).length === D.length - 1);
        q.answers.slice(1).forEach(a => t("combien : mauvaise réponse ≠ nombre réel", parseInt(a, 10) !== D.length));
        return;
      }
      t(q.kind + " : exactement une différence", D.length === 1);
      if (D.length !== 1) return;
      const d = D[0];
      if (q.kind === "diff-quoi") {
        t("quoi : la bonne réponse décrit la vraie différence", good === truth(d));
        q.answers.slice(1).forEach(a => { const h = holds(a, P); if (h === null) unreadable++; t("quoi : « " + a + " » est faux", h === false && a !== good); });
      } else if (q.kind === "diff-ou") {
        t("où : la bonne réponse est la case qui change", good.toLowerCase() === POS[d.cell]);
        t("où : 4 zones différentes", new Set(q.answers).size === 4 && q.answers.every(a => POS.includes(a.toLowerCase())));
      } else if (q.kind === "diff-couleur") {
        t("couleur : le type de changement est une couleur", d.type === "color");
        t("couleur : la bonne réponse est la nouvelle couleur", good.toLowerCase() === (FEM[d.a.s] ? COLF[d.b.c] : d.b.c));
        t("couleur : la question nomme l'objet de l'image 1", q.question.startsWith(name(d.a) + " de l'image 1"));
      } else if (q.kind === "diff-forme") {
        if (d.type === "added") { t("forme : apparue", good === indef(d.b) && /apparue/.test(q.question)); q.answers.slice(1).forEach(a => { const m = /^(?:Un|Une) (\S+) (\S+)$/.exec(a); t("forme : « " + a + " » n'est pas dans l'image 1", m && ![0, 1, 2, 3, 4, 5].some(c => P[1][c] && P[1][c].s === m[1] && (P[1][c].c === m[2] || COLF[P[1][c].c] === m[2]))); }); }
        else {
          t("forme : la bonne réponse est l'objet qui change, décrit comme dans l'image 1", good === name(d.a));
          t("forme : la question correspond au type de changement", ({ color: /couleur/, shape: /remplacée/, size: /taille/, missing: /disparu/ })[d.type].test(q.question));
          q.answers.slice(1).forEach(a => t("forme : « " + a + " » est un objet inchangé", [0, 1, 2, 3, 4, 5].some(c => P[1][c] && P[2][c] && name(P[1][c]) === a && P[1][c].c === P[2][c].c && P[1][c].s === P[2][c].s && P[1][c].k === P[2][c].k)));
        }
      }
    } else {
      /* intrus : grille 4 × 3 */
      const items = shapes(svg).map(tg => ({ odd: attr(tg, "data-odd") === "1", row: Number(attr(tg, "data-row")), col: Number(attr(tg, "data-cell")), s: attr(tg, "data-shape"), c: attr(tg, "data-col") }));
      const odd = items.filter(i => i.odd), rest = items.filter(i => !i.odd);
      t("intrus : 12 formes, un seul intrus", items.length === 12 && odd.length === 1);
      t("intrus : les 11 autres sont identiques", rest.every(i => i.s === rest[0].s && i.c === rest[0].c));
      t("intrus : il diffère par la forme OU la couleur (pas les deux)", (odd[0].s !== rest[0].s) !== (odd[0].c !== rest[0].c));
      if (q.kind === "intrus-forme") { t("intrus-forme : bonne réponse", good === (FEM[odd[0].s] ? "Une " : "Un ") + odd[0].s && odd[0].s !== rest[0].s); }
      if (q.kind === "intrus-couleur") { t("intrus-couleur : bonne réponse", good.toLowerCase() === odd[0].c && odd[0].c !== rest[0].c); }
      if (q.kind === "intrus-ou") { t("intrus-ou : bonne réponse", good === "Ligne " + odd[0].row + ", colonne " + odd[0].col); t("intrus-ou : 4 cases distinctes", new Set(q.answers).size === 4); }
      if (q.kind === "intrus-nombre") t("intrus-nombre : bonne réponse = 11", good === String(rest.length) && q.answers.slice(1).every(a => Number(a) !== rest.length && Number(a) > 0));
    }
  });
}
["diff-quoi", "diff-ou", "diff-combien", "diff-forme", "diff-couleur", "intrus-forme", "intrus-couleur", "intrus-ou", "intrus-nombre"].forEach(k => t("type de question présent : " + k, kinds[k] > 0));
t("toutes les mauvaises réponses « quoi » ont été comprises par le test", unreadable === 0);

/* ---- les différents types de changements apparaissent bien ---- */
const seen = {}; for (let i = 0; i < 40; i++) { const q = V.build().find(x => x.kind === "diff-quoi"); if (q) diffs(panels(q.media.svg)).forEach(d => seen[d.type] = 1); }
["color", "shape", "size", "missing", "added"].forEach(k => t("changement « " + k + " » généré", seen[k]));

console.log("diff.test.js : " + ok + " vérifications OK, " + bad + " échec(s) — " + asked + " questions lues dans leur SVG");
process.exit(bad ? 1 : 0);
