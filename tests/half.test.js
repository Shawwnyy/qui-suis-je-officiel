/* 🏁 Classement à la moitié des questions (js/patches/043-v51-mi-partie.js) : moment, classement, flèches, données reçues, enchaînement de l'hôte.
   node tests/half.test.js */
const V = require("../js/patches/043-v51-mi-partie.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }

/* ---- moment ---- */
t("moitié : 4→2, 5→3, 10→5, 20→10", [4, 5, 10, 20].map(V.half).join() === "2,3,5,10");
t("dû à la moitié exactement, dès 4 questions, si activé", V.due(5, 10, true) && V.due(2, 4, true) && V.due(3, 5, true));
t("pas avant 4 questions, pas si désactivé, pas à un autre moment", !V.due(2, 3, true) && !V.due(1, 2, true) && !V.due(5, 10, false) && !V.due(4, 10, true) && !V.due(6, 10, true) && !V.due(0, 10, true));
t("valeurs bizarres sans erreur", !V.due(NaN, 10, true) && !V.due(5, "x", true) && !V.due(undefined, undefined, true));

/* ---- classement ---- */
const P = { a: { id: "a", name: "Léa", avatar: "🦊", score: 900 }, b: { id: "b", name: "Tom", avatar: "🐻", score: 1500 }, c: { id: "c", name: "Max", avatar: "🐸", score: 900 }, d: { id: "d", name: "Zoé", avatar: "🐼", score: 0 } };
const b = V.board(P);
t("classement : Tom 1er, Léa et Max à égalité 2e (ordre d'arrivée), Zoé 4e", b.map(r => r.name + ":" + r.label).join() === "Tom:1er,Léa:2e,Max:2e,Zoé:4e");
t("classement : rangs 1, 2, 2, 4 (pas de 3e)", b.map(r => r.rank).join() === "1,2,2,4");
t("classement : joueurs sans score ou sans objet", V.board({ x: {} , y: null, z: { name: "Z", score: "12" } }).map(r => r.name + ":" + r.score).join() === "Z:12,undefined:0,undefined:0" && V.board(null).length === 0 && V.board({}).length === 0);
t("rangs ordinaux", [1, 2, 3, 4, 12].map(V.ordinal).join() === "1er,2e,3e,4e,12e");
const prev = V.ranksOf(V.board({ a: { id: "a", name: "Léa", score: 1000 }, b: { id: "b", name: "Tom", score: 800 }, c: { id: "c", name: "Max", score: 100 }, d: { id: "d", name: "Zoé", score: 0 } }));
const mv = V.withMoves(b, prev);
t("flèches : Tom +1 (2→1), Léa −1 (1→2), Max −1 (3→2), Zoé 0", mv.map(r => r.name + ":" + r.move).join() === "Tom:1,Léa:-1,Max:1,Zoé:0".replace("Max:1", "Max:1"));
t("flèches : sans point de comparaison → aucune", V.withMoves(b, null).every(r => r.move === null) && V.withMoves(b, {}).every(r => r.move === null));
t("flèches : le classement d'origine n'est pas modifié", b.every(r => !("move" in r)));

/* ---- données reçues ---- */
const good = { type: "v51Half", id: 3, round: 5, total: 10, rows: mv };
const s = V.sanitize(good);
t("données valides conservées", s && s.round === 5 && s.total === 10 && s.rows.length === 4 && s.rows[0].name === "Tom" && s.rows[0].label === "1er" && s.rows[0].move === 1);
t("mauvais type / sans lignes / lignes pas en tableau → refusé", V.sanitize(null) === null && V.sanitize({ type: "x", rows: [{}] }) === null && V.sanitize({ type: "v51Half", rows: [] }) === null && V.sanitize({ type: "v51Half", rows: "oops" }) === null);
const hostile = V.sanitize({ type: "v51Half", id: "9e99", round: -5, total: 1e9, rows: [{ id: "<img onerror=x>", name: "N".repeat(500) + "\u0007", avatar: "😀".repeat(40), score: -50, rank: 0, label: "<b>1er</b>", move: 5000 }, null, { name: 5, score: "abc", rank: "x" }] });
t("données hostiles : tailles, bornes et caractères de contrôle nettoyés", hostile && hostile.round === 1 && hostile.total === 999 && hostile.rows[0].name.length === 40 && !/[\u0000-\u001f]/.test(hostile.rows[0].name) && hostile.rows[0].avatar.length <= 12 && hostile.rows[0].score === 0 && hostile.rows[0].rank === 1 && hostile.rows[0].move === 99);
t("l'étiquette 1er / 2e est recalculée, jamais reprise du réseau", hostile.rows[0].label === "1er" && hostile.rows[2].label === "1er");
t("ligne vide ou inconnue → joueur par défaut", hostile.rows[1].name === "Joueur" && hostile.rows[2].name === "Joueur");
t("au plus 30 lignes", V.sanitize({ type: "v51Half", rows: Array.from({ length: 80 }, (_, i) => ({ name: "J" + i, score: i, rank: i + 1 })) }).rows.length === 30);

/* ---- enchaînement côté hôte (faux jeu, fausses minuteries) ---- */
function game(opts) {
  opts = opts || {};
  const st = { host: opts.host !== false, started: opts.started !== false, index: 0, total: opts.total || 6, on: opts.on !== false, players: JSON.parse(JSON.stringify(P)) };
  const log = { base: [], sent: [], shown: [], timers: [] };
  const env = { isHost: () => st.host, started: () => st.started, players: () => st.players, index: () => st.index, total: () => st.total, enabled: () => st.on,
    broadcast: ev => { if (opts.throwOnBroadcast) throw new Error("réseau"); log.sent.push(ev); }, show: ev => log.shown.push(ev), later: (fn, ms) => log.timers.push({ fn, ms }) };
  const ctl = V.host(env), next = ctl.wrap(function (first) { log.base.push([st.index, !!first]); });
  return { st, log, ctl, next, fire() { const tm = log.timers.shift(); if (tm) tm.fn(); return tm; } };
}
let g = game({ total: 6 });
g.next(true);
t("première question : appelée tout de suite", g.log.base.length === 1 && g.log.base[0][1] === true && g.log.sent.length === 0);
g.st.index = 1; g.next(false); g.st.index = 2; g.next(false);
t("avant la moitié : questions enchaînées sans classement", g.log.base.length === 3 && g.log.sent.length === 0 && g.log.shown.length === 0);
g.st.players.a.score = 2000;                       /* Léa passe devant Tom entre les questions 2 et 3 */
g.st.index = 3; g.next(false);
t("à la moitié (question 3 sur 6) : classement diffusé et affiché, question suivante en attente", g.log.sent.length === 1 && g.log.shown.length === 1 && g.log.base.length === 3 && g.log.timers.length === 1);
const ev = g.log.sent[0];
t("évènement : manche 3 sur 6, Léa 1re (+1 place), Tom 2e (−1)", ev.type === "v51Half" && ev.round === 3 && ev.total === 6 && ev.rows[0].name === "Léa" && ev.rows[0].move === 1 && ev.rows[1].name === "Tom" && ev.rows[1].move === -1);
t("attente de 7 secondes", g.log.timers[0].ms === V.HALF_MS && V.HALF_MS === 7000);
g.next(false);
t("appel en double pendant le classement : ignoré", g.log.base.length === 3 && g.log.sent.length === 1 && g.log.timers.length === 1);
g.fire();
t("après l'attente : la question suivante part, une seule fois", g.log.base.length === 4 && g.log.base[3][0] === 3 && g.log.base[3][1] === false);
g.st.index = 4; g.next(false);
t("plus de classement ensuite", g.log.base.length === 5 && g.log.sent.length === 1 && g.log.timers.length === 0);
g.st.index = 3; g.next(false);
t("même au même numéro : une seule fois par partie", g.log.sent.length === 1 && g.log.base.length === 6);
g.next(true);
g.st.index = 3; g.next(false);
t("nouvelle partie : le classement revient à la moitié", g.log.sent.length === 2);

g = game({ host: false }); g.st.index = 3; g.next(false);
t("joueur (pas l'hôte) : rien n'est envoyé, rien n'est retardé", g.log.sent.length === 0 && g.log.base.length === 1 && g.log.timers.length === 0);
g = game({ on: false }); g.st.index = 3; g.next(false);
t("option désactivée : question suivante tout de suite, aucun classement", g.log.sent.length === 0 && g.log.base.length === 1);
g = game({ total: 3 }); g.st.index = 2; g.next(false);
t("moins de 4 questions : aucun classement", g.log.sent.length === 0 && g.log.base.length === 1);
g = game({ started: false }); g.st.index = 3; g.next(false);
t("partie non commencée : on laisse passer", g.log.sent.length === 0 && g.log.base.length === 1);
g = game({ total: 6 }); g.next(true); g.st.index = 3; g.next(false); g.ctl.reset(); g.fire();
t("partie terminée / quittée pendant le classement : la question suivante ne part pas", g.log.base.length === 1);
g = game({ total: 6 }); g.next(true); g.st.index = 3; g.next(false); g.st.started = false; g.fire();
t("partie arrêtée pendant l'attente : rien ne part", g.log.base.length === 1);
g = game({ total: 6, throwOnBroadcast: true }); g.next(true); g.st.index = 3; g.next(false); g.fire();
t("erreur réseau à l'envoi : l'hôte voit quand même le classement et la partie continue", g.log.shown.length === 1 && g.log.base.length === 2);
g = game({ total: 10 }); g.next(true); g.st.index = 5; g.next(false);
t("10 questions : classement après la question 5", g.log.sent.length === 1 && g.log.sent[0].round === 5);
g = game({ total: 5 }); g.next(true); g.st.index = 3; g.next(false);
t("5 questions : classement après la question 3 (moitié arrondie au-dessus)", g.log.sent.length === 1 && g.log.sent[0].round === 3);

/* ---- branchement dans la page ---- */
const src = fs.readFileSync(path.join(__dirname, "../js/patches/043-v51-mi-partie.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
t("la page enveloppe sendNextQuestion, reçoit v51Half et masque à la question suivante", /sendNextQuestion = ctl\.wrap\(sendNextQuestion\)/.test(src) && /data\.type === "v51Half"/.test(src) && /"nextQuestion" \|\| data\.type === "gameStart" \|\| data\.type === "gameOver"/.test(src));
t("noms et scores affichés avec textContent (jamais innerHTML)", !/innerHTML/.test(src) && /textContent = text/.test(src));
t("réglage de l'hôte dans le salon, par défaut activé", /v51HalfMode/.test(src) && /v === "off" \? "off" : "on"/.test(src));
t("index.html : feuille de style, puis le script après la roue et le règlement, avant le mode révision", html.includes('css/v51.css') && html.indexOf("wheel/wheel.js") < html.indexOf("043-v51-mi-partie.js") && html.indexOf("042-v50-reglement.js") < html.indexOf("043-v51-mi-partie.js") && html.indexOf("043-v51-mi-partie.js") < html.indexOf("review/review.js"));
t("accessibilité : mouvement réduit respecté, bouton de fermeture étiqueté", /prefers-reduced-motion/.test(fs.readFileSync(path.join(__dirname, "../css/v51.css"), "utf8")) && /Fermer le classement/.test(src));
console.log("Classement à la moitié : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
