/* Temps de réaction : médiane, quartiles, régularité, tendance, « premier à répondre juste », courbe de rapidité. */
const A = require("../js/stats/analysis.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* 4 questions, 3 joueurs : états 1 bonne, 2 mauvaise, 3 pas de réponse ; [état, temps, score] */
const log = A.normalize({ id: "r", qt: 10, P: [{ n: "Ana" }, { n: "Bob" }, { n: "Cyd" }], R: [
  { q: "Q1", c: "Géo", d: "facile", m: 0, r: [[1, 1, 500], [1, 2, 500], [2, 3, 0]] },
  { q: "Q2", c: "Géo", d: "moyen", m: 0, r: [[1, 2, 1000], [1, 2, 1000], [1, 6, 500]] },
  { q: "Q3", c: "Art", d: "moyen", m: 0, r: [[1, 3, 1500], [3, 0, 1000], [1, 4, 1000]] },
  { q: "Q4", c: "Art", d: "difficile", m: 0, r: [[2, 4, 1500], [1, 8, 1500], [1, 5, 1500]] }
] });
const R = A.reactionStats(log), a = R.players[0], b = R.players[1], c = R.players[2];
t("Ana : 4 temps, 1-2-3-4", a.n === 4 && a.min === 1 && a.max === 4);
t("quartiles de [1,2,3,4] : 1,75 · 2,5 · 3,25", near(a.q1, 1.75) && near(a.median, 2.5) && near(a.q3, 3.25));
t("moyenne d'Ana = 2,5", near(a.mean, 2.5));
t("écart-type d'Ana (population) = √1,25", near(a.sd, Math.sqrt(1.25)));
t("Bob : « pas de réponse » exclu (3 temps : 2, 2, 8)", b.n === 3 && near(b.mean, 4) && b.median === 2);
t("Ana : bonnes (1,2,3) moyenne 2, mauvaise (4)", near(a.meanGood, 2) && near(a.meanBad, 4) && a.good.length === 3 && a.bad.length === 1);
t("tendance d'Ana positive (ralentit : 1,5 → 3,5)", near(a.trend, 2) && a.trend > 0);
t("Bob : trop peu de réponses pour une tendance (3 < 4)", b.trend === null);
t("réussite d'Ana = 3/4, Bob = 3/4 (la non-réponse compte comme une question jouée), Cyd = 3/4", near(a.accuracy, 0.75) && near(b.accuracy, 0.75) && near(c.accuracy, 0.75));
/* premier à répondre juste : Q1 Ana (1 s) · Q2 égalité Ana/Bob (2 s) · Q3 Ana (3 s contre 4) · Q4 Cyd (5 s, Bob 8 s ; Ana s'est trompée) */
t("victoires de vitesse : Ana 3, Bob 1 (égalité), Cyd 1", a.wins === 3 && b.wins === 1 && c.wins === 1);
t("un seul joueur : aucune victoire de vitesse", A.reactionStats(A.normalize({ id: "s", P: [{ n: "Seul" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] })).players[0].wins === 0);
t("plus rapide : Ana, 1 s, question 1", R.fastest.idx === 0 && R.fastest.t === 1 && R.fastest.round === 1);
t("plus lent : Bob, 8 s, question 4", R.slowest.idx === 1 && R.slowest.t === 8 && R.slowest.round === 4);
t("11 temps au total", R.n === 11 && R.overall.n === 11);
t("médiane générale = médiane de la liste triée", near(R.overall.median, [1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 8].sort((x, y) => x - y)[5]));
t("temps moyen des bonnes > 0 et des mauvaises > 0", R.meanGood > 0 && R.meanBad > 0);
/* courbe de rapidité : monotone, de 0 à 1 */
const e = R.ecdf[0];
t("courbe de rapidité : S = 10 (max(qt, plus lent) = 10) → 11 points", R.S === 10 && e.length === 11);
t("courbe de rapidité : 0 % à 0 s, 100 % à la fin", e[0] === 0 && near(e[10], 1));
t("courbe de rapidité : croissante", e.every((v, i) => i === 0 || v >= e[i - 1]) && R.ecdf[1].every((v, i) => i === 0 || v >= R.ecdf[1][i - 1]));
t("courbe de rapidité d'Ana à 2 s = 2/4", near(e[2], 0.5));
/* groupes */
t("difficultés dans l'ordre facile → difficile", R.byDifficulty.map(g => g.key).join() === "facile,moyen,difficile");
t("difficulté moyen : 5 temps, moyenne (2+2+6+3+4)/5", R.byDifficulty[1].n === 5 && near(R.byDifficulty[1].mean, 17 / 5));
t("thèmes : Géo et Art, 6 et 5 réponses", R.byTheme.length === 2 && R.byTheme[0].key === "Géo" && R.byTheme[0].n === 6 && R.byTheme[1].n === 5);
t("perRound : 5 cases (index 0 vide), « pas de réponse » = null", a.perRound.length === 5 && a.perRound[0] === null && b.perRound[3] === null && a.perRound[4] === 4);
/* robustesse */
const empty = A.reactionStats(A.normalize({ id: "e", P: [{ n: "A" }, { n: "B" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[3, 0, 0], [0, 0, 0]] }] }));
t("aucune réponse chronométrée : zéros, pas de NaN", empty.n === 0 && empty.fastest === null && empty.overall.median === null && empty.players.every(P => P.n === 0 && P.sd === null && P.trend === null));
t("aucun NaN / undefined dans le résultat complet", !/NaN|undefined|Infinity/.test(JSON.stringify(R, (k, v) => v === undefined ? "undefined" : v)));
t("temps nul ignoré (0 s = non mesuré)", A.reactionStats(A.normalize({ id: "z", P: [{ n: "A" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[1, 0, 500]] }] })).n === 0);
const big = A.normalize({ id: "b", qt: 20, P: Array.from({ length: 12 }, (_, i) => ({ n: "J" + i })), R: Array.from({ length: 40 }, (_, q) => ({ q: "Q" + q, c: "T" + (q % 11), d: ["facile", "moyen", "difficile", "impossible"][q % 4], m: 0, r: Array.from({ length: 12 }, (_, k) => [1 + ((q + k) % 3 === 0 ? 1 : 0), 0.5 + ((q * 7 + k * 3) % 19), 100 * q]) })) });
const RB = A.reactionStats(big);
t("gros journal : 480 temps, 8 thèmes au plus, tendance définie", RB.n === 480 && RB.byTheme.length === 8 && RB.players.every(P => P.trend !== null));
t("gros journal : somme des victoires ≥ nombre de questions avec bonne réponse", RB.players.reduce((s, P) => s + P.wins, 0) >= 40);
console.log("Réactions : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
