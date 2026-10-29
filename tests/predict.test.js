/* 🔮 Pronostic de fin et 🕳️ question piège (js/patches/053-v59-pronostic.js)   node tests/predict.test.js */
const V = require("../js/patches/053-v59-pronostic.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const pl = (...s) => { const o = {}; s.forEach((v, i) => { o["p" + i] = { id: "p" + i, name: "J" + i, score: v }; }); return o; };

/* ---- classement ---- */
t("ranks : 1, 2, 3 par score décroissant", (function () { const r = V.ranks(pl(300, 900, 100)); return r.p1 === 1 && r.p0 === 2 && r.p2 === 3; })());
t("ranks : les ex æquo partagent la meilleure place, la suivante saute (100,100,80 → 1,1,3)", (function () { const r = V.ranks(pl(100, 100, 80)); return r.p0 === 1 && r.p1 === 1 && r.p2 === 3; })());
t("ranks : tout le monde à égalité → tous 1ers ; scores 0 → tous 1ers", (function () { const r = V.ranks(pl(0, 0, 0)); return r.p0 === 1 && r.p1 === 1 && r.p2 === 1; })());
t("ranks : accepte un tableau, ignore les entrées sans identifiant, score invalide = 0", (function () { const r = V.ranks([{ id: "a", score: 5 }, { id: "b", score: "x" }, null, { score: 9 }, "z"]); return Object.keys(r).length === 2 && r.a === 1 && r.b === 2; })());
t("ranks : entrée absente ou invalide → vide", Object.keys(V.ranks(null)).length === 0 && Object.keys(V.ranks("x")).length === 0 && Object.keys(V.ranks({})).length === 0);
t("ranks : identifiants numériques lus comme texte", V.ranks([{ id: 7, score: 1 }])["7"] === 1);

/* ---- pari ---- */
t("cleanPick : entier de 1 à n", V.cleanPick(1, 5) === 1 && V.cleanPick(5, 5) === 5 && V.cleanPick("3", 5) === 3 && V.cleanPick(" 4 ", 5) === 4);
t("cleanPick : hors bornes, décimal, texte, vide → null", [0, 6, -1, 2.5, "x", "", "1e1", "0x2", "2.5", null, undefined, NaN, Infinity, {}, [], true].every(v => V.cleanPick(v, 5) === null));
t("cleanPick : n invalide → null", V.cleanPick(1, 0) === null && V.cleanPick(1, NaN) === null && V.cleanPick(1, "x") === null);
t("cleanPick : très grande salle (n = 9 999)", V.cleanPick(9999, 9999) === 9999 && V.cleanPick(10000, 9999) === null);
t("canRun : option active, au moins 3 manches et 2 joueurs", V.canRun({ predict: true }, 3, 2) && !V.canRun({ predict: true }, 2, 2) && !V.canRun({ predict: true }, 10, 1) && !V.canRun({ predict: false }, 10, 4) && !V.canRun(null, 10, 4) && !V.canRun({ predict: true }, "x", 4));

/* ---- règlement ---- */
(function () {
  const P = pl(300, 900, 100), res = V.settle(P, { p0: 2, p1: 2, p2: 3 });
  t("settle : place exacte → score ×2 ; faux → score ÷2", res.length === 3 && res[0].ok && res[0].after === 600 && !res[1].ok && res[1].after === 450 && res[2].ok && res[2].after === 200);
  t("settle : garde avant / après / place réelle / pari", res[1].before === 900 && res[1].rank === 1 && res[1].pick === 2 && res[0].id === "p0");
  t("settle : pas de pari → pas de ligne, score inchangé", V.settle(P, { p1: 1 }).length === 1 && V.settle(P, {}).length === 0 && V.settle(P, null).length === 0);
  t("settle : ÷2 arrondi vers le bas", V.settle(pl(901, 5), { p0: 2 })[0].after === 450 && V.settle(pl(1, 5), { p0: 1 })[0].after === 0);
  t("settle : score 0 → reste 0 dans les deux cas", V.settle(pl(0, 0), { p0: 1 })[0].after === 0 && V.settle(pl(0, 0), { p0: 2 })[0].after === 0);
  t("settle : ex æquo en tête, les deux parient 1 → les deux ont juste", (function () { const r = V.settle(pl(500, 500, 100), { p0: 1, p1: 1 }); return r.every(x => x.ok && x.after === 1000); })());
  t("settle : ex æquo en tête, pari 2 → faux", V.settle(pl(500, 500, 100), { p1: 2 })[0].ok === false);
  t("settle : plafond du score ×2", V.settle(pl(8000000, 1), { p0: 1 })[0].after === 9000000);
  t("settle : nom nettoyé (caractères de contrôle, longueur) et score négatif ramené à 0", (function () { const r = V.settle({ a: { id: "a", name: "A\u0000B" + "x".repeat(60), score: -50 } }, { a: 1 })[0]; return r.name.length <= 24 && !/\u0000/.test(r.name) && r.before === 0 && r.after === 0; })());
  t("settle : un pari d'un joueur inconnu est ignoré", V.settle(P, { zzz: 1 }).length === 0);
  t("settle : ne modifie pas les joueurs reçus", P.p0.score === 300 && P.p1.score === 900);
  t("settle : propriété héritée « constructor » jamais prise pour un pari", V.settle({ a: { id: "a", score: 5 } }, Object.create({ a: 1 })).length === 0);
})();
/* ---- résultat reçu par le réseau ---- */
(function () {
  const good = { type: "v59Result", results: [{ id: "a", name: "Zoé", pick: 2, rank: 2, ok: true, before: 400, after: 800 }] };
  const s = V.sanitizeResult(good);
  t("sanitizeResult : ligne valide gardée telle quelle", s.length === 1 && s[0].name === "Zoé" && s[0].ok === true && s[0].after === 800);
  t("sanitizeResult : pas un objet / pas de liste → null", [null, undefined, "x", 3, {}, { results: "x" }, { results: null }].every(v => V.sanitizeResult(v) === null));
  t("sanitizeResult : lignes absurdes retirées (place 0, négative, énorme, valeur non objet)", V.sanitizeResult({ results: [{ pick: 0, rank: 1 }, { pick: 1, rank: -2 }, { pick: 1e9, rank: 1 }, "x", null, 5, { pick: 1, rank: 1, before: 1, after: 2 }] }).length === 1);
  t("sanitizeResult : borné à 60 lignes", V.sanitizeResult({ results: Array.from({ length: 500 }, () => ({ pick: 1, rank: 1, before: 1, after: 2 })) }).length === V.MAX_ROWS);
  t("sanitizeResult : scores bornés, ok strictement booléen, nom nettoyé", (function () { const r = V.sanitizeResult({ results: [{ id: "a\u0007", name: "<b>x</b>" + "y".repeat(80), pick: 1, rank: 1, ok: "oui", before: -9, after: 1e15 }] })[0]; return r.ok === false && r.before === 0 && r.after === 9000000 && r.name.length <= 24 && !/\u0007/.test(r.id); })());
})();
t("ordinal : 1ʳᵉ puis 2ᵉ, 3ᵉ…", V.ordinal(1) === "1ʳᵉ" && V.ordinal(2) === "2ᵉ" && V.ordinal(11) === "11ᵉ");

/* ---- question piège ---- */
const run = o => V.trapPlan(Object.assign({ enabled: true, golden: false, idx: 5, total: 20, count: 0, lastWasTrap: false, rng: () => 0 }, o));
t("trapPlan : tirage sous 16 % → piège ; au-dessus → pas de piège", run({ rng: () => 0.159 }) === true && run({ rng: () => 0.16 }) === false && run({ rng: () => 0.99 }) === false);
t("trapPlan : jamais les 2 premières questions ni la dernière", run({ idx: 1 }) === false && run({ idx: 2 }) === false && run({ idx: 3 }) === true && run({ idx: 19 }) === true && run({ idx: 20 }) === false && run({ idx: 21 }) === false);
t("trapPlan : jamais deux de suite", run({ lastWasTrap: true }) === false);
t("trapPlan : option éteinte ou question en or → jamais", run({ enabled: false }) === false && run({ golden: true }) === false);
t("trapPlan : plafond selon la durée (20 questions → 4 pièges max)", V.trapMax(20) === 4 && run({ count: 3 }) === true && run({ count: 4 }) === false && V.trapMax(5) === 1 && V.trapMax(3) === 1 && V.trapMax(100) === 20);
t("trapPlan : partie trop courte (moins de 4 questions) → jamais", run({ total: 3, idx: 3 }) === false && run({ total: 4, idx: 3 }) === true);
t("trapPlan : entrées invalides → faux sans erreur", V.trapPlan() === false && V.trapPlan(null) === false && V.trapPlan({ enabled: true, idx: "x", total: "y" }) === false);
t("trapPlan : fréquence ≈ 16 % quand les conditions sont réunies", (function () { let n = 0; for (let i = 0; i < 1000; i++) if (run({ rng: () => i / 1000 })) n++; return n === 160; })());
t("trapScore : ×5 arrondi ; trapLoss : −300 sans passer sous 0", V.trapScore(700) === 3500 && V.trapScore(0) === 0 && V.trapScore(12.5) === 63 && V.trapScore("x") === 0 && V.trapLoss(1000) === 300 && V.trapLoss(120) === 120 && V.trapLoss(0) === 0 && V.trapLoss(-5) === 0 && V.trapLoss(300) === 300);
t("constantes : ×5, −300, fenêtre de 15 s", V.TRAP_MULT === 5 && V.TRAP_PENALTY === 300 && V.WINDOW_SECS === 15);
t("cleanOpts : tout actif par défaut, seul « faux » éteint, fréquence normale par défaut", (function () { const d = V.cleanOpts(null), o = V.cleanOpts({ trap: false, predict: "non", freq: "n'importe quoi" }); return d.trap && d.predict && d.freq === "normale" && o.trap === false && o.predict === true && o.freq === "normale"; })());
t("fréquence des pièges : rare 8 %, normale 16 %, fréquente 30 % ; valeur inconnue → normale", V.chanceOf("rare") === 0.08 && V.chanceOf("normale") === 0.16 && V.chanceOf("frequente") === 0.30 && V.chanceOf("zzz") === 0.16 && V.chanceOf(undefined) === 0.16 && V.cleanFreq("rare") === "rare" && V.cleanFreq("frequente") === "frequente" && V.cleanFreq(5) === "normale");
t("trapPlan : la fréquence choisie change le seuil (0,10 : piège si fréquent, pas si rare)", run({ rng: () => 0.10, freq: "frequente" }) === true && run({ rng: () => 0.10, freq: "rare" }) === false && run({ rng: () => 0.10 }) === true && run({ rng: () => 0.2, freq: "normale" }) === false && run({ rng: () => 0.2, freq: "frequente" }) === true);
t("trapPlan : 8 % / 30 % de 1000 tirages réguliers", (function () { let a = 0, b = 0; for (let i = 0; i < 1000; i++) { if (run({ rng: () => i / 1000, freq: "rare" })) a++; if (run({ rng: () => i / 1000, freq: "frequente" })) b++; } return a === 80 && b === 300; })());
const fs = require("fs"), path = require("path"), idx = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
t("index.html : feuille de style et module après les pouvoirs", idx.includes("css/v59.css") && idx.indexOf("053-v59-pronostic.js") > idx.indexOf("052-v59-pouvoirs.js"));
console.log("Pronostic et pièges : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
