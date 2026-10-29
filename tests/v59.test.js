/* 13 pouvoirs de plus (js/patches/052-v59-pouvoirs.js)   node tests/v59.test.js */
const P = require("../js/patches/052-v59-pouvoirs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const mkp = o => Object.assign({ score: 1000, combo: 0, bestCombo: 0, bonusPoints: 0, malusPoints: 0, fx: {} }, o || {});

t("13 pouvoirs : 7 bonus et 6 malus, identifiants uniques", P.IDS.length === 13 && P.BONUS_IDS.length === 7 && P.MALUS_IDS.length === 6 && new Set(P.IDS).size === 13);
t("chaque pouvoir a un type, une rareté 0-2, un emoji, un nom, une description et une durée", P.IDS.every(id => { const d = P.DEFS[id]; return (d.type === "bonus" || d.type === "malus") && [0, 1, 2].includes(d.r) && d.emoji && d.name && d.desc && Number.isInteger(d.q) && d.q >= 0; }));
t("noms distincts et distincts des 16 pouvoirs de V50 et des pouvoirs étendus", (function () { const V50 = require("../js/patches/041-v50-bonus-malus.js"); const names = P.IDS.map(i => P.DEFS[i].name); return new Set(names).size === 13 && names.every(n => !V50.IDS.some(i => V50.DEFS[i].name === n)) && P.IDS.every(i => !V50.IDS.includes(i)); })());
t("les effets instantanés ont q = 0 ; les effets durables ont q ≥ 1 (sauf la Trêve : bouclier tout de suite puis 3 questions)", P.IDS.every(id => { const d = P.DEFS[id]; return id === "treve" ? d.q === 3 && d.instant : d.instant ? d.q === 0 : d.q >= 1; }));
t("épiques : seulement Magicien, Trêve, Faucheuse, Vampire", P.IDS.filter(i => P.DEFS[i].r === 2).sort().join() === "faucheuse,magicien,treve,vampire");
t("listes de durée : malus durables = Mine, Dévaluation, Brouillard ; bonus durables = Radar, Rente, Magicien, Trêve", P.NEG_PERSISTENT.join() === "mine,deval,brouillard" && P.POS_PERSISTENT.join() === "radar,rente,magicien,treve" && P.NEG_PERSISTENT.every(i => P.DEFS[i].type === "malus") && P.POS_PERSISTENT.every(i => P.DEFS[i].type === "bonus"));

/* ---- machine à sous ---- */
t("slotPrize : 100 / 250 / 500 / 900 aux bornes exactes", P.slotPrize(0) === 100 && P.slotPrize(0.399) === 100 && P.slotPrize(0.4) === 250 && P.slotPrize(0.699) === 250 && P.slotPrize(0.7) === 500 && P.slotPrize(0.899) === 500 && P.slotPrize(0.9) === 900 && P.slotPrize(0.999999) === 900);
t("slotPrize : valeur absurde → gain valide", [NaN, -5, 7, "x", null, undefined].every(v => [100, 250, 500, 900].includes(P.slotPrize(v))));
t("slotPrize : espérance ≈ 100×.4+250×.3+500×.2+900×.1 = 305", (function () { let s = 0; for (let i = 0; i < 1000; i++) s += P.slotPrize(i / 1000); return Math.abs(s / 1000 - 305) < 1; })());
/* ---- rattrapage ---- */
t("catchUp : 15 % de l'écart", P.catchUp(1000, 3000) === 300 && P.catchUp(0, 4000) === 600);
t("catchUp : plancher 150 (leader ou petit écart), plafond 900", P.catchUp(3000, 3000) === 150 && P.catchUp(5000, 3000) === 150 && P.catchUp(2990, 3000) === 150 && P.catchUp(0, 100000) === 900 && P.catchUp(0, 6000) === 900 && P.catchUp(0, 5999) === 900 - 0 + 0);
t("catchUp : valeurs invalides → plancher", P.catchUp(NaN, NaN) === 150 && P.catchUp("x", null) === 150);
/* ---- faucheuse / vampire ---- */
t("reaperLoss : 25 %, plafonné à 1 500", P.reaperLoss(2000) === 500 && P.reaperLoss(100000) === 1500 && P.reaperLoss(0) === 0 && P.reaperLoss(-50) === 0 && P.reaperLoss(6000) === 1500 && P.reaperLoss(5999) === 1500);
t("vampireLoss : 10 %, de 100 à 700, jamais plus que le score", P.vampireLoss(2000) === 200 && P.vampireLoss(50000) === 700 && P.vampireLoss(500) === 100 && P.vampireLoss(60) === 60 && P.vampireLoss(0) === 0 && P.vampireLoss(-9) === 0);

/* ---- bonus instantanés ---- */
(function () {
  const p = mkp({ combo: 2, bestCombo: 2 }); const n = P.bonusInstant("cadeau", p);
  t("Cadeau : +200 pts, +1 combo, meilleur combo suivi, texte", p.score === 1200 && p.combo === 3 && p.bestCombo === 3 && p.bonusPoints === 200 && /\+200 pts, combo 3/.test(n));
  const q = mkp(); P.bonusInstant("machine", q, 0, () => 0.95);
  t("Machine à sous : gain du tirage ajouté au score et aux points bonus", q.score === 1900 && q.bonusPoints === 900);
  const r = mkp({ score: 500 }); const nr = P.bonusInstant("rattrapage", r, 3500);
  t("Rattrapage : 15 % de l'écart avec le leader (450)", r.score === 950 && /\+450 pts/.test(nr));
  const s = mkp(); const ns = P.bonusInstant("treve", s);
  t("Trêve : bouclier immédiat", s.shield === true && /bouclier/.test(ns));
  t("pouvoir durable : aucun effet immédiat, texte vide", P.bonusInstant("radar", mkp()) === "" && P.bonusInstant("magicien", mkp()) === "" && P.bonusInstant("inconnu", mkp()) === "");
})();
/* ---- malus instantanés ---- */
(function () {
  const v = mkp({ combo: 6 });
  P.malusInstant("montagnes", v, null, () => 0);
  t("Montagnes russes : tirage bas → combo 0", v.combo === 0);
  const v2 = mkp({ combo: 6 }); P.malusInstant("montagnes", v2, null, () => 0.999);
  t("Montagnes russes : tirage haut → combo inchangé (jamais plus haut)", v2.combo === 6);
  const v3 = mkp({ combo: 6 }); P.malusInstant("montagnes", v3, null, () => 0.5);
  t("Montagnes russes : tirage moyen → entre 0 et le combo", v3.combo === 3);
  const v4 = mkp({ combo: 0 }); P.malusInstant("montagnes", v4, null, () => 0.7);
  t("Montagnes russes : combo 0 reste 0", v4.combo === 0);
  const v5 = mkp({ score: 4000 }); const nf = P.malusInstant("faucheuse", v5, null);
  t("Faucheuse : −25 % du score, comptés en malus", v5.score === 3000 && v5.malusPoints === 1000 && /−1000 pts/.test(nf));
  const v6 = mkp({ score: 100000 }); P.malusInstant("faucheuse", v6, null);
  t("Faucheuse : plafond de 1 500", v6.score === 98500);
  const a = mkp({ score: 100 }), v7 = mkp({ score: 3000 }); const nv = P.malusInstant("vampire", v7, a);
  t("Vampire : 10 % volés (300), la victime perd, l'attaquant gagne", v7.score === 2700 && a.score === 400 && a.bonusPoints === 300 && v7.malusPoints === 300 && /300 pts volés/.test(nv));
  const v8 = mkp({ score: 40 }), a8 = mkp({ score: 0 }); P.malusInstant("vampire", v8, a8);
  t("Vampire : jamais plus que le score de la victime (40)", v8.score === 0 && a8.score === 40);
  const self = mkp({ score: 3000 }); P.malusInstant("vampire", self, self);
  t("Vampire renvoyé par un Miroir : le voleur se vole lui-même, rien ne bouge", self.score === 3000 && self.malusPoints === 0 && self.bonusPoints === 0);
  const sf = mkp({ score: 0 }); P.malusInstant("faucheuse", sf, null);
  t("Faucheuse : score 0 → rien à perdre, pas de négatif", sf.score === 0 && sf.malusPoints === 0);
  t("pouvoir durable : aucun effet immédiat", P.malusInstant("mine", mkp(), null) === "" && P.malusInstant("deval", mkp(), null) === "" && P.malusInstant("brouillard", mkp(), null) === "");
})();
/* ---- gains ---- */
(function () {
  const on = id => ({ [id]: { left: 1 } });
  t("gainAdjust : sans effet → inchangé ; joueur sans fx ou nul → inchangé", P.gainAdjust(mkp(), 700) === 700 && P.gainAdjust({ score: 1 }, 700) === 700 && P.gainAdjust(null, 700) === 700);
  const m = mkp({ fx: on("magicien") }); t("Magicien : ×4 puis s'éteint (une seule fois)", P.gainAdjust(m, 700) === 2800 && !m.fx.magicien && P.gainAdjust(m, 700) === 700);
  t("Rente : +100 à chaque bonne réponse (reste actif)", (function () { const p = mkp({ fx: { rente: { left: 3 } } }); return P.gainAdjust(p, 700) === 800 && P.gainAdjust(p, 700) === 800 && !!p.fx.rente; })());
  t("Dévaluation : moitié moins, arrondi", P.gainAdjust(mkp({ fx: on("deval") }), 701) === 351 && P.gainAdjust(mkp({ fx: on("deval") }), 700) === 350);
  t("effet épuisé (left 0) : sans effet", P.gainAdjust(mkp({ fx: { magicien: { left: 0 }, rente: { left: 0 }, deval: { left: 0 } } }), 700) === 700);
  t("Magicien + Rente + Dévaluation : (×4) puis +100 puis ÷2", P.gainAdjust(mkp({ fx: { magicien: { left: 2 }, rente: { left: 2 }, deval: { left: 1 } } }), 500) === 1050);
})();
/* ---- chrono, mine, trêve ---- */
t("Radar : +5 s tant qu'il est actif, sinon 0", P.timeDelta(mkp({ fx: { radar: { left: 2 } } })) === 5 && P.timeDelta(mkp({ fx: { radar: { left: 0 } } })) === 0 && P.timeDelta(mkp()) === 0 && P.timeDelta(null) === 0);
(function () {
  const p = mkp({ score: 1000, fx: { mine: { left: 1 } } }); const l = P.onWrong(p);
  t("Mine : −300 pts à la mauvaise réponse, puis disparaît", l === 300 && p.score === 700 && p.malusPoints === 300 && !p.fx.mine && P.onWrong(p) === 0 && p.score === 700);
  const q = mkp({ score: 120, fx: { mine: { left: 1 } } }); t("Mine : jamais sous 0", P.onWrong(q) === 120 && q.score === 0);
  t("Mine : sans effet actif ou éteinte → rien", P.onWrong(mkp()) === 0 && P.onWrong(mkp({ fx: { mine: { left: 0 } } })) === 0 && P.onWrong(null) === 0);
  const tr = mkp({ fx: { treve: { left: 2 } } });
  t("Trêve : renouvelle le bouclier seulement s'il manque", P.renewShield(tr) === true && tr.shield === true && P.renewShield(tr) === false);
  t("Trêve : épuisée ou absente → pas de bouclier", P.renewShield(mkp({ fx: { treve: { left: 0 } } })) === false && P.renewShield(mkp()) === false && P.renewShield(null) === false);
})();
/* ---- branchement ---- */
const fs = require("fs"), path = require("path"), idx = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
t("index.html charge les nouveaux pouvoirs après V50 et avant le mode révision", idx.indexOf("052-v59-pouvoirs.js") > idx.indexOf("041-v50-bonus-malus.js") && idx.indexOf("052-v59-pouvoirs.js") < idx.indexOf("js/review/review.js"));
console.log("Nouveaux pouvoirs : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
