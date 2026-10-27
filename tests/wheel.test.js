/* Roue des bonus et malus : moments de déclenchement, effet exact de chaque case, bouclier, plafonds, équiprobabilité, nettoyage des messages réseau. */
const W = require("../js/wheel/wheel.js");
let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; console.log("ÉCHEC", msg); } }
const P = (o) => Object.assign({ score: 1000, combo: 2, shield: false, doubleNext: false }, o || {});
const idx = (k, ch) => W.SEGMENTS.findIndex(s => s.k === k && s.ch === ch);

/* Quand la roue tourne */
const fires = (t) => { const r = []; for (let d = 0; d <= t + 2; d++) if (W.due(d, t)) r.push(d); return r.join(","); };
ok(fires(10) === "3,6,9", "10 manches : après 3, 6 et 9 (" + fires(10) + ")");
ok(fires(3) === "" && fires(2) === "" && fires(1) === "", "jamais avant la 3e manche ni après la dernière");
ok(fires(6) === "3", "6 manches : une seule fois");
ok(!W.due(0, 10) && !W.due(NaN, 10) && !W.due(3, undefined) && !W.due("3", 10) && !W.due(3.5, 10), "entrées invalides refusées");

/* Chaque case : effet exact */
ok(W.SEGMENTS.length === 8 && W.SEGMENTS.filter(s => s.ch === "bonus").length === 4, "4 bonus + 4 malus");
let p = P(), r = W.apply(p, idx("xp", "bonus")); ok(p.score === 1300 && r.amount === 300 && p.bonusPoints === 300 && r.text === "+300 points", "+300");
p = P(); r = W.apply(p, idx("jackpot", "bonus")); ok(p.score === 2000 && r.amount === 1000, "jackpot +1000");
p = P(); r = W.apply(p, idx("double", "bonus")); ok(p.doubleNext === true && p.score === 1000, "×2 prochaine question");
p = P(); r = W.apply(p, idx("shield", "bonus")); ok(p.shield === true && p.score === 1000, "bouclier");
p = P(); r = W.apply(p, idx("xp", "malus")); ok(p.score === 800 && r.amount === 200 && p.malusPoints === 200 && p.malusesReceived === 1, "−200");
p = P(); r = W.apply(p, idx("crush", "malus")); ok(p.score === 500 && r.amount === 500, "−500");
p = P(); r = W.apply(p, idx("tax", "malus")); ok(p.score === 850 && r.amount === 150, "impôt −15 %");
p = P({ score: 999 }); r = W.apply(p, idx("tax", "malus")); ok(p.score === 850 && r.amount === 149, "impôt arrondi vers le bas (149,85 → 149)");
p = P(); r = W.apply(p, idx("freeze", "malus")); ok(p.combo === 0 && p.score === 1000 && r.amount === 0 && /brisée/.test(r.text), "série brisée");
p = P({ combo: 0 }); r = W.apply(p, idx("freeze", "malus")); ok(/n'en avais pas/.test(r.text), "série brisée sans série : le dit honnêtement");

/* Plafonds : jamais de score négatif */
p = P({ score: 120 }); r = W.apply(p, idx("xp", "malus")); ok(p.score === 0 && r.amount === 120 && /120/.test(r.text), "−200 sur 120 points : retire 120 seulement");
p = P({ score: 0 }); r = W.apply(p, idx("crush", "malus")); ok(p.score === 0 && r.amount === 0 && /Rien à perdre/.test(r.text), "score à 0 : rien à perdre");
p = P({ score: -50 }); r = W.apply(p, idx("tax", "malus")); ok(p.score === -50 && r.amount === 0, "score négatif existant : inchangé");
p = P({ score: undefined }); W.apply(p, idx("xp", "bonus")); ok(p.score === 300, "score absent = 0");
p = P({ score: "abc" }); W.apply(p, idx("xp", "bonus")); ok(p.score === 300, "score illisible = 0");

/* Bouclier : annule un malus (une seule fois), sans effet sur un bonus */
p = P({ shield: true }); r = W.apply(p, idx("crush", "malus")); ok(p.score === 1000 && p.shield === false && r.blocked && r.amount === 0 && p.malusesReceived === undefined, "bouclier annule −500 et se consomme");
p = P({ shield: true }); r = W.apply(p, idx("freeze", "malus")); ok(p.combo === 2 && !p.shield && r.blocked, "bouclier protège la série");
p = P({ shield: true }); W.apply(p, idx("xp", "bonus")); ok(p.shield === true && p.score === 1300, "un bonus ne consomme pas le bouclier");

/* Équiprobabilité (80 000 tirages, tolérance 3 %) et bornes */
const cnt = new Array(8).fill(0); for (let i = 0; i < 80000; i++) cnt[W.pick()]++;
ok(cnt.every(c => Math.abs(c - 10000) < 300), "tirage uniforme : " + cnt.join(","));
ok(W.pick(() => 0) === 0 && W.pick(() => 0.9999999) === 7 && W.pick(() => 1) === 7 && W.pick(() => -3) === 0 && W.pick(() => NaN) === 0, "bornes du tirage");

/* Tirage pour tous les joueurs actifs */
const players = { a: P({ name: "Ana", avatar: "🐱" }), b: P({ name: "Bob" }), c: P({ name: "Cid" }), d: null };
const res = W.plan(players, { c: 1 }, () => 0);
ok(res.length === 2 && res.every(x => x.seg === 0 && x.id !== "c") && players.c.score === 1000 && players.a.score === 1300, "tous les joueurs actifs, sauf exclus, tirent leur case");
ok(W.plan({}, null).length === 0 && W.plan(null, null).length === 0, "aucun joueur : aucun résultat");

/* Nettoyage d'un message réseau malveillant */
const c = W.clean({ id: "7", results: [{ id: 5, name: "<img src=x onerror=1>".repeat(5), avatar: "😀".repeat(30), seg: 99, ch: "x", amount: 1e12, text: "t".repeat(500), blocked: 1 }, null, { seg: -3, amount: -5 }] });
ok(c && c.id === 7 && c.results.length === 3, "messages nettoyés");
ok(c.results[0].seg === 0 && c.results[0].ch === "bonus" && c.results[0].amount === 99999 && c.results[0].text.length === 80 && c.results[0].name.length === 24 && c.results[0].avatar.length <= 8 && c.results[0].blocked === true, "champs bornés : " + JSON.stringify(c.results[0]).slice(0, 120));
ok(c.results[2].seg === 0 && c.results[2].amount === 0, "valeurs négatives ramenées à 0");
ok(W.clean(null) === null && W.clean({}) === null && W.clean({ results: [] }) === null && W.clean({ results: "x" }) === null, "messages vides refusés");
ok(Array.from({ length: 500 }, (_, i) => ({ id: i })).length === 500 && W.clean({ results: Array.from({ length: 500 }, (_, i) => ({ id: i })) }).results.length === 60, "60 résultats au plus");

console.log("Roue : " + (n - bad) + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
