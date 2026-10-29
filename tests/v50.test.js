/* 16 nouveaux pouvoirs (8 bonus, 8 malus) et écran vert / rouge. Lancer : node tests/v50.test.js */
const P = require("../js/patches/041-v50-bonus-malus.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const mk = (o) => Object.assign({ id: "x", name: "X", score: 1000, combo: 0, bestCombo: 0, bonusPoints: 0, malusPoints: 0, fx: {} }, o || {});

/* ---------- catalogue ---------- */
t("16 pouvoirs : 8 bonus + 8 malus", P.IDS.length === 16 && P.BONUS_IDS.length === 8 && P.MALUS_IDS.length === 8);
t("types cohérents", P.BONUS_IDS.every(k => P.DEFS[k].type === "bonus") && P.MALUS_IDS.every(k => P.DEFS[k].type === "malus"));
t("chaque pouvoir a emoji, nom, description, rareté 0-2, durée entière", P.IDS.every(k => { const d = P.DEFS[k]; return d.emoji && d.name && d.desc.length > 8 && [0, 1, 2].includes(d.r) && Number.isInteger(d.q) && d.q >= 0; }));
t("immédiats = durée 0 ; durables = durée ≥ 1", P.IDS.every(k => P.DEFS[k].instant ? P.DEFS[k].q === 0 : P.DEFS[k].q >= 1));
t("noms et emojis uniques dans le lot", new Set(P.IDS.map(k => P.DEFS[k].name)).size === 16 && new Set(P.IDS.map(k => P.DEFS[k].emoji)).size === 16);
t("persistants rangés en bonus / malus actifs", P.NEG_PERSISTENT.every(k => P.DEFS[k].type === "malus" && !P.DEFS[k].instant) && P.POS_PERSISTENT.every(k => P.DEFS[k].type === "bonus" && !P.DEFS[k].instant)
  && P.NEG_PERSISTENT.length + P.POS_PERSISTENT.length === P.IDS.filter(k => !P.DEFS[k].instant).length);
t("des raretés variées (0, 1 et 2 en bonus ; 0, 1 et 2 en malus)", [0, 1, 2].every(r => P.BONUS_IDS.some(k => P.DEFS[k].r === r) && P.MALUS_IDS.some(k => P.DEFS[k].r === r)));

/* ---------- bonus immédiats ---------- */
let p = mk(); P.bonusInstant("tresor", p);
t("Trésor : +350 pts, comptés dans les bonus", p.score === 1350 && p.bonusPoints === 350);
p = mk(); P.bonusInstant("chance", p, () => 0.1);
t("Trèfle (tirage < 0,5) : +500", p.score === 1500);
p = mk(); P.bonusInstant("chance", p, () => 0.9);
t("Trèfle (tirage ≥ 0,5) : +150", p.score === 1150);
p = mk({ combo: 1, bestCombo: 3 }); P.bonusInstant("soin", p);
t("Soin : +2 combo, meilleur combo mis à jour", p.combo === 3 && p.bestCombo === 3);
p = mk({ combo: 5, bestCombo: 5 }); P.bonusInstant("soin", p);
t("Soin : le meilleur combo suit", p.combo === 7 && p.bestCombo === 7);
p = mk(); P.bonusInstant("ange", p);
t("Ange gardien : bouclier + 100 pts", p.shield === true && p.score === 1100);
p = mk({ combo: 1, bestCombo: 6 }); P.bonusInstant("phenix", p);
t("Phénix : retrouve le meilleur combo +1", p.combo === 7 && p.bestCombo === 7);
p = mk({ combo: 6, bestCombo: 6 }); P.bonusInstant("phenix", p);
t("Phénix : déjà au meilleur → +1 quand même", p.combo === 7);
p = mk(); const before = JSON.stringify(p); P.bonusInstant("horloge", p); P.bonusInstant("inconnu", p);
t("pouvoirs durables ou inconnus : aucun effet immédiat", JSON.stringify(p) === before);
t("rng par défaut : Math.random", (() => { const q = mk(); P.bonusInstant("chance", q); return q.score === 1500 || q.score === 1150; })());

/* ---------- malus immédiats ---------- */
let v = mk({ score: 1000 }); P.malusInstant("amende", v);
t("Amende : −300", v.score === 700 && v.malusPoints === 300);
v = mk({ score: 120 }); P.malusInstant("amende", v);
t("Amende : jamais sous 0", v.score === 0 && v.malusPoints === 120);
v = mk({ combo: 5, bestCombo: 5 }); P.malusInstant("boulet", v);
t("Boulet : −2 combo, meilleur combo conservé", v.combo === 3 && v.bestCombo === 5);
v = mk({ combo: 1 }); P.malusInstant("boulet", v);
t("Boulet : combo jamais négatif", v.combo === 0);
v = mk({ score: 1000 }); let a = mk({ id: "a", score: 500 }); P.malusInstant("larcin", v, a);
t("Larcin : 200 pts passent de la victime au voleur", v.score === 800 && a.score === 700 && v.malusPoints === 200 && a.bonusPoints === 200);
v = mk({ score: 80 }); a = mk({ id: "a", score: 500 }); P.malusInstant("larcin", v, a);
t("Larcin : on ne vole pas plus que ce que la victime a (total conservé)", v.score === 0 && a.score === 580);
v = mk({ score: 1000 }); P.malusInstant("larcin", v, v);
t("Larcin renvoyé par un Miroir sur le voleur : rien ne bouge", v.score === 1000 && v.malusPoints === 0 && v.bonusPoints === 0);
v = mk({ score: 400 }); const sum = v.score; P.malusInstant("virus", v); P.malusInstant("inconnu", v);
t("pouvoirs durables ou inconnus : aucun effet immédiat (malus)", v.score === sum);

/* ---------- gains ---------- */
p = mk({ fx: { boost15: { left: 2 } } });
t("Fusée ×1,5 : 100 → 150", P.gainAdjust(p, 100) === 150 && p.fx.boost15.left === 2);
p = mk({ fx: { lingot: { left: 1 } } });
t("Lingot : +300 une seule fois", P.gainAdjust(p, 100) === 400 && !p.fx.lingot && P.gainAdjust(p, 100) === 100);
p = mk({ fx: { virus: { left: 3 } } });
t("Virus : −15 % (100 → 85), reste actif", P.gainAdjust(p, 100) === 85 && p.fx.virus.left === 3);
p = mk({ fx: { trounoir: { left: 1 } } });
t("Trou noir : 0 pt une seule fois", P.gainAdjust(p, 100) === 0 && !p.fx.trounoir && P.gainAdjust(p, 100) === 100);
p = mk({ fx: { boost15: { left: 1 }, lingot: { left: 1 }, virus: { left: 1 } } });
t("cumul : (100 × 1,5 + 300) × 0,85 = 382,5 → 383", P.gainAdjust(p, 100) === Math.round((150 + 300) * 0.85));
t("effet échu (left 0) : ignoré", P.gainAdjust(mk({ fx: { boost15: { left: 0 } } }), 100) === 100);
t("joueur sans effets : gain inchangé", P.gainAdjust(mk(), 123) === 123 && P.gainAdjust(null, 5) === 5 && P.gainAdjust({}, 7) === 7);

/* ---------- chrono ---------- */
t("Arrêt du temps : +15 s", P.timeDelta(mk({ fx: { horloge: { left: 1 } } })) === 15);
t("Tempête : −3 s", P.timeDelta(mk({ fx: { tempete: { left: 2 } } })) === -3);
t("les deux ensemble : +12 s", P.timeDelta(mk({ fx: { horloge: { left: 1 }, tempete: { left: 1 } } })) === 12);
t("rien : 0", P.timeDelta(mk()) === 0 && P.timeDelta(null) === 0);

/* ---------- écran vert / rouge ---------- */
let f = P.flashFor("🎁 BONUS : +300 points !", "#86efac");
t("vert : bonus", f && f.kind === "good" && f.title === "BONUS !" && f.emoji === "🎁");
f = P.flashFor("💰 Trésor : +350 pts tout de suite !", "#86efac");
t("vert : l'emoji du texte est repris", f.kind === "good" && f.emoji === "💰");
f = P.flashFor("⚠️ Léa t'a lancé 🦠 Virus : ses gains −15 %.", "#fca5a5");
t("rouge : malus", f && f.kind === "bad" && f.title === "MALUS !" && f.emoji === "⚠️");
f = P.flashFor("🛡️ Ton bouclier a bloqué le malus de Tom !", "#86efac");
t("vert : malus bloqué = « BLOQUÉ ! »", f.kind === "good" && f.title === "BLOQUÉ !" && f.emoji === "🛡️");
f = P.flashFor("🛡️ Armure : annule un malus et protège ta série !", "#86efac");
t("un bonus « Armure » (texte qui commence par 🛡️) reste un BONUS, pas un blocage", f.kind === "good" && f.title === "BONUS !");
f = P.flashFor("🛡️ Bob a bloqué ton 🦠 Virus !", "#86efac");
t("un vrai blocage reste « BLOQUÉ ! »", f.kind === "good" && f.title === "BLOQUÉ !" && f.emoji === "🛡️");
f = P.flashFor("🧱 Léa subit déjà 2 malus : 🦠 Virus est sans effet.", "#86efac");
t("limite de 2 malus : « BLOQUÉ ! » avec la brique", f.title === "BLOQUÉ !" && f.emoji === "🧱");
f = P.flashFor("🪞 Ton Miroir a renvoyé 🦠 Virus à Tom !", "#fca5a5");
t("Miroir (côté cible, texte rouge) : écran VERT « RENVOYÉ ! » car c'est bon pour toi", f.kind === "good" && f.title === "RENVOYÉ !" && f.emoji === "🪞");
f = P.flashFor("🪞 Léa avait un Miroir : 🦠 Virus te revient !", "#facc15");
t("Miroir (côté lanceur, texte jaune) : écran ROUGE « RENVOYÉ SUR TOI ! » car c'est mauvais pour toi", f.kind === "bad" && f.title === "RENVOYÉ SUR TOI !");
t("jaune sans renvoi : toujours pas d'écran ; vert « Miroir » sans « renvoyé » : bonus normal", P.flashFor("💥 Malus donné à Tom", "#facc15") === null && P.flashFor("🪞 Miroir : renvoie le prochain malus !", "#86efac").title === "BONUS !");
t("jaune (ce que tu lances) : pas d'écran", P.flashFor("💥 Malus donné à Tom : -200 points !", "#facc15") === null);
t("couleur inconnue / absente : pas d'écran", P.flashFor("x", "#fff") === null && P.flashFor("x") === null);
t("couleur en majuscules acceptée", P.flashFor("🎁 ok", "#86EFAC").kind === "good");
f = P.flashFor("sans emoji", "#fca5a5");
t("texte sans emoji : pictogramme par défaut", f.emoji === "💥" && P.flashFor("sans emoji", "#86efac").emoji === "🎁");
t("texte vide / nul : ne plante pas", P.flashFor("", "#86efac").sub === "" && P.flashFor(null, "#fca5a5").kind === "bad");
t("emoji composés (ZWJ / sélecteur) pris en entier", P.flashFor("🕵️ vol", "#fca5a5").emoji === "🕵️" && P.flashFor("🧑‍🚀 go", "#86efac").emoji === "🧑‍🚀");

/* ---------- le fichier branche tout ---------- */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../js/patches/041-v50-bonus-malus.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/v50.css"), "utf8");
t("index.html charge le script et la feuille de style", html.includes('js/patches/041-v50-bonus-malus.js') && html.includes('css/v50.css'));
t("script chargé après le noyau des pouvoirs (46 / 53) et le jeu", html.indexOf("041-v50-bonus-malus.js") > html.indexOf("core/53-v7-nouveaux-bonus-malus-8.js") && html.indexOf("041-v50-bonus-malus.js") > html.indexOf("js/stats/stats.js"));
["applyExtPower", "applyScoreFx", "fxTimeDelta", "showPowerPanel", "startTimer", "displayQuestion"].forEach(n => t("branché sur " + n, new RegExp(n + " = function").test(src)));
t("l'écran ne bloque jamais les clics", /\.v50-flash\{[^}]*pointer-events:none/.test(css));
t("version calme pour prefers-reduced-motion (JS et CSS)", /prefers-reduced-motion: reduce/.test(src) && /prefers-reduced-motion:reduce/.test(css) && /\.v50-calm/.test(css));
t("vert pour un bonus, rouge pour un malus", /\.v50-good\{background:radial-gradient\(circle at 50% 45%,rgba\(74,222,128/.test(css) && /\.v50-bad\{background:radial-gradient\(circle at 50% 45%,rgba\(248,113,113/.test(css));
t("animations présentes (pop, secousse, particules)", ["v50-pop", "v50-shake", "v50-up", "v50-down", "v50-life"].every(k => css.includes("@keyframes " + k)));

/* ---------- règlement détaillé ---------- */
const vm = require("vm");
function loadRules(base) {
  const ctx = { RULES_TEXT: base, V50Powers: P, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/patches/042-v50-reglement.js"), "utf8"), ctx);
  return ctx;
}
const base = { fr: "<b>🎯 Objectif :</b> x", en: "<b>🎯 Goal:</b> x", es: "<b>🎯 Objetivo:</b> x" };
const rc = loadRules(Object.assign({}, base));
const R = rc.RULES_TEXT;
["fr", "en", "es"].forEach(l => {
  t(l + " : règlement ajouté à la suite de l'existant", R[l].startsWith(base[l]) && R[l].length > base[l].length + 2500);
  t(l + " : les 16 pouvoirs sont cités (emoji + nom)", P.IDS.every(k => R[l].includes(P.DEFS[k].emoji + " " + P.DEFS[k].name)));
  t(l + " : 14 articles numérotés dans l'ordre", [...R[l].matchAll(/<b>(\d+)\. /g)].map(m => +m[1]).join() === "1,2,3,4,5,6,7,8,9,10,11,12,13,14");
  t(l + " : balises <b> équilibrées, pas de script", (R[l].match(/<b>/g) || []).length === (R[l].match(/<\/b>/g) || []).length && !/<script|onerror|javascript:/i.test(R[l]));
  t(l + " : parle de l'écran vert et de l'écran rouge", /🟢/.test(R[l]) && /🔴/.test(R[l]));
  t(l + " : parle du filigrane qui-suis-je-officiel", R[l].includes("qui-suis-je-officiel"));
});
t("même nombre d'articles dans les 3 langues", [...R.fr.matchAll(/<b>\d+\. /g)].length === [...R.en.matchAll(/<b>\d+\. /g)].length && [...R.en.matchAll(/<b>\d+\. /g)].length === [...R.es.matchAll(/<b>\d+\. /g)].length);
const once = R.fr;
const again = loadRules({ fr: once, en: R.en, es: R.es }).RULES_TEXT;
t("chargé deux fois : le règlement n'est pas dupliqué", again.fr === once && again.en === R.en && again.es === R.es);
t("règlement FR : au moins 3 fois plus long qu'avant", R.fr.length > base.fr.length * 3);
t("index.html charge le règlement après les pouvoirs", html.indexOf("042-v50-reglement.js") > html.indexOf("041-v50-bonus-malus.js"));
t("énoncés fidèles au jeu : 2 malus actifs max, 12 parties d'historique, 3 derniers pouvoirs", /2 malus actifs/.test(R.fr) && /12 dernières parties/.test(R.fr) && /3 derniers/.test(R.fr));

console.log("V50 : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
