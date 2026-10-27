/* =============================================================================
   V40 — Graphiques SVG / HTML sans bibliothèque (thème sombre)

   Règles appliquées : une couleur par joueur (ordre d'arrivée, jamais recyclée) ; palette catégorielle validée
   (écart daltonien, contraste ≥ 3:1 sur #1a1a19) ; couleurs d'état (bon / mauvais) réservées aux réponses et toujours
   accompagnées d'une icône + d'un libellé ; lignes de 2 px, marqueurs ≥ 8 px cerclés de 2 px, barres ≤ 24 px
   arrondies de 4 px côté valeur ; grille en filet ; légende dès 2 séries + étiquettes directes (≤ 4 séries) ;
   infobulle au survol / au toucher / au clavier ; chaque graphique a sa version « Tableau ».
   Tout texte venant des joueurs passe par textContent (jamais innerHTML).
   ============================================================================= */
var V40Charts = (function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var C = {
    surface: "#1a1a19", ink: "#f0efec", ink2: "#c3c2b7", muted: "#898781", grid: "#2c2c2a", axis: "#383835",
    palette: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
    good: "#0ca30c", bad: "#d03b3b", none: "#6f6e69"
  };
  var STATE = {
    1: { name: "Bonne réponse", glyph: "✓", color: C.good },
    2: { name: "Mauvaise réponse", glyph: "✗", color: C.bad },
    3: { name: "Pas de réponse", glyph: "⏱", color: C.none }
  };

  /* ---------- Petits utilitaires ---------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    [].concat(kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function sv(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "text") e.textContent = attrs[k]; else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]); });
    [].concat(kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function cut(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s; }
  var fmt = {
    int: function (n) { return Math.round(n).toLocaleString("fr-FR"); },
    pct: function (x) { return x === null || x === undefined ? "—" : Math.round(x * 100) + " %"; },
    sec: function (x) { return x === null || x === undefined ? "—" : (Math.round(x * 10) / 10).toString().replace(".", ",") + " s"; }
  };
  function colorOf(idx) { return idx >= 0 && idx < C.palette.length ? C.palette[idx] : null; }

  /* Graduations « rondes » : renvoie {max, ticks}. */
  function niceTicks(lo, hi, want) {
    want = want || 4;
    if (!(hi > lo)) hi = lo + 1;
    var raw = (hi - lo) / want, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    var start = Math.floor(lo / step) * step, end = Math.ceil(hi / step) * step, ticks = [];
    for (var v = start; v <= end + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { min: start, max: end, ticks: ticks };
  }
  /* Rectangle dont seuls les coins demandés sont arrondis (gauche, droite). */
  function barPath(x, y, w, h, rl, rr) {
    w = Math.max(0, w); rl = Math.min(rl, w / 2, h / 2); rr = Math.min(rr, w / 2, h / 2);
    return "M" + (x + rl) + "," + y + "H" + (x + w - rr) + (rr ? "A" + rr + "," + rr + " 0 0 1 " + (x + w) + "," + (y + rr) : "") +
      "V" + (y + h - rr) + (rr ? "A" + rr + "," + rr + " 0 0 1 " + (x + w - rr) + "," + (y + h) : "") + "H" + (x + rl) +
      (rl ? "A" + rl + "," + rl + " 0 0 1 " + x + "," + (y + h - rl) : "") + "V" + (y + rl) + (rl ? "A" + rl + "," + rl + " 0 0 1 " + (x + rl) + "," + y : "") + "Z";
  }
  /* Colonne dont seul le haut est arrondi (barre verticale ancrée sur la ligne de base). */
  function colPath(x, y, w, h, r) {
    w = Math.max(0, w); h = Math.max(0, h); r = Math.min(r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + (r ? "A" + r + "," + r + " 0 0 1 " + (x + r) + "," + y : "") + "H" + (x + w - r) + (r ? "A" + r + "," + r + " 0 0 1 " + (x + w) + "," + (y + r) : "") + "V" + (y + h) + "Z";
  }

  /* ---------- Infobulle ---------- */
  var tipNode = null;
  function tipEl() {
    if (!tipNode || !tipNode.isConnected) {
      tipNode = el("div", { "class": "v40s-tip", role: "tooltip", "aria-hidden": "true" });
      var root = document.getElementById("v40Stats") || document.body;
      root.appendChild(tipNode);
    }
    return tipNode;
  }
  /* content : {title, sub, rows:[{color, label, value, strong}]} ; at : {x, y} en pixels écran */
  function showTip(content, at) {
    var t = tipEl();
    while (t.firstChild) t.removeChild(t.firstChild);
    if (content.title) t.appendChild(el("div", { "class": "v40s-tip-title", text: content.title }));
    if (content.sub) t.appendChild(el("div", { "class": "v40s-tip-sub", text: content.sub }));
    (content.rows || []).forEach(function (r) {
      t.appendChild(el("div", { "class": "v40s-tip-row" + (r.strong ? " strong" : "") }, [
        r.color ? el("i", { style: "background:" + r.color }) : el("i", { "class": "none" }),
        el("span", { "class": "l", text: r.label }),
        el("span", { "class": "v", text: r.value == null ? "" : String(r.value) })
      ]));
    });
    t.classList.add("show"); t.setAttribute("aria-hidden", "false");
    var vw = window.innerWidth, vh = window.innerHeight, w = t.offsetWidth, h = t.offsetHeight;
    var x = at.x + 14, y = at.y + 14;
    if (x + w > vw - 8) x = Math.max(8, at.x - w - 14);
    if (y + h > vh - 8) y = Math.max(8, at.y - h - 14);
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function hideTip() { if (tipNode) { tipNode.classList.remove("show"); tipNode.setAttribute("aria-hidden", "true"); } }
  function pointOf(ev, node) {
    if (ev && typeof ev.clientX === "number" && (ev.clientX || ev.clientY)) return { x: ev.clientX, y: ev.clientY };
    var r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top };
  }
  /* Rend un élément survolable / focalisable avec une infobulle. */
  function hover(node, getContent) {
    function on(ev) { var c = getContent(); if (c) showTip(c, pointOf(ev, node)); }
    node.addEventListener("pointerenter", on); node.addEventListener("pointermove", on);
    node.addEventListener("pointerleave", hideTip); node.addEventListener("focus", on); node.addEventListener("blur", hideTip);
    node.addEventListener("pointerdown", function (ev) { if (ev.pointerType === "touch") on(ev); });
  }

  /* ---------- Légende (boutons : cliquer masque / affiche une série, la couleur ne change jamais) ---------- */
  function legend(items, hidden, onToggle) {
    var box = el("div", { "class": "v40s-legend", role: "group", "aria-label": "Légende" });
    items.forEach(function (it) {
      var off = hidden && hidden.has(it.key);
      var b = el("button", { type: "button", "class": "v40s-leg" + (off ? " off" : ""), "aria-pressed": off ? "false" : "true", title: it.name + (onToggle ? " — cliquer pour afficher / masquer" : "") }, [
        el("i", { style: "background:" + it.color }), el("span", { text: (it.glyph ? it.glyph + " " : "") + cut(it.name, 18) })
      ]);
      if (onToggle) b.addEventListener("click", function () { onToggle(it.key); });
      else { b.disabled = true; }
      box.appendChild(b);
    });
    return box;
  }

  /* ---------- Courbe (évolution des scores, réussite par question…) ---------- */
  /* o : {n, series:[{key,name,color,values:[n+1 valeurs ou null]}], hidden:Set, yMax, yFmt, xTitle, yTitle, height,
          endLabels, header(i), valueText(s,i), ariaLabel} */
  function line(host, o) {
    var W = Math.max(280, host.clientWidth || 640), H = o.height || (W < 480 ? 250 : 310);
    var all = o.series.filter(function (s) { return !(o.hidden && o.hidden.has(s.key)); });
    var n = o.n, yFmt = o.yFmt || fmt.int;
    var maxV = 0, minV = 0;
    all.forEach(function (s) { s.values.forEach(function (v) { if (v !== null && v !== undefined) { maxV = Math.max(maxV, v); minV = Math.min(minV, v); } }); });
    var tk = o.yMax !== undefined ? { min: 0, max: o.yMax, ticks: niceTicks(0, o.yMax, 4).ticks.filter(function (v) { return v <= o.yMax; }) } : niceTicks(minV, maxV || 1, 4);
    var showEnd = !!o.endLabels && all.length >= 1 && all.length <= 4 && W >= 380;
    var m = { l: 12 + String(yFmt(tk.max)).length * 7, r: showEnd ? 92 : 16, t: 14, b: o.xTitle ? 46 : 30 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    function X(i) { return m.l + (n > 0 ? i / n : 0) * pw; }
    function Y(v) { return m.t + (1 - (v - tk.min) / (tk.max - tk.min || 1)) * ph; }

    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "class": "v40s-svg", role: "img", "aria-label": o.ariaLabel || "Graphique en courbes", tabindex: "0" });
    var g = sv("g");
    tk.ticks.forEach(function (v) {
      g.appendChild(sv("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v === tk.min ? C.axis : C.grid, "stroke-width": 1 }));
      g.appendChild(sv("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: C.muted, text: yFmt(v) }));
    });
    var step = Math.max(1, Math.ceil(n / 8));
    for (var i = 0; i <= n; i += step) g.appendChild(sv("text", { x: X(i), y: H - m.b + 16, "text-anchor": "middle", "font-size": 11, fill: C.muted, text: String(i) }));
    if (o.xTitle) g.appendChild(sv("text", { x: m.l + pw / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: C.muted, text: o.xTitle }));
    svg.appendChild(g);

    var lines = sv("g", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
    all.forEach(function (s) {
      var d = "", pen = false;
      s.values.forEach(function (v, k) {
        if (v === null || v === undefined) { pen = false; return; }
        d += (pen ? "L" : "M") + X(k).toFixed(1) + "," + Y(v).toFixed(1); pen = true;
      });
      lines.appendChild(sv("path", { d: d, stroke: s.color, "stroke-width": 2 }));
    });
    svg.appendChild(lines);
    /* points isolés + dernier point de chaque série */
    var marks = sv("g");
    var ends = [];
    all.forEach(function (s) {
      var last = -1; s.values.forEach(function (v, k) { if (v !== null && v !== undefined) last = k; });
      if (last >= 0) { marks.appendChild(sv("circle", { cx: X(last), cy: Y(s.values[last]), r: 4, fill: s.color, stroke: C.surface, "stroke-width": 2 })); ends.push({ s: s, y: Y(s.values[last]), v: s.values[last] }); }
    });
    svg.appendChild(marks);
    if (showEnd) {
      ends.sort(function (a, b) { return a.y - b.y; });
      var prev = -1e9;
      ends.forEach(function (en) { var ly = Math.max(en.y, prev + 15); en.ly = ly; prev = ly; });
      ends.forEach(function (en) {
        svg.appendChild(sv("text", { x: W - m.r + 10, y: en.ly + 4, "font-size": 11.5, "font-weight": 700, fill: C.ink2, text: cut(en.s.name, 10) }));
      });
    }

    /* survol : repère vertical + points + infobulle */
    var cross = sv("line", { y1: m.t, y2: H - m.b, stroke: C.axis, "stroke-width": 1, visibility: "hidden" });
    var dots = sv("g");
    svg.appendChild(cross); svg.appendChild(dots);
    var hit = sv("rect", { x: m.l, y: m.t, width: pw, height: ph + 6, fill: "transparent", style: "touch-action:pan-y" });
    svg.appendChild(hit);
    var cur = n;
    function showAt(i, at) {
      i = Math.max(0, Math.min(n, i)); cur = i;
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
      while (dots.firstChild) dots.removeChild(dots.firstChild);
      var rows = [];
      all.forEach(function (s) {
        var v = s.values[i];
        if (v !== null && v !== undefined) {
          dots.appendChild(sv("circle", { cx: X(i), cy: Y(v), r: 4, fill: s.color, stroke: C.surface, "stroke-width": 2 }));
          rows.push({ color: s.color, label: s.name, value: o.valueText ? o.valueText(s, i) : yFmt(v), sort: v });
        } else rows.push({ color: s.color, label: s.name, value: "hors partie", sort: -1e12 });
      });
      rows.sort(function (a, b) { return b.sort - a.sort; });
      var head = o.header ? o.header(i) : { title: String(i) };
      showTip({ title: head.title, sub: head.sub, rows: rows.slice(0, 12) }, at);
    }
    function clear() { cross.setAttribute("visibility", "hidden"); while (dots.firstChild) dots.removeChild(dots.firstChild); hideTip(); }
    function idxFrom(ev) { var r = hit.getBoundingClientRect(); return Math.round((ev.clientX - r.left) / (r.width || 1) * n); }
    hit.addEventListener("pointermove", function (ev) { showAt(idxFrom(ev), { x: ev.clientX, y: ev.clientY }); });
    hit.addEventListener("pointerdown", function (ev) { showAt(idxFrom(ev), { x: ev.clientX, y: ev.clientY }); });
    hit.addEventListener("pointerleave", clear);
    svg.addEventListener("keydown", function (ev) {
      var r = svg.getBoundingClientRect(), at = { x: r.left + X(cur), y: r.top + m.t + 20 };
      if (ev.key === "ArrowRight") { ev.preventDefault(); showAt(cur + 1, { x: r.left + X(Math.min(n, cur + 1)), y: at.y }); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); showAt(cur - 1, { x: r.left + X(Math.max(0, cur - 1)), y: at.y }); }
      else if (ev.key === "Escape") clear();
    });
    svg.addEventListener("blur", clear);
    host.appendChild(svg);
  }

  /* ---------- Barres horizontales (une valeur par ligne) ---------- */
  /* rows : [{label, sub, value, color, text, tip:{title,sub,rows}}] ; max : valeur correspondant à 100 % de la largeur */
  function hbars(host, o) {
    var rows = o.rows, W = Math.max(280, host.clientWidth || 640), rowH = 32, labelW = Math.round(Math.min(210, Math.max(92, W * 0.30)));
    var longest = rows.reduce(function (m, r) { return Math.max(m, String(r.text).length); }, 0);
    var valW = Math.min(Math.round(W * 0.5), Math.max(64, Math.round(longest * 7.6) + 16));      /* place réservée au texte de valeur : jamais rogné */
    var H = rows.length * rowH + 6, bx = labelW + 8, bw = Math.max(40, W - bx - valW);
    var max = o.max || Math.max.apply(null, rows.map(function (r) { return r.value || 0; }).concat([1]));
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "class": "v40s-svg", role: "img", "aria-label": o.ariaLabel || "Graphique en barres" });
    svg.appendChild(sv("line", { x1: bx, x2: bx, y1: 0, y2: H - 4, stroke: C.axis, "stroke-width": 1 }));
    rows.forEach(function (r, i) {
      var y = i * rowH + 5, w = r.value > 0 ? Math.max(3, r.value / max * bw) : 0;
      var g = sv("g", { tabindex: "0", role: "img", "aria-label": r.label + " : " + r.text });
      g.appendChild(sv("rect", { x: 0, y: y - 4, width: W, height: rowH, fill: "transparent" }));
      g.appendChild(sv("text", { x: 0, y: y + 14, "font-size": 12.5, "font-weight": 700, fill: C.ink2, text: cut((r.avatar ? r.avatar + " " : "") + r.label, Math.floor(labelW / 6.8)) }));
      if (w > 0) g.appendChild(sv("path", { d: barPath(bx, y, w, 20, 0, 4), fill: r.color || C.palette[0] }));
      g.appendChild(sv("text", { x: bx + w + 8, y: y + 15, "font-size": 12.5, "font-weight": 800, fill: C.ink, text: r.text }));
      if (r.tip) hover(g, function () { return r.tip; });
      svg.appendChild(g);
    });
    host.appendChild(svg);
  }

  /* ---------- Barres empilées (bonnes / mauvaises / sans réponse) ---------- */
  /* rows : [{label, avatar, parts:[{name, value, color, glyph}], total}] ; max = total le plus grand */
  function stack(host, o) {
    var rows = o.rows, W = Math.max(280, host.clientWidth || 640), rowH = 36, labelW = Math.round(Math.min(210, Math.max(92, W * 0.30)));
    var bx = labelW + 8, bw = Math.max(60, W - bx - 12), H = rows.length * rowH + 6;
    var max = Math.max.apply(null, rows.map(function (r) { return r.total; }).concat([1]));
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "class": "v40s-svg", role: "img", "aria-label": o.ariaLabel || "Barres empilées" });
    svg.appendChild(sv("line", { x1: bx, x2: bx, y1: 0, y2: H - 4, stroke: C.axis, "stroke-width": 1 }));
    rows.forEach(function (r, i) {
      var y = i * rowH + 6, g = sv("g", { tabindex: "0", role: "img", "aria-label": r.label + " : " + r.parts.map(function (p) { return p.value + " " + p.name.toLowerCase(); }).join(", ") });
      g.appendChild(sv("rect", { x: 0, y: y - 5, width: W, height: rowH, fill: "transparent" }));
      g.appendChild(sv("text", { x: 0, y: y + 16, "font-size": 12.5, "font-weight": 700, fill: C.ink2, text: cut((r.avatar ? r.avatar + " " : "") + r.label, Math.floor(labelW / 6.8)) }));
      var parts = r.parts.filter(function (p) { return p.value > 0; }), x = bx;
      parts.forEach(function (p, k) {
        var full = p.value / max * bw, w = Math.max(3, full - (k < parts.length - 1 ? 2 : 0));
        g.appendChild(sv("path", { d: barPath(x, y, w, 22, k === 0 ? 4 : 0, k === parts.length - 1 ? 4 : 0), fill: p.color }));
        if (w >= 22) g.appendChild(sv("text", { x: x + w / 2, y: y + 15.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#ffffff", text: String(p.value) }));
        x += full;
      });
      if (!parts.length) g.appendChild(sv("text", { x: bx + 8, y: y + 16, "font-size": 12, fill: C.muted, text: "aucune réponse" }));
      hover(g, function () {
        return { title: r.label, sub: r.total + " " + (o.unit || "question") + (r.total > 1 ? "s" : ""), rows: r.parts.map(function (p) { return { color: p.color, label: (p.glyph ? p.glyph + " " : "") + p.name, value: p.value + (r.total ? " (" + Math.round(p.value / r.total * 100) + " %)" : "") }; }) };
      });
      svg.appendChild(g);
    });
    host.appendChild(svg);
  }

  /* ---------- Colonnes (un taux par question, jusqu'à ~40 colonnes) ---------- */
  /* o : {values:[0..1|null], labels:[…], color, tipFor(i)} */
  function columns(host, o) {
    var n = o.values.length, W = Math.max(280, host.clientWidth || 640), H = W < 480 ? 220 : 260;
    var m = { l: 44, r: 12, t: 12, b: 32 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var slot = pw / Math.max(1, n), bw = Math.max(2, Math.min(24, slot - 2));
    function Y(v) { return m.t + (1 - v) * ph; }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "class": "v40s-svg", role: "img", "aria-label": o.ariaLabel || "Graphique en colonnes" });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      svg.appendChild(sv("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? C.axis : C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: C.muted, text: Math.round(v * 100) + " %" }));
    });
    var every = Math.max(1, Math.ceil(n / 10));
    o.values.forEach(function (v, i) {
      var cx = m.l + slot * i + slot / 2;
      if (i % every === 0 || i === n - 1) svg.appendChild(sv("text", { x: cx, y: H - m.b + 16, "text-anchor": "middle", "font-size": 11, fill: C.muted, text: o.labels[i] }));
      var g = sv("g", { tabindex: "0", role: "img", "aria-label": o.tipFor(i).title + " : " + (v === null ? "aucune réponse" : Math.round(v * 100) + " %") });
      g.appendChild(sv("rect", { x: m.l + slot * i, y: m.t, width: slot, height: ph + 4, fill: "transparent" }));
      if (v !== null && v > 0) g.appendChild(sv("path", { d: colPath(cx - bw / 2, Y(v), bw, ph * v, 4), fill: o.color || C.palette[0] }));
      hover(g, function () { return o.tipFor(i); });
      svg.appendChild(g);
    });
    host.appendChild(svg);
  }

  /* ---------- Matrice joueur × question (vraie table HTML : lisible, défilante, accessible) ---------- */
  /* o : {players:[{name,avatar,color}], rounds:[{label,q}], cell(pi,ri)->{state,seconds,score}} */
  function matrix(host, o) {
    var wrap = el("div", { "class": "v40s-matrix", tabindex: "0", role: "region", "aria-label": "Détail des réponses de chaque joueur à chaque question" });
    var table = el("table");
    var head = el("tr", null, [el("th", { "class": "who", text: "Joueur" })]);
    o.rounds.forEach(function (r) { head.appendChild(el("th", { text: r.label })); });
    table.appendChild(el("thead", null, [head]));
    var tb = el("tbody");
    o.players.forEach(function (p, pi) {
      var tr = el("tr", null, [el("th", { "class": "who", scope: "row" }, [el("i", { style: "background:" + (p.color || C.muted) }), (p.avatar ? p.avatar + " " : "") + cut(p.name, 14)])]);
      o.rounds.forEach(function (r, ri) {
        var c = o.cell(pi, ri), st = c.state, info = STATE[st];
        var td = el("td", { "class": "s" + st, text: info ? info.glyph : "·", tabindex: "-1", "aria-label": p.name + ", question " + r.label + " : " + (info ? info.name : "hors partie") });
        hover(td, function () {
          return { title: p.name + " — question " + r.label, sub: cut(r.q, 70), rows: [{ color: info ? info.color : null, label: info ? info.glyph + " " + info.name : "Hors partie", value: (st === 1 || st === 2) ? fmt.sec(c.seconds) : "" }, { label: "Score après la question", value: c.score }] };
        });
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  /* ---------- Version « Tableau » ---------- */
  function table(headers, rows, caption) {
    var t = el("table", { "class": "v40s-table" });
    if (caption) t.appendChild(el("caption", { text: caption }));
    t.appendChild(el("thead", null, [el("tr", null, headers.map(function (h) { return el("th", { scope: "col", text: h }); }))]));
    t.appendChild(el("tbody", null, rows.map(function (r) { return el("tr", null, r.map(function (c, k) { return el(k === 0 ? "th" : "td", k === 0 ? { scope: "row", text: String(c) } : { text: String(c) }); })); })));
    return el("div", { "class": "v40s-tablewrap", tabindex: "0", role: "region", "aria-label": caption || "Tableau" }, [t]);
  }

  /* ---------- Carte de graphique : titre, bascule Graphique / Tableau, légende ---------- */
  /* o : {title, desc, draw(host), table()->node, legend()->node|null} */
  function card(o) {
    var view = "chart";
    var body = el("div", { "class": "v40s-body" });
    var legendHost = el("div", { "class": "v40s-legendhost" });
    var bChart = el("button", { type: "button", "class": "on", "aria-pressed": "true", text: "📈 Graphique" });
    var bTable = el("button", { type: "button", "aria-pressed": "false", text: "🔢 Tableau" });
    var seg = el("div", { "class": "v40s-seg", role: "group", "aria-label": "Mode d'affichage" }, [bChart, bTable]);
    var node = el("section", { "class": "v40s-card" }, [
      el("div", { "class": "v40s-cardhead" }, [el("div", null, [el("h3", { text: o.title }), o.desc ? el("p", { text: o.desc }) : null]), seg]),
      legendHost, body
    ]);
    function redraw() {
      hideTip();
      while (body.firstChild) body.removeChild(body.firstChild);
      while (legendHost.firstChild) legendHost.removeChild(legendHost.firstChild);
      bChart.className = view === "chart" ? "on" : ""; bTable.className = view === "table" ? "on" : "";
      bChart.setAttribute("aria-pressed", String(view === "chart")); bTable.setAttribute("aria-pressed", String(view === "table"));
      if (view === "table") { body.appendChild(o.table()); return; }
      var lg = o.legend ? o.legend(redraw) : null; if (lg) legendHost.appendChild(lg);
      o.draw(body);
    }
    bChart.addEventListener("click", function () { view = "chart"; redraw(); });
    bTable.addEventListener("click", function () { view = "table"; redraw(); });
    node.__redraw = redraw;      /* le premier dessin est lancé par l'appelant, une fois la carte dans le DOM (largeur réelle) */
    return node;
  }

  return { C: C, STATE: STATE, fmt: fmt, el: el, sv: sv, cut: cut, colorOf: colorOf, niceTicks: niceTicks, barPath: barPath,
    legend: legend, line: line, hbars: hbars, stack: stack, columns: columns, matrix: matrix, table: table, card: card,
    showTip: showTip, hideTip: hideTip, hover: hover };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V40Charts;
if (typeof window !== "undefined") window.V40Charts = V40Charts;
