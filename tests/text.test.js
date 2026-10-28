/* Tests des graphiques « lettres et mots les plus écrits » (chat + questions). Lancer : node tests/text.test.js */
const A = require("../js/stats/analysis.js");
global.V40Analysis = A;
const P = require("../js/stats/pdf.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }

/* --- découpage --- */
const tk = A.tokenize("Été à l'école : ÇA va ? Œuf & cœur, Noël !");
t("26 compteurs", tk.l.length === 26);
t("accents ramenés à la lettre de base (é→e, ç→c)", tk.l[4] > 0 && tk.l[2] >= 2);
t("œ compté comme o+e", A.tokenize("œ").l[14] === 1 && A.tokenize("œ").l[4] === 1);
t("l'école → 2 mots (apostrophe = séparateur)", A.tokenize("l'école").w.join("|") === "l|école");
t("chiffres et ponctuation ignorés", A.tokenize("123 !!! ???").l.every(n => n === 0) && A.tokenize("123 !!! ???").w.length === 0);
t("texte non-chaîne sans plantage", A.tokenize(null).w.length === 0 && A.tokenize(42).w.length === 0);
t("mot géant ignoré (> 24 lettres)", A.tokenize("a".repeat(40)).w.length === 0);

/* --- accumulation du chat --- */
const acc = A.newChat();
A.addChat(acc, "Bonjour la team, bienvenue !");
A.addChat(acc, "Bienvenue à tous, le café est prêt");
A.addChat(acc, "bienvenue encore");
t("3 messages comptés", acc.m === 3);
t("« bienvenue » compté 3 fois (casse ignorée)", acc.w.bienvenue === 3);
t("mots d'une lettre non comptés", acc.w.a === undefined && acc.w.l === undefined);
const big = A.newChat(); for (let i = 0; i < 900; i++) A.addChat(big, "mot" + String.fromCharCode(97 + i % 26) + String.fromCharCode(97 + (i / 26 | 0) % 26) + String.fromCharCode(97 + (i / 676 | 0)));
t("dictionnaire borné en mémoire (≤ 600 mots)", Object.keys(big.w).length <= 600);

/* --- normalisation (réseau / stockage) --- */
const nc = A.normalizeChat(acc);
t("forme stockée = paires triées", Array.isArray(nc.w) && nc.w[0][0] === "bienvenue" && nc.w[0][1] === 3);
t("26 lettres, entiers positifs", nc.l.length === 26 && nc.l.every(n => Number.isInteger(n) && n >= 0));
t("aucun message en clair dans la forme stockée", JSON.stringify(nc).indexOf("Bonjour la team") < 0);
t("idempotent (paires → paires)", JSON.stringify(A.normalizeChat(nc)) === JSON.stringify(nc));
t("entrée hostile rejetée / nettoyée", A.normalizeChat("x") === null && A.normalizeChat(null) === null
  && A.normalizeChat({ m: 1e12, l: ["a", -5, 1e99], w: [["<script>alert(1)</script>", 5], ["ok", -3], [42, 1], ["bon", 2]] }).w.map(e => e[0]).join() === "scriptalertscript,bon");
t("compteurs hostiles bornés", (() => { const o = A.normalizeChat({ m: 1e12, l: ["a", -5, 1e99], w: [] }); return o.m <= 100000 && o.l[0] === 0 && o.l[1] === 0 && o.l[2] <= 10000000; })());
const many = []; for (let i = 0; i < 500; i++) many.push(["mot" + String.fromCharCode(97 + i % 26) + String.fromCharCode(97 + (i / 26 | 0)), 1 + i]);
t("au plus 120 mots conservés", A.normalizeChat({ m: 1, l: [], w: many }).w.length === 120);
t("journal : Ch conservé par normalize()", A.normalize({ P: [{ i: "a", n: "A" }], R: [], Ch: acc }).Ch.m === 3);
t("journal sans Ch : pas de champ Ch", A.normalize({ P: [{ i: "a", n: "A" }], R: [] }).Ch === undefined);

/* --- statistiques --- */
const log = A.normalize({ id: "x", P: [{ i: "a", n: "A" }, { i: "b", n: "B" }], R: [
  { q: "Quelle est la capitale de la France ?", c: "G", d: "facile", r: [[1, 2, 500], [1, 3, 500]] },
  { q: "Quelle est la capitale de l'Italie ?", c: "G", d: "facile", r: [[1, 2, 500], [1, 3, 500]] }], Ch: acc });
const all = A.textStats(log, "all", false, 5), chat = A.textStats(log, "chat", false, 5), qs = A.textStats(log, "q", false, 5), com = A.textStats(log, "all", true, 5);
t("lettres triées par fréquence décroissante", all.letters.every((x, i) => i === 0 || all.letters[i - 1].n >= x.n));
t("parts = 100 %", Math.abs(all.letters.reduce((s, x) => s + x.share, 0) - 1) < 1e-9);
t("« e » est la lettre la plus fréquente", all.letters[0].ch === "E");
t("source « chat » : 3 messages, 0 question", chat.messages === 3 && chat.questions === 0);
t("source « q » : 2 questions, 0 message", qs.messages === 0 && qs.questions === 2);
t("tout = chat + questions (lettres)", all.totalLetters === chat.totalLetters + qs.totalLetters);
t("mot le plus écrit (chat) : bienvenue ×3", chat.words[0].w === "bienvenue" && chat.words[0].n === 3);
t("« capitale » ×2 dans les questions", qs.words[0].w === "capitale" && qs.words[0].n === 2);
t("mots courants masqués par défaut", !all.words.some(x => ["la", "le", "est", "de", "quelle"].includes(x.w)) || all.words.every(x => x.w !== "est"));
t("mots courants gardés sur demande", com.words.some(x => x.w === "est" || x.w === "de" || x.w === "la"));
t("top limité", A.textStats(log, "all", true, 3).words.length === 3);
t("journal vide : 0 lettre, pas de plantage", (() => { const e = A.textStats(A.normalize({ P: [{ i: "a", n: "A" }], R: [] }), "all", false, 5); return e.totalLetters === 0 && e.letters.length === 0 && e.words.length === 0; })());
t("source inconnue → tout", A.textStats(log, "zzz", false, 5).src === "all");
t("forme « en cours » (mots en dictionnaire) acceptée", A.textStats({ R: [], Ch: acc }, "chat", false, 5).words[0].w === "bienvenue");

/* --- PDF clair / sombre --- */
["light", "dark"].forEach(theme => {
  const pdf = Buffer.from(P.build(log, { theme })).toString("latin1");
  t(theme + " : titre « Lettres les plus écrites »", pdf.includes("Lettres les plus \\351crites") || pdf.includes("Lettres les plus écrites"));
  t(theme + " : titre « Mots les plus écrits »", pdf.includes("Mots les plus \\351crits") || pdf.includes("Mots les plus écrits"));
  t(theme + " : PDF valide", pdf.startsWith("%PDF-1.") && pdf.trimEnd().endsWith("%%EOF"));
});
const none = Buffer.from(P.build(A.normalize({ id: "y", P: [{ i: "a", n: "A" }], R: [{ q: "", c: "", d: "facile", r: [[1, 1, 100]] }] }), { theme: "light" })).toString("latin1");
t("sans texte : pas de section vide", !none.includes("Lettres les plus"));

/* ---------- Rapport « mots et lettres » (onglet dédié) ---------- */
{
  const A2 = require("../js/stats/analysis.js");
  const log = A2.normalize({ id: "rp", P: [{ n: "A" }, { n: "B" }], R: [{ q: "Quel est le plus grand océan du monde ?", c: "Géo", d: "facile", m: 0, r: [[1, 3, 500], [2, 4, 0]] }, { q: "Quel océan est le plus grand ?", c: "Géo", d: "facile", m: 0, r: [[1, 2, 500], [1, 3, 500]] }],
    Ch: { m: 3, l: (() => { const a = new Array(26).fill(0); a[4] = 9; a[0] = 4; return a; })(), w: [["salut", 3], ["bravo", 2], ["le", 4]] } });
  const R = A2.textReport(log, false);
  const tt = t;
  tt("rapport : 26 lettres dans l'ordre alphabétique", R.alpha.length === 26 && R.alpha[0].ch === "A" && R.alpha[25].ch === "Z");
  tt("rapport : voyelles + consonnes = total des lettres", R.vowels + R.consonants === R.all.totalLetters && R.all.totalLetters > 0);
  tt("rapport : part des voyelles entre 0 et 1", R.vowelShare > 0 && R.vowelShare < 1);
  tt("rapport : phrases en français avec lettre n° 1 et mot n° 1", R.lines.length >= 4 && /lettre la plus écrite est/.test(R.lines.join(" ")) && /mot le plus écrit est/.test(R.lines.join(" ")));
  tt("rapport : mots courants masqués (le absent), mot n° 1 cohérent", !R.all.words.some(x => x.w === "le") && R.all.words[0].n === Math.max.apply(null, R.all.words.map(x => x.n)));
  tt("rapport : lettres jamais écrites listées (ex. Z, W)", R.missing.indexOf("Z") >= 0 && /jamais écrites/.test(R.lines.join(" ")));
  tt("rapport : chat et questions séparés", R.chat.messages === 3 && R.q.questions === 2 && R.chat.letters[0].ch === "E");
  const txt = A2.textReportTxt(log, false, "Titre");
  tt("rapport .txt : titre, lettres, mots, mention des comptages", txt.startsWith("Titre") && /LETTRES/.test(txt) && /MOTS LES PLUS/.test(txt) && /jamais les messages/.test(txt));
  tt("rapport .txt : aucun message brut (« Quel est le plus grand » absent)", !/Quel est le plus grand/.test(txt));
  const R0 = A2.textReport(A2.normalize({ id: "z", P: [{ n: "A" }], R: [{ q: "", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }), false);
  tt("rapport sans texte : aucune phrase, aucun plantage", R0.lines.length === 0 && R0.alpha.length === 26);
  tt("rapport .txt sans texte : message clair", /Aucun texte/.test(A2.textReportTxt(A2.normalize({ id: "z", P: [{ n: "A" }], R: [{ q: "", c: "x", d: "facile", m: 0, r: [[1, 2, 500]] }] }), false)));
  const R1 = A2.textReport(log, true);
  tt("rapport : avec mots courants, « le » apparaît", R1.all.words.some(x => x.w === "le"));
}

console.log("Lettres et mots : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
