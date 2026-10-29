/* ✨ Outils de l'hôte : questions jamais jouées, difficulté progressive, thèmes favoris (js/patches/051-v58-extras.js)   node tests/extras.test.js */
const V = require("../js/patches/051-v58-extras.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const Q = (c, q, d) => ({ category: c, question: q, difficulty: d || "facile" });

/* ---- clé d'une question ---- */
const k1 = V.qKey(Q("A", "Quelle est la capitale ?"));
t("qKey : texte court en base 36, stable", /^[0-9a-z]{1,8}$/.test(k1) && k1 === V.qKey(Q("A", "Quelle est la capitale ?")));
t("qKey : change avec le thème ou avec l'énoncé", k1 !== V.qKey(Q("B", "Quelle est la capitale ?")) && k1 !== V.qKey(Q("A", "Quelle est la capitale ??")));
t("qKey : la difficulté et les réponses ne comptent pas", V.qKey({ category: "A", question: "x", difficulty: "facile", answers: [1] }) === V.qKey({ category: "A", question: "x", difficulty: "difficile" }));
t("qKey : thème / énoncé collés ne se confondent pas (« ab »+« c » ≠ « a »+« bc »)", V.qKey(Q("ab", "c")) !== V.qKey(Q("a", "bc")));
t("qKey : objet vide ou valeur invalide → chaîne vide, sans erreur", V.qKey(null) === "" && V.qKey("x") === "" && V.qKey(undefined) === "" && /^[0-9a-z]+$/.test(V.qKey({})));
t("qKey : 1 000 questions différentes → au moins 995 clés distinctes", new Set(Array.from({ length: 1000 }, (_, i) => V.qKey(Q("T", "Question numéro " + i)))).size >= 995);

/* ---- mémoire des questions jouées ---- */
t("cleanSeen : garde les clés valides, sans doublon, dans l'ordre", V.cleanSeen(["a1", "b2", "a1", "ZZ", "", 5, null, "ok-", "x".repeat(9), "z9"]).join() === "a1,b2,z9");
t("cleanSeen : autre type que liste → vide", [null, undefined, "abc", 3, {}].every(v => V.cleanSeen(v).length === 0));
const big = Array.from({ length: V.CAP_SEEN + 500 }, (_, i) => (i + 1000).toString(36));
t("cleanSeen : plafonné aux plus récentes", V.cleanSeen(big).length === V.CAP_SEEN && V.cleanSeen(big)[V.CAP_SEEN - 1] === big[big.length - 1] && V.cleanSeen(big)[0] === big[500]);
const a1 = V.addSeen(["a1", "b2"], ["b2", "c3", "c3", "!!", 7]);
t("addSeen : n'ajoute que les nouvelles, à la fin, et les compte", a1.list.join() === "a1,b2,c3" && a1.added === 1);
t("addSeen : rien à ajouter → 0, liste identique", V.addSeen(["a1"], ["a1"]).added === 0 && V.addSeen(["a1"], null).list.join() === "a1");
t("addSeen : liste de départ abîmée → nettoyée", V.addSeen(["a1", "a1", 3], ["b2"]).list.join() === "a1,b2");
t("addSeen : dépassement → les plus anciennes sortent", (function () { const r = V.addSeen(big.slice(0, V.CAP_SEEN), ["zz1", "zz2"]); return r.list.length === V.CAP_SEEN && r.list[r.list.length - 1] === "zz2" && r.list[0] === big[2]; })());

/* ---- tirage ---- */
const pool = Array.from({ length: 10 }, (_, i) => Q("T", "q" + i));
const seen = pool.slice(0, 6).map(V.qKey);
t("countFresh : jamais jouées / total", (function () { const c = V.countFresh(pool, seen); return c.fresh === 4 && c.total === 10; })());
t("countFresh : rien de joué → tout est nouveau ; lot vide ou invalide", V.countFresh(pool, []).fresh === 10 && V.countFresh([], seen).total === 0 && V.countFresh(null, null).total === 0);
t("pickPool : option éteinte → tout le lot, mode « off »", (function () { const r = V.pickPool(pool, seen, 3, false); return r.pool === pool && r.mode === "off" && r.fresh === null && r.total === 10; })());
t("pickPool : assez de nouvelles (4 pour 3 questions) → seulement les nouvelles", (function () { const r = V.pickPool(pool, seen, 3, true); return r.mode === "fresh" && r.pool.length === 4 && r.pool.every(q => !seen.includes(V.qKey(q))); })());
t("pickPool : juste assez (4 pour 4) → nouvelles seulement", V.pickPool(pool, seen, 4, true).mode === "fresh");
t("pickPool : pas assez (4 pour 5) → tout le lot, mode « all », nombre de nouvelles annoncé", (function () { const r = V.pickPool(pool, seen, 5, true); return r.mode === "all" && r.pool === pool && r.fresh === 4; })());
t("pickPool : plus de questions demandées que le lot (marathon 999) → tout le lot sauf si tout est nouveau", V.pickPool(pool, seen, 999, true).mode === "all" && V.pickPool(pool, [], 999, true).mode === "fresh");
t("pickPool : nombre demandé absurde (NaN, 0, négatif) → au moins 1 question", ["x", 0, -4, NaN, null].every(n => V.pickPool(pool, seen, n, true).mode === "fresh"));
t("pickPool : lot vide ou invalide sans erreur", V.pickPool([], seen, 3, true).pool.length === 0 && V.pickPool(null, seen, 3, true).pool.length === 0);
t("pickPool : tout est déjà joué → tout le lot (la partie reste jouable)", V.pickPool(pool, pool.map(V.qKey), 3, true).pool.length === 10);

/* ---- difficulté progressive ---- */
const mixed = [Q("T", "a", "difficile"), Q("T", "b", "facile"), Q("T", "c", "impossible"), Q("T", "d", "moyen"), Q("T", "e", "facile"), Q("T", "f", "difficile"), Q("T", "g", "moyen")];
const sorted = V.byDifficulty(mixed);
t("byDifficulty : du plus facile à l'impossible", sorted.map(q => q.difficulty).join() === "facile,facile,moyen,moyen,difficile,difficile,impossible");
t("byDifficulty : stable (l'ordre d'origine est gardé dans un niveau)", sorted.map(q => q.question).join("") === "bedgafc");
t("byDifficulty : ne modifie pas la liste d'origine, garde les mêmes objets", mixed[0].question === "a" && sorted.every(q => mixed.includes(q)) && sorted.length === mixed.length);
t("byDifficulty : difficulté inconnue ou absente → comme « moyen »", V.byDifficulty([Q("T", "x", "difficile"), { category: "T", question: "y" }, Q("T", "z", "facile")]).map(q => q.question).join("") === "zyx");
t("byDifficulty : liste invalide ou vide", V.byDifficulty(null).length === 0 && V.byDifficulty([]).length === 0 && V.byDifficulty([null, Q("T", "x", "facile")]).length === 2);

const deck = [Q("T", "a", "difficile"), Q("T", "b", "facile"), Q("T", "c", "moyen"), Q("T", "d", "facile"), Q("T", "e", "impossible"), Q("T", "f", "facile")];
const ph = V.progressiveHead(deck, 4);
t("progressiveHead : les 4 premières sont rangées, le reste est gardé tel quel à la suite", ph.slice(0, 4).map(q => q.question).join("") === "bdca" && ph.slice(4).map(q => q.question).join("") === "ef" && ph.length === 6);
t("progressiveHead : n plus grand que la liste → tout est rangé ; n nul ou invalide → ordre inchangé", V.progressiveHead(deck, 99).map(q => q.difficulty[0]).join("") === "fffmdi" && ["x", 0, -3, NaN, null].every(n => V.progressiveHead(deck, n).map(q => q.question).join("") === "abcdef") && V.progressiveHead(null, 3).length === 0);
t("progressiveHead : n décimal arrondi vers le bas", V.progressiveHead(deck, 3.9).slice(0, 3).map(q => q.question).join("") === "bca");
t("looksLikeQuestions : vrai pour des questions, faux pour des paires réponse / ok ou une liste trop courte", V.looksLikeQuestions(deck) && !V.looksLikeQuestions([{ answer: "x", ok: true }, { answer: "y", ok: false }]) && !V.looksLikeQuestions([deck[0]]) && !V.looksLikeQuestions(null) && !V.looksLikeQuestions([deck[0], null]) && !V.looksLikeQuestions([deck[0], { category: "T", question: "z" }]));

/* ---- favoris et inversion ---- */
t("cleanFavs : textes valides sans doublon", V.cleanFavs(["a", "b", "a", "", 3, null, "c"]).join() === "a,b,c");
t("cleanFavs : ne garde que les thèmes qui existent encore", V.cleanFavs(["a", "x", "c"], ["a", "b", "c"]).join() === "a,c");
t("cleanFavs : trop long refusé, plafonné, type invalide → vide", V.cleanFavs(["x".repeat(121), "ok"]).join() === "ok" && V.cleanFavs(Array.from({ length: 400 }, (_, i) => "t" + i)).length === V.CAP_FAVS && V.cleanFavs("abc").length === 0 && V.cleanFavs(null).length === 0);
t("invert : les thèmes non cochés, dans l'ordre", V.invert(["a", "b", "c", "d"], ["b", "d"]).join() === "a,c");
t("invert : rien de coché → tout ; tout coché → rien ; entrées invalides", V.invert(["a", "b"], []).join() === "a,b" && V.invert(["a", "b"], ["a", "b"]).length === 0 && V.invert(null, null).length === 0 && V.invert(["a"], null).join() === "a");
t("invert deux fois = sélection d'origine", V.invert(["a", "b", "c", "d"], V.invert(["a", "b", "c", "d"], ["b", "d"])).join() === "b,d");

/* ---- options mémorisées ---- */
t("cleanOpts : seulement des booléens vrais sont gardés", (function () { const o = V.cleanOpts({ fresh: true, prog: "oui" }); return o.fresh === true && o.prog === false; })());
t("cleanOpts : autre type → tout éteint", [null, undefined, [], "x", 3].every(v => { const o = V.cleanOpts(v); return o.fresh === false && o.prog === false; }));

/* ---- la colle navigateur est bien branchée ---- */
const fs = require("fs"), path = require("path"), idx = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
t("index.html charge le module après la config et sa feuille de style", idx.indexOf("051-v58-extras.js") > idx.indexOf("050-v57-config.js") && idx.includes("css/v58.css"));
console.log("Outils de l'hôte : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
