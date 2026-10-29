/* Tests de l'export PDF des statistiques. Lancer : node tests/pdf.test.js [--write dossier] */
const A = require("../js/stats/analysis.js");
global.V40Analysis = A;
const P = require("../js/stats/pdf.js");
const fs = require("fs"), path = require("path");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }

const raw = {
  id: "g1", at: 1760000000000, qt: 20, mode: "classic",
  P: [{ i: "a", n: "Léa 🦊", a: "🦊", h: 1 }, { i: "b", n: "Tom", a: "🐻" }, { i: "c", n: "Max (exclu) <b>&</b> \\ ( )", a: "🐸", x: 1 }],
  R: [
    { q: "Capitale de la France ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 3.2, 800], [1, 5.5, 700], [2, 9, 0]] },
    { q: "Qui a peint la Joconde ? « œuvre » – 'L’artiste' …", c: "🎨 Arts", d: "moyen", m: 1, r: [[1, 2, 1900], [2, 6, 0], [3, 0, 0]] },
    { q: "Symbole chimique de l'or ?", c: "🧪 Sciences", d: "difficile", m: 0, r: [[2, 7, 1900], [1, 4, 600], [0, 0, 0]] },
    { q: "Combien de côtés a un hexagone ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 1.5, 2600], [1, 2, 1500], [0, 0, 0]] }
  ],
  C: [[2, 1, 1, 1], [2, 2, 1, 2], [2, 3, 2, 2]],
  B: [[1, 0, -1, 1, "xp", 100, 0], [1, 1, 0, 2, "crush", 80, 0], [2, 0, 1, 2, "steal", 60, 0], [2, 1, 0, 2, "miroir", 0, 3, "Mi(ro)ir \\ <b>"]]
};
const log = A.normalize(raw);

/* --- métriques et encodage --- */
t("largeur de « i » < « m »", P._width("i", 10, false) < P._width("m", 10, false));
t("largeur Helvetica de « Hello » = 22,78 pt à 10 pt", Math.abs(P._width("Hello", 10, false) - 22.78) < 0.01);
t("gras plus large que normal", P._width("Qui suis-je", 10, true) > P._width("Qui suis-je", 10, false));
t("tiret long, euro et apostrophe courbe survivent au nettoyage", P._clean("a — b € l’an") === "a — b € l’an");
t("le tiret long est écrit dans le PDF (octet 151 = \\227)", Buffer.from(P.build(log)).toString("latin1").includes("Statistiques") && Buffer.from(P.build(log)).toString("latin1").includes("\\227"));
t("emojis retirés", P._clean("🦊 Léa 🌍") === "Léa");
t("accents conservés (cp1252)", P._toCp("éàç€’").join(",") === "233,224,231,128,146");
t("texte tronqué avec …", P._fit("Un texte vraiment très très long pour une colonne", 60, 10, false).endsWith("…"));

/* --- section Bonus et malus --- */
t("PDF : section « Bonus et malus » présente", Buffer.from(P.build(log)).toString("latin1").includes("Bonus et malus"));
t("PDF : aucune valeur NaN / undefined / Infinity dans le flux", !/NaN|undefined|Infinity/.test(Buffer.from(P.build(log)).toString("latin1")));
t("PDF : partie sans pouvoir → pas de section", !Buffer.from(P.build(A.normalize(Object.assign({}, raw, { B: [] })))).toString("latin1").includes("Bonus et malus"));

/* --- structure du fichier --- */
const bytes = P.build(log);
const s = Buffer.from(bytes).toString("latin1");
t("commence par %PDF-1.4", s.startsWith("%PDF-1.4"));
t("finit par %%EOF", s.trimEnd().endsWith("%%EOF"));
t("caractères ASCII uniquement", /^[\x00-\x7f]*$/.test(s));
const sx = /startxref\n(\d+)\n/.exec(s);
t("startxref pointe sur la table", !!sx && s.substr(+sx[1], 4) === "xref");
const nObj = +/xref\n0 (\d+)/.exec(s)[1] - 1;
const table = s.substr(+sx[1]).split("\n").slice(3, 3 + nObj);
t("chaque entrée xref pointe sur « n 0 obj »", table.every((l, i) => s.substr(parseInt(l.slice(0, 10), 10), String(i + 1).length + 6) === (i + 1) + " 0 obj"));
const count = +/\/Count (\d+)/.exec(s)[1];
t("au moins 2 pages avec ce journal", count >= 2);
t("Count = nombre d'objets /Type /Page", (s.match(/\/Type \/Page /g) || []).length === count);
t("longueurs des flux exactes", [...s.matchAll(/\/Length (\d+) >>\nstream\n/g)].every(m => { const a = m.index + m[0].length; return s.substr(a + (+m[1]), 10) === "\nendstream"; }));
t("parenthèses et antislash échappés", s.includes("Max \\(exclu\\)") && s.includes("\\\\"));
t("ne contient pas d'emoji", !/[\u{1F300}-\u{1FAFF}]/u.test(s));
t("accents en octal (é = \\351)", s.includes("L\\351a"));

/* --- gros journal : pagination, aucune erreur --- */
const big = { id: "big", at: 1, qt: 20, mode: "x", P: [], R: [], C: [] };
for (let i = 0; i < 30; i++) big.P.push({ i: "p" + i, n: "Joueur " + i + " avec un nom très très long pour tester la coupe", a: "🦊" });
for (let q = 0; q < 120; q++) big.R.push({ q: "Question numéro " + (q + 1) + " ".repeat(2) + "avec un énoncé assez long pour devoir être tronqué dans la colonne du tableau récapitulatif", c: "🧪 Thème " + (q % 40), d: ["facile", "moyen", "difficile"][q % 3], m: q % 5 === 0 ? 1 : 0, r: big.P.map((_, k) => [1 + ((q + k) % 3 === 0 ? 1 : 0), 1 + (q * k) % 17, (q + 1) * (k + 1)]) });
for (let i = 0; i < 40; i++) big.C.push([i % 30, 1 + i % 5, 1 + i % 3, 1 + i % 120]);
const nb = A.normalize(big);
const bb = P.build(nb);
const sb = Buffer.from(bb).toString("latin1");
t("gros journal : plusieurs pages", +/\/Count (\d+)/.exec(sb)[1] >= 8);
t("gros journal : fichier raisonnable (< 2 Mo)", bb.length < 2e6);
t("gros journal : le texte des pieds de page est présent", sb.includes("Page 1 / "));

/* --- journal vide ou invalide --- */
let threw = false; try { P.build(null); } catch (e) { threw = true; }
t("journal absent → erreur claire", threw);
const empty = A.normalize({ id: "e", P: [{ n: "Seul" }], R: [] });
t("partie sans question → PDF valide", P.build(empty).length > 500);

/* --- thèmes clair / sombre et graphiques ajoutés --- */
const rich = A.normalize({
  id: "r", at: 1761640000000, qt: 20, mode: "classic",
  P: [{ i: "a", n: "Léa", a: "🦊", h: 1 }, { i: "b", n: "Tom", a: "🐻" }, { i: "c", n: "Max", a: "🐸" }, { i: "d", n: "Inès", a: "🐼" }],
  R: [
    { q: "Q1 ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 3, 900], [1, 5, 700], [2, 9, 0], [1, 4, 800]] },
    { q: "Q2 ?", c: "🎨 Arts", d: "moyen", m: 1, r: [[1, 2, 1900], [2, 6, 0], [3, 0, 0], [1, 3, 900]] },
    { q: "Q3 ?", c: "🧪 Sciences", d: "difficile", m: 0, r: [[2, 7, 0], [1, 4, 600], [1, 5, 500], [2, 8, 0]] },
    { q: "Q4 ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 1.5, 2600], [1, 2, 1500], [2, 6, 0], [1, 3, 700]] }
  ],
  C: [],
  B: [[2, 0, -1, 1, "xp", 100, 0], [2, 1, 0, 2, "crush", 80, 0], [3, 2, 3, 2, "steal", 60, 0], [3, 1, 1, 1, "w_xp", 300, 0], [3, 2, 2, 2, "w_crush", 500, 0], [4, 3, 3, 2, "w_tax", 200, 1], [4, 0, 0, 1, "w_jackpot", 1000, 0]]
});
const bl = P.build(rich), bd = P.build(rich, { theme: "dark" }), bx = P.build(rich, { theme: "n'importe quoi" });
const sl = Buffer.from(bl).toString("latin1"), sd = Buffer.from(bd).toString("latin1");
t("thème par défaut = clair (identique à { theme: 'light' })", Buffer.from(P.build(rich, { theme: "light" })).toString("latin1") === sl);
t("thème inconnu → clair", Buffer.from(bx).toString("latin1") === sl);
t("clair : pas de fond de page sombre", !sl.includes("rg 0 0 595.28 841.89 re f"));
t("sombre : fond de page peint sur chaque page", (sd.match(/0\.1 0\.1 0\.1 rg 0 0 595\.28 841\.89 re f/g) || []).length === +/\/Count (\d+)/.exec(sd)[1]);
t("sombre : structure PDF valide (xref, EOF)", (() => { const x = /startxref\n(\d+)\n/.exec(sd); return !!x && sd.substr(+x[1], 4) === "xref" && sd.trimEnd().endsWith("%%EOF"); })());
t("sombre : ni NaN ni undefined", !/NaN|undefined|Infinity/.test(sd) && !/NaN|undefined|Infinity/.test(sl));
t("sombre : texte principal clair (0.94 0.94 0.93)", sd.includes("0.94 0.94 0.93 rg"));
t("sombre et clair ont le même nombre de pages", +/\/Count (\d+)/.exec(sd)[1] === +/\/Count (\d+)/.exec(sl)[1]);
["Course au classement", "Forme du moment", "Qui a mené la partie", "Bonnes et mauvaises réponses par joueur", "Réponse correcte la plus rapide", "Plus gros gain en une question", "Réussite question par question",
 "Roue des bonus", "Malus reçus et boucliers", "Points gagnés et perdus", "Bilan net des pouvoirs", "Types de pouvoirs utilisés", "Qui vise qui", "Bonus et malus cumulés"].forEach(function (name) {
  const enc = name.normalize("NFC").replace(/é/g, "\\351").replace(/è/g, "\\350").replace(/ê/g, "\\352").replace(/ç/g, "\\347");
  t("PDF clair : « " + name + " »", sl.includes(enc)); t("PDF sombre : « " + name + " »", sd.includes(enc));
});
t("partie sans pouvoir → pas de roue / matrice", !/Roue des bonus|Qui vise qui/.test(Buffer.from(P.build(A.normalize(Object.assign({}, raw, { B: [] })), { theme: "dark" })).toString("latin1")));
t("le détail de la roue figure dans le tableau (colonne Roue)", sl.includes("(Roue)"));
const one = A.normalize({ id: "u", P: [{ n: "Seul" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] });
t("un seul joueur, une question : clair et sombre valides", P.build(one).length > 500 && P.build(one, { theme: "dark" }).length > 500);
const bigd = Buffer.from(P.build(nb, { theme: "dark" })).toString("latin1");
t("gros journal sombre : valide, sans NaN", bigd.startsWith("%PDF-1.4") && !/NaN|undefined|Infinity/.test(bigd));
const lat = b => Buffer.from(b).toString("latin1");
t("PDF : classement à la mi-partie présent (journal de 4 questions : après la question 2)", lat(P.build(log)).includes("Classement \\340 la mi-partie") && lat(P.build(log)).includes("apr\\350s la question 2 sur 4"));
t("PDF : trophées de la partie présents (tableau des gagnants)", lat(P.build(log)).includes("Troph\\351es de la partie") && lat(P.build(log)).includes("Gagnant\\(e\\)"));
t("PDF : pas de classement à la mi-partie pour une seule question", !lat(P.build(one)).includes("Classement \\340 la mi-partie"));
/* tous les sous-titres de graphique de la page de stats ont leur équivalent dans le PDF (mêmes mots) */
const statsSrc = fs.readFileSync(path.join(__dirname, "../js/stats/stats.js"), "utf8");
const cardTitles = [...statsSrc.matchAll(/K\.card\(\{\s*title: "([^"]+)"/g)].map(m => m[1].replace(/^[^\wÀ-ÿ]+/u, "").trim());
const pdfSrc = fs.readFileSync(path.join(__dirname, "../js/stats/pdf.js"), "utf8");
const IGNORED = { "Réussite des dernières parties": "historique multi-parties, absent du journal d'une partie", "Mon score, partie après partie": "onglet « Mes records » : plusieurs parties, absent du journal d'une partie" };
const ALIAS = { "Infractions par joueur": "Infractions détectées", "Chronologie": "Infractions détectées" };
cardTitles.filter(x => !(x in IGNORED)).forEach(function (title) {
  const key = (ALIAS[title] || title).split(" ").slice(0, 3).join(" ").replace(/[’']/g, "'");
  t("graphique d'écran « " + title + " » a un équivalent PDF", pdfSrc.includes(key) || pdfSrc.toLowerCase().includes(key.toLowerCase()));
});

const wi = process.argv.indexOf("--write");
if (wi > 0) { const d = process.argv[wi + 1]; fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "stats-petit.pdf"), bytes); fs.writeFileSync(path.join(d, "stats-gros.pdf"), bb); fs.writeFileSync(path.join(d, "stats-riche-clair.pdf"), bl); fs.writeFileSync(path.join(d, "stats-riche-sombre.pdf"), bd); }
console.log(ko ? ko + " échec(s) sur " + (ok + ko) : "pdf.test.js : " + ok + " vérifications OK");
process.exit(ko ? 1 : 0);
