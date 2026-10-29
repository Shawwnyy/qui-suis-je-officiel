/* 🗳️ Sondage éclair (js/patches/045-v53-sondage.js) : brouillon, vote unique, résultats, données reçues, branchement.
   node tests/poll.test.js */
const V = require("../js/patches/045-v53-sondage.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const isBad = x => /merde/i.test(x);

/* ---- brouillon de l'hôte ---- */
let d = V.cleanDraft("  On   fait une pause ? ", ["Oui", " Non ", "", "oui"], 30, isBad);
t("brouillon valide : espaces nettoyés, doublons (casse ignorée) et vides retirés", d.ok && d.q === "On fait une pause ?" && d.opts.join() === "Oui,Non" && d.secs === 30);
t("question trop courte ou vide refusée", !V.cleanDraft("ab", ["A", "B"], 30).ok && !V.cleanDraft("", ["A", "B"], 30).ok && !V.cleanDraft(null, ["A", "B"], 30).ok && !V.cleanDraft(5, ["A", "B"], 30).ok);
t("moins de 2 choix différents refusé", !V.cleanDraft("Quelle question ?", ["Oui"], 30).ok && !V.cleanDraft("Quelle question ?", ["Oui", "oui", " OUI "], 30).ok && !V.cleanDraft("Quelle question ?", [], 30).ok && !V.cleanDraft("Quelle question ?", null, 30).ok);
t("4 choix au plus, les suivants sont ignorés", V.cleanDraft("Quelle question ?", ["a", "b", "c", "d", "e", "f"], 30).opts.length === 4);
t("durée : 15, 30 ou 60 seulement, sinon 30", [15, 30, 60].every(s => V.cleanDraft("Quelle question ?", ["a", "b"], s).secs === s) && V.cleanDraft("Quelle question ?", ["a", "b"], 5).secs === 30 && V.cleanDraft("Quelle question ?", ["a", "b"], "x").secs === 30 && V.cleanDraft("Quelle question ?", ["a", "b"], 99999).secs === 30);
t("texte interdit refusé (question ou choix)", !V.cleanDraft("Quelle merde ?", ["a", "b"], 30, isBad).ok && !V.cleanDraft("Quelle question ?", ["a", "merde"], 30, isBad).ok && V.cleanDraft("Quelle question ?", ["a", "b"], 30, isBad).ok);
const longD = V.cleanDraft("q".repeat(500), ["x".repeat(500), "y"], 30);
t("tailles bornées (question 100, choix 40), caractères de contrôle retirés", longD.q.length === 100 && longD.opts[0].length === 40 && V.cleanDraft("a\u0000b\u001fc d", ["x\ny", "z"], 30).q === "a b c d" && V.cleanDraft("Question ?", ["x\ny", "z"], 30).opts[0] === "x y");

/* ---- vote ---- */
const PL = { H: { id: "H" }, a: { id: "a" }, b: { id: "b" }, c: { id: "c" } };
const poll = () => V.create("p1", { q: "Pause ?", opts: ["Oui", "Non", "Peut-être"], secs: 30 }, 1000);
let p = poll();
t("un vote valide est compté", p.vote("a", 0, PL, 2000).ok && p.counts(PL).join() === "1,0,0");
t("un joueur change d'avis : son ancien vote disparaît (un joueur = un vote)", p.vote("a", 1, PL, 2100).changed === true && p.counts(PL).join() === "0,1,0");
t("revoter pareil ne change rien", p.vote("a", 1, PL, 2200).changed === false && p.counts(PL).join() === "0,1,0");
t("plusieurs joueurs : totaux justes", p.vote("b", 1, PL, 2300).ok && p.vote("c", 2, PL, 2300).ok && p.vote("H", 0, PL, 2300).ok && p.counts(PL).join() === "1,2,1");
t("joueur inconnu refusé", !p.vote("zz", 0, PL, 2400).ok && p.vote("zz", 0, PL, 2400).why === "unknown");
t("choix invalide refusé : hors bornes, négatif, décimal, texte, NaN, objet", [3, -1, 1.5, "0", NaN, null, undefined, {}, [0], Infinity].every(x => !p.vote("a", x, PL, 2400).ok) && p.counts(PL).join() === "1,2,1");
t("le vote d'un joueur parti ne compte plus", p.counts({ H: { id: "H" }, a: { id: "a" } }).join() === "1,1,0");
t("votes refusés après la fin du temps ou la fermeture", !p.vote("a", 0, PL, 1000 + 30000).ok && p.vote("a", 0, PL, 1000 + 30000).why === "closed" && (() => { const q = poll(); q.close(); return !q.vote("a", 0, PL, 1500).ok && !q.isOpen(1500); })());
t("ouvert avant la fin, fermé à l'heure pile", p.isOpen(1000 + 29999) && !p.isOpen(1000 + 30000));
t("temps restant arrondi vers le haut", p.remaining(1000) === 30 && p.remaining(1000 + 29001) === 1 && p.remaining(1000 + 40000) === 0);
t("clés de prototype comme identifiant : pas de plantage ni de vote", !p.vote("__proto__", 0, PL, 2000).ok && !p.vote("constructor", 0, PL, 2000).ok && !p.vote("hasOwnProperty", 0, PL, 2000).ok);

/* ---- pourcentages ---- */
t("pourcentages : somme exactement 100 (1/3 chacun → 34, 33, 33)", V.percents([1, 1, 1]).join() === "34,33,33" && V.percents([1, 1, 1]).reduce((a, b) => a + b) === 100);
t("pourcentages : aucun vote → 0 partout ; un seul choix → 100", V.percents([0, 0]).join() === "0,0" && V.percents([5, 0]).join() === "100,0" && V.percents([1, 3]).join() === "25,75");
t("pourcentages : toujours 100 sur des cas variés", [[7, 3, 2], [1, 2, 4, 8], [13, 13, 13, 1], [2, 2], [99, 1, 1]].every(c => V.percents(c).reduce((a, b) => a + b) === 100));

/* ---- données reçues ---- */
const L = V.sanitizeLaunch({ type: "v53Poll", id: "p-1", q: "Pause ?", opts: ["Oui", "Non"], secs: 30 });
t("sondage reçu valide conservé", L && L.q === "Pause ?" && L.opts.join() === "Oui,Non" && L.secs === 30 && L.id === "p-1");
t("sondage reçu invalide ignoré : mauvais type, sans question, moins de 2 choix, pas un tableau, pas un objet", [null, undefined, 5, "x", {}, { type: "chat" }, { type: "v53Poll", q: "", opts: ["a", "b"] }, { type: "v53Poll", q: "Q", opts: ["a"] }, { type: "v53Poll", q: "Q", opts: "ab" }, { type: "v53Poll", q: "Q", opts: ["", " "] }].every(x => V.sanitizeLaunch(x) === null));
const LB = V.sanitizeLaunch({ type: "v53Poll", id: "i".repeat(100) + "<>", q: "q".repeat(900), opts: Array.from({ length: 50 }, (_, i) => "o".repeat(300) + i), secs: 99999 });
t("sondage reçu : tailles, nombre de choix et durée bornés, identifiant nettoyé", LB.q.length === 100 && LB.opts.length === 4 && LB.opts.every(o => o.length === 40) && LB.secs === 60 && LB.id.length === 40 && /^[\w-]+$/.test(LB.id) && V.sanitizeLaunch({ type: "v53Poll", q: "Q", opts: ["a", "b"], secs: -5 }).secs === 1 && V.sanitizeLaunch({ type: "v53Poll", q: "Q", opts: ["a", "b"], secs: "x" }).secs === 30);
const R = V.sanitizeResult({ type: "v53Res", id: "p-1", counts: [3, "2", 99999999, -4], closed: true }, 4);
t("résultats reçus : entiers bornés, total recalculé (jamais repris du message), fermeture booléenne", R && R.counts.join() === "3,2,9999,0" && R.total === 3 + 2 + 9999 && R.closed === true && V.sanitizeResult({ type: "v53Res", id: "p", counts: [1, 2], total: 999999, closed: "oui" }, 2).total === 3 && V.sanitizeResult({ type: "v53Res", id: "p", counts: [1, 2], closed: "oui" }, 2).closed === false);
t("résultats reçus : mauvais nombre de choix, trop ou trop peu, pas un tableau → ignorés", V.sanitizeResult({ type: "v53Res", id: "p", counts: [1, 2, 3] }, 2) === null && V.sanitizeResult({ type: "v53Res", id: "p", counts: [1] }, 1) === null && V.sanitizeResult({ type: "v53Res", id: "p", counts: [1, 2, 3, 4, 5] }, 5) === null && V.sanitizeResult({ type: "v53Res", id: "p", counts: [1, 2, 3, 4, 5] }) === null && V.sanitizeResult({ type: "v53Res", id: "p", counts: "12" }, 2) === null && V.sanitizeResult(null, 2) === null && V.sanitizeResult({ type: "x", counts: [1, 2] }, 2) === null);

/* ---- branchement dans la page ---- */
const src = rd("js/patches/045-v53-sondage.js"), css = rd("css/v53.css"), html = rd("index.html");
t("votant = connexion réseau, écouteur posé avant celui du jeu", /connection\.on\("data"[\s\S]{0,260}d\.type === "v53Vote"\) d\.playerId = String\(connection\.peer\)[\s\S]{0,120}return baseSetup\.apply/.test(src));
t("un invité ne peut pas lancer de sondage ni fermer celui de l'hôte", /if \(!isHost\) return \{ ok: false/.test(src) && /function closePoll\(\) \{ if \(!isHost \|\| !cur\) return;/.test(src) && /if \(isHost\) hostVote\(String\(data\.playerId/.test(src));
t("seul l'hôte reçoit les votes ; seul l'invité affiche les sondages reçus (l'hôte a déjà le sien)", /data\.type === "v53Poll"\) \{ if \(!isHost\)/.test(src) && /data\.type === "v53Res"\) \{ if \(!isHost && view\)/.test(src));
t("résultats groupés : au plus 4 envois par seconde", /setTimeout\(function \(\) \{ sendT = 0; pushResults\(false\); \}, 250\)/.test(src));
t("délai de 3 s entre deux sondages, fermeture automatique à la fin du temps", /now - lastLaunch < 3000/.test(src) && /d\.secs \* 1000 \+ 300/.test(src));
t("un joueur qui arrive pendant un sondage le reçoit avec le temps restant", /data\.type === "join"/.test(src) && /cur\.remaining\(Date\.now\(\)\)/.test(src) && /type: "v53Poll", id: cur\.id/.test(src));
t("quitter la partie remet tout à zéro", /resetConnection = function \(\) \{ cur = null;/.test(src));
t("aucun innerHTML : question et choix en textContent", !/innerHTML/.test(src));
t("bouton 🗳️ réservé à l'hôte, panneau et sondage accessibles (étiquettes, rôle dialogue, mouvement réduit)", /b\.style\.display = isHost && roomCode/.test(src) && /aria-label/.test(src) && /role", "dialog"/.test(src) && /prefers-reduced-motion/.test(css));
t("index.html : v53.css, script 045 après 044 et avant le mode révision", html.includes("css/v53.css") && html.indexOf("044-v52-equipes.js") < html.indexOf("045-v53-sondage.js") && html.indexOf("045-v53-sondage.js") < html.indexOf("review/review.js"));
console.log("Sondage éclair : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
