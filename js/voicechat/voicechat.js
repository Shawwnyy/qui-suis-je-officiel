/* =============================================================================
   V50 — Chat vocal à plusieurs (WebRTC pair à pair, via PeerJS) — rien à installer, aucun serveur à toi

   Comment ça marche
   • Chaque joueur qui clique « Rejoindre le vocal » autorise son micro (ou écoute seulement s'il refuse).
   • L'hôte tient l'annuaire des participants au vocal et le diffuse (« vcState ») : il sert de standard téléphonique.
   • Les participants se relient en MAILLAGE : chacun appelle chacun avec peer.call() de PeerJS.
     Règle anti-doublon : pour une paire de joueurs, c'est celui dont l'identifiant est le plus petit qui appelle.
   • L'audio passe directement d'un appareil à l'autre (WebRTC). PeerJS ne sert qu'à la mise en relation
     (serveur public gratuit de PeerJS, déjà utilisé par le jeu) — aucun serveur n'est à installer ni à payer.
   • Limite : 8 joueurs par salle (celle du jeu) ; avec un casque, pas d'écho.

   La logique (createController, plan, cleanMembers) ne touche ni au DOM ni au réseau : testable avec Node (tests/voicechat.test.js).
   ============================================================================= */
var V50Voice = (function () {
  "use strict";
  var ID_RE = /^[\w-]{1,64}$/, MAX_MEMBERS = 8, MAX_TRIES = 12, TICK_MS = 3000;

  /* Liste d'identifiants propre : chaînes valides, sans doublon, connues de la salle (si `known` est fourni), 8 au plus. */
  function cleanMembers(list, known) {
    var out = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (id) {
      if (typeof id !== "string" || !ID_RE.test(id) || seen[id]) return;
      if (known && !known[id]) return;
      seen[id] = 1; out.push(id);
    });
    return out.slice(0, MAX_MEMBERS);
  }
  /* Qui appelle qui. `me` : mon identifiant ; `members` : participants au vocal ; `live` : identifiants avec qui un appel existe déjà.
     call → à appeler maintenant (le plus petit identifiant de la paire appelle) ; drop → appels à fermer (plus au vocal). */
  function plan(me, members, live) {
    var inSet = {}, call = [], drop = [];
    members.forEach(function (m) { inSet[m] = 1; });
    if (inSet[me]) members.forEach(function (m) { if (m !== me && me < m && live.indexOf(m) < 0) call.push(m); });
    live.forEach(function (id) { if (!inSet[id]) drop.push(id); });
    return { call: call, drop: drop };
  }

  /* env : { myId(), isHost(), inRoom(), players(), getPeer(), sendToHost(d), sendTo(id,d), broadcast(d),
             getMicrophone() → Promise<{stream, mic, reason}>, playRemote(id,stream), stopRemote(id), stopAll(), setDeaf(b), onChange(snapshot) } */
  function createController(env) {
    var st = { joined: false, busy: false, muted: false, deaf: false, listenOnly: false, error: "", members: [] };
    var local = null, mic = null, calls = {}, streams = {}, attempts = {}, hostSet = {}, ticker = null;

    function snapshot() {
      return { joined: st.joined, busy: st.busy, muted: st.muted, deaf: st.deaf, listenOnly: st.listenOnly, error: st.error, members: st.members.slice(), connected: Object.keys(streams) };
    }
    function changed() { try { if (env.onChange) env.onChange(snapshot()); } catch (e) {} }

    function closeCall(id) {
      var c = calls[id];
      delete calls[id]; delete streams[id];
      try { env.stopRemote(id); } catch (e) {}
      try { if (c) c.close(); } catch (e) {}
    }
    function attach(id, call) {
      var old = calls[id];
      if (old && old !== call) { delete calls[id]; try { old.close(); } catch (e) {} }
      calls[id] = call;
      call.on("stream", function (s) {
        if (calls[id] !== call) return;
        streams[id] = s; attempts[id] = 0;
        try { env.playRemote(id, s); } catch (e) {}
        changed();
      });
      var gone = function () {
        if (calls[id] !== call) return;
        delete calls[id]; delete streams[id];
        try { env.stopRemote(id); } catch (e) {}
        changed();
      };
      call.on("close", gone);
      call.on("error", gone);
    }
    function startCall(id) {
      var peer = env.getPeer();
      if (!peer || !local) return;
      attempts[id] = (attempts[id] || 0) + 1;
      var call = null;
      try { call = peer.call(id, local); } catch (e) { return; }
      if (call) attach(id, call);
    }
    function reconcile() {
      if (!st.joined) return;
      var p = plan(env.myId(), st.members, Object.keys(calls));
      p.drop.forEach(closeCall);
      p.call.forEach(function (id) { if ((attempts[id] || 0) < MAX_TRIES) startCall(id); });
    }
    function setMembers(ids) {
      st.members = ids;
      var keep = {}; ids.forEach(function (i) { keep[i] = 1; });
      Object.keys(attempts).forEach(function (i) { if (!keep[i]) delete attempts[i]; });
      reconcile();
      changed();
    }

    /* ----- côté hôte : annuaire ----- */
    function hostPublish() {
      var ids = cleanMembers(Object.keys(hostSet), env.players());
      hostSet = {}; ids.forEach(function (i) { hostSet[i] = 1; });
      setMembers(ids);
      env.broadcast({ type: "vcState", members: ids });
    }
    function announce(op) {
      var me = env.myId();
      if (env.isHost()) {
        if (op === "join") hostSet[me] = 1; else delete hostSet[me];
        hostPublish();
      } else {
        env.sendToHost({ type: "vc", op: op, id: me });
      }
    }

    function tick() {
      if (env.isHost() && Object.keys(hostSet).length) hostPublish();      /* retire les joueurs partis, informe les retardataires */
      else reconcile();
    }
    function startTicker() { if (!ticker) ticker = setInterval(tick, TICK_MS); }
    function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

    /* ----- actions ----- */
    function join() {
      if (st.joined || st.busy) return Promise.resolve(snapshot());
      if (!env.myId() || !env.inRoom()) { st.error = "Entre d'abord dans une salle pour utiliser le vocal."; changed(); return Promise.resolve(snapshot()); }
      st.busy = true; st.error = ""; changed();
      return env.getMicrophone().then(function (r) {
        local = r.stream; mic = r.mic ? r.stream : null;
        st.listenOnly = !r.mic; st.error = r.mic ? "" : (r.reason || "Micro indisponible : tu écoutes seulement.");
        st.joined = true; st.busy = false; st.muted = false;
        announce("join");
        startTicker();
        changed();
        return snapshot();
      }).catch(function (e) {
        st.busy = false; st.error = (e && e.message) || "Impossible d'activer le vocal.";
        changed();
        return snapshot();
      });
    }
    function leave(silent) {
      var was = st.joined;
      if (was && !silent) { try { announce("leave"); } catch (e) {} }
      st.joined = false; st.busy = false; st.muted = false; st.listenOnly = false; st.error = "";
      Object.keys(calls).forEach(closeCall);
      streams = {}; attempts = {};
      if (local) { try { local.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
      local = null; mic = null;
      try { env.stopAll(); } catch (e) {}
      stopTicker();
      if (silent) { hostSet = {}; st.members = []; }
      changed();
    }
    function setMuted(b) {
      st.muted = !!b;
      if (mic) { try { mic.getAudioTracks().forEach(function (t) { t.enabled = !st.muted; }); } catch (e) {} }
      changed();
    }
    function setDeaf(b) { st.deaf = !!b; try { env.setDeaf(st.deaf); } catch (e) {} changed(); }

    /* ----- messages du réseau du jeu (handleData) ----- */
    function handleMessage(data) {
      if (!data) return;
      if (data.type === "vc") {
        if (!env.isHost() || typeof data.id !== "string" || !ID_RE.test(data.id)) return;
        if (data.op === "join" && env.players()[data.id]) hostSet[data.id] = 1;
        else if (data.op === "leave") delete hostSet[data.id];
        else return;
        hostPublish();
      } else if (data.type === "vcState") {
        if (env.isHost()) return;
        setMembers(cleanMembers(data.members, null));
      }
    }
    function hostSendStateTo(id) {
      if (!env.isHost() || !id || !Object.keys(hostSet).length) return;
      env.sendTo(id, { type: "vcState", members: cleanMembers(Object.keys(hostSet), env.players()) });
    }
    /* appel entrant (peer.on("call")) */
    function onCall(call) {
      if (!call || !call.peer) return;
      if (!st.joined || !local) { try { call.close(); } catch (e) {} return; }
      try { call.answer(local); } catch (e) { return; }
      attach(call.peer, call);
    }

    return { join: join, leave: leave, setMuted: setMuted, setDeaf: setDeaf, handleMessage: handleMessage, hostSendStateTo: hostSendStateTo, onCall: onCall, tick: tick, snapshot: snapshot };
  }

  var api = { createController: createController, cleanMembers: cleanMembers, plan: plan, MAX_MEMBERS: MAX_MEMBERS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window === "undefined" || typeof document === "undefined") return api;
  window.V50Voice = api;

  /* ===================== Navigateur : micro, lecture, interface ===================== */
  var AC = window.AudioContext || window.webkitAudioContext, actx = null;
  function audioCtx() {
    if (!actx && AC) { try { actx = new AC(); } catch (e) { actx = null; } }
    if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(m) { try { if (typeof window.v34Toast === "function") window.v34Toast(m); } catch (e) {} }
  function $(id) { return document.getElementById(id); }

  /* flux de silence : permet de rejoindre en « écoute seulement » (une piste audio est nécessaire pour recevoir celle des autres) */
  function silentStream() {
    var c = audioCtx();
    if (!c || !c.createMediaStreamDestination) throw new Error("Ton navigateur ne gère pas le vocal (WebRTC / Web Audio).");
    return c.createMediaStreamDestination().stream;
  }
  function getMicrophone() {
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) {
      try { return Promise.resolve({ stream: silentStream(), mic: false, reason: "Micro indisponible (page non sécurisée ?) : tu écoutes seulement." }); } catch (e) { return Promise.reject(e); }
    }
    return md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then(
      function (s) { return { stream: s, mic: true }; },
      function (err) {
        var denied = err && (err.name === "NotAllowedError" || err.name === "SecurityError");
        var reason = denied ? "Micro refusé : tu écoutes seulement. Autorise-le dans les réglages du navigateur pour parler." : "Aucun micro détecté : tu écoutes seulement.";
        return { stream: silentStream(), mic: false, reason: reason };
      }
    );
  }

  /* lecture des voix des autres */
  var audios = {}, deaf = false;
  function box() { var b = $("vcAudio"); if (!b) { b = document.createElement("div"); b.id = "vcAudio"; b.hidden = true; document.body.appendChild(b); } return b; }
  function playRemote(id, stream) {
    stopRemote(id);
    var a = document.createElement("audio");
    a.autoplay = true; a.playsInline = true; a.setAttribute("playsinline", ""); a.muted = deaf; a.srcObject = stream;
    box().appendChild(a); audios[id] = a;
    var p = a.play(); if (p && p.catch) p.catch(function () { retryOnTap(); });
    watch(id, stream);
  }
  function stopRemote(id) {
    var a = audios[id];
    if (a) { try { a.pause(); a.srcObject = null; a.remove(); } catch (e) {} delete audios[id]; }
    unwatch(id);
  }
  function stopAll() { Object.keys(audios).forEach(stopRemote); unwatch("me"); }
  function setDeafEnv(b) { deaf = !!b; Object.keys(audios).forEach(function (id) { audios[id].muted = deaf; }); }
  var tapArmed = false;
  function retryOnTap() {
    if (tapArmed) return; tapArmed = true;
    var fn = function () {
      tapArmed = false; document.removeEventListener("click", fn, true); document.removeEventListener("touchend", fn, true);
      Object.keys(audios).forEach(function (id) { try { audios[id].play(); } catch (e) {} });
    };
    document.addEventListener("click", fn, true); document.addEventListener("touchend", fn, true);
    toast("🔈 Touche l'écran pour activer le son du vocal.");
  }

  /* indicateur « parle » : niveau sonore de chaque flux */
  var meters = {}, speaking = {}, lastLoud = {};
  function watch(id, stream) {
    unwatch(id);
    var c = audioCtx(); if (!c || !stream || !stream.getAudioTracks().length) return;
    try {
      var an = c.createAnalyser(); an.fftSize = 512;
      var src = c.createMediaStreamSource(stream); src.connect(an);
      meters[id] = { an: an, src: src, buf: new Uint8Array(an.fftSize) };
    } catch (e) {}
  }
  function unwatch(id) {
    var m = meters[id];
    if (m) { try { m.src.disconnect(); } catch (e) {} delete meters[id]; }
    delete speaking[id]; delete lastLoud[id];
  }
  function level(m) {
    m.an.getByteTimeDomainData(m.buf);
    var sum = 0; for (var i = 0; i < m.buf.length; i++) { var v = (m.buf[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / m.buf.length);
  }
  setInterval(function () {
    var now = Date.now(), changedAny = false;
    Object.keys(meters).forEach(function (id) {
      var on = false;
      try { on = level(meters[id]) > 0.035; } catch (e) {}
      if (id === "me" && snap.muted) on = false;
      if (on) lastLoud[id] = now;
      var s = now - (lastLoud[id] || 0) < 450;
      if (s !== !!speaking[id]) { speaking[id] = s; changedAny = true; }
    });
    if (changedAny) paintList();
  }, 150);

  /* ----- contrôleur branché sur le jeu ----- */
  var snap = { joined: false, busy: false, muted: false, deaf: false, listenOnly: false, error: "", members: [], connected: [] };
  var prevMembers = [];
  var ctl = createController({
    myId: function () { return typeof myId !== "undefined" ? myId : ""; },
    isHost: function () { return typeof isHost !== "undefined" && !!isHost; },
    inRoom: function () { return typeof roomCode !== "undefined" && !!roomCode && typeof peer !== "undefined" && !!peer; },
    players: function () { return (typeof players === "object" && players) || {}; },
    getPeer: function () { return typeof peer !== "undefined" ? peer : null; },
    sendToHost: function (d) {
      var c = typeof connections === "object" && connections ? Object.values(connections).find(function (x) { return x && x.open; }) : null;
      if (c) { try { c.send(d); } catch (e) {} }
    },
    sendTo: function (id, d) { if (typeof sendTo === "function") sendTo(id, d); },
    broadcast: function (d) { if (typeof broadcast === "function") broadcast(d); },
    getMicrophone: function () { audioCtx(); return getMicrophone(); },
    playRemote: playRemote, stopRemote: stopRemote, stopAll: stopAll, setDeaf: setDeafEnv,
    onChange: function (s) {
      var me = typeof myId !== "undefined" ? myId : "";
      if (s.joined && snap.joined) {
        s.members.forEach(function (id) { if (id !== me && prevMembers.indexOf(id) < 0) toast("🎙️ " + nameOf(id) + " a rejoint le vocal"); });
        prevMembers.forEach(function (id) { if (id !== me && s.members.indexOf(id) < 0) toast("🎙️ " + nameOf(id) + " a quitté le vocal"); });
      }
      prevMembers = s.members.slice();
      snap = s; render();
    }
  });
  api.controller = ctl;

  function nameOf(id) { var p = typeof players === "object" && players ? players[id] : null; return (p && p.name) || "Un joueur"; }

  /* Brancher les appels entrants sur le Peer courant (il est recréé à chaque salle) */
  var hooked = null;
  function hookPeer() {
    if (typeof peer === "undefined" || !peer || peer === hooked) return;
    hooked = peer;
    try { peer.on("call", ctl.onCall); } catch (e) {}
  }
  setInterval(hookPeer, 300);

  /* Messages du jeu : l'annuaire du vocal passe par le réseau existant */
  if (typeof handleData === "function") {
    var baseHandle = handleData;
    handleData = function (data) {
      if (data && (data.type === "vc" || data.type === "vcState")) { ctl.handleMessage(data); return; }
      var r = baseHandle.apply(this, arguments);
      if (data && data.type === "join" && typeof isHost !== "undefined" && isHost && data.player && data.player.id) {
        var pid = data.player.id; setTimeout(function () { ctl.hostSendStateTo(pid); }, 200);
      }
      return r;
    };
  }
  if (typeof resetConnection === "function") {
    var baseReset = resetConnection;
    resetConnection = function () { try { ctl.leave(true); } catch (e) {} hooked = null; return baseReset.apply(this, arguments); };
  }

  /* ----- interface ----- */
  var built = false;
  function build() {
    if (built || !document.body) return;
    built = true;
    var fab = document.createElement("button");
    fab.id = "vcFab"; fab.type = "button"; fab.setAttribute("aria-label", "Chat vocal"); fab.title = "Chat vocal";
    fab.innerHTML = '<span class="vc-ico" aria-hidden="true">🎙️</span><span class="vc-badge" id="vcBadge"></span>';
    var panel = document.createElement("div");
    panel.id = "vcPanel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat vocal");
    panel.innerHTML = '<div class="vc-head"><strong>🎙️ Chat vocal</strong><button type="button" class="vc-x" data-vc="close" aria-label="Fermer">✕</button></div>'
      + '<div class="vc-msg" id="vcMsg" role="status" aria-live="polite"></div><div class="vc-list" id="vcList"></div><div class="vc-actions" id="vcActions"></div>'
      + '<div class="vc-hint">Parle avec les joueurs de la salle, sans rien installer. Le navigateur te demande l\'accès au micro. Mets un casque pour éviter l\'écho.</div>';
    document.body.appendChild(fab); document.body.appendChild(panel);
    fab.addEventListener("click", function () { panel.classList.toggle("open"); render(); });
    panel.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-vc]"); if (!t) return;
      var a = t.dataset.vc;
      if (a === "close") panel.classList.remove("open");
      else if (a === "join") { hookPeer(); ctl.join(); }
      else if (a === "leave") ctl.leave(false);
      else if (a === "mute") ctl.setMuted(!snap.muted);
      else if (a === "deaf") ctl.setDeaf(!snap.deaf);
    });
    render();
  }
  function paintList() {
    var list = $("vcList"); if (!list) return;
    var me = typeof myId !== "undefined" ? myId : "";
    if (!snap.members.length) { list.innerHTML = '<div class="vc-empty">Personne n\'est au vocal pour l\'instant.</div>'; return; }
    list.innerHTML = snap.members.map(function (id) {
      var p = typeof players === "object" && players ? players[id] : null, isMe = id === me;
      var key = isMe ? "me" : id, linked = isMe || snap.connected.indexOf(id) >= 0;
      var state = isMe ? (snap.listenOnly ? "🎧 écoute" : (snap.muted ? "🔇 micro coupé" : "🎤")) : (linked ? "🔊" : "⏳ connexion…");
      return '<div class="vc-row' + (speaking[key] ? " talk" : "") + '"><span class="vc-av">' + esc((p && p.avatar) || "🙂") + '</span><span class="vc-name">' + esc((p && p.name) || "Joueur") + (isMe ? " (toi)" : "") + '</span><span class="vc-state">' + state + '</span></div>';
    }).join("");
  }
  function render() {
    build();
    var fab = $("vcFab"), panel = $("vcPanel"); if (!fab || !panel) return;
    var inRoom = ctlEnvInRoom();
    fab.classList.toggle("show", inRoom);
    if (!inRoom && panel.classList.contains("open")) panel.classList.remove("open");
    fab.classList.toggle("live", snap.joined);
    fab.classList.toggle("muted", snap.joined && (snap.muted || snap.listenOnly));
    var others = snap.members.filter(function (id) { return id !== (typeof myId !== "undefined" ? myId : ""); }).length;
    var badge = $("vcBadge"); if (badge) { badge.textContent = snap.joined ? String(snap.members.length) : (others ? String(others) : ""); badge.style.display = (snap.joined || others) ? "" : "none"; }
    fab.classList.toggle("call", !snap.joined && others > 0);
    var msg = $("vcMsg"); if (msg) { msg.textContent = snap.error || ""; msg.className = "vc-msg" + (snap.error ? " show" : ""); }
    var act = $("vcActions");
    if (act) {
      if (!snap.joined) act.innerHTML = '<button type="button" class="btn btn-primary" data-vc="join"' + (snap.busy ? " disabled" : "") + '>' + (snap.busy ? "⏳ Activation du micro…" : "🎙️ Rejoindre le vocal") + '</button>';
      else act.innerHTML = (snap.listenOnly ? "" : '<button type="button" class="btn ' + (snap.muted ? "btn-danger" : "btn-secondary") + '" data-vc="mute">' + (snap.muted ? "🎤 Réactiver mon micro" : "🔇 Couper mon micro") + '</button>')
        + '<button type="button" class="btn ' + (snap.deaf ? "btn-danger" : "btn-secondary") + '" data-vc="deaf">' + (snap.deaf ? "🔊 Remettre le son" : "🔈 Couper le son des autres") + '</button>'
        + '<button type="button" class="btn btn-secondary" data-vc="leave">📴 Quitter le vocal</button>';
    }
    paintList();
  }
  function ctlEnvInRoom() { return typeof roomCode !== "undefined" && !!roomCode && typeof peer !== "undefined" && !!peer; }
  setInterval(function () { if (built) render(); }, 700);          /* le bouton apparaît quand on entre dans une salle et disparaît quand on la quitte */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
  return api;
})();
