/* Voix grave, flammes, Bombe et Vitesse   node tests/voice64.test.js */
const V = require("../js/patches/059-v64-voix-grave.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const run = seq => { let st = null; const out = []; seq.forEach(v => { const r = V.launchTick(st, v); st = r.st; r.say.forEach(x => out.push(x)); if (r.cancelled) out.push({ cancelled: true }); }); return out; };
const full = [{ shown: true, text: "5" }, { shown: true, text: "5" }, { shown: true, text: "4" }, { shown: true, text: "3" }, { shown: true, text: "2" }, { shown: true, text: "2" }, { shown: true, text: "1" }, { shown: false, text: "1" }, { shown: false, text: "" }];
const sp = run(full);
t("départ : « La partie commence dans trois secondes. », Deux, Un, Zéro, puis « Bonne chance à toutes et à tous ! »", sp.map(x => x.text).join("|") === "La partie commence dans trois secondes.|Deux.|Un.|Zéro.|Bonne chance à toutes et à tous !");
t("départ : la phrase d'ouverture part à l'apparition du compte à rebours (avec un petit délai), chaque chiffre une seule fois", sp[0].delay === 400 && sp.filter(x => x.text === "Deux.").length === 1 && sp.filter(x => x.text === "Un.").length === 1);
t("« Bonne chance » est mise à la suite du zéro (file)", sp[4].queue === true && !sp[3].queue);
t("lancement annulé (fermé avant le 1) : rien d'annoncé, signalé comme annulé", run([{ shown: true, text: "5" }, { shown: true, text: "4" }, { shown: false, text: "4" }]).filter(x => x.text && x.text !== "La partie commence dans trois secondes.").length === 0 && run([{ shown: true, text: "5" }, { shown: false, text: "5" }]).some(x => x.cancelled));
t("arrivée tardive : affiché à 3 → phrase sans délai ; à 2 → rien avant « Deux » ; rien quand rien n'est affiché", run([{ shown: true, text: "3" }])[0].delay === 0 && run([{ shown: true, text: "2" }]).length === 0 && run([{ shown: false, text: "" }, { shown: false, text: "" }]).length === 0);
t("deux lancements de suite : tout est annoncé à chaque fois", run(full.concat(full)).length === 10);
t("entrées bizarres : pas d'exception", V.launchTick(null, null).say.length === 0 && V.launchTick({ on: true, last: undefined }, { shown: false }).say.length === 0 && V.launchTick(undefined, { shown: true, text: "abc" }).say.length === 0);
const fr = { lang: "fr-FR", name: "Amelie" }, frM = { lang: "fr-FR", name: "Thomas" }, en = { lang: "en-US", name: "Daniel" };
t("voix : française et masculine d'abord, sinon française, sinon rien", V.pickVoice([en, fr, frM]) === frM && V.pickVoice([en, fr]) === fr && V.pickVoice([en]) === null && V.pickVoice(null) === null && V.pickVoice([null, {}]) === null);
t("annonce : dernière question", V.announce({}, 10, 10).say.startsWith("Dernière question") && V.announce({}, 9, 10) === null);
t("annonce : piège, or, éclair, chance, vitesse, bombe", ["trap", "golden", "eclair", "chance", "vitesse", "bombe"].every(k => { const q = k === "trap" ? { trap: true } : k === "golden" ? { golden: true } : { event: k }; const a = V.announce(q, 2, 10); return a && a.say && a.banner; }));
t("annonce : piège + dernière question → les deux, rien si question ordinaire", /Dernière question.*piège/i.test(V.announce({ trap: true }, 5, 5).say) && V.announce(null, 1, 10) === null);
t("flammes : 0-2 → rien, 3 → 1, 5 → 2, 8 → 3", [0, 2, 3, 4, 5, 7, 8, 20].map(V.fireLevel).join() === "0,0,1,1,2,2,3,3" && V.fireLevel("x") === 0 && V.fireLevel(-3) === 0);
const base = { enabled: true, idx: 5, total: 12, rng: () => 0.01 };
t("nouvelle question spéciale : vitesse si tirage très bas, bombe un peu plus haut", V.newEvent(base) === "vitesse" && V.newEvent(Object.assign({}, base, { rng: () => 0.09 })) === "bombe" && V.newEvent(Object.assign({}, base, { rng: () => 0.5 })) === null);
t("nouvelle question spéciale : jamais si désactivée, déjà spéciale, deux de suite, début/fin de partie, partie courte", [{ enabled: false }, { golden: true }, { event: "eclair" }, { trap: true }, { lastSpecial: true }, { idx: 1 }, { idx: 3 }, { idx: 12 }, { total: 4 }].every(o => V.newEvent(Object.assign({}, base, o)) === null));
t("bombe : −400 au plus, jamais plus que le score, jamais négatif", V.bombLoss(1000) === 400 && V.bombLoss(150) === 150 && V.bombLoss(0) === 0 && V.bombLoss(-50) === 0 && V.bombLoss("x") === 0);
t("vitesse : +50 par seconde restante, borné au temps de la question", V.speedExtra(10, 20) === 500 && V.speedExtra(30, 20) === 1000 && V.speedExtra(-4, 20) === 0 && V.speedExtra(5, 0) === 0);
t("fréquence : environ 11 % des questions éligibles, moitié vitesse moitié bombe", (function () { let a = 0, b = 0, n = 20000; for (let i = 0; i < n; i++) { const e = V.newEvent(Object.assign({}, base, { rng: Math.random })); if (e === "vitesse") a++; else if (e === "bombe") b++; } return a / n > 0.04 && a / n < 0.07 && b / n > 0.04 && b / n < 0.07; })());
console.log(ko ? ko + " échec(s)" : "OK", "—", ok + ko, "vérifications");
process.exit(ko ? 1 : 0);
