/* 🔮 Pronostic, 🕳️ question piège et nouveaux pouvoirs — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)
   node tests/e2e/predict.e2e.js     (facultatif : sans Playwright, l'essai est ignoré)
   Joue : deux navigateurs (hôte + invité), partie réelle, fenêtre de pari avant la dernière question, paris reçus par l'hôte,
   règlement (×2 / ÷2) diffusé à tous, écran des résultats ensuite ; question piège ×5 / −300 ; nouveaux pouvoirs dans les listes du jeu. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const SHOTS = process.env.SHOTS || "";
(async () => {
  const N = await boot({ viewport: { width: 900, height: 1000 } });
  if (!N) { console.log("Pronostic (e2e) : Playwright absent, essai ignoré."); return; }
  const scr = p => N.ev(p, `document.querySelector('.screen.active').id`);
  try {
    const H = await N.newPage("H"), G = await N.newPage("G");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#optPredict", { timeout: 10000 }); await H.waitForTimeout(600);
    t("les deux options sont dans « Modes fun », cochées par défaut, avec le choix de fréquence des pièges (normale)", (await H.locator("#optTrap").isChecked()) && (await H.locator("#optPredict").isChecked()) && (await H.locator("#optTrapFreq").inputValue()) === "normale");
    t("les anciennes cases de « Modes fun » sont enfin visibles (24 px)", (await H.evaluate(() => ["optGolden", "optEvents", "optStreak", "optImpossible", "optTrap", "optPredict"].every(id => document.getElementById(id).getBoundingClientRect().width === 24))));
    const code = await H.textContent("#roomCodeDisplay");
    await G.fill("#joinName", "Bob"); await G.fill("#roomInput", code); await G.evaluate(() => joinRoom()); await G.waitForTimeout(1200);
    t("l'invité est dans la salle", (await scr(G)) === "waitingScreen");
    await H.evaluate(() => { const c = document.getElementById("optGolden"); if (c) c.checked = false; const e = document.getElementById("optEvents"); if (e) e.checked = false; });
    for (const P of [H, G]) await P.evaluate(() => acceptRules());
    await H.waitForTimeout(500);
    await H.selectOption("#roundCount", "5");
    await H.locator("#startButton").scrollIntoViewIfNeeded(); await H.locator("#startButton").click(); await H.waitForTimeout(400); await H.locator("#confirmButton").click();
    for (let i = 0; i < 25; i++) { await H.waitForTimeout(1000); if ((await scr(G)) === "gameScreen") break; }
    t("la partie démarre chez l'invité", (await scr(G)) === "gameScreen");
    await H.waitForTimeout(1500);
    const hid = await N.ev(H, `myId`), gid = await N.ev(G, `myId`);
    /* la partie est raccourcie à 3 questions et on saute à la dernière-1 : la fenêtre de pari s'ouvre avant la 3e */
    await N.ev(H, `usedQuestions = usedQuestions.slice(0, 3); totalRounds = 3; currentQuestionIndex = 1; 0`);
    await H.evaluate(() => sendAnswer(0)); await G.evaluate(() => sendAnswer(0));
    let opened = false;
    for (let i = 0; i < 45; i++) { await H.waitForTimeout(1000); if ((await H.locator("#v59Overlay").count()) && (await G.locator("#v59Overlay").count())) { opened = true; break; } }
    t("la fenêtre de pari s'ouvre chez l'hôte ET chez l'invité avant la dernière question", opened);
    t("elle propose les places 1 et 2 (2 joueurs) et rappelle la règle ×2 / ÷2", (await H.locator("#v59Ranks .v59-r").count()) === 2 && /×2/.test(await H.textContent("#v59Overlay")) && /÷2/.test(await H.textContent("#v59Overlay")));
    t("un rappel du classement du moment est affiché", /Aujourd.hui : \d(ʳᵉ|ᵉ) avec/.test(await G.textContent("#v59Overlay")));
    if (SHOTS) await G.screenshot({ path: SHOTS + "/predict-bet.png" });
    await G.locator('#v59Ranks .v59-r[data-k="1"]').click(); await G.waitForTimeout(500);
    t("l'invité a parié : confirmation et pastille « Ton pari » ; l'hôte n'a pas encore fermé la fenêtre", /Pari enregistré/.test(await G.textContent("#v59Overlay")) && /1ʳᵉ place/.test(await G.textContent("#v59Chip")) && (await H.locator("#v59Overlay").count()) === 1);
    t("l'hôte a reçu le pari de l'invité (identité prise de la connexion)", (await N.ev(H, `JSON.stringify(Object.keys(V59UI.state.picks))`)) === JSON.stringify([gid]));
    await H.locator('#v59Ranks .v59-r[data-k="1"]').click(); await H.waitForTimeout(1500);
    t("tout le monde a parié : la fenêtre se ferme des deux côtés et la dernière question part", (await H.locator("#v59Overlay").count()) === 0 && (await G.locator("#v59Overlay").count()) === 0 && (await N.ev(H, `currentQuestionIndex`)) === 2);
    t("les deux paris sont connus de l'hôte", (await N.ev(H, `V59UI.state.picks['${hid}']+'/'+V59UI.state.picks['${gid}']`)) === "1/1");
    /* règlement : scores imposés pour un résultat connu (Alice 1000 = 1re, Bob 400 = 2e) */
    await N.ev(H, `players['${hid}'].score = 1000; players['${gid}'].score = 400; finishGame(); 0`);
    await H.waitForTimeout(1500);
    t("résultat affiché chez l'hôte et chez l'invité", /Résultat des pronostics/.test(await H.textContent("#v59Overlay")) && /Résultat des pronostics/.test(await G.textContent("#v59Overlay")));
    t("Alice (pari 1, 1re) : ✅ score ×2 = 2000 ; Bob (pari 1, 2e) : ❌ score ÷2 = 200", (await N.ev(H, `players['${hid}'].score + '/' + players['${gid}'].score`)) === "2000/200");
    t("l'invité voit les mêmes scores", (await N.ev(G, `players['${hid}'].score + '/' + players['${gid}'].score`)) === "2000/200");
    const rows = await G.evaluate(() => Array.from(document.querySelectorAll("#v59Overlay .v59-row")).map(r => r.className.replace(/\s+/g, " ") + "|" + r.textContent));
    t("deux lignes : une verte pour Alice, une rouge pour Bob (la sienne en premier, repérée)", rows.length === 2 && /ok/.test(rows.find(r => /Alice/.test(r))) && /ko me/.test(rows.find(r => /Bob/.test(r))) && /Bob/.test(rows[0]));
    t("les lignes montrent pari, place réelle et score avant → après", rows.some(r => /pari 1ʳᵉ · réel 2ᵉ/.test(r) && /400 → 200/.test(r)) && rows.some(r => /pari 1ʳᵉ · réel 1ʳᵉ/.test(r) && /1 ?000 → 2 ?000/.test(r)));
    if (SHOTS) await G.screenshot({ path: SHOTS + "/predict-result.png" });
    for (let i = 0; i < 14; i++) { await H.waitForTimeout(1000); if ((await scr(H)) === "resultsScreen" && (await scr(G)) === "resultsScreen") break; }
    t("après quelques secondes, l'écran des résultats arrive chez tous avec les scores réglés", (await scr(H)) === "resultsScreen" && (await scr(G)) === "resultsScreen" && /Alice/.test(await H.textContent("#winnerName")) && (await N.ev(G, `players['${gid}'].score`)) === 200);
    t("la fenêtre est refermée et la pastille « Ton pari » effacée chez tous", (await H.locator("#v59Overlay").count()) === 0 && (await G.locator("#v59Overlay").count()) === 0 && (await G.locator("#v59Chip").count()) === 0 && (await H.locator("#v59Chip").count()) === 0);
    /* question piège : ×5 si juste, −300 si faux */
    const trap = await N.ev(H, `(function(){
      const base = { difficulty:'facile', category:'T', question:'q', answers:['a','b'], correct:0, golden:false, event:null };
      const p = { id:'x', name:'x', score:0, combo:1, fx:{} };
      currentQuestion = Object.assign({}, base, { trap:false }); const g1 = applyScoreFx(p, 1000, { time: 5 });
      currentQuestion = Object.assign({}, base, { trap:true });  const g5 = applyScoreFx(p, 1000, { time: 5 });
      const w = { id:'y', name:'y', score:1000, combo:2, fx:{}, wrong:0 };
      currentQuestion = Object.assign({}, base, { trap:true }); onWrongFx(w); const afterTrap = w.score;
      const w2 = { id:'z', name:'z', score:1000, combo:2, fx:{}, wrong:0 };
      currentQuestion = Object.assign({}, base, { trap:false }); onWrongFx(w2);
      return [g1, g5, afterTrap, w.malusPoints, w2.score].join('/'); })()`);
    const [g1, g5, aft, mal, w2] = trap.split("/").map(Number);
    t("piège : bonne réponse = exactement ×5 les points d'une question normale", g1 > 0 && g5 === g1 * 5);
    t("piège : mauvaise réponse = −300 pts (1000 → 700), comptés en malus ; question normale : aucun retrait", aft === 700 && mal === 300 && w2 === 1000);
    /* nouveaux pouvoirs dans les listes du jeu */
    const lists = await N.ev(H, `['cadeau','machine','radar','rente','rattrapage','magicien','treve'].every(i=>EXT_POWERS[i] && EXT_IDS.bonus.includes(i) && POWER_KINDS.bonus.includes(i)) && ['mine','deval','montagnes','brouillard','faucheuse','vampire'].every(i=>EXT_POWERS[i] && EXT_IDS.malus.includes(i) && POWER_KINDS.malus.includes(i)) && ['mine','deval','brouillard'].every(i=>NEG_FX.includes(i)) && ['radar','rente','magicien','treve'].every(i=>POS_FX.includes(i))`);
    t("les 13 nouveaux pouvoirs sont dans les listes du jeu (tirage, effets, limite de malus, purification)", lists === true);
    const eff = await N.ev(H, `(function(){
      const A = { id:'A', name:'A', score:100, combo:0, fx:{}, used:[] }, B = { id:'B', name:'B', score:3000, combo:3, fx:{}, used:[] };
      players['A'] = A; players['B'] = B;
      const r1 = applyExtPower(A, B, 'vampire', 2);
      const afterVamp = A.score + '/' + B.score;
      B.shield = true; const r2 = applyExtPower(A, B, 'faucheuse', 2);
      const blocked = r2.blocked + ':' + B.score;
      const r3 = applyExtPower(A, B, 'mine', 2); const mine = B.fx.mine && B.fx.mine.left;
      currentQuestion = { difficulty:'facile', trap:false }; onWrongFx(B);
      const afterMine = B.score;
      const r4 = applyExtPower(B, A, 'cadeau', 2);
      delete players['A']; delete players['B'];
      return [afterVamp, blocked, mine, afterMine, B.combo].join('|'); })()`);
    t("Vampire vole 10 % (3000 → 2700, +300 pour l'attaquant) ; un bouclier bloque la Faucheuse ; la Mine explose à l'erreur (−300) ; Cadeau +1 combo", eff === "400/2700|true:2700|1|2400|1");
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|Connection|closed/i.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Pronostic (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
