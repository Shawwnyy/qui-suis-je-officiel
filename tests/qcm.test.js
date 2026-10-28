/* Tests du générateur de QCM.  Lancer :  node tests/qcm.test.js [--show] */
"use strict";
const fs = require("fs"), path = require("path");
const G = require("../js/qcm/generator.js");
const text = fs.readFileSync(path.join(__dirname, "fixtures", "cours-biologie.txt"), "utf8");
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("ÉCHEC : " + msg); } };
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

for (const count of [5, 10, 15, 30, 100]) {
  const r = G.generate(text, { count, seed: 42 + count, title: "Biologie" });
  ok(r.questions.length <= count, "count=" + count + " : trop de questions (" + r.questions.length + ")");
  ok(r.questions.length >= Math.min(count, 5), "count=" + count + " : trop peu de questions (" + r.questions.length + ")");
  const seenQ = new Set();
  r.questions.forEach((q, i) => {
    const tag = "count=" + count + " q" + (i + 1) + " ";
    ok(q.answers.length === 4, tag + "il faut 4 réponses");
    ok(new Set(q.answers.map(norm)).size === 4, tag + "réponses en double : " + JSON.stringify(q.answers));
    ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, tag + "index de bonne réponse invalide");
    ok(q.question.length <= 220, tag + "question trop longue (" + q.question.length + ")");
    ok(q.answers.every(a => a.length > 0 && a.length <= 120), tag + "réponse vide ou trop longue");
    ok(q.correction.length <= 250, tag + "explication trop longue");
    ok(!seenQ.has(norm(q.question)), tag + "question en double");
    seenQ.add(norm(q.question));
    if (q.kind !== "definitions") ok(norm(q.question.replace(/_____/g, " ")).indexOf(norm(q.answers[q.correct])) < 0 || q.answers[q.correct].length < 3, tag + "la question contient déjà la réponse : " + q.question);
    ok(!q.answers.some(a => /[<>]/.test(a)), tag + "caractères interdits");
  });
}

/* même graine = mêmes questions ; graines différentes = variantes */
const a = G.generate(text, { count: 10, seed: 7 }), b = G.generate(text, { count: 10, seed: 7 }), c = G.generate(text, { count: 10, seed: 8 });
ok(JSON.stringify(a.questions) === JSON.stringify(b.questions), "la génération doit être déterministe pour une graine donnée");
ok(JSON.stringify(a.questions) !== JSON.stringify(c.questions), "deux graines doivent donner des variantes");

/* texte trop court */
const tiny = G.generate("Bonjour. Ceci est court.", { count: 10 });
ok(tiny.questions.length === 0 && !!tiny.warning, "texte trop court : avertissement attendu");

/* détection de langue */
ok(G.detectLang("The cell is the basic unit of life and it has a nucleus that contains the DNA of the organism") === "en", "langue anglaise");
ok(G.detectLang("La célula es la unidad básica de la vida y tiene un núcleo que contiene el ADN de los organismos") === "es", "langue espagnole");
ok(G.detectLang(text) === "fr", "langue française");

/* répartition sur le document : 10 questions ne viennent pas toutes du début */
const spread = G.generate(text, { count: 10, seed: 3 });
const firstThird = text.slice(0, Math.floor(text.length / 3));
const inFirst = spread.questions.filter(q => { const k = q.correction.replace(/^.*?[«“]\s*/, "").slice(0, 25); return firstThird.indexOf(k.trim()) >= 0; }).length;
ok(inFirst <= 6, "les questions doivent être réparties sur tout le document (" + inFirst + "/10 dans le premier tiers)");

/* anglais / espagnol : pas de plantage, au moins quelques questions */
const EN = "The cell is the basic structural and functional unit of all living organisms. It was first observed in 1665 by Robert Hooke, who examined a thin slice of cork under a microscope. The nucleus contains the DNA, which carries genetic information. Mitochondria are organelles that produce energy for the cell in the form of ATP. Photosynthesis is a process by which green plants convert light energy into chemical energy. It takes place in the chloroplasts, which contain chlorophyll. Mitosis is a type of cell division that produces two identical daughter cells. A human cell contains 46 chromosomes arranged in 23 pairs. The membrane controls the exchanges between the cell and its environment. Enzymes are proteins that speed up chemical reactions without being consumed. Louis Pasteur showed in 1862 that microorganisms do not arise by spontaneous generation.";
const en = G.generate(EN, { count: 8, seed: 5 });
ok(en.stats.lang === "en" && en.questions.length >= 3, "anglais : au moins 3 questions (obtenu " + en.questions.length + ")");
/* gros document : doit rester rapide */
const big = Array.from({ length: 60 }, () => text).join("\n\n");
const t0 = Date.now(); const bigR = G.generate(big, { count: 100, seed: 9 }); const dt = Date.now() - t0;
ok(dt < 4000, "document volumineux trop lent : " + dt + " ms");
ok(bigR.questions.length >= 20, "gros document : trop peu de questions (" + bigR.questions.length + ")");
console.log("gros document (" + Math.round(big.length / 1000) + " ko) : " + bigR.questions.length + " questions en " + dt + " ms");

/* ---- Une seule question par bonne réponse (« Cellule » ≠ « cellules » ne compte pas deux fois) ---- */
for (const [label, src] of [["biologie", text], ["anglais", EN], ["gros document", big]]) {
  for (let seed = 1; seed <= 25; seed++) {
    const r = G.generate(src, { count: 30, seed });
    const keys = r.questions.map(q => G.answerKey(q.answers[q.correct]));
    ok(new Set(keys).size === keys.length, label + " seed=" + seed + " : deux questions ont la même bonne réponse : " + keys.filter((k, i) => keys.indexOf(k) !== i).join(", "));
    /* positions : jamais 3 fois de suite la même, répartition quasi égale */
    let run = 1, maxRun = 1;
    r.questions.forEach((q, i) => { if (i && q.correct === r.questions[i - 1].correct) { run++; maxRun = Math.max(maxRun, run); } else run = 1; });
    ok(maxRun <= 2, label + " seed=" + seed + " : la bonne réponse est " + maxRun + " fois de suite à la même position");
    if (r.questions.length >= 8) {
      const cnt = [0, 0, 0, 0]; r.questions.forEach(q => cnt[q.correct]++);
      ok(Math.max(...cnt) - Math.min(...cnt) <= 2, label + " seed=" + seed + " : bonnes réponses mal réparties " + cnt.join("/"));
    }
    ok(r.questions.every(q => q.answers.length === 4 && new Set(q.answers.map(norm)).size === 4), label + " seed=" + seed + " : réponses abîmées par le rééquilibrage");
  }
}
{
  const r = G.generate(text, { count: 100, seed: 5 });
  ok(r.questions.length < 100 && /bonne réponse différente/.test(r.warning || ""), "cours trop court pour 100 questions : l'avertissement doit expliquer le nombre réduit");
}
ok(G.answerKey("Cellules") === G.answerKey("cellule") && G.answerKey("Mitochondries") === G.answerKey("Mitochondrie"), "answerKey : singulier et pluriel identiques");
ok(G.answerKey("1789") !== G.answerKey("1798"), "answerKey : deux dates différentes restent différentes");
{
  const mk = (a, k) => ({ question: "q" + a, answers: ["x1", "x2", "x3", "x4"].map((v, i) => i === k ? a : v + a), correct: k });
  const list = [mk("Cellule", 0), mk("cellules", 2), mk("ADN", 1), mk("ADN", 3), { question: "vide", answers: ["a", "b", "c", "d"], correct: 9 }];
  const out = G.dedupeByAnswer(list);
  ok(out.length === 2 && out[0].answers[out[0].correct] === "Cellule" && out[1].answers[out[1].correct] === "ADN", "dedupeByAnswer : garde la première question de chaque réponse et écarte les entrées invalides (" + out.length + ")");
  const sameQs = Array.from({ length: 12 }, (_, i) => mk("Rep" + i, 1));
  const before = sameQs.map(q => q.answers[q.correct]);
  G.balancePositions(sameQs, G.rngFrom(3));
  ok(sameQs.every((q, i) => q.answers[q.correct] === before[i]), "balancePositions : la bonne réponse doit rester la même, seul son emplacement change");
  ok(new Set(sameQs.map(q => q.correct)).size === 4, "balancePositions : 12 questions toutes en B doivent se répartir sur A, B, C et D");
}

if (process.argv.includes("--show")) {
  const r = G.generate(text, { count: 15, seed: 11, title: "Biologie" });
  console.log("STATS", JSON.stringify(r.stats), r.warning || "");
  r.questions.forEach((q, i) => console.log("\n" + (i + 1) + ". [" + q.kind + " / " + q.difficulty + "] " + q.question + "\n   " + q.answers.map((x, j) => (j === q.correct ? "✔ " : "• ") + x).join("\n   ")));
}
/* titre du thème créé depuis un fichier : coupé sur un mot entier */
const st = G.shortTitle, LONG1 = "Dossier technique plaque a induction chauffante professionnelle", LONG2 = "Introduction a la thermodynamique de la chaleur et du froid industriel";
ok(st("Dossier technique plaque a induction") === "Dossier technique plaque a induction", "titre de 36 caractères : gardé en entier (limite 40)");
ok(st(LONG1) === "Dossier technique plaque a induction…", "titre trop long : coupé sur un mot entier avec « … » (" + st(LONG1) + ")");
ok(!/ ind…?$/.test(st(LONG1)), "plus de coupe en plein mot (« … ind »)");
ok(!/\s(a|de|du|la|le|et|en|un|au)…$/i.test(st(LONG2)) && st(LONG2).length <= 40, "pas de petit mot orphelin avant « … » (" + st(LONG2) + ")");
ok(st("x".repeat(100)).length === 40 && st("x".repeat(100)).endsWith("…"), "un mot géant est coupé à 40 caractères au plus");
ok(st("") === "" && st(null) === "" && st(undefined) === "" && st("   ") === "", "titre vide ou invalide");
ok([LONG1, LONG2, "a ".repeat(40), "é".repeat(60) + " fin", "Cours de biologie cellulaire et moleculaire appliquee"].every(x => st(x).length <= 40), "jamais plus de 40 caractères");
/* carte de thème : les compteurs ne doivent pas être écrasés (régression « (2 0) / 2 0 q. » coupés lettre par lettre) */
const css = fs.readFileSync(path.join(__dirname, "..", "css", "qcm.css"), "utf8");
ok(/#themeGrid \.v163-theme label\{[^}]*flex-wrap:wrap/.test(css), "CSS : la carte de thème peut passer les compteurs à la ligne");
ok(/label>\.v35-count,#themeGrid \.v163-theme label>\.v231-theme-count\{[^}]*flex:0 0 auto;[^}]*white-space:nowrap/.test(css), "CSS : les compteurs de la carte ne rétrécissent plus et ne se cassent plus");
console.log(fails ? "\n" + fails + " échec(s)." : "Tous les tests du générateur passent.");
process.exit(fails ? 1 : 0);
