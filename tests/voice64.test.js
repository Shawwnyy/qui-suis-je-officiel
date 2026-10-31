/* Voix grave, flammes, Bombe et Vitesse   node tests/voice64.test.js */
const V = require("../js/patches/059-v64-voix-grave.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const L5 = V.countdownLines(5);
t("départ 5 s : « La partie commence » puis Trois, Deux, Un, puis « Bonne chance ! »", L5.map(l => l.text).join("|") === "La partie commence.|Trois.|Deux.|Un.|Bonne chance !");
t("départ 5 s : les chiffres tombent à 3 s, 2 s et 1 s avant le départ", L5[1].at === 2 && L5[2].at === 3 && L5[3].at === 4 && L5[4].at === 5);
const L3 = V.countdownLines(3);
t("départ 3 s : « La partie commence. Trois. » ensemble, puis Deux, Un, Bonne chance", L3[0].text === "La partie commence. Trois." && L3[0].at === 0 && L3.length === 4 && L3[3].text === "Bonne chance !" && L3[3].at === 3);
t("départ : temps ordonnés, jamais négatifs ; durée invalide → rien", [1, 2, 3, 4, 5, 8].every(n => { const l = V.countdownLines(n); return l.every((x, i) => x.at >= 0 && x.at <= n && (i === 0 || x.at >= l[i - 1].at)); }) && V.countdownLines(0).length === 0 && V.countdownLines("x").length === 0);
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
