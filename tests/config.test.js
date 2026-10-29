/* 📋 Écran de configuration : résumé, difficulté, code de config, réparation (js/patches/050-v57-config.js)   node tests/config.test.js */
const V = require("../js/patches/050-v57-config.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const ALL = ["facile", "moyen", "difficile", "impossible"], NB = " ";

/* ---- difficultés ---- */
t("4 difficultés dans l'ordre du jeu, avec nom et pastille distincts", V.DIFFS.map(d => d[0]).join() === ALL.join() && new Set(V.DIFFS.map(d => d[1])).size === 4);
t("cleanDiffs : valeurs valides gardées dans l'ordre du jeu, sans doublon", V.cleanDiffs(["difficile", "facile", "facile"]).join() === "facile,difficile");
t("cleanDiffs : vide, inconnu, null ou autre type → toutes", [[], ["x"], null, undefined, "facile", 5, {}].every(v => V.cleanDiffs(v).join() === ALL.join()));
t("isAll : vrai seulement pour les quatre", V.isAll(ALL) && V.isAll(null) && !V.isAll(["facile"]) && !V.isAll(["facile", "moyen", "difficile"]));
t("toggleDiff : de « toutes » à seulement celle-ci", V.toggleDiff(ALL, "moyen").join() === "moyen");
t("toggleDiff : ajoute puis retire ; retirer la dernière → toutes", V.toggleDiff(["moyen"], "facile").join() === "facile,moyen" && V.toggleDiff(["facile", "moyen"], "moyen").join() === "facile" && V.toggleDiff(["facile"], "facile").join() === ALL.join());
t("toggleDiff : identifiant inconnu ignoré", V.toggleDiff(["facile"], "zzz").join() === "facile" && V.toggleDiff(ALL, "zzz").join() === ALL.join());
const pool = [{ difficulty: "facile", id: 1 }, { difficulty: "moyen", id: 2 }, { difficulty: "difficile", id: 3 }, { difficulty: "impossible", id: 4 }, { difficulty: "bizarre", id: 5 }, { id: 6 }, null];
t("filterPool : toutes les difficultés → même tableau, rien de retiré", (r => r.pool === pool && !r.fellBack)(V.filterPool(pool, ALL)) && V.filterPool(pool, null).pool === pool);
t("filterPool : seulement « difficile » ; les difficultés inconnues et absentes passent toujours", V.filterPool(pool, ["difficile"]).pool.map(q => q && q.id).join() === "3,5,6,");
t("filterPool : facile + moyen", V.filterPool(pool, ["facile", "moyen"]).pool.filter(q => q && q.id <= 2).length === 2 && !V.filterPool(pool, ["facile", "moyen"]).pool.some(q => q && (q.id === 3 || q.id === 4)));
t("filterPool : rien ne reste → on garde tout et on le signale", (r => r.pool.length === 2 && r.fellBack)(V.filterPool([{ difficulty: "facile" }, { difficulty: "moyen" }], ["impossible"])));
t("filterPool : entrée invalide → liste vide, sans erreur", V.filterPool(null, ["facile"]).pool.length === 0 && V.filterPool("x", null).pool.length === 0);
t("filterPool : le tableau d'origine n'est pas modifié", (() => { const p = [{ difficulty: "facile" }, { difficulty: "moyen" }]; V.filterPool(p, ["facile"]); return p.length === 2; })());

/* ---- questions disponibles ---- */
const Qs = [{ category: "A", difficulty: "facile" }, { category: "A", difficulty: "facile" }, { category: "A", difficulty: "moyen" }, { category: "B", difficulty: "difficile" }, { category: "B", difficulty: "zzz" }, { category: "C", difficulty: "impossible" }];
const tally = V.tallyQuestions(Qs);
t("tally : questions comptées par catégorie et difficulté (inconnue = « autre »)", tally.A.facile === 2 && tally.A.moyen === 1 && tally.B.difficile === 1 && tally.B.autre === 1 && tally.C.impossible === 1);
t("tally : filtre de traduction appliqué question par question", (x => x.A && x.A.facile === 1 && !x.B)(V.tallyQuestions(Qs, q => q.category === "A" && q !== Qs[0])));
t("tally : entrée invalide → table vide", Object.keys(V.tallyQuestions(null)).length === 0 && Object.keys(V.tallyQuestions([null, undefined])).length === 0);
t("countPool : toutes difficultés", V.countPool(tally, ["A", "B"], ALL) === 5 && V.countPool(tally, ["A"], null) === 3);
t("countPool : difficulté choisie (les « autre » comptent toujours)", V.countPool(tally, ["A", "B"], ["facile"]) === 3 && V.countPool(tally, ["B"], ["moyen"]) === 1 && V.countPool(tally, ["C"], ["facile"]) === 0);
t("countPool : thème inconnu ou en double ignoré, aucun thème → 0", V.countPool(tally, ["A", "A", "Z"], ALL) === 3 && V.countPool(tally, [], ALL) === 0 && V.countPool(tally, null, ALL) === 0 && V.countPool(null, ["A"], ALL) === 0);
t("countPool : cohérent avec filterPool sur la même liste", ["facile", "moyen"].length && V.countPool(tally, ["A", "B", "C"], ["facile", "moyen"]) === V.filterPool(Qs, ["facile", "moyen"]).pool.length);

/* ---- durée estimée ---- */
t("fmtDuration : minutes, heures, arrondi", V.fmtDuration(0) === "moins d’1 min" && V.fmtDuration(29) === "moins d’1 min" && V.fmtDuration(30) === "1 min" && V.fmtDuration(300) === "5 min" && V.fmtDuration(3540) === "59 min" && V.fmtDuration(3600) === "1 h" && V.fmtDuration(3900) === "1 h 05" && V.fmtDuration(7500) === "2 h 05" && V.fmtDuration(-5) === "moins d’1 min" && V.fmtDuration("x") === "moins d’1 min");
t("estimate : 10 questions × (20 s + 6 s) = 260 s ≈ 4 min", (e => e.seconds === 260 && e.label === "4 min" && e.played === 10 && !e.short && V.OVERHEAD === 6)(V.estimate(10, 20, 500)));
t("estimate : jamais plus de questions qu'il n'en existe (15 demandées, 8 dispo)", (e => e.played === 8 && e.short && e.seconds === 8 * 26)(V.estimate(15, 20, 8)));
t("estimate : marathon (999) = toutes les questions disponibles jusqu'à 999, jamais « raccourcie »", (e => e.played === 120 && e.marathon && !e.short)(V.estimate(999, 10, 120)) && V.estimate(999, 10, 0).played === 0 && V.estimate(999, 10, 2660).played === 999 && V.estimate(999, 10, 2660).seconds === 999 * 16);
t("estimate : valeurs aberrantes ramenées (10 questions, 20 s) et pool inconnu = nombre demandé", (e => e.asked === 10 && e.time === 20 && e.played === 10)(V.estimate("x", null)) && V.estimate(-3, 0, 100).asked === 1 && V.estimate(5000, 9999, 100).time === 600);

/* ---- résumé ---- */
const key = (lines, k) => lines.find(l => l.key === k);
const sm = V.summary({ rounds: 10, time: 20, themes: 18, pool: 2660, diffs: ALL, lang: "fr" });
t("résumé : durée, questions et thèmes, sans avertissement", key(sm, "time").text === "⏱️ ≈ 4 min · 10 questions × 20 s" && key(sm, "pool").text === "📚 2" + NB + "660 questions dans 18 thèmes" && sm.every(l => !l.warn) && !key(sm, "diffs") && !key(sm, "lang"));
t("résumé : singuliers (1 question, 1 thème)", key(V.summary({ rounds: 1, time: 20, themes: 1, pool: 1 }), "time").text === "⏱️ moins d’1 min · 1 question × 20 s" && key(V.summary({ rounds: 5, time: 20, themes: 1, pool: 50 }), "time").text === "⏱️ ≈ 2 min · 5 questions × 20 s" && key(V.summary({ rounds: 1, time: 20, themes: 1, pool: 1 }), "pool").text === "📚 1 question dans 1 thème");
t("résumé : aucun thème → un seul avertissement", (l => l.length === 1 && l[0].warn && l[0].key === "themes")(V.summary({ rounds: 10, time: 20, themes: 0, pool: 0 })));
t("résumé : thèmes cochés mais aucune question → avertissement langue / difficulté", (l => l.length === 1 && l[0].warn && l[0].key === "pool")(V.summary({ rounds: 10, time: 20, themes: 3, pool: 0 })));
t("résumé : moins de questions que demandé → avertissement chiffré", (l => key(l, "short").warn && /Seulement 8 questions disponibles : la partie sera limitée à 8\./.test(key(l, "short").text))(V.summary({ rounds: 15, time: 20, themes: 2, pool: 8 })) && /Seulement 1 question disponible :/.test(key(V.summary({ rounds: 15, time: 20, themes: 1, pool: 1 }), "short").text));
t("résumé : marathon → « toutes les N questions » (999 au plus), pas d'avertissement", (l => /toutes les 120 questions/.test(key(l, "time").text) && !key(l, "short"))(V.summary({ rounds: 999, time: 10, themes: 2, pool: 120 })) && /· 999 questions × 10 s$/.test(key(V.summary({ rounds: 999, time: 10, themes: 2, pool: 2660 }), "time").text) && !/toutes/.test(key(V.summary({ rounds: 999, time: 10, themes: 2, pool: 2660 }), "time").text));
t("résumé : difficulté et langue indiquées seulement si elles filtrent", (l => key(l, "diffs").text === "🎚️ Facile, Moyen" && key(l, "lang").text === "🌐 🇬🇧 English")(V.summary({ rounds: 10, time: 20, themes: 2, pool: 50, diffs: ["facile", "moyen"], lang: "en", langLabel: "🇬🇧 English" })) && !key(V.summary({ rounds: 10, time: 20, themes: 2, pool: 50, diffs: ALL, lang: "fr" }), "lang"));
t("résumé : thèmes cochés sans traduction signalés (pluriel géré)", /^ℹ️ 1 thème coché n’a pas de traduction dans cette langue : il est ignoré\.$/.test(key(V.summary({ rounds: 10, time: 20, themes: 2, pool: 50, untranslated: 1 }), "untranslated").text) && /^ℹ️ 4 thèmes cochés n’ont pas de traduction dans cette langue : ils sont ignorés\.$/.test(key(V.summary({ rounds: 10, time: 20, themes: 2, pool: 50, untranslated: 4 }), "untranslated").text) && !key(V.summary({ rounds: 10, time: 20, themes: 2, pool: 50, untranslated: 0 }), "untranslated"));
t("résumé : entrée absente ou aberrante → pas d'erreur", V.summary().length === 1 && V.summary({ themes: "x", pool: "y" }).length === 1 && V.summary(null)[0].key === "themes");

/* ---- code de config ---- */
const cfg = { rounds: 25, time: 30, lang: "es", diffs: ["moyen", "difficile"], themes: ["🌍 Géographie", "🎬 Cinéma", "Ça va ? « oui »"] };
const code = V.encode(cfg), back = V.decode(code);
t("code : commence par QSJ1., sans espace ni caractère à échapper", code.startsWith("QSJ1.") && /^QSJ1\.[A-Za-z0-9_-]+$/.test(code));
t("code : aller-retour exact (questions, temps, langue, difficultés, thèmes avec accents et emojis)", back && back.rounds === 25 && back.time === 30 && back.lang === "es" && back.diffs.join() === "moyen,difficile" && back.themes.join("|") === cfg.themes.join("|"));
t("code : toutes difficultés → pas de champ difficulté dans le code, et relu comme « toutes »", !/"d":/.test(Buffer.from(V.encode({ rounds: 10, time: 20, lang: "fr", diffs: ALL, themes: [] }).slice(5).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) && V.decode(V.encode({ rounds: 10, diffs: ALL })).diffs.join() === ALL.join());
t("code : espaces et retours à la ligne du copier-coller tolérés", V.decode("  " + code.slice(0, 20) + "\n " + code.slice(20) + " \n").rounds === 25);
t("code : texte quelconque, préfixe absent ou autre version → null", [null, undefined, "", "bonjour", "QSJ2." + code.slice(5), code.slice(5), "QSJ1.", "qsj1." + code.slice(5)].every(x => V.decode(x) === null));
const hand = o => "QSJ1." + Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
t("code : caractères interdits, base64 cassé, JSON cassé, tableau, texte, nombre ou null → null", V.decode("QSJ1.!!!") === null && V.decode("QSJ1." + Buffer.from("pas du json").toString("base64").replace(/=+$/, "")) === null && V.decode(hand([1, 2])) === null && V.decode(hand("texte")) === null && V.decode(hand(5)) === null && V.decode(hand(null)) === null && V.decode(hand({})) !== null);
t("code : trop long (plus de 30 000 caractères) refusé, un code réaliste (201 thèmes) accepté", V.decode(hand({ th: Array.from({ length: 400 }, (_, i) => ("t" + i).padEnd(80, "x")) })) === null && (c => c && c.themes.length === 201)(V.decode(V.encode({ themes: Array.from({ length: 201 }, (_, i) => "🌍 Thème numéro " + i) }))));
t("code : nombres bornés (1–999 questions, 1–600 s), valeurs par défaut sinon", (c => c.rounds === 999 && c.time === 600)(V.decode(hand({ r: 99999, t: 99999 }))) && (c => c.rounds === 1 && c.time === 1)(V.decode(hand({ r: -4, t: 0 }))) && (c => c.rounds === 10 && c.time === 20)(V.decode(hand({ r: "x", t: null }))) && V.decode(hand({ r: 999 })).rounds === 999);
t("code : langue invalide ignorée, difficultés invalides → toutes", V.decode(hand({ l: "FR; drop" })).lang === "" && V.decode(hand({ l: 5 })).lang === "" && V.decode(hand({ d: ["x"] })).diffs.join() === ALL.join() && V.decode(hand({ d: "facile" })).diffs.join() === ALL.join());
t("code : thèmes nettoyés (caractères invisibles, doublons, non-texte, longueur 80, 400 au plus)", (c => c.themes.join("|") === "A|B")(V.decode(hand({ th: ["A​", "A", " B ", 5, null, {}, ""] }))) && V.decode(hand({ th: ["x".repeat(200)] })).themes[0].length === 80 && V.decode(hand({ th: Array.from({ length: 500 }, (_, i) => "t" + i) })).themes.length === 400 && V.decode(hand({ th: "A" })).themes.length === 0);
t("code : clean ne plante jamais et ne modifie pas l'objet reçu", (() => { const o = { themes: ["a"] }; V.clean(o); return o.themes.length === 1 && V.clean(null).rounds === 10 && V.clean([]).time === 20 && V.clean("x").themes.length === 0; })());

/* ---- branchement dans le jeu ---- */
const src = rd("js/patches/050-v57-config.js"), html = rd("index.html"), core = rd("js/core/10-creation-partie.js"), lang = rd("js/core/06-langue-des-questions.js");
t("index.html : feuille v57 et script 050 après 049, avant le mode révision", html.includes("css/v57.css") && html.indexOf("049-v56-prereglages.js") < html.indexOf("050-v57-config.js") && html.indexOf("050-v57-config.js") < html.indexOf("js/review/review.js"));
t("tirage : getQuestionPool enveloppé pour appliquer le filtre de difficulté", /var basePool = getQuestionPool;\s*getQuestionPool = function/.test(src) && /V57\.filterPool\(p, S\.diffs\)\.pool/.test(src));
t("création de salle : chaque étape isolée (langue construite en premier, puis écran, thèmes, joueurs)", /\[\s*\(\)=>buildLangSelect\(\),\s*\(\)=>showScreen\("lobbyScreen"\),\s*\(\)=>buildLangSelect\(\),\s*\(\)=>buildThemeSelector\(\),\s*\(\)=>updatePlayers\(\)\s*\]\.forEach\(step=>\{\s*try\{step\(\);\}catch/.test(core));
t("liste des langues : jamais sans sélection (langue inconnue → première, selectedIndex ≥ 0)", /if\(!langs\.some\(l=>l\.code===questionLang\)\)questionLang=langs\[0\]\.code;/.test(lang) && /if\(select\.selectedIndex<0\)select\.selectedIndex=0;/.test(lang));
t("réparation : langue, questions, temps et grille des thèmes vides sont reconstruits", /l\.options\.length === 0 \|\| l\.selectedIndex < 0/.test(src) && /buildLangSelect\(\)/.test(src) && /!g\.querySelector\("input"\)/.test(src) && /buildThemeSelector\(\)/.test(src));
t("rendu par textContent (pas d'innerHTML) et code collé jamais interprété", !/innerHTML/.test(src) && !/eval\(/.test(src));

console.log("Config : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
