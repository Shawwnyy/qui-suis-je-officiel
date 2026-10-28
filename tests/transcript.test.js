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

/* ---- ODT : archive ZIP + XML valides ---- */
const zlib = require("zlib");
function readZip(bytes) {
  const b = Buffer.from(bytes), files = [];
  const eocd = b.length - 22;
  ok(b.readUInt32LE(eocd) === 0x06054b50, "ODT : fin d'archive (EOCD) en place");
  const n = b.readUInt16LE(eocd + 10), cdSize = b.readUInt32LE(eocd + 12), cdOff = b.readUInt32LE(eocd + 16);
  ok(cdOff + cdSize === eocd, "ODT : répertoire central juste avant la fin d'archive");
  let p = cdOff;
  for (let i = 0; i < n; i++) {
    ok(b.readUInt32LE(p) === 0x02014b50, "ODT : entrée " + i + " du répertoire central");
    const crc = b.readUInt32LE(p + 16), size = b.readUInt32LE(p + 24), nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nl).toString("utf8"), method = b.readUInt16LE(p + 10);
    ok(b.readUInt32LE(off) === 0x04034b50, "ODT : en-tête local de " + name);
    const lnl = b.readUInt16LE(off + 26), lel = b.readUInt16LE(off + 28), data = b.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + size);
    ok(method === 0 && data.length === size && zlib.crc32(data) === crc, "ODT : " + name + " non compressé, taille et CRC32 exacts");
    files.push({ name, data }); p += 46 + nl + el + cl;
  }
  return files;
}
/* vérificateur XML minimal (balises appariées, attributs entre guillemets, entités connues, pas de caractère de contrôle) */
function xmlProblems(xml) {
  const issues = [], stack = [];
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(xml)) issues.push("caractère de contrôle");
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, "");
  let last = 0;
  for (const m of body.matchAll(/<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g)) {
    const between = body.slice(last, m.index);
    if (/<|>/.test(between)) issues.push("chevron brut près de « " + between.slice(0, 30) + " »");
    if (/&(?!(amp|lt|gt|quot|apos);)/.test(between + m[3])) issues.push("& non échappé près de « " + between.slice(0, 30) + " »");
    last = m.index + m[0].length;
    if (m[1]) { if (stack.pop() !== m[2]) issues.push("balise fermante inattendue " + m[2]); } else if (!m[4]) stack.push(m[2]);
  }
  if (/<|>/.test(body.slice(last))) issues.push("fin de document invalide");
  if (stack.length) issues.push("balises non fermées : " + stack.join(","));
  return issues;
}
const oLines = [
  { id: "a", name: "Léo & <Cam>", text: "Salut <b>tout</b> le monde & \"co\" 😀 œuvre\u0001", at: 5000, ts: base },
  { id: "b", name: "Cam", text: "la géographie c'est super, la géographie !", at: 65000, ts: base + 60000 },
  { id: "a", name: "Léo & <Cam>", text: "géographie et histoire de Napoléon", at: 130000, ts: base + 125000 }
];
const odt = T.makeOdt({ room: "482913", startedAt: base, endedAt: base + 200000, lines: oLines, talk: [{ name: "Cam", ms: 30000 }] });
const zf = readZip(odt);
ok(zf[0].name === "mimetype" && zf[0].data.toString() === "application/vnd.oasis.opendocument.text", "ODT : « mimetype » en premier, avec le bon type");
ok(Buffer.from(odt).slice(30, 38).toString() === "mimetype", "ODT : « mimetype » lisible à l'octet 30 (détection par les logiciels)");
ok(["META-INF/manifest.xml", "content.xml", "styles.xml", "meta.xml"].every(n => zf.some(f => f.name === n)), "ODT : manifest, contenu, styles et métadonnées présents");
for (const f of zf.filter(f => /\.xml$/.test(f.name))) { const pr = xmlProblems(f.data.toString("utf8")); ok(pr.length === 0, "ODT : " + f.name + " est du XML bien formé" + (pr.length ? " (" + pr[0] + ")" : "")); }
const content = zf.find(f => f.name === "content.xml").data.toString("utf8");
ok(/Transcription du chat vocal/.test(content) && /Salle 482913/.test(content), "ODT : titre et salle");
ok(/Léo &amp; &lt;Cam&gt;/.test(content) && /Salut &lt;b&gt;tout&lt;\/b&gt; le monde &amp; &quot;co&quot; 😀 œuvre/.test(content) && !/\u0001/.test(content), "ODT : texte échappé (&, <, >, guillemets), emoji et accents conservés, contrôles retirés");
ok(/géographie<\/text:p><\/table:table-cell><table:table-cell[^>]*><text:p[^>]*>3<\/text:p>/.test(content), "ODT : tableau des mots les plus dits (géographie × 3)");
ok(/█/.test(content) && /Mots les plus dits/.test(content) && /Qui parle le plus/.test(content) && /Activité au fil de l'appel/.test(content) && /Transcription complète/.test(content), "ODT : sections et barres de graphique");
ok(/\[\d\d:\d\d:\d\d\]/.test(content) && content.indexOf("Salut") < content.indexOf("histoire de Napoléon"), "ODT : transcription complète dans l'ordre, avec l'heure réelle");
ok(/<\/office:document-content>$/.test(content), "ODT : contenu complet");
for (const [label, data] of [["vide", {}], ["null", null], ["bizarre", { lines: [{ id: 1, name: null, text: "bonjour", at: NaN, ts: NaN }, { text: 5 }, null] }], ["énorme", { room: "1", lines: mk(600), talk: [null, { name: "x", ms: "abc" }] }]]) {
  const z = readZip(T.makeOdt(data)); const c = z.find(f => f.name === "content.xml").data.toString("utf8");
  ok(xmlProblems(c).length === 0, "ODT " + label + " : XML bien formé");
}
ok(T.crc32(Buffer.from("123456789")) === 0xCBF43926, "crc32 : valeur de référence (« 123456789 »)");
ok(T.utf8("é😀").length === 6, "utf8 : é = 2 octets, emoji = 4 octets");

/* ---- rapport d'appel sans transcription ---- */
const rep0 = { room: "482913", startedAt: base, endedAt: base + 754000, participants: ["Léo", "Cam", "Noé"], talk: [{ name: "Léo", ms: 95000 }, { name: "Cam", ms: 143000 }], lines: [] };
const rp = checkPdf(T.makePdf(rep0), "Rapport sans texte");
ok(/Rapport d'appel du chat vocal/.test(rp.s) && /Au vocal : L\\351o, Cam, No\\351/.test(rp.s) && /Temps de parole mesur/.test(rp.s) && !/Transcription compl/.test(rp.s) && !/Mots les plus dits/.test(rp.s), "Rapport sans texte : titre, participants, temps de parole ; ni mots ni transcription vides");
ok(/12:34/.test(rp.s) && /2:23/.test(rp.s), "Rapport sans texte : durée (12:34) et temps de parole (2:23) affichés");
checkPdf(T.makePdf({ room: "1", participants: ["Seul"], talk: [], lines: [] }), "Rapport sans texte ni parole");
checkPdf(T.makePdf({ participants: [null, 5, "ok"], talk: [{ name: "x", ms: 2000 }], lines: [] }), "Rapport participants bizarres");
const rz = readZip(T.makeOdt(rep0)), rc = rz.find(f => f.name === "content.xml").data.toString("utf8");
ok(xmlProblems(rc).length === 0 && /Rapport d'appel du chat vocal/.test(rc) && /Au vocal : <\/text:span>Léo, Cam, Noé/.test(rc) && /Temps de parole/.test(rc) && !/Transcription complète/.test(rc), "ODT rapport sans texte : XML valide, participants, temps de parole, rien de vide");
ok(xmlProblems(readZip(T.makeOdt({ lines: [], participants: ["a<b"] })).find(f => f.name === "content.xml").data.toString("utf8")).length === 0, "ODT rapport minimal : XML valide");
ok(/Transcription du chat vocal/.test(checkPdf(T.makePdf({ room: "1", lines: mk(2), participants: ["Léo"] }), "PDF avec texte + participants").s), "avec du texte, le titre reste « Transcription du chat vocal »");

console.log("Transcription (stats + PDF) : " + (checks - fails) + " / " + checks + " OK" + (fails ? ", " + fails + " échec(s)" : ""));
process.exit(fails ? 1 : 0);
