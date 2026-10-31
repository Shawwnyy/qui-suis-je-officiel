/* Feux d'artifice (recette sonore et gerbes) + fiches de révision (partage, copie, rattrapage)   node tests/fireworks.test.js */
const Fx = require("../js/patches/058-v63-feux-artifice.js");
const Fi = require("../js/justif/fiches.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const R = () => Fx.rng32(42);
/* --- recette sonore --- */
const pc = Fx.plan("correct", R()), pw = Fx.plan("wrong", R()), pf = Fx.plan("finale", R());
const count = (p, k) => p.filter(e => e.k === k).length;
t("bonne réponse : 2 tirs = 2 sifflements, 2 explosions, 2 crépitements", count(pc, "whistle") === 2 && count(pc, "boom") === 2 && count(pc, "crackle") === 2);
t("mauvaise réponse : 1 petit tir (sifflement, explosion, crépitement)", count(pw, "whistle") === 1 && count(pw, "boom") === 1 && count(pw, "crackle") === 1);
t("fin de partie : salve de 10 tirs + final de 3 tirs", count(pf, "whistle") === 13 && count(pf, "boom") === 13);
t("durées : mauvaise < bonne < finale, finale entre 5 et 12 s", Fx.duration(pw) < Fx.duration(pc) && Fx.duration(pc) < Fx.duration(pf) && Fx.duration(pf) >= 5 && Fx.duration(pf) <= 12);
t("bonne réponse : de 1 à 3 s ; mauvaise : moins de 1,5 s", Fx.duration(pc) >= 1 && Fx.duration(pc) <= 3 && Fx.duration(pw) < 1.5);
t("événements triés dans le temps, temps ≥ 0", [pc, pw, pf].every(p => p.every((e, i) => e.at >= 0 && (i === 0 || p[i - 1].at <= e.at))));
t("volumes prudents (≤ 0,3) et fréquences audibles (30 Hz – 4 kHz)", [pc, pw, pf].every(p => p.every(e => e.vol > 0 && e.vol <= 0.3 && (e.f === undefined || (e.f >= 60 && e.f <= 800)) && (e.f0 === undefined || (e.f0 >= 250 && e.f1 <= 3000 && e.f1 > e.f0)))));
t("le sifflement monte, l'explosion suit le sifflement", pc.filter(e => e.k === "whistle").every(w => w.f1 > w.f0) && (function () { const w = pc.find(e => e.k === "whistle"), b = pc.find(e => e.k === "boom"); return Math.abs(b.at - (w.at + w.dur)) < 1e-9; })());
t("déterministe avec le même germe, différent avec un autre", JSON.stringify(Fx.plan("finale", Fx.rng32(7))) === JSON.stringify(Fx.plan("finale", Fx.rng32(7))) && JSON.stringify(Fx.plan("finale", Fx.rng32(7))) !== JSON.stringify(Fx.plan("finale", Fx.rng32(8))));
t("type inconnu → recette « bonne réponse »", Fx.plan("zzz", R()).length === pc.length);
t("explosion de la mauvaise réponse plus grave et plus faible que celle de la bonne", pw.find(e => e.k === "boom").f < pc.find(e => e.k === "boom").f * 1.1 && pw.find(e => e.k === "boom").vol < pc.find(e => e.k === "boom").vol);
/* --- gerbes visuelles --- */
const bc = Fx.bursts("correct", R()), bw = Fx.bursts("wrong", R()), bf = Fx.bursts("finale", R());
t("gerbes : bonne = 3, mauvaise = 1, finale = 14", bc.length === 3 && bw.length === 1 && bf.length === 14);
t("gerbes : positions dans l'écran (0–1), nombre d'étincelles raisonnable", [bc, bw, bf].every(a => a.every(b => b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1 && b.n >= 10 && b.n <= 120 && b.at >= 0)));
t("gerbes : le total d'étincelles reste sous le plafond du canvas (700) pour une réponse", bc.reduce((a, b) => a + b.n, 0) <= 700);
/* --- partage --- */
const items = [
  { n: 1, q: "Capitale de la France ?", cat: "🌍 Géo", state: "ok", answers: ["Paris", "Rome", "Lyon", "Nice"], correct: 0, lines: [{ k: "answer", t: "La bonne réponse : « Paris »." }, { k: "sentence", t: "La capitale de la France est Paris." }] },
  { n: 2, q: "Combien de pattes a une araignée ?", cat: "🕷️ Animaux", state: "bad", answers: ["8", "6", "10", "4"], correct: 0, lines: [{ k: "answer", t: "La bonne réponse : « 8 »." }, { k: "coda", t: "Pas grave." }] },
  { n: 3, q: "Quel est cet animal ?", cat: "🐾", state: "none", media: true, answers: ["Chat", "Chien", "Lapin", "Ours"], correct: 0, lines: [] },
  { n: 4, q: "Quelle est la plus grande planète ?", cat: "🪐 Espace", state: "none", answers: ["Jupiter", "Saturne", "Mars", "Vénus"], correct: 0, lines: [{ k: "answer", t: "La bonne réponse : « Jupiter »." }, { k: "quote", t: "Ce que dit le cours :", quote: "Jupiter est géante." }] }
];
const sh = Fi.shareText(items, { score: 12500, url: "https://x.test/jeu/" });
t("partage : « 1/4 », carrés 🟩🟥⬜⬜, score et lien", sh.startsWith("🎯 Qui suis-je ? 1/4") && sh.includes("🟩🟥⬜⬜") && /12.500 pts/.test(sh) && sh.endsWith("https://x.test/jeu/"));
t("partage : sans faute → trophée ; sans question → vide", /sans faute ! 🏆/.test(Fi.shareText([items[0]])) && Fi.shareText([]) === "" && Fi.shareText(null) === "");
t("partage : retour à la ligne tous les 10 carrés", Fi.shareText(Array.from({ length: 23 }, (_, i) => ({ n: i + 1, q: "Q" + i, state: "ok" }))).split("\n")[1].length === 20 /* 10 émojis de 2 unités */);
const ft = Fi.fichesText(items, { date: "31/10/2026" });
t("fiches : titre, date, chaque question avec ✅ ❌ ⏱️ et ses lignes", ft.startsWith("FICHES DE RÉVISION — Qui suis-je ? — 31/10/2026") && ft.includes("✅ 1. Capitale de la France ?  [🌍 Géo]") && ft.includes("❌ 2. Combien") && ft.includes("⏱️ 3. Quel est cet animal") && ft.includes("   - La capitale de la France est Paris."));
t("fiches : les citations du cours sont reprises, bilan « À revoir : 3 questions sur 4 »", ft.includes("Ce que dit le cours : « Jupiter est géante. »") && /À revoir : 3 questions sur 4\./.test(ft));
t("fiches : tout juste → « Aucune erreur »", /Aucune erreur/.test(Fi.fichesText([items[0]])));
t("fiches : entrées invalides ignorées", Fi.fichesText([null, 3, { q: "" }, items[0]]).includes("1. Capitale") && Fi.fichesText([null]) === "");
/* --- rattrapage --- */
const deck = Fi.retryDeck(items, Fi.rng32(5));
t("rattrapage : seulement les ratées/sans réponse, sans les questions à image", deck.length === 2 && deck.every(d => d.n === 2 || d.n === 4));
t("rattrapage : la bonne réponse reste retrouvable après mélange", deck.every(d => { const src = items.find(i => i.n === d.n); return d.answers[d.correct] === src.answers[src.correct] && d.answers.length === 4 && new Set(d.answers).size === 4; }));
t("rattrapage : pas d'encouragement (coda) dans l'explication, 5 lignes au plus", deck.every(d => d.lines.length <= 5 && !d.lines.some(l => l.k === "coda")));
t("rattrapage : déterministe avec une graine, jamais plus de 20 questions", JSON.stringify(Fi.retryDeck(items, Fi.rng32(5))) === JSON.stringify(deck) && Fi.retryDeck(Array.from({ length: 50 }, (_, i) => ({ n: i, q: "Q" + i, state: "bad", answers: ["a", "b"], correct: 0 })), Fi.rng32(1)).length === 20);
t("rattrapage : tout juste → paquet vide ; réponses absentes ignorées", Fi.retryDeck([items[0]]).length === 0 && Fi.retryDeck([{ n: 1, q: "Q", state: "bad", answers: [], correct: 0 }]).length === 0);
t("nom de fichier sûr", Fi.fileName("2026-10-31") === "fiches-qui-suis-je-2026-10-31.txt" && Fi.fileName("../../etc/passwd") === "fiches-qui-suis-je-etc-passwd.txt" && Fi.fileName("") === "fiches-qui-suis-je.txt");
console.log("Feux d'artifice et fiches : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
