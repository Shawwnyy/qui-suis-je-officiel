/* ============================================================================
   EXTRACTION DU TEXTE D'UN DOCUMENT (dans le navigateur)
   QcmExtract.fromFile(file, { phpUrl }) → Promise<{ text, pages, via }>
   Formats : PDF (pdf.js) ; Word (DOCX, ODT), PowerPoint (PPTX), présentations (ODP), tableurs (XLSX, ODS, CSV), EPUB (JSZip) ;
   RTF, HTML, TXT / Markdown / JSON, sous-titres (SRT, VTT…) ; audio et vidéo (transcription, voir transcribe.js).
   QcmExtract.fromUrl(url, { phpUrl, allowReader }) → pages web, Wikipédia, fichiers en ligne (voir plus bas).
   Les bibliothèques sont chargées à la demande, seulement quand on importe un fichier.
   Si l'extraction dans le navigateur échoue (bibliothèque bloquée, hors ligne…), le serveur PHP
   (php/qcm.php) est essayé s'il existe.
   ============================================================================ */
(function (root) {
  "use strict";

  var CDN = {
    pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
  };
  var MAX_BYTES = 25 * 1024 * 1024;
  var MAX_CHARS = 1500000;

  function err(code, message) { var e = new Error(message); e.code = code; return e; }

  var loading = {};
  function loadScript(url) {
    if (loading[url]) return loading[url];
    loading[url] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete loading[url]; reject(err("CDN", "Impossible de charger une bibliothèque (connexion ?).")); };
      document.head.appendChild(s);
    });
    return loading[url];
  }

  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }

  /* ---------- PDF ---------- */
  function fromPdf(file) {
    return loadScript(CDN.pdfjs).then(function () {
      var lib = root.pdfjsLib;
      if (!lib) throw err("CDN", "pdf.js introuvable.");
      lib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
      return file.arrayBuffer();
    }).then(function (buf) {
      return root.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pages = [], chain = Promise.resolve();
      var total = Math.min(doc.numPages, 400);
      for (var n = 1; n <= total; n++) (function (num) {
        chain = chain.then(function () { return doc.getPage(num); }).then(function (page) { return page.getTextContent(); }).then(function (content) {
          var out = "", lastY = null;
          content.items.forEach(function (it) {
            if (typeof it.str !== "string") return;
            var y = it.transform ? it.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && out && !/\n$/.test(out)) out += "\n";
            else if (out && !/[\s\n]$/.test(out) && it.str && !/^[\s,.;:!?)]/.test(it.str)) out += " ";
            out += it.str;
            if (it.hasEOL) out += "\n";
            if (y !== null) lastY = y;
          });
          pages.push(out);
        });
      })(n);
      return chain.then(function () { return { text: pages.join("\n\n"), pages: total, via: "pdf.js" }; });
    });
  }

  /* ---------- ODT / DOCX ---------- */
  function readZip(file, names) {
    return loadScript(CDN.jszip).then(function () {
      if (!root.JSZip) throw err("CDN", "JSZip introuvable.");
      return file.arrayBuffer();
    }).then(function (buf) { return root.JSZip.loadAsync(buf); }).then(function (zip) {
      for (var i = 0; i < names.length; i++) { var f = zip.file(names[i]); if (f) return f.async("string"); }
      throw err("FORMAT", "Fichier illisible : contenu introuvable dans l'archive.");
    });
  }
  function xmlDoc(str) {
    var d = new DOMParser().parseFromString(str, "application/xml");
    if (d.getElementsByTagName("parsererror").length) throw err("FORMAT", "Fichier illisible (XML invalide).");
    return d;
  }
  function paraText(node, kind) {
    var out = "";
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { if (kind === "odt") out += c.data; continue; }
        if (c.nodeType !== 1) continue;
        var nm = c.nodeName;
        if (kind === "odt") {
          if (nm === "text:s") out += new Array((Number(c.getAttribute("text:c")) || 1) + 1).join(" ");
          else if (nm === "text:tab") out += " ";
          else if (nm === "text:line-break") out += "\n";
          else walk(c);
        } else {
          if (nm === "w:t") out += c.textContent;
          else if (nm === "w:tab") out += " ";
          else if (nm === "w:br" || nm === "w:cr") out += "\n";
          else walk(c);
        }
      }
    })(node);
    return out;
  }
  function collect(doc, kind) {
    var tags = kind === "odt" ? { "text:p": 1, "text:h": 1 } : { "w:p": 1 }, out = [];
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue;
        if (tags[c.nodeName]) { var t = paraText(c, kind).replace(/[ \t]+/g, " ").trim(); if (t) out.push(t); }
        else walk(c);
      }
    })(doc.documentElement);
    return out.join("\n\n");
  }
  function fromOdt(file) { return readZip(file, ["content.xml"]).then(function (xml) { return { text: collect(xmlDoc(xml), "odt"), via: "odt" }; }); }
  function fromDocx(file) { return readZip(file, ["word/document.xml"]).then(function (xml) { return { text: collect(xmlDoc(xml), "docx"), via: "docx" }; }); }

  /* ---------- Archives (PPTX, ODP, ODS, XLSX, EPUB) : on lit seulement les fichiers XML utiles ---------- */
  function zipEntries(file, filter) {
    return loadScript(CDN.jszip).then(function () {
      if (!root.JSZip) throw err("CDN", "JSZip introuvable.");
      return file.arrayBuffer();
    }).then(function (buf) { return root.JSZip.loadAsync(buf); }).then(function (zip) {
      var names = Object.keys(zip.files).filter(function (n) { return !zip.files[n].dir && filter(n); }), out = {}, total = 0;
      return names.reduce(function (chain, n) {
        return chain.then(function () {
          var d = zip.files[n]._data; if (d && d.uncompressedSize > 40 * 1024 * 1024) return;            /* protection « zip bomb » */
          return zip.files[n].async("string").then(function (t) { total += t.length; if (total > 120 * 1024 * 1024) throw err("SIZE", "Document trop volumineux une fois décompressé."); out[n] = t; });
        });
      }, Promise.resolve()).then(function () {
        if (!Object.keys(out).length) throw err("FORMAT", "Fichier illisible : contenu introuvable dans l'archive.");
        return out;
      });
    });
  }
  function need() { if (!root.QcmFormats) throw err("FORMAT", "Le module des formats n'est pas chargé."); return root.QcmFormats; }
  function fromPptx(file) { return zipEntries(file, function (n) { return /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/i.test(n); }).then(function (e) { return { text: need().pptx(e), via: "pptx" }; }); }
  function fromOdp(file) { return zipEntries(file, function (n) { return n === "content.xml"; }).then(function (e) { return { text: need().odp(e["content.xml"]), via: "odp" }; }); }
  function fromOds(file) { return zipEntries(file, function (n) { return n === "content.xml"; }).then(function (e) { return { text: need().ods(e["content.xml"]), via: "ods" }; }); }
  function fromXlsx(file) { return zipEntries(file, function (n) { return /^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/i.test(n); }).then(function (e) { return { text: need().xlsx(e), via: "xlsx" }; }); }
  function fromEpub(file) { return zipEntries(file, function (n) { return /\.(opf|x?html?)$/i.test(n); }).then(function (e) { return { text: need().epub(e), via: "epub" }; }); }

  /* ---------- Texte, HTML, RTF, sous-titres… ---------- */
  function fromTextual(file, kind) {
    return file.text().then(function (t) {
      var F = need();
      if (kind === "html") return { text: F.html(t), via: "html" };
      if (kind === "md") return { text: F.markdown(t), via: "texte" };
      if (kind === "json") return { text: F.jsonText(t), via: "json" };
      if (kind === "subs") return { text: F.subtitles(t), via: "sous-titres" };
      if (kind === "rtf") return { text: F.rtf(t), via: "rtf" };
      return { text: t, via: "texte" };
    });
  }

  /* ---------- Serveur PHP (secours) ---------- */
  function fromServer(file, phpUrl, code) {
    var fd = new FormData();
    fd.append("file", file, file.name);
    var headers = {}; if (code) headers["X-Access-Code"] = code;
    return fetch(phpUrl + (phpUrl.indexOf("?") < 0 ? "?" : "&") + "action=extract", { method: "POST", body: fd, headers: headers }).then(function (r) {
      return r.json().catch(function () { throw err("SERVER", "Réponse du serveur illisible."); });
    }).then(function (j) {
      if (!j || !j.ok) throw err("SERVER", (j && j.error) || "Le serveur n'a pas pu lire ce fichier.");
      return { text: j.text || "", via: "php" };
    });
  }

  function fromFile(file, options) {
    options = options || {};
    if (!file) return Promise.reject(err("NOFILE", "Aucun fichier choisi."));
    var F = root.QcmFormats, kind = F ? F.kindOf(file.name, file.type) : null;
    if (!kind) kind = ext(file.name) === "pdf" ? "pdf" : "unsupported";
    var T = root.QcmTranscribe;
    var isMedia = kind === "audio" || kind === "video";
    if (isMedia) {
      if (!T) return Promise.reject(err("FORMAT", "Le module de transcription n'est pas chargé."));
    } else if (file.size > MAX_BYTES) return Promise.reject(err("SIZE", "Fichier trop volumineux (25 Mo maximum)."));
    var job;
    if (kind === "pdf") job = fromPdf(file);
    else if (kind === "odt") job = fromOdt(file);
    else if (kind === "docx") job = fromDocx(file);
    else if (kind === "pptx") job = fromPptx(file);
    else if (kind === "odp") job = fromOdp(file);
    else if (kind === "ods") job = fromOds(file);
    else if (kind === "xlsx") job = fromXlsx(file);
    else if (kind === "epub") job = fromEpub(file);
    else if (kind === "html" || kind === "md" || kind === "json" || kind === "subs" || kind === "rtf" || kind === "text") job = fromTextual(file, kind);
    else if (isMedia) job = T.fromMedia(file, { lang: options.lang, quality: options.quality, phpUrl: options.phpUrl, serverStt: options.serverStt, code: options.code, onStatus: options.onStatus, abort: options.abort });
    else if (kind === "image") return Promise.reject(err("FORMAT", "Image : le texte d'une photo ou d'une capture n'est pas lu (il faudrait une reconnaissance de caractères). Exporte plutôt ton cours en PDF, PowerPoint ou texte, ou colle le texte."));
    else return Promise.reject(err("FORMAT", F ? F.unsupportedAdvice(file.name) : "Format non pris en charge."));

    return job.catch(function (e1) {
      if (!isMedia && e1 && (e1.code === "CDN" || e1.code === undefined) && options.phpUrl && kind !== "image") {
        return fromServer(file, options.phpUrl, options.code).catch(function () { throw e1; });
      }
      throw e1;
    }).then(function (r) {
      var text = String(r.text || "").replace(/\u0000/g, "");
      if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
      var min = isMedia ? 80 : 200;
      if (text.replace(/\s+/g, "").length < min) throw err("EMPTY", isMedia ? "Aucune parole exploitable n'a été reconnue dans ce fichier (trop court, sans voix, ou langue mal choisie)." : "Aucun texte exploitable dans ce document. S'il s'agit d'un scan (image), il faut d'abord le passer par une reconnaissance de texte (OCR).");
      r.text = text;
      return r;
    });
  }

  /* ---------- Liens : pages web, Wikipédia, fichiers en ligne ---------- */
  var READER = "https://r.jina.ai/";
  function pageFromResponse(resp, url) {
    var ct = (resp.headers.get("content-type") || "").toLowerCase(), F = need();
    if (/text\/html|application\/xhtml/.test(ct) || (!ct && !F.ext(url))) return resp.text().then(function (t) { return { text: F.html(t), via: "page web" }; });
    if (/application\/json/.test(ct)) return resp.text().then(function (t) { return { text: F.jsonText(t), via: "json" }; });
    if (/^text\//.test(ct)) return resp.text().then(function (t) { return { text: F.markdown(t), via: "texte" }; });
    return resp.blob().then(function (b) {
      var name = decodeURIComponent((new URL(url).pathname.split("/").pop()) || "document");
      var k = F.kindOf(name, ct);
      if (k === "unsupported") throw err("FORMAT", "Ce lien mène à un fichier de type inconnu (" + (ct || "?") + ").");
      if (k === "audio" || k === "video") throw err("FORMAT", "Ce lien mène à un fichier audio / vidéo : télécharge-le puis dépose-le ici pour le transcrire.");
      return fromFile(new File([b], name, { type: ct }), { phpUrl: null });
    });
  }
  function fromUrl(url, options) {
    options = options || {};
    var F = root.QcmFormats;
    if (!F) return Promise.reject(err("FORMAT", "Le module des formats n'est pas chargé."));
    url = String(url || "").trim();
    if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(url)) url = "https://" + url;
    var info = F.classifyLink(url);
    var advice = F.linkAdvice(info);
    if (advice) { var a = err("ADVICE", advice); return Promise.reject(a); }
    var say = options.onStatus || function () {};
    function done(r) {
      var text = String(r.text || "").replace(/\u0000/g, "").slice(0, MAX_CHARS);
      if (text.replace(/\s+/g, "").length < 200) throw err("EMPTY", "Cette adresse ne contient pas assez de texte lisible (page vide, réservée aux membres, ou construite par JavaScript).");
      r.text = text; r.title = r.title || ""; return r;
    }
    function viaServer() {
      say("Lecture du lien par le serveur…");
      var headers = { "content-type": "application/json" }; if (options.code) headers["X-Access-Code"] = options.code;
      return fetch(options.phpUrl + (options.phpUrl.indexOf("?") < 0 ? "?" : "&") + "action=fetch", { method: "POST", headers: headers, body: JSON.stringify({ url: url }) })
        .then(function (r) { return r.json().catch(function () { throw err("SERVER", "Réponse du serveur illisible."); }); })
        .then(function (j) { if (!j || !j.ok) throw err("SERVER", (j && j.error) || "Le serveur n'a pas pu lire ce lien."); return { text: j.text || "", via: "serveur", title: j.title || "" }; });
    }
    function viaWikipedia() {
      say("Lecture de l'article Wikipédia…");
      var api = "https://" + info.lang + ".wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&format=json&origin=*&titles=" + encodeURIComponent(info.title);
      return fetch(api).then(function (r) { return r.json(); }).then(function (j) {
        var pages = j && j.query && j.query.pages, id = pages && Object.keys(pages)[0], p = id && pages[id];
        if (!p || p.missing !== undefined || !p.extract) throw err("EMPTY", "Article Wikipédia introuvable.");
        return { text: F.tidy(p.extract), via: "Wikipédia", title: p.title || info.title };
      });
    }
    function direct() {
      say("Lecture du lien…");
      return fetch(url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" }).then(function (resp) {
        if (!resp.ok) throw err("HTTP", "Le site a répondu « " + resp.status + " » : la page n'est pas accessible.");
        return pageFromResponse(resp, url);
      });
    }
    function viaReader() {
      say("Lecture du lien par le service de lecture externe…");
      return fetch(READER + url, { headers: { Accept: "text/plain" }, credentials: "omit", referrerPolicy: "no-referrer" }).then(function (resp) {
        if (!resp.ok) throw err("HTTP", "Le service de lecture n'a pas pu ouvrir ce lien (" + resp.status + ").");
        return resp.text();
      }).then(function (t) { return { text: F.markdown(t), via: "service de lecture" }; });
    }
    var chain;
    if (options.phpUrl && options.serverFetch) chain = viaServer().catch(function (e) { if (e && e.code === "AUTH") throw e; return direct(); });
    else chain = (info.kind === "wikipedia" ? viaWikipedia().catch(function () { return direct(); }) : direct());
    return chain.catch(function (e) {
      if (e && (e.code === "HTTP" || e.code === "EMPTY" || e.code === "FORMAT")) throw e;
      if (options.allowReader) return viaReader();
      var m = err("CORS", "Ce site n'autorise pas la lecture directe depuis un autre site. Solutions : enregistre la page (Ctrl+S) ou imprime-la en PDF puis dépose le fichier ; copie-colle le texte ; ou coche « service de lecture externe » ci-dessous ; ou utilise le serveur PHP du jeu.");
      throw m;
    }).then(done);
  }

  var QcmExtract = { fromFile: fromFile, fromUrl: fromUrl, MAX_BYTES: MAX_BYTES };
  root.QcmExtract = QcmExtract;
  if (typeof module !== "undefined" && module.exports) module.exports = QcmExtract;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
