/* =============================================================================
   V54 — Salles : nom, mot de passe, places, verrouillage, fermeture, infos pour les invités,
   réouverture de la dernière salle — et correctifs réseau :
   • un joueur refusé (salle pleine, partie commencée, mauvais mot de passe…) est vraiment déconnecté
     (avant : il restait connecté, recevait les écrans de jeu et pouvait « prendre » une place libérée) ;
   • l'identité d'un invité vient de SA connexion, jamais du message (avant : n'importe quel invité pouvait
     répondre, écrire ou choisir un pouvoir au nom d'un autre joueur, se déclarer hôte ou « règles acceptées ») ;
   • si l'hôte disparaît en pleine partie, les invités voient un message clair au lieu de rester bloqués ;
   • délai de connexion : « l'hôte ne répond pas » au lieu d'attendre indéfiniment.
   V54Rooms est pur (testable avec Node : tests/rooms.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V54Rooms = (function () {
  "use strict";
  var MAX_NAME = 24, MIN_PASS = 4, MAX_PASS = 16, MIN_PLAYERS = 2, MAX_PLAYERS = 8;
  var FAIL_WINDOW = 60000, FAIL_LIMIT = 6, LAST_TTL = 3 * 3600 * 1000;
  var CTRL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
  var RESERVED = { "__proto__": 1, "constructor": 1, "prototype": 1, "tostring": 1, "valueof": 1, "hasownproperty": 1 };
  var REASONS = ["id", "closed", "started", "locked", "full", "throttle", "password", "badpass", "name", "unknown", "dup"];
  var TEXT = {
    id: "Identifiant de connexion invalide.",
    closed: "Cette salle est fermée.",
    started: "La partie a déjà commencé.",
    locked: "🔒 L'hôte a verrouillé la salle : plus personne ne peut entrer.",
    full: "La salle est pleine.",
    throttle: "Trop de mots de passe erronés. Réessaie dans un instant.",
    password: "🔒 Salle privée : entre le mot de passe.",
    badpass: "Mot de passe incorrect.",
    name: "Pseudo refusé.",
    unknown: "Impossible de rejoindre la salle."
  };

  function str(v) { return v == null ? "" : String(v); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function cut(s, n) { var a = Array.from(s); return a.length > n ? a.slice(0, n).join("").trim() : s; }

  /* Nom de salle : sans caractères de contrôle ni de sens de lecture (« RLO »), espaces compactés, 24 caractères max. */
  function cleanName(raw, fallback) {
    var s = cut(str(raw).replace(CTRL, "").replace(/\s+/g, " ").trim(), MAX_NAME);
    return s || str(fallback);
  }
  /* Mot de passe : vide = salle publique ; sinon 4 à 16 caractères. */
  function checkPass(raw) {
    var s = str(raw).replace(CTRL, "").trim();
    if (!s) return { ok: true, pass: "" };
    var n = Array.from(s).length;
    if (n < MIN_PASS || n > MAX_PASS) return { ok: false, error: "Mot de passe : " + MIN_PASS + " à " + MAX_PASS + " caractères." };
    return { ok: true, pass: s };
  }
  /* Nombre de places (hôte compris) : 2 à 8, jamais en dessous du nombre de joueurs déjà présents. */
  function clampMax(n, count) {
    n = Math.floor(Number(n)); if (!isFinite(n)) n = MAX_PLAYERS;
    var c = Math.floor(Number(count)); if (!isFinite(c) || c < 0) c = 0;
    return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n, c));
  }
  /* Comparaison sans arrêt au premier caractère différent. */
  function safeEq(a, b) {
    a = str(a); b = str(b);
    var d = a.length ^ b.length, n = Math.max(a.length, b.length);
    for (var i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return d === 0;
  }
  function validId(id) {
    return typeof id === "string" && id.length > 0 && id.length <= 80 && !has(RESERVED, id.toLowerCase()) && id.toLowerCase().indexOf("__proto__") < 0;
  }
  function newState() { return { name: "", max: MAX_PLAYERS, pass: "", locked: false, closed: false, fails: [] }; }
  function recentFails(st, now) { st.fails = st.fails.filter(function (t) { return now - t >= 0 && now - t < FAIL_WINDOW; }); return st.fails.length; }
  function retryIn(st, now) {
    if (recentFails(st, now) < FAIL_LIMIT) return 0;
    return Math.max(1, Math.ceil((FAIL_WINDOW - (now - st.fails[0])) / 1000));
  }
  function info(st, count, fallbackName) {
    return { name: cleanName(st.name, fallbackName || "Salle"), max: st.max, count: Math.max(0, Math.floor(Number(count)) || 0), locked: !!st.locked, priv: !!st.pass };
  }
  function refuse(reason, extra) {
    var r = { ok: false, reason: reason, message: TEXT[reason] || TEXT.unknown };
    if (extra && extra.message) r.message = str(extra.message).replace(CTRL, "").slice(0, 140) || r.message;
    if (extra && extra.wait) r.message = "Trop de mots de passe erronés. Réessaie dans " + extra.wait + " s.";
    return r;
  }
  /* Décision pour une demande « join ». ctx = { peer, count, started, present, pass, nameCheck, now }.
     Le mot de passe n'est comparé qu'ici ; un essai faux est compté, 6 essais faux en 60 s bloquent les essais suivants. */
  function decideJoin(st, ctx) {
    var now = ctx.now == null ? Date.now() : ctx.now;
    if (!validId(ctx.peer)) return refuse("id");
    if (ctx.present) return { ok: false, reason: "dup", silent: true };
    if (st.closed) return refuse("closed");
    if (ctx.started) return refuse("started");
    if (st.locked) return refuse("locked");
    if (ctx.count >= Math.min(MAX_PLAYERS, Number(st.max) || MAX_PLAYERS)) return refuse("full");
    if (st.pass) {
      var wait = retryIn(st, now);
      if (wait > 0) return refuse("throttle", { wait: wait });
      var given = ctx.pass;
      /* Seul un texte est un mot de passe : 12345 (nombre) ou ["abc"] (liste) ne passent jamais, même si leur écriture est identique. */
      if (typeof given !== "string") {
        if (given != null) st.fails.push(now);
        return refuse(given == null ? "password" : "badpass");
      }
      if (!safeEq(given, st.pass)) {
        if (given !== "") st.fails.push(now);
        return refuse(given === "" ? "password" : "badpass");
      }
    }
    if (ctx.nameCheck && ctx.nameCheck.ok === false) return refuse("name", { message: ctx.nameCheck.error });
    return { ok: true };
  }
  function sanitizeRefuse(raw) {
    var o = raw && typeof raw === "object" ? raw : {};
    var reason = REASONS.indexOf(o.reason) >= 0 && o.reason !== "dup" ? o.reason : "unknown";
    var msg = str(o.message).replace(CTRL, "").trim().slice(0, 140) || TEXT[reason];
    return { reason: reason, message: msg, priv: o.priv === true };
  }
  function sanitizeInfo(raw) {
    if (!raw || typeof raw !== "object") return null;
    var max = Math.floor(Number(raw.max)), count = Math.floor(Number(raw.count));
    if (!isFinite(max)) max = MAX_PLAYERS;
    if (!isFinite(count)) count = 0;
    max = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, max));
    return { name: cleanName(raw.name, "Salle"), max: max, count: Math.min(MAX_PLAYERS, Math.max(0, count)), locked: raw.locked === true, priv: raw.priv === true };
  }
  function badges(i) {
    if (!i) return [];
    var b = ["👥 " + i.count + "/" + i.max];
    b.push(i.priv ? "🔒 privée" : "🌐 publique");
    if (i.locked) b.push("⛔ verrouillée");
    else if (i.count >= i.max) b.push("🈵 complète");
    return b;
  }
  /* Dernière salle de l'hôte (pour la rouvrir au même code) : jamais le mot de passe. */
  function packLast(o, now) {
    if (!o || !/^\d{6}$/.test(str(o.code))) return null;
    return { code: str(o.code), name: cleanName(o.name, ""), max: clampMax(o.max, 1), host: str(o.host).replace(CTRL, "").trim().slice(0, 12), at: now == null ? Date.now() : now };
  }
  function readLast(raw, now) {
    var o; try { o = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return null; }
    if (!o || typeof o !== "object" || !/^\d{6}$/.test(str(o.code))) return null;
    now = now == null ? Date.now() : now;
    var at = Number(o.at); if (!isFinite(at) || now - at > LAST_TTL || now - at < -60000) return null;
    return { code: str(o.code), name: cleanName(o.name, ""), max: clampMax(o.max, 1), host: str(o.host).replace(CTRL, "").trim().slice(0, 12), at: at };
  }
  var api = {
    MAX_NAME: MAX_NAME, MIN_PASS: MIN_PASS, MAX_PASS: MAX_PASS, MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS, FAIL_LIMIT: FAIL_LIMIT, FAIL_WINDOW: FAIL_WINDOW, LAST_TTL: LAST_TTL,
    cleanName: cleanName, checkPass: checkPass, clampMax: clampMax, safeEq: safeEq, validId: validId, newState: newState,
    recentFails: recentFails, retryIn: retryIn, info: info, decideJoin: decideJoin, sanitizeRefuse: sanitizeRefuse, sanitizeInfo: sanitizeInfo,
    badges: badges, packLast: packLast, readLast: readLast
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof setupConnection !== "function") return;
  window.V54Rooms = V54Rooms;
  var R = V54Rooms;
  var S = window.V54State = { st: R.newState(), conn: null, pass: "", joinT: 0, refused: false, closing: false, gone: false, info: null, sig: "", forceCode: "", presets: null, savedSig: "" };
  var LAST_KEY = "quizV54Last";
  function $(id) { return document.getElementById(id); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function activeScreen() { var a = document.querySelector(".screen.active"); return a ? a.id : ""; }
  function count() { return Object.keys(players).length; }
  function roomInfo() { return R.info(S.st, count(), "Salle de " + (myName || "l'hôte")); }
  function safeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function safeLoad(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function badText(s) {
    try { if (window.Moderation && window.Moderation.check) { var v = window.Moderation.check(s); if (v && v.blocked) return true; } } catch (e) {}
    try { if (typeof profanityCheck === "function") { var c = profanityCheck(s); if (c && typeof c.clean === "string" && c.clean !== s) return true; } } catch (e) {}
    return false;
  }

  /* ------------------------------------------------------------------ côté hôte : connexions ------------- */
  var baseSetup = setupConnection;
  setupConnection = function (connection) {
    try {
      if (isHost) {
        var peerId = String(connection.peer);
        /* L'identité vient de la connexion : tout « playerId » reçu d'un invité est remplacé, quoi qu'il annonce. */
        connection.on("data", function (d) {
          if (d && typeof d === "object") { d.__from = peerId; if (has(d, "playerId")) d.playerId = peerId; }
        });
        /* Une connexion qui n'envoie jamais de « join » ne doit pas rester là à recevoir toutes les diffusions. */
        setTimeout(function () {
          if (isHost && connections[peerId] === connection && !has(players, peerId)) {
            delete connections[peerId];
            try { connection.close(); } catch (e) {}
          }
        }, 8000);
      } else {
        S.conn = connection;
        var rawSend = connection.send;
        connection.send = function (d) {
          if (d && typeof d === "object" && d.type === "join" && S.pass) d = Object.assign({}, d, { pass: S.pass });
          return rawSend.call(connection, d);
        };
        connection.on("close", function () {
          if (isHost || S.closing || S.refused || S.gone || kicked || !peer) return;
          if (!gameStarted) return;
          if (activeScreen() === "resultsScreen") { try { showBanner("🚪 L'hôte a quitté la salle."); } catch (e) {} return; }
          showGone("🚪 L'hôte a quitté la partie.");
        });
      }
    } catch (e) {}
    return baseSetup(connection);
  };

  function refuse(peerId, dec) {
    var c = connections[peerId];
    var msg = { type: "v54Refuse", reason: dec.reason, message: dec.message, priv: !!S.st.pass };
    try { if (c && c.open) c.send(msg); } catch (e) {}
    if (c) delete connections[peerId];
    setTimeout(function () { try { if (c) c.close(); } catch (e) {} }, 250);
  }

  function hostJoin(data, baseHandle) {
    var pl = data.player;
    var from = typeof data.__from === "string" ? data.__from : (pl && typeof pl.id === "string" ? pl.id : "");
    if (!pl || typeof pl !== "object" || !from) return;
    var nc; try { nc = validatePlayerName(str(pl.name)); } catch (e) { nc = { ok: true }; }
    var dec = R.decideJoin(S.st, { peer: from, count: count(), started: !!gameStarted, present: has(players, from), pass: data.pass, nameCheck: nc, now: Date.now() });
    if (!dec.ok) { if (!dec.silent) refuse(from, dec); return; }
    /* Fiche joueur reconstruite par l'hôte : l'invité ne peut ni se déclarer hôte, ni « règles acceptées », ni choisir son score. */
    var fresh = createPlayer(from, str(pl.name), false);
    data.player = fresh; delete data.pass;
    baseHandle(data);
    if (!has(players, from)) { refuse(from, { reason: "unknown", message: "Impossible de rejoindre la salle." }); return; }
    sendTo(from, { type: "v54Info", info: roomInfo() });
    syncInfo(true);
  }
  function str(v) { return v == null ? "" : String(v); }

  function syncInfo(force) {
    if (!isHost || !roomCode) return;
    var i = roomInfo(), sig = JSON.stringify(i);
    if (!force && sig === S.sig) return;
    S.sig = sig; S.info = i;
    broadcast({ type: "v54Info", info: i });
    paintHost();
  }

  /* ------------------------------------------------------------------ messages reçus --------------------- */
  var baseHandle = handleData;
  handleData = function (data) {
    if (!data || typeof data !== "object") return baseHandle(data);
    var t = data.type;
    if (isHost) {
      if (t === "join") return hostJoin(data, baseHandle);
      return baseHandle(data);
    }
    if (t === "v54Refuse") return onRefuse(data);
    if (t === "v54Info") return onInfo(data);
    if (t === "v54Closed") return onClosed(data);
    if (t === "v54Reopen") return onReopen();
    if (t === "error" && typeof data.message === "string" && !has(players, myId)) return onRefuse({ reason: "unknown", message: data.message });
    return baseHandle(data);
  };

  function detach() {
    var c = S.conn; if (!c) return;
    try { if (c.removeAllListeners) { c.removeAllListeners("close"); c.removeAllListeners("data"); } } catch (e) {}
  }
  function leaveHome(msg, type) {
    S.closing = true;
    try { detach(); resetConnection(); showScreen("homeScreen"); showMessage("homeMessage", msg, type || "error"); } finally { S.closing = false; }
    setTimeout(function () { if (!isHost && !peer && activeScreen() === "homeScreen") showMessage("homeMessage", msg, type || "error"); }, 450);
  }
  function onRefuse(raw) {
    var r = R.sanitizeRefuse(raw);
    S.refused = true; clearTimeout(S.joinT);
    if (r.reason !== "password" && r.reason !== "badpass") S.pass = "";
    leaveHome(r.message);
    if (r.reason === "password" || r.reason === "badpass" || r.reason === "throttle") openPass(true);
  }
  function onInfo(raw) {
    var i = R.sanitizeInfo(raw && raw.info); if (!i) return;
    clearTimeout(S.joinT); S.pass = ""; var p = $("joinPass"); if (p) p.value = "";
    S.info = i; paintGuest();
  }
  function onClosed(raw) {
    var msg = str(raw && raw.message).replace(/[\u0000-\u001f]/g, "").slice(0, 140) || "L'hôte a fermé la salle.";
    S.gone = true;
    if (gameStarted && activeScreen() !== "resultsScreen" && activeScreen() !== "homeScreen") { showGone("🚪 " + msg); return; }
    leaveHome(msg);
  }
  function onReopen() {
    if (isHost) return;
    var s = activeScreen();
    if (s === "resultsScreen" && typeof window.replayV9 === "function") { gameStarted = false; window.replayV9(); try { showBanner("🔄 L'hôte relance une partie."); } catch (e) {} }
  }

  /* ------------------------------------------------------------------ côté invité : rejoindre ------------- */
  var baseJoin = joinRoom;
  joinRoom = function () {
    var f = $("joinPass");
    S.pass = f ? str(f.value).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 32) : "";
    S.refused = false; S.gone = false; S.info = null;
    var before = peer;
    var r = baseJoin.apply(this, arguments);
    if (!isHost && peer && peer !== before) {
      clearTimeout(S.joinT);
      S.joinT = setTimeout(function () {
        if (!isHost && peer && !has(players, myId) && !S.refused && activeScreen() === "homeScreen") leaveHome("L'hôte ne répond pas. Vérifie le code et réessaie.");
      }, 15000);
      try { peer.on("error", function () { clearTimeout(S.joinT); }); } catch (e) {}
    }
    return r;
  };

  var baseReset = resetConnection;
  resetConnection = function () {
    S.closing = true;
    try { return baseReset.apply(this, arguments); }
    finally {
      S.closing = false; clearTimeout(S.joinT); S.pass = ""; S.conn = null; S.info = null; S.sig = ""; S.savedSig = "";
      var g = $("v54Gone"); if (g) g.style.display = "none";
      var card = $("v54Room"); if (card && card.parentNode) card.parentNode.removeChild(card);
      paintGuest();
    }
  };

  var baseRandom = randomCode;
  randomCode = function () {
    if (S.forceCode) { var c = S.forceCode; S.forceCode = ""; return c; }
    return baseRandom.apply(this, arguments);
  };

  var baseCreate = createRoom;
  createRoom = function () {
    S.st = R.newState(); S.info = null; S.sig = ""; S.gone = false; S.refused = false;
    var oldCard = $("v54Room"); if (oldCard && oldCard.parentNode) oldCard.parentNode.removeChild(oldCard);
    var pre = S.presets; S.presets = null;
    if (pre) { S.st.name = R.cleanName(pre.name, ""); S.st.max = R.clampMax(pre.max, 1); }
    try { return baseCreate.apply(this, arguments); }
    finally {
      S.forceCode = "";
      try { if (isHost && peer) peer.on("error", function (e) { if (e && e.type === "unavailable-id") showMessage("homeMessage", "Ce code de salle est encore occupé : réessaie dans quelques secondes."); }); } catch (e) {}
    }
  };

  if (typeof window.replayV9 === "function") {
    var baseReplay = window.replayV9;
    window.replayV9 = function () {
      var r = baseReplay.apply(this, arguments);
      try { if (isHost) broadcast({ type: "v54Reopen" }); } catch (e) {}
      return r;
    };
  }

  /* ------------------------------------------------------------------ fermeture de la salle -------------- */
  function closeRoom() {
    if (!isHost) return;
    S.st.closed = true;
    try { broadcast({ type: "v54Closed", message: "L'hôte a fermé la salle." }); } catch (e) {}
    setTimeout(function () {
      S.closing = true;
      try { resetConnection(); showScreen("homeScreen"); showMessage("homeMessage", "Salle fermée.", "success"); } finally { S.closing = false; }
    }, 300);
  }
  function showGone(text) {
    S.gone = true;
    try { clearInterval(timer); } catch (e) {}
    var g = $("v54Gone");
    if (!g) {
      g = mk("div", "v54-gone"); g.id = "v54Gone"; g.setAttribute("role", "alertdialog");
      var box = mk("div", "v54-gone-box"), t = mk("div", "v54-gone-t"); t.id = "v54GoneT";
      var sub = mk("div", "v54-gone-s", "La partie ne peut pas continuer sans l'hôte."), b = mk("button", "btn btn-primary", "🏠 Retour à l'accueil"); b.type = "button";
      b.addEventListener("click", function () { g.style.display = "none"; S.closing = true; try { resetConnection(); showScreen("homeScreen"); } finally { S.closing = false; } });
      box.appendChild(t); box.appendChild(sub); box.appendChild(b); g.appendChild(box); document.body.appendChild(g);
    }
    $("v54GoneT").textContent = text; g.style.display = "flex";
  }

  /* ------------------------------------------------------------------ interface hôte --------------------- */
  function say(text, ok) { var m = $("v54Msg"); if (!m) return; m.textContent = text || ""; m.className = "v54-msg" + (ok ? " ok" : ""); clearTimeout(say.t); if (text) say.t = setTimeout(function () { m.textContent = ""; }, 4500); }
  function mountHost() {
    if (!isHost || $("v54Room")) return;
    var list = $("playersList"); if (!list || !list.parentNode) return;
    var anchor = list.previousElementSibling && list.previousElementSibling.tagName === "H3" ? list.previousElementSibling : list;
    var card = mk("div", "v54-card"); card.id = "v54Room";
    var head = mk("div", "v54-head"), title = mk("strong", "", "🏠 Ma salle"), bad = mk("span", "v54-badges"); bad.id = "v54Badges";
    head.appendChild(title); head.appendChild(bad);
    var grid = mk("div", "v54-grid");
    function field(label, el) { var l = mk("label", "v54-field"); l.appendChild(mk("span", "", label)); l.appendChild(el); return l; }
    var name = mk("input", "input"); name.id = "v54Name"; name.maxLength = R.MAX_NAME; name.autocomplete = "off"; name.placeholder = "Salle de " + (myName || "…"); name.value = S.st.name;
    var max = mk("select", "select"); max.id = "v54Max";
    for (var n = R.MIN_PLAYERS; n <= R.MAX_PLAYERS; n++) { var op = mk("option", "", n + " joueurs"); op.value = String(n); max.appendChild(op); }
    max.value = String(S.st.max);
    var pw = mk("span", "v54-pw"), pass = mk("input", "input"), eye = mk("button", "v54-eye", "👁");
    pass.id = "v54Pass"; pass.type = "password"; pass.maxLength = R.MAX_PASS; pass.autocomplete = "new-password"; pass.placeholder = "Aucun : salle publique"; pass.value = S.st.pass;
    eye.type = "button"; eye.setAttribute("aria-label", "Afficher ou masquer le mot de passe");
    eye.addEventListener("click", function () { pass.type = pass.type === "password" ? "text" : "password"; });
    pw.appendChild(eye); pw.appendChild(pass);
    grid.appendChild(field("Nom de la salle", name)); grid.appendChild(field("Places (hôte compris)", max)); grid.appendChild(field("Mot de passe (facultatif)", pw));
    var msg = mk("div", "v54-msg"); msg.id = "v54Msg"; msg.setAttribute("role", "status");
    var acts = mk("div", "v54-actions");
    var lock = mk("button", "btn btn-secondary v54-act", "🔒 Verrouiller l'entrée"), copy = mk("button", "btn btn-secondary v54-act", "📋 Copier l'invitation"), close = mk("button", "btn btn-secondary v54-act v54-danger", "🚪 Fermer la salle");
    lock.id = "v54Lock"; copy.id = "v54Copy"; close.id = "v54Close"; lock.type = copy.type = close.type = "button";
    acts.appendChild(lock); acts.appendChild(copy); acts.appendChild(close);
    card.appendChild(head); card.appendChild(grid); card.appendChild(msg); card.appendChild(acts);
    anchor.parentNode.insertBefore(card, anchor);
    name.addEventListener("change", applyName); name.addEventListener("keydown", function (e) { if (e.key === "Enter") applyName(); });
    max.addEventListener("change", applyMax);
    pass.addEventListener("change", applyPass); pass.addEventListener("keydown", function (e) { if (e.key === "Enter") applyPass(); });
    lock.addEventListener("click", function () { S.st.locked = !S.st.locked; say(S.st.locked ? "⛔ Entrée verrouillée : personne d'autre ne peut rejoindre." : "🔓 Entrée rouverte.", true); syncInfo(true); });
    copy.addEventListener("click", copyInvite);
    close.addEventListener("click", function () { openConfirm("Fermer la salle ?", "Tous les joueurs seront renvoyés à l'accueil.", closeRoom, "🚪"); });
    paintHost();
  }
  function applyName() {
    var f = $("v54Name"); if (!f) return;
    var v = R.cleanName(f.value, "");
    if (v && badText(v)) { say("🚫 Ce nom de salle n'est pas autorisé.", false); f.value = S.st.name; return; }
    S.st.name = v; f.value = v; say(v ? "✅ Nom de la salle : " + v : "Nom par défaut rétabli.", true); syncInfo(true);
  }
  function applyMax() {
    var f = $("v54Max"); if (!f) return;
    var want = Number(f.value), v = R.clampMax(want, count());
    S.st.max = v; f.value = String(v);
    say(v !== want ? "Il y a déjà " + count() + " joueurs : places portées à " + v + "." : "✅ " + v + " places.", true); syncInfo(true);
  }
  function applyPass() {
    var f = $("v54Pass"); if (!f) return;
    var c = R.checkPass(f.value);
    if (!c.ok) { say(c.error, false); f.value = S.st.pass; return; }
    S.st.pass = c.pass; f.value = c.pass; S.st.fails = [];
    say(c.pass ? "🔒 Salle privée : le mot de passe est demandé à l'entrée." : "🌐 Salle publique.", true); syncInfo(true);
  }
  function inviteText() {
    var i = roomInfo(), url = ""; try { url = window.QInvite ? window.QInvite.buildUrl(location.href, roomCode) : ""; } catch (e) {}
    var t = "Rejoins ma salle « " + i.name + " » sur Qui suis-je ? — code " + roomCode;
    if (S.st.pass) t += "\nMot de passe : " + S.st.pass;
    if (url) t += "\n" + url;
    return t;
  }
  function copyInvite() {
    var t = inviteText();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { say("✅ Invitation copiée" + (S.st.pass ? " (avec le mot de passe)." : "."), true); }, function () { try { window.prompt("Copie cette invitation :", t); } catch (e) {} });
    else { try { window.prompt("Copie cette invitation :", t); } catch (e) {} }
  }
  function paintHost() {
    var b = $("v54Badges"); if (!b || !isHost) return;
    var i = roomInfo(); b.textContent = R.badges(i).join(" · ");
    var lock = $("v54Lock"); if (lock) lock.textContent = S.st.locked ? "🔓 Rouvrir l'entrée" : "🔒 Verrouiller l'entrée";
    var mx = $("v54Max"); if (mx) { Array.prototype.forEach.call(mx.options, function (o) { o.disabled = Number(o.value) < count(); }); if (document.activeElement !== mx) mx.value = String(S.st.max); }
  }

  /* ------------------------------------------------------------------ interface invité ------------------- */
  function mountJoin() {
    if ($("v54PassBox")) return;
    var code = $("roomInput"); if (!code || !code.parentNode) return;
    var box = mk("div", "v54-passbox"); box.id = "v54PassBox";
    var tog = mk("button", "v54-link", "🔒 Salle privée ? Entrer le mot de passe"); tog.type = "button"; tog.id = "v54PassToggle";
    var inp = mk("input", "input"); inp.id = "joinPass"; inp.type = "password"; inp.maxLength = 32; inp.autocomplete = "off"; inp.placeholder = "Mot de passe de la salle"; inp.style.display = "none";
    tog.addEventListener("click", function () { openPass(inp.style.display === "none"); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") joinRoom(); });
    box.appendChild(tog); box.appendChild(inp);
    code.parentNode.insertBefore(box, code.nextSibling);
  }
  function openPass(show) {
    mountJoin();
    var inp = $("joinPass"), tog = $("v54PassToggle"); if (!inp) return;
    inp.style.display = show ? "" : "none";
    if (tog) tog.textContent = show ? "🔓 Pas de mot de passe" : "🔒 Salle privée ? Entrer le mot de passe";
    if (show) { try { inp.focus(); inp.select(); } catch (e) {} } else inp.value = "";
  }
  function mountGuestInfo() {
    if ($("v54Info")) return;
    var code = $("waitingCode"); if (!code || !code.parentNode) return;
    var el = mk("div", "v54-info"); el.id = "v54Info"; el.hidden = true;
    code.parentNode.insertBefore(el, code.nextSibling);
  }
  function paintGuest() {
    var el = $("v54Info"); if (!el) return;
    var i = S.info;
    if (isHost || !i) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false; el.textContent = "";
    var n = mk("strong", "", "🏠 " + i.name), b = mk("span", "v54-badges", R.badges(i).join(" · "));
    el.appendChild(n); el.appendChild(b);
  }

  /* ------------------------------------------------------------------ rouvrir ma dernière salle ----------- */
  function saveLast() {
    if (!isHost || !roomCode || !/^\d{6}$/.test(roomCode)) return;
    var sig = roomCode + "|" + S.st.name + "|" + S.st.max + "|" + myName;
    if (sig === S.savedSig) return; S.savedSig = sig;
    var p = R.packLast({ code: roomCode, name: S.st.name, max: S.st.max, host: myName }, Date.now());
    if (p) safeStore(LAST_KEY, JSON.stringify(p));
  }
  function paintReopen() {
    var btn = $("v54Reopen");
    var last = (!isHost && !peer && activeScreen() === "homeScreen") ? R.readLast(safeLoad(LAST_KEY), Date.now()) : null;
    if (!last) { if (btn) btn.hidden = true; return; }
    if (!btn) {
      var create = document.querySelector('button[onclick="createRoom()"]'); if (!create || !create.parentNode) return;
      btn = mk("button", "btn btn-secondary v54-reopen"); btn.id = "v54Reopen"; btn.type = "button";
      btn.addEventListener("click", function () {
        var l = R.readLast(safeLoad(LAST_KEY), Date.now()); if (!l) { btn.hidden = true; return; }
        var h = $("hostName"); if (h && !h.value.trim() && l.host) h.value = l.host;
        S.forceCode = l.code; S.presets = { name: l.name, max: l.max };
        createRoom();
      });
      create.parentNode.insertBefore(btn, create.nextSibling);
    }
    btn.hidden = false; btn.textContent = "↩️ Rouvrir ma salle " + last.code + (last.name ? " (« " + last.name + " »)" : "");
  }

  /* ------------------------------------------------------------------ règles : visibles et auto-réparées -- */
  /* Les invités voient qui a accepté (« 2/3 ont accepté »), et si l'hôte a perdu l'acceptation d'un joueur
     (reconnexion, fiche recréée), le joueur la renvoie tout seul au lieu de rester bloqué sans comprendre. */
  var baseClean = cleanPlayers;
  cleanPlayers = function () {
    var out = baseClean();
    Object.keys(out).forEach(function (id) { var p = players[id]; if (p) out[id].rulesOk = p.rulesOk === true; });
    return out;
  };
  function rulesHeal() {
    if (!window.rulesOk || !myId || !has(players, myId)) return;
    var me = players[myId];
    if (isHost) { if (me.rulesOk !== true) { me.rulesOk = true; try { broadcastPlayers(); } catch (e) {} } return; }
    if (me.rulesOk === false && Date.now() - (S.healAt || 0) > 3000) {
      S.healAt = Date.now();
      var c = S.conn && S.conn.open ? S.conn : Object.values(connections)[0];
      try { if (c && c.open) c.send({ type: "rulesAccepted", playerId: myId }); } catch (e) {}
    }
  }

  /* ------------------------------------------------------------------ boucle d'entretien ----------------- */
  function tick() {
    try {
      mountJoin(); mountGuestInfo(); rulesHeal();
      if (isHost && roomCode) { mountHost(); syncInfo(false); saveLast(); }
      else { paintGuest(); }
      paintReopen();
    } catch (e) {}
  }
  setInterval(tick, 700);
  document.addEventListener("DOMContentLoaded", tick);
  tick();

  window.V54UI = { closeRoom: closeRoom, applyName: applyName, applyMax: applyMax, applyPass: applyPass, showGone: showGone, roomInfo: roomInfo, syncInfo: syncInfo, inviteText: inviteText };
})();
