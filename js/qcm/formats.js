/* ============================================================================
   FORMATS DE COURS — conversions « texte brut » sans DOM (testables avec Node)
   QcmFormats.kindOf(nomDeFichier, typeMime) → "pdf" | "odt" | "docx" | "pptx" | "odp" | "ods" | "xlsx" | "epub" | "rtf" |
       "html" | "md" | "json" | "subs" | "text" | "audio" | "video" | "image" | "unsupported"
   QcmFormats.pptx(entrées) / odp(xml) / ods(xml) / xlsx(entrées) / epub(entrées) / rtf(str) / html(str) / subtitles(str)…
   QcmFormats.classifyLink(url) → { kind, host, … } et QcmFormats.linkAdvice(info) → texte d'aide (Canva, Google, YouTube…)
   ============================================================================ */
(function (root) {
  "use strict";

  var EXT = {
    pdf: ["pdf"], odt: ["odt", "ott", "fodt"], docx: ["docx", "docm", "dotx"], pptx: ["pptx", "pptm", "ppsx", "potx"],
    odp: ["odp", "otp"], ods: ["ods", "ots"], xlsx: ["xlsx", "xlsm"], epub: ["epub"], rtf: ["rtf"],
    html: ["html", "htm", "xhtml", "mht"], md: ["md", "markdown", "rst", "tex", "org"], json: ["json"],
    subs: ["srt", "vtt", "sbv", "ass", "ssa", "sub", "lrc", "ttml", "dfxp"],
    text: ["txt", "text", "csv", "tsv", "log", "xml", "yaml", "yml", "ini"],
    audio: ["mp3", "wav", "wave", "m4a", "aac", "ogg", "oga", "opus", "flac", "wma", "weba", "amr", "aiff", "aif", "caf", "mka"],
    video: ["mp4", "m4v", "mov", "webm", "mkv", "avi", "wmv", "flv", "3gp", "mpg", "mpeg", "ogv", "mts", "ts"],
    image: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "heic", "avif"]
  };
  var BY_EXT = {};
  Object.keys(EXT).forEach(function (k) { EXT[k].forEach(function (e) { BY_EXT[e] = k; }); });

  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
  function kindOf(name, mime) {
    var e = ext(name), k = BY_EXT[e];
    if (k && !(e === "ts" && /typescript|text/.test(mime || ""))) return k;
    mime = String(mime || "").toLowerCase();
    if (mime === "application/pdf") return "pdf";
    if (mime.indexOf("audio/") === 0) return "audio";
    if (mime.indexOf("video/") === 0) return "video";
    if (mime.indexOf("image/") === 0) return "image";
    if (mime === "text/html") return "html";
    if (mime.indexOf("text/") === 0) return "text";
    return "unsupported";
  }

  /* Explication quand un format ne peut pas être lu directement. */
  function unsupportedAdvice(name) {
    var e = ext(name), n = e ? "« ." + e + " »" : "ce format";
    if (e === "doc" || e === "dot") return "Ancien format Word (.doc) : enregistre-le en .docx ou .odt (Fichier › Enregistrer sous), ou exporte-le en PDF.";
    if (e === "ppt" || e === "pps") return "Ancien format PowerPoint (.ppt) : enregistre-le en .pptx ou .odp, ou exporte-le en PDF.";
    if (e === "xls") return "Ancien format Excel (.xls) : enregistre-le en .xlsx, .ods ou .csv.";
    if (e === "key") return "Keynote (.key) : dans Keynote, Fichier › Exporter vers › PDF ou PowerPoint, puis dépose le fichier.";
    if (e === "pages") return "Pages (.pages) : dans Pages, Fichier › Exporter vers › PDF ou Word, puis dépose le fichier.";
    if (e === "numbers") return "Numbers (.numbers) : exporte en .xlsx ou .csv, puis dépose le fichier.";
    if (e === "canva") return "Canva : dans ton design, Partager › Télécharger › PDF ou PowerPoint, puis dépose le fichier ici.";
    if (e === "zip" || e === "rar" || e === "7z") return "Archive (" + n + ") : décompresse-la et dépose le document qu'elle contient.";
    if (e === "pdf") return "";
    return "Format " + n + " non pris en charge. Formats lus : PDF, Word (DOCX, ODT), PowerPoint (PPTX), présentations (ODP), tableurs (XLSX, ODS, CSV), EPUB, RTF, HTML, TXT / Markdown, sous-titres (SRT, VTT), audio (MP3, WAV, M4A…) et vidéo (MP4, WebM, MOV…).";
  }

  /* ---------- Entités et nettoyage ---------- */
  var NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", euro: "€", copy: "©", reg: "®", deg: "°", eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", ccedil: "ç", icirc: "î", iuml: "ï", ocirc: "ô", ugrave: "ù", ucirc: "û", uuml: "ü", Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", oelig: "œ", OElig: "Œ", times: "×", middot: "·", bull: "•", rarr: "→", larr: "←", ouml: "ö", auml: "ä", szlig: "ß", ntilde: "ñ", iacute: "í", aacute: "á", oacute: "ó", uacute: "ú" };
  function decodeEntities(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, function (m, g) {
      if (g.charAt(0) === "#") {
        var n = g.charAt(1).toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        if (!isFinite(n) || n <= 0 || n > 0x10ffff) return "";
        try { return String.fromCodePoint(n); } catch (e) { return ""; }
      }
      return Object.prototype.hasOwnProperty.call(NAMED, g) ? NAMED[g] : (Object.prototype.hasOwnProperty.call(NAMED, g.toLowerCase()) ? NAMED[g.toLowerCase()] : m);
    });
  }
  function tidy(s) {
    return String(s).replace(/\r\n?/g, "\n").replace(/[ \t ]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- HTML ---------- */
  function html(src) {
    var s = String(src);
    var title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s) || [])[1];
    var body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(s);
    s = body ? body[1] : s;
    s = s.replace(/<!--[\s\S]*?-->/g, " ").replace(/\s+/g, " ")              /* en HTML, les retours à la ligne du source ne comptent pas */
      .replace(/<(script|style|noscript|svg|template|iframe|canvas|nav|footer|form|button|select|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|hr)\b[^>]*>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|tr|table|h[1-6]|blockquote|pre|figcaption|dd|dt|header|main|aside)>/gi, "\n")
      .replace(/<(h[1-6])\b[^>]*>/gi, "\n\n")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<[^>]+>/g, " ");
    s = decodeEntities(s).replace(/\s*\|\s*(\n|$)/g, "\n");
    s = tidy(s);
    if (title && !/^\s*$/.test(title)) s = tidy(decodeEntities(title.replace(/<[^>]+>/g, " "))) + "\n\n" + s;
    return s;
  }

  /* ---------- Markdown / LaTeX léger : on enlève juste le balisage ---------- */
  function markdown(src) {
    return tidy(String(src).replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s*/gm, "").replace(/(\*\*|__|\*|_|`)/g, "").replace(/^\s*[-*+]\s+/gm, "• ").replace(/^>\s?/gm, "")
      .replace(/\\(begin|end)\{[^}]*\}/g, " ").replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?\{([^}]*)\}/g, "$2").replace(/\\[a-zA-Z]+/g, " "));
  }

  /* ---------- JSON : on garde les textes ---------- */
  function jsonText(src) {
    var data;
    try { data = JSON.parse(String(src)); } catch (e) { return tidy(src); }
    var out = [];
    (function walk(v, d) {
      if (out.length > 50000 || d > 12) return;
      if (typeof v === "string") { var t = v.trim(); if (t.length >= 3 && !/^(https?:|data:)/.test(t)) out.push(t); }
      else if (Array.isArray(v)) v.forEach(function (x) { walk(x, d + 1); });
      else if (v && typeof v === "object") Object.keys(v).forEach(function (k) { walk(v[k], d + 1); });
    })(data, 0);
    return out.join("\n");
  }

  /* ---------- Sous-titres : SRT, VTT, SBV, ASS, LRC, TTML ---------- */
  function subtitles(src) {
    var s = String(src).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var lines = s.split("\n"), out = [], last = "";
    lines.forEach(function (raw) {
      var l = raw.trim();
      if (!l) return;
      if (/^WEBVTT/i.test(l) || /^(NOTE|STYLE|REGION)\b/.test(l) || /^(Kind|Language):/i.test(l)) return;
      if (/^\d+$/.test(l)) return;                                                       // numéro de séquence SRT
      if (/^\[?\d{0,2}:?\d{1,2}:\d{2}[.,]\d{1,3}\s*(-->|,)/.test(l) || /-->/.test(l)) return;  // minutage
      if (/^\d+:\d{2}(:\d{2})?([.,]\d+)?$/.test(l)) return;                              // SBV
      if (/^\[(ar|ti|au|al|by|offset|length):/i.test(l)) return;                         // LRC métadonnées
      l = l.replace(/^Dialogue:[^,]*(,[^,]*){8},/, "").replace(/\{\\[^}]*\}/g, "").replace(/\\N/g, " ")   // ASS
        .replace(/^\[\d{1,2}:\d{2}(?:[.:]\d+)?\]\s*/, "")                                // LRC
        .replace(/<[^>]+>/g, "").replace(/\[[^\]]{0,25}\]/g, function (m) { return /musique|music|applaus|rire|laugh/i.test(m) ? "" : m; })
        .replace(/^[-–]\s*/, "");
      l = decodeEntities(l).replace(/\s+/g, " ").trim();
      if (!l || l === last) return;                                                      // sous-titres auto : lignes répétées
      if (last && l.indexOf(last) === 0) out.pop();                                      // la ligne précédente est reprise en plus long
      out.push(l); last = l;
    });
    var text = out.join(" ").replace(/\s+([,.;:!?])/g, "$1");
    return text.replace(/([.!?…])\s+(?=[A-ZÀ-Ý«"])/g, "$1\n").replace(/(.{400}?[,;])\s/g, "$1\n").trim();
  }

  /* ---------- RTF ---------- */
  var RTF_SKIP = { fonttbl: 1, colortbl: 1, stylesheet: 1, info: 1, pict: 1, object: 1, header: 1, footer: 1, headerl: 1, headerr: 1, footerl: 1, footerr: 1, footnote: 0, generator: 1, themedata: 1, colorschememapping: 1, latentstyles: 1, datastore: 1, listtable: 1, listoverridetable: 1, rsidtbl: 1, fldinst: 1, bkmkstart: 1, bkmkend: 1, xmlnstbl: 1, wgrffmtfilter: 1, template: 1, "*": 1 };
  var CP1252 = { 128: "€", 130: "‚", 131: "ƒ", 132: "„", 133: "…", 134: "†", 135: "‡", 136: "ˆ", 137: "‰", 138: "Š", 139: "‹", 140: "Œ", 142: "Ž", 145: "‘", 146: "’", 147: "“", 148: "”", 149: "•", 150: "–", 151: "—", 152: "˜", 153: "™", 154: "š", 155: "›", 156: "œ", 158: "ž", 159: "Ÿ" };
  function rtf(src) {
    var s = String(src);
    if (s.indexOf("{\\rtf") !== 0 && s.indexOf("{\\rtf") < 0) return tidy(s);
    var out = "", i = 0, n = s.length, stack = [], skip = 0, uc = 1, skipChars = 0;
    function put(t) { if (skip === 0) out += t; }
    while (i < n) {
      var c = s.charAt(i);
      if (c === "{") { stack.push({ skip: skip, uc: uc }); i++; if (s.substr(i, 2) === "\\*") { skip = skip || 1; } continue; }
      if (c === "}") { var st = stack.pop(); if (st) { skip = st.skip; uc = st.uc; } i++; continue; }
      if (c === "\\") {
        var d = s.charAt(i + 1);
        if (d === "\\" || d === "{" || d === "}") { if (skipChars > 0) skipChars--; else put(d); i += 2; continue; }
        if (d === "'") {
          var code = parseInt(s.substr(i + 2, 2), 16); i += 4;
          if (skipChars > 0) { skipChars--; continue; }
          put(CP1252[code] || String.fromCharCode(code)); continue;
        }
        if (d === "~") { put(" "); i += 2; continue; }
        if (d === "-" || d === "_") { put(d === "_" ? "‑" : ""); i += 2; continue; }
        var m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(s.substr(i, 40));
        if (!m) { i += 2; continue; }
        var w = m[1], num = m[2] === undefined ? null : parseInt(m[2], 10);
        i += m[0].length;
        if (Object.prototype.hasOwnProperty.call(RTF_SKIP, w) && RTF_SKIP[w] === 1) { skip = skip || 1; continue; }
        if (w === "par" || w === "line" || w === "sect" || w === "page" || w === "row") put("\n");
        else if (w === "cell" || w === "tab") put(" ");
        else if (w === "bullet") put("• ");
        else if (w === "emdash") put("—"); else if (w === "endash") put("–");
        else if (w === "lquote") put("‘"); else if (w === "rquote") put("’");
        else if (w === "ldblquote") put("“"); else if (w === "rdblquote") put("”");
        else if (w === "uc" && num !== null) uc = num;
        else if (w === "u" && num !== null) { put(String.fromCharCode(num < 0 ? num + 65536 : num)); skipChars = uc; }
        continue;
      }
      if (c === "\n" || c === "\r") { i++; continue; }
      if (skipChars > 0) { skipChars--; i++; continue; }
      put(c); i++;
    }
    return tidy(out);
  }

  /* ---------- XML (regex : les formats visés sont simples et bien formés) ---------- */
  function stripXml(s) { return decodeEntities(String(s).replace(/<[^>]+>/g, "")); }
  function allMatches(re, s, fn) { var m; re.lastIndex = 0; while ((m = re.exec(s))) fn(m); }
  function num(a, b) { var x = parseInt((/(\d+)(?=\D*$)/.exec(a) || [0, 0])[1], 10), y = parseInt((/(\d+)(?=\D*$)/.exec(b) || [0, 0])[1], 10); return x - y; }

  /* PowerPoint : entrées = { "ppt/slides/slide1.xml": "<xml…>", "ppt/notesSlides/notesSlide1.xml": … } */
  function pptx(entries) {
    var names = Object.keys(entries), slides = names.filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/i.test(n); }).sort(num), out = [];
    function paras(xml) {
      var res = [];
      allMatches(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g, xml, function (m) {
        var t = "";
        allMatches(/<a:(?:t|br|tab)\b[^>]*?(?:\/>|>([\s\S]*?)<\/a:(?:t|br|tab)>)/g, m[1], function (r) { t += r[0].indexOf("<a:t") === 0 ? stripXml(r[1] || "") : " "; });
        t = t.replace(/\s+/g, " ").trim(); if (t) res.push(t);
      });
      return res;
    }
    slides.forEach(function (n, i) {
      var p = paras(entries[n]);
      var noteName = "ppt/notesSlides/notesSlide" + ((/(\d+)\.xml$/.exec(n) || [0, i + 1])[1]) + ".xml";
      var notes = entries[noteName] ? paras(entries[noteName]).filter(function (t) { return !/^\d+$/.test(t); }) : [];
      if (p.length || notes.length) out.push("Diapositive " + (i + 1) + "\n" + p.join("\n") + (notes.length ? "\nNotes : " + notes.join(" ") : ""));
    });
    return out.join("\n\n");
  }

  /* OpenDocument (texte / présentation) : paragraphes et titres, par page pour une présentation. */
  function odfParagraphs(xml) {
    var res = [];
    allMatches(/<text:(p|h)\b[^>]*?(?:\/>|>([\s\S]*?)<\/text:\1>)/g, xml, function (m) {
      var t = (m[2] || "").replace(/<text:s\b[^>]*?text:c="(\d+)"[^>]*\/>/g, function (x, c) { return new Array(Math.min(+c, 20) + 1).join(" "); })
        .replace(/<text:(?:s|tab)\b[^>]*\/>/g, " ").replace(/<text:line-break\s*\/>/g, "\n").replace(/<[^>]+>/g, "");
      t = decodeEntities(t).replace(/[ \t]+/g, " ").trim(); if (t) res.push(t);
    });
    return res;
  }
  function odp(xml) {
    var pages = String(xml).split(/<draw:page\b/).slice(1), out = [];
    pages.forEach(function (pg, i) {
      var notes = "", np = /<presentation:notes\b[\s\S]*?<\/presentation:notes>/.exec(pg);
      if (np) { notes = odfParagraphs(np[0]).filter(function (t) { return !/^\d+$/.test(t); }).join(" "); pg = pg.replace(np[0], ""); }
      var p = odfParagraphs(pg);
      if (p.length || notes) out.push("Diapositive " + (i + 1) + "\n" + p.join("\n") + (notes ? "\nNotes : " + notes : ""));
    });
    return out.join("\n\n");
  }
  function odt(xml) { return odfParagraphs(xml).join("\n\n"); }

  /* Tableur ODS : une ligne de texte par ligne, cellules séparées par « | ». */
  function ods(xml) {
    var out = [];
    allMatches(/<table:table\b[^>]*table:name="([^"]*)"[^>]*>([\s\S]*?)<\/table:table>/g, String(xml), function (t) {
      var rows = [];
      allMatches(/<table:table-row\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-row>)/g, t[2], function (r) {
        var cells = [];
        allMatches(/<table:(?:covered-)?table-cell\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g, r[1] || "", function (c) {
          var txt = odfParagraphs(c[1] || "").join(" ");
          if (!txt) { var v = /office:(?:value|string-value)="([^"]*)"/.exec(c[0]); txt = v ? decodeEntities(v[1]) : ""; }
          cells.push(txt);
        });
        while (cells.length && !cells[cells.length - 1]) cells.pop();
        if (cells.some(Boolean)) rows.push(cells.join(" | "));
      });
      if (rows.length) out.push("Feuille « " + decodeEntities(t[1]) + " »\n" + rows.join("\n"));
    });
    return out.join("\n\n");
  }

  /* Excel : entrées = { "xl/sharedStrings.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", … } */
  function xlsx(entries) {
    var shared = [];
    if (entries["xl/sharedStrings.xml"]) allMatches(/<si\b[^>]*>([\s\S]*?)<\/si>/g, entries["xl/sharedStrings.xml"], function (m) {
      var t = ""; allMatches(/<t\b[^>]*>([\s\S]*?)<\/t>/g, m[1], function (x) { t += stripXml(x[1]); }); shared.push(t);
    });
    var sheetNames = []; if (entries["xl/workbook.xml"]) allMatches(/<sheet\b[^>]*name="([^"]*)"/g, entries["xl/workbook.xml"], function (m) { sheetNames.push(decodeEntities(m[1])); });
    var sheets = Object.keys(entries).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/i.test(n); }).sort(num), out = [];
    sheets.forEach(function (n, si) {
      var rows = [];
      allMatches(/<row\b[^>]*>([\s\S]*?)<\/row>/g, entries[n], function (r) {
        var cells = [];
        allMatches(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, r[1], function (c) {
          var attrs = c[1], inner = c[2] || "", t = (/\bt="([^"]*)"/.exec(attrs) || [])[1], v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1], val = "";
          if (t === "s") val = shared[parseInt(v, 10)] || "";
          else if (t === "inlineStr") { allMatches(/<t\b[^>]*>([\s\S]*?)<\/t>/g, inner, function (x) { val += stripXml(x[1]); }); }
          else if (t === "b") val = v === "1" ? "vrai" : "faux";
          else if (v !== undefined) val = decodeEntities(v);
          cells.push(val);
        });
        while (cells.length && !cells[cells.length - 1]) cells.pop();
        if (cells.some(Boolean)) rows.push(cells.join(" | "));
      });
      if (rows.length) out.push("Feuille « " + (sheetNames[si] || "Feuille " + (si + 1)) + " »\n" + rows.join("\n"));
    });
    return out.join("\n\n");
  }

  /* EPUB : entrées = { chemin: contenu } ; l'ordre de lecture vient du fichier OPF si on le trouve. */
  function epub(entries) {
    var names = Object.keys(entries), order = [], opfName = names.filter(function (n) { return /\.opf$/i.test(n); })[0];
    if (opfName) {
      var opf = entries[opfName], base = opfName.indexOf("/") >= 0 ? opfName.slice(0, opfName.lastIndexOf("/") + 1) : "", manifest = {};
      allMatches(/<(?:opf:)?item\b[^>]*>/g, opf, function (m) { var id = /\bid="([^"]*)"/.exec(m[0]), href = /\bhref="([^"]*)"/.exec(m[0]); if (id && href) manifest[id[1]] = href[1]; });
      allMatches(/<(?:opf:)?itemref\b[^>]*idref="([^"]*)"/g, opf, function (m) { if (manifest[m[1]]) { try { order.push(base + decodeURIComponent(manifest[m[1]])); } catch (e) { order.push(base + manifest[m[1]]); } } });
    }
    var chapters = order.filter(function (n) { return entries[n] !== undefined; });
    if (!chapters.length) chapters = names.filter(function (n) { return /\.(x?html?)$/i.test(n); }).sort();
    return chapters.map(function (n) { return html(entries[n]); }).filter(Boolean).join("\n\n");
  }

  /* ---------- Liens ---------- */
  function classifyLink(url) {
    var u;
    try { u = new URL(String(url).trim()); } catch (e) { return { kind: "invalid" }; }
    if (!/^https?:$/.test(u.protocol)) return { kind: "invalid" };
    var h = u.hostname.toLowerCase().replace(/^www\./, ""), path = u.pathname;
    if (h === "canva.com" || h.slice(-10) === ".canva.com" || h === "canva.link") return { kind: "canva", host: h };
    if (h === "youtube.com" || h.slice(-12) === ".youtube.com" || h === "youtu.be" || h === "youtube-nocookie.com") return { kind: "youtube", host: h };
    if (h === "docs.google.com") {
      var id = (/\/d\/([\w-]+)/.exec(path) || [])[1], what = /\/presentation\//.test(path) ? "slides" : /\/spreadsheets\//.test(path) ? "sheets" : /\/document\//.test(path) ? "docs" : "other";
      return { kind: "google", host: h, what: what, id: id || "" };
    }
    if (h === "drive.google.com") return { kind: "google", host: h, what: "drive", id: (/\/d\/([\w-]+)/.exec(path) || [])[1] || "" };
    if (/(^|\.)(dropbox\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com|wetransfer\.com|we\.tl|icloud\.com|mega\.nz)$/.test(h)) return { kind: "cloud", host: h };
    if (/(^|\.)(vimeo\.com|dailymotion\.com|twitch\.tv|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|netflix\.com|spotify\.com|deezer\.com)$/.test(h)) return { kind: "stream", host: h };
    var e = ext(path);
    var k = BY_EXT[e];
    if (k && k !== "html" && k !== "text") return { kind: "file", host: h, fileKind: k, name: decodeURIComponent(path.split("/").pop() || "") };
    if (/(^|\.)wikipedia\.org$/.test(h) && /^\/wiki\//.test(path)) return { kind: "wikipedia", host: h, title: decodeURIComponent(path.slice(6)).replace(/_/g, " "), lang: h.split(".")[0] };
    return { kind: "web", host: h };
  }
  function linkAdvice(info) {
    switch (info && info.kind) {
      case "invalid": return "Ce lien ne ressemble pas à une adresse web (https://…).";
      case "canva": return "Canva ne laisse pas lire un design depuis son lien (il faut être connecté et le contenu est dessiné, pas écrit). Dans Canva : Partager › Télécharger › « PDF standard » ou « Microsoft PowerPoint », puis dépose le fichier ici.";
      case "youtube": return "Une vidéo YouTube ne peut pas être lue directement (YouTube bloque l'accès aux sous-titres depuis un site). Deux solutions : télécharge la vidéo ou le son (MP4 / MP3) puis dépose-le ici, ou copie la transcription (… › Afficher la transcription) et colle-la dans « …ou colle le texte du cours ».";
      case "google": return info.what === "slides" ? "Google Slides : Fichier › Télécharger › Microsoft PowerPoint (.pptx) ou PDF, puis dépose le fichier ici."
        : info.what === "sheets" ? "Google Sheets : Fichier › Télécharger › Microsoft Excel (.xlsx) ou CSV, puis dépose le fichier ici."
        : info.what === "docs" ? "Google Docs : Fichier › Télécharger › Microsoft Word (.docx) ou PDF, puis dépose le fichier ici."
        : "Google Drive : télécharge le fichier sur ton appareil puis dépose-le ici (le lien demande d'être connecté).";
      case "cloud": return "Les liens de stockage (Dropbox, OneDrive, iCloud…) demandent une connexion : télécharge le fichier puis dépose-le ici.";
      case "stream": return "Les sites de vidéo ou de musique en ligne ne se lisent pas par lien. Télécharge le fichier (MP4 / MP3) si tu en as le droit, puis dépose-le ici.";
      default: return "";
    }
  }

  var QcmFormats = { EXT: EXT, ext: ext, kindOf: kindOf, unsupportedAdvice: unsupportedAdvice, decodeEntities: decodeEntities, tidy: tidy,
    html: html, markdown: markdown, jsonText: jsonText, subtitles: subtitles, rtf: rtf, pptx: pptx, odp: odp, odt: odt, ods: ods, xlsx: xlsx, epub: epub,
    classifyLink: classifyLink, linkAdvice: linkAdvice };
  root.QcmFormats = QcmFormats;
  if (typeof module !== "undefined" && module.exports) module.exports = QcmFormats;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
