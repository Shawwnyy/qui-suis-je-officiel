/* ============================================================================
   IMAGES DU COURS pour le QCM

   QcmImages.fromPdfDoc(doc, { onStatus })  → Promise<[{ page, url, w, h, score }]>    (dans le navigateur, avec pdf.js déjà chargé)
   QcmImages.assign(questions, pageTexts, images, { max, maxChars }) → { assigned, candidates, pages }
   Les fonctions « pures » (matrices, filtres, doublons, association) n'ont pas besoin du DOM : testables avec Node (tests/qcmimages.test.js).

   Principe : on repère dans chaque page les images réellement dessinées (liste d'opérations de pdf.js + matrice de transformation), on garde
   les vraies figures (ni icônes, ni filets, ni fonds de page, ni logos répétés), on les recadre dans le rendu de la page, on les réduit
   (JPEG ≤ ~120 Ko) puis on les rattache aux questions dont la phrase source se trouve sur la même page.
   Rien n'est envoyé sur Internet : tout se passe sur l'appareil.
   Limites : seules les images « bitmap » sont reprises (pas les schémas dessinés en vectoriel) ; un cours scanné (page = une seule image) n'a pas d'image reprise.
   ============================================================================ */
(function (root) {
  "use strict";

  var MAX_IMAGES = 12;               /* images jointes à un même thème */
  var MAX_CHARS = 1400000;           /* total des images (texte base64) : reste raisonnable pour le stockage du navigateur */
  var ONE_MAX = 120000;              /* une image : sous la limite de QMedia (170 000) */
  var MAX_PER_PAGE = 3, MAX_CAND = 60, MAX_RENDER_PAGES = 90, BUDGET_MS = 30000, OUT_W = 640;

  /* ---------- Outils purs ---------- */
  function mul(m, t) {                                      /* même sens que ctx.transform() : le point passe d'abord par t, puis par m */
    return [m[0] * t[0] + m[2] * t[1], m[1] * t[0] + m[3] * t[1], m[0] * t[2] + m[2] * t[3], m[1] * t[2] + m[3] * t[3],
      m[0] * t[4] + m[2] * t[5] + m[4], m[1] * t[4] + m[3] * t[5] + m[5]];
  }
  function finite(a) { return Array.isArray(a) && a.length >= 6 && a.slice(0, 6).every(function (v) { return typeof v === "number" && isFinite(v); }); }

  /* Parcourt les opérations d'une page : renvoie les images dessinées [{ m, w, h }] (m = matrice vers l'espace de la page). */
  function imagesFromOps(fnArray, argsArray, OPS) {
    var out = [], stack = [], m = [1, 0, 0, 1, 0, 0];
    if (!fnArray || !argsArray || !OPS) return out;
    for (var i = 0; i < fnArray.length && out.length < 400; i++) {
      var fn = fnArray[i], a = argsArray[i];
      if (fn === OPS.save) { if (stack.length < 200) stack.push(m.slice()); }
      else if (fn === OPS.restore) { if (stack.length) m = stack.pop(); }
      else if (fn === OPS.transform) { if (finite(a)) m = mul(m, a); }
      else if (fn === OPS.paintFormXObjectBegin) { if (stack.length < 200) stack.push(m.slice()); if (a && finite(a[0])) m = mul(m, a[0]); }
      else if (fn === OPS.paintFormXObjectEnd) { if (stack.length) m = stack.pop(); }
      else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        var w = 0, h = 0;
        if (fn === OPS.paintImageXObject) { w = (a && a[1]) | 0; h = (a && a[2]) | 0; }
        else if (a && a[0]) { w = a[0].width | 0; h = a[0].height | 0; }
        out.push({ m: m.slice(), w: w, h: h });
      }
    }
    return out;
  }
  /* Rectangle (en points de page, origine en bas à gauche) occupé par une image dessinée dans le carré unité. */
  function rectOf(m) {
    var xs = [], ys = [];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (p) { xs.push(m[0] * p[0] + m[2] * p[1] + m[4]); ys.push(m[1] * p[0] + m[3] * p[1] + m[5]); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  /* Une vraie figure : ni icône, ni filet, ni fond de page entier. pageW / pageH en points. */
  function keepRect(r, pageW, pageH, px) {
    if (!r || !isFinite(r.w) || !isFinite(r.h)) return false;
    if (r.w < 60 || r.h < 45 || r.w * r.h < 6000) return false;
    var ratio = r.w / r.h; if (ratio > 7 || ratio < 1 / 7) return false;
    if (r.w * r.h > 0.85 * pageW * pageH) return false;                 /* fond de page, scan : la page entière contiendrait aussi la réponse */
    if (px && px.w && px.h && (Math.min(px.w, px.h) < 40 || px.w * px.h < 6000)) return false;
    return true;
  }
  function inter(a, b) { var x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h); return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0; }
  /* Une figure découpée en bandes ou en tuiles : on fusionne les rectangles qui se recouvrent largement ou se touchent. */
  function mergeRects(list) {
    var rs = list.map(function (r) { return { x: r.x, y: r.y, w: r.w, h: r.h }; }), changed = true, guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (var i = 0; i < rs.length && !changed; i++) for (var j = i + 1; j < rs.length && !changed; j++) {
        var a = rs[i], b = rs[j], g = 3;
        var near = a.x - g < b.x + b.w && b.x - g < a.x + a.w && a.y - g < b.y + b.h && b.y - g < a.y + a.h;
        if (near && (inter(a, b) > 0.3 * Math.min(a.w * a.h, b.w * b.h) || (Math.abs(a.x - b.x) < g * 2 && Math.abs(a.w - b.w) < g * 2) || (Math.abs(a.y - b.y) < g * 2 && Math.abs(a.h - b.h) < g * 2))) {
          var x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h);
          rs[i] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; rs.splice(j, 1); changed = true;
        }
      }
    }
    return rs;
  }
  function hamming(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return 99;
    var d = 0; for (var i = 0; i < a.length; i++) if (a.charAt(i) !== b.charAt(i)) d++; return d;
  }
  /* Logos, bandeaux et pictogrammes répétés : une image qui revient sur 3 pages ou plus est de la décoration ; sur 2 pages, on garde la première. */
  function dedupe(list) {
    var groups = [];
    list.forEach(function (it) {
      var g = null;
      for (var i = 0; i < groups.length; i++) if (hamming(groups[i].hash, it.hash) <= 6) { g = groups[i]; break; }
      if (!g) { g = { hash: it.hash, items: [] }; groups.push(g); }
      g.items.push(it);
    });
    var out = [];
    groups.forEach(function (g) {
      var pages = {}; g.items.forEach(function (it) { pages[it.page] = 1; });
      if (Object.keys(pages).length >= 3) return;
      var firstPage = Math.min.apply(null, g.items.map(function (it) { return it.page; }));
      g.items.forEach(function (it) { if (Object.keys(pages).length === 1 || it.page === firstPage) out.push(it); });     /* 2 pages : on garde la première */
    });
    return out.sort(function (a, b) { return a.page - b.page || b.score - a.score; });
  }

  /* ---------- Association images ↔ questions ---------- */
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  /* Page (0, 1, 2…) où se trouve la phrase ; -1 si introuvable. On essaie la phrase entière, puis son début, sa fin et son milieu (une phrase peut chevaucher deux pages). */
  function locatePage(sentence, pageNorms) {
    var n = norm(sentence); if (n.length < 20 || !pageNorms) return -1;
    var mid = n.length >> 1, probes = [n, n.slice(0, 60), n.slice(-60), n.slice(Math.max(0, mid - 30), mid + 30)];
    for (var k = 0; k < probes.length; k++) for (var i = 0; i < pageNorms.length; i++) if (probes[k].length >= 20 && pageNorms[i].indexOf(probes[k]) >= 0) return i;
    return -1;
  }
  function validUrl(u) { return typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u) && u.length <= ONE_MAX + 20000; }
  /* Joint une image (au plus une par figure) aux questions dont la phrase source est sur la même page. Modifie les questions : q.media, q.figurePage. */
  function assign(questions, pageTexts, images, opts) {
    opts = opts || {};
    var max = opts.max == null ? MAX_IMAGES : opts.max, maxChars = opts.maxChars == null ? MAX_CHARS : opts.maxChars;
    var res = { assigned: 0, candidates: Array.isArray(images) ? images.length : 0, pages: 0, chars: 0 };
    (questions || []).forEach(function (q) { if (q) { delete q.media; delete q.figurePage; } });
    if (!questions || !questions.length || !Array.isArray(pageTexts) || !pageTexts.length || !Array.isArray(images) || !images.length) return res;
    var norms = pageTexts.map(norm), byPage = {}, pagesSeen = {};
    images.forEach(function (im) { if (im && validUrl(im.url) && im.page >= 0) { (byPage[im.page] = byPage[im.page] || []).push({ im: im, used: false }); pagesSeen[im.page] = 1; } });
    res.pages = Object.keys(pagesSeen).length;
    questions.forEach(function (q) {
      if (!q || res.assigned >= max || !q.src) return;
      var p = locatePage(q.src, norms); if (p < 0 || !byPage[p]) return;
      var best = null; byPage[p].forEach(function (c) { if (!c.used && (!best || (c.im.score || 0) > (best.im.score || 0))) best = c; });
      if (!best || res.chars + best.im.url.length > maxChars) return;
      best.used = true; res.chars += best.im.url.length; res.assigned++;
      q.media = { type: "image", url: best.im.url }; q.figurePage = p + 1;
    });
    return res;
  }

  var api = { mul: mul, imagesFromOps: imagesFromOps, rectOf: rectOf, keepRect: keepRect, mergeRects: mergeRects, hamming: hamming, dedupe: dedupe,
    locatePage: locatePage, assign: assign, norm: norm, pageNorms: function (pageTexts) { return Array.isArray(pageTexts) ? pageTexts.map(norm) : null; }, LIMITS: { MAX_IMAGES: MAX_IMAGES, MAX_CHARS: MAX_CHARS, ONE_MAX: ONE_MAX } };
  root.QcmImages = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ---------- Navigateur : recadrage dans le rendu de la page ---------- */
  function canvasOf(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  /* Empreinte 8×8 (hash de différences) + contraste ; une image presque unie n'est pas une figure. */
  function fingerprint(canvas) {
    var s = canvasOf(9, 8), x = s.getContext("2d", { willReadFrequently: true });
    x.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 9, 8);
    var d = x.getImageData(0, 0, 9, 8).data, g = [], sum = 0, i, j;
    for (i = 0; i < 72; i++) { var v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g.push(v); sum += v; }
    var mean = sum / 72, varc = 0; g.forEach(function (v) { varc += (v - mean) * (v - mean); });
    var hash = ""; for (j = 0; j < 8; j++) for (i = 0; i < 8; i++) hash += g[j * 9 + i] > g[j * 9 + i + 1] ? "1" : "0";
    return { hash: hash, std: Math.sqrt(varc / 72) };
  }
  function encode(src, rect) {
    var w = rect.w, h = rect.h, k = Math.min(1, OUT_W / w), q = 0.72, url = "";
    for (var tries = 0; tries < 6; tries++) {
      var c = canvasOf(w * k, h * k), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(src, rect.x, rect.y, w, h, 0, 0, c.width, c.height);
      url = c.toDataURL("image/jpeg", q);
      if (url.length <= ONE_MAX) return { url: url, w: c.width, h: c.height };
      k *= 0.8; q = Math.max(0.42, q - 0.08);
    }
    return null;
  }
  function pageImages(page, index, OPS) {
    return page.getOperatorList().then(function (ol) {
      var base = page.getViewport({ scale: 1 }), pw = base.width, ph = base.height;
      var found = imagesFromOps(ol.fnArray, ol.argsArray, OPS), kept = [];
      found.forEach(function (f) { var r = rectOf(f.m); if (keepRect(r, pw, ph, { w: f.w, h: f.h })) kept.push(r); });
      if (!kept.length) return [];
      var merged = mergeRects(kept).filter(function (r) { return keepRect(r, pw, ph, null); });
      merged.sort(function (a, b) { return b.w * b.h - a.w * a.h; });
      merged = merged.slice(0, MAX_PER_PAGE);
      if (!merged.length) return [];
      var scale = Math.min(2.2, 1300 / pw), vp = page.getViewport({ scale: scale }), canvas = canvasOf(vp.width, vp.height), ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        var out = [];
        merged.forEach(function (r) {
          var p0 = vp.convertToViewportPoint(r.x, r.y), p1 = vp.convertToViewportPoint(r.x + r.w, r.y + r.h);
          var x0 = Math.max(0, Math.min(p0[0], p1[0])), y0 = Math.max(0, Math.min(p0[1], p1[1])), x1 = Math.min(canvas.width, Math.max(p0[0], p1[0])), y1 = Math.min(canvas.height, Math.max(p0[1], p1[1]));
          var rect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.floor(x1 - x0), h: Math.floor(y1 - y0) };
          if (rect.w < 40 || rect.h < 30) return;
          var tmp = canvasOf(rect.w, rect.h); tmp.getContext("2d").drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
          var fp = fingerprint(tmp); if (fp.std < 9) return;               /* image presque unie : fond, filet épais, ombre */
          var enc = encode(canvas, rect); if (!enc) return;
          out.push({ page: index, url: enc.url, w: enc.w, h: enc.h, score: r.w * r.h, hash: fp.hash });
        });
        return out;
      });
    });
  }
  /* doc : document pdf.js déjà ouvert. Ne lève jamais d'erreur : en cas de souci, on rend ce qu'on a (souvent rien). */
  function fromPdfDoc(doc, options) {
    options = options || {};
    var lib = root.pdfjsLib, OPS = lib && lib.OPS;
    if (!doc || !OPS || typeof document === "undefined") return Promise.resolve([]);
    var total = Math.min(doc.numPages || 0, 400), t0 = Date.now(), all = [], rendered = 0, chain = Promise.resolve();
    for (var n = 1; n <= total; n++) (function (num) {
      chain = chain.then(function () {
        if (Date.now() - t0 > (options.budgetMs || BUDGET_MS) || all.length >= MAX_CAND || rendered >= MAX_RENDER_PAGES) return;
        if (options.onStatus) options.onStatus("Lecture des images du cours… (page " + num + " / " + total + ")");
        return doc.getPage(num).then(function (page) {
          return pageImages(page, num - 1, OPS).then(function (list) { if (list.length) rendered++; all = all.concat(list); try { page.cleanup(); } catch (e) {} });
        }).catch(function () {});
      });
    })(n);
    return chain.then(function () { return dedupe(all).slice(0, MAX_CAND); }, function () { return []; });
  }
  api.fromPdfDoc = fromPdfDoc;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
