/* Tests des statistiques de transcription et du générateur de PDF (sans bibliothèque).  Lancer :  node tests/transcript.test.js
   Le PDF est vérifié structurellement : en-tête, table des références (xref) exacte, longueurs de flux, nombre de pages. */
"use strict";
const T = require("../js/voicechat/transcript.js");
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("ÉCHEC : " + m); } };
const asText = bytes => Buffer.from(bytes).toString("latin1");

/* ---- mots ---- */
ok(JSON.stringify(T.tokenize("Aujourd'hui, c'est l'Œuf… peut-être 42 !")) === JSON.stringify(["aujourdhui", "c", "est", "l", "œuf", "peutêtre"]), "tokenize : minuscules, accents, apostrophes, chiffres ignorés (" + JSON.stringify(T.tokenize("Aujourd'hui, c'est l'Œuf… peut-être 42 !")) + ")");
ok(T.tokenize(null).length === 0 && T.tokenize(undefined).length === 0 && T.tokenize(42).length === 0 && T.tokenize("!!! ??").length === 0, "tokenize : entrées vides ou invalides");
ok(JSON.stringify(T.significant(T.tokenize("le chat et la souris dans les maisons que the dog und el"))) === JSON.stringify(["chat", "souris", "maisons", "dog"]), "significant : mots-outils français, anglais, allemand, espagnol écartés, 3 lettres minimum");

const L = (id, name, text, at) => ({ id, name, text, at, ts: 1000000 + at });
const lines = [
  L("a", "Léo", "La géographie c'est super, la géographie !", 5000), L("b", "Cam", "Moi j'adore la géographie et l'histoire", 40000),
  L("a", "Léo", "Napoléon et l'histoire de France", 70000), L("b", "Cam", "", 80000), L("c", "Noé", "Napoléon Napoléon Napoléon", 130000),
  null, { id: "x", name: "Zed" }, { id: "x", name: "Zed", text: 42 }
];
const st = T.analyze(lines);
ok(st.phrases === 4 && st.speakers.length === 3, "analyze : phrases et participants comptés, lignes invalides ignorées (" + st.phrases + " phrases)");
ok(st.top[0][0] === "napoléon" && st.top[0][1] === 4 && st.top[1][0] === "géographie" && st.top[1][1] === 3, "analyze : mots les plus dits triés par fréquence (" + JSON.stringify(st.top.slice(0, 3)) + ")");
ok(st.top.every((t, i, a) => i === 0 || a[i - 1][1] > t[1] || (a[i - 1][1] === t[1] && a[i - 1][0] <= t[0])), "analyze : égalités départagées par ordre alphabétique");
const leo = st.speakers.find(p => p.key === "a"), noe = st.speakers.find(p => p.key === "c");
ok(leo.phrases === 2 && leo.words === 13 && leo.top[0][0] === "géographie" && leo.top[0][1] === 2, "analyze : chaque participant a ses mots préférés");
ok(noe.words === 3 && noe.top[0][0] === "napoléon" && noe.top[0][1] === 3, "analyze : mots d'un participant");
ok(st.speakers[0].words >= st.speakers[1].words && st.speakers[1].words >= st.speakers[2].words, "analyze : participants triés par nombre de mots");
ok(st.words === st.speakers.reduce((s, p) => s + p.words, 0), "analyze : total des mots cohérent");
ok(st.timeline.counts.length >= 3 && st.timeline.counts.reduce((a, b) => a + b, 0) === st.words, "analyze : l'activité répartit tous les mots dans le temps (" + st.timeline.counts.join(",") + ")");
const long = Array.from({ length: 500 }, (_, i) => L("a", "Léo", "mot" + (i % 7) + " blabla", i * 60000));
ok(T.analyze(long).timeline.counts.length <= 25, "analyze : 24 tranches de temps au plus, même pour un appel de 8 heures (" + T.analyze(long).timeline.counts.length + ")");
ok(T.analyze([]).phrases === 0 && T.analyze(undefined).speakers.length === 0 && T.analyze("x").top.length === 0, "analyze : entrée vide ou invalide");

/* ---- texte PDF ---- */
ok(T.pdfString("a (b) \\ c") === "(a \\(b\\) \\\\ c)", "pdfString : parenthèses et antislash protégés");
ok(T.pdfString("é€œ") === "(\\351\\200\\234)", "pdfString : accents et € en WinAnsi (" + T.pdfString("é€œ") + ")");
ok(T.pdfString("a😀b") === "(ab)" && T.pdfString("a中b") === "(a?b)", "pdfString : emoji retirés, caractères non gérés remplacés par « ? »");
ok(/^[\x20-\x7e]*$/.test(T.pdfString("Ça\n\tva ? « oui » — œuvre 😀 ☺")), "pdfString : jamais de caractère hors ASCII dans le fichier");
ok(T.widthOf("iiii", 10, false) < T.widthOf("MMMM", 10, false) && T.widthOf("", 10) === 0 && T.widthOf("é", 10) === T.widthOf("e", 10), "widthOf : i plus étroit que M, é = e, vide = 0");
ok(T.widthOf("abc", 10, true) > T.widthOf("abc", 10, false), "widthOf : le gras est plus large");
const wrapped = T.wrapText("un deux trois quatre cinq six sept huit neuf dix", 10, false, 70, 70);
ok(wrapped.length > 1 && wrapped.every(l => T.widthOf(l, 10, false) <= 70.01) && wrapped.join(" ") === "un deux trois quatre cinq six sept huit neuf dix", "wrapText : lignes dans la largeur, aucun mot perdu");
const giant = T.wrapText("x".repeat(300), 10, false, 100, 100);
ok(giant.length > 1 && giant.every(l => T.widthOf(l, 10, false) <= 100.01) && giant.join("") === "x".repeat(300), "wrapText : un mot géant est coupé sans rien perdre");
ok(T.wrapText("", 10, false, 50, 50).length === 1 && T.wrapText("   ", 10, false, 50, 50)[0] === "", "wrapText : texte vide");

/* ---- PDF complet ---- */
function checkPdf(bytes, label, expectPages) {
  const s = asText(bytes);
  ok(s.startsWith("%PDF-1.4\n") && s.trimEnd().endsWith("%%EOF"), label + " : en-tête et fin de fichier");
  ok(/^[\x00-\xff]*$/.test(s) && !/[\x80-\xff]/.test(s.slice(s.indexOf("\n", 9) + 1)), label + " : contenu en ASCII pur (hors ligne de commentaire binaire)");
  const sx = +s.match(/startxref\n(\d+)\n%%EOF/)[1];
  ok(s.slice(sx, sx + 4) === "xref", label + " : startxref pointe sur la table xref");
  const n = +s.match(/xref\n0 (\d+)\n/)[1], entries = [...s.slice(sx).matchAll(/(\d{10}) 00000 n \n/g)].map(m => +m[1]);
  ok(entries.length === n - 1, label + " : une entrée xref par objet");
  ok(entries.every((off, i) => s.slice(off).startsWith((i + 1) + " 0 obj\n")), label + " : chaque entrée xref pointe exactement sur son objet");
  const lens = [...s.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)];
  ok(lens.length > 0 && lens.every(m => +m[1] === m[2].length), label + " : /Length exact pour chaque flux (" + lens.length + " pages)");
  const pages = +s.match(/\/Count (\d+)/)[1];
  ok(pages === lens.length && (expectPages == null || pages === expectPages(pages)), label + " : /Count = nombre de pages (" + pages + ")");
  ok((s.match(/Page \d+ \/ (\d+)/g) || []).every(x => x.endsWith("/ " + pages)), label + " : pied de page « Page i / N » correct");
  return { s, pages };
}
const base = new Date(2026, 9, 28, 18, 31, 2).getTime();
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: "p" + (i % 3), name: ["Léo", "Cam", "Noé"][i % 3], text: "La géographie (capitales) et l'histoire de Napoléon \\ n°" + i + " 😀 œuvre « test » — fin", at: i * 20000, ts: base + i * 20000 }));
let r = checkPdf(T.makePdf({ room: "482913", startedAt: base, endedAt: base + 3600000, lines: mk(12), talk: [{ name: "Léo", ms: 65000 }, { name: "Cam", ms: 30000 }] }), "PDF court");
ok(/Transcription du chat vocal/.test(r.s) && /Salle 482913/.test(r.s) && /\/BaseFont \/Helvetica-Bold/.test(r.s), "PDF court : titre, salle et police en gras présents");
ok(/\(18:31:02\)|\[18:31:02\]/.test(r.s.replace(/\\\[|\\\]/g, m => m.slice(1))) || /18:31:02/.test(r.s), "PDF court : heures réelles des phrases");
const big = checkPdf(T.makePdf({ room: "111111", lines: mk(400), talk: [] }), "PDF long", p => p);
ok(big.pages >= 8, "PDF long : 400 phrases réparties sur plusieurs pages (" + big.pages + ")");
checkPdf(T.makePdf({ room: "1", lines: [{ id: "a", name: "A".repeat(80), text: "x".repeat(2000), at: 0, ts: base }] }), "PDF mot géant");
checkPdf(T.makePdf({}), "PDF vide");
checkPdf(T.makePdf(null), "PDF null");
checkPdf(T.makePdf({ lines: [{ id: 1, name: null, text: "bonjour", at: NaN, ts: NaN }, { text: 5 }, null] }), "PDF données bizarres");
checkPdf(T.makePdf({ room: "1", lines: mk(3), talk: [null, { name: "x", ms: "abc" }, { name: "y", ms: -5 }] }), "PDF temps de parole invalide");
/* aucune erreur quand un seul participant, ou aucun mot « intéressant » */
checkPdf(T.makePdf({ room: "1", lines: [{ id: "a", name: "Seul", text: "le la les un", at: 0, ts: base }] }), "PDF sans mot intéressant");

console.log("Transcription (stats + PDF) : " + (checks - fails) + " / " + checks + " OK" + (fails ? ", " + fails + " échec(s)" : ""));
process.exit(fails ? 1 : 0);
