/* 🏠 Salles — essai de bout en bout dans de vrais navigateurs (Chromium via Playwright), réseau PeerJS simulé.
   node tests/e2e/rooms.e2e.js        (facultatif : sans Playwright, l'essai est simplement ignoré)
   Joue : créer / rejoindre / règles, salle privée, verrouillage, salle pleine, joueur refusé (pas de « fantôme »),
   usurpation d'identité, fiche truquée, fermeture de la salle, réouverture au même code, « Rejouer »,
   hôte qui disparaît en pleine partie. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot();
  if (!N) { console.log("Salles (e2e) : Playwright absent, essai ignoré."); return; }
  const scr = p => N.ev(p, `document.querySelector('.screen.active').id`);
  const join = async (P, name, code, pass) => {
    await P.fill("#joinName", name); await P.fill("#roomInput", code);
    await P.evaluate(([x]) => { const f = document.getElementById("joinPass"); if (f) f.value = x || ""; }, [pass || ""]);
    await P.evaluate(() => joinRoom()); await P.waitForTimeout(900);
  };
  try {
    const H = await N.newPage("H"), G = await N.newPage("G"), X = await N.newPage("X"), Y = await N.newPage("Y");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom());
    await H.waitForSelector("#v54Room", { timeout: 10000 }).catch(() => {});
    const code = await H.textContent("#roomCodeDisplay");
    t("l'hôte arrive dans la salle d'attente avec sa carte « Ma salle »", (await scr(H)) === "lobbyScreen" && (await H.locator("#v54Room").count()) === 1);
    await H.fill("#v54Name", "Les Quizzeurs"); await H.locator("#v54Name").dispatchEvent("change");
    await H.fill("#v54Pass", "secret1"); await H.locator("#v54Pass").dispatchEvent("change");
    await H.fill("#v54Max", "5"); await H.locator("#v54Max").dispatchEvent("change"); await H.locator("#v54Less").click(); await H.locator("#v54Less").click(); await H.waitForTimeout(900);
    t("réglages pris en compte (3 places, privée)", /1\/3/.test(await H.textContent("#v54Badges")) && /privée/.test(await H.textContent("#v54Badges")));
    /* mot de passe */
    await join(G, "Bob", code, "");
    t("sans mot de passe : reste à l'accueil, message clair, champ ouvert", (await scr(G)) === "homeScreen" && /Salle privée/.test(await G.textContent("#homeMessage")) && await G.locator("#joinPass").isVisible());
    t("refusé = déconnecté (aucune connexion fantôme chez l'hôte)", (await N.ev(H, `Object.keys(connections).length`)) === 0);
    await join(G, "Bob", code, "faux");
    t("mauvais mot de passe : refus", /incorrect/.test(await G.textContent("#homeMessage")) && (await scr(G)) === "homeScreen");
    await join(G, "Bob", code, "secret1");
    t("bon mot de passe : dans la salle, fiche de salle visible", (await scr(G)) === "waitingScreen" && /Les Quizzeurs/.test(await G.textContent("#v54Info")) && /2\/3/.test(await G.textContent("#v54Info")));
    t("mot de passe effacé côté invité", (await N.ev(G, `V54State.pass + document.getElementById('joinPass').value`)) === "");
    /* verrouillage */
    await H.locator("#v54Lock").click(); await H.waitForTimeout(500);
    await join(X, "Carl", code, "secret1");
    t("verrouillée : refus", /verrouillé/.test(await X.textContent("#homeMessage")) && (await scr(X)) === "homeScreen");
    t("l'invité voit « verrouillée »", /verrouillée/.test(await G.textContent("#v54Info")));
    await H.locator("#v54Lock").click(); await H.waitForTimeout(400);
    await join(X, "Carl", code, "secret1");
    t("rouverte : Carl entre", (await scr(X)) === "waitingScreen");
    /* pleine + fantôme */
    await join(Y, "Dana", code, "secret1");
    t("salle pleine : refus", /pleine/.test(await Y.textContent("#homeMessage")));
    /* un vieux client (page restée ouverte avant la mise à jour) ignore le refus et reste connecté : c'est l'hôte qui doit le déconnecter */
    const Y2 = await N.newPage("Y2");
    await Y2.evaluate(() => { const old = handleData; handleData = function (d) { if (d && (d.type === "v54Refuse" || d.type === "error")) return; return old(d); }; });
    await join(Y2, "Eve", code, "secret1");
    await Y2.waitForTimeout(600);
    t("client qui ignore le refus : l'hôte l'a quand même déconnecté", (await N.ev(H, `Object.keys(connections).length`)) === 2);
    await G.evaluate(() => { resetConnection(); showScreen("homeScreen"); }); await H.waitForTimeout(800);
    t("une place se libère : les joueurs refusés NE reçoivent PAS l'écran d'attente (plus de fantôme)", (await scr(Y)) === "homeScreen" && (await N.ev(Y, `Object.keys(players).length`)) === 0 && (await scr(Y2)) === "homeScreen" && (await N.ev(Y2, `Object.keys(players).length`)) === 0);
    await join(G, "Bob", code, "secret1");
    /* usurpation */
    const bobId = await N.ev(G, `myId`), carlId = await N.ev(X, `myId`);
    await X.evaluate((bob) => { const c = Object.values(connections)[0]; c.send({ type: "rulesAccepted", playerId: bob }); c.send({ type: "chat", playerId: bob, name: "Bob", text: "salut tout le monde" }); }, bobId);
    await H.waitForTimeout(500);
    t("Carl ne peut pas accepter les règles à la place de Bob", (await N.ev(H, `!!players['${bobId}'].rulesOk`)) === false && (await N.ev(H, `!!players['${carlId}'].rulesOk`)) === true);
    t("Carl ne peut pas écrire au nom de Bob", (await N.ev(G, `JSON.stringify(window.__log.filter(m=>m.d.type==='chat').map(m=>m.d.playerId))`)) === JSON.stringify([carlId]));
    /* fiche truquée */
    await H.fill("#v54Max", "8"); await H.locator("#v54Max").dispatchEvent("change"); await H.waitForTimeout(500);
    await H.locator("#v54Pass").fill(""); await H.locator("#v54Pass").dispatchEvent("change"); await H.waitForTimeout(500);
    const Z = await N.newPage("Z");
    await Z.fill("#joinName", "Zed"); await Z.fill("#roomInput", code);
    await Z.evaluate(() => { const _cp = createPlayer; createPlayer = function (id, n, h) { const p = _cp(id, n, h); p.host = true; p.rulesOk = true; p.score = 99999; return p; }; });
    await Z.evaluate(() => joinRoom()); await Z.waitForTimeout(1000);
    t("fiche truquée (host, rulesOk, score) ignorée", await N.ev(H, `(function(){var z=Object.values(players).find(p=>p.name==='Zed'); return !!z && !z.host && !z.rulesOk && z.score===0;})()`));
    t("l'hôte reste le seul hôte", (await N.ev(H, `Object.values(players).filter(p=>p.host).map(p=>p.name).join()`)) === "Alice");
    /* règles visibles */
    await G.evaluate(() => acceptRules()); await G.waitForTimeout(900);
    t("compteur « ont accepté » chez l'invité", /\(\d\/\d ont accepté\)/.test(await G.textContent("#rulesGuestNote")));
    /* fermer la salle */
    await H.locator("#v54Close").click(); await H.waitForTimeout(300); await H.locator("#confirmButton").click(); await H.waitForTimeout(1300);
    t("fermeture : l'hôte et les invités retournent à l'accueil avec un message", (await scr(H)) === "homeScreen" && (await scr(X)) === "homeScreen" && /fermé/.test(await X.textContent("#homeMessage")));
    /* réouverture */
    t("bouton « Rouvrir ma salle » proposé", /Rouvrir ma salle/.test(await H.locator("#v54Reopen").textContent()));
    await H.fill("#hostName", "Alice"); await H.locator("#v54Reopen").click(); await H.waitForTimeout(1500);
    t("même code et mêmes réglages (nom, places) après réouverture", (await H.textContent("#roomCodeDisplay")) === code && (await N.ev(H, `V54State.st.name+'|'+V54State.st.max`)) === "Les Quizzeurs|8");
    t("le mot de passe n'est PAS conservé : la salle rouverte est publique", (await N.ev(H, `V54State.st.pass`)) === "");
    await H.waitForSelector("#v54Room", { timeout: 5000 }).catch(() => {});
    t("la carte de la salle rouverte est neuve : ancien mot de passe non réaffiché, nom repris", (await H.inputValue("#v54Pass")) === "" && (await H.inputValue("#v54Name")) === "Les Quizzeurs");
    await join(G, "Bob", code, "");
    t("un invité rejoint la salle rouverte", (await scr(G)) === "waitingScreen");
    /* partie : hôte qui disparaît */
    for (const P of [H, G]) await P.evaluate(() => acceptRules());
    await H.waitForTimeout(500);
    await H.selectOption("#roundCount", "5");
    await H.locator("#startButton").scrollIntoViewIfNeeded(); await H.locator("#startButton").click(); await H.waitForTimeout(400); await H.locator("#confirmButton").click();
    for (let i = 0; i < 25; i++) { await H.waitForTimeout(1000); if ((await scr(G)) === "gameScreen") break; }
    t("la partie démarre chez l'invité", (await scr(G)) === "gameScreen");
    await H.waitForTimeout(1200);
    await H.evaluate(() => peer.destroy()); await G.waitForTimeout(1200);
    t("hôte disparu en pleine partie : message + bouton (plus de blocage silencieux)", await G.locator("#v54Gone").isVisible());
    await G.locator("#v54Gone button").click(); await G.waitForTimeout(300);
    t("retour à l'accueil depuis ce message", (await scr(G)) === "homeScreen" && !(await G.locator("#v54Gone").isVisible()));
    /* places illimitées : plus de limite de 8, et une salle à 1 place refuse tout le monde */
    const U = await N.newPage("U");
    await U.fill("#hostName", "Uma"); await U.evaluate(() => createRoom()); await U.waitForSelector("#v54Room", { timeout: 10000 }).catch(() => {});
    const ucode = await U.textContent("#roomCodeDisplay");
    await U.locator("#v54Inf").click(); await U.waitForTimeout(500);
    t("∞ : la carte l'affiche (👥 1/∞), le champ est grisé", /1\/∞/.test(await U.textContent("#v54Badges")) && await U.locator("#v54Max").isDisabled() && (await U.locator("#v54Inf").getAttribute("aria-pressed")) === "true");
    const guests = [];
    for (let i = 0; i < 9; i++) { const P = await N.newPage("U" + i); guests.push(P); await P.fill("#joinName", "Invite" + "abcdefghi"[i]); await P.fill("#roomInput", ucode); await P.evaluate(() => joinRoom()); await P.waitForTimeout(350); }
    await U.waitForTimeout(800);
    t("10 joueurs dans une salle illimitée (l'ancienne limite était 8)", (await N.ev(U, `Object.keys(players).length`)) === 10 && (await scr(guests[8])) === "waitingScreen");
    t("fiche de salle chez le dernier arrivé : 10/∞", /10\/∞/.test(await guests[8].textContent("#v54Info")));
    await U.locator("#v54Inf").click(); await U.waitForTimeout(400);
    t("quitter ∞ : le nombre de places ne tombe jamais sous le nombre de joueurs", (await N.ev(U, `V54State.st.max`)) >= 10);
    await U.fill("#v54Max", "1"); await U.locator("#v54Max").dispatchEvent("change"); await U.waitForTimeout(500);
    t("saisie de 1 avec 10 joueurs : remontée à 10", (await N.ev(U, `V54State.st.max`)) === 10);
    const S1 = await N.newPage("S1");
    await S1.fill("#hostName", "Solo"); await S1.evaluate(() => createRoom()); await S1.waitForSelector("#v54Room", { timeout: 10000 }).catch(() => {});
    const scode = await S1.textContent("#roomCodeDisplay");
    await S1.fill("#v54Max", "1"); await S1.locator("#v54Max").dispatchEvent("change"); await S1.waitForTimeout(500);
    t("1 place : badge 1/1 complète", /1\/1/.test(await S1.textContent("#v54Badges")) && /complète/.test(await S1.textContent("#v54Badges")));
    const W1 = await N.newPage("W1"); await join(W1, "Passant", scode, "");
    t("1 place : personne ne peut rejoindre", (await scr(W1)) === "homeScreen" && /pleine/.test(await W1.textContent("#homeMessage")));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Salles (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
