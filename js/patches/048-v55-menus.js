/* =============================================================================
   V55 — Deux menus dans la colonne de boutons de droite + annonces d'arrivée / de départ
   • 🏠 « Ma salle » : nom, code, joueurs (rang, score, équipe), expulsion (hôte), verrou, nombre de places
     en direct, invitation, fermer la salle / quitter. Disponible aussi pendant la partie.
   • ⚙️ « Réglages & aide » : taille du texte, moins d'animations et de flashs, pastilles de touches,
     annonces d'arrivée / départ, aide (boutons visibles, raccourcis). Mémorisé sur l'appareil.
   • « ➕ Bob a rejoint la salle » / « ➖ Bob est parti » pour tout le monde.
   V55 est pur (testable avec Node : tests/menus.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V55 = (function () {
  "use strict";
  var MIN_SCALE = 80, MAX_SCALE = 160, STEP = 10, NAME_MAX = 24;
  var CTRL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function clean(v, fallback) { var s = String(v == null ? "" : v).replace(CTRL, "").replace(/\s+/g, " ").trim(); var a = Array.from(s); return a.length ? a.slice(0, NAME_MAX).join("") : fallback; }

  /* Réglages : tout est borné, rien d'inconnu n'est gardé. « calm » vaut vrai par défaut si le système demande moins d'animations. */
  function cleanPrefs(raw, systemCalm) {
    var o = raw && typeof raw === "object" ? raw : {};
    var raw = o.scale, sc = (raw === null || raw === "" || typeof raw === "object" || typeof raw === "boolean") ? NaN : Math.round(Number(raw)); if (!isFinite(sc)) sc = 100;
    sc = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(sc / 5) * 5));
    return { scale: sc, calm: has(o, "calm") ? o.calm === true : !!systemCalm, keys: o.keys !== false, notify: o.notify !== false };
  }
  function stepScale(scale, dir) {
    var s = (scale === null || scale === "" || typeof scale === "object") ? NaN : Number(scale); if (!isFinite(s)) s = 100;
    return cleanPrefs({ scale: s + (dir > 0 ? STEP : -STEP) }).scale;
  }
  function parsePrefs(text, systemCalm) { var o = null; try { o = JSON.parse(text); } catch (e) {} return cleanPrefs(o, systemCalm); }

  /* Photo des joueurs présents : identifiant → pseudo (sans prototype, donc « __proto__ » est un identifiant comme un autre). */
  function snapshot(players) {
    var m = Object.create(null);
    if (!players || typeof players !== "object") return m;
    Object.keys(players).forEach(function (id) { var p = players[id]; m[id] = clean(p && p.name, "Joueur"); });
    return m;
  }
  /* Qui est arrivé / parti depuis la photo précédente (null = pas de photo : rien à annoncer). Soi-même n'est jamais annoncé. */
  function diff(prev, players, myId) {
    if (!prev) return null;
    var now = snapshot(players), joined = [], left = [];
    Object.keys(now).forEach(function (id) { if (id !== myId && !(id in prev)) joined.push(now[id]); });
    Object.keys(prev).forEach(function (id) { if (id !== myId && !(id in now)) left.push(prev[id]); });
    return { joined: joined, left: left };
  }
  function list(names) {
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.slice(0, -1).join(", ") + " et " + names[names.length - 1];
    return names.slice(0, 3).join(", ") + " et " + (names.length - 3) + " autre" + (names.length - 3 > 1 ? "s" : "");
  }
  function describe(d) {
    if (!d) return "";
    var out = [];
    if (d.joined.length) out.push("➕ " + list(d.joined) + (d.joined.length > 1 ? " ont rejoint la salle" : " a rejoint la salle"));
    if (d.left.length) out.push("➖ " + list(d.left) + (d.left.length > 1 ? " sont partis" : " est parti"));
    return out.join(" · ");
  }
  /* Lignes du panneau « joueurs » : classement par score décroissant, égalités = même rang (1, 1, 3). */
  function rows(players, myId) {
    if (!players || typeof players !== "object") return [];
    var r = Object.keys(players).map(function (id) {
      var p = players[id] || {}, sc = Number(p.score);
      return { id: id, name: clean(p.name, "Joueur"), avatar: Array.from(String(p.avatar == null ? "🎮" : p.avatar).replace(CTRL, "")).slice(0, 2).join("") || "🎮", score: isFinite(sc) ? Math.round(sc) : 0, host: p.host === true, team: clean(p.team, ""), me: id === myId };
    });
    r.sort(function (a, b) { return b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
    var rank = 0;
    r.forEach(function (x, i) { if (i === 0 || x.score !== r[i - 1].score) rank = i + 1; x.rank = rank; });
    return r;
  }
  /* Lignes affichées dans le panneau : au plus `limit` (100 par défaut), toujours avec la ligne « moi » ; hidden = joueurs non affichés. */
  function visible(list, limit) {
    var a = Array.isArray(list) ? list : [], n = Math.floor(Number(limit)); if (!isFinite(n) || n < 1) n = 100;
    if (a.length <= n) return { shown: a.slice(), hidden: 0 };
    var shown = a.slice(0, n), me = -1;
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].me) { me = i; break; }
    if (me >= n) shown[n - 1] = a[me];
    return { shown: shown, hidden: a.length - n };
  }
  var api = { visible: visible, MIN_SCALE: MIN_SCALE, MAX_SCALE: MAX_SCALE, cleanPrefs: cleanPrefs, stepScale: stepScale, parsePrefs: parsePrefs, snapshot: snapshot, diff: diff, describe: describe, rows: rows };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof showScreen !== "function") return;
  window.V55 = V55;
  var KEY = "quizV55Prefs";
  var S = window.V55State = { prefs: null, mode: "", prev: null, sig: "" };
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls, fn, label) { var b = mk("button", cls || "", text); b.type = "button"; if (fn) b.addEventListener("click", fn); if (label) { b.setAttribute("aria-label", label); b.title = label; } return b; }
  function activeScreen() { var a = document.querySelector(".screen.active"); return a ? a.id : ""; }
  function toast(t) { try { showBanner(t); } catch (e) {} }
  function systemCalm() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function loadPrefs() { var t = null; try { t = localStorage.getItem(KEY); } catch (e) {} return V55.parsePrefs(t, systemCalm()); }
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(S.prefs)); } catch (e) {} }

  /* ------------------------------------------------------------------ réglages ---------------------------- */
  function applyPrefs() {
    var p = S.prefs, root = document.documentElement;
    root.style.setProperty("--v55-zoom", String(p.scale / 100));
    document.body.classList.toggle("v55-calm", p.calm);
    document.body.classList.toggle("v55-nokeys", !p.keys);
  }
  function setPref(k, v) { S.prefs = V55.cleanPrefs(Object.assign({}, S.prefs, (function () { var o = {}; o[k] = v; return o; })())); savePrefs(); applyPrefs(); }

  /* ------------------------------------------------------------------ panneau commun ---------------------- */
  function panel() {
    var p = $("v55Panel"); if (p) return p;
    p = mk("div", "v55-panel"); p.id = "v55Panel"; p.setAttribute("role", "dialog");
    var head = mk("div", "v55-head"), t = mk("span", "", ""); t.id = "v55Title";
    var x = btn("✕", "v55-x", function () { close(); }, "Fermer"); head.appendChild(t); head.appendChild(x);
    var body = mk("div", "v55-body"); body.id = "v55Body";
    p.appendChild(head); p.appendChild(body); document.body.appendChild(p);
    return p;
  }
  function open(mode) {
    var p = panel();
    if (S.mode === mode && p.classList.contains("open")) { close(); return; }
    S.mode = mode; p.classList.add("open"); p.setAttribute("aria-label", mode === "room" ? "Ma salle" : "Réglages et aide");
    paint(); markDock();
  }
  function close() { var p = $("v55Panel"); if (p) p.classList.remove("open"); S.mode = ""; markDock(); }
  function markDock() { ["room", "set"].forEach(function (m) { var b = $(m === "room" ? "dockRoom" : "dockSet"); if (b) b.classList.toggle("on", S.mode === m && $("v55Panel") && $("v55Panel").classList.contains("open")); }); }
  function paint() { if (!S.mode) return; S.sig = ""; var body = $("v55Body"); if (!body) return; body.textContent = ""; if (S.mode === "room") paintRoom(body); else paintSettings(body); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.mode) close(); });

  /* ------------------------------------------------------------------ 🏠 ma salle ------------------------- */
  function info() {
    try { if (isHost && window.V54UI) return window.V54UI.roomInfo(); } catch (e) {}
    var i = window.V54State && window.V54State.info;
    return i || { name: "Salle " + roomCode, max: 8, count: Object.keys(players).length, locked: false, priv: false };
  }
  function copy(text, ok) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(ok); }, function () { try { window.prompt("Copie ceci :", text); } catch (e) {} });
    else { try { window.prompt("Copie ceci :", text); } catch (e) {} }
  }
  function inviteFor() {
    if (isHost && window.V54UI) return window.V54UI.inviteText();
    var url = ""; try { url = window.QInvite ? window.QInvite.buildUrl(location.href, roomCode) : ""; } catch (e) {}
    return "Rejoins la salle « " + info().name + " » sur Qui suis-je ? — code " + roomCode + (url ? "\n" + url : "");
  }
  function paintRoom(body) {
    $("v55Title").textContent = "🏠 Ma salle";
    var i = info(), V = window.V54Rooms;
    var top = mk("div", "v55-room"); top.appendChild(mk("strong", "", i.name));
    var code = btn("Code " + roomCode + "  📋", "v55-code", function () { copy(roomCode, "✅ Code copié : " + roomCode); }, "Copier le code de la salle"); top.appendChild(code);
    top.appendChild(mk("div", "v55-badges", V ? V.badges(i).join(" · ") : ""));
    body.appendChild(top);
    var started = !!gameStarted, all = V55.rows(players, myId), vis = V55.visible(all, 100), rs = vis.shown, ul = mk("div", "v55-list");
    rs.forEach(function (r) {
      var row = mk("div", "v55-row" + (r.me ? " me" : ""));
      row.appendChild(mk("span", "v55-rank", started ? (r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : String(r.rank)) : r.avatar));
      var nm = mk("span", "v55-name", (started ? r.avatar + " " : "") + r.name + (r.host ? " 👑" : "") + (r.me ? " (toi)" : "")); row.appendChild(nm);
      if (r.team) row.appendChild(mk("span", "v55-tag", "👥 " + r.team));
      if (started) row.appendChild(mk("span", "v55-score", String(r.score)));
      if (isHost && !r.me && !r.host) row.appendChild(btn("🚫", "v55-kick", function () { if (typeof kickPlayer === "function") kickPlayer(r.id); }, "Expulser " + r.name));
      ul.appendChild(row);
    });
    if (vis.hidden > 0) ul.appendChild(mk("div", "v55-more", "… et " + vis.hidden + " autre" + (vis.hidden > 1 ? "s" : "") + " joueur" + (vis.hidden > 1 ? "s" : "") + " (" + all.length + " au total)"));
    body.appendChild(ul);
    var acts = mk("div", "v55-acts");
    acts.appendChild(btn("📋 Inviter", "v55-b", function () { copy(inviteFor(), "✅ Invitation copiée"); }));
    if (isHost && window.V54UI) {
      var U = window.V54UI;
      acts.appendChild(btn(i.locked ? "🔓 Rouvrir l'entrée" : "🔒 Verrouiller", "v55-b", function () { U.toggleLock(); paint(); }));
      var pl = mk("div", "v55-places");
      pl.appendChild(mk("span", "", "Places"));
      pl.appendChild(btn("−", "v55-s", function () { var m = window.V54State.st.max; U.setMax(m === 0 ? Object.keys(players).length : Math.max(1, m - 1)); paint(); }, "Une place de moins"));
      pl.appendChild(mk("b", "", i.max === 0 ? "∞" : String(i.max)));
      pl.appendChild(btn("+", "v55-s", function () { var m = window.V54State.st.max; U.setMax(m === 0 ? 0 : m + 1); paint(); }, "Une place de plus"));
      pl.appendChild(btn("∞", "v55-s" + (i.max === 0 ? " on" : ""), function () { var m = window.V54State.st.max; U.setMax(m === 0 ? Math.max(8, Object.keys(players).length) : 0); paint(); }, "Places illimitées"));
      body.appendChild(pl);
      acts.appendChild(btn("🚪 Fermer la salle", "v55-b v55-danger", function () { close(); openConfirm("Fermer la salle ?", "Tous les joueurs seront renvoyés à l'accueil.", U.closeRoom, "🚪"); }));
    } else {
      acts.appendChild(btn("🚪 Quitter", "v55-b v55-danger", function () { close(); requestLeave(); }));
    }
    body.appendChild(acts);
  }

  /* ------------------------------------------------------------------ ⚙️ réglages & aide ----------------- */
  function toggleRow(label, hint, key) {
    var row = mk("label", "v55-tg"), cb = mk("input"); cb.type = "checkbox"; cb.checked = !!S.prefs[key];
    cb.addEventListener("change", function () { setPref(key, cb.checked); });
    var tx = mk("span", "v55-tgt"); tx.appendChild(mk("b", "", label)); tx.appendChild(mk("small", "", hint));
    row.appendChild(cb); row.appendChild(tx); return row;
  }
  function paintSettings(body) {
    $("v55Title").textContent = "⚙️ Réglages & aide";
    var sec = mk("div", "v55-sec"); sec.appendChild(mk("div", "v55-h", "🔠 Taille du texte"));
    var z = mk("div", "v55-zoom"), val = mk("b", "", S.prefs.scale + " %");
    z.appendChild(btn("A−", "v55-s", function () { setPref("scale", V55.stepScale(S.prefs.scale, -1)); val.textContent = S.prefs.scale + " %"; }, "Texte plus petit"));
    z.appendChild(val);
    z.appendChild(btn("A+", "v55-s", function () { setPref("scale", V55.stepScale(S.prefs.scale, 1)); val.textContent = S.prefs.scale + " %"; }, "Texte plus grand"));
    z.appendChild(btn("100 %", "v55-s", function () { setPref("scale", 100); val.textContent = "100 %"; }, "Taille normale"));
    sec.appendChild(z);
    sec.appendChild(toggleRow("✨ Moins d'animations et de flashs", "Les écrans vert / rouge deviennent un fondu doux ; plus de mouvements rapides.", "calm"));
    sec.appendChild(toggleRow("⌨️ Pastilles de touches (1 2 3 4)", "Petit rappel de la touche sur chaque réponse (déjà masqué sur téléphone).", "keys"));
    sec.appendChild(toggleRow("🔔 Annonces d'arrivée et de départ", "« ➕ Bob a rejoint la salle » / « ➖ Bob est parti ».", "notify"));
    body.appendChild(sec);
    var help = mk("div", "v55-sec"); help.appendChild(mk("div", "v55-h", "❓ Aide"));
    var ul = mk("ul", "v55-help");
    var dock = $("dock");
    if (dock) Array.prototype.forEach.call(dock.querySelectorAll("button"), function (b) {
      if (b.style.display === "none") return;
      var emoji = Array.prototype.filter.call(b.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join("").trim();
      var label = b.title || b.getAttribute("aria-label") || ""; if (!emoji || !label) return;
      var li = mk("li", ""); li.appendChild(mk("b", "", emoji + " ")); li.appendChild(document.createTextNode(label)); ul.appendChild(li);
    });
    [["1 2 3 4 ou A B C D", "répondre pendant la partie"], ["Échap", "fermer un panneau"]].forEach(function (k) { var li = mk("li", ""); li.appendChild(mk("kbd", "", k[0])); li.appendChild(document.createTextNode(" " + k[1])); ul.appendChild(li); });
    help.appendChild(ul); body.appendChild(help);
    body.appendChild(btn("↺ Réinitialiser les réglages", "v55-b", function () { S.prefs = V55.cleanPrefs({}, systemCalm()); savePrefs(); applyPrefs(); paint(); }));
  }

  /* ------------------------------------------------------------------ boutons du dock --------------------- */
  function dockButton(id, label, title, fn) {
    var dock = $("dock"); if (!dock) return null;
    var b = $(id); if (b) return b;
    b = mk("button", "", label); b.id = id; b.type = "button"; b.title = title; b.setAttribute("aria-label", title); b.addEventListener("click", fn);
    dock.insertBefore(b, dock.firstChild); return b;
  }

  /* ------------------------------------------------------------------ annonces arrivée / départ ----------- */
  function announce() {
    if (!roomCode || activeScreen() === "homeScreen") { S.prev = null; return; }
    var d = V55.diff(S.prev, players, myId);
    S.prev = V55.snapshot(players);
    if (!d || !S.prefs.notify) return;
    var t = V55.describe(d); if (t) toast(t);
  }

  function tick() {
    try {
      var inRoom = !!roomCode && activeScreen() !== "homeScreen";
      var r = dockButton("dockRoom", "🏠", "Ma salle : joueurs, places, invitation", function () { open("room"); });
      dockButton("dockSet", "⚙️", "Réglages et aide", function () { open("set"); });
      if (r) r.style.display = inRoom ? "" : "none";
      if (!inRoom && S.mode === "room") close();
      announce();
      if (S.mode === "room") {
        /* on ne reconstruit le panneau que si son contenu change (sinon un clic peut tomber sur un bouton remplacé) */
        var all = V55.rows(players, myId), v = V55.visible(all, 100), sig = JSON.stringify([info(), v.shown, v.hidden, !!gameStarted, !!isHost]);
        if (sig !== S.sig) { S.sig = sig; paint(); }
      }
    } catch (e) {}
  }

  S.prefs = loadPrefs(); applyPrefs();
  setInterval(tick, 1000); document.addEventListener("DOMContentLoaded", tick); tick();
  window.V55UI = { open: open, close: close, applyPrefs: applyPrefs, setPref: setPref };
})();
