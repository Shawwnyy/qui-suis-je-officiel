/* ============================================================================
   EXTRACTION DU TEXTE D'UN DOCUMENT (dans le navigateur)
   QcmExtract.fromFile(file, { phpUrl }) → Promise<{ text, pages, via }>
   Formats : PDF (pdf.js), ODT / DOCX (JSZip), TXT / MD / CSV (lecture directe).
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

  /* ---------- Serveur PHP (secours) ---------- */
  function fromServer(file, phpUrl) {
    var fd = new FormData();
    fd.append("file", file, file.name);
    return fetch(phpUrl + (phpUrl.indexOf("?") < 0 ? "?" : "&") + "action=extract", { method: "POST", body: fd }).then(function (r) {
      return r.json().catch(function () { throw err("SERVER", "Réponse du serveur illisible."); });
    }).then(function (j) {
      if (!j || !j.ok) throw err("SERVER", (j && j.error) || "Le serveur n'a pas pu lire ce fichier.");
      return { text: j.text || "", via: "php" };
    });
  }

  function fromFile(file, options) {
    options = options || {};
    if (!file) return Promise.reject(err("NOFILE", "Aucun fichier choisi."));
    if (file.size > MAX_BYTES) return Promise.reject(err("SIZE", "Fichier trop volumineux (25 Mo maximum)."));
    var e = ext(file.name), job;
    if (e === "pdf" || file.type === "application/pdf") job = fromPdf(file);
    else if (e === "odt") job = fromOdt(file);
    else if (e === "docx") job = fromDocx(file);
    else if (e === "txt" || e === "md" || e === "csv" || (file.type || "").indexOf("text/") === 0) job = file.text().then(function (t) { return { text: t, via: "texte" }; });
    else return Promise.reject(err("FORMAT", "Format non pris en charge (« ." + (e || "?") + " »). Utilise PDF, ODT, DOCX ou TXT. Pour un ancien .doc, enregistre-le d'abord en .odt ou .docx."));

    return job.catch(function (e1) {
      if (e1 && (e1.code === "CDN" || e1.code === undefined) && options.phpUrl) {
        return fromServer(file, options.phpUrl).catch(function () { throw e1; });
      }
      throw e1;
    }).then(function (r) {
      var text = String(r.text || "").replace(/\u0000/g, "");
      if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
      if (text.replace(/\s+/g, "").length < 200) throw err("EMPTY", "Aucun texte exploitable dans ce document. S'il s'agit d'un scan (image), il faut d'abord le passer par une reconnaissance de texte (OCR).");
      r.text = text;
      return r;
    });
  }

  var QcmExtract = { fromFile: fromFile, MAX_BYTES: MAX_BYTES };
  root.QcmExtract = QcmExtract;
  if (typeof module !== "undefined" && module.exports) module.exports = QcmExtract;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
