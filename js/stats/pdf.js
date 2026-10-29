/* =============================================================================
   V40 — Export PDF des statistiques (tableaux ET graphiques), sans aucune bibliothèque externe.

   Le PDF est écrit directement (police Helvetica intégrée à tous les lecteurs, texte et graphiques vectoriels :
   net à n'importe quel zoom, texte sélectionnable). Fonctionne hors connexion. Aucun accès au DOM : testable avec Node.
   V40Pdf.build(log, {theme})    → Uint8Array (le fichier PDF) ; theme = "light" (fond blanc, défaut) ou "dark" (fond sombre)
   V40Pdf.download(log, {theme}) → télécharge le fichier dans le navigateur
   ============================================================================= */
var V40Pdf = (function () {
  "use strict";
  var A = (typeof V40Analysis !== "undefined") ? V40Analysis : (typeof require === "function" ? require("./analysis.js") : null);

  /* Largeurs des caractères (pour 1000 unités) de Helvetica et Helvetica-Bold, codes 32 à 255 (encodage Windows-1252). */
  var W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500];
  var W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556];
  /* Caractères Windows-1252 hors Latin-1 (0x80–0x9F). */
  var CP = { "€": 128, "‚": 130, "ƒ": 131, "„": 132, "…": 133, "†": 134, "‡": 135, "ˆ": 136, "‰": 137, "Š": 138, "‹": 139, "Œ": 140, "Ž": 142, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "˜": 152, "™": 153, "š": 154, "›": 155, "œ": 156, "ž": 158, "Ÿ": 159 };

  /* Texte → octets Windows-1252 ; les emojis et symboles absents de la police sont retirés. */
  function toCp(s) {
    var out = [];
    s = String(s == null ? "" : s).normalize("NFC").replace(/ | /g, " ").replace(/[‐‑‒]/g, "-").replace(/[→▶]/g, ">").replace(/✓/g, "v");
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0xd800 && c <= 0xdfff)) continue;   /* jointures, sélecteurs de variante, emojis (paires de substitution) */
      if (c >= 32 && c < 127) out.push(c);
      else if (c >= 160 && c <= 255) out.push(c);
      else if (CP[s.charAt(i)]) out.push(CP[s.charAt(i)]);
      else if (c === 9 || c === 10 || c === 13) out.push(32);
    }
    return out;
  }
  var REV = {}; Object.keys(CP).forEach(function (ch) { REV[CP[ch]] = ch; });
  /* Texte nettoyé : reste en Unicode (les octets Windows-1252 sont reconvertis), sans emoji ni retour à la ligne. */
  function clean(s) { return toCp(s).map(function (b) { return REV[b] || String.fromCharCode(b); }).join("").replace(/\s+/g, " ").trim(); }
  function widthOf(s, size, bold) {
    var t = bold ? W_BOLD : W_REG, bytes = toCp(s), sum = 0;
    for (var i = 0; i < bytes.length; i++) sum += t[bytes[i] - 32] || 0;
    return sum * size / 1000;
  }
  function fit(s, maxW, size, bold) {
    s = clean(s);
    if (widthOf(s, size, bold) <= maxW) return s;
    while (s.length > 1 && widthOf(s + "…", size, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/\s+$/, "") + "…";
  }
  function wrap(s, maxW, size, bold) {
    var words = clean(s).split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (widthOf(t, size, bold) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function pdfStr(bytes) {
    var o = "(";
    for (var i = 0; i < bytes.length; i++) {
      var c = bytes[i];
      if (c === 40 || c === 41 || c === 92) o += "\\" + String.fromCharCode(c);
      else if (c < 32 || c > 126) o += "\\" + ("00" + c.toString(8)).slice(-3);
      else o += String.fromCharCode(c);
    }
    return o + ")";
  }
  function num(n) { return (Math.round(n * 100) / 100).toString(); }
  function rgb(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(String(hex))) throw new Error("Couleur invalide : " + hex);
    var h = String(hex).replace("#", "");
    return [0, 2, 4].map(function (i) { return num(parseInt(h.substr(i, 2), 16) / 255); }).join(" ");
  }

  /* ---------- Écrivain PDF minimal (A4 portrait, origine en haut à gauche, unité = point) ---------- */
  var PW = 595.28, PH = 841.89;
  function Writer(meta) {
    this.pages = []; this.cur = null; this.meta = meta || {};
    this.bg = this.meta.bg || null; this.ink = this.meta.ink || "#1a1a19"; this.edge = this.meta.edge || "#d4d3cf";
    this.addPage();
  }
  Writer.prototype.addPage = function () { this.cur = []; this.pages.push(this.cur); if (this.bg) this.rect(0, 0, PW, PH, { fill: this.bg }); return this.pages.length; };
  Writer.prototype.raw = function (s) { this.cur.push(s); };
  Writer.prototype.text = function (x, y, s, o) {
    o = o || {}; var size = o.size || 10, bold = !!o.bold, str = o.maxW ? fit(s, o.maxW, size, bold) : clean(s);
    if (!str) return;
    var w = widthOf(str, size, bold);
    if (o.align === "right") x -= w; else if (o.align === "center") x -= w / 2;
    this.raw("BT /" + (bold ? "F2" : "F1") + " " + num(size) + " Tf " + rgb(o.color || this.ink) + " rg 1 0 0 1 " + num(x) + " " + num(PH - y) + " Tm " + pdfStr(toCp(str)) + " Tj ET");
  };
  Writer.prototype.line = function (x1, y1, x2, y2, o) {
    o = o || {};
    this.raw("q " + rgb(o.color || this.edge) + " RG " + num(o.w || 0.5) + " w " + (o.dash ? "[" + o.dash.join(" ") + "] 0 d " : "") + num(x1) + " " + num(PH - y1) + " m " + num(x2) + " " + num(PH - y2) + " l S Q");
  };
  Writer.prototype.poly = function (pts, o) {
    if (pts.length < 2) return; o = o || {};
    var d = pts.map(function (p, i) { return num(p[0]) + " " + num(PH - p[1]) + (i ? " l" : " m"); }).join(" ");
    this.raw("q " + rgb(o.color || "#3987e5") + " RG " + num(o.w || 1.6) + " w 1 J 1 j " + d + " S Q");
  };
  Writer.prototype.rect = function (x, y, w, h, o) {
    o = o || {}; var op = o.fill && o.stroke ? "B" : (o.fill ? "f" : "S");
    this.raw("q " + (o.fill ? rgb(o.fill) + " rg " : "") + (o.stroke ? rgb(o.stroke) + " RG " + num(o.w || 0.5) + " w " : (o.fill ? "" : rgb(this.edge) + " RG 0.5 w ")) + num(x) + " " + num(PH - y - h) + " " + num(w) + " " + num(h) + " re " + op + " Q");
  };
  Writer.prototype.dot = function (cx, cy, r, color) {
    var k = 0.5523 * r, X = cx, Y = PH - cy;
    this.raw("q " + rgb(color) + " rg " + num(X + r) + " " + num(Y) + " m " + num(X + r) + " " + num(Y + k) + " " + num(X + k) + " " + num(Y + r) + " " + num(X) + " " + num(Y + r) + " c " + num(X - k) + " " + num(Y + r) + " " + num(X - r) + " " + num(Y + k) + " " + num(X - r) + " " + num(Y) + " c " + num(X - r) + " " + num(Y - k) + " " + num(X - k) + " " + num(Y - r) + " " + num(X) + " " + num(Y - r) + " c " + num(X + k) + " " + num(Y - r) + " " + num(X + r) + " " + num(Y - k) + " " + num(X + r) + " " + num(Y) + " c f Q");
  };
  Writer.prototype.finish = function () {
    var objs = [], self = this;
    function add(s) { objs.push(s); return objs.length; }
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add("");                                                                   /* 2 : liste des pages, remplie plus bas */
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    var meta = this.meta, info = add("<< /Title " + pdfStr(toCp(meta.title || "")) + " /Author " + pdfStr(toCp(meta.author || "")) + " /Creator " + pdfStr(toCp("Qui suis-je ?")) + " >>");
    var kids = [];
    this.pages.forEach(function (ops) {
      var content = ops.join("\n"), cid = add("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
      kids.push(add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(PW) + " " + num(PH) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + cid + " 0 R >>") + " 0 R");
    });
    objs[1] = "<< /Type /Pages /Count " + kids.length + " /Kids [" + kids.join(" ") + "] >>";
    var out = "%PDF-1.4\n", offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
    var xref = out.length;
    out += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + offs.map(function (o) { return ("0000000000" + o).slice(-10) + " 00000 n \n"; }).join("");
    out += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R /Info " + info + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    var bytes = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  };

  /* ---------- Mise en page du rapport ---------- */
  /* Deux thèmes. Séries : mêmes teintes dans le même ordre ; le jeu sombre est celui des graphiques à l'écran (validé sur #1a1a19). */
  var PALETTES = {
    light: { bg: null, ink: "#1a1a19", sub: "#52514e", mute: "#6f6e69", grid: "#e1e0dc", line: "#c9c8c3", band: "#f4f3f0", card: "#faf9f7", head: "#2d2a4a", headSub: "#d9d6f2",
      good: "#0c8a0c", bad: "#d03b3b", none: "#6f6e69", accent: "#4c1d95", cross: "#ffffff", edge: "#d4d3cf",
      series: ["#2a6fd6", "#c8501a", "#12856a", "#a86e00", "#c23d73", "#2f7d00", "#6f63d6", "#d03b3b"] },
    dark: { bg: "#1a1a19", ink: "#f0efec", sub: "#c3c2b7", mute: "#a3a29b", grid: "#2c2c2a", line: "#4a4945", band: "#2a2a28", card: "#222220", head: "#34305a", headSub: "#d9d6f2",
      good: "#2db84d", bad: "#ec5b5b", none: "#8a8983", accent: "#b9a8ff", cross: "#1a1a19", edge: "#4a4945",
      series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"] }
  };
  var NSERIES = 8;
  var M = 40, CW = PW - 2 * M;                                                                          /* marges et largeur utile */

  function ordinalFr(n) { return n === 1 ? "1er" : n + "e"; }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "#" + pa.map(function (v, i) { return ("0" + Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))).toString(16)).slice(-2); }).join("");
  }
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var x = parseInt(hex.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function pct(x) { return x === null || x === undefined ? "–" : Math.round(x * 100) + " %"; }
  function secs(x) { return x === null || x === undefined ? "–" : x.toFixed(1).replace(".", ",") + " s"; }
  function dateFr(ms) { try { return new Date(ms || Date.now()).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }); } catch (e) { return ""; } }
  var DIFF = { facile: "Facile", moyen: "Moyen", difficile: "Difficile", impossible: "Impossible" };
  var LEVEL = { 1: "Avertissement", 2: "Malus", 3: "Exclusion" };

  function build(log, opts) {
    opts = opts || {};
    if (!log || !log.P || !log.R) throw new Error("Aucune partie à exporter.");
    var theme = opts.theme === "dark" ? "dark" : "light", C = PALETTES[theme], SERIES = C.series;
    var t = A.totals(log), rows = A.perPlayer(log), W = new Writer({ title: "Statistiques de la partie - Qui suis-je ?", author: "Qui suis-je ?", bg: C.bg, ink: C.ink, edge: C.edge });
    var y = 0, pageNo = 1;

    function header(sub) {
      W.rect(0, 0, PW, 54, { fill: C.head });
      W.text(M, 26, "Qui suis-je ? — Statistiques", { size: 17, bold: true, color: "#ffffff" });
      W.text(M, 43, sub || (dateFr(log.at) + " · " + log.P.length + " joueur" + (log.P.length > 1 ? "s" : "") + " · " + log.R.length + " question" + (log.R.length > 1 ? "s" : "")), { size: 9.5, color: C.headSub });
      y = 78;
    }
    function newPage(sub) { W.addPage(); pageNo++; header(sub || "Statistiques de la partie (suite)"); }
    function room(h, sub) { if (y + h > PH - 46) newPage(sub); }
    function title(s, keep) { room(48 + (keep || 0)); W.text(M, y, s, { size: 13, bold: true, color: C.accent }); W.line(M, y + 5, M + CW, y + 5, { color: C.accent, w: 0.8 }); y += 22; }
    function note(s) { wrap(s, CW, 8.5, false).forEach(function (l) { room(12); W.text(M, y, l, { size: 8.5, color: C.mute }); y += 11; }); y += 4; }

    /* Axe gradué sous un graphique en barres (comme à l'écran : 0, ¼, ½, ¾, max) */
    function axisRow(bx, bw, top, f) {
      room(16);
      W.line(bx, y - 10, bx + bw, y - 10, { color: C.line, w: 0.5 });
      for (var k = 0; k <= 4; k++) {
        var gx = bx + bw * k / 4;
        W.line(gx, y - 12, gx, y - 8, { color: C.line, w: 0.5 });
        W.text(gx, y + 1, f(top * k / 4), { size: 7.5, color: C.mute, align: k === 0 ? "left" : k === 4 ? "right" : "center" });
      }
      y += 14;
    }
    function tickNum(top) { return function (v) { return top >= 5 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString().replace(".", ","); }; }

    /* Tableau générique : cols = [{h, w (largeur relative), a: "left"|"right"|"center", f(row) → texte, color(row) → couleur}] */
    function table(cols, data, o) {
      o = o || {}; var fs = o.size || 9, rh = o.rh || 16, total = cols.reduce(function (s, c) { return s + c.w; }, 0), xs = [], x = M;
      cols.forEach(function (c) { c.pw = c.w / total * CW; xs.push(x); x += c.pw; });
      function head() {
        W.rect(M, y - 11, CW, rh, { fill: C.band });
        cols.forEach(function (c, i) { var tx = c.a === "right" ? xs[i] + c.pw - 4 : (c.a === "center" ? xs[i] + c.pw / 2 : xs[i] + 4); W.text(tx, y, c.h, { size: fs - 0.5, bold: true, color: C.sub, align: c.a || "left", maxW: c.pw - 8 }); });
        y += rh;
      }
      if (y + rh * 3 > PH - 46) newPage();
      head();
      data.forEach(function (r, ri) {
        if (y + rh > PH - 46) { newPage(); head(); }
        if (ri % 2 === 1) W.rect(M, y - 11, CW, rh, { fill: C.card });
        cols.forEach(function (c, i) {
          var tx = c.a === "right" ? xs[i] + c.pw - 4 : (c.a === "center" ? xs[i] + c.pw / 2 : xs[i] + 4);
          W.text(tx, y, c.f(r, ri), { size: fs, bold: !!(c.bold && c.bold(r)), color: (c.color && c.color(r)) || C.ink, align: c.a || "left", maxW: c.pw - 8 });
        });
        y += rh;
      });
      W.line(M, y - 11, M + CW, y - 11, { color: C.line, w: 0.5 });
      y += 12;
    }

    /* ----- Page 1 : chiffres clés ----- */
    header();
    var kpis = [["Joueurs", String(t.players)], ["Questions", String(t.rounds)], ["Réussite", pct(t.accuracy)], ["Temps moyen", secs(t.avgTime)], ["Infractions", String(t.cheats)]];
    var kw = (CW - 4 * 10) / 5;
    kpis.forEach(function (k, i) {
      var x = M + i * (kw + 10);
      W.rect(x, y - 14, kw, 52, { fill: C.card, stroke: C.grid, w: 0.8 });
      W.text(x + 10, y + 3, k[0], { size: 8.5, color: C.sub, maxW: kw - 16 });
      W.text(x + 10, y + 26, k[1], { size: 18, bold: true, color: i === 4 && t.cheats ? C.bad : C.ink, maxW: kw - 16 });
    });
    y += 58;

    /* ----- Classement ----- */
    var ranked0 = rows;
    title("Classement des joueurs", 16 * Math.min(ranked0.length + 1, 14));
    var ranked = rows.slice().sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; });
    table([
      { h: "#", w: 4, a: "center", f: function (r) { return String(r.rank); } },
      { h: "Joueur", w: 24, f: function (r) { return r.name + (r.host ? " (hôte)" : "") + (r.left ? " — parti" : ""); }, bold: function (r) { return r.rank === 1; } },
      { h: "Score", w: 9, a: "right", f: function (r) { return String(r.final); }, bold: function () { return true; } },
      { h: "Justes", w: 8, a: "right", f: function (r) { return String(r.correct); } },
      { h: "Fausses", w: 8, a: "right", f: function (r) { return String(r.wrong); } },
      { h: "Sans rép.", w: 9, a: "right", f: function (r) { return String(r.none); } },
      { h: "Réussite", w: 9, a: "right", f: function (r) { return pct(r.accuracy); } },
      { h: "Temps moy.", w: 10, a: "right", f: function (r) { return secs(r.avgTime); } },
      { h: "Infract.", w: 8, a: "right", f: function (r) { return String(r.cheats); }, color: function (r) { return r.cheats ? C.bad : C.ink; } }
    ], ranked);
    /* ----- Classement à la mi-partie (avec les places gagnées ou perdues jusqu'à la fin) ----- */
    if (log.R.length >= 2) {
      var halfK = Math.ceil(log.R.length / 2), halfRows = A.rankingAt(log, halfK), endPos = {};
      A.rankingAt(log, log.R.length).forEach(function (r) { endPos[r.idx] = r.rank; });
      y += 8;
      title("Classement à la mi-partie (après la question " + halfK + " sur " + log.R.length + ")", 16 * Math.min(halfRows.length + 1, 14));
      table([
        { h: "#", w: 4, a: "center", f: function (r) { return String(r.rank); } },
        { h: "Joueur", w: 26, f: function (r) { return r.name; }, bold: function (r) { return r.rank === 1; } },
        { h: "Score", w: 10, a: "right", f: function (r) { return String(r.score); }, bold: function () { return true; } },
        { h: "Écart avec le 1er", w: 14, a: "right", f: function (r) { return r.gap ? "-" + r.gap : "-"; } },
        { h: "Rang final", w: 10, a: "center", f: function (r) { var d = r.rank - endPos[r.idx]; return endPos[r.idx] + (d > 0 ? "  (+" + d + ")" : d < 0 ? "  (" + d + ")" : ""); } }
      ], halfRows);
    }

    /* ----- Trophées de la partie ----- */
    var trophies = A.awards(log);
    if (trophies.length) {
      y += 8;
      title("Troph\u00e9es de la partie", 16 * Math.min(trophies.length + 1, 14));
      table([
        { h: "Troph\u00e9e", w: 20, f: function (a) { return a.title; }, bold: function () { return true; } },
        { h: "Gagnant(e)", w: 26, f: function (a) { return A.awardNames(a, 3); } },
        { h: "D\u00e9tail", w: 24, f: function (a) { return a.detail || ""; } }
      ], trophies);
    }

    /* ----- Couleur d'un joueur : la même dans tous les graphiques (selon son rang final) ----- */
    var series = A.scoreSeries(log), order = ranked.slice(0, SERIES.length), colorOf = {};
    order.forEach(function (r, i) { colorOf[r.idx] = SERIES[i]; });
    function plottedSeries(valuesOf) { return order.map(function (r) { return { name: r.name, color: colorOf[r.idx], values: valuesOf(r) }; }); }

    /* Courbes vectorielles : o = { n, min, max, step, yFmt, invert, xTitle, series: [{name, color, values[0..n] (null = pas de point)}] } + légende (toujours présente) */
    function lineChart(titleText, o) {
      var ch = 190, cw = CW - 4, n = o.n, bot = o.min, top = o.max, step = o.step > 0 ? o.step : 1;
      if (!(top > bot)) top = bot + step;
      var span = top - bot;
      room(ch + 70); title(titleText);
      var px0 = M + 38, px1 = M + cw - 16, py0 = y + 4, py1 = y + ch - 24;
      function yOf(v) { var f = Math.max(0, Math.min(1, (v - bot) / span)); return o.invert ? py0 + f * (py1 - py0) : py1 - f * (py1 - py0); }
      var cnt = Math.min(40, Math.round(span / step));
      for (var k = 0; k <= cnt; k++) {
        var g = bot + k * step, gy = yOf(g);
        W.line(px0, gy, px1, gy, { color: g === 0 ? C.line : C.grid, w: g === 0 ? 0.8 : 0.5 });
        var lab = o.yFmt ? o.yFmt(g) : String(Math.round(g));
        if (lab) W.text(px0 - 6, gy + 3, lab, { size: 8, color: C.mute, align: "right" });
      }
      var tickEvery = Math.max(1, Math.ceil(n / 12));
      for (var q = 0; q <= n; q += tickEvery) { var gx = px0 + (n ? q / n : 0) * (px1 - px0); W.text(gx, py1 + 13, String(q), { size: 8, color: C.mute, align: "center" }); }
      W.text((px0 + px1) / 2, py1 + 24, o.xTitle || "Numéro de la question", { size: 8, color: C.mute, align: "center" });
      o.series.forEach(function (sr) {
        var seg = [], last = null;
        function flush() { if (seg.length > 1) W.poly(seg, { color: sr.color, w: 1.7 }); seg = []; }
        sr.values.forEach(function (v, q2) {
          if (v === null || v === undefined || !isFinite(v)) { flush(); return; }
          var X = px0 + (n ? q2 / n : 0) * (px1 - px0), Y = yOf(v);
          seg.push([X, Y]); last = [X, Y];
        });
        flush();
        if (last) W.dot(last[0], last[1], 3, sr.color);
      });
      y += ch + 20;
      var lx = M, ly = y;
      o.series.forEach(function (sr) {
        var label = fit(sr.name, o.series.length === 1 ? CW - 60 : 120, 8.5, false), lw = widthOf(label, 8.5, false) + 26;
        if (lx + lw > M + CW) { lx = M; ly += 14; }
        W.rect(lx, ly - 6, 14, 3.4, { fill: sr.color }); W.dot(lx + 7, ly - 4.3, 3, sr.color);
        W.text(lx + 19, ly, label, { size: 8.5, color: C.sub }); lx += lw + 8;
      });
      y = ly + 16;
    }
    /* Barres empilées : items = [{label, vals[], text}], parts = [{name, color}] (la légende nomme chaque couleur) */
    function stackBars(titleText, items, parts, o) {
      if (!items.length) return;
      o = o || {};
      title(titleText, Math.min(items.length, 8) * 17 + 14);
      var lx = M; room(16);
      parts.forEach(function (pt) {
        var w = widthOf(pt.name, 8, false);
        if (lx + w + 26 > M + CW) { lx = M; y += 12; }
        W.rect(lx, y - 8, 9, 9, { fill: pt.color }); W.text(lx + 13, y, pt.name, { size: 8, color: C.sub }); lx += 13 + w + 16;
      });
      y += 14;
      var lw = 150, textW = o.textW || 150, bx = M + lw, bw = CW - lw - textW - 16, top = 3;
      items.forEach(function (it) { top = Math.max(top, it.vals.reduce(function (a, v) { return a + (v > 0 ? v : 0); }, 0)); });
      items.forEach(function (it) {
        room(18);
        W.text(M, y, it.label, { size: 9, color: C.ink, maxW: lw - 8 });
        W.rect(bx, y - 9, bw, 10, { fill: C.band });
        var x = bx, lastK = -1;
        it.vals.forEach(function (v, k) { if (v > 0) lastK = k; });
        it.vals.forEach(function (v, k) {
          if (!(v > 0)) return;
          var w = bw * v / top;
          W.rect(x, y - 9, Math.max(1.5, w - (k < lastK ? 1.4 : 0)), 10, { fill: parts[k].color });
          x += w;
        });
        W.text(bx + bw + 8, y, it.text, { size: 8.5, color: C.sub, maxW: textW - 8 });
        y += 17;
      });
      axisRow(bx, bw, top, tickNum(top));
      y += 4;
    }
    /* Carte de chaleur : list = joueurs (lignes et colonnes), valueAt(r, c) → nombre ou null (diagonale) */
    function heat(titleText, list, valueAt, maxV, hot) {
      var k = list.length, lw = 110, cwid = Math.min(46, (CW - lw) / k), rh3 = 16;
      room((k + 2) * rh3 + 56); title(titleText);
      list.forEach(function (c, ci) { W.text(M + lw + ci * cwid + cwid / 2, y, c.name, { size: 7.5, bold: true, color: C.sub, align: "center", maxW: cwid - 3 }); });
      y += 8;
      list.forEach(function (r) {
        W.text(M, y + 8, r.name, { size: 8.5, bold: true, color: C.ink, maxW: lw - 8 });
        list.forEach(function (c, ci) {
          var v = valueAt(r, c), x = M + lw + ci * cwid;
          if (v === null) { W.rect(x, y, cwid - 1.5, rh3 - 2, { fill: C.band }); W.text(x + (cwid - 1.5) / 2, y + 9, "·", { size: 9, color: C.mute, align: "center" }); return; }
          var f = v > 0 ? mix(C.band, hot, 0.22 + 0.78 * v / Math.max(1, maxV)) : C.card;
          W.rect(x, y, cwid - 1.5, rh3 - 2, { fill: f, stroke: v > 0 ? null : C.grid, w: 0.5 });
          if (v > 0) W.text(x + (cwid - 1.5) / 2, y + 9.5, String(v), { size: 8.5, bold: true, color: lum(f) > 0.22 ? "#1a1a19" : "#ffffff", align: "center" });
        });
        y += rh3;
      });
      y += 10;
    }

    /* ----- Évolution des scores (courbes vectorielles) ----- */
    if (log.R.length >= 1) {
      var vmin = 0, vmax = 10;
      order.forEach(function (r) { series[r.idx].values.forEach(function (v) { if (v !== null) { vmax = Math.max(vmax, v); vmin = Math.min(vmin, v); } }); });
      var step = niceStep((vmax - vmin) / 4), top = Math.ceil(vmax / step) * step, bot = Math.floor(vmin / step) * step;
      lineChart("Évolution des scores", { n: log.R.length, min: bot, max: top, step: step, series: plottedSeries(function (r) { return series[r.idx].values; }) });
      if (ranked.length > SERIES.length) note("Courbes des " + SERIES.length + " premiers du classement ; tous les joueurs figurent dans les tableaux.");

      /* ----- Analyses avancées : course au classement, forme du moment, qui a mené ----- */
      if (log.P.length >= 2) {
        var rk = A.rankSeries(log), maxRank = 2;
        order.forEach(function (r) { rk[r.idx].values.forEach(function (v) { if (v !== null && v > maxRank) maxRank = v; }); });
        var rstep = Math.max(1, Math.ceil((maxRank - 1) / 7)), rmax = 1 + Math.ceil((maxRank - 1) / rstep) * rstep;
        lineChart("Course au classement", { n: log.R.length, min: 1, max: rmax, step: rstep, invert: true, yFmt: function (v) { return ordinalFr(Math.round(v)); }, series: plottedSeries(function (r) { return rk[r.idx].values; }) });
        note("Place de chaque joueur après chaque question (1er en haut). Les ex æquo partagent la même place.");
        var fm = A.formSeries(log, 3);
        lineChart("Forme du moment", { n: log.R.length, min: 0, max: 100, step: 25, yFmt: function (v) { return Math.round(v) + " %"; }, series: plottedSeries(function (r) { return fm[r.idx].values; }) });
        note("Pourcentage de bonnes réponses sur les 3 dernières questions (moyenne glissante) : qui monte en puissance, qui décroche.");
      }
      var L = A.leadStats(log);
      if (L.n >= 1) {
        valueBars("Qui a mené la partie ?", L.players.slice().sort(function (a, b) { return b.led - a.led || a.idx - b.idx; }).slice(0, 20).map(function (r) {
          return { label: r.name, value: r.led, color: colorOf[r.idx], text: r.led + "/" + L.n + (r.longest > 1 ? " · " + r.longest + " d'affilée" : "") };
        }), null, L.n);
        note("Questions après lesquelles le joueur était en tête (les ex æquo comptent pour chacun) et plus longue période en tête. " + L.changes + " changement" + (L.changes > 1 ? "s" : "") + " de leader" + (L.soleRounds ? " sur " + L.soleRounds + " question" + (L.soleRounds > 1 ? "s" : "") + " avec un seul leader." : "."));
      }
    }
    /* ----- Lettres et mots les plus écrits (chat + textes des questions) ----- */
    var TX = A.textStats(log, "all", false, 15);
    if (TX.totalLetters) {
      var TR = A.textReport(log, false);
      title("Le rapport en quelques phrases", 40);
      TR.lines.forEach(function (l) { wrap("- " + l, CW, 9, false).forEach(function (ln) { room(13); W.text(M, y, ln, { size: 9, color: C.ink }); y += 12; }); y += 3; });
      var lmax = TX.letters[0].n;
      valueBars("Lettres les plus écrites", TX.letters.slice(0, 26).map(function (x) {
        return { label: x.ch, value: x.n, color: C.accent, text: x.n + " · " + (Math.round(x.share * 1000) / 10).toString().replace(".", ",") + " %" };
      }), C.accent, lmax);
      note("Calculé sur le chat (" + TX.messages + " message" + (TX.messages > 1 ? "s" : "") + ") et le texte des " + TX.questions + " question" + (TX.questions > 1 ? "s" : "") + " posée" + (TX.questions > 1 ? "s" : "") + " ; accents ramenés à la lettre de base. Seuls des comptages sont conservés.");
      var vowN = TR.vowels, vTot = TX.totalLetters, pc = function (x) { return (Math.round(x * 1000) / 10).toString().replace(".", ",") + " %"; };
      valueBars("Voyelles et consonnes", [
        { label: "Voyelles", value: vowN, color: C.accent, text: vowN + " · " + pc(vowN / vTot) },
        { label: "Consonnes", value: vTot - vowN, color: C.accent, text: (vTot - vowN) + " · " + pc(1 - vowN / vTot) }
      ], C.accent, Math.max(vowN, vTot - vowN, 1));
      if (TR.chat.totalLetters && TR.q.totalLetters) {
        title("Chat ou questions : qui écrit quoi ?", 60);
        table([{ h: "", w: 2, f: function (r) { return r[0]; } }, { h: "Chat", w: 5, f: function (r) { return r[1]; } }, { h: "Questions", w: 5, f: function (r) { return r[2]; } }], [
          ["Lettres", TR.chat.letters.slice(0, 4).map(function (x) { return x.ch + " " + pc(x.share); }).join(" · "), TR.q.letters.slice(0, 4).map(function (x) { return x.ch + " " + pc(x.share); }).join(" · ")],
          ["Mots", TR.chat.words.slice(0, 3).map(function (x) { return x.w + " (" + x.n + ")"; }).join(" · ") || "-", TR.q.words.slice(0, 3).map(function (x) { return x.w + " (" + x.n + ")"; }).join(" · ") || "-"]
        ], { size: 8.5 });
      }
      if (TX.words.length) {
        valueBars("Mots les plus écrits", TX.words.map(function (x) { return { label: x.w, value: x.n, color: C.accent, text: x.n + " fois" }; }), C.accent, TX.words[0].n);
        note("Hors mots courants (le, de, est…).");
      }
    }
    /* ----- Temps de réaction (onglet « Réactions ») ----- */
    var RS = A.reactionStats(log);
    if (RS.n) {
      var nrr = log.R.length, topT = Math.max(log.qt || 0, RS.overall.max || 1), stepT = Math.max(1, Math.ceil(topT / 5)), maxT2 = Math.ceil(topT / stepT) * stepT;
      var secF = function (v) { return v === null || v === undefined ? "-" : (Math.round(v * 10) / 10).toString().replace(".", ",") + " s"; };
      lineChart("Temps de réaction, question par question", { n: nrr, min: 0, max: maxT2, step: stepT, yFmt: function (v) { return secF(v); }, series: plottedSeries(function (r) { return RS.players[r.idx].perRound; }) });
      note("Temps mis par chaque joueur pour répondre à chaque question ; plus bas = plus rapide. Médiane générale " + secF(RS.overall.median) + ", moyenne " + secF(RS.overall.mean) + ", plus rapide " + secF(RS.fastest.t) + " (" + log.P[RS.fastest.idx].n + ", question " + RS.fastest.round + "), plus lent " + secF(RS.slowest.t) + " (" + log.P[RS.slowest.idx].n + ", question " + RS.slowest.round + ").");
      lineChart("Courbe de rapidité", { n: RS.S, min: 0, max: 1, step: 0.25, xTitle: "Secondes", yFmt: function (v) { return Math.round(v * 100) + " %"; }, series: plottedSeries(function (r) { return RS.ecdf[r.idx]; }) });
      note("Part des réponses de chaque joueur données en moins de X secondes : plus la courbe monte vite, plus le joueur est rapide.");
      var timedP = RS.players.filter(function (P) { return P.n > 0; }).sort(function (a, b) { return a.median - b.median || a.idx - b.idx; });
      title("Étendue des temps de chaque joueur", 16 * (Math.min(timedP.length, 8) + 1));
      table([
        { h: "Joueur", w: 3, f: function (P) { return log.P[P.idx].n; } }, { h: "Rép.", w: 1, a: "right", f: function (P) { return String(P.n); } },
        { h: "Médiane", w: 1.5, a: "right", f: function (P) { return secF(P.median); } }, { h: "Moyenne", w: 1.5, a: "right", f: function (P) { return secF(P.mean); } },
        { h: "Rapide", w: 1.4, a: "right", f: function (P) { return secF(P.min); } }, { h: "Lent", w: 1.4, a: "right", f: function (P) { return secF(P.max); } },
        { h: "Régularité ±", w: 1.7, a: "right", f: function (P) { return P.sd === null ? "-" : secF(P.sd); } }
      ], timedP.slice(0, 30), { size: 8.5 });
      var ptsP = RS.players.filter(function (P) { return P.n > 0 && P.accuracy !== null; });
      if (ptsP.length) {
        title("Rapidité contre précision", 16 * (Math.min(ptsP.length, 8) + 1));
        table([
          { h: "Joueur", w: 3, f: function (P) { return log.P[P.idx].n; } }, { h: "Temps moyen", w: 1.8, a: "right", f: function (P) { return secF(P.mean); } },
          { h: "Réussite", w: 1.4, a: "right", f: function (P) { return Math.round(P.accuracy * 100) + " %"; } },
          { h: "Bonnes (moy.)", w: 1.8, a: "right", f: function (P) { return secF(P.meanGood); } }, { h: "Mauvaises (moy.)", w: 2, a: "right", f: function (P) { return secF(P.meanBad); } },
          { h: "Tendance", w: 2.2, a: "right", f: function (P) { return P.trend === null ? "-" : Math.abs(P.trend) < 0.3 ? "stable" : P.trend < 0 ? "accélère" : "ralentit"; } }
        ], ptsP.slice(0, 30), { size: 8.5 });
      }
      if (log.P.length > 1) valueBars("Premier à répondre juste", RS.players.filter(function (P) { return P.n > 0; }).sort(function (a, b) { return b.wins - a.wins || a.idx - b.idx; }).slice(0, 20).map(function (P) {
        return { label: log.P[P.idx].n, value: P.wins, color: colorOf[P.idx], text: P.wins + " / " + nrr };
      }), null, Math.max(nrr, 1));
      var grpP = RS.byDifficulty.map(function (g) { return { label: "Difficulté : " + g.key, value: g.mean, text: secF(g.mean) + " · " + g.n + " rép." }; }).concat(RS.byTheme.map(function (g) { return { label: g.key, value: g.mean, text: secF(g.mean) + " · " + g.n + " rép." }; }));
      if (grpP.length) valueBars("Réaction par difficulté et par thème", grpP, C.accent, topT);
    }
    stackBars("Bonnes et mauvaises réponses par joueur", ranked.slice(0, 24).map(function (r) {
      return { label: r.name, vals: [r.correct, r.wrong, r.none], text: r.correct + " justes · " + r.wrong + " fausses · " + r.none + " sans rép." };
    }), [{ name: "Bonnes réponses", color: C.good }, { name: "Mauvaises réponses", color: C.bad }, { name: "Sans réponse", color: C.none }]);

    /* ----- Barres horizontales : réussite par thème / difficulté / média ----- */
    function bars(titleText, items, labelOf) {
      if (!items.length) return;
      title(titleText, Math.min(items.length, 8) * 17);
      var lw = 150, bx = M + lw, bw = CW - lw - 90;
      items.forEach(function (it) {
        room(18);
        W.text(M, y, labelOf(it), { size: 9, color: C.ink, maxW: lw - 8 });
        W.rect(bx, y - 9, bw, 10, { fill: C.band });
        if (it.rate !== null) W.rect(bx, y - 9, Math.max(1.5, bw * it.rate), 10, { fill: it.rate >= 0.5 ? C.good : C.bad });
        W.text(bx + bw + 8, y, pct(it.rate) + "  (" + it.correct + "/" + it.answers + ")", { size: 8.5, color: C.sub });
        y += 17;
      });
      axisRow(bx, bw, 1, function (v) { return Math.round(v * 100) + " %"; });
      y += 4;
    }
    /* ----- Faits marquants, séries, rapidité, répartition des temps ----- */
    function valueBars(titleText, items, fillColor, scaleMax) {
      if (!items.length) return;
      title(titleText, Math.min(items.length, 8) * 17);
      var lw = 150, bx = M + lw, bw = CW - lw - 110, top = scaleMax > 0 ? scaleMax : Math.max.apply(null, items.map(function (it) { return it.value; }).concat([1e-9]));
      items.forEach(function (it) {
        room(18);
        W.text(M, y, it.label, { size: 9, color: C.ink, maxW: lw - 8 });
        W.rect(bx, y - 9, bw, 10, { fill: C.band });
        if (it.value > 0) W.rect(bx, y - 9, Math.max(1.5, Math.min(bw, bw * it.value / top)), 10, { fill: it.color || fillColor || C.accent });
        W.text(bx + bw + 8, y, it.text, { size: 8.5, color: C.sub });
        y += 17;
      });
      axisRow(bx, bw, top, tickNum(top));
      y += 4;
    }
    var hl = A.highlights(log), HL = { streak: "Plus longue série de bonnes réponses", fastest: "Réponse correcte la plus rapide", gain: "Plus gros gain en une question", accuracy: "Meilleure réussite" };
    if (hl.length) {
      title("Faits marquants", 16 * (hl.length + 1));
      table([
        { h: "Distinction", w: 4, f: function (h) { return HL[h.key]; } },
        { h: "Joueur", w: 3, f: function (h) { return h.name; } },
        { h: "Résultat", w: 3, a: "right", f: function (h) { return h.key === "streak" ? h.row.bestStreak + " d'affilée" : h.key === "fastest" ? secs(h.row.fastest) : h.key === "gain" ? "+" + Math.round(h.row.bestGain) + " pts" : pct(h.row.accuracy) + " (" + h.row.correct + "/" + h.row.answered + ")"; } }
      ], hl);
      y += 8;
    }
    var prows = A.perPlayer(log);
    valueBars("Meilleure série de bonnes réponses", prows.slice().sort(function (a, b) { return b.bestStreak - a.bestStreak || a.idx - b.idx; }).slice(0, 20).map(function (r) { return { label: r.name, value: r.bestStreak, text: r.bestStreak + " d'affilée" }; }));
    valueBars("Temps de réponse moyen", prows.filter(function (r) { return r.avgTime !== null; }).sort(function (a, b) { return a.avgTime - b.avgTime; }).slice(0, 20).map(function (r) { return { label: r.name, value: r.avgTime, text: secs(r.avgTime) }; }));
    valueBars("Réponse correcte la plus rapide (meilleur temps)", prows.filter(function (r) { return r.fastest !== null; }).sort(function (a, b) { return a.fastest - b.fastest || a.idx - b.idx; }).slice(0, 20).map(function (r) { return { label: r.name, value: r.fastest, text: secs(r.fastest) }; }));
    valueBars("Plus gros gain en une question", prows.slice().sort(function (a, b) { return b.bestGain - a.bestGain || a.idx - b.idx; }).slice(0, 20).map(function (r) { return { label: r.name, value: Math.max(0, r.bestGain), text: "+" + Math.round(r.bestGain) + " pts" }; }));
    var th = A.timeHistogram(log);
    if (th.n) valueBars("Répartition des temps de réponse", th.buckets.map(function (b) { return { label: b.label, value: b.correct + b.wrong, text: (b.correct + b.wrong) + "  (" + b.correct + " justes, " + b.wrong + " fausses)" }; }));
    if (log.R.length >= 2) {
      var rs = A.roundStats(log);
      lineChart("Réussite question par question", { n: log.R.length, min: 0, max: 100, step: 25, yFmt: function (v) { return Math.round(v) + " %"; },
        series: [{ name: "Part des joueurs qui ont trouvé la bonne réponse", color: SERIES[0], values: [null].concat(rs.map(function (r) { return r.rate === null || r.rate === undefined ? null : Math.round(r.rate * 1000) / 10; })) }] });
    }
    bars("Réussite par thème", A.byCategory(log).slice(0, 24), function (g) { return g.label; });
    bars("Réussite par difficulté", A.byDifficulty(log), function (g) { return (DIFF[g.key] || g.key) + " (" + g.questions + " q.)"; });
    var med = A.byMedia(log); if (med.length > 1) bars("Questions avec image ou vidéo", med, function (g) { return g.label + " (" + g.questions + " q.)"; });
    note("Barre verte : au moins la moitié de bonnes réponses ; rouge : moins de la moitié. Le pourcentage et le détail (bonnes / réponses) sont écrits à droite.");
    /* ----- Questions : fatigue, issues par difficulté, temps par thème, questions les plus longues ----- */
    var QI = A.questionInsights(log);
    bars("Réussite au fil de la partie", QI.thirds, function (g) { return g.label + " (" + g.questions + " q.)"; });
    stackBars("Bonnes, mauvaises et sans réponse par difficulté", QI.mix.map(function (g) {
      return { label: DIFF[g.key] || g.key, vals: [g.correct, g.wrong, g.none], text: g.correct + " justes · " + g.wrong + " fausses · " + g.none + " sans rép." };
    }), [{ name: "Bonnes réponses", color: C.good }, { name: "Mauvaises réponses", color: C.bad }, { name: "Sans réponse", color: C.none }]);
    valueBars("Temps de réponse moyen par thème", QI.themeTime.map(function (g) { return { label: g.label, value: g.avgTime, text: secs(g.avgTime) + "  (" + g.answers + " rép.)" }; }));
    valueBars("Les questions qui ont fait le plus réfléchir", QI.slowest.map(function (r) { return { label: "Question " + r.round, value: r.avgTime, text: secs(r.avgTime) + "  (" + pct(r.rate) + " de réussite)" }; }));

    /* ----- Catégories (onglet « Catégories ») ----- */
    var CR = A.categoryReport(log, 12);
    if (CR.cats.length) {
      var STP = [{ name: "Bonnes réponses", color: C.good }, { name: "Mauvaises réponses", color: C.bad }, { name: "Sans réponse", color: C.none }];
      if (CR.hidden) note("Les " + CR.shown + " catégories les plus jouées sont affichées sur " + CR.total + ".");
      stackBars("Résultats par catégorie", CR.cats.map(function (g) {
        return { label: g.label, vals: [g.correct, g.wrong, g.none], text: g.correct + " justes · " + g.wrong + " fausses · " + g.none + " sans rép." };
      }), STP);
      var cpts = CR.cats.filter(function (g) { return g.rate !== null && g.avgTime !== null; });
      if (cpts.length >= 2) {
        title("Vitesse contre réussite par catégorie", 16 * (Math.min(cpts.length, 8) + 1));
        table([
          { h: "Catégorie", w: 4, f: function (g) { return g.label; } }, { h: "Questions", w: 1.4, a: "right", f: function (g) { return String(g.questions); } },
          { h: "Temps moyen", w: 1.8, a: "right", f: function (g) { return secs(g.avgTime); } },
          { h: "Réussite", w: 1.4, a: "right", f: function (g) { return pct(g.rate); }, color: function (g) { return g.rate >= 0.5 ? C.good : C.bad; } }
        ], cpts.slice().sort(function (a, b) { return a.avgTime - b.avgTime; }), { size: 8.5 });
        note("Plus le temps moyen est court et la réussite haute, plus la catégorie est facile pour le groupe.");
      }
      var DCP = [["facile", "Facile"], ["moyen", "Moyen"], ["difficile", "Difficile"], ["impossible", "Impossible"]];
      stackBars("Difficulté de chaque catégorie", CR.cats.map(function (g) {
        return { label: g.label, vals: DCP.map(function (d) { return g.diffs[d[0]] || 0; }), text: DCP.map(function (d) { return (g.diffs[d[0]] || 0) ? (g.diffs[d[0]] + " " + d[1].toLowerCase()) : ""; }).filter(Boolean).join(" · ") };
      }), DCP.map(function (d, i) { return { name: d[1], color: SERIES[i % SERIES.length] }; }));
      var forceCats = CR.cats.slice(0, 8), forceRows = ranked.slice(0, 30);
      if (forceCats.length) {
        title("Carte des forces : réussite de chaque joueur par catégorie", 16 * (Math.min(forceRows.length, 8) + 1));
        table([{ h: "Joueur", w: 3.2, f: function (r) { return r.name; }, bold: function () { return true; } }].concat(forceCats.map(function (g) {
          return { h: g.label, w: 1.7, a: "right", f: function (r) { var c = g.cells[r.idx]; return !c || c.rate === null ? "·" : Math.round(c.rate * 100) + " %"; },
            color: function (r) { var c = g.cells[r.idx]; return !c || c.rate === null ? C.mute : c.rate >= 0.5 ? C.good : C.bad; } };
        })), forceRows, { size: 8 });
        note("Vert : au moins la moitié de bonnes réponses ; rouge : moins de la moitié ; « · » : aucune réponse dans la catégorie." + (CR.cats.length > forceCats.length ? " Les " + forceCats.length + " catégories les plus jouées sont affichées." : ""));
      }
      if (CR.champions.length) {
        title("Le champion de chaque catégorie", 16 * (Math.min(CR.champions.length, 8) + 1));
        table([
          { h: "Catégorie", w: 4, f: function (c) { return c.label; } },
          { h: "Champion", w: 5, f: function (c) { return c.holders.slice(0, 3).map(function (h) { return h.name; }).join(", ") + (c.holders.length > 3 ? " et " + (c.holders.length - 3) + " autre" + (c.holders.length > 4 ? "s" : "") : ""); }, bold: function () { return true; } },
          { h: "Réussite", w: 1.5, a: "right", f: function (c) { return pct(c.rate); } }
        ], CR.champions, { size: 8.5 });
        note("Meilleure réussite dans la catégorie (2 réponses minimum) ; les égalités sont partagées.");
      }
    }
    /* ----- Profils des joueurs (onglet « Profils ») ----- */
    var PF = A.playerProfiles(log), pfList = PF.players.filter(function (p) { return p.answered > 0; });
    if (pfList.length) {
      var styOf = function (p) { return p.style ? PF.styles[p.style].replace(/^[^\wÀ-ÿ]+/u, "").trim() : "-"; };
      var pfPts = pfList.filter(function (p) { return p.accuracy !== null && p.avgTime !== null; });
      if (pfPts.length >= 2) {
        title("Vitesse contre précision de chaque joueur", 16 * (Math.min(pfPts.length, 8) + 1));
        table([
          { h: "Joueur", w: 3.4, f: function (p) { return p.name; }, bold: function () { return true; } }, { h: "Style", w: 3, f: function (p) { return styOf(p); } },
          { h: "Temps moyen", w: 1.8, a: "right", f: function (p) { return secs(p.avgTime); } },
          { h: "Réussite", w: 1.4, a: "right", f: function (p) { return pct(p.accuracy); }, color: function (p) { return p.accuracy >= 0.5 ? C.good : C.bad; } }
        ], pfPts.slice().sort(function (a, b) { return a.avgTime - b.avgTime || a.idx - b.idx; }).slice(0, 30), { size: 8.5 });
        note("Style par rapport à la médiane du groupe : rapide ou réfléchi, précis ou approximatif (médiane de réussite " + pct(PF.medians.accuracy) + ", de temps " + secs(PF.medians.time) + ").");
      }
      var pfFast = pfList.filter(function (p) { return p.speedIndex !== null; }).sort(function (a, b) { return a.speedIndex - b.speedIndex || a.idx - b.idx; }).slice(0, 20);
      if (pfFast.length >= 2) {
        valueBars("Plus rapide que le groupe ? (100 = médiane)", pfFast.map(function (p) { return { label: p.name, value: p.speedIndex, color: colorOf[p.idx] || C.accent, text: Math.round(p.speedIndex) + (p.speedIndex < 100 ? " · plus rapide" : p.speedIndex > 100 ? " · plus lent" : " · médiane") }; }), C.accent);
        note("Temps du joueur comparé au temps médian du groupe sur les mêmes questions : moins de 100, plus rapide que la médiane.");
      }
      var pfReg = pfList.filter(function (p) { return p.sd !== null; }).sort(function (a, b) { return a.sd - b.sd || a.idx - b.idx; }).slice(0, 20);
      if (pfReg.length >= 2) valueBars("Régularité des temps de réponse (écart type)", pfReg.map(function (p) { return { label: p.name, value: p.sd, color: colorOf[p.idx] || C.accent, text: "± " + secs(p.sd) }; }), C.accent);
      title("Le profil de chaque joueur", 16 * (Math.min(pfList.length, 8) + 1));
      table([
        { h: "Joueur", w: 2.6, f: function (p) { return p.name; }, bold: function () { return true; } }, { h: "Style", w: 2.4, f: function (p) { return styOf(p); } },
        { h: "Réussite", w: 1.3, a: "right", f: function (p) { return pct(p.accuracy); } },
        { h: "1re → 2e moitié", w: 2.6, a: "right", f: function (p) { return p.delta === null ? "-" : pct(p.early) + " > " + pct(p.late); } },
        { h: "Point fort", w: 2.8, f: function (p) { return p.best ? p.best.label + " (" + pct(p.best.rate) + ")" : "-"; } },
        { h: "Point faible", w: 2.8, f: function (p) { return p.worst ? p.worst.label + " (" + pct(p.worst.rate) + ")" : "-"; } }
      ], pfList.slice(0, 30), { size: 8 });
    }

    /* ----- Bonus et malus ----- */
    if (log.B && log.B.length) {
      var pws = A.powers(log), BON = SERIES[2], MAL = SERIES[1], BLK = SERIES[0], nrm = pws.total - pws.wheel.spins;
      var pr = pws.players.filter(function (r) { return r.bonusGiven + r.malusGiven + r.malusReceived + r.wheelBonus + r.wheelMalus > 0; }).sort(function (a, b) { return b.net - a.net || a.idx - b.idx; });
      title("Bonus et malus", 16 * Math.min(pr.length + 2, 8));
      note((nrm ? nrm + " pouvoir" + (nrm > 1 ? "s" : "") + " utilisé" + (nrm > 1 ? "s" : "") + " : " + pws.bonus + " bonus, " + pws.malus + " malus (" + pws.blocked + " bloqué" + (pws.blocked > 1 ? "s" : "") + (pws.reflected ? " dont " + pws.reflected + " renvoyé" + (pws.reflected > 1 ? "s" : "") : "") + "). " : "")
        + (pws.wheel.spins ? "La roue a tourné " + pws.wheel.spins + " fois : " + pws.wheel.bonus + " bonus, " + pws.wheel.malus + " malus" + (pws.wheel.blocked ? " (" + pws.wheel.blocked + " annulé" + (pws.wheel.blocked > 1 ? "s" : "") + " par un bouclier)" : "") + ". " : "") + pws.points + " points déplacés.");
      table([
        { h: "Joueur", w: 22, f: function (r) { return r.name; }, bold: function () { return true; } },
        { h: "Bonus", w: 8, a: "right", f: function (r) { return String(r.bonusGiven); } },
        { h: "Malus", w: 8, a: "right", f: function (r) { return String(r.malusGiven); } },
        { h: "Visé", w: 8, a: "right", f: function (r) { return String(r.malusReceived); } },
        { h: "Bloqués", w: 9, a: "right", f: function (r) { return String(r.shieldSaves); } },
        { h: "Roue", w: 8, a: "right", f: function (r) { return String(r.wheelBonus + r.wheelMalus); } },
        { h: "Gagnés", w: 10, a: "right", f: function (r) { return String(r.gained); } },
        { h: "Perdus", w: 10, a: "right", f: function (r) { return String(r.lost); } },
        { h: "Bilan", w: 10, a: "right", f: function (r) { return (r.net > 0 ? "+" : "") + r.net; }, color: function (r) { return r.net < 0 ? C.bad : C.ink; }, bold: function () { return true; } }
      ], pr);
      note("Visé : malus lancés contre le joueur. Bloqués : malus arrêtés par un bouclier ou renvoyés. Roue : tirages de la roue du joueur. Gagnés : points bonus, jackpots et points volés. Perdus : points retirés par un malus. Les pouvoirs spéciaux sans montant ne comptent pas dans les points.");
      var sgn = function (v) { return (v > 0 ? "+" : v < 0 ? "-" : "") + Math.abs(Math.round(v)); };
      stackBars("Pouvoirs lancés par joueur", pws.players.filter(function (r) { return r.bonusGiven + r.malusGiven > 0; }).sort(function (a, b) { return (b.bonusGiven + b.malusGiven) - (a.bonusGiven + a.malusGiven) || a.idx - b.idx; }).slice(0, 20).map(function (r) {
        return { label: r.name, vals: [r.bonusGiven, r.malusGiven], text: r.bonusGiven + " bonus · " + r.malusGiven + " malus" };
      }), [{ name: "Bonus (pour soi)", color: BON }, { name: "Malus (contre un adversaire)", color: MAL }]);
      stackBars("Roue des bonus / malus", pws.players.filter(function (r) { return r.wheelBonus + r.wheelMalus > 0; }).sort(function (a, b) { return (b.wheelGain - b.wheelLoss) - (a.wheelGain - a.wheelLoss) || a.idx - b.idx; }).slice(0, 20).map(function (r) {
        return { label: r.name, vals: [r.wheelBonus, r.wheelMalus - r.wheelBlocked, r.wheelBlocked], text: r.wheelBonus + " bonus · " + (r.wheelMalus - r.wheelBlocked) + " malus" + (r.wheelBlocked ? " · " + r.wheelBlocked + " annulé" + (r.wheelBlocked > 1 ? "s" : "") : "") + " (" + sgn(r.wheelGain - r.wheelLoss) + " pts)" };
      }), [{ name: "Bonus", color: BON }, { name: "Malus touchés", color: MAL }, { name: "Malus annulés par un bouclier", color: BLK }], { textW: 190 });
      stackBars("Malus reçus et boucliers", pws.players.filter(function (r) { return r.malusReceived > 0; }).sort(function (a, b) { return b.malusReceived - a.malusReceived || a.idx - b.idx; }).slice(0, 20).map(function (r) {
        return { label: r.name, vals: [r.malusReceived - r.shieldSaves, r.shieldSaves], text: r.malusReceived + " visant · " + r.shieldSaves + " bloqué" + (r.shieldSaves > 1 ? "s" : "") + " · " + sgn(-r.lost) + " pts" };
      }), [{ name: "Touchés", color: MAL }, { name: "Bloqués ou renvoyés", color: BLK }], { textW: 190 });
      stackBars("Points gagnés et perdus grâce aux pouvoirs", pws.players.filter(function (r) { return r.gained > 0 || r.lost > 0; }).sort(function (a, b) { return b.net - a.net || a.idx - b.idx; }).slice(0, 20).map(function (r) {
        return { label: r.name, vals: [r.gained, r.lost], text: "+" + r.gained + " / -" + r.lost + " (bilan " + sgn(r.net) + ")" };
      }), [{ name: "Gagnés", color: BON }, { name: "Perdus", color: MAL }], { textW: 190 });
      var netS = pws.netSeries.filter(function (sr) { var pp = pws.players[sr.idx]; return colorOf[sr.idx] && (pp.gained || pp.lost); });
      if (netS.length && log.R.length >= 1) {
        var lo = 0, hi = 0; netS.forEach(function (sr) { sr.values.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
        var nst = niceStep((hi - lo) / 4);
        lineChart("Bilan net des pouvoirs au fil des questions", { n: log.R.length, min: Math.floor(lo / nst) * nst, max: Math.max(Math.ceil(hi / nst) * nst, Math.floor(lo / nst) * nst + nst), step: nst,
          series: netS.map(function (sr) { return { name: log.P[sr.idx].n, color: colorOf[sr.idx], values: sr.values }; }) });
        note("Points gagnés moins points perdus grâce aux pouvoirs (roue comprise), cumulés après chaque question.");
      }
      valueBars("Types de pouvoirs utilisés", pws.kinds.slice(0, 14).map(function (k) { return { label: (k.choice === 1 ? "Bonus · " : "Malus · ") + k.label, value: k.count, color: k.choice === 1 ? BON : MAL, text: k.count + (k.choice === 2 && k.blocked ? "  (" + k.blocked + " bloqué" + (k.blocked > 1 ? "s" : "") + ")" : "") }; }));
      var tgt = pws.players.filter(function (r) { return r.malusGiven > 0 || r.malusReceived > 0; }).sort(function (a, b) { return (b.malusGiven + b.malusReceived) - (a.malusGiven + a.malusReceived) || a.idx - b.idx; }).slice(0, 12);
      if (pws.malus && tgt.length > 1) {
        var mxv = 1; pws.matrix.forEach(function (row) { row.forEach(function (v) { mxv = Math.max(mxv, v); }); });
        heat("Qui vise qui ?", tgt, function (r, c) { return r.idx === c.idx ? null : pws.matrix[r.idx][c.idx]; }, mxv, MAL);
        note("Nombre de malus lancés par le joueur de la ligne contre le joueur de la colonne. Plus la case est foncée, plus il y en a." + (pws.players.filter(function (r) { return r.malusGiven > 0 || r.malusReceived > 0; }).length > 12 ? " Les 12 joueurs les plus impliqués sont affichés." : ""));
      }
      if (log.R.length >= 1) {
        var cb = [0], cm = [0];
        for (var qb = 0; qb < log.R.length; qb++) { var prr = pws.perRound[qb] || { bonus: 0, malus: 0 }; cb.push(cb[qb] + prr.bonus); cm.push(cm[qb] + prr.malus); }
        var cmax = Math.max(cb[cb.length - 1], cm[cm.length - 1], 1), cst = Math.max(1, niceStep(cmax / 4));
        lineChart("Bonus et malus cumulés", { n: log.R.length, min: 0, max: Math.ceil(cmax / cst) * cst, step: cst, series: [{ name: "Bonus", color: BON, values: cb }, { name: "Malus", color: MAL, values: cm }] });
      }
    }

    /* ----- Questions les plus difficiles / faciles ----- */
    function qTable(label, list) {
      if (!list.length) return;
      title(label, 16 * (list.length + 1));
      table([
        { h: "N°", w: 5, a: "center", f: function (r) { return String(r.round); } },
        { h: "Question", w: 52, f: function (r) { return r.q; } },
        { h: "Thème", w: 22, f: function (r) { return r.c; } },
        { h: "Réussite", w: 10, a: "right", f: function (r) { return pct(r.rate); } },
        { h: "Temps", w: 9, a: "right", f: function (r) { return secs(r.avgTime); } }
      ], list, { size: 8.5 });
    }
    qTable("Les 5 questions les plus difficiles", A.hardest(log, 5));
    qTable("Les 5 questions les plus faciles", A.easiest(log, 5));
    qTable("Les questions qui divisent le groupe", QI.divisive);
    qTable("Plus faciles que prévu", QI.easier);
    qTable("Plus difficiles que prévu", QI.harder);

    /* ----- Matrice joueurs × questions ----- */
    var np = log.P.length, nr = log.R.length;
    if (nr >= 1 && np >= 1) {
      var perPage = Math.min(nr, 60), labelW = 110, cell = Math.min(11, Math.floor((CW - labelW) / perPage * 10) / 10), rh2 = 12;
      for (var from = 0; from < nr; from += perPage) {
        var to = Math.min(nr, from + perPage), need = 30 + np * rh2 + 30;
        if (from === 0) { room(Math.min(need, 300)); title("Réponses de chaque joueur, question par question"); } else { newPage(); title("Réponses de chaque joueur (questions " + (from + 1) + " à " + to + ")"); }
        if (np * rh2 + 60 > PH - 120) { note("Trop de joueurs pour afficher la grille : consulte le fichier CSV."); break; }
        room(np * rh2 + 40);
        var gx0 = M + labelW;
        for (var qq = from; qq < to; qq++) if ((qq + 1) % 5 === 0 || qq === from) W.text(gx0 + (qq - from) * cell + cell / 2, y - 3, String(qq + 1), { size: 6.5, color: C.mute, align: "center" });
        y += 4;
        rows.forEach(function (r) {
          if (y + rh2 > PH - 46) newPage();
          W.text(M, y + 7.5, r.name, { size: 8.5, color: C.ink, maxW: labelW - 8 });
          for (var qi = from; qi < to; qi++) {
            var e = log.R[qi].r[r.idx], cx = gx0 + (qi - from) * cell, st = e ? e[0] : 0, s = cell - 1.2;
            if (st === 1) W.rect(cx, y, s, rh2 - 2, { fill: C.good });
            else if (st === 2) { W.rect(cx, y, s, rh2 - 2, { fill: C.bad }); W.line(cx + 1, y + 1.5, cx + s - 1, y + rh2 - 3.5, { color: C.cross, w: 0.8 }); W.line(cx + s - 1, y + 1.5, cx + 1, y + rh2 - 3.5, { color: C.cross, w: 0.8 }); }
            else if (st === 3) W.rect(cx, y, s, rh2 - 2, { stroke: C.none, w: 0.9 });
            else W.rect(cx, y + (rh2 - 2) / 2 - 0.4, s, 0.8, { fill: C.grid });
          }
          y += rh2;
        });
        y += 18;
        room(14);
        var legend = [["good", "Bonne réponse"], ["bad", "Mauvaise réponse"], ["none", "Pas de réponse"], ["abs", "Pas dans la partie"]], lx2 = M;
        legend.forEach(function (l) {
          if (l[0] === "good") W.rect(lx2, y - 8, 9, 9, { fill: C.good });
          else if (l[0] === "bad") { W.rect(lx2, y - 8, 9, 9, { fill: C.bad }); W.line(lx2 + 1.5, y - 6.5, lx2 + 7.5, y - 0.5, { color: C.cross, w: 0.8 }); W.line(lx2 + 7.5, y - 6.5, lx2 + 1.5, y - 0.5, { color: C.cross, w: 0.8 }); }
          else if (l[0] === "none") W.rect(lx2, y - 8, 9, 9, { stroke: C.none, w: 0.9 });
          else W.rect(lx2, y - 4, 9, 0.8, { fill: C.line });
          W.text(lx2 + 13, y, l[1], { size: 8, color: C.sub }); lx2 += 13 + widthOf(l[1], 8, false) + 16;
        });
        y += 20;
      }
    }

    /* ----- Détail question par question ----- */
    title("Détail des questions", 16 * 6);
    table([
      { h: "N°", w: 5, a: "center", f: function (r) { return String(r.round); } },
      { h: "Question", w: 46, f: function (r) { return r.q + (r.m ? "  [image/vidéo]" : ""); } },
      { h: "Thème", w: 19, f: function (r) { return r.c; } },
      { h: "Niveau", w: 9, f: function (r) { return DIFF[r.d] || r.d; } },
      { h: "Réussite", w: 10, a: "right", f: function (r) { return pct(r.rate); } },
      { h: "Temps", w: 8, a: "right", f: function (r) { return secs(r.avgTime); } }
    ], A.roundStats(log), { size: 8, rh: 14 });

    /* ----- Infractions ----- */
    if (log.C.length) {
      title("Infractions détectées (triche)", 16 * Math.min(log.C.length + 1, 8));
      table([
        { h: "Joueur", w: 30, f: function (c) { return log.P[c[0]].n; } },
        { h: "Infraction n°", w: 14, a: "right", f: function (c) { return String(c[1]); } },
        { h: "Sanction", w: 26, f: function (c) { return LEVEL[c[2]] || String(c[2]); }, color: function (c) { return c[2] >= 2 ? C.bad : C.ink; }, bold: function (c) { return c[2] >= 2; } },
        { h: "À la question n°", w: 18, a: "right", f: function (c) { return String(c[3]); } }
      ], log.C);
      note("Avertissement jusqu'à 2 infractions, malus de score à partir de la 3e, exclusion de la partie à partir de la 5e.");
    }

    /* ----- Pieds de page ----- */
    var N = W.pages.length;
    for (var p = 0; p < N; p++) {
      W.cur = W.pages[p];
      W.line(M, PH - 32, M + CW, PH - 32, { color: C.grid, w: 0.5 });
      W.text(M, PH - 20, "Qui suis-je ? — statistiques", { size: 8, color: C.mute });
      W.text(M + CW, PH - 20, "Page " + (p + 1) + " / " + N, { size: 8, color: C.mute, align: "right" });
    }
    return W.finish();
  }
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function download(log, opts) {
    var dark = !!(opts && opts.theme === "dark"), bytes = build(log, { theme: dark ? "dark" : "light" }), blob = new Blob([bytes], { type: "application/pdf" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qui-suis-je-statistiques-" + new Date(log.at || Date.now()).toISOString().slice(0, 10) + (dark ? "-sombre" : "") + ".pdf";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  return { build: build, download: download, _clean: clean, _width: widthOf, _toCp: toCp, _fit: fit };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V40Pdf;
if (typeof window !== "undefined") window.V40Pdf = V40Pdf;
