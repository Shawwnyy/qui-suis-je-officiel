/* Test « navigateur » du chat vocal et du lien d'invitation : exécute les vrais scripts dans un mini-DOM (sans jsdom).
   Lancer :  node tests/browserglue.test.js
   Vérifie : bouton et panneau, clic sur « Rejoindre », envoi au serveur de la partie, branchement sur handleData / resetConnection,
   échappement des pseudos (XSS), bouton d'invitation et lien ?room=… */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("ÉCHEC : " + m); } };
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

/* ---------- mini DOM ---------- */
function makeWorld(opts) {
  const byId = {}, timers = [], timeouts = [];
  class El {
    constructor(tag) {
      this.tagName = tag; this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {}; this.style = {};
      this._cls = new Set(); this.listeners = {}; this._id = ""; this._html = ""; this.textContent = ""; this.value = ""; this.hidden = false; this.disabled = false;
      const self = this;
      this.classList = { add: c => self._cls.add(c), remove: c => self._cls.delete(c), contains: c => self._cls.has(c), toggle: (c, f) => { const on = f === undefined ? !self._cls.has(c) : !!f; if (on) self._cls.add(c); else self._cls.delete(c); return on; } };
    }
    set id(v) { this._id = v; byId[v] = this; } get id() { return this._id; }
    set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } get className() { return [...this._cls].join(" "); }
    set innerHTML(h) { this._html = String(h); this.children = []; for (const m of this._html.matchAll(/id="([\w-]+)"/g)) { const c = new El("div"); c._id = m[1]; c.parentNode = this; this.children.push(c); byId[m[1]] = c; } }
    get innerHTML() { return this._html; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    insertBefore(n, ref) { n.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, n); return n; }
    get nextSibling() { const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; }
    remove() { if (this._id) delete byId[this._id]; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    removeEventListener() {} setAttribute(k, v) { this.attrs[k] = v; }
    dispatch(t, ev) { (this.listeners[t] || []).forEach(f => f(ev)); }
    scrollIntoView() {} focus() { this.focused = true; } pause() {} play() { return Promise.resolve(); }
  }
  const world = { sr: [], downloads: [] };
  const document = {
    readyState: "complete", body: new El("body"),
    createElement: t => new El(t), getElementById: id => byId[id] || null,
    addEventListener() {}, removeEventListener() {}, querySelectorAll: () => [],
    querySelector: sel => (sel === "#lobbyScreen .room-header" ? world.header : null)
  };
  const lobby = new El("div"); world.header = new El("div"); lobby.appendChild(world.header); lobby.appendChild(new El("h3"));
  const sent = [], copied = [], toasts = [], baseHandled = [];
  const counters = { stops: 0, beeps: 0 };
  const micStream = { getTracks: () => [{ stop() { counters.stops++; } }], getAudioTracks: () => [{ enabled: true }] };
  class FakeAC {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    resume() {}
    createMediaStreamDestination() { return { stream: micStream }; }
    createAnalyser() { return { fftSize: 0, getByteTimeDomainData(b) { const a = ctx.__amp || 0; for (let i = 0; i < b.length; i++) b[i] = 128 + (i % 2 ? a : -a); } }; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createOscillator() { return { type: "", frequency: { value: 0 }, connect() {}, start() { counters.beeps++; }, stop() {} }; }
    createGain() { return { gain: { value: 0, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  const fakePeer = { calls: [], handlers: {}, on(e, f) { this.handlers[e] = f; }, call(id, s) { const c = { peer: id, on() {}, close() {} }; this.calls.push(id); return c; } };
  const ctx = {
    console, document, AudioContext: FakeAC, Uint8Array, JSON, Object, Array, Promise, Date, Math, String, Number, Set, Error,
    SpeechRecognition: class { constructor() { world.sr.push(this); this.aborted = false; this.started = false; } start() { this.started = true; } abort() { this.aborted = true; } },
    Blob: class { constructor(parts, o) { this.parts = parts; this.type = o && o.type; } }, URL: { createObjectURL: b => "blob:" + b.parts.join("").length, revokeObjectURL() {} },
    navigator: { userAgent: "test", mediaDevices: { getUserMedia: async () => micStream }, clipboard: { writeText: async t => { copied.push(t); } } },
    location: { href: opts.href || "https://x.github.io/jeu/", search: opts.search || "", hash: opts.hash || "" },
    setInterval: f => { timers.push(f); return timers.length; }, clearInterval() {}, setTimeout: f => { timeouts.push(f); return timeouts.length; }, clearTimeout() {},
    v34Toast: m => toasts.push(m), prompt: () => {}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* globales du jeu telles que les voit le module */
  vm.runInContext(`
    var myId = "bbb", isHost = false, roomCode = "123456", peer = null, connections = {}, players = {};
    var __reset = 0, __base = [];
    function handleData(d) { __base.push(d); }
    function resetConnection() { __reset++; }
    var __setup = []; function setupConnection(c) { __setup.push(c); }
    function sendTo() {} function broadcast() {}
    function showMessage(id, text, type) { __msg = { id: id, text: text, type: type }; } var __msg = null;
  `, ctx);
  const ce = document.createElement; document.createElement = tg => { const e = ce(tg); if (tg === "a") e.click = () => world.downloads.push({ href: e.href, name: e.download }); return e; };
  Object.assign(world, { ctx, byId, timers, timeouts, sent, copied, toasts, fakePeer, lobby, document, El, micStream, counters });
  ctx.__world_peer = fakePeer;
  return world;
}
const tickAll = w => w.timers.forEach(f => { try { f(); } catch (e) { fails++; console.log("ÉCHEC : exception dans un minuteur : " + e.message); } });
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };

(async () => {
  /* ======================= CHAT VOCAL ======================= */
  const w = makeWorld({});
  const { ctx } = w;
  vm.runInContext(read("js/voicechat/voicechat.js"), ctx);
  ok(typeof ctx.V50Voice === "object" && typeof ctx.V50Voice.controller === "object", "le module s'expose dans la page");
  const fab = w.byId.vcFab, panel = w.byId.vcPanel;
  ok(!!fab && !!panel, "bouton et panneau créés");
  ok(!fab.classList.contains("show"), "pas de bouton hors d'une salle (peer absent)");

  /* on entre dans une salle : peer + connexion à l'hôte + joueurs */
  vm.runInContext(`peer = __world_peer; connections = { quiz: { open: true, send: function (d) { __sent.push(d); } } };
    players = { bbb: { id: "bbb", name: "Moi", avatar: "😎" }, "quiz-123456": { id: "quiz-123456", name: "<img src=x onerror=alert(1)>", avatar: "👑" }, ccc: { id: "ccc", name: "Cam", avatar: "🐸" } };`, ctx);
  ctx.__sent = w.sent;
  tickAll(w);
  ok(fab.classList.contains("show"), "le bouton 🎙️ apparaît dès qu'on est dans une salle");
  ok(typeof w.fakePeer.handlers.call === "function", "les appels entrants sont branchés sur le peer de la salle");

  fab.dispatch("click", {});
  ok(panel.classList.contains("open"), "clic sur le bouton : le panneau s'ouvre");
  ok(/data-vc="join"/.test(w.byId.vcActions.innerHTML), "le panneau propose « Rejoindre le vocal »");

  /* ---- test du son et du micro, avant de rejoindre ---- */
  const click = a => panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: a } }) } });
  ok(w.byId.vcTest && w.byId.vcTest.hidden === false, "le bloc « Tester avant de rejoindre » est visible hors vocal");
  click("testsound");
  ok(w.counters.beeps === 1 && /bip/.test(w.byId.vcTestMsg.textContent), "tester le son : un bip est joué et expliqué");
  ctx.__amp = 0; click("testmic"); await flush();
  ok(w.byId.vcMeter.hidden === false && w.byId.vcLoop.hidden === false && /Arrêter/.test(w.byId.vcTestMic.textContent), "tester le micro : barre de niveau et case « m'entendre » affichées");
  ok(/Parle/.test(w.byId.vcTestMsg.textContent), "tester le micro : consigne « Parle »");
  tickAll(w);
  ok(w.byId.vcMeterFill.style.width === "0%" && !/fonctionne/.test(w.byId.vcTestMsg.textContent), "en silence : la barre reste à 0 % et rien n'est validé");
  ctx.__amp = 60; tickAll(w);
  ok(parseInt(w.byId.vcMeterFill.style.width, 10) > 50, "quand on parle : la barre monte (" + w.byId.vcMeterFill.style.width + ")");
  ok(/fonctionne/.test(w.byId.vcTestMsg.textContent), "le test confirme que le micro fonctionne");
  panel.dispatch("change", { target: { id: "vcLoopBox", checked: true } });
  ok(/casque/.test(w.byId.vcTestMsg.textContent), "« m'entendre » rappelle de mettre un casque");
  const stopsBefore = w.counters.stops; click("testmic");
  ok(w.byId.vcMeter.hidden === true && w.byId.vcLoop.hidden === true && /Tester mon micro/.test(w.byId.vcTestMic.textContent) && w.counters.stops > stopsBefore, "arrêter le test : barre masquée et micro réellement coupé");
  tickAll(w);
  ok(w.byId.vcMeterFill.style.width === "0%", "après l'arrêt, le minuteur n'anime plus la barre");
  /* micro refusé */
  const realGUM = ctx.navigator.mediaDevices.getUserMedia;
  ctx.navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error("x"), { name: "NotAllowedError" }); };
  click("testmic"); await flush();
  ok(/refusé/.test(w.byId.vcTestMsg.textContent) && w.byId.vcMeter.hidden === true, "micro refusé : message clair, pas de barre");
  ctx.navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error("x"), { name: "NotFoundError" }); };
  click("testmic"); await flush();
  ok(/Aucun micro/.test(w.byId.vcTestMsg.textContent), "aucun micro : message dédié");
  ctx.navigator.mediaDevices.getUserMedia = realGUM;
  /* test en cours puis « Rejoindre » : le test s'arrête tout seul */
  click("testmic"); await flush();
  ok(w.byId.vcMeter.hidden === false, "(nouveau test lancé)");
  const stops2 = w.counters.stops;

  /* clic sur « Rejoindre » */
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "join" } }) } });
  ok(w.counters.stops > stops2 && w.byId.vcMeter.hidden === true, "au clic sur « Rejoindre », le micro du test est libéré tout de suite (avant d'ouvrir celui du vocal)");
  await flush();
  ok(w.sent.some(d => d.type === "vc" && d.op === "join" && d.id === "bbb"), "rejoindre : l'invité prévient l'hôte (message vc/join avec son identifiant)");
  ok(/data-vc="leave"/.test(w.byId.vcActions.innerHTML) && /data-vc="mute"/.test(w.byId.vcActions.innerHTML), "après avoir rejoint : boutons micro et quitter");
  ok(w.byId.vcMeter.hidden === true && w.counters.stops > stops2, "rejoindre le vocal arrête le test et libère le micro du test");
  ok(w.byId.vcTest.hidden === false && /Tester mon micro et mon son/.test(w.byId.vcTestTitle.textContent), "le bloc de test reste visible une fois au vocal (titre adapté)");
  ok(fab.classList.contains("live"), "le bouton passe en vert quand on est au vocal");

  /* l'hôte renvoie l'annuaire : « bbb » appelle « ccc » (plus grand) ; « quiz-123456 » > « bbb » aussi */
  ctx.handleData({ type: "vcState", members: ["bbb", "quiz-123456", "ccc"] });
  await flush();
  ok(w.fakePeer.calls.slice().sort().join() === "ccc,quiz-123456", "l'annuaire déclenche les appels vers les plus grands identifiants (" + w.fakePeer.calls.join(",") + ")");
  const list = w.byId.vcList.innerHTML;
  ok(/Moi \(toi\)/.test(list) && /Cam/.test(list), "la liste affiche les participants");
  ok(!/<img/.test(list) && /&lt;img/.test(list), "les pseudos sont échappés dans le panneau (pas d'injection HTML)");
  ok(w.toasts.some(t => /Cam a rejoint le vocal/.test(t)), "une notification annonce qui rejoint le vocal");

  /* handleData : les messages du jeu passent, ceux du vocal sont absorbés */
  ctx.handleData({ type: "chat", text: "salut" });
  vm.runInContext("", ctx);
  ok(ctx.__base.length === 1 && ctx.__base[0].type === "chat", "les autres messages du jeu continuent vers le gestionnaire d'origine");
  ok(!ctx.__base.some(d => d.type === "vcState" || d.type === "vc"), "les messages du vocal ne polluent pas le jeu");

  /* ---- test PENDANT le vocal : on mesure le micro déjà ouvert, sans nouvelle autorisation ---- */
  const gum0 = ctx.navigator.mediaDevices.getUserMedia; let gumCalls = 0;
  ctx.navigator.mediaDevices.getUserMedia = async (...a) => { gumCalls++; return gum0(...a); };
  ctx.__amp = 0; const stopsLive = w.counters.stops;
  click("testmic"); await flush();
  ok(gumCalls === 0, "test en direct : aucune nouvelle demande d'accès au micro");
  ok(w.byId.vcMeter.hidden === false && /Arrêter/.test(w.byId.vcTestMic.textContent) && /Parle/.test(w.byId.vcTestMsg.textContent), "test en direct : barre de niveau et consigne affichées");
  tickAll(w);
  ok(w.byId.vcMeterFill.style.width === "0%" && !/fonctionne/.test(w.byId.vcTestMsg.textContent), "test en direct, en silence : rien n'est validé");
  ok(!/vc-row talk/.test(w.byId.vcList.innerHTML), "en silence, ta ligne n'est pas marquée « parle »");
  ctx.__amp = 60; tickAll(w);
  ok(parseInt(w.byId.vcMeterFill.style.width, 10) > 50 && /fonctionne/.test(w.byId.vcTestMsg.textContent), "test en direct : la barre monte et le micro est validé");
  ok(/vc-row talk"><span class="vc-av">😎/.test(w.byId.vcList.innerHTML), "quand tu parles, ta propre ligne s'allume (indicateur « parle » pour toi aussi)");
  click("testmic");
  ok(w.byId.vcMeter.hidden === true && w.counters.stops === stopsLive, "arrêter le test en direct ne coupe PAS le micro du vocal");
  ctx.__amp = 0; tickAll(w);
  click("testmic"); await flush();
  ok(w.byId.vcMeter.hidden === false, "(test en direct relancé)");
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "mute" } }) } });
  ok(w.byId.vcMeter.hidden === true && w.counters.stops === stopsLive, "couper le micro arrête le test en direct sans fermer le micro");
  click("testmic");
  ok(/coupé/.test(w.byId.vcTestMsg.textContent) && w.byId.vcMeter.hidden === true, "tester pendant que le micro est coupé : message clair, pas de barre");
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "mute" } }) } });
  ok(/Couper mon micro/.test(w.byId.vcActions.innerHTML), "(micro réactivé)");
  ctx.navigator.mediaDevices.getUserMedia = gum0;

  /* ---- durée de l'appel, « qui parle », temps de parole (horloge simulée) ---- */
  const RealDate = Date, FD = class extends RealDate { static now() { return FD.t; } };
  FD.t = RealDate.now() + 125000; ctx.Date = FD;
  ctx.__amp = 0; tickAll(w);
  ok(/^⏱ 2:0[5-6] · 3 au vocal$/.test(w.byId.vcClock.textContent) && w.byId.vcClock.hidden === false, "le panneau affiche la durée de l'appel et le nombre de personnes (« " + w.byId.vcClock.textContent + " »)");
  const now1 = w.byId.vcNow;
  ok(now1.classList.contains("show") && /^⏱ 2:0[5-6]$/.test(now1.textContent) && !now1.classList.contains("talk"), "la pastille près du bouton montre la durée même panneau fermé, sans personne qui parle");
  ctx.__amp = 60;
  for (let i = 0; i < 6; i++) { FD.t += 400; tickAll(w); }
  ok(/🗣️ Toi/.test(now1.textContent) && now1.classList.contains("talk"), "quand je parle, la pastille l'indique (« " + now1.textContent + " »)");
  ok(/vc-state">🎤 · 0:0[1-9]/.test(w.byId.vcList.innerHTML), "le temps de parole s'affiche à côté de mon nom");
  ctx.__amp = 0; FD.t += 2000; tickAll(w);
  ok(!/🗣️/.test(now1.textContent) && !now1.classList.contains("talk"), "quand plus personne ne parle, la mention disparaît");
  FD.t += 3600000; tickAll(w);
  ok(/^⏱ 1:02:/.test(now1.textContent), "au-delà d'une heure : format h:mm:ss (« " + now1.textContent + " »)");
  ctx.Date = RealDate;

  /* ---- transcription ---- */
  ok(w.byId.vcTr.hidden === false && /Transcrire ma voix/.test(w.byId.vcTrBtn.textContent) && w.sr.length === 0, "au vocal : le bloc transcription est là, éteint par défaut (aucune reconnaissance lancée)");
  click("trtoggle");
  ok(w.sr.length === 1 && w.sr[0].started && w.sr[0].continuous !== false && w.sr[0].lang === "fr-FR" && /Arrêter/.test(w.byId.vcTrBtn.textContent), "activer : la reconnaissance démarre en français et le bouton passe à « Arrêter »");
  const sr1 = w.sr[0], res = (txt, fin) => Object.assign([{ transcript: txt }], { isFinal: fin });
  sr1.onresult({ resultIndex: 0, results: [res("je sui", false)] });
  ok(/je sui/.test(w.byId.vcTrInterim.textContent), "le texte en cours s'affiche en grisé");
  sr1.onresult({ resultIndex: 0, results: [res("  bonjour   tout le monde ", true)] });
  ok(w.sent.some(d => d.type === "vcText" && d.text === "bonjour tout le monde"), "la phrase terminée est envoyée à l'hôte (vcText)");
  ok(/Toi<\/b> bonjour tout le monde/.test(w.byId.vcTrLog.innerHTML), "et elle s'affiche dans ma transcription");
  const conn = { peer: "quiz-123456", handlers: {}, on(e, f) { (this.handlers[e] = this.handlers[e] || []).push(f); } };
  ctx.setupConnection(conn);
  ok(ctx.__setup[0] === conn, "setupConnection d'origine toujours appelée");
  const emit = d => (conn.handlers.data || []).forEach(f => f(d));
  emit({ type: "vcLine", id: "ccc", text: "Salut <b>Léo</b>" });
  ok(/Cam<\/b> Salut &lt;b&gt;Léo&lt;\/b&gt;/.test(w.byId.vcTrLog.innerHTML) && !/<b>Léo/.test(w.byId.vcTrLog.innerHTML), "la phrase d'un autre arrive au nom de l'auteur, échappée (pas d'injection HTML)");
  ok(w.toasts.some(t => /Cam active la transcription/.test(t)), "une notification prévient qu'un participant active sa transcription");
  const nLog = w.byId.vcTrLog.innerHTML;
  emit({ type: "vcLine", id: "inconnu", text: "intrus" }); emit({ type: "vcLine", id: "ccc" }); emit({ type: "vcLine", id: "bbb", text: "écho de moi" });
  ctx.handleData({ type: "vcLine", id: "ccc", text: "sans expéditeur" }); ctx.handleData({ type: "vcText", text: "sans expéditeur" });
  ok(w.byId.vcTrLog.innerHTML === nLog && !ctx.__base.some(d => d.type === "vcLine" || d.type === "vcText"), "lignes d'inconnus ou sans expéditeur réel : ignorées, et elles ne polluent pas le jeu");
  /* le navigateur coupe la reconnaissance après un silence : on la relance */
  sr1.onend(); w.timeouts.forEach(f => f());
  ok(w.sr.length === 2 && w.sr[1].started, "après un silence, la reconnaissance est relancée automatiquement");
  /* micro coupé : pause immédiate */
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "mute" } }) } });
  ok(w.sr[1].aborted && /pause/.test(w.byId.vcTrMsg.textContent), "micro coupé : la transcription s'arrête tout de suite (rien n'est écouté ni envoyé)");
  const sentBefore = w.sent.length;
  w.sr[1].onresult && w.sr[1].onresult({ resultIndex: 0, results: [res("fantôme", true)] });
  ok(w.sent.length === sentBefore, "même un résultat tardif n'est pas envoyé quand le micro est coupé");
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "mute" } }) } });
  ok(w.sr.length === 3 && w.sr[2].started, "micro réactivé : la transcription reprend");
  /* refus du navigateur */
  w.sr[2].onerror({ error: "not-allowed" });
  ok(/refuse la transcription/.test(w.byId.vcTrMsg.textContent) && /Transcrire/.test(w.byId.vcTrBtn.textContent), "transcription refusée par le navigateur : message clair, bouton remis à zéro");
  /* copier / enregistrer */
  click("trcopy"); await flush();
  ok(w.copied.some(c => /Transcription du chat vocal/.test(c) && /\[\d{1,2}[:h]\d{2}[:h]\d{2}[^\]]*\] Moi : bonjour tout le monde/.test(c) && /Cam : Salut <b>Léo<\/b>/.test(c)), "copier : le texte brut contient l'en-tête, l'heure réelle de chaque phrase et les noms réels");
  click("trsave");
  ok(w.downloads.length === 1 && /^transcription-vocal-123456\.txt$/.test(w.downloads[0].name), "enregistrer : un fichier .txt est proposé");
  /* langue */
  click("trtoggle"); const nSr = w.sr.length;
  panel.dispatch("change", { target: { id: "vcTrLang", value: "en-US" } });
  ok(w.sr.length === nSr + 1 && w.sr[w.sr.length - 1].lang === "en-US", "changer de langue relance la reconnaissance dans la nouvelle langue");
  click("trtoggle");
  ok(w.sr[w.sr.length - 1].aborted && /Transcrire/.test(w.byId.vcTrBtn.textContent), "désactiver : la reconnaissance est arrêtée");

  /* micro coupé / son coupé */
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "mute" } }) } });
  ok(/Réactiver mon micro/.test(w.byId.vcActions.innerHTML) && fab.classList.contains("muted"), "micro coupé : le panneau et le bouton le montrent");
  panel.dispatch("click", { target: { closest: () => ({ dataset: { vc: "deaf" } }) } });
  ok(/Remettre le son/.test(w.byId.vcActions.innerHTML), "son des autres coupé : le panneau le montre");

  /* vocal rejoint SANS micro (refusé) : le test l'explique au lieu de mesurer du silence */
  click("leave"); await flush();
  ctx.navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error("x"), { name: "NotAllowedError" }); };
  click("join"); await flush();
  ok(/écoute/.test(w.byId.vcList.innerHTML) || /écoute/.test(w.byId.vcMsg.textContent), "rejoindre sans micro : mode écoute seule");
  click("testmic"); await flush();
  ok(/écoute seule/.test(w.byId.vcTestMsg.textContent) && w.byId.vcMeter.hidden === true, "tester en écoute seule : message explicatif, pas de barre");
  ok(/Rien pour l'instant/.test(w.byId.vcTrLog.innerHTML), "un nouvel appel repart d'une transcription vide");
  const nSr2 = w.sr.length; click("trtoggle");
  ok(w.sr.length === nSr2 && /écoute seule/.test(w.byId.vcTrMsg.textContent) && /Transcrire/.test(w.byId.vcTrBtn.textContent), "en écoute seule : pas de transcription de sa voix (message clair)");
  ctx.navigator.mediaDevices.getUserMedia = gum0;

  /* quitter la salle (resetConnection) : le vocal se coupe tout seul, puis la fonction d'origine est appelée */
  ctx.resetConnection();
  ok(ctx.__reset === 1, "resetConnection d'origine toujours appelée");
  vm.runInContext(`roomCode = ""; peer = null;`, ctx);
  tickAll(w);
  ok(!fab.classList.contains("live") && !fab.classList.contains("show"), "quitter la salle coupe le vocal et masque le bouton");

  /* messages bizarres : aucune exception */
  let threw = false;
  try { ctx.handleData(null); ctx.handleData({}); ctx.handleData({ type: "vcState" }); ctx.handleData({ type: "vc", op: "join" }); ctx.handleData({ type: "vcState", members: "x" }); } catch (e) { threw = true; console.log(e); }
  ok(!threw, "des messages invalides ne provoquent aucune exception");

  /* ======================= LIEN D'INVITATION ======================= */
  const wi = makeWorld({ href: "https://shawwnyy.github.io/qui-suis-je-officiel/?room=482913#x", search: "?room=482913" });
  const room = new wi.El("input"); wi.byId.roomInput = room; const nm = new wi.El("input"); wi.byId.joinName = nm;
  vm.runInContext(`var roomCode = "654321";`, wi.ctx);
  vm.runInContext(read("js/invite/invite.js"), wi.ctx);
  ok(room.value === "482913", "ouvrir ?room=482913 pré-remplit le code");
  const msg = vm.runInContext("__msg", wi.ctx);
  ok(msg && msg.id === "homeMessage" && /482913/.test(msg.text), "un message d'accueil invite à entrer son prénom");
  wi.timeouts.forEach(f => f());
  ok(nm.focused === true, "le champ prénom prend le focus");
  const btn = wi.byId.inviteBtn;
  ok(!!btn && wi.lobby.children[1] === btn, "bouton « Copier le lien d'invitation » ajouté sous l'en-tête du salon");
  btn.dispatch("click", {});
  await flush();
  ok(wi.copied[0] === "https://shawwnyy.github.io/qui-suis-je-officiel/?room=654321", "le lien copié contient le code de la salle, sans l'ancien ?room ni #ancre (" + wi.copied[0] + ")");

  console.log("Navigateur (vocal + invitation) : " + (checks - fails) + " / " + checks + " vérifications OK" + (fails ? ", " + fails + " échec(s)" : ""));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ERREUR DU TEST :", e); process.exit(2); });
