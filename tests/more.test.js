/* Cohérence des nouveaux thèmes en images (js/data/image-more.js) : la bonne réponse est recalculée en LISANT le SVG dessiné,
   avec des tables indépendantes du générateur (noms, familles de couleurs, solides…).  node tests/more.test.js [nombre de lots] */
global.QMedia = require("../js/media/media.js");
const V = require("../js/data/image-more.js");
const BATCHES = Number(process.argv[2]) || 30;
let n = 0, bad = 0, ok = 0; const kinds = {};
function fail(q, why) { bad++; if (bad <= 20) console.log("ÉCHEC", why, "|", q && q.question, "|", q && q.answers && q.answers[0]); }
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }

/* ---- tables indépendantes ---- */
const NAMES = { sn: "Le Sénégal", cm: "Le Cameroun", et: "L'Éthiopie", gh: "Le Ghana", bj: "Le Bénin", tg: "Le Togo", za: "L'Afrique du Sud", ke: "Le Kenya", ma: "Le Maroc", dz: "L'Algérie", tn: "La Tunisie", mg: "Madagascar", sd: "Le Soudan", bi: "Le Burundi",
  ca: "Le Canada", br: "Le Brésil", ar: "L'Argentine", co: "La Colombie", cl: "Le Chili", cu: "Cuba", bo: "La Bolivie", jm: "La Jamaïque", bs: "Les Bahamas", us: "Les États-Unis", uy: "L'Uruguay",
  cn: "La Chine", vn: "Le Viêt Nam", tr: "La Turquie", in: "L'Inde", th: "La Thaïlande", id: "L'Indonésie", il: "Israël", la: "Le Laos", pk: "Le Pakistan", ph: "Les Philippines", jo: "La Jordanie", kw: "Le Koweït", ae: "Les Émirats arabes unis", sg: "Singapour", am: "L'Arménie", ge: "La Géorgie",
  gb: "Le Royaume-Uni", en: "L'Angleterre", sct: "L'Écosse", gr: "La Grèce", cz: "La Tchéquie", is: "L'Islande", lv: "La Lettonie", au: "L'Australie", nz: "La Nouvelle-Zélande", pw: "Les Palaos" };
const FAM = { sn: "green yellow red", cm: "green red yellow", et: "green yellow red blue", gh: "red yellow green black", bj: "green yellow red", tg: "green yellow red white", za: "red blue green yellow black white", ke: "black red green white", ma: "red green", dz: "green white red", tn: "red white", mg: "white red green", sd: "red white black green", bi: "red green white",
  ca: "red white", br: "green yellow blue", ar: "blue white yellow", co: "yellow blue red", cl: "white red blue", cu: "blue white red", bo: "red yellow green", jm: "black green yellow", bs: "cyan yellow black", us: "red white blue", uy: "white blue yellow",
  cn: "red yellow", vn: "red yellow", tr: "red white", in: "orange white green blue", th: "red white blue", id: "red white", il: "white blue", la: "red blue white", pk: "green white", ph: "blue red white yellow", jo: "black white green red", kw: "green white red black", ae: "red green white black", sg: "red white", am: "red blue yellow", ge: "white red",
  gb: "blue white red", en: "white red", sct: "blue white", gr: "blue white", cz: "white red blue", is: "blue white red", lv: "red white", au: "blue white red", nz: "blue red white", pw: "cyan yellow" };
function fam(hex) {
  const r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (l > 0.9) return "white"; if (l < 0.11) return "black";
  let h = 0; if (d) { h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  if (h < 15 || h >= 345) return "red"; if (h < 33) return "orange"; if (h < 70) return "yellow"; if (h < 170) return "green"; if (h < 205) return "cyan"; if (h < 260) return "blue"; return "other";
}
function families(markup) {
  const set = new Set(); [...markup.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase()).filter(c => !["#D8DEE6", "#9AA5B1", "#E6EDF5", "#1F2937", "#111827"].includes(c)).forEach(c => set.add(fam(c)));
  return [...set].sort().join(" ");
}
const sortFam = s => s.split(" ").sort().join(" ");
const SOLID = { cube: ["Un cube", 6, 8], pave: ["Un pavé droit", 6, 8], cylindre: ["Un cylindre", null, 0], cone: ["Un cône", null, 1], sphere: ["Une sphère", null, 0], pyramide: ["Une pyramide", 5, 5], prisme: ["Un prisme à base triangulaire", 5, 6] };
const FROM_ROMAN = r => { const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let s = 0; for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; s += a < b ? -a : a; } return s; };
const DIR8 = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"], NOTE7 = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];

/* ---- structure ---- */
t("51 drapeaux", V.FLAGS.length === 51);
t("ids uniques et connus", new Set(V.FLAGS.map(f => f.id)).size === 51 && V.FLAGS.every(f => NAMES[f.id] && FAM[f.id]));
t("8 thèmes distincts", new Set(V.THEMES).size === 8);
const de = V.de;
t("grammaire « du / de la / de l' / des / d' / de »", de("le Sénégal") === "du Sénégal" && de("la Chine") === "de la Chine" && de("l'Inde") === "de l'Inde" && de("les États-Unis") === "des États-Unis" && de("Cuba") === "de Cuba" && de("Israël") === "d'Israël" && de("Singapour") === "de Singapour");
V.FLAGS.forEach(f => {
  const svg = V.flagSvg(f);
  t("drapeau " + f.id + " : SVG accepté par QMedia et léger", !!QMedia.cleanSvg(svg) && svg.length < 6000);
  t("drapeau " + f.id + " : familles de couleurs dessinées = " + FAM[f.id] + " (lu : " + families(svg) + ")", families(svg) === sortFam(FAM[f.id]));
  t("drapeau " + f.id + " : couleurs déclarées toutes dessinées", f.c.every(c => svg.toUpperCase().includes(c.toUpperCase())));
});

/* ---- questions ---- */
for (let b = 0; b < BATCHES; b++) {
  V.build().forEach(q => {
    n++; kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    const svg = q.media.svg, a = q.answers[0], tx = q.question;
    if (new Set(q.answers.map(x => x.toLowerCase())).size !== 4 || q.correct !== 0 || !q.correction || !q.difficulty) return fail(q, "structure");
    if (!QMedia.cleanSvg(svg) || svg.length > 30000) return fail(q, "SVG refusé / trop gros");
    if (!V.THEMES.includes(q.category) || q.source !== "officiel" || !q.v47More) return fail(q, "métadonnées");
    let m;
    if (q.kind === "drapeau2") {
      const id = (/data-flag="([a-z]+)"/.exec(svg) || [])[1];
      if (a !== NAMES[id]) return fail(q, "drapeau " + id + " ≠ " + a);
      if (families(svg) !== sortFam(FAM[id])) fail(q, "couleurs de " + id);
      if (/le Le |de le /.test(q.correction)) fail(q, "grammaire correction");
    } else if (q.kind === "capitale2") {
      const id = (/data-flag="([a-z]+)"/.exec(svg) || [])[1], f = V.FLAGS.find(x => x.id === id);
      if (!f || f.cap !== a || f.ambig) return fail(q, "capitale " + id);
    } else if (q.kind === "grille") {
      const cells = [...svg.matchAll(/<g data-cell="([A-D])" data-flag="([a-z]+)">([\s\S]*?)<\/g><rect/g)];
      const target = Object.keys(NAMES).find(id => tx.endsWith("celui " + de(V.FLAGS.find(x => x.id === id).name) + " ?"));
      if (cells.length !== 4 || !target) return fail(q, "grille : cellules/cible");
      const cell = cells.find(c => c[2] === target);
      if (!cell || a !== "Le drapeau " + cell[1]) return fail(q, "grille : mauvaise lettre");
      cells.forEach(c => { if (families(c[3].replace('<rect x="0" y="0" width="300" height="200" fill="#ffffff"/>', '')) !== sortFam(FAM[c[2]])) fail(q, "grille : dessin ≠ " + c[2]); });
      if (new Set(cells.map(c => c[2])).size !== 4) fail(q, "grille : doublon");
    } else if (q.kind === "note") {
      const e = /<ellipse data-note="(\d+)" cx="[\d.]+" cy="([\d.]+)"/.exec(svg), lines = (svg.match(/<line x1="16" y1="(\d+)" x2="284"/g) || []).map(x => +/y1="(\d+)"/.exec(x)[1]);
      if (!e || lines.join() !== "130,115,100,85,70") return fail(q, "note : portée");
      const d = Math.round((130 - +e[2]) / 7.5 + 2); if (d !== +e[1]) return fail(q, "note : data-note ≠ position");
      if (a !== NOTE7[d % 7]) fail(q, "note lue " + NOTE7[d % 7]);
      if (+e[2] === 145 && !svg.includes('y1="145" x2="')) fail(q, "ligne supplémentaire Do");
    } else if (q.kind === "notes-nombre") {
      const k = (svg.match(/<ellipse data-note=/g) || []).length; if (String(k) !== a) fail(q, "nombre de notes " + k);
    } else if (q.kind === "des-somme") {
      const dice = [...svg.matchAll(/<g data-die="(\d)">([\s\S]*?)<\/g>/g)]; let sum = 0;
      dice.forEach(d => { const pips = (d[2].match(/data-pip/g) || []).length; if (pips !== +d[1]) fail(q, "points dessinés ≠ face"); sum += pips; });
      if (String(sum) !== a || dice.length !== (/trois/.test(tx) ? 3 : 2)) fail(q, "somme lue " + sum);
    } else if (q.kind === "des-oppose") {
      const d = /<g data-die="(\d)">([\s\S]*?)<\/g>/.exec(svg), pips = (d[2].match(/data-pip/g) || []).length;
      if (pips !== +d[1] || String(7 - pips) !== a) fail(q, "face opposée");
    } else if (q.kind === "domino") {
      const d = /data-domino="(\d),(\d)"/.exec(svg), pips = (svg.match(/data-pip/g) || []).length;
      if (!d || pips !== +d[1] + +d[2] || String(pips) !== a) fail(q, "domino " + pips);
    } else if (q.kind === "boussole") {
      const g = /data-needle="(\d+)" transform="rotate\((\d+) 150 150\)"/.exec(svg);
      if (!g || g[1] !== g[2] || DIR8[+g[1] / 45] !== a) fail(q, "boussole " + (g && g[1]));
    } else if (q.kind === "thermometre") {
      const r = /<rect data-merc="1" x="104" y="([\d.]+)"/.exec(svg); if (!r) return fail(q, "thermomètre : colonne");
      const tv = V.TH.tmin + (V.TH.y0 - +r[1]) * (V.TH.tmax - V.TH.tmin) / (V.TH.y0 - V.TH.y1);
      if (Math.abs(tv - Math.round(tv)) > 0.06 || Math.round(tv) + " °C" !== a) fail(q, "température lue " + tv);
      [...svg.matchAll(/<text x="150" y="([\d.]+)"[^>]*>(-?\d+)<\/text>/g)].forEach(x => { const k = +x[2], y = V.TH.y0 + (k - V.TH.tmin) * (V.TH.y1 - V.TH.y0) / (V.TH.tmax - V.TH.tmin) + 5; if (Math.abs(y - +x[1]) > 0.1) fail(q, "graduation " + k); });
    } else if (q.kind === "solide") {
      const id = (/data-solid="([a-z]+)"/.exec(svg) || [])[1]; if (!SOLID[id] || SOLID[id][0] !== a) fail(q, "solide " + id);
    } else if (q.kind === "solide-faces" || q.kind === "solide-sommets") {
      const id = (/data-solid="([a-z]+)"/.exec(svg) || [])[1], want = q.kind === "solide-faces" ? SOLID[id][1] : SOLID[id][2];
      if (want === null || String(want) !== a) fail(q, q.kind + " " + id);
    } else if (q.kind === "romain") {
      const r = (/data-roman="([IVXLCDM]+)"/.exec(svg) || [])[1], v = FROM_ROMAN(r || "");
      if (!r || String(v) !== a || V.toRoman(v) !== r) fail(q, "romain " + r + " = " + v);
    } else if (q.kind.startsWith("graph-")) {
      const bars = [...svg.matchAll(/<rect data-bar="([A-F])" data-v="(\d+)" x="[\d.]+" y="([\d.]+)" width="28" height="([\d.]+)"/g)].map(x => ({ L: x[1], v: +x[2], y: +x[3], h: +x[4] }));
      if (bars.length < 4) return fail(q, "graphique : barres");
      bars.forEach(x => { if (Math.abs(x.h - x.v / V.CH.vmax * V.CH.hmax) > 0.1 || Math.abs(x.y + x.h - V.CH.y0) > 0.1) fail(q, "barre " + x.L + " : hauteur ≠ valeur"); });
      const val = L => bars.find(x => x.L === L).v;
      if (q.kind === "graph-extreme") { const hi = /plus haute/.test(tx), v = hi ? Math.max(...bars.map(x => x.v)) : Math.min(...bars.map(x => x.v)); if (a !== "La barre " + bars.find(x => x.v === v).L) fail(q, "extrême"); }
      else if (q.kind === "graph-valeur") { const L = /barre ([A-F]) \?/.exec(tx)[1]; if (String(val(L)) !== a) fail(q, "valeur " + L); }
      else { const mm = /barres ([A-F]) et ([A-F])/.exec(tx); if (String(val(mm[1]) + val(mm[2])) !== a) fail(q, "total"); }
    } else fail(q, "type inconnu " + q.kind);
  });
}
console.log(n + " questions vérifiées (" + Object.keys(kinds).map(k => k + " " + kinds[k]).join(", ") + ") + " + ok + " contrôles de structure et de drapeaux.");
console.log(bad ? bad + " incohérence(s)." : "Aucune incohérence : chaque réponse correspond à l'image.");
process.exit(bad ? 1 : 0);
