/* 👥 Équipes, chat d'équipe, bouton « Montrer le classement » (js/patches/044-v52-equipes.js + 043-v51-mi-partie.js)
   node tests/teams.test.js */
const T = require("../js/patches/044-v52-equipes.js"), H = require("../js/patches/043-v51-mi-partie.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

/* ---- équipes : comptage, plus petite, répartition ---- */
const TN = ["Équipe 1", "Équipe 2", "Équipe 3"];
const P = () => ({ a: { id: "a", name: "Léa", team: "Équipe 1", score: 500 }, b: { id: "b", name: "Tom", team: "Équipe 1", score: 300 }, c: { id: "c", name: "Max", team: "Équipe 2", score: 900 }, d: { id: "d", name: "Zoé", team: "", score: 0 }, e: { id: "e", name: "Inès", score: 100 } });
t("noms d'équipes : vides ignorés", T.names({ "Équipe 1": [], "": [], B: [] }).join() === "Équipe 1,B" && T.names(null).length === 0);
t("membres d'une équipe", T.members(P(), "Équipe 1").join() === "a,b" && T.members(P(), "").length === 0 && T.members(P(), "Autre").length === 0);
t("comptage par équipe", JSON.stringify(T.counts(P(), TN)) === '{"Équipe 1":2,"Équipe 2":1,"Équipe 3":0}');
t("la moins remplie : Équipe 3 ; égalité → la première", T.smallest(P(), TN) === "Équipe 3" && T.smallest({}, TN) === "Équipe 1" && T.smallest(P(), []) === null);
const dm = T.distribute(P(), TN, { onlyMissing: true });
t("équilibrer : seuls les joueurs sans équipe (d, e), vers les équipes les moins remplies", Object.keys(dm).join() === "d,e" && dm.d === "Équipe 3" && dm.e === "Équipe 2");
const dx = T.distribute({ x: { team: "Disparue" }, y: { team: "Équipe 1" } }, TN, { onlyMissing: true });
t("équilibrer : joueur dont l'équipe n'existe plus = sans équipe, placé dans une équipe vide", Object.keys(dx).join() === "x" && dx.x === "Équipe 2");
const big = {}; for (let i = 0; i < 8; i++) big["p" + i] = { id: "p" + i, name: "J" + i };
const rnd = T.distribute(big, ["A", "B", "C"], { rng: seq([0.1, 0.9, 0.5, 0.3]) }), cnt = T.counts(Object.keys(rnd).reduce((o, id) => (o[id] = { team: rnd[id] }, o), {}), ["A", "B", "C"]);
t("au hasard : tout le monde placé, équipes équilibrées (écart ≤ 1)", Object.keys(rnd).length === 8 && Math.max(...Object.values(cnt)) - Math.min(...Object.values(cnt)) <= 1);
t("au hasard : deux tirages différents donnent des répartitions différentes", JSON.stringify(T.distribute(big, ["A", "B"], { rng: seq([0.1, 0.9, 0.2]) })) !== JSON.stringify(T.distribute(big, ["A", "B"], { rng: seq([0.9, 0.1, 0.8]) })));
t("répartition : sans équipe disponible ou sans joueur → rien, sans erreur", Object.keys(T.distribute(big, [], {})).length === 0 && Object.keys(T.distribute({}, TN, {})).length === 0 && Object.keys(T.distribute(null, TN, {})).length === 0);
t("répartition : ne modifie pas les joueurs", JSON.stringify(P()) === JSON.stringify((() => { const q = P(); T.distribute(q, TN, { onlyMissing: true }); return q; })()));

/* ---- scores par équipe ---- */
const ts = T.teamScores(P());
t("scores d'équipes : Équipe 2 (900) 1re, Équipe 1 (800) 2e ; joueurs sans équipe ignorés", ts.map(x => x.name + ":" + x.score + ":" + x.label).join() === "Équipe 2:900:1re,Équipe 1:800:2e" && ts[1].count === 2);
t("scores d'équipes : égalité = même rang", T.teamScores({ a: { team: "A", score: 10 }, b: { team: "B", score: 10 }, c: { team: "C", score: 5 } }).map(x => x.rank).join() === "1,1,3");
t("scores d'équipes : valeurs absurdes sans erreur", T.teamScores({ a: { team: "A", score: "x" }, b: null, c: { team: "A", score: 7 } })[0].score === 7 && T.teamScores(null).length === 0);

/* ---- changement d'équipe demandé par un joueur ---- */
const env = (o = {}) => Object.assign({ players: () => P(), teamsOn: () => true, started: () => false, locked: () => false, teams: () => ({ "Équipe 1": [], "Équipe 2": [] }) }, o);
t("choix valide accepté", T.checkPick(env(), "a", "Équipe 2").ok === true && T.checkPick(env(), "a", "Équipe 2").team === "Équipe 2");
t("choix refusé : joueur inconnu, mode non équipes, partie commencée", !T.checkPick(env(), "zz", "Équipe 1").ok && !T.checkPick(env({ teamsOn: () => false }), "a", "Équipe 1").ok && !T.checkPick(env({ started: () => true }), "a", "Équipe 1").ok);
t("choix refusé : équipes verrouillées (sauf pour l'hôte)", !T.checkPick(env({ locked: () => true }), "a", "Équipe 1").ok && T.checkPick(env({ locked: () => true, players: () => ({ h: { id: "h", host: true } }) }), "h", "Équipe 1").ok);
t("l'hôte peut déplacer un joueur même quand les équipes sont verrouillées (mais jamais vers une équipe inexistante ni après le début)", T.checkPick(env({ locked: () => true }), "a", "Équipe 2", true).ok && !T.checkPick(env({ locked: () => true }), "a", "Pirate", true).ok && !T.checkPick(env({ locked: () => true, started: () => true }), "a", "Équipe 2", true).ok && !T.checkPick(env({ locked: () => true }), "a", "Équipe 2", false).ok);
t("choix refusé : équipe inexistante, vide, pas du texte (pas de création d'équipe fantôme)", !T.checkPick(env(), "a", "Pirate").ok && !T.checkPick(env(), "a", "").ok && !T.checkPick(env(), "a", 5).ok && !T.checkPick(env(), "a", { x: 1 }).ok && !T.checkPick(env(), "a").ok);
t("choix refusé : noms spéciaux du prototype", !T.checkPick(env(), "a", "__proto__").ok && !T.checkPick(env(), "a", "constructor").ok);

/* ---- messages d'équipe reçus ---- */
const ev = { type: "v52Chat", id: "t1-abc", playerId: "a", name: "Léa", team: "Équipe 1", text: "  salut   l'équipe ", time: "12:01:02" };
const c1 = T.cleanChat(ev, "Équipe 1", false);
t("message d'équipe valide nettoyé", c1 && c1.text === "salut l'équipe" && c1.team === "Équipe 1" && c1.time === "12:01:02" && c1.name === "Léa");
t("un joueur ignore le message d'une autre équipe ; l'hôte lit tout", T.cleanChat(ev, "Équipe 2", false) === null && T.cleanChat(ev, "Équipe 2", true) !== null && T.cleanChat(ev, "", false) === null);
t("message invalide ignoré : vide, sans équipe, sans identifiant, mauvais type, pas un objet", [null, undefined, 5, "x", {}, { type: "chat", id: "a", team: "A", text: "x" }, { type: "v52Chat", id: "a", team: "A", text: "   " }, { type: "v52Chat", id: "a", team: "", text: "x" }, { type: "v52Chat", id: "", team: "A", text: "x" }, { type: "v52Chat", id: "!!!", team: "A", text: "x" }].every(x => T.cleanChat(x, "A", true) === null));
const long = T.cleanChat({ type: "v52Chat", id: "i".repeat(200), team: "A".repeat(100), text: "z".repeat(1000), name: "N".repeat(100), time: "pas une heure", playerId: "p".repeat(300) }, "A".repeat(30), true);
t("tailles bornées, heure invalide remplacée, caractères de contrôle retirés", long && long.text.length === 140 && long.id.length === 60 && long.team.length === 30 && long.name.length === 24 && long.playerId.length === 64 && long.time === "" && T.cleanChat({ type: "v52Chat", id: "a", team: "A", text: "a\u0000b\u001fc" }, "A", true).text === "a b c");

/* ---- relais par l'hôte ---- */
function relayEnv(o = {}) {
  const sent = [], pl = o.players || (() => ({ h: { id: "h", name: "Hôte", team: "Rouge", host: true }, a: { id: "a", name: "Léa", team: "Rouge" }, b: { id: "b", name: "Tom", team: "Rouge" }, c: { id: "c", name: "Max", team: "Bleu" }, d: { id: "d", name: "Zoé", team: "" } }));
  let now = 1000;
  const e = Object.assign({ players: pl, teamsOn: () => true, banned: () => false, locked: () => false, muted: () => false, filter: txt => String(txt).includes("merde") ? { ok: false, why: "blocked", label: "langage interdit" } : (String(txt).trim() ? { ok: true, text: String(txt).trim() } : { ok: false, why: "empty", message: "Message vide." }), now: () => now, stamp: () => "12:00:00", deliver: (ids, ev) => sent.push({ ids, ev }) }, o);
  return { env: e, sent, tick: ms => { now += ms; } };
}
let R = relayEnv(), relay = T.relayFactory(R.env), res = relay({ playerId: "a", id: "m1", text: "bonjour" });
t("message d'équipe : va aux coéquipiers et à l'hôte, pas à l'autre équipe", res.ok && res.to.slice().sort().join() === "a,b,h" && R.sent.length === 1 && !R.sent[0].ids.includes("c") && R.sent[0].ev.team === "Rouge" && R.sent[0].ev.name === "Léa");
R = relayEnv(); relay = T.relayFactory(R.env); res = relay({ playerId: "c", id: "m2", text: "hello" });
t("équipe Bleu : seul Max + l'hôte reçoivent (l'hôte modère)", res.ok && res.to.slice().sort().join() === "c,h");
R = relayEnv(); relay = T.relayFactory(R.env); res = relay({ playerId: "d", id: "m3", text: "hello" });
t("joueur sans équipe : refusé, rien envoyé", !res.ok && res.why === "noteam" && R.sent.length === 0);
R = relayEnv(); relay = T.relayFactory(R.env); res = relay({ playerId: "inconnu", id: "m4", text: "hello" });
t("expéditeur inconnu : refusé", !res.ok && res.why === "unknown" && R.sent.length === 0);
R = relayEnv({ teamsOn: () => false }); relay = T.relayFactory(R.env); res = relay({ playerId: "a", id: "m5", text: "hello" });
t("hors mode équipes : refusé", !res.ok && res.why === "off" && R.sent.length === 0);
R = relayEnv({ banned: id => id === "a" }); relay = T.relayFactory(R.env);
t("joueur banni : refusé sans bruit", !relay({ playerId: "a", id: "m6", text: "x" }).ok && R.sent.length === 0);
R = relayEnv({ locked: () => true }); relay = T.relayFactory(R.env);
t("chat verrouillé : refusé pour les joueurs, accepté pour l'hôte", relay({ playerId: "a", id: "m7", text: "x" }).why === "locked" && relay({ playerId: "h", id: "m8", text: "x" }).ok);
R = relayEnv({ muted: id => id === "a" }); relay = T.relayFactory(R.env);
t("joueur en sourdine : refusé", relay({ playerId: "a", id: "m9", text: "x" }).why === "muted" && R.sent.length === 0);
R = relayEnv(); relay = T.relayFactory(R.env); res = relay({ playerId: "a", id: "m10", text: "quelle merde" });
t("message interdit : refusé, signalé comme bloqué, jamais distribué", !res.ok && res.blocked === true && R.sent.length === 0);
R = relayEnv(); relay = T.relayFactory(R.env); res = relay({ playerId: "a", id: "m11", text: "   " });
t("message vide : refusé", !res.ok && res.why === "empty" && R.sent.length === 0);
R = relayEnv(); relay = T.relayFactory(R.env);
for (let i = 0; i < 6; i++) relay({ playerId: "a", id: "r" + i, text: "x" + i });
res = relay({ playerId: "a", id: "r6", text: "x6" });
t("anti-spam : le 7e message en 3 s est refusé, les autres joueurs ne sont pas touchés", !res.ok && res.why === "rate" && relay({ playerId: "b", id: "rb", text: "ok" }).ok);
R.tick(3100); t("anti-spam : après 3 s on peut réécrire", relay({ playerId: "a", id: "r7", text: "x7" }).ok);
R = relayEnv(); relay = T.relayFactory(R.env); relay({ playerId: "a", id: "same", text: "un" }); res = relay({ playerId: "a", id: "same", text: "deux" });
t("identifiant déjà vu (rejeu) : refusé", !res.ok && res.why === "dup" && R.sent.length === 1);
R = relayEnv(); relay = T.relayFactory(R.env); relay({ playerId: "a", id: "i1", text: "x", team: "Bleu", name: "Pirate" });
t("l'équipe et le nom viennent des données de l'hôte, pas du message", R.sent[0].ev.team === "Rouge" && R.sent[0].ev.name === "Léa" && R.sent[0].ev.playerId === "a");
R = relayEnv({ players: () => ({ a: { id: "a", name: "Léa", team: "Rouge" }, b: { id: "b", name: "Tom", team: "Rouge" } }) }); relay = T.relayFactory(R.env); res = relay({ playerId: "a", id: "nh", text: "x" });
t("aucun hôte listé : le message va quand même aux coéquipiers", res.ok && res.to.slice().sort().join() === "a,b");

/* ---- bouton « Montrer le classement » (hôte) ---- */
function game(o = {}) {
  const st = Object.assign({ isHost: true, started: true, index: 3, total: 6, players: { a: { id: "a", name: "Léa", score: 1200, team: "Rouge" }, b: { id: "b", name: "Tom", score: 1900, team: "Bleu" } } }, o), sent = [], shown = [], base = [];
  const ctl = H.host({ isHost: () => st.isHost, started: () => st.started, players: () => st.players, index: () => st.index, total: () => st.total, enabled: () => true, broadcast: ev => sent.push(ev), show: ev => shown.push(ev), later: () => {}, teams: o.teams });
  return { st, sent, shown, base, ctl, next: ctl.wrap(function () { base.push(1); }) };
}
let g = game(); const m1 = g.ctl.manual();
t("bouton : l'évènement est envoyé à tous ET affiché chez l'hôte", m1 && g.sent.length === 1 && g.shown.length === 1 && g.sent[0].manual === true && g.sent[0].rows[0].name === "Tom" && g.sent[0].round === 3 && g.sent[0].total === 6);
t("bouton : ne lance pas et ne retarde pas la question suivante", g.base.length === 0 && g.ctl.state().pending === false);
g = game({ isHost: false }); t("bouton : sans effet pour un invité", g.ctl.manual() === null && g.sent.length === 0);
g = game({ started: false }); t("bouton : sans effet avant le début de la partie", g.ctl.manual() === null && g.sent.length === 0 && g.shown.length === 0);
g = game({ index: 0 }); t("bouton : tout début (question 0) → question 1 affichée", g.ctl.manual().round === 1);
g = game(); g.next(true); g.st.index = 3; g.next(false); g.st.players.a.score = 3000; const m2 = g.ctl.manual();
t("bouton après le classement à la moitié : le rang change (Léa 1re), flèches calculées depuis la dernière question", m2.rows[0].name === "Léa" && m2.rows[0].move === 1 && m2.rows[1].move === -1);
g = game({ teams: () => T.teamScores({ a: { team: "Rouge", score: 1200 }, b: { team: "Bleu", score: 1900 } }) });
const m3 = g.ctl.manual();
t("bouton : les scores d'équipes sont joints à l'évènement", m3.teams && m3.teams.length === 2 && m3.teams[0].name === "Bleu" && m3.teams[0].score === 1900);
g = game({ teams: () => null }); t("bouton : pas d'équipes → pas de champ équipes", !("teams" in g.ctl.manual()));
g = game({ total: 6 }); g.next(true); g.st.index = 3; g.next(false);
t("le classement automatique à la moitié fonctionne toujours (non manuel)", g.sent.length === 1 && !g.sent[0].manual);
g = game(); g.next(true); g.st.index = 3; g.next(false); g.ctl.manual();
t("bouton pendant le classement à la moitié : l'enchaînement reste en attente (une seule question suivante à la fin)", g.ctl.state().pending === true && g.base.length === 1);

/* ---- données du classement reçues ---- */
const sm = H.sanitize({ type: "v51Half", id: 9, round: 3, total: 6, manual: true, rows: [{ id: "a", name: "Léa", score: 5, rank: 1 }], teams: [{ name: "<b>Rouge</b>", score: 12, count: 2, rank: 1 }, { name: "Bleu", score: "x", count: 99999, rank: 0 }] });
t("manuel : drapeau conservé, équipes nettoyées et bornées", sm.manual === true && sm.teams.length === 2 && sm.teams[0].name === "<b>Rouge</b>" && sm.teams[1].score === 0 && sm.teams[1].count === 99 && sm.teams[1].rank === 1 && sm.teams[0].label === "1re");
t("manuel : seul la valeur booléenne vraie compte ; équipes absentes = liste vide", H.sanitize({ type: "v51Half", rows: [{ id: "a", name: "A", score: 1, rank: 1 }], manual: "oui" }).manual === false && H.sanitize({ type: "v51Half", rows: [{ id: "a", name: "A", score: 1, rank: 1 }] }).teams.length === 0);
t("équipes : au plus 8 envoyées", H.sanitize({ type: "v51Half", rows: [{ id: "a", name: "A", score: 1, rank: 1 }], teams: Array.from({ length: 30 }, (_, i) => ({ name: "E" + i, score: i, rank: 1, count: 1 })) }).teams.length === 8);

/* ---- branchement dans la page ---- */
const src = rd("js/patches/044-v52-equipes.js"), src43 = rd("js/patches/043-v51-mi-partie.js"), html = rd("index.html"), css = rd("css/v52.css");
t("expéditeur lié à la connexion avant le traitement du jeu (écouteur posé avant setupConnection)", /connection\.on\("data"[\s\S]{0,300}d\.playerId = String\(connection\.peer\)[\s\S]{0,200}return baseSetup\.apply/.test(src) && /isHost && d && typeof d === "object" && \(d\.type === "v9TeamRequest" \|\| d\.type === "v52Chat"\)/.test(src));
t("demande d'équipe interceptée et vérifiée avant l'ancien code (plus d'usurpation d'identité)", /isHost && data && data\.type === "v9TeamRequest"[\s\S]{0,400}checkPick[\s\S]{0,300}assignTeamV9\(pid, c\.team\)/.test(src));
t("nouveau joueur placé dans l'équipe la moins remplie, verrou envoyé à l'arrivée", /data\.type === "join"/.test(src) && /V52Teams\.smallest\(players/.test(src) && /type: "v52Cfg", locked: S\.locked/.test(src));
t("modération du chat d'équipe : Moderation.check, séquences, profanityCheck, sanctions", /Moderation\.check/.test(src) && /Moderation\.sequence/.test(src) && /profanityCheck/.test(src) && /Moderation\.strike/.test(src));
t("rien n'est écrit avec innerHTML (noms et messages en textContent)", !/innerHTML/.test(src) && !/innerHTML/.test(src43));
t("bouton 🏁 réservé à l'hôte en partie, délai de 2,5 s entre deux affichages", /rb\.style\.display = isHost && started\(\)/.test(src) && /2500/.test(src) && /if \(!isHost \|\| !started\(\)\) return/.test(src));
t("ancien gestionnaire d'équipes (guillemets cassés) remplacé : listes d'équipe par joueur, renommer, ajouter, ancien bloc masqué", /sel\.onchange = function/.test(src) && /checkPick\(hostEnv\(\), id, sel\.value, true\)/.test(src) && /renameTeamV9\(t\)/.test(src) && /addTeamV9\(\)/.test(src) && /#v9TeamManager \{ display: none !important; \}/.test(css) && /6 équipes au maximum/.test(src));
t("invités : l'ancienne liste « Sans équipe » est masquée, remplacée par les boutons d'équipe placés sous la liste des joueurs", /old\.style\.display = teamsOn\(\) \? "none" : ""/.test(src) && /\$\("waitingPlayers"\) \|\| \$\("v9GuestMode"\)/.test(src));
t("le bouton 👥 n'apparaît que pour un joueur ayant une équipe en mode équipes", /tb\.style\.display = on && myTeam\(\)/.test(src));
t("le panneau dit la vérité : l'hôte voit tout, les invités sont prévenus", /l'hôte, qui modère/.test(src) && /tu vois les messages de toutes les équipes/.test(src));
t("quitter la partie vide le chat d'équipe et le verrou", /resetConnection = function \(\) \{ S\.msgs = \[\]; S\.unread = 0; S\.locked = false/.test(src));
t("index.html : v52.css, puis 044 après 043 et avant le mode révision", html.includes('css/v52.css') && html.indexOf("043-v51-mi-partie.js") < html.indexOf("044-v52-equipes.js") && html.indexOf("044-v52-equipes.js") < html.indexOf("review/review.js"));
t("043 charge avant 044 (le classement d'équipes lit V52Teams à l'usage)", /window\.V52Teams && window\.v9GameMode === "teams"/.test(src43));
t("accessibilité : boutons étiquetés, panneau sur mobile, rôle dialogue", /aria-label/.test(src) && /max-width: 520px/.test(css) && /role", "dialog"/.test(src));
console.log("Équipes et chat d'équipe : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
