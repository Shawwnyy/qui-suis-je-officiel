/* Tests du chat vocal (logique de mise en relation) avec un faux réseau WebRTC asynchrone.  Lancer :  node tests/voicechat.test.js
   Ce test ne remplace pas un essai avec de vrais micros : il vérifie qui appelle qui, l'annuaire tenu par l'hôte,
   les départs / arrivées tardives / coupures, et la robustesse face aux messages invalides. */
"use strict";
const V = require("../js/voicechat/voicechat.js");
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("ÉCHEC : " + m); } };
const clone = d => JSON.parse(JSON.stringify(d));

/* ---------- faux réseau ---------- */
let pending = 0;
const later = fn => { pending++; setImmediate(() => { pending--; fn(); }); };
async function settle() { for (let i = 0; i < 500 && pending > 0; i++) await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); }
class Ev { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).slice().forEach(f => f(...a)); } }
class Track { constructor() { this.enabled = true; this.stopped = false; } stop() { this.stopped = true; } }
class Stream { constructor(owner) { this.owner = owner; this.tracks = [new Track()]; } getTracks() { return this.tracks; } getAudioTracks() { return this.tracks; } }
class Call extends Ev {
  constructor(remoteId, localStream) { super(); this.peer = remoteId; this.localStream = localStream; this.closed = false; this.remote = null; }
  answer(stream) { this.localStream = stream; const r = this.remote; later(() => { r.emit("stream", this.localStream); this.emit("stream", r.localStream); }); }
  close() { if (this.closed) return; this.closed = true; const r = this.remote; later(() => { this.emit("close"); if (r && !r.closed) { r.closed = true; r.emit("close"); } }); }
}
class FakePeer extends Ev {
  constructor(id, net) { super(); this.id = id; this.net = net; this.calls = []; net.peers[id] = this; }
  call(target, stream) {
    this.net.callLog.push([this.id, target]);
    const caller = new Call(target, stream), callee = new Call(this.id, null);
    caller.remote = callee; callee.remote = caller; this.calls.push(caller);
    const tp = this.net.peers[target];
    if (tp) { tp.calls.push(callee); later(() => tp.emit("call", callee)); } else later(() => caller.emit("error", new Error("peer-unavailable")));
    return caller;
  }
}
function makeNet() { return { peers: {}, nodes: {}, players: {}, callLog: [], host: null }; }
function makeNode(net, id, host, micOk = true) {
  const node = { id, host, micOk, played: {}, stoppedIds: [], snaps: [], streams: [] };
  node.peer = new FakePeer(id, net);
  net.players[id] = { id, name: "J-" + id, avatar: "🙂" };
  node.ctl = V.createController({
    myId: () => id, isHost: () => host, inRoom: () => true, players: () => net.players, getPeer: () => node.peer,
    sendToHost: d => later(() => net.host.ctl.handleMessage(clone(d))),
    sendTo: (to, d) => later(() => net.nodes[to] && net.nodes[to].ctl.handleMessage(clone(d))),
    broadcast: d => Object.keys(net.nodes).forEach(to => { if (to !== id) later(() => net.nodes[to].ctl.handleMessage(clone(d))); }),
    getMicrophone: () => { const s = new Stream(id); node.streams.push(s); return Promise.resolve(node.micOk ? { stream: s, mic: true } : { stream: s, mic: false, reason: "Micro refusé : tu écoutes seulement." }); },
    playRemote: (rid, s) => { node.played[rid] = s; }, stopRemote: rid => { delete node.played[rid]; node.stoppedIds.push(rid); }, stopAll: () => {}, setDeaf: () => {},
    onChange: s => node.snaps.push(s)
  });
  node.peer.on("call", node.ctl.onCall);
  net.nodes[id] = node; if (host) net.host = node;
  return node;
}
const connectedOf = n => n.ctl.snapshot().connected.slice().sort();
const idsOf = (...ns) => ns.map(n => n.id).sort();

(async () => {
  /* ---------- fonctions pures ---------- */
  ok(JSON.stringify(V.cleanMembers(["a", "a", "b c", "", 12, null, "x".repeat(65), "ok-1", "ok_2"])) === JSON.stringify(["a", "ok-1", "ok_2"]), "cleanMembers : doublons, espaces, types et longueur");
  ok(V.cleanMembers(Array.from({ length: 30 }, (_, i) => "p" + i)).length === 8, "cleanMembers : 8 participants au plus");
  ok(JSON.stringify(V.cleanMembers(["a", "b", "c"], { a: 1, c: 1 })) === JSON.stringify(["a", "c"]), "cleanMembers : seulement les joueurs connus de la salle");
  ok(V.cleanMembers("pas un tableau").length === 0 && V.cleanMembers(undefined).length === 0, "cleanMembers : entrée invalide");
  let p = V.plan("b", ["a", "b", "c"], []);
  ok(JSON.stringify(p.call) === JSON.stringify(["c"]) && p.drop.length === 0, "plan : b n'appelle que c (plus grand identifiant)");
  p = V.plan("c", ["a", "b", "c"], []);
  ok(p.call.length === 0, "plan : c n'appelle personne (il attend les appels de a et b)");
  p = V.plan("a", ["a", "b", "c"], ["b"]);
  ok(JSON.stringify(p.call) === JSON.stringify(["c"]), "plan : pas de second appel vers b");
  p = V.plan("a", ["a", "c"], ["b", "c"]);
  ok(JSON.stringify(p.drop) === JSON.stringify(["b"]), "plan : on ferme l'appel de qui n'est plus au vocal");
  p = V.plan("a", ["b", "c"], []);
  ok(p.call.length === 0, "plan : on n'appelle personne tant qu'on n'est pas soi-même au vocal");

  /* ---------- scénario 1 : 4 joueurs rejoignent le vocal à tour de rôle ---------- */
  const net = makeNet();
  const H = makeNode(net, "quiz-123456", true), A = makeNode(net, "aaa111", false), B = makeNode(net, "mmm222", false), C = makeNode(net, "zzz333", false);
  await H.ctl.join(); await settle();
  await B.ctl.join(); await settle();
  await A.ctl.join(); await settle();
  await C.ctl.join(); await settle();
  for (const n of [H, A, B, C]) {
    const others = idsOf(...[H, A, B, C].filter(x => x !== n));
    ok(JSON.stringify(connectedOf(n)) === JSON.stringify(others), n.id + " doit entendre les 3 autres (a : " + connectedOf(n).join(",") + ")");
    ok(Object.keys(n.played).sort().join() === others.join(), n.id + " : un flux audio par autre joueur");
    ok(n.ctl.snapshot().members.length === 4, n.id + " : l'annuaire contient les 4 participants");
  }
  const pairs = net.callLog.map(([a, b]) => [a, b].sort().join("|"));
  ok(net.callLog.length === 6 && new Set(pairs).size === 6, "6 appels exactement, jamais deux pour la même paire (obtenu " + net.callLog.length + ")");
  ok(net.callLog.every(([a, b]) => a < b), "c'est toujours le plus petit identifiant qui appelle");

  /* ---------- scénario 2 : un joueur quitte le vocal ---------- */
  const bStream = B.streams[0];
  B.ctl.leave(false); await settle();
  for (const n of [H, A, C]) {
    ok(!connectedOf(n).includes("mmm222") && !n.ctl.snapshot().members.includes("mmm222"), n.id + " ne doit plus avoir mmm222");
    ok(!n.played["mmm222"], n.id + " : le flux de mmm222 est arrêté");
  }
  ok(bStream.tracks.every(t => t.stopped), "le micro de celui qui quitte est bien coupé");
  ok(B.ctl.snapshot().joined === false && connectedOf(B).length === 0, "celui qui quitte n'a plus aucun appel");
  ok(JSON.stringify(connectedOf(H)) === JSON.stringify(idsOf(A, C)), "les autres restent reliés entre eux");

  /* ---------- scénario 3 : arrivée tardive + annuaire envoyé au nouveau ---------- */
  const D = makeNode(net, "ddd444", false);
  H.ctl.hostSendStateTo("ddd444"); await settle();
  ok(D.ctl.snapshot().members.length === 3 && !D.ctl.snapshot().joined, "le nouvel arrivant reçoit l'annuaire sans rejoindre le vocal (badge « X au vocal »)");
  await D.ctl.join(); await settle();
  ok(JSON.stringify(connectedOf(D)) === JSON.stringify(idsOf(H, A, C)), "l'arrivant tardif entend tout le monde (a : " + connectedOf(D).join(",") + ")");
  ok(connectedOf(A).includes("ddd444") && connectedOf(C).includes("ddd444") && connectedOf(H).includes("ddd444"), "et tout le monde l'entend");

  /* ---------- scénario 4 : micro coupé ---------- */
  A.ctl.setMuted(true);
  ok(A.streams[0].tracks.every(t => t.enabled === false) && A.ctl.snapshot().muted, "micro coupé : la piste est désactivée");
  A.ctl.setMuted(false);
  ok(A.streams[0].tracks.every(t => t.enabled === true), "micro réactivé");

  /* ---------- scénario 5 : micro refusé = écoute seulement ---------- */
  const L = makeNode(net, "lll555", false, false);
  await L.ctl.join(); await settle();
  ok(L.ctl.snapshot().joined && L.ctl.snapshot().listenOnly && /refusé/.test(L.ctl.snapshot().error), "micro refusé : rejoint en écoute seule avec un message clair");
  ok(JSON.stringify(connectedOf(L)) === JSON.stringify(idsOf(H, A, C, D)), "l'auditeur reçoit bien la voix de tous (a : " + connectedOf(L).join(",") + ")");
  ok(connectedOf(A).includes("lll555"), "les autres le voient connecté");

  /* ---------- scénario 6 : coupure réseau puis reprise automatique ---------- */
  const before = net.callLog.length;
  [A.peer, C.peer].forEach(pe => pe.calls.filter(c => c.peer === "zzz333" || c.peer === "aaa111").forEach(c => { c.closed = true; c.emit("close"); }));
  ok(!connectedOf(A).includes("zzz333"), "après une coupure, le lien n'apparaît plus comme connecté");
  A.ctl.tick(); await settle();
  ok(connectedOf(A).includes("zzz333") && connectedOf(C).includes("aaa111"), "le vérificateur périodique relance l'appel coupé");
  ok(net.callLog.length === before + 1, "un seul nouvel appel (pas de doublon) : " + (net.callLog.length - before));

  /* ---------- scénario 7 : joueur déconnecté du jeu (sans quitter le vocal) ---------- */
  delete net.players["ddd444"]; delete net.nodes["ddd444"];
  H.ctl.tick(); await settle();
  ok(!H.ctl.snapshot().members.includes("ddd444") && !A.ctl.snapshot().members.includes("ddd444"), "l'hôte retire du vocal les joueurs qui ont quitté la salle");
  ok(!connectedOf(A).includes("ddd444") && !connectedOf(H).includes("ddd444"), "et les autres ferment l'appel correspondant");

  /* ---------- scénario 8 : messages invalides ou malveillants ---------- */
  const mBefore = JSON.stringify(A.ctl.snapshot().members);
  A.ctl.handleMessage({ type: "vc", op: "join", id: "evil" });
  ok(JSON.stringify(A.ctl.snapshot().members) === mBefore, "un invité ignore les messages « vc » (seul l'hôte tient l'annuaire)");
  const hBefore = JSON.stringify(H.ctl.snapshot().members);
  H.ctl.handleMessage({ type: "vc", op: "join", id: "inconnu-hors-salle" }); await settle();
  H.ctl.handleMessage({ type: "vc", op: "join", id: "bad id <script>" }); await settle();
  H.ctl.handleMessage({ type: "vc", op: "join", id: 42 }); await settle();
  H.ctl.handleMessage({ type: "vc", op: "kick-everyone", id: "aaa111" }); await settle();
  H.ctl.handleMessage(null); H.ctl.handleMessage({ type: "vc" });
  ok(JSON.stringify(H.ctl.snapshot().members) === hBefore, "l'hôte ignore les joueurs hors salle, les identifiants invalides et les opérations inconnues");
  H.ctl.handleMessage({ type: "vcState", members: ["x"] });
  ok(JSON.stringify(H.ctl.snapshot().members) === hBefore, "l'hôte ignore un « vcState » reçu (il en est la source)");
  const big = Array.from({ length: 60 }, (_, i) => "g" + i).concat(["a b", 7, null]);
  A.ctl.handleMessage({ type: "vcState", members: big });
  ok(A.ctl.snapshot().members.length === 8 && A.ctl.snapshot().members.every(m => /^[\w-]+$/.test(m)), "un « vcState » énorme est borné à 8 identifiants valides");
  A.ctl.handleMessage({ type: "vcState", members: H.ctl.snapshot().members }); await settle();   /* retour à l'état réel */
  const X = makeNode(net, "xxx999", false);
  const fake = new Call("zzz333", null); fake.remote = new Call("xxx999", null);
  X.ctl.onCall(fake); await settle();
  ok(fake.closed && connectedOf(X).length === 0, "un appel entrant est refusé quand on n'est pas au vocal");

  /* ---------- scénario 9 : l'hôte quitte le vocal, puis tout le monde part ---------- */
  H.ctl.leave(false); await settle();
  ok(!A.ctl.snapshot().members.includes("quiz-123456") && !connectedOf(A).includes("quiz-123456"), "l'hôte qui quitte le vocal disparaît de l'annuaire des autres");
  for (const n of [A, C, L]) n.ctl.leave(true);
  await settle();
  ok([A, C, L, H].every(n => connectedOf(n).length === 0 && !n.ctl.snapshot().joined), "tout est propre après le départ de tous");

  console.log("Chat vocal : " + (checks - fails) + " / " + checks + " vérifications OK" + (fails ? ", " + fails + " échec(s)" : ""));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("ERREUR DU TEST :", e); process.exit(2); });
