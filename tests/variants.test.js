/* Système de variantes : questions dérivées (inversées + duo)   node tests/variants.test.js */
const fs = require("fs"), vm = require("vm"), path = require("path");
const V = require("../js/data/variants.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
/* vraie banque */
global.V35_BANK = {}; const dir = path.join(__dirname, "../js/data/bank");
fs.readdirSync(dir).filter(f => /^\d+-.*\.js$/.test(f) && !f.startsWith("999")).sort().forEach(f => vm.runInThisContext(fs.readFileSync(path.join(dir, f), "utf8")));
const L = { f: "facile", m: "moyen", d: "difficile", i: "impossible" }, Q = [];
Object.keys(V35_BANK).forEach(c => V35_BANK[c].forEach(s => { const p = s.split("|"); Q.push({ category: c, difficulty: L[p[0]], question: p[1], answers: [p[2], p[3], p[4], p[5]], correct: 0, source: "officiel", v35: true }); }));
const themes = Object.keys(V35_BANK), CAP = 200;
const D = V.expand(Q, { cap: CAP }), D2 = V.expand(Q, { cap: CAP });
const count = {}; Q.concat(D).forEach(q => count[q.category] = (count[q.category] || 0) + 1);
t("banque chargée : plus de 200 thèmes", themes.length >= 200);
t("déterministe : deux appels donnent exactement les mêmes questions", JSON.stringify(D) === JSON.stringify(D2));
t("structure : 4 réponses, bonne en premier, thème et difficulté connus, marquées v64, pas v35", D.every(q => q.answers.length === 4 && q.correct === 0 && count[q.category] > 0 && ["facile", "moyen", "difficile", "impossible"].includes(q.difficulty) && q.v64 === true && !q.v35 && (q.variant === "reverse" || q.variant === "duo") && q.srcKey && q.source === "officiel"));
t("réponses : jamais deux identiques dans une question dérivée", D.every(q => new Set(q.answers.map(V.norm)).size === 4));
t("aucune question dérivée en double dans un thème", (function () { const s = new Set(); return D.every(q => { const k = q.category + "|" + V.norm(q.question); if (s.has(k)) return false; s.add(k); return true; }); })());
const rev = D.filter(q => q.variant === "reverse"), duo = D.filter(q => q.variant === "duo");
t("deux formes présentes (inversée et duo) en grand nombre", rev.length > 3000 && duo.length > 1500);
const byQ = {}; Q.forEach(q => (byQ[q.category + "|" + q.question] = q));
t("inversée : la bonne réponse est la vraie question source, qui a bien « R » pour réponse", rev.every(q => { const R = (q.question.match(/« (.*) » \?$/) || [])[1]; const src = byQ[q.category + "|" + q.answers[0]]; return src && src.answers[0].replace(/\s+/g, " ").trim() === R; }));
t("inversée : les 3 autres questions existent dans le thème et n'ont PAS cette réponse (ni parmi leurs propositions)", rev.every(q => { const R = (q.question.match(/« (.*) » \?$/) || [])[1], nr = V.norm(R); return q.answers.slice(1).every(a => { const s = byQ[q.category + "|" + a]; return s && s.answers.every(x => V.norm(x) !== nr); }); }));
t("inversée : l'explication (correction) cite la réponse et la question", rev.every(q => q.correction && q.correction.includes(q.answers[0])));
t("duo : « Les deux » / « Aucune des deux » en 3e et 4e, bonne réponse proposée dans la question", duo.every(q => q.answers[2] === "Les deux" && q.answers[3] === "Aucune des deux" && q.question.includes("« " + q.answers[0] + " »") && q.question.includes("« " + q.answers[1] + " »") && q.difficulty === "facile"));
t("duo : la mauvaise réponse proposée est bien l'une des vraies mauvaises réponses", duo.every(q => { const sq = Q.find(s => s.category === q.category && V.norm(s.question).slice(0, 80) === q.srcKey); return sq && sq.answers[0] === q.answers[0] && sq.answers.slice(1).includes(q.answers[1]); }));
t("moyenne par thème proche de 140 (banque + dérivées sur les 210 thèmes)", (function () { const m = Q.concat(D).length / themes.length; return m >= 138 && m <= 150; })());
const last = themes.slice(-100), lastAvg = last.reduce((a, c) => a + count[c], 0) / 100, baseLast = last.reduce((a, c) => a + Q.filter(q => q.category === c).length, 0) / 100;
t("100 derniers thèmes : nettement étoffés (au moins ×2,5) et jamais sous 40 questions", lastAvg >= baseLast * 2.5 && Math.min(...themes.map(c => count[c])) >= 40);
t("plafond respecté : aucun thème ne dépasse max(son nombre d'origine, 200)", themes.every(c => count[c] <= Math.max(CAP, Q.filter(q => q.category === c).length)));
t("plafond bas : un thème déjà fourni n'est pas gonflé", V.expand(Q, { cap: 1 }).length === 0);
t("sources inadaptées ignorées (image, déjà dérivée, pas v35, mal formée)", !V.usable({ v35: true, media: {}, answers: ["a", "b", "c", "d"], correct: 0, question: "Une question assez longue ?" }) && !V.usable({ v35: true, v64: true, answers: ["a", "b", "c", "d"], correct: 0, question: "Une question assez longue ?" }) && !V.usable({ answers: ["a", "b", "c", "d"], correct: 0, question: "Une question assez longue ?" }) && !V.usable({ v35: true, answers: ["a", "b", "c"], correct: 0, question: "Une question assez longue ?" }) && !V.usable({ v35: true, answers: ["a", "b", "c", "d"], correct: 1, question: "Une question assez longue ?" }) && V.usable({ v35: true, answers: ["a", "b", "c", "d"], correct: 0, question: "Une question assez longue ?" }));
t("entrées bizarres : pas d'exception, rien en sortie", V.expand(null).length === 0 && V.expand([null, {}, { category: "x" }], { cap: 50 }).length === 0);
/* tirage d'une partie */
const pool = D.filter(q => q.category === themes[150]).concat(Q.filter(q => q.category === themes[150]));
const shuf = pool.slice().sort(() => Math.random() - .5), sp = V.spread(shuf, 20), keys = sp.slice(0, 20).map(q => q.srcKey ? q.srcKey : V.norm(q.question).slice(0, 80));
t("tirage : même longueur, mêmes éléments, aucune origine en double dans les 20 premières", sp.length === shuf.length && new Set(sp).size === shuf.length && new Set(keys).size === 20);
t("tirage : liste vide ou n invalide → pas d'exception", V.spread([], 5).length === 0 && V.spread(null, 5).length === 0 && V.spread(shuf, 0).length === shuf.length);
t("tirage : l'ordre du reste est conservé", (function () { const l = [1, 2, 3, 4, 5].map(i => ({ question: "Question numéro " + i + " ?", category: "c" })); return V.spread(l, 3).map(q => q.question).join() === l.map(q => q.question).join(); })());
console.log("Variantes : " + ok + " OK, " + ko + " échec(s) — dérivées : " + D.length + " (inversées " + rev.length + ", duo " + duo.length + "), moyenne " + (Q.concat(D).length / themes.length).toFixed(1) + ", 100 derniers thèmes " + lastAvg.toFixed(1) + " (avant " + baseLast.toFixed(1) + ")");
process.exit(ko ? 1 : 0);
