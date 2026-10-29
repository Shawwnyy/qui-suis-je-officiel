/* =============================================================================
   👥 Équipes : choix de l'équipe, répartition, chat d'équipe, bouton « Montrer le classement »
   S'appuie sur le mode « Équipes » existant (window.v9GameMode === "teams", players[id].team, window.v9Teams).
   - Les joueurs choisissent leur équipe d'un clic (liste des équipes avec leurs membres) tant que la partie n'a pas commencé ;
     l'hôte peut verrouiller les équipes, répartir au hasard, équilibrer ; un nouveau joueur rejoint l'équipe la moins remplie.
   - Chat d'équipe : seuls les coéquipiers reçoivent les messages (l'hôte les reçoit aussi pour modérer : c'est dit dans le panneau).
     Même modération que le chat de la salle (insultes, épellation, sourdine, verrouillage, bannis), anti-spam.
   - L'identité de l'expéditeur vient de la connexion réseau, jamais du contenu du message.
   - Bouton 🏁 de l'hôte : montre le classement à tous les joueurs à tout moment de la partie (voir 043-v51-mi-partie.js).
   La logique est testée dans tests/teams.test.js.
   ============================================================================= */
var V52Teams = (function () {
  "use strict";
  var MAX_TEXT = 140, MAX_NAME = 30, KEEP = 100;
  function str(x, n) { return typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n) : ""; }
  function names(teams) { return Object.keys(teams || {}).filter(Boolean); }
  function members(players, team) { return Object.keys(players || {}).filter(function (id) { return players[id] && team && players[id].team === team; }); }
  function counts(players, tn) {
    var c = {}; tn.forEach(function (t) { c[t] = 0; });
    Object.keys(players || {}).forEach(function (id) { var t = players[id] && players[id].team; if (Object.prototype.hasOwnProperty.call(c, t)) c[t]++; });
    return c;
  }
  function lowest(c, tn) { var best = null; tn.forEach(function (t) { if (best === null || c[t] < c[best]) best = t; }); return best; }
  /* Équipe la moins remplie (la première en cas d'égalité) */
  function smallest(players, tn) { return tn.length ? lowest(counts(players, tn), tn) : null; }
  /* Répartition équilibrée : retourne { idJoueur: équipe } sans rien modifier.
     opt.onlyMissing : seuls les joueurs sans équipe valide ; opt.rng : fonction () → [0,1[ pour mélanger */
  function distribute(players, tn, opt) {
    opt = opt || {};
    if (!tn.length) return {};
    var ids = Object.keys(players || {});
    var list = opt.onlyMissing ? ids.filter(function (id) { return tn.indexOf(players[id] && players[id].team) < 0; }) : ids.slice();
    if (opt.rng) for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(opt.rng() * (i + 1)); var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
    var c = opt.onlyMissing ? counts(players, tn) : counts({}, tn), out = {};
    list.forEach(function (id) { var t = lowest(c, tn); out[id] = t; c[t]++; });
    return out;
  }
  function ordinal(r) { return r === 1 ? "1re" : r + "e"; }
  /* Score par équipe (somme des scores), classé ; égalité = même rang */
  function teamScores(players) {
    var map = {}, order = [];
    Object.keys(players || {}).forEach(function (id) {
      var p = players[id] || {}, t = p.team; if (!t) return;
      if (!map[t]) { map[t] = { name: str(String(t), MAX_NAME), score: 0, count: 0, i: order.length }; order.push(t); }
      map[t].score += Number(p.score) || 0; map[t].count++;
    });
    var list = order.map(function (t) { return map[t]; });
    list.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    return list.map(function (t, k) {
      var tie = k > 0 && list[k - 1].score === t.score;
      t.rank = tie ? list[k - 1].rank : k + 1;
      return { name: t.name, score: t.score, count: t.count, rank: t.rank, label: ordinal(t.rank) };
    });
  }
  /* Demande de changement d'équipe reçue d'un joueur : vérifie tout (mode, moment, verrou, équipe existante) */
  function checkPick(env, pid, team, byHost) {
    var p = env.players()[pid];
    if (!p) return { ok: false, message: "" };
    if (!env.teamsOn()) return { ok: false, message: "Le mode équipes n'est pas actif." };
    if (env.started()) return { ok: false, message: "La partie a commencé : les équipes ne changent plus." };
    if (env.locked() && !p.host && !byHost) return { ok: false, message: "🔒 L'hôte a verrouillé les équipes." };
    team = typeof team === "string" ? team : "";
    if (names(env.teams()).indexOf(team) < 0) return { ok: false, message: "Cette équipe n'existe pas." };
    return { ok: true, team: team };
  }
  /* Message reçu : jamais fait confiance (taille, types) ; l'équipe doit être celle du lecteur (l'hôte lit tout) */
  function cleanChat(ev, myTeam, iAmHost) {
    if (!ev || ev.type !== "v52Chat") return null;
    var text = str(ev.text, MAX_TEXT).replace(/\s+/g, " ").trim(), team = str(ev.team, MAX_NAME);
    if (!text || !team) return null;
    if (!iAmHost && team !== myTeam) return null;
    var id = str(String(ev.id === undefined ? "" : ev.id), 60).replace(/[^\w-]/g, "");
    if (!id) return null;
    var time = /^\d{2}:\d{2}:\d{2}$/.test(String(ev.time || "")) ? ev.time : "";
    return { type: "v52Chat", id: id, playerId: str(String(ev.playerId === undefined ? "" : ev.playerId), 64), name: str(ev.name, 24) || "Joueur", team: team, text: text, time: time };
  }
  /* Hôte : contrôle puis distribution d'un message d'équipe.
     env : players(), teamsOn(), banned(id), locked(), muted(id), filter(texte, id, msgId) → {ok,text,why,label,message}, now(), stamp(),
           deliver(listeIds, évènement), isMine(id) */
  function relayFactory(env) {
    var hist = {}, seen = {};
    return function relay(raw) {
      raw = raw || {};
      var pid = String(raw.playerId || ""), p = env.players()[pid];
      if (!p) return { ok: false, why: "unknown" };
      if (!env.teamsOn()) return { ok: false, why: "off", message: "Le chat d'équipe n'est pas actif." };
      if (!p.team) return { ok: false, why: "noteam", message: "Choisis d'abord une équipe." };
      if (env.banned(pid)) return { ok: false, why: "banned" };
      if (env.locked() && !p.host) return { ok: false, why: "locked", message: "🔒 Le chat est verrouillé par l'hôte." };
      if (env.muted(pid)) return { ok: false, why: "muted", message: "🔇 Tu as été mis en sourdine par l'hôte." };
      var now = env.now(), h = (hist[pid] || []).filter(function (t) { return now - t < 3000; });
      if (h.length >= 6) { hist[pid] = h; return { ok: false, why: "rate", message: "⏳ Trop de messages d'un coup, patiente un instant." }; }
      var id = str(String(raw.id === undefined ? "" : raw.id), 60).replace(/[^\w-]/g, "") || ("t" + pid.slice(0, 10) + "-" + now.toString(36));
      if (seen[id]) return { ok: false, why: "dup" };
      var f = env.filter(raw.text, pid, id);
      if (!f.ok) return { ok: false, why: f.why || "blocked", blocked: f.why === "blocked", label: f.label, message: f.message || "" };
      h.push(now); hist[pid] = h; seen[id] = true;
      var keys = Object.keys(seen); if (keys.length > 400) delete seen[keys[0]];
      var out = { type: "v52Chat", id: id, playerId: pid, name: str(p.name, 24), team: str(String(p.team), MAX_NAME), text: f.text, time: env.stamp() };
      var to = members(env.players(), p.team);
      Object.keys(env.players()).forEach(function (hid) { if (env.players()[hid] && env.players()[hid].host && to.indexOf(hid) < 0) to.push(hid); });
      env.deliver(to, out);
      return { ok: true, out: out, to: to };
    };
  }
  return { MAX_TEXT: MAX_TEXT, KEEP: KEEP, names: names, members: members, counts: counts, smallest: smallest, distribute: distribute, teamScores: teamScores, checkPick: checkPick, cleanChat: cleanChat, relayFactory: relayFactory, str: str };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V52Teams;

/* ---------- Branchement dans le jeu (navigateur seulement) ---------- */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof handleData !== "function" || typeof setupConnection !== "function") return;
  window.V52Teams = V52Teams;
  var S = { locked: false, msgs: [], open: false, unread: 0, last: 0, lastMode: "", sig: "", noteT: 0 };
  window.V52State = S;
  function $(id) { return document.getElementById(id); }
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function adm() { return window.v12AdminState || { muted: new Set(), chatLocked: false }; }
  function started() { return typeof gameStarted !== "undefined" && !!gameStarted; }
  function teamsOn() { return window.v9GameMode === "teams"; }
  function myTeam() { var p = typeof players === "object" && players ? players[myId] : null; return p && p.team ? String(p.team) : ""; }
  function hostConn() { return Object.values(connections || {}).find(function (c) { return c && c.open; }) || null; }
  function stamp() { return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  function say(t) { try { showBanner(t); } catch (e) {} }
  /* ----- Filtre : mêmes règles que le chat de la salle ----- */
  function filter(raw, pid, id) {
    var t = String(raw == null ? "" : raw);
    try { if (window.Moderation) { var v = window.Moderation.check(t); if (v && v.blocked) return { ok: false, why: "blocked", label: v.label }; } } catch (e) {}
    var s = t.replace(/\s+/g, " ").trim().slice(0, V52Teams.MAX_TEXT);
    if (!s) return { ok: false, why: "empty", message: "Message vide." };
    try { if (window.Moderation && window.Moderation.sequence) { var sq = window.Moderation.sequence(pid, s, Date.now(), id); if (sq && sq.blocked) return { ok: false, why: "blocked", label: sq.label || "contournement du filtre" }; } } catch (e) {}
    var chk; try { chk = profanityCheck(s); } catch (e) { chk = { clean: s }; }
    if (chk && chk.blocked) return { ok: false, why: "blocked", label: "langage interdit" };
    var clean = String((chk && chk.clean) || s).slice(0, V52Teams.MAX_TEXT).trim();
    if (!clean) return { ok: false, why: "empty", message: "Message vide." };
    try { if (window.Moderation) { var v2 = window.Moderation.check(clean); if (v2 && v2.blocked) return { ok: false, why: "blocked", label: v2.label }; } } catch (e) {}
    var one = false; try { one = typeof isOneLetterMsg === "function" ? isOneLetterMsg(clean) : false; } catch (e) {}
    if (one) return { ok: false, why: "oneletter", message: "🗑️ Message d'une seule lettre supprimé automatiquement." };
    return { ok: true, text: clean };
  }
  /* Message interdit : avertissement puis sourdine (même échelle que le chat de la salle) */
  function punish(pid, res) {
    var note = "🚫 Message supprimé : " + (res.label || "langage interdit") + ".";
    if (pid !== myId) {
      var st = null; try { st = window.Moderation && window.Moderation.strike && window.Moderation.strike(pid); } catch (e) {}
      if (st && st.muteMs) {
        var A = adm(); try { A.muted.add(pid); setTimeout(function () { try { A.muted.delete(pid); } catch (e) {} }, st.muteMs); } catch (e) {}
        note += " Avertissement n°" + st.count + " : sourdine " + (st.muteMs >= 60000 ? Math.round(st.muteMs / 60000) + " min" : Math.round(st.muteMs / 1000) + " s") + ".";
      } else if (st) note += " Premier avertissement : au prochain message interdit, tu seras mis en sourdine.";
    }
    return note;
  }
  var relay = V52Teams.relayFactory({
    players: function () { return players; }, teamsOn: teamsOn,
    banned: function (id) { try { return !!(window.v36Banned && window.v36Banned.ids.has(id)); } catch (e) { return false; } },
    locked: function () { return !!adm().chatLocked; }, muted: function (id) { try { return !!adm().muted.has(id); } catch (e) { return false; } },
    filter: filter, now: Date.now, stamp: stamp,
    deliver: function (ids, ev) { ids.forEach(function (id) { if (id === myId) receive(ev); else sendTo(id, ev); }); }
  });
  function hostRelay(raw) {
    var res = relay(raw);
    if (res.ok) return;
    var pid = String(raw.playerId || "");
    var msg = res.message || "";
    if (res.why === "blocked") msg = punish(pid, res);
    if (!msg) return;
    if (pid === myId) warn(msg); else sendTo(pid, { type: "v52Reject", message: String(msg).slice(0, 200) });
  }
  /* ----- Panneau du chat d'équipe ----- */
  function warn(t) { var w = $("v52Warn"); if (!w) return; w.textContent = t; clearTimeout(S.noteT); S.noteT = setTimeout(function () { w.textContent = ""; }, 4500); }
  function receive(raw) {
    var ev = V52Teams.cleanChat(raw, myTeam(), isHost);
    if (!ev || S.msgs.some(function (m) { return m.id === ev.id; })) return;
    ev.time = ev.time || stamp();
    S.msgs.push(ev); if (S.msgs.length > V52Teams.KEEP) S.msgs.shift();
    paintMsg(ev);
    if (!S.open && ev.playerId !== myId) { S.unread++; paintBadge(); }
  }
  function paintMsg(ev) {
    var L = $("v52List"); if (!L) return;
    var atBottom = L.scrollHeight - L.scrollTop - L.clientHeight < 80;
    var d = mk("div", "v52-msg" + (ev.playerId === myId ? " mine" : "")), h = mk("div", "v52-head");
    h.appendChild(mk("b", "", "@" + ev.name)); if (isHost && ev.team !== myTeam()) h.appendChild(mk("span", "v52-tag", "👥 " + ev.team));
    h.appendChild(mk("time", "", ev.time)); d.appendChild(h); d.appendChild(mk("span", "v52-text", ev.text));
    L.appendChild(d);
    while (L.children.length > V52Teams.KEEP) L.removeChild(L.firstElementChild);
    if (atBottom || ev.playerId === myId) L.scrollTop = L.scrollHeight;
  }
  function paintBadge() { var b = $("v52Badge"); if (b) { b.textContent = S.unread > 9 ? "9+" : String(S.unread); b.style.display = S.unread ? "flex" : "none"; } }
  function build() {
    if ($("v52Panel")) return;
    var p = mk("div", "v52-panel"); p.id = "v52Panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Chat d'équipe");
    var head = mk("div", "v52-phead"), title = mk("span", "", "👥 Chat d'équipe"); title.id = "v52Title";
    var x = mk("button", "v52-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fermer le chat d'équipe"); x.onclick = function () { toggle(false); };
    head.appendChild(title); head.appendChild(x);
    var hint = mk("div", "v52-hint"); hint.id = "v52Hint";
    var list = mk("div", "v52-list"); list.id = "v52List"; list.setAttribute("aria-live", "polite");
    var warnEl = mk("div", "v52-warn"); warnEl.id = "v52Warn";
    var form = mk("div", "v52-form"), inp = mk("input"), send = mk("button", "", "➤");
    inp.id = "v52Input"; inp.maxLength = V52Teams.MAX_TEXT; inp.placeholder = "Message pour ton équipe…"; inp.autocomplete = "off"; inp.setAttribute("aria-label", "Message pour ton équipe");
    send.type = "button"; send.id = "v52Send"; send.setAttribute("aria-label", "Envoyer à l'équipe"); send.onclick = submit;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    form.appendChild(inp); form.appendChild(send);
    p.appendChild(head); p.appendChild(hint); p.appendChild(list); p.appendChild(warnEl); p.appendChild(form);
    document.body.appendChild(p);
    S.msgs.forEach(paintMsg);
  }
  function submit() {
    var inp = $("v52Input"); if (!inp) return;
    var text = inp.value; if (!text.trim()) return;
    if (!teamsOn() || !myTeam()) { warn("Choisis d'abord une équipe."); return; }
    var now = Date.now(); if (now - S.last < 350) { warn("⏳ Doucement, un message à la fois."); return; }
    var f = filter(text, myId, "x");
    if (!f.ok) {
      if (f.why === "blocked") { inp.value = ""; warn("🚫 Message supprimé : " + (f.label || "langage interdit") + "."); if (!isHost) { var c0 = hostConn(); if (c0) { try { c0.send({ type: "v36ChatViolation", playerId: myId, text: String(text).slice(0, 400), time: stamp() }); } catch (e) {} } } }
      else if (f.why === "oneletter" || f.message) { inp.value = ""; warn(f.message || "Message refusé."); }
      return;
    }
    var m = { type: "v52Chat", id: "t" + String(myId).replace(/[^\w-]/g, "").slice(0, 14) + "-" + now.toString(36) + "-" + Math.floor(Math.random() * 1296).toString(36), text: f.text, time: stamp() };
    S.last = now;
    if (isHost) { m.playerId = myId; hostRelay(m); inp.value = ""; return; }
    var c = hostConn(); if (!c) { warn("📡 Pas de connexion à l'hôte : message non envoyé."); return; }
    try { c.send(m); inp.value = ""; } catch (e) { warn("📡 Message non envoyé."); }
  }
  function toggle(open) {
    build(); S.open = typeof open === "boolean" ? open : !S.open;
    var p = $("v52Panel"); p.classList.toggle("open", S.open);
    if (S.open) {
      S.unread = 0; paintBadge();
      try { if (window.innerWidth < 1100 && chatState && chatState.open) toggleChat(); } catch (e) {}
      var inp = $("v52Input"); if (inp) { try { inp.focus({ preventScroll: true }); } catch (e) {} }
      var L = $("v52List"); if (L) L.scrollTop = L.scrollHeight;
    }
  }
  window.toggleTeamChat = toggle;
  /* ----- Raccourcis du dock : chat d'équipe (équipes) et classement (hôte) ----- */
  function dockButton(id, label, title, fn) {
    var dock = $("dock"); if (!dock || $(id)) return $(id);
    var b = mk("button", "", label); b.id = id; b.type = "button"; b.title = title; b.setAttribute("aria-label", title); b.onclick = fn; b.style.display = "none";
    dock.insertBefore(b, dock.firstChild); return b;
  }
  function showRankToAll() {
    if (!isHost || !started()) return;
    var now = Date.now(); if (now - (showRankToAll.t || 0) < 2500) { say("⏳ Patiente un instant avant de réafficher le classement."); return; }
    showRankToAll.t = now;
    if (window.V51HalfUI && typeof window.V51HalfUI.manual === "function") window.V51HalfUI.manual();
  }
  window.showRankToAll = showRankToAll;
  function mountDock() {
    if (!$("dock")) return;
    var t = dockButton("dockTeam", "👥", "Chat d'équipe", function () { toggle(); });
    if (t && !$("v52Badge")) { var b = mk("span", "", ""); b.id = "v52Badge"; b.className = "v52-badge"; t.appendChild(b); }
    dockButton("dockRank", "🏁", "Montrer le classement à tous les joueurs", showRankToAll);
  }
  /* ----- Choix de l'équipe (invités : salle d'attente ; hôte : salon) ----- */
  function pickTeam(team) {
    if (isHost) { var c = V52Teams.checkPick(hostEnv(), myId, team); if (!c.ok) { say(c.message); return; } if (typeof assignTeamV9 === "function") assignTeamV9(myId, team); return; }
    var conn = hostConn(); if (!conn) { say("📡 Pas de connexion à l'hôte."); return; }
    try { conn.send({ type: "v9TeamRequest", playerId: myId, team: team }); } catch (e) {}
  }
  function teamBox(parent, id) {
    var box = $(id); if (box) { box.textContent = ""; return box; }
    box = mk("div", "v52-pick"); box.id = id; parent.appendChild(box); return box;
  }
  function teamButtons(box) {
    var tn = V52Teams.names(window.v9Teams), mine = myTeam(), locked = S.locked && !isHost;
    var row = mk("div", "v52-teams");
    tn.forEach(function (t) {
      var ms = V52Teams.members(players, t), b = mk("button", "v52-team" + (t === mine ? " on" : ""));
      b.type = "button"; b.disabled = locked || started(); b.setAttribute("aria-pressed", t === mine ? "true" : "false");
      b.appendChild(mk("b", "", "👥 " + t + " (" + ms.length + ")"));
      b.appendChild(mk("small", "", ms.map(function (id) { return players[id].name; }).join(", ") || "Personne pour l'instant"));
      b.onclick = function () { pickTeam(t); };
      row.appendChild(b);
    });
    box.appendChild(row);
  }
  function renderGuest() {
    var card = document.querySelector("#waitingScreen .card"); if (!card) return;
    var anchor = $("waitingPlayers") || $("v9GuestMode") || $("rulesGuestNote");
    var box = $("v52GuestPick"), old = $("v9GuestMode");
    if (old) old.style.display = teamsOn() ? "none" : "";   /* l'ancienne liste « Sans équipe / Rejoindre » est remplacée par les boutons ci-dessous */
    if (!teamsOn() || started()) { if (box) box.remove(); return; }
    if (!box) { box = mk("div", "v52-pick"); box.id = "v52GuestPick"; if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else card.appendChild(box); }
    box.textContent = "";
    box.appendChild(mk("strong", "", myTeam() ? "👥 Ton équipe : " + myTeam() : "👥 Choisis ton équipe"));
    teamButtons(box);
    box.appendChild(mk("div", "v52-note", S.locked ? "🔒 L'hôte a verrouillé les équipes." : "Clique sur une équipe pour la rejoindre. Le chat d'équipe (bouton 👥) est privé : seuls tes coéquipiers et l'hôte, qui modère, le voient."));
  }
  function renderHost() {
    var mgr = $("v9TeamManager"); if (!mgr || !mgr.parentNode) return;
    var box = $("v52HostTeams");
    if (!teamsOn() || started()) { if (box) box.remove(); return; }
    if (!box) { box = mk("div", "v52-pick v52-host"); box.id = "v52HostTeams"; mgr.parentNode.insertBefore(box, mgr.nextSibling); }
    box.textContent = "";
    box.appendChild(mk("strong", "", "👥 Équipes : choix des joueurs"));
    var bar = mk("div", "v52-actions");
    function act(label, title, fn) { var b = mk("button", "btn btn-secondary v52-act", label); b.type = "button"; b.title = title; b.onclick = fn; bar.appendChild(b); }
    act(S.locked ? "🔒 Équipes verrouillées" : "🔓 Les joueurs choisissent", "Autoriser ou interdire aux joueurs de changer d'équipe", function () { S.locked = !S.locked; broadcast({ type: "v52Cfg", locked: S.locked }); renderHost(); });
    act("🎲 Au hasard", "Répartir tous les joueurs au hasard, de façon équilibrée", function () { applyDistribution(V52Teams.distribute(players, V52Teams.names(window.v9Teams), { rng: Math.random })); });
    act("⚖️ Équilibrer", "Placer les joueurs sans équipe dans les équipes les moins remplies", function () { applyDistribution(V52Teams.distribute(players, V52Teams.names(window.v9Teams), { onlyMissing: true })); });
    box.appendChild(bar);
    teamButtons(box);
    /* L'ancien gestionnaire (listes déroulantes et ✏️) ne fonctionnait pas : guillemets cassés dans son HTML. Remplacé ici. */
    var tn = V52Teams.names(window.v9Teams), mgr = mk("div", "v52-assign");
    mgr.appendChild(mk("div", "v52-sub", "Placer un joueur (l'hôte peut déplacer tout le monde, même verrouillé)"));
    Object.keys(players || {}).forEach(function (id) {
      var p = players[id], row = mk("div", "v52-arow"), sel = mk("select", "select");
      row.appendChild(mk("span", "", (p.avatar || "🙂") + " " + p.name + (id === myId ? " (toi)" : "")));
      sel.setAttribute("aria-label", "Équipe de " + p.name);
      if (!p.team || tn.indexOf(p.team) < 0) { var o0 = mk("option", "", "Sans équipe"); o0.value = ""; sel.appendChild(o0); }
      tn.forEach(function (t) { var o = mk("option", "", t); o.value = t; sel.appendChild(o); });
      sel.value = p.team && tn.indexOf(p.team) >= 0 ? p.team : "";
      sel.onchange = function () {
        var c = V52Teams.checkPick(hostEnv(), id, sel.value, true);
        if (!c.ok) { if (c.message) say(c.message); renderHost(); return; }
        if (typeof assignTeamV9 === "function") assignTeamV9(id, c.team);
      };
      row.appendChild(sel); mgr.appendChild(row);
    });
    var tools = mk("div", "v52-actions");
    tn.forEach(function (t) { var b = mk("button", "btn btn-secondary v52-act", "✏️ " + t); b.type = "button"; b.title = "Renommer l'équipe " + t; b.onclick = function () { if (typeof renameTeamV9 === "function") renameTeamV9(t); }; tools.appendChild(b); });
    var add = mk("button", "btn btn-secondary v52-act", "＋ Ajouter une équipe"); add.type = "button";
    add.onclick = function () { if (V52Teams.names(window.v9Teams).length >= 6) { say("👥 6 équipes au maximum."); return; } if (typeof addTeamV9 === "function") addTeamV9(); };
    tools.appendChild(add); mgr.appendChild(tools); box.appendChild(mgr);
    box.appendChild(mk("div", "v52-note", "Les invités voient la même liste dans leur salle d'attente et rejoignent une équipe d'un clic. Un nouveau joueur arrive dans l'équipe la moins remplie."));
  }
  function applyDistribution(map) {
    var ids = Object.keys(map); if (!ids.length) { say("👥 Tout le monde a déjà une équipe."); return; }
    ids.forEach(function (id) { if (typeof assignTeamV9 === "function") assignTeamV9(id, map[id]); });
  }
  function hostEnv() { return { players: function () { return players; }, teamsOn: teamsOn, started: started, locked: function () { return S.locked; }, teams: function () { return window.v9Teams || {}; } }; }
  /* ----- Réseau ----- */
  var baseSetup = setupConnection;
  setupConnection = function (connection) {
    /* écouteur posé AVANT celui du jeu : l'expéditeur est celui de la connexion, jamais celui annoncé dans le message */
    try { connection.on("data", function (d) { if (isHost && d && typeof d === "object" && (d.type === "v9TeamRequest" || d.type === "v52Chat")) d.playerId = String(connection.peer); }); } catch (e) {}
    return baseSetup.apply(this, arguments);
  };
  var baseHandle = handleData;
  handleData = function (data) {
    if (data && data.type === "v52Chat") { if (isHost) hostRelay(data); else receive(data); return; }
    if (data && data.type === "v52Reject") { if (!isHost) warn(V52Teams.str(data.message, 200)); return; }
    if (data && data.type === "v52Cfg") { if (!isHost) { S.locked = !!data.locked; renderGuest(); } return; }
    if (isHost && data && data.type === "v9TeamRequest") {
      var pid = String(data.playerId || ""), c = V52Teams.checkPick(hostEnv(), pid, data.team);
      if (!c.ok) { if (c.message && pid !== myId) sendTo(pid, { type: "v12Notice", message: c.message }); return; }
      if (typeof assignTeamV9 === "function") assignTeamV9(pid, c.team);
      return;
    }
    var wasIn = isHost && data && data.type === "join" && data.player ? String(data.player.id || "") : "";
    var r = baseHandle.apply(this, arguments);
    if (wasIn && players[wasIn]) {
      try { sendTo(wasIn, { type: "v52Cfg", locked: S.locked }); } catch (e) {}
      if (teamsOn() && !players[wasIn].team) {
        var t = V52Teams.smallest(players, V52Teams.names(window.v9Teams));
        if (t && typeof assignTeamV9 === "function") assignTeamV9(wasIn, t);
      }
    }
    if (!isHost && data && (data.type === "players" || data.type === "v9Config")) { renderGuest(); }
    return r;
  };
  if (typeof resetConnection === "function") {
    var baseReset = resetConnection;
    resetConnection = function () { S.msgs = []; S.unread = 0; S.locked = false; S.sig = ""; var L = $("v52List"); if (L) L.textContent = ""; toggle(false); paintBadge(); return baseReset.apply(this, arguments); };
  }
  if (typeof toggleChat === "function") {
    var baseToggle = toggleChat;
    toggleChat = function () { var r = baseToggle.apply(this, arguments); try { if (chatState.open && window.innerWidth < 1100 && S.open) toggle(false); } catch (e) {} return r; };
  }
  /* ----- Mise à jour régulière de l'affichage ----- */
  function tick() {
    try {
      mountDock();
      var on = teamsOn(), tb = $("dockTeam"), rb = $("dockRank");
      if (tb) tb.style.display = on && myTeam() ? "" : "none";
      if (rb) rb.style.display = isHost && started() ? "" : "none";
      if (!on && S.open) toggle(false);
      var title = $("v52Title"), hint = $("v52Hint");
      if (title) title.textContent = "👥 Chat d'équipe" + (myTeam() ? " · " + myTeam() : "");
      if (hint) hint.textContent = isHost ? "Comme hôte, tu vois les messages de toutes les équipes (modération)." : "Seuls tes coéquipiers et l'hôte, qui modère, voient ces messages.";
      /* première fois en mode équipes : l'hôte répartit les joueurs sans équipe */
      if (isHost && on && S.lastMode !== "teams" && !started()) { var m = V52Teams.distribute(players, V52Teams.names(window.v9Teams), { onlyMissing: true }); Object.keys(m).forEach(function (id) { if (typeof assignTeamV9 === "function") assignTeamV9(id, m[id]); }); }
      S.lastMode = on ? "teams" : "";
      var sig = [on, started(), S.locked, isHost, myTeam(), JSON.stringify(window.v9Teams || {}), Object.keys(players || {}).map(function (id) { return id + ":" + (players[id].team || "") + ":" + players[id].name; }).join("|")].join("#");
      if (sig !== S.sig) { S.sig = sig; if (isHost) renderHost(); else renderGuest(); }
    } catch (e) {}
  }
  setInterval(tick, 700);
  document.addEventListener("DOMContentLoaded", tick);
  tick();
})();
