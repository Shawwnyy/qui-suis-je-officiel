/* Tests des formats de cours : PowerPoint, ODP, tableurs, EPUB, RTF, HTML, sous-titres, liens.
   Lancer : NODE_PATH=<dossier contenant jszip> node tests/formats.test.js   (JSZip lit les archives des fichiers de test) */
const fs = require("fs"), path = require("path");
const F = require("../js/qcm/formats.js");
let JSZip = null; try { JSZip = require("jszip"); } catch (e) { console.log("(jszip introuvable : tests d'archives ignorés — définis NODE_PATH)"); }
let ok = 0, ko = 0;
function t(label, cond, extra) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label, extra === undefined ? "" : "→ " + String(extra).slice(0, 300)); } }
const fx = (n) => path.join(__dirname, "fixtures", n);
async function entries(file, filter) {
  const zip = await JSZip.loadAsync(fs.readFileSync(fx(file))), out = {};
  for (const name of Object.keys(zip.files)) if (!zip.files[name].dir && filter(name)) out[name] = await zip.files[name].async("string");
  return out;
}
const has = (txt, ...w) => w.every((x) => txt.toLowerCase().includes(x.toLowerCase()));

(async () => {
  /* --- reconnaissance des types --- */
  [["cours.pdf", "pdf"], ["a.PPTX", "pptx"], ["a.odp", "odp"], ["a.ods", "ods"], ["a.xlsx", "xlsx"], ["a.mp3", "audio"], ["a.WAV", "audio"], ["a.m4a", "audio"], ["a.mp4", "video"], ["a.mov", "video"],
    ["a.webm", "video"], ["a.srt", "subs"], ["a.vtt", "subs"], ["a.epub", "epub"], ["a.rtf", "rtf"], ["a.htm", "html"], ["a.md", "md"], ["a.png", "image"], ["a.doc", "unsupported"], ["a.ppt", "unsupported"], ["a.key", "unsupported"]]
    .forEach(([n, k]) => t("type de " + n + " = " + k, F.kindOf(n, "") === k, F.kindOf(n, "")));
  t("type par MIME audio", F.kindOf("fichier", "audio/mpeg") === "audio");
  t("type par MIME vidéo", F.kindOf("fichier", "video/mp4") === "video");
  t("conseil pour .doc", /docx|odt/.test(F.unsupportedAdvice("x.doc")));
  t("conseil pour .ppt", /pptx|odp/.test(F.unsupportedAdvice("x.ppt")));
  t("conseil pour .key", /Keynote/.test(F.unsupportedAdvice("x.key")));

  /* --- PowerPoint --- */
  if (JSZip) {
    const p = F.pptx(await entries("cours-biologie.pptx", (n) => /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(n)));
    t("pptx : diapositives numérotées", /Diapositive 1\n/.test(p) && /Diapositive 6\n/.test(p), p.slice(0, 200));
    t("pptx : titre et texte", has(p, "Partie 1 : cellule", "Robert Hooke", "procaryotes"), p.slice(0, 400));
    t("pptx : notes de l'orateur", has(p, "Notes : Note orale"), p);
    t("pptx : pas de balises", !/<a:|&amp;|&#/.test(p));

    const od = F.odp((await entries("cours-biologie.odp", (n) => n === "content.xml"))["content.xml"]);
    t("odp : diapositives", /Diapositive 1\n/.test(od) && /Diapositive 6\n/.test(od), od.slice(0, 200));
    t("odp : texte", has(od, "Partie 1 : cellule", "Robert Hooke"), od.slice(0, 400));
    t("odp : notes", has(od, "Note orale"), od);

    const x = F.xlsx(await entries("cours-biologie.xlsx", (n) => /^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/.test(n)));
    t("xlsx : feuilles nommées", has(x, "Feuille « Organites »", "Feuille « Découvertes »"), x.slice(0, 200));
    t("xlsx : lignes avec séparateur", has(x, "Mitochondrie | Produit l'énergie (ATP) de la cellule | oui"), x.slice(0, 500));
    t("xlsx : nombres", has(x, "1665 | Robert Hooke | Observe et nomme la cellule"), x);

    const s = F.ods((await entries("cours-biologie.ods", (n) => n === "content.xml"))["content.xml"]);
    t("ods : feuilles nommées", has(s, "Feuille « Organites »", "Feuille « Découvertes »"), s.slice(0, 200));
    t("ods : lignes", has(s, "Mitochondrie | Produit l'énergie (ATP) de la cellule | oui"), s.slice(0, 500));
    t("ods : nombres", has(s, "1665 | Robert Hooke"), s);
    t("ods : pas de milliers de cellules vides", s.length < 3000, s.length);

    const ep = F.epub(await entries("cours-biologie.epub", (n) => /\.(opf|x?html?)$/i.test(n)));
    t("epub : contenu des chapitres", has(ep, "Robert Hooke", "eucaryotes"), ep.slice(0, 300));
    t("epub : pas de balises", !/<[a-z]+[ >]/i.test(ep));

    const dx = F.odt((await entries("cours-biologie.odt", (n) => n === "content.xml"))["content.xml"]);
    t("odt (regex) : texte", has(dx, "Robert Hooke", "procaryotes"), dx.slice(0, 200));
  }

  /* --- RTF (créé par LibreOffice, avec accents) --- */
  const r = F.rtf(fs.readFileSync(fx("cours-biologie.rtf"), "latin1"));
  t("rtf : texte lisible avec accents", has(r, "unité structurale", "Robert Hooke", "eucaryotes", "microscope"), r.slice(0, 300));
  t("rtf : aucun mot de contrôle", !/\\[a-z]+/i.test(r) && !/[{}]/.test(r), r.slice(0, 200));
  t("rtf : accents hexadécimaux et unicode", F.rtf("{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Arial;}}\\f0 L\\'e9l\\'e8ve \\u233?t\\u233? \\u8364?100\\par Suite}") === "Lélève été €100\nSuite", F.rtf("{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Arial;}}\\f0 L\\'e9l\\'e8ve \\u233?t\\u233? \\u8364?100\\par Suite}"));

  /* --- HTML --- */
  const h = F.html(fs.readFileSync(fx("cours-biologie.html"), "utf8"));
  t("html : texte et titre", has(h, "La cellule", "Robert Hooke"), h.slice(0, 200));
  const dirty = F.html("<html><head><title>Cours &amp; notes</title><style>p{color:red}</style></head><body><nav>MENU</nav><script>alert('x')</script><h1>Titre</h1><p>Un &eacute;l&eacute;ment&nbsp;: 5&lt;6.</p><ul><li>un</li><li>deux</li></ul><table><tr><td>a</td><td>b</td></tr></table><footer>PIED</footer></body></html>");
  t("html : scripts, styles, menus retirés", !/alert|color:red|MENU|PIED/.test(dirty), dirty);
  t("html : entités décodées", has(dirty, "Cours & notes", "Un élément : 5<6."), dirty);
  t("html : listes et tableaux", has(dirty, "• un", "• deux", "a | b"), dirty);

  /* --- Markdown / JSON --- */
  const md = F.markdown(fs.readFileSync(fx("cours-biologie.md"), "utf8"));
  t("markdown : balisage retiré, texte gardé", has(md, "La cellule est l'unité du vivant", "Wikipédia", "• Le noyau contient l'ADN") && !/[*#`\[\]]/.test(md), md);
  t("json : textes", F.jsonText('{"a":{"titre":"La cellule","n":3,"l":["Le noyau","x"]},"u":"https://x.fr"}') === "La cellule\nLe noyau", F.jsonText('{"a":{"titre":"La cellule","n":3,"l":["Le noyau","x"]},"u":"https://x.fr"}'));

  /* --- Sous-titres --- */
  const srt = F.subtitles(fs.readFileSync(fx("cours-biologie.srt"), "utf8"));
  t("srt : texte continu sans minutage", has(srt, "Bonjour à tous", "Robert Hooke au microscope", "n'ont pas de noyau") && !/-->|00:00|^\d+$/m.test(srt), srt);
  t("srt : [Musique] retiré", !/Musique/.test(srt), srt);
  const vtt = F.subtitles(fs.readFileSync(fx("cours-biologie.vtt"), "utf8"));
  t("vtt : balises et métadonnées retirées", !/WEBVTT|Kind:|<c>|<00|align:/.test(vtt), vtt);
  t("vtt : lignes répétées une seule fois", (vtt.match(/mitochondrie produit/gi) || []).length === 1 && (vtt.match(/chloroplaste réalise/gi) || []).length === 1, vtt);
  t("vtt : contenu complet", has(vtt, "énergie de la cellule", "photosynthèse", "ribosomes fabriquent les protéines"), vtt);

  /* --- Liens --- */
  const L = F.classifyLink;
  t("lien canva", L("https://www.canva.com/design/DAF123/abc/view").kind === "canva" && L("https://canva.link/xyz").kind === "canva");
  t("lien youtube", L("https://youtu.be/dQw4w9WgXcQ").kind === "youtube" && L("https://www.youtube.com/watch?v=dQw4w9WgXcQ").kind === "youtube");
  t("lien google slides / docs / sheets", L("https://docs.google.com/presentation/d/abc123/edit").what === "slides" && L("https://docs.google.com/document/d/abc/edit").what === "docs" && L("https://docs.google.com/spreadsheets/d/abc/edit").what === "sheets");
  t("lien drive / cloud", L("https://drive.google.com/file/d/abc/view").kind === "google" && L("https://www.dropbox.com/s/abc/x.pdf").kind === "cloud" && L("https://1drv.ms/p/s!abc").kind === "cloud");
  t("lien vidéo en ligne", L("https://vimeo.com/123").kind === "stream" && L("https://www.tiktok.com/@a/video/1").kind === "stream");
  t("lien fichier direct", L("https://exemple.fr/cours/cours.pdf?x=1").kind === "file" && L("https://exemple.fr/a/son.MP3").fileKind === "audio" && L("https://exemple.fr/c.pptx").fileKind === "pptx");
  t("lien wikipédia", L("https://fr.wikipedia.org/wiki/Cellule_(biologie)").kind === "wikipedia" && L("https://fr.wikipedia.org/wiki/Cellule_(biologie)").title === "Cellule (biologie)");
  t("lien page web", L("https://exemple.fr/cours.html").kind === "web" && L("https://exemple.fr/").kind === "web");
  t("lien invalide", L("pas un lien").kind === "invalid" && L("javascript:alert(1)").kind === "invalid" && L("ftp://x.fr/a").kind === "invalid" && L("").kind === "invalid");
  t("faux ami canva", L("https://notcanva.com/x").kind === "web" && L("https://canva.com.evil.fr/x").kind === "web");
  t("conseils de lien", /PowerPoint|PDF/.test(F.linkAdvice(L("https://www.canva.com/design/x"))) && /transcription/i.test(F.linkAdvice(L("https://youtu.be/dQw4w9WgXcQ"))) && /pptx/.test(F.linkAdvice(L("https://docs.google.com/presentation/d/a/edit"))));

  console.log("Formats : " + ok + " OK, " + ko + " échec(s)");
  process.exit(ko ? 1 : 0);
})();
