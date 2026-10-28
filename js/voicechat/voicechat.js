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
  var ID_RE = /^[\w-]{1,64}$/, MAX_MEMBERS = 8, MAX_TRIES = 12, TICK_MS = 3000, TEXT_MAX = 280, LINES_PER_WINDOW = 8, LINE_WINDOW_MS = 10000;

  /* Texte de transcription propre : chaîne, sans caractères de contrôle, espaces simples, 280 caractères au plus. */
  function cleanText(t) {
    if (typeof t !== "string") return "";
    return t.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, TEXT_MAX);
  }
  /* Durée en « m:ss » (ou « h:mm:ss » au-delà d'une heure). */
  function fmtDuration(ms) {
    var n = Number(ms); if (!isFinite(n) || n < 0) n = 0;
    var t = Math.floor(n / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
    var two = function (x) { return (x < 10 ? "0" : "") + x; };
    return h > 0 ? h + ":" + two(m) + ":" + two(sec) : m + ":" + two(sec);
  }

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
             getMicrophone() → Promise<{stream, mic, reason}>, playRemote(id,stream), stopRemote(id), stopAll(), setDeaf(b), onChange(snapshot),
             onLine({id,text,at}) (transcription reçue ou envoyée) } */
  function createController(env) {
    var st = { joined: false, busy: false, muted: false, deaf: false, listenOnly: false, error: "", members: [] };
    var local = null, mic = null, calls = {}, streams = {}, attempts = {}, hostSet = {}, ticker = null, lineTimes = {};

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

    /* ----- transcription : chacun transcrit SA voix ; l'hôte relaie le texte aux seuls participants au vocal ----- */
    function emitLine(id, text) { try { if (env.onLine) env.onLine({ id: id, text: text, at: Date.now() }); } catch (e) {} }
    function allowLine(id) {
      var now = Date.now(), arr = (lineTimes[id] || []).filter(function (t) { return now - t < LINE_WINDOW_MS; });
      if (arr.length >= LINES_PER_WINDOW) { lineTimes[id] = arr; return false; }
      arr.push(now); lineTimes[id] = arr; return true;
    }
    function deliverLine(from, text) {                       /* côté hôte */
      var me = env.myId();
      Object.keys(hostSet).forEach(function (id) { if (id !== from && id !== me) env.sendTo(id, { type: "vcLine", id: from, text: text }); });
      if (from !== me && st.joined) emitLine(from, text);
    }
    function sendText(text) {
      if (!st.joined || st.listenOnly || st.muted) return false;   /* micro coupé = rien n'est transcrit ni envoyé */
      var t = cleanText(text); if (!t) return false;
      emitLine(env.myId(), t);
      if (env.isHost()) deliverLine(env.myId(), t); else env.sendToHost({ type: "vcText", text: t });
      return true;
    }

    /* ----- messages du réseau du jeu (handleData) ----- */
    function handleMessage(data, from) {
      if (!data) return;
      if (data.type === "vcText") {
        /* l'expéditeur vient de la connexion réseau (pas du message) : impossible d'écrire au nom d'un autre */
        if (!env.isHost() || typeof from !== "string" || !hostSet[from] || !env.players()[from]) return;
        var t = cleanText(data.text);
        if (t && allowLine(from)) deliverLine(from, t);
      } else if (data.type === "vcLine") {
        if (env.isHost() || !st.joined || typeof data.id !== "string" || data.id === env.myId() || st.members.indexOf(data.id) < 0) return;
        var t2 = cleanText(data.text);
        if (t2) emitLine(data.id, t2);
      } else if (data.type === "vc") {
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

    return { join: join, leave: leave, setMuted: setMuted, setDeaf: setDeaf, sendText: sendText, handleMessage: handleMessage, hostSendStateTo: hostSendStateTo, onCall: onCall, tick: tick, snapshot: snapshot };
  }

  /* Niveau sonore (RMS 0..1) → pourcentage de la barre du test : silence = 0 %, voix normale ≈ 30-60 %, cri = 100 % */
  function levelToPercent(rms) {
    var r = Number(rms);
    if (!isFinite(r) || r <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((Math.sqrt(r) - 0.05) * 150)));
  }

  var api = { createController: createController, cleanMembers: cleanMembers, plan: plan, levelToPercent: levelToPercent, cleanText: cleanText, fmtDuration: fmtDuration, MAX_MEMBERS: MAX_MEMBERS };
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
  var talkMs = {}, joinedAt = 0, lastSpeakTick = Date.now();   /* temps de parole de chacun et début de MON appel */
  function watch(id, stream) {
    unwatch(id);
    var c = audioCtx(); if (!c || !stream || !stream.getAudioTracks().length) return;
    try {
      var an = c.createAnalyser(); an.fftSize = 512;
      var src = c.createMediaStreamSource(stream); src.connect(an);
      meters[id] = { an: an, src: src, buf: new Uint8Array(an.fftSize), stream: stream };
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
    var now = Date.now(), changedAny = false, dt = Math.min(400, now - lastSpeakTick); lastSpeakTick = now;
    Object.keys(meters).forEach(function (id) {
      var on = false;
      try { on = level(meters[id]) > 0.035; } catch (e) {}
      if (id === "me" && snap.muted) on = false;
      if (on) lastLoud[id] = now;
      var s = now - (lastLoud[id] || 0) < 450;
      if (s && snap.joined) talkMs[id] = (talkMs[id] || 0) + dt;
      if (s !== !!speaking[id]) { speaking[id] = s; changedAny = true; }
    });
    if (changedAny) { paintList(); paintClock(); }
  }, 150);
  setInterval(function () { if (!built) return; paintClock(); if (snap.joined) paintList(); }, 1000);   /* durée de l'appel et temps de parole */

  /* ----- test du micro et du haut-parleur (avant de rejoindre le vocal) ----- */
  var test = null, testPending = false;
  function testMsg(t, warn) { var m = $("vcTestMsg"); if (m) { m.textContent = t || ""; m.className = "vc-test-msg" + (warn ? " warn" : ""); } }
  function paintTest() {
    var on = !!test, btn = $("vcTestMic"), meter = $("vcMeter"), loop = $("vcLoop");
    if (btn) btn.textContent = on ? "⏹ Arrêter le test" : "🎤 Tester mon micro";
    if (meter) meter.hidden = !on;
    if (loop) loop.hidden = !on;
    if (!on) { var f = $("vcMeterFill"); if (f) f.style.width = "0%"; var lb = $("vcLoopBox"); if (lb) lb.checked = false; }
  }
  function stopTest(keepMsg) {
    var t = test; test = null; testPending = false;
    if (t) {
      clearInterval(t.timer); clearTimeout(t.stop);
      try { t.audio.pause(); t.audio.srcObject = null; t.audio.remove(); } catch (e) {}
      if (!t.live) {          /* test « live » : le micro appartient au vocal, on n'y touche pas */
        try { t.src.disconnect(); } catch (e) {}
        try { t.stream.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {}
      }
    }
    if (!keepMsg) testMsg("");
    paintTest();
  }
  /* démarre la boucle de mesure (barre de niveau, message de réussite, arrêt auto à 30 s) */
  function beginTest(t) {
    t.timer = setInterval(function () {
      if (test !== t) return;
      var pct = levelToPercent(level(t)), f = $("vcMeterFill");
      if (f) f.style.width = pct + "%";
      if (pct >= 15 && !t.ok) { t.ok = true; testMsg("✅ Ton micro fonctionne : il capte bien ta voix."); }
      else if (!t.ok && !t.warned && Date.now() - t.since > 5000) { t.warned = true; testMsg("Aucun son détecté : parle plus fort ou vérifie le micro choisi dans les réglages du navigateur.", true); }
    }, 100);
    t.stop = setTimeout(function () { if (test === t) { stopTest(true); testMsg("Test terminé (30 s). Relance-le si besoin."); } }, 30000);
    test = t; paintTest(); testMsg("Parle : la barre doit bouger.");
  }
  /* test pendant le vocal : on mesure le micro déjà ouvert (pas de nouvelle demande d'autorisation) */
  function startLiveTest() {
    var m = meters.me;
    if (snap.listenOnly || !m || !m.stream) { testMsg("Tu es en écoute seule : il n'y a pas de micro à tester. Quitte le vocal, autorise le micro dans le navigateur, puis rejoins.", true); return; }
    if (snap.muted) { testMsg("Ton micro est coupé : clique sur « Réactiver mon micro », puis relance le test.", true); return; }
    var audio = document.createElement("audio");
    audio.autoplay = true; audio.muted = true; audio.setAttribute("playsinline", ""); audio.srcObject = m.stream; box().appendChild(audio);
    beginTest({ live: true, stream: m.stream, src: null, an: m.an, buf: m.buf, audio: audio, since: Date.now(), ok: false, warned: false, timer: 0, stop: 0 });
  }
  function startTest() {
    if (test || testPending) return;
    if (snap.joined) { startLiveTest(); return; }
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { testMsg("Ce navigateur ou cette page ne permet pas d'utiliser le micro (il faut une page HTTPS).", true); return; }
    testPending = true; testMsg("Autorise le micro dans la fenêtre du navigateur…");
    md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then(function (stream) {
      if (!testPending || snap.joined) { try { stream.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {} testPending = false; return; }
      testPending = false;
      var c = audioCtx(), src = null, an = null;
      try { an = c.createAnalyser(); an.fftSize = 512; src = c.createMediaStreamSource(stream); src.connect(an); } catch (e) { stream.getTracks().forEach(function (x) { x.stop(); }); testMsg("Impossible d'analyser le son sur ce navigateur.", true); return; }
      var audio = document.createElement("audio");
      audio.autoplay = true; audio.muted = true; audio.setAttribute("playsinline", ""); audio.srcObject = stream; box().appendChild(audio);
      beginTest({ live: false, stream: stream, src: src, an: an, buf: new Uint8Array(an.fftSize), audio: audio, since: Date.now(), ok: false, warned: false, timer: 0, stop: 0 });
    }, function (err) {
      testPending = false;
      var denied = err && (err.name === "NotAllowedError" || err.name === "SecurityError");
      testMsg(denied ? "Micro refusé : autorise-le dans les réglages du navigateur (cadenas près de l'adresse), puis relance le test." : "Aucun micro détecté sur cet appareil.", true);
    });
  }
  function setLoopback(on) {
    if (!test) return;
    test.audio.muted = !on;
    if (on) { try { var p = test.audio.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} testMsg("🔈 Tu t'entends : mets un casque pour éviter l'écho."); }
    else testMsg(test.ok ? "✅ Ton micro fonctionne : il capte bien ta voix." : "Parle : la barre doit bouger.");
  }
  function testSound() {
    var c = audioCtx();
    if (!c || !c.createOscillator) { testMsg("Ce navigateur ne peut pas jouer de son ici.", true); return; }
    try {
      var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime;
      o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.0001; o.connect(g); g.connect(c.destination);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.start(t0); o.stop(t0 + 0.55);
      testMsg("🔔 Tu as entendu le bip ? Sinon, monte le volume ou vérifie la sortie audio de ton appareil.");
    } catch (e) { testMsg("Impossible de jouer le bip sur ce navigateur.", true); }
  }

  /* ----- durée de l'appel et « qui parle » (bandeau près du bouton, visible même panneau fermé) ----- */
  function speakingNames() {
    var me = typeof myId !== "undefined" ? myId : "", out = [];
    snap.members.forEach(function (id) { var key = id === me ? "me" : id; if (speaking[key]) out.push(id === me ? "Toi" : nameOf(id)); });
    return out;
  }
  function paintClock() {
    var el = $("vcClock"), pill = $("vcNow"), on = !!(snap.joined && joinedAt);
    var dur = on ? fmtDuration(Date.now() - joinedAt) : "";
    if (el) { el.hidden = !on; if (on) el.textContent = "⏱ " + dur + " · " + snap.members.length + " au vocal"; }
    if (pill) {
      if (!on) { pill.classList.remove("show"); pill.classList.remove("talk"); return; }
      var names = speakingNames();
      pill.textContent = "⏱ " + dur + (names.length ? " · 🗣️ " + names.join(", ") : "");
      pill.classList.add("show"); pill.classList.toggle("talk", names.length > 0);
    }
  }

  /* ----- transcription : chacun transcrit SA voix (reconnaissance vocale du navigateur) et partage le texte ----- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var trLog = [], trWanted = false, trBlocked = false, trRec = null, trErrs = 0, trSeen = {};
  var TR_LANGS = [["fr-FR", "Français"], ["en-US", "English"], ["es-ES", "Español"], ["de-DE", "Deutsch"], ["it-IT", "Italiano"], ["pt-PT", "Português"]];
  function trDefaultLang() {
    var n = String((navigator && navigator.language) || "fr").slice(0, 2).toLowerCase();
    for (var i = 0; i < TR_LANGS.length; i++) if (TR_LANGS[i][0].slice(0, 2) === n) return TR_LANGS[i][0];
    return "fr-FR";
  }
  var trLang = trDefaultLang();
  function trMsg(t, warn) { var m = $("vcTrMsg"); if (m) { m.textContent = t || ""; m.className = "vc-test-msg" + (warn ? " warn" : ""); } }
  function trSetInterim(t) { var e = $("vcTrInterim"); if (e) e.textContent = t ? "… " + t : ""; }
  function addLine(l) {
    if (!l || !l.text) return;
    var me = typeof myId !== "undefined" ? myId : "", mine = l.id === me;
    var name = String(nameOf(l.id)).replace(/[\r\n]+/g, " ");
    trLog.push({ at: joinedAt ? Math.max(0, l.at - joinedAt) : 0, id: l.id, name: name, text: l.text, mine: mine });
    if (trLog.length > 500) trLog.shift();
    if (!mine && !trSeen[l.id]) { trSeen[l.id] = 1; toast("📝 " + name + " active la transcription de sa voix"); }
    paintTr();
  }
  function paintTr() {
    var box = $("vcTr"); if (!box) return;
    box.hidden = !(snap.joined || trLog.length > 0);
    var btn = $("vcTrBtn");
    if (btn) { btn.textContent = trWanted ? "⏹ Arrêter ma transcription" : "📝 Transcrire ma voix"; btn.disabled = !SR; }
    var sel = $("vcTrLang"); if (sel && sel.value !== trLang) sel.value = trLang;
    var log = $("vcTrLog"); if (!log) return;
    var stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    var rows = trLog.slice(-60);
    log.innerHTML = rows.length
      ? rows.map(function (x) { return '<div class="vc-tr-line' + (x.mine ? " me" : "") + '"><span class="vc-tr-t">' + fmtDuration(x.at) + '</span> <b>' + esc(x.mine ? "Toi" : x.name) + '</b> ' + esc(x.text) + '</div>'; }).join("")
      : '<div class="vc-empty">Rien pour l\'instant. Active ta transcription pour écrire ce que tu dis ; celle des autres s\'affichera ici.</div>';
    if (stick) log.scrollTop = log.scrollHeight;
  }
  function trAllowed() { return trWanted && !trBlocked && snap.joined && !snap.muted && !snap.listenOnly; }
  function trStopRec() {
    var r = trRec; trRec = null;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; try { r.abort(); } catch (e) {} }
    trSetInterim("");
  }
  function trStartRec() {
    if (!SR || trRec) return;
    var r;
    try { r = new SR(); } catch (e) { trWanted = false; trMsg("La transcription n'est pas disponible sur ce navigateur.", true); paintTr(); return; }
    r.lang = trLang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], txt = (res[0] && res[0].transcript) || "";
        if (res.isFinal) { trErrs = 0; ctl.sendText(txt); } else interim += txt;
      }
      trSetInterim(snap.muted ? "" : interim);
    };
    r.onerror = function (e) {
      var er = e && e.error;
      if (er === "not-allowed" || er === "service-not-allowed") { trBlocked = true; trWanted = false; trMsg("Le navigateur refuse la transcription : autorise le micro pour ce site (cadenas près de l'adresse), puis réessaie.", true); }
      else if (er === "language-not-supported") { trWanted = false; trMsg("Cette langue n'est pas gérée par ton navigateur : choisis-en une autre.", true); }
      else if (er === "network") { trErrs++; if (trErrs >= 4) { trWanted = false; trMsg("Le service de reconnaissance vocale du navigateur est injoignable (connexion ?).", true); } }
      paintTr();
    };
    r.onend = function () { if (trRec !== r) return; trRec = null; trSetInterim(""); if (trAllowed()) setTimeout(trSync, 300); };   /* le navigateur coupe après un silence : on relance */
    try { r.start(); trRec = r; trMsg("📝 Transcription active : parle, ton texte apparaît ci-dessous."); } catch (e) { trRec = null; }
  }
  function trSync() {
    if (trAllowed()) { if (!trRec) trStartRec(); }
    else if (trRec) { trStopRec(); if (trWanted && snap.joined) trMsg("⏸ Transcription en pause : ton micro est coupé.", true); }
  }
  function trToggle() {
    if (!SR) return;
    if (!trWanted && snap.listenOnly) { trMsg("Tu es en écoute seule : il n'y a pas de micro à transcrire. Tu vois quand même ce que disent les autres.", true); return; }
    trWanted = !trWanted;
    if (trWanted) { trBlocked = false; trErrs = 0; trMsg(snap.muted ? "Ton micro est coupé : la transcription démarrera quand tu le réactiveras." : "", snap.muted); }
    else trMsg("");
    trSync(); paintTr();
  }
  function trText() {
    var head = "Transcription du chat vocal — salle " + (typeof roomCode !== "undefined" ? roomCode : "") + " — " + new Date().toLocaleString() + "\n\n";
    return head + trLog.map(function (x) { return "[" + fmtDuration(x.at) + "] " + x.name + " : " + x.text; }).join("\n") + "\n";
  }
  function fallbackCopy(txt) {
    try { var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var okc = document.execCommand("copy"); ta.remove(); return !!okc; } catch (e) { return false; }
  }
  function trCopy() {
    if (!trLog.length) { trMsg("Rien à copier pour l'instant.", true); return; }
    var txt = trText(), done = function () { toast("📋 Transcription copiée"); }, fail = function () { trMsg("Copie impossible ici : utilise « Enregistrer ».", true); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { if (fallbackCopy(txt)) done(); else fail(); });
    else if (fallbackCopy(txt)) done(); else fail();
  }
  function trSave() {
    if (!trLog.length) { trMsg("Rien à enregistrer pour l'instant.", true); return; }
    try {
      var blob = new Blob([trText()], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = "transcription-vocal-" + (typeof roomCode !== "undefined" ? roomCode : "salle") + ".txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      toast("💾 Transcription enregistrée");
    } catch (e) { trMsg("Enregistrement impossible ici : utilise « Copier ».", true); }
  }

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
    getMicrophone: function () { audioCtx(); return getMicrophone().then(function (r) { if (r && r.mic) watch("me", r.stream); return r; }); },   /* le voyant « tu parles » écoute ton micro */
    playRemote: playRemote, stopRemote: stopRemote, stopAll: stopAll, setDeaf: setDeafEnv,
    onLine: function (l) { addLine(l); },
    onChange: function (s) {
      var me = typeof myId !== "undefined" ? myId : "";
      if (s.joined && snap.joined) {
        s.members.forEach(function (id) { if (id !== me && prevMembers.indexOf(id) < 0) toast("🎙️ " + nameOf(id) + " a rejoint le vocal"); });
        prevMembers.forEach(function (id) { if (id !== me && s.members.indexOf(id) < 0) toast("🎙️ " + nameOf(id) + " a quitté le vocal"); });
      }
      prevMembers = s.members.slice();
      var wasJoined = snap.joined;
      snap = s;
      if (s.joined && !wasJoined) { joinedAt = Date.now(); talkMs = {}; trLog = []; trSeen = {}; trMsg(""); }
      if (!s.joined && wasJoined) { joinedAt = 0; trWanted = false; }
      render(); paintTr(); paintClock();
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
      if (data && (data.type === "vcText" || data.type === "vcLine")) return;     /* traités par setupConnection (expéditeur réel) */
      var r = baseHandle.apply(this, arguments);
      if (data && data.type === "join" && typeof isHost !== "undefined" && isHost && data.player && data.player.id) {
        var pid = data.player.id; setTimeout(function () { ctl.hostSendStateTo(pid); }, 200);
      }
      return r;
    };
  }
  if (typeof setupConnection === "function") {
    var baseSetup = setupConnection;
    setupConnection = function (connection) {
      var r = baseSetup.apply(this, arguments);
      try { connection.on("data", function (d) { if (d && (d.type === "vcText" || d.type === "vcLine")) ctl.handleMessage(d, connection.peer); }); } catch (e) {}
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
      + '<div class="vc-clock" id="vcClock" hidden title="Durée de ton appel et nombre de personnes au vocal"></div>'
      + '<div class="vc-msg" id="vcMsg" role="status" aria-live="polite"></div><div class="vc-list" id="vcList"></div><div class="vc-actions" id="vcActions"></div>'
      + '<div class="vc-test vc-tr" id="vcTr" hidden><div class="vc-test-title">📝 Transcription</div>'
      + '<div class="vc-test-btns"><button type="button" class="btn btn-secondary" data-vc="trtoggle" id="vcTrBtn">📝 Transcrire ma voix</button><select id="vcTrLang" class="vc-tr-lang" aria-label="Langue que tu parles">' + TR_LANGS.map(function (l) { return '<option value="' + l[0] + '">' + l[1] + '</option>'; }).join("") + '</select></div>'
      + '<div class="vc-test-msg" id="vcTrMsg" role="status" aria-live="polite"></div>'
      + '<div class="vc-tr-log" id="vcTrLog"></div><div class="vc-tr-interim" id="vcTrInterim"></div>'
      + '<div class="vc-test-btns"><button type="button" class="btn btn-secondary" data-vc="trcopy">📋 Copier</button><button type="button" class="btn btn-secondary" data-vc="trsave">💾 Enregistrer (.txt)</button></div>'
      + '<div class="vc-hint" id="vcTrNote">Chacun ne transcrit que sa propre voix, et seulement s\'il l\'active. Le texte est produit par la reconnaissance vocale de ton navigateur (sur Chrome et Edge, un service en ligne du fabricant), puis envoyé aux autres personnes du vocal. Elle se met en pause quand ton micro est coupé.</div></div>'
      + '<div class="vc-test" id="vcTest"><div class="vc-test-title" id="vcTestTitle">🔧 Tester avant de rejoindre</div>'
      + '<div class="vc-test-btns"><button type="button" class="btn btn-secondary" data-vc="testmic" id="vcTestMic">🎤 Tester mon micro</button><button type="button" class="btn btn-secondary" data-vc="testsound" id="vcTestSound">🔔 Tester le son</button></div>'
      + '<div class="vc-meter" id="vcMeter" hidden><i id="vcMeterFill"></i></div>'
      + '<label class="vc-loop" id="vcLoop" hidden><input type="checkbox" id="vcLoopBox"> M\'entendre (mets un casque pour éviter l\'écho)</label>'
      + '<div class="vc-test-msg" id="vcTestMsg" role="status" aria-live="polite"></div></div>'
      + '<div class="vc-hint">Parle avec les joueurs de la salle, sans rien installer. Le navigateur te demande l\'accès au micro. Mets un casque pour éviter l\'écho. Le temps à droite de chaque nom = son temps de parole.</div>';
    var pill = document.createElement("div"); pill.id = "vcNow"; pill.setAttribute("aria-live", "off");
    document.body.appendChild(fab); document.body.appendChild(panel); document.body.appendChild(pill);
    fab.addEventListener("click", function () { panel.classList.toggle("open"); if (!panel.classList.contains("open")) stopTest(); render(); });
    panel.addEventListener("change", function (e) {
      if (!e.target) return;
      if (e.target.id === "vcLoopBox") setLoopback(!!e.target.checked);
      else if (e.target.id === "vcTrLang") { trLang = e.target.value; trStopRec(); trSync(); }
    });
    panel.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-vc]"); if (!t) return;
      var a = t.dataset.vc;
      if (a === "close") { panel.classList.remove("open"); stopTest(); }
      else if (a === "join") { stopTest(); hookPeer(); ctl.join(); }
      else if (a === "testmic") { if (test || testPending) stopTest(); else startTest(); }
      else if (a === "testsound") testSound();
      else if (a === "trtoggle") trToggle();
      else if (a === "trcopy") trCopy();
      else if (a === "trsave") trSave();
      else if (a === "leave") ctl.leave(false);
      else if (a === "mute") ctl.setMuted(!snap.muted);
      else if (a === "deaf") ctl.setDeaf(!snap.deaf);
    });
    render(); paintTr(); paintClock();
  }
  function paintList() {
    var list = $("vcList"); if (!list) return;
    var me = typeof myId !== "undefined" ? myId : "";
    if (!snap.members.length) { list.innerHTML = '<div class="vc-empty">Personne n\'est au vocal pour l\'instant.</div>'; return; }
    list.innerHTML = snap.members.map(function (id) {
      var p = typeof players === "object" && players ? players[id] : null, isMe = id === me;
      var key = isMe ? "me" : id, linked = isMe || snap.connected.indexOf(id) >= 0;
      var state = isMe ? (snap.listenOnly ? "🎧 écoute" : (snap.muted ? "🔇 micro coupé" : "🎤")) : (linked ? "🔊" : "⏳ connexion…");
      if (linked && talkMs[key] >= 1000) state += " · " + fmtDuration(talkMs[key]);
      return '<div class="vc-row' + (speaking[key] ? " talk" : "") + '"><span class="vc-av">' + esc((p && p.avatar) || "🙂") + '</span><span class="vc-name">' + esc((p && p.name) || "Joueur") + (isMe ? " (toi)" : "") + '</span><span class="vc-state">' + state + '</span></div>';
    }).join("");
  }
  function render() {
    build();
    var fab = $("vcFab"), panel = $("vcPanel"); if (!fab || !panel) return;
    var inRoom = ctlEnvInRoom();
    fab.classList.toggle("show", inRoom);
    if (!inRoom && panel.classList.contains("open")) panel.classList.remove("open");
    if (!inRoom && (test || testPending)) stopTest();
    else if (snap.joined && (testPending || (test && !test.live))) stopTest();                  /* on vient de rejoindre : le test d'avant libère son micro */
    else if (test && test.live && (!snap.joined || snap.muted || snap.listenOnly)) stopTest();   /* micro coupé ou vocal quitté : fin du test en direct */
    var tb = $("vcTest"); if (tb) tb.hidden = false;                                             /* le test reste disponible, avant comme pendant le vocal */
    var tt = $("vcTestTitle"); if (tt) tt.textContent = snap.joined ? "🔧 Tester mon micro et mon son" : "🔧 Tester avant de rejoindre";
    fab.classList.toggle("live", snap.joined);
    fab.classList.toggle("muted", snap.joined && (snap.muted || snap.listenOnly));
    var others = snap.members.filter(function (id) { return id !== (typeof myId !== "undefined" ? myId : ""); }).length;
    var badge = $("vcBadge"); if (badge) { badge.textContent = snap.joined ? String(snap.members.length) : (others ? String(others) : ""); badge.style.display = (snap.joined || others) ? "" : "none"; }
    fab.classList.toggle("call", !snap.joined && others > 0);
    trSync();
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
