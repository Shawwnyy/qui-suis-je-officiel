/* =============================================================================
   V50 — Transcription : statistiques (mots les plus dits, qui parle le plus, activité) et export PDF.

   • Aucune bibliothèque, aucun serveur : le PDF est écrit directement par ce fichier (police standard Helvetica,
     accents français, graphiques dessinés en vectoriel), puis téléchargé par le navigateur.
   • Les fonctions ne touchent ni au DOM ni au réseau : testables avec Node (tests/transcript.test.js).
   ============================================================================= */
var V50Transcript = (function () {
  "use strict";

  /* ---------------------------------------------------------------- mots ---- */
  var STOP = {};
  [
    /* français */
    "les une des mes tes ses nos vos leurs aux ils elles alors aucun aussi autre avant avec avoir bon car cela ces ceux chaque comme comment dans des dedans dehors depuis donc elle elles encore est faire fait faites fois font hors ici ils juste leur leurs lui maintenant mais mes moins mon moi même nous notre notres pas parce par peu peut pour pourquoi quand que quel quelle quelles quels qui sans ses seulement sien son sont sous sur tandis tellement tes ton tous tout toute toutes trop très vos votre vous voient vont étaient était étais étions été être ça ceci celui celle celles cette cet aux avait avais avons avez ont suis sommes êtes sera serait ai eh euh ben bah hein ouais ok voilà déjà puis puisque lors quoi dont plus rien toi eux soi entre chez vers cependant ainsi après avant pendant selon contre sans tant peutêtre aujourdhui bien très vraiment genre trucs truc chose choses faut fallait vais vas allons allez vont veux veut voulez peux peuvent dit dis disait mettre mis voir vois vu ",
    /* anglais */
    "the and for are but not you all any can had her was one our out get has him his how new now see two way who did its let put say she too use that with have this will your from they know want been good much some time very when come here just like make many more only over such take than them well were what would there their about which could other these think first being where those still while should because through before after again really going into also then even yes ",
    /* espagnol */
    "los las una unos unas del por con sin sobre entre muy más menos ya sí son era fue ser estar está están hay mis tus sus nos este esta esto estos estas ese esa eso aquí allí cuando donde quien porque pues también como pero para ",
    /* allemand */
    "der die das den dem des ein eine einen einem einer und oder aber nicht ist sind war waren ich du er sie es wir ihr mit von zu auf für auch noch nur schon sehr wie was wenn dann doch dass bei aus nach über unter mein dein sein mich dich sich ",
    /* italien */
    "gli una uno del della dei che non per con come ma più anche sono io tu lui lei noi voi loro questo questa quello quella molto poi se ",
    /* portugais */
    "uma dos das que não para com por mais como mas foi são eu tu ele ela nós vocês eles muito já também isso este esta aquele "
  ].join(" ").split(/\s+/).forEach(function (w) { if (w) STOP[w] = 1; });

  /* Tous les mots d'une phrase (minuscules, lettres seulement). */
  function tokenize(text) {
    var t = String(text == null ? "" : text).toLowerCase().replace(/aujourd['’]hui/g, "aujourdhui").replace(/peut-être/g, "peutêtre");
    return t.match(/\p{L}+/gu) || [];
  }
  /* Mots « intéressants » : au moins 3 lettres et pas un mot-outil (le, la, que, the, und…). */
  function significant(tokens) { return tokens.filter(function (w) { return w.length >= 3 && !STOP[w]; }); }

  function sortCounts(map) {
    return Object.keys(map).map(function (w) { return [w, map[w]]; })
      .sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); });
  }

  /* lines : [{ id, name, text, at (ms depuis le début de l'appel) }] → statistiques */
  function analyze(lines, opts) {
    opts = opts || {};
    var topN = opts.topWords || 15, topPer = opts.topPerPerson || 5;
    var all = {}, per = {}, order = [], totalWords = 0, maxAt = 0;
    (Array.isArray(lines) ? lines : []).forEach(function (l) {
      if (!l || typeof l.text !== "string" || !l.text.trim()) return;
      var key = String(l.id == null ? l.name : l.id), tk = tokenize(l.text), sig = significant(tk);
      var p = per[key];
      if (!p) { p = per[key] = { key: key, name: l.name || "Joueur", phrases: 0, words: 0, counts: {} }; order.push(key); }
      if (l.name) p.name = l.name;
      p.phrases++; p.words += tk.length; totalWords += tk.length;
      sig.forEach(function (w) { all[w] = (all[w] || 0) + 1; p.counts[w] = (p.counts[w] || 0) + 1; });
      if (isFinite(l.at) && l.at > maxAt) maxAt = l.at;
    });
    var speakers = order.map(function (k) {
      var p = per[k];
      return { key: p.key, name: p.name, phrases: p.phrases, words: p.words, top: sortCounts(p.counts).slice(0, topPer) };
    }).sort(function (a, b) { return b.words - a.words || (a.name < b.name ? -1 : 1); });
    /* activité : nombre de mots par tranche de temps (24 tranches au plus) */
    var steps = [30000, 60000, 120000, 300000, 600000, 1800000, 3600000], bucketMs = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) if (maxAt / steps[i] < 24) { bucketMs = steps[i]; break; }
    var n = Math.floor(maxAt / bucketMs) + 1, counts = [];
    for (var b = 0; b < n; b++) counts.push(0);
    (Array.isArray(lines) ? lines : []).forEach(function (l) {
      if (!l || typeof l.text !== "string" || !l.text.trim()) return;
      var idx = Math.min(n - 1, Math.max(0, Math.floor((isFinite(l.at) ? l.at : 0) / bucketMs)));
      counts[idx] += tokenize(l.text).length;
    });
    return {
      phrases: speakers.reduce(function (s, p) { return s + p.phrases; }, 0), words: totalWords,
      distinct: Object.keys(all).length, top: sortCounts(all).slice(0, topN), speakers: speakers,
      timeline: { bucketMs: bucketMs, counts: counts }
    };
  }

  function fmtDuration(ms) {
    var n = Number(ms); if (!isFinite(n) || n < 0) n = 0;
    var t = Math.floor(n / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    var two = function (x) { return (x < 10 ? "0" : "") + x; };
    return h > 0 ? h + ":" + two(m) + ":" + two(s) : m + ":" + two(s);
  }
  function clockText(ts) {
    var d = new Date(ts), two = function (x) { return (x < 10 ? "0" : "") + x; };
    return isNaN(d.getTime()) ? "--:--:--" : two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
  }

  /* ----------------------------------------------------------------- texte PDF ---- */
  /* Largeurs Helvetica (1/1000 d'em) des caractères ASCII 32..126 */
  var HW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var WIDE = { "œ": 944, "Œ": 1000, "æ": 889, "Æ": 1000, "—": 1000, "–": 556, "…": 1000, "’": 222, "‘": 222, "“": 333, "”": 333, "•": 350, "€": 556, "ß": 611, "«": 556, "»": 556 };
  var WIN = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
    0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };

  /* Caractère → octet WinAnsi (accents français inclus). -1 = à ignorer (emoji), 63 (« ? ») si inconnu. */
  function winCode(ch) {
    var cp = ch.codePointAt(0);
    if (cp === 0xFE0F || cp === 0x200D || cp === 0x200B || (cp >= 0x1F000) || (cp >= 0x2600 && cp <= 0x27BF)) return -1;
    if (cp >= 32 && cp < 127) return cp;
    if (cp >= 0xA0 && cp <= 0xFF) return cp;
    if (WIN[cp]) return WIN[cp];
    if (cp === 9 || cp === 10 || cp === 13 || cp === 0xA0) return 32;
    return 63;
  }
  function charWidth(ch) {
    if (WIDE[ch] != null) return WIDE[ch];
    var cp = ch.codePointAt(0);
    if (cp >= 32 && cp < 127) return HW[cp - 32];
    var base = ch.normalize("NFD").charAt(0), bc = base.charCodeAt(0);
    return (bc >= 32 && bc < 127) ? HW[bc - 32] : 556;
  }
  function widthOf(s, size, bold) {
    var w = 0;
    Array.from(String(s)).forEach(function (ch) { if (winCode(ch) !== -1) w += charWidth(ch); });
    return w / 1000 * size * (bold ? 1.07 : 1);
  }
  /* Chaîne PDF « (…) » : ASCII pur, octets spéciaux en \ooo */
  function pdfString(s) {
    var out = "(";
    Array.from(String(s)).forEach(function (ch) {
      var c = winCode(ch); if (c === -1) return;
      if (c === 40 || c === 41 || c === 92) out += "\\" + String.fromCharCode(c);
      else if (c < 32 || c > 126) out += "\\" + ("000" + c.toString(8)).slice(-3);
      else out += String.fromCharCode(c);
    });
    return out + ")";
  }
  function num(n) { return (Math.round(n * 100) / 100).toString(); }

  /* Découpe en lignes (mots entiers ; un mot plus long qu'une ligne est coupé). firstW : largeur de la 1re ligne, nextW : des suivantes. */
  function wrapText(s, size, bold, firstW, nextW) {
    var words = String(s).split(/\s+/).filter(Boolean), lines = [], cur = "", max = firstW;
    function push() { lines.push(cur); cur = ""; max = nextW; }
    words.forEach(function (w) {
      while (widthOf(w, size, bold) > max) {                         /* mot géant : on le coupe */
        var cut = w.length;
        while (cut > 1 && widthOf(w.slice(0, cut), size, bold) > max) cut--;
        if (cur) push();
        cur = w.slice(0, cut); w = w.slice(cut); push();
      }
      var test = cur ? cur + " " + w : w;
      if (!cur || widthOf(test, size, bold) <= max) cur = test; else { push(); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  function clip(s, size, bold, maxW) {
    s = String(s);
    if (widthOf(s, size, bold) <= maxW) return s;
    while (s.length > 1 && widthOf(s + "…", size, bold) > maxW) s = s.slice(0, -1);
    return s + "…";
  }

  /* ----------------------------------------------------------------- document PDF ---- */
  var INK = [0.13, 0.13, 0.2], GRAY = [0.45, 0.46, 0.55], LIGHT = [0.9, 0.9, 0.94], ACCENT = [0.486, 0.227, 0.929];
  var PALETTE = [[0.486, 0.227, 0.929], [0.086, 0.64, 0.29], [0.92, 0.35, 0.05], [0.055, 0.65, 0.91], [0.86, 0.15, 0.47], [0.79, 0.54, 0.02], [0.05, 0.58, 0.53], [0.39, 0.45, 0.55]];

  function Doc() { this.W = 595.28; this.H = 841.89; this.M = 48; this.pages = []; this.newPage(); }
  Doc.prototype.newPage = function () { this.cur = []; this.pages.push(this.cur); this.y = this.H - this.M; };
  Doc.prototype.need = function (h) { if (this.y - h < this.M + 22) this.newPage(); };
  Doc.prototype.color = function (c, stroke) { return num(c[0]) + " " + num(c[1]) + " " + num(c[2]) + (stroke ? " RG" : " rg"); };
  Doc.prototype.text = function (x, y, s, size, bold, col) {
    this.cur.push("BT /" + (bold ? "F2" : "F1") + " " + num(size) + " Tf " + this.color(col || INK) + " " + num(x) + " " + num(y) + " Td " + pdfString(s) + " Tj ET");
  };
  Doc.prototype.rect = function (x, y, w, h, col) { this.cur.push(this.color(col) + " " + num(x) + " " + num(y) + " " + num(w) + " " + num(h) + " re f"); };
  Doc.prototype.line = function (x1, y1, x2, y2, col, w) { this.cur.push(num(w || 0.6) + " w " + this.color(col || LIGHT, true) + " " + num(x1) + " " + num(y1) + " m " + num(x2) + " " + num(y2) + " l S"); };
  Doc.prototype.heading = function (s) {
    this.need(46); this.y -= 14;
    this.text(this.M, this.y - 12, s, 14, true, INK);
    this.y -= 18; this.line(this.M, this.y, this.W - this.M, this.y, ACCENT, 1.2); this.y -= 10;
  };
  Doc.prototype.sub = function (s) { this.need(26); this.text(this.M, this.y - 10, s, 10.5, true, INK); this.y -= 18; };
  Doc.prototype.para = function (s, size, bold, col) {
    var self = this, lines = wrapText(s, size, bold, this.W - 2 * this.M, this.W - 2 * this.M);
    lines.forEach(function (l) { self.need(size + 5); self.text(self.M, self.y - size, l, size, bold, col); self.y -= size + 4; });
  };
  /* Barres horizontales : rows = [{ label, value, valueLabel?, color? }] */
  Doc.prototype.hbars = function (title, rows, empty) {
    this.sub(title);
    if (!rows.length) { this.para(empty || "Pas assez de données pour ce graphique.", 9, false, GRAY); this.y -= 6; return; }
    var labelW = 118, rowH = 17, max = 0, self = this, vlW = 0;
    rows.forEach(function (r) {
      if (r.value > max) max = r.value;
      var w = widthOf(r.valueLabel != null ? r.valueLabel : String(r.value), 9, true); if (w > vlW) vlW = w;
    });
    var maxBarW = this.W - 2 * this.M - labelW - vlW - 12;       /* le texte de la plus longue barre reste dans la marge */
    max = max || 1;
    this.need(rows.length * rowH + 6);
    rows.forEach(function (r) {
      var yb = self.y - rowH, bw = Math.max(1.5, r.value / max * maxBarW);
      self.text(self.M, yb + 4.5, clip(r.label, 9.5, false, labelW - 8), 9.5, false, INK);
      self.rect(self.M + labelW, yb + 2.5, bw, 10.5, r.color || ACCENT);
      self.text(self.M + labelW + bw + 5, yb + 4.5, r.valueLabel != null ? r.valueLabel : String(r.value), 9, true, INK);
      self.y -= rowH;
    });
    this.y -= 10;
  };
  /* Colonnes verticales : counts = [n, …], labels = [texte, …] */
  Doc.prototype.columns = function (title, counts, labels) {
    var chartH = 84, chartW = this.W - 2 * this.M - 26, n = counts.length, max = Math.max.apply(null, counts.concat([1]));
    this.need(chartH + 52); this.sub(title);
    var base = this.y - chartH - 4, x0 = this.M + 26, slot = chartW / n, bw = Math.min(28, slot * 0.72), step = Math.ceil(n / 14);
    this.line(x0, base, x0 + chartW, base, GRAY, 0.8);
    this.text(this.M, base + chartH - 6, String(max), 8, false, GRAY); this.text(this.M, base - 3, "0", 8, false, GRAY);
    for (var i = 0; i < n; i++) {
      var h = counts[i] / max * chartH, x = x0 + i * slot + (slot - bw) / 2;
      if (counts[i] > 0) this.rect(x, base, bw, Math.max(1.5, h), ACCENT);
      if (i % step === 0) this.text(x + bw / 2 - widthOf(labels[i], 7.5, false) / 2, base - 12, labels[i], 7.5, false, GRAY);
    }
    this.y = base - 24;
  };

  /* data : { room, startedAt, endedAt, lines:[{ ts, at, id, name, text }], talk:[{ name, ms }] } → Uint8Array */
  function makePdf(data) {
    data = data || {};
    var lines = (Array.isArray(data.lines) ? data.lines : []).filter(function (l) { return l && typeof l.text === "string" && l.text; });
    var st = analyze(lines), d = new Doc(), colorOf = {};
    st.speakers.forEach(function (p, i) { colorOf[p.key] = PALETTE[i % PALETTE.length]; });
    var last = lines.length ? lines[lines.length - 1] : null;
    var startedAt = data.startedAt || (lines.length ? lines[0].ts : Date.now()), endedAt = data.endedAt || (last ? last.ts : startedAt);
    var when = new Date(startedAt), days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    var months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    var dateText = isNaN(when.getTime()) ? "" : days[when.getDay()] + " " + when.getDate() + " " + months[when.getMonth()] + " " + when.getFullYear() + " à " + clockText(startedAt).slice(0, 5);

    /* en-tête */
    d.rect(0, d.H - 96, d.W, 96, ACCENT);
    d.text(d.M, d.H - 52, "Transcription du chat vocal", 22, true, [1, 1, 1]);
    d.text(d.M, d.H - 74, ("Salle " + (data.room || "—") + (dateText ? "  ·  " + dateText : "")), 11, false, [0.93, 0.9, 1]);
    d.y = d.H - 96 - 18;
    var facts = [
      ["Durée de l'appel", fmtDuration(Math.max(0, endedAt - startedAt))], ["Participants", String(st.speakers.length || (data.talk || []).length || 0)],
      ["Phrases", String(st.phrases)], ["Mots dits", String(st.words)], ["Mots différents", String(st.distinct)]
    ];
    var fw = (d.W - 2 * d.M) / facts.length;
    facts.forEach(function (f, i) {
      d.text(d.M + i * fw, d.y - 16, f[1], 17, true, INK);
      d.text(d.M + i * fw, d.y - 29, f[0], 8.5, false, GRAY);
    });
    d.y -= 40;

    d.heading("Statistiques");
    d.hbars("Mots les plus dits (hors mots-outils : le, la, que, the…)", st.top.map(function (t) { return { label: t[0], value: t[1], valueLabel: "× " + t[1] }; }), "Pas encore assez de mots pour établir un classement.");
    d.hbars("Qui parle le plus (nombre de mots dits)", st.speakers.map(function (p) { return { label: p.name, value: p.words, valueLabel: p.words + " mots · " + p.phrases + (p.phrases > 1 ? " phrases" : " phrase"), color: colorOf[p.key] }; }));
    var talk = (Array.isArray(data.talk) ? data.talk : []).filter(function (t) { return t && t.ms >= 1000; }).sort(function (a, b) { return b.ms - a.ms; });
    if (talk.length) d.hbars("Temps de parole mesuré au micro", talk.map(function (t, i) { return { label: t.name, value: t.ms, valueLabel: fmtDuration(t.ms), color: PALETTE[i % PALETTE.length] }; }));
    d.sub("Les mots préférés de chacun");
    st.speakers.forEach(function (p) {
      var txt = p.top.length ? p.top.map(function (t) { return t[0] + " (×" + t[1] + ")"; }).join("   ") : "pas assez de mots";
      var rows = wrapText(txt, 9.5, false, d.W - 2 * d.M - 150, d.W - 2 * d.M - 150);
      d.need(rows.length * 13 + 6);
      d.rect(d.M, d.y - 11, 8, 8, colorOf[p.key]);
      d.text(d.M + 14, d.y - 10, clip(p.name, 9.5, true, 120), 9.5, true, INK);
      rows.forEach(function (r, i) { d.text(d.M + 150, d.y - 10 - i * 13, r, 9.5, false, INK); });
      d.y -= rows.length * 13 + 5;
    });
    d.y -= 8;
    var tl = st.timeline, labels = tl.counts.map(function (_, i) { return fmtDuration(i * tl.bucketMs); });
    d.columns("Activité au fil de l'appel (mots par tranche de " + (tl.bucketMs >= 60000 ? Math.round(tl.bucketMs / 60000) + " min" : Math.round(tl.bucketMs / 1000) + " s") + ", depuis l'arrivée au vocal)", tl.counts, labels);

    /* transcription complète */
    if (d.y < d.H * 0.3) d.newPage();
    d.heading("Transcription complète");
    var size = 10, lead = 13.2;
    lines.forEach(function (l) {
      var time = "[" + clockText(l.ts) + "] ", name = clip(l.name || "Joueur", size, true, 110) + " :";
      var w1 = widthOf(time, 8.5, false), w2 = widthOf(name, size, true) + 5, x0 = d.M + w1 + w2, full = d.W - d.M - x0, next = d.W - 2 * d.M - 18;
      var rows = wrapText(l.text, size, false, full, next);
      d.need(rows.length * lead + 4);
      var yb = d.y - size;
      d.text(d.M, yb + 0.6, time, 8.5, false, GRAY);
      d.text(d.M + w1, yb, name, size, true, colorOf[String(l.id == null ? l.name : l.id)] || INK);
      rows.forEach(function (r, i) { d.text(i === 0 ? x0 : d.M + 18, yb - i * lead, r, size, false, INK); });
      d.y -= rows.length * lead + 3;
    });

    /* pieds de page (avec le nombre total de pages) */
    var total = d.pages.length;
    d.pages.forEach(function (ops, i) {
      d.cur = ops;
      d.line(d.M, 38, d.W - d.M, 38, LIGHT, 0.6);
      d.text(d.M, 26, "Qui suis-je ? — transcription du chat vocal, salle " + (data.room || "—"), 8, false, GRAY);
      var pg = "Page " + (i + 1) + " / " + total;
      d.text(d.W - d.M - widthOf(pg, 8, false), 26, pg, 8, false, GRAY);
    });

    /* assemblage du fichier */
    var objs = [], pageIds = [];
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objs[5] = "<< /Title " + pdfString("Transcription du chat vocal — salle " + (data.room || "")) + " /Creator " + pdfString("Qui suis-je ?") + " /Producer " + pdfString("Qui suis-je ?") + " >>";
    var next2 = 6;
    d.pages.forEach(function (ops) {
      var content = ops.join("\n"), pid = next2++, cid = next2++;
      pageIds.push(pid);
      objs[cid] = "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream";
      objs[pid] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(d.W) + " " + num(d.H) + "] /Contents " + cid + " 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>";
    });
    objs[2] = "<< /Type /Pages /Kids [" + pageIds.map(function (i) { return i + " 0 R"; }).join(" ") + "] /Count " + pageIds.length + " >>";
    var out = "%PDF-1.4\n%âãÏÓ\n", offsets = [];
    for (var i = 1; i < objs.length; i++) { offsets[i] = out.length; out += i + " 0 obj\n" + objs[i] + "\nendobj\n"; }
    var xref = out.length;
    out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
    for (var j = 1; j < objs.length; j++) out += ("0000000000" + offsets[j]).slice(-10) + " 00000 n \n";
    out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R /Info 5 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    var bytes = new Uint8Array(out.length);
    for (var k = 0; k < out.length; k++) bytes[k] = out.charCodeAt(k) & 255;
    return bytes;
  }

  /* ----------------------------------------------------------------- ODT (LibreOffice, Word, Google Docs…) ---- */
  var CRC_T = null;
  function crc32(bytes) {
    if (!CRC_T) { CRC_T = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); CRC_T[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = CRC_T[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(str) {
    var s = String(str), out;
    try { out = unescape(encodeURIComponent(s)); } catch (e) { out = unescape(encodeURIComponent(s.replace(/[\ud800-\udfff]/g, "?"))); }
    var b = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) b[i] = out.charCodeAt(i);
    return b;
  }
  /* Archive ZIP sans compression (suffisant et sans bibliothèque) : files = [{ name, data: Uint8Array }] */
  function zipStore(files) {
    var now = new Date(), y = now.getFullYear() >= 1980 ? now.getFullYear() : 1980;
    var dt = ((y - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    var chunks = [], central = [], offset = 0, total = 0, centralSize = 0;
    files.forEach(function (f) {
      var name = utf8(f.name), crc = crc32(f.data), size = f.data.length;
      var local = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(tm), u16(dt), u32(crc), u32(size), u32(size), u16(name.length), u16(0));
      var cen = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(tm), u16(dt), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
      chunks.push(new Uint8Array(local), name, f.data);
      central.push(new Uint8Array(cen), name);
      offset += local.length + name.length + size; centralSize += cen.length + name.length;
    });
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)));
    var all = chunks.concat(central, [end]);
    all.forEach(function (c) { total += c.length; });
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  }
  function xe(s) {
    return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var hex = function (c) { return "#" + c.map(function (v) { return ("0" + Math.round(v * 255).toString(16)).slice(-2); }).join(""); };

  /* Même contenu que le PDF, en document modifiable (tableaux avec barres █ à la place des graphiques) → Uint8Array (.odt) */
  function makeOdt(data) {
    data = data || {};
    var lines = (Array.isArray(data.lines) ? data.lines : []).filter(function (l) { return l && typeof l.text === "string" && l.text.trim(); });
    var st = analyze(lines), last = lines.length ? lines[lines.length - 1] : null;
    var startedAt = data.startedAt || (lines.length ? lines[0].ts : Date.now()), endedAt = data.endedAt || (last ? last.ts : startedAt);
    var when = new Date(startedAt), days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    var months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    var dateText = isNaN(when.getTime()) ? "" : days[when.getDay()] + " " + when.getDate() + " " + months[when.getMonth()] + " " + when.getFullYear() + " à " + clockText(startedAt).slice(0, 5);
    var talk = (Array.isArray(data.talk) ? data.talk : []).filter(function (t) { return t && t.ms >= 1000; });
    var talkOf = {}; talk.forEach(function (t) { talkOf[t.name] = t.ms; });
    var colWidths = {};
    var span = function (style, text) { return '<text:span text:style-name="' + style + '">' + xe(text) + "</text:span>"; };
    var para = function (style, inner) { return '<text:p text:style-name="' + style + '">' + inner + "</text:p>"; };
    var heading = function (t) { return '<text:h text:style-name="H" text:outline-level="1">' + xe(t) + "</text:h>"; };
    var bar = function (n, max, col, blocks) { var k = Math.max(1, Math.round(n / (max || 1) * (blocks || 24))); return '<text:span text:style-name="' + col + '">' + new Array(k + 1).join("█") + "</text:span>"; };
    var tcount = 0;
    function table(widths, head, rows) {
      var name = "Tab" + (++tcount), out = '<table:table table:name="' + name + '" table:style-name="Tbl">';
      widths.forEach(function (w) { var id = "Col" + String(w).replace(".", "_"); colWidths[id] = w; out += '<table:table-column table:style-name="' + id + '"/>'; });
      var cell = function (inner, style) { return '<table:table-cell table:style-name="' + style + '" office:value-type="string">' + para("P", inner) + "</table:table-cell>"; };
      out += "<table:table-row>" + head.map(function (h) { return cell(span("B", h), "Cell"); }).join("") + "</table:table-row>";
      rows.forEach(function (r) { out += "<table:table-row>" + r.map(function (c) { return cell(c, "Cell"); }).join("") + "</table:table-row>"; });
      return out + "</table:table>";
    }
    var body = [];
    body.push(para("Title", xe("Transcription du chat vocal")));
    body.push(para("Sub", xe("Salle " + (data.room || "—") + (dateText ? "  ·  " + dateText : ""))));
    body.push(para("P", span("B", "Durée de l'appel : ") + xe(fmtDuration(Math.max(0, endedAt - startedAt))) + " · " + span("B", "Participants : ") + (st.speakers.length || talk.length)
      + " · " + span("B", "Phrases : ") + st.phrases + " · " + span("B", "Mots dits : ") + st.words + " · " + span("B", "Mots différents : ") + st.distinct));
    body.push(heading("Mots les plus dits"));
    if (st.top.length) {
      var maxTop = st.top[0][1];
      body.push(table([4, 2, 11], ["Mot", "Fois", "Graphique"], st.top.map(function (t) { return [xe(t[0]), String(t[1]), bar(t[1], maxTop, "Bar")]; })));
    } else body.push(para("G", xe("Pas encore assez de mots pour établir un classement.")));
    body.push(heading("Qui parle le plus"));
    var maxW = st.speakers.length ? st.speakers[0].words : 1;
    body.push(table([4, 2, 2.4, 3, 5.6], ["Participant", "Mots", "Phrases", "Temps de parole", "Graphique"], st.speakers.map(function (p, i) {
      return [span("C" + (i % PALETTE.length), p.name), String(p.words), String(p.phrases), talkOf[p.name] ? fmtDuration(talkOf[p.name]) : "—", bar(p.words, maxW, "BarC" + (i % PALETTE.length), 14)];
    })));
    body.push(heading("Les mots préférés de chacun"));
    st.speakers.forEach(function (p, i) {
      body.push(para("P", span("C" + (i % PALETTE.length), p.name + " : ") + xe(p.top.length ? p.top.map(function (t) { return t[0] + " (×" + t[1] + ")"; }).join(", ") : "pas assez de mots")));
    });
    body.push(heading("Activité au fil de l'appel"));
    var tl = st.timeline, maxC = Math.max.apply(null, tl.counts.concat([1]));
    body.push(table([4, 2, 11], ["Tranche (depuis l'arrivée au vocal)", "Mots", "Graphique"], tl.counts.map(function (c, i) {
      return [xe(fmtDuration(i * tl.bucketMs) + " – " + fmtDuration((i + 1) * tl.bucketMs)), String(c), c ? bar(c, maxC, "Bar") : ""];
    })));
    body.push(heading("Transcription complète"));
    var idxOf = {}; st.speakers.forEach(function (p, i) { idxOf[p.key] = i % PALETTE.length; });
    lines.forEach(function (l) {
      var ci = idxOf[String(l.id == null ? l.name : l.id)];
      body.push(para("P", span("G", "[" + clockText(l.ts) + "] ") + span(ci == null ? "B" : "C" + ci, (l.name || "Joueur") + " : ") + xe(l.text)));
    });

    var styles = '<style:style style:name="Title" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.1cm"/><style:text-properties fo:font-size="22pt" fo:font-weight="bold" fo:color="' + hex(ACCENT) + '"/></style:style>'
      + '<style:style style:name="Sub" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.3cm"/><style:text-properties fo:font-size="11pt" fo:color="#6b6d80"/></style:style>'
      + '<style:style style:name="H" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.5cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>'
      + '<style:style style:name="P" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.04cm" fo:margin-bottom="0.08cm"/></style:style>'
      + '<style:style style:name="G" style:family="paragraph"><style:text-properties fo:color="#6b6d80"/></style:style>'
      + '<style:style style:name="B" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>'
      + '<style:style style:name="Bar" style:family="text"><style:text-properties fo:color="' + hex(ACCENT) + '"/></style:style>'
      + '<style:style style:name="Tbl" style:family="table"><style:table-properties style:width="17cm" table:align="left"/></style:style>'
      + '<style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.07cm" fo:border-top="none" fo:border-left="none" fo:border-right="none" fo:border-bottom="0.5pt solid #d8d8e4"/></style:style>';
    PALETTE.forEach(function (c, i) {
      styles += '<style:style style:name="C' + i + '" style:family="text"><style:text-properties fo:font-weight="bold" fo:color="' + hex(c) + '"/></style:style>'
        + '<style:style style:name="BarC' + i + '" style:family="text"><style:text-properties fo:color="' + hex(c) + '"/></style:style>';
    });
    Object.keys(colWidths).forEach(function (id) { styles += '<style:style style:name="' + id + '" style:family="table-column"><style:table-column-properties style:column-width="' + colWidths[id] + 'cm"/></style:style>'; });

    var NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"';
    var head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    var content = head + "<office:document-content " + NS + ' office:version="1.2"><office:automatic-styles>' + styles + "</office:automatic-styles><office:body><office:text>" + body.join("") + "</office:text></office:body></office:document-content>";
    var stylesXml = head + "<office:document-styles " + NS + ' office:version="1.2"><office:styles/></office:document-styles>';
    var meta = head + "<office:document-meta " + NS + ' office:version="1.2"><office:meta><dc:title>' + xe("Transcription du chat vocal — salle " + (data.room || "")) + "</dc:title><meta:generator>Qui suis-je ?</meta:generator></office:meta></office:document-meta>";
    var manifest = head + '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">'
      + '<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>'
      + '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>'
      + '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/></manifest:manifest>';
    return zipStore([
      { name: "mimetype", data: utf8("application/vnd.oasis.opendocument.text") },      /* doit être le 1er fichier, non compressé */
      { name: "META-INF/manifest.xml", data: utf8(manifest) }, { name: "content.xml", data: utf8(content) },
      { name: "styles.xml", data: utf8(stylesXml) }, { name: "meta.xml", data: utf8(meta) }
    ]);
  }

  var api = { tokenize: tokenize, significant: significant, analyze: analyze, makePdf: makePdf, makeOdt: makeOdt, zipStore: zipStore, crc32: crc32, utf8: utf8, wrapText: wrapText, widthOf: widthOf, pdfString: pdfString, fmtDuration: fmtDuration, clockText: clockText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.V50Transcript = api;
  return api;
})();
