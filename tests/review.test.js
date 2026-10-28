/* Mode révision (QCM de cours) : décision, choix de pouvoir imposé, justifications avec le passage du cours. Lancer : node tests/review.test.js */
const R = require("../js/review/review.js");
const J = require("../js/justif/justif.js");
const G = require("../js/qcm/generator.js");
let ok = 0, ko = 0;
function t(label, cond, info) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label, info === undefined ? "" : JSON.stringify(info)); } }

/* --- réglage --- */
t("réglage inconnu → automatique", R.cleanMode("zzz") === "auto" && R.cleanMode(undefined) === "auto" && R.cleanMode(null) === "auto");
t("réglages valides conservés", R.cleanMode("on") === "on" && R.cleanMode("off") === "off" && R.cleanMode("auto") === "auto");
const course = { question: "Q ?", lesson: { s: "Phrase du cours.", c: "Phrase du cours.", p: 2, t: "Cours" } }, plain = { question: "Q2 ?" };
t("automatique : tout vient d'un cours → révision", R.decide("auto", [course, course]) === true);
t("automatique : une seule question hors cours → partie normale", R.decide("auto", [course, plain]) === false);
t("automatique : aucune question → normale", R.decide("auto", []) === false && R.decide("auto", null) === false);
t("automatique : la question impossible ajoutée en fin de partie est ignorée", R.decide("auto", [course, { question: "?", impossible: true }]) === true);
t("activé : toujours révision", R.decide("on", [plain]) === true && R.decide("on", []) === true);
t("désactivé : jamais", R.decide("off", [course]) === false);
t("leçon mal formée (pas de texte) → pas un cours", R.decide("auto", [{ lesson: {} }, { lesson: "x" }, { lesson: null }]) === false);

/* --- choix de pouvoir imposé : bonus seulement --- */
const B = ["xp", "shield", "double", "jackpot", "triple"];
const f1 = R.forceBonus({ type: "powerChoice", playerId: "a", choice: "malus", targetId: "b", level: 2, token: "T", kind: "crush" }, B);
t("malus demandé → bonus, sans cible", f1.choice === "bonus" && f1.targetId === null);
t("type de malus → points bonus", f1.kind === "xp");
t("le reste du message est intact (joueur, jeton, niveau)", f1.playerId === "a" && f1.token === "T" && f1.level === 2 && f1.type === "powerChoice");
t("bonus valide conservé", R.forceBonus({ choice: "bonus", kind: "shield", targetId: "x" }, B).kind === "shield");
t("cible retirée même pour un bonus", R.forceBonus({ choice: "bonus", kind: "xp", targetId: "x" }, B).targetId === null);
t("liste de bonus absente → points bonus", R.forceBonus({ choice: "malus", kind: "freeze" }, undefined).kind === "xp");
t("message non modifié en place", (function () { const d = { choice: "malus", targetId: "b", kind: "crush" }; R.forceBonus(d, B); return d.choice === "malus" && d.targetId === "b"; })());
t("message vide → bonus de points", (function () { const d = R.forceBonus(null, B); return d.choice === "bonus" && d.kind === "xp"; })());

/* --- le générateur joint le passage (phrases voisines du même paragraphe) --- */
const text = "Le premier paragraphe parle des pommes rouges et des pommes vertes du verger familial.\n\n"
  + "La plaque à induction chauffe uniquement le récipient magnétisable posé dessus sans chauffer la table. L'alimentation électrique nécessaire est de 230 V et 50 Hz pour un usage domestique normal. Le récipient doit être posé au centre de la zone de cuisson indiquée.\n\n"
  + "Le dernier paragraphe décrit le nettoyage de la surface vitrocéramique avec une éponge humide et un produit doux.\n\n"
  + "Les poires jaunes mûrissent en automne dans les vergers du sud de la région française ensoleillée chaque année.";
const res = G.generate(text, { count: 8, lang: "fr", title: "Test" });
const withCtx = res.questions.filter(q => q.ctx && q.src);
t("le générateur fournit src et ctx pour chaque question", res.questions.length > 0 && withCtx.length === res.questions.length, res.questions.length);
t("le passage contient toujours la phrase source", withCtx.every(q => q.ctx.indexOf(q.src) >= 0));
t("le passage ne dépasse pas la limite", withCtx.every(q => q.ctx.length <= G.LIMITS.lesson), withCtx.map(q => q.ctx.length));
t("les phrases d'un AUTRE paragraphe ne sont pas mélangées", withCtx.every(q => !(q.ctx.indexOf("pommes") >= 0 && q.ctx.indexOf("induction") >= 0)));
const mid = withCtx.find(q => /230 V/.test(q.src));
t("phrase du milieu : voisines du même paragraphe jointes", !mid || (mid.ctx.indexOf("induction") >= 0 && mid.ctx.indexOf("centre de la zone") >= 0), mid && mid.ctx);

/* --- justification d'une question de cours --- */
const q = { question: "Complète la phrase : « L'alimentation est de ____ V et 50 Hz »", answers: ["170", "2300", "230", "350"], correct: 2, difficulty: "moyen", correction: "Extrait du cours : « x »",
  lesson: { s: "L'alimentation électrique nécessaire est de 230 V et 50 Hz.", c: "La plaque chauffe le récipient. L'alimentation électrique nécessaire est de 230 V et 50 Hz. Le récipient est posé au centre.", p: 3, t: "Plaque à induction" } };
const bad = J.explain(q, { mine: 0, correct: 2 });
const lines = k => bad.lines.filter(l => l.k === k);
t("mauvaise réponse : ton « bad »", bad.tone === "bad" && /170/.test(bad.headline));
t("la bonne réponse est rappelée", lines("answer")[0].t.indexOf("230") >= 0);
t("le passage du cours est cité avec la page et le titre", lines("lesson").length === 1 && /page 3 de « Plaque à induction »/.test(lines("lesson")[0].t) && lines("lesson")[0].quote === q.lesson.c);
t("l'extrait générique « Extrait du cours » n'est pas répété", !bad.lines.some(l => l.k === "explain"));
t("écart chiffré + pourquoi la réponse est fausse", lines("why").length === 2 && /trop basse de 60/.test(lines("why")[0].t) && /ne figure pas dans ce passage/.test(lines("why")[1].t), lines("why"));
t("conseil de révision avec la page", lines("remember").length === 1 && /page 3/.test(lines("remember")[0].t));
t("la voix lit le passage du cours", /Le cours dit : L'alimentation électrique/.test(bad.speech), bad.speech);
const html = J.html(bad);
t("HTML : réponse surlignée dans le passage", /<q>.*<mark>230<\/mark> V et 50 Hz/.test(html), html);
const inPassage = J.explain(q, { mine: 3, correct: 2 });
const q2 = JSON.parse(JSON.stringify(q)); q2.answers[1] = "Hz"; const conf = J.explain(q2, { mine: 1, correct: 2 });
t("réponse fausse présente dans le passage → on le dit", conf.lines.some(l => l.k === "why" && /apparaît bien dans ce passage/.test(l.t)), conf.lines);
t("bonne réponse : seulement la phrase source", (function () { const g = J.explain(q, { mine: 2, correct: 2 }); const l = g.lines.filter(x => x.k === "lesson"); return g.tone === "good" && l.length === 1 && l[0].quote === q.lesson.s && !g.lines.some(x => x.k === "why" || x.k === "remember"); })());
t("temps écoulé : passage + conseil, pas de « pourquoi »", (function () { const n = J.explain(q, { mine: null, correct: 2 }); return n.tone === "none" && n.lines.some(x => x.k === "lesson") && n.lines.some(x => x.k === "remember") && !n.lines.some(x => x.k === "why"); })());
t("sans page connue : pas de « page »", (function () { const x = JSON.parse(JSON.stringify(q)); x.lesson.p = 0; const e = J.explain(x, { mine: 0, correct: 2 }); return !/page/.test(e.lines.find(l => l.k === "lesson").t) && !/page/.test(e.lines.find(l => l.k === "remember").t); })());
t("question ordinaire (sans leçon) : comportement d'avant", (function () { const x = { question: "Quelle est la capitale de la France ?", answers: ["Lyon", "Paris", "Nice", "Lille"], correct: 1 }; const e = J.explain(x, { mine: 0, correct: 1 }); return !e.lines.some(l => l.k === "lesson") && e.lines.some(l => l.k === "sentence"); })());

/* --- leçon malveillante ou mal formée : jamais d'erreur, jamais de HTML brut, longueurs bornées --- */
const evil = JSON.parse(JSON.stringify(q)); evil.lesson = { s: "<img src=x onerror=alert(1)> 230 " + "x".repeat(5000), c: 42, p: "abc", t: "<b>" + "t".repeat(900) + "</b>" };
const eh = J.html(J.explain(evil, { mine: 0, correct: 2 }));
t("leçon piégée : balises échappées", !/<img|<b>/.test(eh) && /&lt;img/.test(eh));
t("leçon piégée : textes bornés", (function () { const L = J.lessonOf(evil); return L.s.length <= 300 && L.c.length <= 600 && L.t.length <= 80 && L.p === 0; })());
t("leçons invalides ignorées", J.lessonOf({ lesson: null }) === null && J.lessonOf({ lesson: "x" }) === null && J.lessonOf({ lesson: { s: "  " } }) === null && J.lessonOf({}) === null);
t("passage incohérent avec la phrase → la phrase seule", J.lessonOf({ lesson: { s: "Une phrase du cours assez longue.", c: "Tout autre texte sans rapport.", p: 1, t: "" } }).c === "Une phrase du cours assez longue.");
t("surlignage : caractères spéciaux de regex sans erreur", J.mark("a (b) + c", "(b) +") !== undefined && J.mark("x", "") === "x" && J.mark("<a>", "a") === "&lt;<mark>a</mark>&gt;");
t("surlignage : au plus 4 occurrences", (J.mark("a a a a a a a a", "a").match(/<mark>/g) || []).length === 4);

console.log("Mode révision : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
