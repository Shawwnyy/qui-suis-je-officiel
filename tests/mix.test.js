/* Images dans tous les thèmes : chaque bonne réponse est recalculée à partir de l'image elle-même (émoji, nombre de côtés,
   parts coloriées, opération, drapeau), avec des tables indépendantes du générateur. */
global.QMedia = require("../js/media/media.js");
const fs = require("fs"), path = require("path");
const M = require("../js/data/image-mix.js");
const BATCHES = Number(process.argv[2]) || 30;
let n = 0, bad = 0;
const kinds = {};
function fail(q, why) { bad++; if (bad <= 20) console.log("ÉCHEC", why, "|", q.category, "|", q.question, "|", q.answers[0]); }

/* tables indépendantes */
const POLY = { 3: "Un triangle", 4: "Un carré", 5: "Un pentagone", 6: "Un hexagone", 7: "Un heptagone", 8: "Un octogone", 9: "Un ennéagone", 10: "Un décagone" };
const CAPS = { "la France": "Paris", "l'Italie": "Rome", "l'Irlande": "Dublin", "la Belgique": "Bruxelles", "la Roumanie": "Bucarest", "le Mali": "Bamako", "la Guinée": "Conakry", "le Nigeria": "Abuja", "le Pérou": "Lima", "l'Allemagne": "Berlin", "le Luxembourg": "Luxembourg", "l'Autriche": "Vienne", "la Hongrie": "Budapest", "la Bulgarie": "Sofia", "la Lituanie": "Vilnius", "l'Estonie": "Tallinn", "la Russie": "Moscou", "le Gabon": "Libreville", "la Pologne": "Varsovie", "l'Ukraine": "Kiev", "la Suède": "Stockholm", "le Danemark": "Copenhague", "la Finlande": "Helsinki", "la Norvège": "Oslo", "la Suisse": "Berne", "le Japon": "Tokyo", "le Bangladesh": "Dacca" };
const ID_NAME = { fr: "la France", it: "l'Italie", ie: "l'Irlande", be: "la Belgique", ro: "la Roumanie", ml: "le Mali", gn: "la Guinée", ng: "le Nigeria", ci: "la Côte d'Ivoire", pe: "le Pérou", de: "l'Allemagne", nl: "les Pays-Bas", lu: "le Luxembourg", at: "l'Autriche", hu: "la Hongrie", bg: "la Bulgarie", lt: "la Lituanie", ee: "l'Estonie", ru: "la Russie", ga: "le Gabon", ye: "le Yémen", pl: "la Pologne", ua: "l'Ukraine", se: "la Suède", dk: "le Danemark", fi: "la Finlande", no: "la Norvège", ch: "la Suisse", jp: "le Japon", bd: "le Bangladesh" };
/* vérifications ponctuelles émoji → nom (écrites à la main, indépendantes des tables du module) */
const SPOT = { "🐘": "éléphant", "🦒": "girafe", "🐼": "panda", "🍎": "pomme", "🍌": "banane", "🥕": "carotte", "🎻": "violon", "🎸": "guitare", "🥁": "batterie", "🎺": "trompette", "🚆": "train", "🚲": "vélo", "✈️": "avion", "🚁": "hélicoptère", "🫀": "cœur", "🦷": "dent", "🧠": "cerveau", "🌧️": "pluie", "❄️": "neige", "🌈": "arc-en-ciel", "♞": "cavalier", "♜": "tour", "♛": "dame", "♚": "roi", "💶": "euro", "💵": "dollar", "💷": "livre", "💴": "yen", "🦈": "requin", "🐙": "pieuvre", "🦅": "aigle", "🐧": "manchot", "🌵": "cactus", "🍄": "champignon", "🧲": "aimant", "🔭": "télescope", "🔬": "microscope", "⚖️": "balance", "🎃": "halloween", "🎄": "noël", "🦖": "tyrannosaure", "🦣": "mammouth", "🦄": "licorne", "🐉": "dragon", "🧛": "vampire", "🧜": "sirène" };

for (let b = 0; b < BATCHES; b++) {
  const qs = M.build({});
  qs.forEach(q => {
    n++; kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    const svg = q.media && q.media.svg, a = q.answers[0];
    if (!svg) return fail(q, "pas d'image");
    if (new Set(q.answers.map(x => String(x).toLowerCase())).size !== 4 || q.correct !== 0) return fail(q, "réponses en double ou mauvais index");
    if (!QMedia.cleanSvg(svg)) return fail(q, "SVG refusé par QMedia");
    if (!q.v42Mix || q.source !== "officiel" || !q.correction) return fail(q, "drapeaux ou correction manquants");
    if (q.kind === "pictogramme") {
      const g = (/data-glyph="([^"]+)"/.exec(svg) || [])[1];
      const item = g && M.SETS[q.category] && M.SETS[q.category].items.find(i => i[0] === g);
      if (!item || item[1] !== a) return fail(q, "émoji " + g + " ≠ réponse");
      if (!svg.includes(">" + g + "</text>")) return fail(q, "l'émoji n'est pas dessiné");
      Object.keys(SPOT).forEach(e => { if (g === e && !a.toLowerCase().includes(SPOT[e])) fail(q, "émoji " + e + " devrait contenir « " + SPOT[e] + " »"); });
    } else if (q.kind === "polygone") {
      const N = +(/data-n="(\d+)"/.exec(svg) || [])[1], pts = (/points="([^"]+)"/.exec(svg) || [])[1].trim().split(/\s+/).length;
      if (N !== pts) return fail(q, "côtés dessinés " + pts + " ≠ " + N);
      if (a !== POLY[pts]) return fail(q, "nom du polygone à " + pts + " côtés");
    } else if (q.kind === "fraction") {
      const on = (svg.match(/data-slice="on"/g) || []).length, off = (svg.match(/data-slice="off"/g) || []).length;
      if (a !== on + "/" + (on + off)) return fail(q, "fraction lue " + on + "/" + (on + off));
      if (on < 1 || off < 1) return fail(q, "fraction triviale");
      q.answers.slice(1).forEach(w => { const [x, y] = w.split("/").map(Number); if (x * (on + off) === y * on) fail(q, "mauvaise réponse équivalente " + w); });
    } else if (q.kind === "operation") {
      const m = /data-op="(\d+) ([+−×]) (\d+)"/.exec(svg); if (!m) return fail(q, "opération introuvable");
      const x = +m[1], y = +m[3], r = m[2] === "+" ? x + y : m[2] === "−" ? x - y : x * y;
      if (String(r) !== a) return fail(q, "résultat " + r);
      if (q.answers.some(w => !/^\d+$/.test(w) || +w <= 0)) fail(q, "réponse négative ou non numérique");
    } else if (q.kind === "drapeau" || q.kind === "capitale") {
      const id = (/data-flag="([a-z]+)"/.exec(svg) || [])[1], name = ID_NAME[id];
      if (!name) return fail(q, "drapeau inconnu " + id);
      if (q.kind === "drapeau" && a.toLowerCase() !== name.toLowerCase()) return fail(q, "pays " + name);
      if (q.kind === "capitale" && a !== CAPS[name]) return fail(q, "capitale de " + name);
      if (q.kind === "capitale") q.answers.slice(1).forEach(w => { if (w === CAPS[name]) fail(q, "capitale en double"); });
    } else if (q.kind === "heure") {
      if (!/data-hand="hour"/.test(svg) || !/data-hand="minute"/.test(svg)) return fail(q, "aiguilles introuvables");
    } else if (!["signe", "famille", "forme", "vitesse", "action", "quel", "feu", "droite", "panneau", "losange", "gauche", "rond-point", "conditions"].includes(q.kind)) fail(q, "type inconnu " + q.kind);
  });
}

/* Structure des séries d'émojis */
let sets = 0;
Object.keys(M.SETS).forEach(t => {
  sets++;
  const items = M.SETS[t].items, g = {}, nm = {};
  if (items.length < 4) { bad++; console.log("ÉCHEC série trop courte", t); }
  items.forEach(i => { if (g[i[0]]) { bad++; console.log("ÉCHEC émoji en double", t, i[0]); } g[i[0]] = 1; if (nm[i[1]]) { bad++; console.log("ÉCHEC nom en double", t, i[1]); } nm[i[1]] = 1; });
});

/* Règle « de temps en temps » : 3 à 8 questions-images par thème, jamais de remplacement */
[0, 1, 5, 20, 30, 60, 100, 400, 90000].forEach(s => { const w = M.wanted(s); if (w < 3 || w > 8) { bad++; console.log("ÉCHEC wanted(" + s + ") =", w); } });
if (M.wanted(100) !== 8 || M.wanted(10) !== 3) { bad++; console.log("ÉCHEC bornes de wanted"); }
const per = {}; M.build({ "🦁 Animaux": 100 }).forEach(q => { per[q.category] = (per[q.category] || 0) + 1; });
if (per["🦁 Animaux"] !== 8) { bad++; console.log("ÉCHEC un thème de 100 questions doit recevoir 8 images, a reçu", per["🦁 Animaux"]); }
Object.keys(M.SETS).forEach(t => { if (!per[t] || per[t] < 3) { bad++; console.log("ÉCHEC thème sans 3 images :", t, per[t]); } });

/* Tous les thèmes existent vraiment dans la banque (aucune faute de frappe → aucune catégorie fantôme) */
const bankDir = path.join(__dirname, "..", "js", "data", "bank"), themes = new Set();
fs.readdirSync(bankDir).forEach(f => { const t = fs.readFileSync(path.join(bankDir, f), "utf8"); for (const m of t.matchAll(/V35_BANK\["([^"]+)"\]/g)) themes.add(m[1]); });
const keys = Object.keys(M.coveredThemes());
keys.forEach(k => { if (!themes.has(k)) { bad++; console.log("ÉCHEC thème inconnu dans la banque :", k); } });

/* Bannière d'ambiance : acceptée par QMedia pour chaque thème, sans texte autre que l'émoji du thème */
themes.forEach(t => { const s = M.bannerSvg(t); if (!QMedia.cleanSvg(s)) { bad++; console.log("ÉCHEC bannière refusée :", t); } });

console.log(n + " questions vérifiées (" + BATCHES + " tirages) :", Object.keys(kinds).map(k => k + " " + kinds[k]).join(", "));
console.log(sets + " séries d'émojis, " + keys.length + " thèmes avec images ciblées, " + (themes.size - keys.length) + " thèmes avec illustration d'ambiance.");
console.log(bad ? bad + " incohérence(s)." : "Aucune incohérence : chaque réponse correspond à l'image.");
process.exit(bad ? 1 : 0);
