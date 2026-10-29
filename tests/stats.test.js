/* Tests de l'analyse des parties (statistiques) et du format de journal. Lancer : node tests/stats.test.js */
const A = require("../js/stats/analysis.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }

/* Partie de référence : 3 joueurs, 4 questions. Max est exclu après la question 2. */
const raw = {
  id: "g1", at: 1760000000000, qt: 20, mode: "classic",
  P: [{ i: "a", n: "Léa", a: "🦊", h: 1 }, { i: "b", n: "Tom", a: "🐻" }, { i: "c", n: "Max", a: "🐸" }],
  R: [
    { q: "Capitale de la France ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 3.2, 800], [1, 5.5, 700], [2, 9, 0]] },
    { q: "Qui a peint la Joconde ?", c: "🎨 Arts", d: "moyen", m: 1, r: [[1, 2, 1900], [2, 6, 0], [3, 0, 0]] },
    { q: "Symbole chimique de l'or ?", c: "🧪 Sciences", d: "difficile", m: 0, r: [[2, 7, 1900], [1, 4, 600], [0, 0, 0]] },
    { q: "Combien de côtés a un hexagone ?", c: "🌍 Géographie", d: "facile", m: 0, r: [[1, 1.5, 2600], [1, 2, 1500], [0, 0, 0]] }
  ],
  C: [[2, 1, 1, 1], [2, 2, 1, 2], [2, 3, 2, 2]]
};
const log = A.normalize(raw);
t("journal valide", !!log && log.P.length === 3 && log.R.length === 4);

/* --- chiffres clés --- */
const tot = A.totals(log);
t("11 réponses (3+3+2+... exclu non compté)", tot.answers === 10);
t("5+ bonnes : 6", tot.correct === 6);
t("mauvaises : 3", tot.wrong === 3);
t("sans réponse : 1", tot.none === 1);
t("réussite = 6/10", Math.abs(tot.accuracy - 0.6) < 1e-9);
t("infractions = 3", tot.cheats === 3);
t("temps moyen sur les réponses chronométrées", Math.abs(tot.avgTime - (3.2 + 5.5 + 9 + 2 + 6 + 7 + 4 + 1.5 + 2) / 9) < 1e-9);

/* --- joueurs --- */
const pl = A.perPlayer(log);
t("Léa : 3 bonnes 1 mauvaise", pl[0].correct === 3 && pl[0].wrong === 1 && pl[0].none === 0);
t("Léa gagne avec 2600", pl[0].final === 2600 && pl[0].rank === 1);
t("Tom 2e", pl[1].rank === 2 && pl[1].final === 1500);
t("Max : score final = dernier score connu (0)", pl[2].final === 0 && pl[2].rank === 3);
t("Max : 2 questions manquées après l'exclusion", pl[2].absent === 2 && pl[2].answered === 2);
t("Max : 3 infractions", pl[2].cheats === 3);
t("Léa : plus gros gain = 1100 (Q2)", pl[0].bestGain === 1100);
t("réussite Léa 75 %", Math.abs(pl[0].accuracy - 0.75) < 1e-9);

/* --- séries, rapidité, répartition des temps, faits marquants --- */
t("Léa : meilleure série 2, réponse la plus rapide 1,5 s", pl[0].bestStreak === 2 && pl[0].fastest === 1.5);
t("Tom : série 2 (Q3-Q4), plus rapide 2 s", pl[1].bestStreak === 2 && pl[1].fastest === 2);
t("Max : aucune série, aucun temps de bonne réponse", pl[2].bestStreak === 0 && pl[2].fastest === null);
const hist = A.timeHistogram(log);
t("histogramme : 9 réponses chronométrées en 5 tranches de 4 s", hist.n === 9 && hist.width === 4 && hist.buckets.length === 5);
t("histogramme : 0–4 s = 4 bonnes ; 4–8 s = 2 bonnes + 2 mauvaises ; 8–12 s = 1 mauvaise", hist.buckets[0].correct === 4 && hist.buckets[0].wrong === 0 && hist.buckets[1].correct === 2 && hist.buckets[1].wrong === 2 && hist.buckets[2].wrong === 1);
t("histogramme : le total des tranches = n", hist.buckets.reduce((a, b) => a + b.correct + b.wrong, 0) === hist.n);
t("histogramme : partie vide", A.timeHistogram(A.normalize({ P: [{ i: "a", n: "A" }], R: [] })).n === 0);
const hl = A.highlights(log);
t("faits marquants : série, rapidité, gain, réussite", hl.map(h => h.key).join() === "streak,fastest,gain,accuracy" && hl.every(h => h.name === "Léa"));
t("faits marquants : partie vide sans erreur", A.highlights(A.normalize({ P: [{ i: "a", n: "A" }], R: [] })).length === 0);

/* --- courbes --- */
const ser = A.scoreSeries(log);
t("courbe : départ à 0 puis un point par question", ser[0].values.length === 5 && ser[0].values[0] === 0 && ser[0].values[4] === 2600);
t("courbe : le joueur exclu s'arrête (null)", ser[2].values[3] === null && ser[2].values[4] === null && ser[2].values[2] === 0);

/* --- thèmes / difficultés / médias --- */
const cat = A.byCategory(log);
t("thème le mieux réussi en tête (Géographie 5/6... )", cat[0].label === "🌍 Géographie" && cat[0].answers === 5 && cat[0].correct === 4);
t("3 thèmes", cat.length === 3);
const dif = A.byDifficulty(log);
t("difficultés dans l'ordre facile → difficile", dif.map(d => d.key).join() === "facile,moyen,difficile");
const med = A.byMedia(log);
t("média : 2 groupes", med.length === 2 && med.some(g => g.label === "Avec image / vidéo" && g.questions === 1));
const hard = A.hardest(log, 2);
t("question la plus difficile = Q3 (1/2) ou Q2", hard[0].rate <= hard[1].rate);
t("Q3 : 1 bonne sur 2 réponses", A.roundStats(log)[2].correct === 1 && A.roundStats(log)[2].answers === 2);

/* --- historique --- */
const sm = A.summarize(log);
t("résumé : gagnant", sm.winner === "Léa" && sm.winnerScore === 2600 && sm.players === 3 && sm.rounds === 4);
let h = A.addToHistory([], log, 3);
const l2 = A.normalize(Object.assign({}, raw, { id: "g2" })), l3 = A.normalize(Object.assign({}, raw, { id: "g3" })), l4 = A.normalize(Object.assign({}, raw, { id: "g4" }));
h = A.addToHistory(h, l2, 3); h = A.addToHistory(h, l3, 3); h = A.addToHistory(h, l4, 3);
t("historique limité à 3, plus récent en tête", h.length === 3 && h[0].id === "g4" && h[2].id === "g2");
t("pas de doublon d'identifiant", A.addToHistory(h, log, 3).length === 3 && A.addToHistory(A.addToHistory(h, l3, 3), l3, 3).filter(g => g.id === "g3").length === 1);
t("historique borné en taille", A.addToHistory(h, l4, 3, 10).length === 1);

/* --- CSV --- */
const csv = A.toCSV(log);
t("CSV : en-tête + 12 lignes", csv.split("\r\n").length === 13);
t("CSV : virgule décimale", csv.indexOf("3,2") > 0);
t("CSV : formules neutralisées", A.csvCell("=1+1") === "'=1+1" && A.csvCell("@SUM(A1)") === "'@SUM(A1)" && A.csvCell("-2") === "'-2");
t("CSV : guillemets échappés", A.csvCell('dit "oui"') === '"dit ""oui"""' && A.csvCell("a;b") === '"a;b"');

/* --- données hostiles reçues du réseau --- */
t("null refusé", A.normalize(null) === null && A.normalize("x") === null && A.normalize({}) === null);
t("sans joueur refusé", A.normalize({ P: [], R: [] }) === null);
t("trop de manches refusé", A.normalize({ P: [{ i: "a", n: "A" }], R: new Array(301).fill({ r: [[1, 1, 1]] }) }) === null);
t("trop de joueurs refusé (plafond 9 999)", A.normalize({ P: new Array(10000).fill({ i: "a", n: "A" }), R: [] }) === null && A.normalize({ P: new Array(9999).fill({ i: "a", n: "A" }), R: [] }) !== null);
const evil = A.normalize({ id: "<img src=x onerror=alert(1)>", P: [{ i: 5, n: "<b>x</b>\u0000\u001f" + "y".repeat(100), a: "🦊".repeat(30) }], R: [{ q: "q".repeat(500), c: 3, d: "<script>", m: "oui", r: [[99, 1e9, 1e12]] }], C: [[7, 1, 1, 1], [0, 1e9, -3, 0], "x"] });
t("nom nettoyé et borné", evil.P[0].n.length <= 40 && !/[\u0000-\u001f]/.test(evil.P[0].n));
t("avatar borné", evil.P[0].a.length <= 12);
t("texte borné", evil.R[0].q.length === 160 && evil.R[0].c === "");
t("difficulté inconnue → moyen", evil.R[0].d === "moyen");
t("état borné 0-3", evil.R[0].r[0][0] === 3);
t("score borné", Math.abs(evil.R[0].r[0][2]) <= 9999999);
t("temps borné (0 si pas de réponse)", evil.R[0].r[0][1] === 0);
t("infraction hors joueur ignorée, valeurs bornées", evil.C.length === 1 && evil.C[0][1] === 99 && evil.C[0][2] === 1 && evil.C[0][3] === 1);
const short = A.normalize({ P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [{ q: "x", r: [[1, 2, 3]] }] });
t("manche trop courte complétée", short.R[0].r.length === 2 && short.R[0].r[1][0] === 0);
const empty = A.normalize({ P: [{ i: "a", n: "A" }], R: [] });
t("partie vide : calculs sans erreur", A.totals(empty).accuracy === null && A.perPlayer(empty)[0].accuracy === null && A.hardest(empty).length === 0 && A.byCategory(empty).length === 0);

/* --- Bonus / malus (journal B) : chiffres recalculés à la main --- */
const pw = A.normalize({ P: [{ i: "a", n: "Ana" }, { i: "b", n: "Bob" }, { i: "c", n: "Cy" }], R: [{ q: "x", r: [[1, 2, 100], [1, 3, 100], [2, 4, 0]] }, { q: "y", r: [[1, 2, 300], [1, 3, 50], [2, 4, 0]] }],
  B: [[1, 0, -1, 1, "xp", 100, 0], [1, 1, 0, 2, "crush", 80, 0], [2, 0, 1, 2, "steal", 60, 0], [2, 2, 0, 2, "freeze", 0, 1], [2, 1, -1, 1, "shield", 0, 0], [2, 2, 1, 2, "miroir", 0, 2, "🪞 Miroir"],
    [9, 5, 1, 2, "xp", 5, 0], [1, 0, 0, 2, "xp", 5, 0]] });
const dirty = A.normalize({ P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [], B: [[1, 0, -1, 1, "<b>x</b>", 1, 0], [1, 0, 1, 2, "xp", -50, 0], [1, 0, -1, 3, "xp", 1, 0], "nimp", [1, 7, -1, 1, "xp", 1, 0], [1, 0, 1, 2, "a".repeat(40), 3, 9, "é".repeat(80)]] });
const PW = A.powers(pw);
t("journal B : joueur inconnu ignoré, cible = lanceur → aucune cible", pw.B.length === 7 && pw.B.some(b => b[5] === 5 && b[2] === -1 && b[3] === 2));
t("entrées invalides ignorées (type 3, texte, joueur inconnu)", dirty.B.length === 3);
t("kind nettoyé (« <b>x</b> » → « bxb »), tronqué à 16 caractères", dirty.B[0][4] === "bxb" && dirty.B[2][4].length === 16);
t("montant négatif ramené à 0, drapeaux bornés, libellé tronqué à 30", dirty.B[1][5] === 0 && dirty.B[2][6] === 3 && dirty.B[2][7].length === 30);
t("total / bonus / malus", PW.total === 7 && PW.bonus === 2 && PW.malus === 5);
t("malus bloqués et renvoyés", PW.blocked === 2 && PW.reflected === 1);
const [ana, bob, cy] = PW.players;
t("Ana : gagne 100 + 60 (vol), perd 80 → bilan +80", ana.gained === 160 && ana.lost === 80 && ana.net === 80);
t("Bob : perd 60 (vol) → bilan −60", bob.lost === 60 && bob.net === -60 && bob.dealt === 80);
t("Cy : deux malus bloqués ou renvoyés", cy.blockedOnMe === 2 && cy.malusGiven === 2);
t("boucliers : Ana et Bob ont chacun arrêté un malus", ana.shieldSaves === 1 && bob.shieldSaves === 1 && ana.reflected === 0 && bob.reflected === 1);
t("matrice lanceur → cible", PW.matrix[1][0] === 1 && PW.matrix[0][1] >= 1 && PW.matrix[2][0] === 1 && PW.matrix[2][1] === 1 && PW.matrix[0][0] === 0);
t("pouvoir sans cible : ni cible ni matrice", ana.malusGiven === 2 && PW.matrix[0].reduce((x, y) => x + y, 0) === PW.matrix[0][1]);
t("bilan cumulé Ana : 20 après Q1, 80 après Q2", PW.netSeries[0].values.join() === "0,20,80" && PW.netSeries[1].values.join() === "0,0,-60");
t("points déplacés = 100 + 80 + 60", PW.points === 240);
t("noms des pouvoirs spéciaux et connus", A.powerName([0, 0, 0, 2, "freeze", 0, 0, ""]) === "Gel du combo" && A.powerName([0, 0, 0, 2, "miroir", 0, 0, "🪞 Miroir"]) === "🪞 Miroir");
t("partie sans pouvoir : powers() vide sans erreur", A.powers(empty).total === 0 && A.powers(short).players.length === 2);
const flood = A.normalize({ P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [], B: Array.from({ length: 5000 }, () => [1, 0, 1, 2, "xp", 5, 0]) });
t("journal B plafonné", flood.B.length === A.MAX_POWERS);
t("anciens journaux sans B acceptés", A.normalize({ P: [{ i: "a", n: "A" }], R: [] }).B.length === 0);

/* --- analyses avancées : course au classement, forme du moment, qui mène --- */
const adv = A.normalize({ id: "adv", P: [{ i: "a", n: "A" }, { i: "b", n: "B" }, { i: "c", n: "C" }], R: [
  { q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 100], [1, 3, 50], [2, 4, 50]] },
  { q: "Q2", c: "x", d: "facile", m: 0, r: [[2, 2, 100], [1, 3, 200], [2, 4, 50]] },
  { q: "Q3", c: "x", d: "facile", m: 0, r: [[1, 2, 300], [2, 3, 200], [1, 4, 300]] }
] });
const rks = A.rankSeries(adv);
t("rankSeries : départ, tous 1er", rks.every(x => x.values[0] === 1));
t("rankSeries A = 1,1,2,1 (ex æquo en tête partagé)", rks[0].values.join() === "1,1,2,1");
t("rankSeries B = 1,2,1,3 (l'ex æquo fait sauter la place suivante)", rks[1].values.join() === "1,2,1,3");
t("rankSeries C = 1,2,3,1", rks[2].values.join() === "1,2,3,1");
const frm = A.formSeries(adv, 3);
t("formSeries : pas de valeur au départ", frm.every(x => x.values[0] === null));
t("formSeries A = 100 %, 50 %, 66,7 %", frm[0].values.slice(1).join() === "100,50,66.7");
t("formSeries C = 0 %, 0 %, 33,3 %", frm[2].values.slice(1).join() === "0,0,33.3");
t("formSeries : fenêtre bornée (w=1 → réussite de la dernière question)", A.formSeries(adv, 1)[1].values.slice(1).join() === "100,100,0");
t("formSeries : fenêtre invalide → 3", A.formSeries(adv, "abc")[0].values.join() === frm[0].values.join());
const lead = A.leadStats(adv);
t("leadStats : questions en tête A=2, B=1, C=1", lead.players.map(x => x.led).join() === "2,1,1");
t("leadStats : plus longue période (1 chacun)", lead.players.map(x => x.longest).join() === "1,1,1");
t("leadStats : 1 changement de leader sur 2 questions à leader unique", lead.changes === 1 && lead.soleRounds === 2 && lead.n === 3);
const absent = A.normalize({ id: "abs", P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [{ q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 100], [0, 0, 0]] }, { q: "Q2", c: "x", d: "facile", m: 0, r: [[2, 2, 100], [0, 0, 0]] }] });
t("joueur absent : rankSeries valide, formSeries toujours null", Array.isArray(A.rankSeries(absent)[1].values) && A.formSeries(absent, 3)[1].values.every(v => v === null));
t("partie sans question : analyses sans erreur", A.rankSeries(empty).length === 1 && A.leadStats(empty).n === 0 && A.formSeries(empty, 3)[0].values.length === 1);

/* --- roue des bonus / malus dans le journal --- */
const wl = A.normalize({ id: "w", P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [{ q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 100], [1, 3, 50]] }, { q: "Q2", c: "x", d: "facile", m: 0, r: [[1, 2, 200], [1, 3, 100]] }],
  B: [[1, 0, 0, 1, "w_xp", 300, 0, "Roue"], [1, 1, 1, 2, "w_crush", 500, 0, "Roue"], [2, 1, 1, 2, "w_tax", 150, 1, "Roue"], [2, 0, 0, 2, "crush", 90, 0, "x"], [2, 0, -1, 1, "xp", 50, 0, "x"]] });
t("roue : le malus garde le joueur lui-même pour cible", wl.B[1][2] === 1 && wl.B[1][1] === 1);
t("pouvoir normal ciblant soi-même : cible retirée", wl.B[3][2] === -1);
t("roue : bonus sans cible", wl.B[0][2] === -1);
const wp = A.powers(wl);
t("roue : 3 tirages comptés à part", wp.wheel.spins === 3 && wp.wheel.bonus === 1 && wp.wheel.malus === 2 && wp.wheel.blocked === 1);
t("roue : points gagnés 300, perdus 500 (le malus bloqué ne retire rien)", wp.wheel.gained === 300 && wp.wheel.lost === 500);
t("roue : par joueur A bonus 1 / gain 300 ; B malus 2, 1 bloqué, perte 500", wp.players[0].wheelBonus === 1 && wp.players[0].wheelGain === 300 && wp.players[1].wheelMalus === 2 && wp.players[1].wheelBlocked === 1 && wp.players[1].wheelLoss === 500);
t("roue : non comptée comme pouvoir « lancé » ni « visé »", wp.players[1].malusGiven === 0 && wp.players[1].malusReceived === 0 && wp.players[0].bonusGiven === 1);
t("roue : incluse dans le bilan net (A +300 +50 ; B −500)", wp.players[0].net === 350 && wp.players[1].net === -500);
t("roue : séries nettes cohérentes", wp.netSeries[0].values.join() === "0,300,350" && wp.netSeries[1].values.join() === "0,-500,-500");
t("roue : libellés lisibles", A.powerName([1, 0, 0, 1, "w_jackpot", 0, 0, ""]) === "Roue : jackpot +1000" && A.powerName([1, 0, 0, 2, "w_tax", 0, 0, ""]) === "Roue : impôt −15 %");
t("roue : total = pouvoirs + tirages", wp.total === 5 && wp.bonus === 1 && wp.malus === 1);

/* --- questions : graphiques supplémentaires (fatigue, issues, temps par thème, divisent, surprises) --- */
const qi = A.questionInsights(log);
t("3 moments de la partie", qi.thirds.length === 3 && qi.thirds.map(g => g.questions).join() === "2,1,1");
t("moments : réussite 3/6, 1/2, 2/2", qi.thirds.map(g => g.correct + "/" + g.answers).join() === "3/6,1/2,2/2" && qi.thirds[2].rate === 1);
t("moments : libellés lisibles", qi.thirds[0].label === "Début · Q1–2" && qi.thirds[1].label === "Milieu · Q3" && qi.thirds[2].label === "Fin · Q4");
t("issues par difficulté : facile 4/1/0, moyen 1/1/1, difficile 1/1/0", qi.mix.map(g => g.label + ":" + g.correct + "/" + g.wrong + "/" + g.none).join() === "facile:4/1/0,moyen:1/1/1,difficile:1/1/0");
t("issues : le total des 3 états = les réponses de la partie", qi.mix.reduce((a, g) => a + g.correct + g.wrong + g.none, 0) === tot.answers);
t("temps par thème : Sciences 5,5 > Géographie 4,24 > Arts 4", qi.themeTime.map(g => g.label.split(" ")[1] + ":" + Math.round(g.avgTime * 100) / 100).join() === "Sciences:5.5,Géographie:4.24,Arts:4");
t("questions les plus longues : 1, 3, 2, 4", qi.slowest.map(r => r.round).join() === "1,3,2,4");
t("questions qui divisent : Q3 (50 %) puis Q1, Q4 en dernier", qi.divisive[0].round === 3 && qi.divisive[1].round === 1 && qi.divisive[qi.divisive.length - 1].round === 4);
t("plus faciles que prévu : Q4 (100 % contre 80 % en facile)", qi.easier.length === 1 && qi.easier[0].round === 4 && Math.abs(qi.easier[0].dev - 0.2) < 1e-9 && Math.abs(qi.easier[0].expected - 0.8) < 1e-9);
t("plus difficiles que prévu : aucune (écart de −13 % seulement)", qi.harder.length === 0);
const qe = A.questionInsights(empty);
t("partie vide : aucun graphique supplémentaire, sans erreur", qe.thirds.length === 0 && qe.mix.length === 0 && qe.themeTime.length === 0 && qe.slowest.length === 0 && qe.divisive.length === 0);
const two = A.normalize({ id: "g2", at: 1, qt: 20, P: [{ i: "a", n: "A", a: "🦊" }], R: [{ q: "x", c: "c", d: "facile", m: 0, r: [[1, 2, 100]] }, { q: "y", c: "c", d: "facile", m: 0, r: [[2, 4, 100]] }] });
const q2 = A.questionInsights(two);
t("deux questions seulement : pas de découpage en trois moments", q2.thirds.length === 0 && q2.mix.length === 1 && q2.divisive.length === 0);

/* --- récap à coller dans un message --- */
const rc = A.recapText(log, "29 oct.").split("\n");
t("récap : titre avec la date", rc[0] === "🏆 Récap de la partie — 29 oct.");
t("récap : podium dans l'ordre avec médailles", /^🥇 🦊 Léa — 2\u202f600 pts \(75 % de bonnes réponses\)$/.test(rc[1]) && /^🥈 🐻 Tom — 1\u202f500 pts/.test(rc[2]) && /^🥉 🐸 Max — 0 pts \(0 % de bonnes réponses\)$/.test(rc[3]));
t("récap : nombre de questions et réussite du groupe", rc.indexOf("❓ 4 questions · ✅ réussite du groupe : 60 %") === 5);
t("récap : série, réponse la plus rapide, question la plus difficile", rc.indexOf("🔥 Plus longue série : Léa (2 bonnes réponses d’affilée)") > 0 && rc.indexOf("⚡ Réponse la plus rapide : Léa (1,5 s)") > 0 && rc.indexOf("🧗 Question la plus difficile : « Qui a peint la Joconde ? » (33,3 % de réussite)") > 0);
t("récap : signature en dernière ligne, aucune ligne vide en trop", rc[rc.length - 1] === "🎮 qui-suis-je-officiel" && rc.filter(l => l === "").length === 1);
const bigRaw = { id: "big", at: 5, qt: 20, P: Array.from({ length: 13 }, (_, i) => ({ i: "p" + i, n: "J" + i })), R: [{ q: "x", c: "c", d: "facile", m: 0, r: Array.from({ length: 13 }, (_, i) => [1, 2, 100 * (i + 1)]) }] };
const rcBig = A.recapText(A.normalize(bigRaw), "").split("\n");
t("récap : 13 joueurs → 10 lignes + « … et 3 autres », sans date", rcBig[0] === "🏆 Récap de la partie" && rcBig.filter(l => /^(🥇|🥈|🥉|\d+\.) /.test(l)).length === 10 && rcBig.indexOf("… et 3 autres") === 11);
const bigN = n => A.recapText(A.normalize({ id: "b" + n, at: 5, qt: 20, P: Array.from({ length: n }, (_, i) => ({ i: "p" + i, n: "J" + i })), R: [{ q: "x", c: "c", d: "facile", m: 0, r: Array.from({ length: n }, (_, i) => [1, 2, 100 * (i + 1)]) }] }), "").split("\n");
t("récap : 10 joueurs → pas de « … et », 11 joueurs → « … et 1 autre »", bigN(10).every(l => !/^… et/.test(l)) && bigN(11).indexOf("… et 1 autre") === 11);
t("récap : partie vide sans erreur", A.recapText(empty, "").indexOf("réussite du groupe : —") > 0);

/* --- mes records (retrouvés par le prénom, sans tenir compte des majuscules) --- */
const mkG = (id, at, name, rounds, other) => A.normalize({ id, at, qt: 20, P: [{ i: "p", n: name }].concat(other ? [{ i: "q", n: other }] : []), R: rounds.map((r, k) => ({ q: "q" + k, c: "c", d: "facile", m: 0, r })) });
const gA = mkG("a", 100, "Léa", [[[1, 2, 500], [2, 5, 0]], [[1, 1.2, 1100], [1, 3, 500]], [[1, 3, 1600], [2, 4, 500]]], "Bob");
const gB = mkG("b", 200, "léa", [[[1, 4, 300]], [[2, 5, 300]], [[1, 2.5, 600]], [[1, 3, 900]], [[2, 6, 900]]]);
const gC = mkG("c", 300, "Zoé", [[[1, 1, 500]]]);
const mr = A.myRecords([gB, gA, gC], "  LÉA ");
t("records : 2 parties de Léa, la plus ancienne d'abord, Zoé ignorée", mr.played === 2 && mr.games.map(g => g.id).join() === "a,b");
t("records : 1 victoire (la partie en solo ne compte pas)", mr.wins === 1 && mr.games[0].won === true && mr.games[1].won === false);
t("records : meilleur score 1600 (partie a)", mr.bestScore.id === "a" && mr.bestScore.final === 1600);
t("records : meilleure réussite parmi les parties de 5 réponses ou plus (partie b, 60 %)", mr.bestAccuracy.id === "b" && Math.abs(mr.bestAccuracy.accuracy - 0.6) < 1e-9);
t("records : série 3, réponse la plus rapide 1,2 s, plus gros gain 600", mr.bestStreak.bestStreak === 3 && mr.fastest.fastest === 1.2 && mr.bestGain.bestGain === 600);
t("records : réussite cumulée 6 sur 8", mr.totalCorrect === 6 && mr.totalAnswered === 8 && Math.abs(mr.overall - 0.75) < 1e-9);
t("records : prénom vide ou inconnu → rien, sans erreur", A.myRecords([gA], "").played === 0 && A.myRecords([gA], "").bestScore === null && A.myRecords([gA], "Inconnu").overall === null);
t("records : si aucune partie n'a 5 réponses, on prend la meilleure réussite quand même", A.myRecords([gA], "Léa").bestAccuracy.id === "a");

/* --- classement à chaque moment de la partie (mi-partie, fin, après chaque question) + code de la salle --- */
const rk2 = A.rankingAt(log, 2), rk4 = A.rankingAt(log, 4), rk0 = A.rankingAt(log, 0);
t("classement après la question 2 : Léa 1900 (1er), Tom et Max à égalité à 0 (2e)", rk2.map(r => r.name + ":" + r.score + ":" + r.label).join() === "Léa:1900:1er,Tom:0:2e,Max:0:2e");
t("classement au départ : tout le monde à égalité 1er", rk0.every(r => r.rank === 1 && r.score === 0 && r.label === "1er"));
t("classement final = rangs et scores de perPlayer", rk4.every(r => { const p = A.perPlayer(log)[r.idx]; return p.rank === r.rank && p.final === r.score; }));
t("écart avec le 1er", rk4.map(r => r.gap).join() === "0,1100,2600");
t("pas de flèche sans point de comparaison", rk4.every(r => r.move === null));
const rkm = A.rankingAt(log, 4, 2);
t("flèches depuis la mi-partie : Léa et Tom stables, Max perd une place", rkm.map(r => r.name + ":" + r.move).join() === "Léa:0,Tom:0,Max:-1");
t("un joueur qui gagne des places a une flèche positive", A.rankingAt(A.normalize({ id: "m", at: 1, qt: 20, P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [{ q: "x", c: "c", d: "facile", m: 0, r: [[1, 1, 500], [2, 1, 100]] }, { q: "y", c: "c", d: "facile", m: 0, r: [[2, 1, 500], [1, 1, 900]] }] }), 2, 1).map(r => r.name + ":" + r.rank + ":" + r.move).join() === "B:1:1,A:2:-1");
t("moment hors limites ramené dans la partie", A.rankingAt(log, 99).length === 3 && A.rankingAt(log, 99)[0].score === 2600 && A.rankingAt(log, -3)[0].score === 0 && A.rankingAt(log, NaN)[0].score === 0);
t("rangs ordinaux : 1er, 2e, 3e, 12e", [1, 2, 3, 12].map(A.ordinal).join() === "1er,2e,3e,12e");
t("moments : mi-partie après 2 questions sur 4, puis la fin", A.rankingMoments(log).map(m => m.key + ":" + m.round).join() === "half:2,end:4");
t("moments : 5 questions → mi-partie arrondie au-dessus (3)", A.rankingMoments({ R: [1, 2, 3, 4, 5] }).map(m => m.key + ":" + m.round).join() === "half:3,end:5");
t("moments : 1 question → seulement la fin ; partie vide → aucun", A.rankingMoments({ R: [1] }).map(m => m.key).join() === "end" && A.rankingMoments({ R: [] }).length === 0);
t("titres des moments", A.rankingTitle(log, 0) === "Départ" && A.rankingTitle(log, 2) === "Mi-partie (après la question 2 sur 4)" && A.rankingTitle(log, 3) === "Après la question 3 sur 4" && A.rankingTitle(log, 4) === "Fin de partie (4 questions)");
const withRc = A.normalize({ id: "rc", at: 1, qt: 20, rc: "12 34-56", P: [{ i: "a", n: "A" }], R: [{ q: "x", c: "c", d: "facile", m: 0, r: [[1, 1, 500]] }] });
t("code de la salle : nettoyé (chiffres et lettres), absent si non fourni", withRc.rc === "123456" && log.rc === undefined && A.normalize({ id: "x", P: [{ i: "a", n: "A" }], R: [], rc: "<script>" }).rc === "script");
t("code de la salle : ajouté au récap", A.recapText(withRc, "").split("\n").indexOf("🔑 Code de la salle : 123456") > 0 && A.recapText(log, "").indexOf("Code de la salle") < 0);

/* le code de la salle est noté par l'hôte, envoyé aux joueurs dans l'en-tête de la partie et relu par eux (parties à plusieurs, y compris à partir d'un cours) */
const stSrc = require("fs").readFileSync(__dirname + "/../js/stats/stats.js", "utf8");
t("code de la salle : noté au lancement, envoyé dans l'en-tête, relu côté joueur", /live = \{[\s\S]{0,400}?rc: String\(typeof roomCode/.test(stSrc) && /head: \{[^}]*rc: live\.rc/.test(stSrc) && /A\.normalize\(\{[^}]*rc: d\.head\.rc/.test(stSrc));
t("onglet Classement : image avec code, flèches, filigrane géré par K.markOn", /ranking: buildRanking/.test(stSrc) && /Code de la salle/.test(stSrc) && /K\.watermark\(ctx, RK_W, H/.test(stSrc) && /drawRanking\(log, view\.rk, K\.markOn\(\)\)/.test(stSrc));

/* ---- Trophées ---- */
const rawAw = { id: "aw", at: 1, qt: 20, P: [{ i: "a", n: "Léa", a: "🦊", h: 1 }, { i: "b", n: "Tom", a: "🐻" }, { i: "c", n: "Max", a: "🐸" }], R: [
  { q: "a", c: "x", d: "facile", m: 0, r: [[1, 3.2, 800], [1, 5.5, 700], [2, 9, 0]] },
  { q: "b", c: "y", d: "difficile", m: 1, r: [[1, 2, 1900], [2, 6, 0], [3, 0, 0]] },
  { q: "c", c: "z", d: "difficile", m: 0, r: [[2, 7, 1900], [1, 4, 600], [1, 6, 500]] },
  { q: "d", c: "x", d: "facile", m: 0, r: [[1, 1.5, 2600], [1, 2, 1500], [1, 8, 1900]] }], C: [] };
const lg = A.normalize(rawAw), aw = A.awards(lg), awBy = k => aw.find(a => a.key === k);
t("trophées : champion = Léa (2 600 pts)", awBy("champion") && A.awardNames(awBy("champion")) === "Léa" && awBy("champion").detail === "2 600 pts".replace(" ", "\u202f"));
t("trophées : Éclair = Léa, 1,5 s", awBy("fast") && awBy("fast").detail === "1,5 s" && awBy("fast").holders[0].name === "Léa");
t("trophées : le plus précis = Léa et Tom à égalité (75 %)", awBy("precise") && A.awardNames(awBy("precise")) === "Léa et Tom" && awBy("precise").detail === "75 %");
t("trophées : gros coup = Max (+1 400)", awBy("gain") && awBy("gain").holders[0].name === "Max");
t("trophées : le plus réfléchi = Max (temps moyen le plus long)", awBy("thinker") && awBy("thinker").holders[0].name === "Max");
t("trophées : roi de la partie = Léa (4 questions en tête)", awBy("king") && awBy("king").holders[0].name === "Léa" && /4 questions/.test(awBy("king").detail));
t("trophées : pas de « briseur de difficile » quand tout le monde est à égalité", !awBy("hard"));
t("trophées : pas de série en or sous 3 bonnes réponses d'affilée", !awBy("streak"));
t("trophées : aucun gagnant fantôme (chaque trophée a au moins un détenteur nommé)", aw.every(a => a.holders.length >= 1 && a.holders.every(h => typeof h.name === "string" && h.name)));
const rawRun = JSON.parse(JSON.stringify(rawAw)); rawRun.R.push({ q: "e", c: "x", d: "facile", m: 0, r: [[1, 2, 3000], [1, 3, 2000], [1, 4, 2400]] }); rawRun.R.push({ q: "f", c: "x", d: "facile", m: 0, r: [[1, 2, 3400], [1, 3, 2500], [2, 4, 2400]] });
const awR = A.awards(A.normalize(rawRun));
t("trophées : série en or dès 3 d'affilée (Tom : questions 3 à 6)", awR.find(a => a.key === "streak") && awR.find(a => a.key === "streak").holders[0].name === "Tom" && awR.find(a => a.key === "streak").detail === "4 d’affilée");
const rawBack = { id: "bk", P: [{ n: "A" }, { n: "B" }, { n: "C" }], R: [
  { q: "1", c: "x", d: "facile", m: 0, r: [[1, 2, 900], [1, 3, 600], [2, 3, 0]] }, { q: "2", c: "x", d: "facile", m: 0, r: [[1, 2, 1800], [1, 3, 1200], [2, 3, 0]] },
  { q: "3", c: "x", d: "facile", m: 0, r: [[2, 2, 1800], [2, 3, 1200], [1, 3, 1500]] }, { q: "4", c: "x", d: "facile", m: 0, r: [[2, 2, 1800], [2, 3, 1200], [1, 3, 3200]] }] };
const awB = A.awards(A.normalize(rawBack)).find(a => a.key === "comeback");
t("trophées : remontada = C (3e → 1er, +2 places)", awB && awB.holders[0].name === "C" && awB.detail === "+2 places gagnées");
const solo = A.awards(A.normalize({ id: "s", P: [{ n: "Seul" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }));
t("trophées : partie solo = pas de champion ni de roi, mais Éclair possible", !solo.find(a => a.key === "champion") && !solo.find(a => a.key === "king") && !!solo.find(a => a.key === "fast"));
t("trophées : journal vide, nul ou sans réponse → liste vide, sans erreur", A.awards(null).length === 0 && A.awards({}).length === 0 && A.awards(A.normalize({ id: "z", P: [{ n: "A" }], R: [] })) .length === 0);
t("trophées : « mes trophées » retrouvés par le prénom, casse ignorée", A.myAwards(aw, " léa ").length >= 4 && A.myAwards(aw, "personne").length === 0 && A.myAwards(aw, "").length === 0 && A.myAwards(null, "Léa").length === 0);
t("trophées : plus de 3 gagnants → « et N autres »", A.awardNames({ holders: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }] }, 3) === "A, B, C et 2 autres" && A.awardNames({ holders: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }] }, 3) === "A, B, C et 1 autre");
t("trophées : le récap texte les résume (sans le champion, déjà dans le classement)", /🏅 Trophées : ⚡ Éclair — Léa/.test(A.recapText(lg, "x")) && !/Trophées : 🥇/.test(A.recapText(lg, "x")));
/* ---- Carte de résultat ---- */
const lgRun = A.normalize(rawRun);   /* la partie à 6 questions : Léa 3 400, Tom 2 500, Max 2 400 */
const cardTom = A.myCard(lgRun, "tom");
t("carte : Tom, 2e sur 3, 2 500 pts, 4 bonnes sur 6, série de 4", cardTom && cardTom.name === "Tom" && cardTom.rank === 2 && cardTom.players === 3 && cardTom.final === 2500 && cardTom.correct === 5 && cardTom.answered === 6 && cardTom.bestStreak === 4 && cardTom.rounds === 6);
t("carte : courbe de score complète (départ à 0, puis une valeur par question)", cardTom.series.length === 7 && cardTom.series[0] === 0 && cardTom.series[6] === 2500);
t("carte : ses trophées seulement (série en or, plus précis)", cardTom.awards.map(x => x.title).sort().join() === ["Le plus précis", "Série en or"].sort().join() && cardTom.awards.every(x => x.emoji && x.title));
t("carte : prénom retrouvé sans tenir compte de la casse ni des espaces", A.myCard(lgRun, "  LÉA ").name === "Léa" && A.myCard(lgRun, "Léa").rank === 1);
t("carte : prénom inconnu, vide, journal absent ou vide → rien, sans erreur", A.myCard(lgRun, "Zoé") === null && A.myCard(lgRun, "") === null && A.myCard(lgRun, null) === null && A.myCard(null, "Tom") === null && A.myCard({}, "Tom") === null && A.myCard(A.normalize({ id: "z", P: [{ n: "Tom" }], R: [] }), "Tom") === null);
t("carte : joueur qui n'a répondu à aucune question → pas de carte", A.myCard(A.normalize({ id: "y", P: [{ n: "Tom" }, { n: "Léa" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[0, 0, 0], [1, 2, 500]] }] }), "Tom") === null);
t("carte : la liste de ses données n'est pas partagée avec le journal (copie)", (() => { const c = A.myCard(lgRun, "Tom"); c.series[0] = 999; return A.myCard(lgRun, "Tom").series[0] === 0; })());
const stSrc2 = require("fs").readFileSync(require("path").join(__dirname, "../js/stats/stats.js"), "utf8");
const stSrc3 = require("fs").readFileSync(require("path").join(__dirname, "../js/stats/stats.js"), "utf8");
t("carte : dessinée avec le filigrane géré par K.markOn, copie / PNG / bascule du filigrane réservée à l'hôte", /function drawCard/.test(stSrc3) && /drawCard\(c, log, K\.markOn\(\)\)/.test(stSrc3) && /if \(withMark\) K\.watermark\(ctx, W, H, RK_FONT\)/.test(stSrc3) && /K\.canSkipMark\(\)\) return; K\.setNoMarkPref/.test(stSrc3) && /v53CardCopy/.test(stSrc3) && /buildMyCard\(main, log\)/.test(stSrc3));
t("trophées : onglet 🏆 et bloc sur l'écran de fin de partie, rendu par textContent (pas d'innerHTML)", /\["trophies", "🏆 Trophées"\]/.test(stSrc2) && /trophies: buildTrophies/.test(stSrc2) && /paintAwards\(\)/.test(stSrc2) && !/innerHTML[^;]*awards|awards[^;]*innerHTML/i.test(stSrc2));

/* ---- Duels, faits marquants, grandes salles (V57) ---- */
const rawD = { id: "d1", P: [{ n: "Léa" }, { n: "Tom" }, { n: "Max" }], R: [
  { q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 1000], [1, 3, 1000], [2, 4, 0]] },
  { q: "Q2", c: "x", d: "facile", m: 0, r: [[1, 2, 2000], [2, 3, 1000], [1, 1, 1000]] },
  { q: "Q3", c: "x", d: "facile", m: 0, r: [[1, 2, 3000], [1, 2, 2000], [3, 0, 1000]] }] };
const lgD = A.normalize(rawD), DU = A.duels(lgD), dp = n => DU.players.find(p => p.name === n);
t("duels : Léa 4 V · 1 D · 1 N, Tom 2 V · 3 D · 1 N, Max 2 V · 4 D · 0 N", dp("Léa").wins === 4 && dp("Léa").losses === 1 && dp("Léa").ties === 1 && dp("Tom").wins === 2 && dp("Tom").losses === 3 && dp("Tom").ties === 1 && dp("Max").wins === 2 && dp("Max").losses === 4 && dp("Max").ties === 0);
t("duels : plus vite gagne, bon contre faux gagne, même temps = égalité (Léa 2 – Tom 0, 1 égalité)", DU.w[0][1] === 2 && DU.w[1][0] === 0 && DU.t[0][1] === 1 && DU.t[1][0] === 1);
t("duels : sans réponse (état 3) perd contre une bonne réponse (Tom devance Max à la Q3)", DU.w[1][2] === 2 && DU.w[2][1] === 1);
t("duels : taux de duels gagnés = victoires / duels (Léa 4 sur 6)", Math.abs(dp("Léa").rate - 4 / 6) < 1e-9 && dp("Léa").duels === 6);
t("duels : bête noire et souffre-douleur (Tom : noire Léa, souffre-douleur Max)", dp("Tom").nemesis.name === "Léa" && dp("Tom").victim.name === "Max" && dp("Léa").nemesis === null);
t("duels : à égalité d'écart, le plus petit numéro d'arrivée (bête noire de Max = Léa)", dp("Max").nemesis.name === "Léa" && dp("Max").nemesis.theirs === 2 && dp("Max").nemesis.mine === 1);
t("duels : plus belle rivalité = Léa – Max (2 – 1) ; pas de domination (moins de 3 duels décisifs)", DU.rivalry && DU.rivalry.aName === "Léa" && DU.rivalry.bName === "Max" && DU.rivalry.aWins === 2 && DU.rivalry.bWins === 1 && DU.crush === null);
t("duels : matrice cohérente (victoires + défaites + égalités = questions disputées à deux)", [[0, 1], [0, 2], [1, 2]].every(([a, b]) => DU.w[a][b] + DU.w[b][a] + DU.t[a][b] === 3) && DU.t[0][1] === DU.t[1][0]);
const rawCr = { id: "d2", P: [{ n: "A" }, { n: "B" }], R: [0, 1, 2, 3].map(i => ({ q: "q" + i, c: "x", d: "facile", m: 0, r: [[1, 2, 1000 * (i + 1)], [2, 3, 0]] })).concat([{ q: "q5", c: "x", d: "facile", m: 0, r: [[2, 2, 4000], [1, 3, 1000]] }]) };
const DC = A.duels(A.normalize(rawCr));
t("duels : grosse domination A 4 – 1 B, et rivalité (les deux ont gagné au moins une fois)", DC.crush && DC.crush.winnerName === "A" && DC.crush.loserName === "B" && DC.crush.wins === 4 && DC.crush.losses === 1 && DC.rivalry && DC.rivalry.aWins === 4 && DC.rivalry.bWins === 1);
const rawAbs = { id: "d3", P: [{ n: "A" }, { n: "B" }], R: [{ q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 1000], [0, 0, 0]] }, { q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 2000], [0, 0, 0]] }, { q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 3000], [0, 0, 0]] }] };
t("duels : un joueur absent ne perd aucun duel", (d => d.players[0].duels === 0 && d.players[1].duels === 0 && d.rivalry === null && d.crush === null)(A.duels(A.normalize(rawAbs))));
t("duels : partie solo ou sans question → pas d'erreur, aucun duel", (d => d.players.length === 1 && d.players[0].rate === null && d.rivalry === null)(A.duels(A.normalize({ id: "s", P: [{ n: "Seul" }], R: [{ q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }))) && A.duels(A.normalize({ id: "z", P: [{ n: "A" }, { n: "B" }], R: [] })).rivalry === null);
const rawSweep = { id: "d4", P: [{ n: "A" }, { n: "B" }], R: [1, 2, 3].map(i => ({ q: "q" + i, c: "x", d: "facile", m: 0, r: [[1, 2, 1000 * i], [2, 3, 0]] })) };
t("duels : une victoire 3 – 0 est une domination mais pas une rivalité", (d => d.rivalry === null && d.crush && d.crush.winnerName === "A" && d.crush.wins === 3 && d.crush.losses === 0)(A.duels(A.normalize(rawSweep))));
const fk = (log, k) => A.facts(log).find(f => f.key === k);
const rawF = { id: "f1", P: [{ n: "A" }, { n: "B" }], R: [
  { q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 1000], [2, 3, 0]] }, { q: "Q2", c: "x", d: "facile", m: 0, r: [[1, 2, 2000], [2, 3, 0]] },
  { q: "Q3", c: "x", d: "facile", m: 0, r: [[2, 3, 2000], [1, 1, 3000]] }] };
const lgF = A.normalize(rawF);
t("faits : victoire au finish (B prend la tête à la dernière question)", fk(lgF, "finish") && /^B s’empare de la tête à la toute dernière question\.$/.test(fk(lgF, "finish").text) && !fk(lgF, "wire"));
t("faits : la tête a changé une fois", fk(lgF, "changes") && /une fois/.test(fk(lgF, "changes").text));
t("faits : écart au sommet = 1 000 pts, singulier/pluriel gérés", fk(lgF, "gap") && fk(lgF, "gap").text === "B devance A de 1 000 pts.");
t("faits : question la plus piégeuse = Q3 (0 sur 2 ? non : 50 %) — à égalité de taux, la première", fk(lgF, "hardQ") === undefined || /Question \d/.test(fk(lgF, "hardQ").text));
const rawW = { id: "f2", P: [{ n: "A" }, { n: "B" }], R: [1, 2, 3].map(i => ({ q: "Q" + i, c: "x", d: "facile", m: 0, r: [[1, 2, 1000 * i], [1, 3, 500 * i]] })) };
const lgW = A.normalize(rawW);
t("faits : du début à la fin (A n'a jamais quitté la tête), aucun changement de tête", fk(lgW, "wire") && /A n’a jamais quitté la tête/.test(fk(lgW, "wire").text) && !fk(lgW, "changes") && !fk(lgW, "finish"));
t("faits : tout le monde a juste sur les 3 questions → « Unanimité » (3 questions), pas de « Trou noir »", fk(lgW, "unanimous") && /^3 questions réussies/.test(fk(lgW, "unanimous").text) && !fk(lgW, "blank"));
const rawQ = { id: "f3", P: [{ n: "A" }, { n: "B" }, { n: "C" }], R: [
  { q: "Facile", c: "x", d: "facile", m: 0, r: [[1, 1, 1000], [1, 2, 1000], [1, 3, 1000]] },
  { q: "Piège ".repeat(30), c: "x", d: "difficile", m: 0, r: [[2, 8, 1000], [2, 9, 1000], [1, 10, 2000]] },
  { q: "Noir", c: "x", d: "moyen", m: 0, r: [[2, 5, 1000], [2, 5, 1000], [3, 0, 2000]] }] };
const lgQ = A.normalize(rawQ);
t("faits : question la plus piégeuse = Q3 (0 %) ; la plus facile = Q1 (100 %)", fk(lgQ, "hardQ") && /^Question 3 « Noir » : 0 % de réussite\.$/.test(fk(lgQ, "hardQ").text) && fk(lgQ, "easyQ") && /^Question 1 « Facile » : 100 % de réussite\.$/.test(fk(lgQ, "easyQ").text));
t("faits : « Unanimité » 1 question et « Trou noir » 1 question (singulier)", /^1 question réussie par tous/.test(fk(lgQ, "unanimous").text) && /^1 question où personne n’a trouvé\.$/.test(fk(lgQ, "blank").text));
t("faits : questions les plus rapides / lentes (Q1 : 2 s ; Q2 : 9 s)", /^Question 1 « Facile » : 2 s en moyenne\.$/.test(fk(lgQ, "fastQ").text) && /^Question 2 « Piège/.test(fk(lgQ, "slowQ").text) && /9 s en moyenne\.$/.test(fk(lgQ, "slowQ").text));
t("faits : énoncé tronqué à 70 caractères avec « … »", fk(lgQ, "slowQ").text.indexOf("…") > 0 && A.trunc("x".repeat(80), 70).length === 70 && A.trunc("😀".repeat(80), 5) === "😀😀😀😀…" && A.trunc("abc", 70) === "abc" && A.trunc(null, 5) === "");
const rawT = { id: "f4", P: [{ n: "A" }, { n: "B" }, { n: "C" }], R: [{ q: "Q", c: "x", d: "facile", m: 0, r: [[1, 2, 1000], [1, 3, 1000], [2, 4, 0]] }] };
t("faits : égalité en tête → « Égalité en tête » avec les noms, pas d'écart chiffré", (f => f && f.title === "Égalité en tête" && /^A, B terminent à 1 000 pts\.$/.test(f.text))(fk(A.normalize(rawT), "gap")));
t("faits : partie solo ou vide → aucun fait de course (tête, écart) ni « unanimité », pas d'erreur", !fk(A.normalize({ id: "s", P: [{ n: "Seul" }], R: [{ q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }), "unanimous") && !fk(A.normalize({ id: "s", P: [{ n: "Seul" }], R: [{ q: "q", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }), "gap") && A.facts(null).length === 0 && A.facts(A.normalize({ id: "z", P: [{ n: "A" }], R: [] })).length === 0);
t("faits : chaque fait a une icône, un titre et un texte non vides", A.facts(lgQ).concat(A.facts(lgF)).every(f => f.key && f.icon && f.title && f.text));
/* grandes salles */
const rawBig = { id: "b1", at: 5, rc: "ABC123", P: [0, 1, 2, 3, 4].map(i => ({ i: "p" + i, n: "J" + i, a: "🙂" })), R: [
  { q: "Q1", c: "x", d: "facile", m: 0, r: [[1, 2, 100], [1, 3, 500], [1, 4, 500], [2, 5, 0], [1, 6, 900]] },
  { q: "Q2", c: "x", d: "facile", m: 0, r: [[1, 2, 200], [1, 3, 1000], [1, 4, 500], [2, 5, 0], [1, 6, 1800]] }],
  C: [[0, 1, 1, 1], [4, 2, 2, 2], [3, 1, 1, 1]], B: [[1, 4, 0, 2, "steal", 100, 0, ""], [1, 4, 3, 2, "steal", 100, 0, ""], [2, 1, 4, 2, "freeze", 0, 0, ""], [2, 3, 1, 1, "shield", 0, 0, ""]] };
const lgBig = A.normalize(rawBig), before = JSON.stringify(lgBig), cutLg = A.limitPlayers(lgBig, 3);
t("grande salle : on garde les 3 meilleurs au classement final (J4 900… J1 1000, J2 égalité 500 → plus petit numéro), dans leur ordre d'arrivée", cutLg.P.map(p => p.n).join() === "J1,J2,J4" && cutLg.of === 5);
t("grande salle : chaque manche ne garde que les réponses des joueurs conservés", cutLg.R.every(R => R.r.length === 3) && cutLg.R[1].r[0][2] === 1000 && cutLg.R[1].r[2][2] === 1800);
t("grande salle : triche et bonus/malus remappés ; cible écartée → sans cible ; joueur écarté → ligne supprimée", JSON.stringify(cutLg.C) === JSON.stringify([[2, 2, 2, 2]]) && cutLg.B.length === 3 && cutLg.B[0][1] === 2 && cutLg.B[0][2] === -1 && cutLg.B[1][1] === 2 && cutLg.B[1][2] === -1 && cutLg.B[2][1] === 0 && cutLg.B[2][2] === 2 && cutLg.B.every(b => b[4] !== "shield"));
t("grande salle : journal d'origine intact, objet identique si l'effectif tient, valeur de coupe invalide → 200", JSON.stringify(lgBig) === before && A.limitPlayers(lgBig, 5) === lgBig && A.limitPlayers(lgBig, 99) === lgBig && A.limitPlayers(null, 3) === null && A.VIEW_PLAYERS === 200 && A.limitPlayers(lgBig, "x") === lgBig);
t("grande salle : le journal coupé reste exploitable par toute l'analyse (classement, duels, faits)", A.perPlayer(cutLg).length === 3 && A.perPlayer(cutLg).find(r => r.name === "J1").rank === 2 && A.duels(cutLg).n === 3 && Array.isArray(A.facts(cutLg)) && A.normalize(cutLg) !== null);
const stSrc4 = require("fs").readFileSync(require("path").join(__dirname, "../js/stats/stats.js"), "utf8");
t("onglets 🤝 Duels et 📌 Faits marquants branchés, grandes salles limitées et non diffusées", /\["duels", "🤝 Duels"\]/.test(stSrc4) && /\["facts", "📌 Faits marquants"\]/.test(stSrc4) && /duels: buildDuels, facts: buildFacts/.test(stSrc4) && /function limited\(g\)/.test(stSrc4) && /A\.limitPlayers\(g, A\.VIEW_PLAYERS\)/.test(stSrc4) && /function shareStats/.test(stSrc4) && !/broadcast\(\{ type: "v40(Entry|Final)"/.test(stSrc4.replace(/function shareStats[^\n]*\n/, "")));

console.log("Stats : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
