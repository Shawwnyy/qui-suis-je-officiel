/* 🏠 ⚙️ 🎮 Menus du dock et préréglages — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)
   node tests/e2e/menus.e2e.js        (facultatif : sans Playwright, l'essai est ignoré)
   Joue : 12 joueurs dans une salle illimitée, panneau « Ma salle », expulsion (fenêtre de confirmation cliquable),
   annonce d'arrivée, réglages mémorisés après rechargement, préréglages, reprise de config et thèmes réellement joués. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot();
  if (!N) { console.log("Menus (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v54Room", { timeout: 10000 });
    const code = await H.textContent("#roomCodeDisplay");
    await H.locator("#v54Inf").click();
    for (let i = 0; i < 11; i++) { const P = await N.newPage("G" + i); await P.fill("#joinName", "Joueur" + "abcdefghijk"[i]); await P.fill("#roomInput", code); await P.evaluate(() => joinRoom()); await P.waitForTimeout(300); }
    await H.waitForTimeout(1500);
    t("12 joueurs dans la salle illimitée", (await N.ev(H, `Object.keys(players).length`)) === 12);
    t("le dock a les boutons 🏠 et ⚙️", (await H.locator("#dockRoom").count()) === 1 && (await H.locator("#dockSet").count()) === 1);
    await H.locator("#dockRoom").click(); await H.waitForTimeout(400);
    t("panneau « Ma salle » : une ligne par joueur", (await H.locator(".v55-row").count()) === 12);
    await H.locator(".v55-kick").first().click(); await H.waitForTimeout(500);
    await H.locator("#confirmButton").click({ timeout: 5000 }).catch(() => {}); await H.waitForTimeout(1500);
    t("expulsion depuis le panneau : la fenêtre de confirmation est cliquable (au-dessus du panneau)", (await N.ev(H, `Object.keys(players).length`)) === 11 && (await H.locator(".v55-row").count()) === 11);
    const J = await N.newPage("J"); await J.fill("#joinName", "Nouveau"); await J.fill("#roomInput", code); await J.evaluate(() => joinRoom());
    await H.waitForTimeout(1600);
    t("annonce d'arrivée", /Nouveau a rejoint/.test(await N.ev(H, `Array.from(document.querySelectorAll('body *')).map(e=>e.children.length?'':e.textContent).join(' ')`)));
    await H.locator("#dockSet").click(); await H.waitForTimeout(300);
    await H.locator(".v55-s", { hasText: "A+" }).click(); await H.locator(".v55-s", { hasText: "A+" }).click();
    await H.locator(".v55-tg", { hasText: "Moins d'animations" }).click(); await H.waitForTimeout(200);
    await H.reload(); await H.waitForTimeout(800);
    t("réglages mémorisés après rechargement (texte 120 %, moins d'animations)", (await N.ev(H, `document.documentElement.style.getPropertyValue('--v55-zoom')`)) === "1.2" && (await N.ev(H, `document.body.classList.contains('v55-calm')`)));
    /* préréglages et reprise de configuration (nouvelle salle : la page a été rechargée) */
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v56Presets", { timeout: 10000 });
    await H.locator("#v56Presets button", { hasText: "Marathon" }).click(); await H.waitForTimeout(200);
    t("préréglage Marathon : 50 questions, 20 s", (await N.ev(H, `document.getElementById('roundCount').value+'/'+document.getElementById('questionTime').value`)) === "50/20");
    await H.locator("#v56Presets button", { hasText: "Éclair" }).click(); await H.waitForTimeout(200);
    t("préréglage Éclair : 10 questions, 10 s", (await N.ev(H, `document.getElementById('roundCount').value+'/'+document.getElementById('questionTime').value`)) === "10/10");
    t("« Reprendre ma config » grisé tant que rien n'est mémorisé", await H.locator("#v56Restore").isDisabled());
    await N.ev(H, `randomThemes(3)`); await H.waitForTimeout(300);
    const before = await N.ev(H, `[...document.querySelectorAll('#themeGrid input:checked')].map(i=>i.value).sort()`);
    await H.locator("#v56Save").click(); await H.waitForTimeout(200);
    await H.locator("#v56Presets button", { hasText: "Marathon" }).click(); await N.ev(H, `randomThemes(9)`); await H.waitForTimeout(300);
    await H.locator("#v56Restore").click(); await H.waitForTimeout(800);
    t("reprise : 10 questions, 10 s et les 3 mêmes thèmes", (await N.ev(H, `document.getElementById('roundCount').value+'/'+document.getElementById('questionTime').value`)) === "10/10" && JSON.stringify(await N.ev(H, `[...document.querySelectorAll('#themeGrid input:checked')].map(i=>i.value).sort()`)) === JSON.stringify(before));
    await H.evaluate(() => acceptRules()); await H.waitForTimeout(300);
    await H.evaluate(() => { startGame(); }); await H.waitForTimeout(9000);
    const cats = await N.ev(H, `[...new Set(usedQuestions.map(q=>q.category))].sort()`);
    t("la partie lancée joue exactement les thèmes repris", cats.length > 0 && cats.every(c => before.includes(c)));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Menus (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
