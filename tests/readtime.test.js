/* Temps de lecture avant le chrono + « X a répondu · il reste N s »   node tests/readtime.test.js */
const V = require("../js/patches/057-v62-lecture-chrono.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const short = { question: "Capitale de la France ?", answers: ["Paris", "Rome", "Lyon", "Nice"] };
const long = { question: "x".repeat(400), answers: ["a".repeat(100), "b", "c", "d"] };
t("lecture : question courte → minimum 2 s", V.readMs(short, 20) === 2000);
t("lecture : question très longue → plafond 7 s", V.readMs(long, 20) === 7000);
t("lecture : plus le texte est long, plus c'est long (jamais décroissant)", (function () { let p = 0; for (let n = 0; n <= 300; n += 10) { const m = V.readMs({ question: "x".repeat(n), answers: ["a", "b"] }, 20); if (m < p) return false; p = m; } return true; })());
t("lecture : une image ajoute 1,5 s (hors plafond)", V.readMs({ question: "x".repeat(60), answers: ["a", "b", "c", "d"], media: { type: "svg" } }, 20) === V.readMs({ question: "x".repeat(60), answers: ["a", "b", "c", "d"] }, 20) + 1500);
t("lecture : mode 5 secondes → 1,5 s au plus", V.readMs(long, 5) === 1500 && V.readMs(short, 5) === 1500);
t("lecture : arrondie à 100 ms, valeurs absurdes → minimum", V.readMs(long, 20) % 100 === 0 && V.readMs(null, 20) === 2000 && V.readMs({}, "n'importe quoi") === 2000);
t("cleanMs : 0 à 10 000, sinon -1", V.cleanMs(3500) === 3500 && V.cleanMs("2500") === 2500 && V.cleanMs(-5) === 0 && V.cleanMs(99999) === 10000 && V.cleanMs("abc") === -1 && V.cleanMs(undefined) === -1 && V.cleanMs(null) === -1 && V.cleanMs(true) === -1);
t("cleanName : nettoyé et borné à 24", V.cleanName("  Léo‮\n  ") === "Léo" && V.cleanName("x".repeat(80)).length === 24 && V.cleanName(null) === "");
t("texte : un joueur", V.answeredText(["Léo"], 12) === "✅ Léo a répondu · il reste 12 s");
t("texte : deux, trois joueurs", V.answeredText(["Léo", "Sam"], 9) === "✅ Léo et Sam ont répondu · il reste 9 s" && V.answeredText(["A", "B", "C"], 9) === "✅ A, B et C ont répondu · il reste 9 s");
t("texte : plus de trois → « et N autres »", V.answeredText(["A", "B", "C", "D", "E"], 4) === "✅ A, B et 3 autres ont répondu · il reste 4 s");
t("texte : moi seul, personne d'autre n'a encore répondu", V.answeredText([], 7, true) === "⏱️ Réponse envoyée · il reste 7 s pour les autres" && V.answeredText([], 7, false) === "");
t("texte : temps écoulé", V.answeredText(["Léo"], 0) === "⏱️ Temps écoulé" && V.answeredText([], -3, true) === "⏱️ Temps écoulé");
t("texte : liste invalide ignorée", V.answeredText("Léo", 5, false) === "" && V.answeredText([null, "", "Zoé"], 5) === "✅ Zoé a répondu · il reste 5 s");
t("tours spéciaux annoncés : piège, or, éclair, chance, rien sinon", V.roundTag({ trap: true }).cls === "trap" && V.roundTag({ golden: true }).cls === "gold" && V.roundTag({ event: "eclair" }).cls === "eclair" && V.roundTag({ event: "chance" }).cls === "chance" && V.roundTag({}) === null && V.roundTag(null) === null);
t("piège prioritaire sur l'or", V.roundTag({ trap: true, golden: true }).cls === "trap");
console.log("Temps de lecture et temps restant : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
