/* Justifications des réponses et préparation de la voix off. Lancer : node tests/justif.test.js */
const J = require("../js/justif/justif.js");
const V = require("../js/voice/voice.js");
let ok = 0, ko = 0;
function t(label, cond, info) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label, info === undefined ? "" : JSON.stringify(info)); } }

/* --- phrases affirmatives (une règle par forme de question) --- */
const S = [
  ["Quelle est la capitale de la France ?", "Paris", "La capitale de la France est Paris."],
  ["Quelle est la capitale du Japon ?", "Tokyo", "La capitale du Japon est Tokyo."],
  ["Quelle est la capitale d'Italie ?", "Rome", "La capitale d'Italie est Rome."],
  ["Quelle est la capitale de l'Australie ?", "Canberra", "La capitale de l'Australie est Canberra."],
  ["Quel est le plus grand océan ?", "Le Pacifique", "Le plus grand océan est Le Pacifique."],
  ["Quel est le symbole chimique de l'or ?", "Au", "Le symbole chimique de l'or est Au."],
  ["Quelle est la planète la plus proche du Soleil ?", "Mercure", "La planète la plus proche du Soleil est Mercure."],
  ["Quelle est l'unité de la force ?", "Le newton", "L'unité de la force est Le newton."],
  ["Qui a peint la Joconde ?", "Léonard de Vinci", "Léonard de Vinci a peint la Joconde."],
  ["Qui est l'auteur de Les Misérables ?", "Victor Hugo", "Victor Hugo est l'auteur de Les Misérables."],
  ["Qui était le premier président de la Ve République ?", "Charles de Gaulle", "Charles de Gaulle était le premier président de la Ve République."],
  ["Comment s'appelle le plus grand désert chaud ?", "Le Sahara", "Le plus grand désert chaud s'appelle Le Sahara."],
  ["Quels sont les deux gaz principaux de l'air ?", "Azote et oxygène", "Les deux gaz principaux de l'air sont Azote et oxygène."]
];
S.forEach(([q, a, want]) => t("phrase : " + q, J.sentence(q, a) === want, J.sentence(q, a)));
["En quelle année la France a-t-elle aboli l'esclavage ?", "Combien de côtés a un hexagone ?", "Où se trouve la tour Eiffel ?", "Quel animal produit la perle ?", "", "x".repeat(300) + " ?"]
  .forEach(q => t("forme non reconnue → pas de phrase inventée : " + q.slice(0, 40), J.sentence(q, "Réponse") === ""));

/* --- explain() : bonne réponse, fausse, sans réponse --- */
const Q = { question: "Quelle est la capitale de la France ?", answers: ["Lyon", "Paris", "Marseille", "Lille"], correct: 1, difficulty: "facile", correction: "La bonne réponse est « Paris ». Cette correction permet de retenir la notion du thème Géographie." };
const good = J.explain(Q, { mine: 1, correct: 1, time: 3.24 });
t("bonne réponse : ton et titre", good.tone === "good" && /Bonne réponse/.test(good.headline) && /3,2 s/.test(good.headline), good.headline);
t("bonne réponse : phrase affirmative + pas de « pourquoi »", good.lines.some(l => l.k === "sentence") && !good.lines.some(l => l.k === "why"));
t("correction générique ignorée (boilerplate)", !good.lines.some(l => /permet de retenir/.test(l.t)) && J.specificCorrection(Q) === "");
const bad = J.explain(Q, { mine: 0, correct: 1 });
t("mauvaise réponse : rappelle la réponse choisie et la bonne", bad.tone === "bad" && /« Lyon »/.test(bad.headline) && bad.lines[0].t.includes("« Paris »"), bad);
t("mauvaise réponse : ligne « pourquoi »", bad.lines.some(l => l.k === "why" && /Lyon/.test(l.t)));
const none = J.explain(Q, { mine: null, correct: 1 });
t("sans réponse : temps écoulé, pas de « pourquoi »", none.tone === "none" && /Temps écoulé/.test(none.headline) && !none.lines.some(l => l.k === "why"));
const mixed = J.explain(Q, { mine: -1, correct: 1 });
t("réponse -1 = sans réponse", mixed.tone === "none");

/* écarts chiffrés */
const Y = { question: "En quelle année a eu lieu la prise de la Bastille ?", answers: ["1789", "1792", "1799", "1804"], correct: 0, difficulty: "moyen", correction: "Le 14 juillet 1789, le peuple de Paris prend la forteresse." };
const y = J.explain(Y, { mine: 1, correct: 0 });
t("années : « 3 ans trop tard »", y.lines.some(l => l.k === "why" && /3 ans trop tard/.test(l.t)), y.lines);
t("explication propre à la question conservée", y.lines.some(l => l.k === "explain" && /14 juillet 1789/.test(l.t)));
t("sans phrase affirmative, l'explication remplace « À retenir »", !y.lines.some(l => l.k === "remember"));
const y2 = J.explain({ question: "En quelle année est tombé le mur de Berlin ?", answers: ["1989", "1961", "1991", "1979"], correct: 0 }, { mine: 1, correct: 0 });
t("années : « 28 ans trop tôt » + « À retenir » quand rien d'autre", y2.lines.some(l => /28 ans trop tôt/.test(l.t)) && y2.lines.some(l => l.k === "remember"), y2.lines);
const n = J.explain({ question: "Combien de côtés a un hexagone ?", answers: ["5", "6", "7", "8"], correct: 1 }, { mine: 3, correct: 1 });
t("nombres : « trop haute de 2 »", n.lines.some(l => /trop haute de 2/.test(l.t)), n.lines);
t("nombres avec unité et virgule", J.num("3,5 %") === 3.5 && J.num("1 789") === 1789 && J.num("Paris") === null && J.num("12 km") === 12 && J.num("−4") === -4);
t("pas d'écart si égal ou non numérique", J.gap("5", "5", "x") === "" && J.gap("Lyon", "Paris", "x") === "");
const hard = J.explain(Object.assign({}, Q, { difficulty: "impossible" }), { mine: 0, correct: 1 });
t("question impossible ratée : encouragement", hard.lines.some(l => l.k === "bonus" && /impossible/.test(l.t)));

/* --- « bonne réponse d'une autre question » (confusion) --- */
const BANK = [
  { category: "Histoire", question: "Quel roi français est surnommé le Roi-Soleil ?", answers: ["Louis XIV", "Henri IV", "Louis XVI", "François Ier"], correct: 0 },
  { category: "Histoire", question: "Quel roi de France a signé l'édit de Nantes ?", answers: ["Henri IV", "Louis XIII", "Charles IX", "Louis XIV"], correct: 0 },
  { category: "Histoire", question: "Quel roi a été guillotiné en 1793 ?", answers: ["Louis XVI", "Louis XV", "Henri IV", "Charles X"], correct: 0 },
  { category: "Animaux", question: "Quel est cet animal ?", answers: ["Un loup", "Un renard", "Un chien", "Un chat"], correct: 0, media: { type: "svg", svg: "x" } },
  { category: "Animaux", question: "Quel animal est le meilleur ami de l'homme ?", answers: ["Un loup", "Un chien", "Un chat", "Un cheval"], correct: 1 },
  { category: "Maths", question: "Combien font 2 + 2 ?", answers: ["4", "3", "5", "6"], correct: 0 },
  { category: "X", question: "Réponse oui ?", answers: ["Oui", "Non", "Peut-être", "Jamais"], correct: 0 }
];
const IDX = J.buildIndex(BANK);
const RQ = BANK[0];
t("index : Henri IV → question de l'édit de Nantes (même thème)", J.related(IDX, "Henri IV", RQ) === "Quel roi de France a signé l'édit de Nantes ?", J.related(IDX, "Henri IV", RQ));
t("index : la question elle-même n'est jamais citée", J.related(IDX, "Louis XIV", RQ) === "");
t("index : question illustrée ignorée", J.related(IDX, "Un loup", BANK[4]) === "");
t("index : réponses trop courtes ou génériques ignorées", J.related(IDX, "4", BANK[0]) === "" && J.related(IDX, "Oui", BANK[0]) === "");
t("index : sans index ou réponse inconnue → rien", J.related(null, "Henri IV", RQ) === "" && J.related(IDX, "Zeus", RQ) === "");
const conf = J.explain(RQ, { mine: 1, correct: 0, index: IDX });
t("explain : ligne « confusion » pour une mauvaise réponse", conf.lines.some(l => l.k === "related" && /Henri IV/.test(l.t) && /édit de Nantes/.test(l.t)), conf.lines);
t("explain : pas de « confusion » pour une bonne réponse", !J.explain(RQ, { mine: 0, correct: 0, index: IDX }).lines.some(l => l.k === "related"));
t("l'index ne dépasse pas 6 questions par réponse", (() => { const b = []; for (let i = 0; i < 20; i++) b.push({ question: "Question " + i + " ?", answers: ["Paris", "b", "c", "d"], correct: 0 }); return J.buildIndex(b)["paris"].length === 6; })());

/* --- statistiques de la manche --- */
const log = { P: [{ i: "a", n: "Léa" }, { i: "b", n: "Tom" }, { i: "c", n: "Max" }, { i: "d", n: "Zoé" }], R: [{ r: [[2, 4, 0], [2, 4, 0], [2, 4, 0], [2, 4, 0]] }, { r: [[1, 3.2, 800], [1, 5.5, 700], [2, 9, 0], [3, 0, 0]] }] };
const st = J.roundStats(log, "b");
t("stats : 2 bonnes réponses sur 4 joueurs, plus rapide = Léa 3,2 s", st.good === 2 && st.players === 4 && st.best.name === "Léa" && st.best.t === 3.2, st);
t("stats : moi = Tom, plus lent qu'un joueur", st.mineState === 1 && st.mineTime === 5.5 && st.slower === 0);
const exS = J.explain(Q, { mine: 1, correct: 1, stats: st, time: 5.5 });
t("explain avec stats : ligne de classement de la manche", exS.lines.some(l => l.k === "stats" && /2 joueurs ont trouvé la bonne réponse sur 4 \(50 %\)/.test(l.t) && /Léa en 3,2 s/.test(l.t)), exS.lines);
t("stats absentes / invalides → null sans erreur", J.roundStats(null, "a") === null && J.roundStats({ P: [], R: [] }, "a") === null && J.roundStats({ P: [{ i: "a" }], R: [{ r: "x" }] }, "a") === null);

/* --- sécurité du HTML --- */
const evil = J.explain({ question: "<img src=x onerror=alert(1)> ?", answers: ["<script>alert(1)</script>", "b", "c", "d"], correct: 0, correction: "<b onmouseover=x>gras</b>" }, { mine: 1, correct: 0 });
const h = J.html(evil);
t("HTML : aucune balise injectée", !/<script|<img|<b /i.test(h) && /&lt;script&gt;/.test(h), h);

/* --- voix off : préparation du texte --- */
t("emojis retirés", V.prepare("🦁 Quel animal est le roi de la savane ? 🌍") === "Quel animal est le roi de la savane ?", V.prepare("🦁 Quel animal est le roi de la savane ? 🌍"));
t("symboles dits en toutes lettres", V.prepare("Combien font 6 × 7 ?") === "Combien font 6 fois 7 ?" && V.prepare("10 % de 50 ?") === "10 pour cent de 50 ?" && V.prepare("Calcule 5 − 3 et 2 + 2") === "Calcule 5 moins 3 et 2 plus 2");
t("balises HTML et guillemets retirés", V.prepare("<b>Qui</b> a dit « Cogito » ?") === "Qui a dit Cogito ?");
t("texte très long tronqué", V.prepare("a ".repeat(500)).length <= 400);
t("valeurs vides", V.prepare(null) === "" && V.prepare(undefined) === "" && V.prepare("🦁🦁") === "");
const sc = V.questionScript(Q, { answers: false });
t("script : la question seule par défaut", sc.length === 1 && sc[0] === "Quelle est la capitale de la France ?");
const sa = V.questionScript(Q, { answers: true });
t("script avec réponses : « Réponse A : Lyon »… (4 réponses)", sa.length === 5 && sa[1] === "Réponse A : Lyon" && sa[4] === "Réponse D : Lille", sa);
t("script : question vide → rien", V.questionScript({ question: "  ", answers: ["a"] }, { answers: true }).length === 0 && V.questionScript(null, {}).length === 0);
t("Node : synthèse vocale absente = pas d'erreur", V.supported === false && V.readQuestion(Q) === false && V.readExplanation("x") === false);

console.log("Justifications et voix off : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
