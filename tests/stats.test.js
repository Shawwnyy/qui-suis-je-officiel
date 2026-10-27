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
t("trop de joueurs refusé", A.normalize({ P: new Array(61).fill({ i: "a", n: "A" }), R: [] }) === null);
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

console.log("Stats : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
