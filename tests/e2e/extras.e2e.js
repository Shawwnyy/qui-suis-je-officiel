/* Outils de l'hôte — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)   node tests/e2e/extras.e2e.js
   Joue : thèmes favoris et inversion, difficulté progressive sur une vraie partie, mémoire des questions posées,
   tirage « jamais jouées d'abord », bouton « Oublier », réglages gardés dans le navigateur. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const SHOTS = process.env.SHOTS || "";
(async () => {
  const N = await boot({ viewport: { width: 880, height: 1000 } });
  if (!N) { console.log("Outils de l'hôte (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v58Extras", { timeout: 10000 }); await H.waitForTimeout(800);
    const checked = () => N.ev(H, `[...document.querySelectorAll('#themeGrid input:checked')].map(i=>i.value).sort()`);
    const info = () => H.textContent("#v58Info");
    t("la carte « Outils de l'hôte » est sous la carte de configuration", await H.evaluate(() => document.getElementById("v57Config").nextElementSibling.id === "v58Extras"));
    t("au départ : 0 question déjà jouée, nombre de nouvelles annoncé", /^🧠 0 question déjà jouée sur cet appareil · [\d  ]+ jamais jouées? sur [\d  ]+ dans les thèmes cochés\.$/.test((await info()).trim()));
    /* favoris */
    await H.locator("#v58FavLoad").click(); await H.waitForTimeout(200);
    t("favoris vides : message d'aide, rien de coché de plus", /Pas encore de favoris/.test(await H.textContent("#v58Msg")));
    await N.ev(H, `randomThemes(3)`); await H.waitForTimeout(300);
    const three = await checked();
    await H.locator("#v58FavSave").click(); await H.waitForTimeout(300);
    t("« Enregistrer ma sélection » : 3 thèmes en favoris, le bouton affiche (3)", /3 thème/.test(await H.textContent("#v58Msg")) && /\(3\)/.test(await H.textContent("#v58FavLoad")));
    await H.locator("#v58Invert").click(); await H.waitForTimeout(500);
    const inv = await checked();
    t("« Inverser » : tous les autres thèmes sont cochés (201 − 3)", inv.length === 198 && three.every(v => !inv.includes(v)));
    await H.locator("#v58Invert").click(); await H.waitForTimeout(500);
    t("« Inverser » deux fois : la sélection d'origine revient", JSON.stringify(await checked()) === JSON.stringify(three));
    await N.ev(H, `randomThemes(9)`); await H.waitForTimeout(300);
    await H.locator("#v58FavLoad").click(); await H.waitForTimeout(500);
    t("« Mes favoris » : retrouve exactement les 3 thèmes enregistrés", JSON.stringify(await checked()) === JSON.stringify(three));
    t("favoris gardés dans le navigateur", await H.evaluate(() => JSON.parse(localStorage.getItem("quizV58Favs")).length === 3));
    /* thèmes larges pour les parties qui suivent */
    await H.evaluate(() => { const b = document.getElementById("v21SelectVisible"); if (b) b.click(); }); await H.waitForTimeout(500);
    /* options + partie */
    await H.locator("#v58Prog").check(); await H.locator("#v58Fresh").check(); await H.waitForTimeout(300);
    t("options gardées dans le navigateur", await H.evaluate(() => { const o = JSON.parse(localStorage.getItem("quizV58Opts")); return o.fresh === true && o.prog === true; }));
    await H.evaluate(() => acceptRules()); await H.waitForTimeout(300);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "20"; r.dispatchEvent(new Event("change", { bubbles: true })); startGame(); }); await H.waitForTimeout(9000);
    const used = await N.ev(H, `usedQuestions.map(q=>[q.difficulty,q.v58k||'',q.question])`);
    const rank = { facile: 0, moyen: 1, difficile: 2, impossible: 3 };
    t("la partie compte 20 questions, chacune porte sa clé", used.length === 20 && used.every(u => /^[0-9a-z]{1,8}$/.test(u[1])));
    t("difficulté progressive : l'ordre ne redescend jamais", used.every((u, i) => i === 0 || rank[u[0]] >= rank[used[i - 1][0]]));
    t("difficulté progressive : plusieurs niveaux présents (le tri n'est pas un hasard)", new Set(used.map(u => u[0])).size >= 2);
    t("la première question affichée est bien la première de la liste rangée", (await N.ev(H, `currentQuestion && usedQuestions[0] && currentQuestion.question === usedQuestions[0].question`)) === true);
    await H.waitForTimeout(1500);
    const seen = await H.evaluate(() => JSON.parse(localStorage.getItem("quizV58Seen") || "[]"));
    t("la question posée est retenue comme « jouée » (1 seule, pas les 19 suivantes)", seen.length === 1 && seen[0] === used[0][1]);
    t("l'écran annonce 1 question déjà jouée", /^🧠 1 question déjà jouée/.test((await info()).trim()));
    /* tirage */
    const key = used[0][1];
    const inPool = () => N.ev(H, `getQuestionPool().some(q=>V58.qKey(q)==='${key}')`);
    t("« jamais jouées d'abord » : la question déjà posée n'est plus dans le tirage", (await inPool()) === false);
    await H.evaluate(() => { const c = document.getElementById("v58Fresh"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true })); });
    t("option éteinte : elle revient dans le tirage", (await inPool()) === true);
    await H.evaluate(() => { const c = document.getElementById("v58Fresh"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); });
    /* pas assez de nouvelles : tout le lot est gardé */
    const full = await N.ev(H, `(function(){ const all=getQuestionPool().length; V58UI.state.seen = V58.cleanSeen(QUESTIONS.map(V58.qKey)).slice(0, 100000); const n=getQuestionPool().length; V58UI.state.seen=${JSON.stringify(seen)}; return [all,n]; })()`);
    t("tout est déjà joué : la partie reste jouable avec tout le lot", full[1] > 0 && full[1] >= full[0]);
    /* oublier */
    await H.evaluate(() => { try { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); } catch (e) {} });
    await H.evaluate(() => document.getElementById("v58Reset").click()); await H.waitForTimeout(2600); /* plus long qu'un tick de la mémoire : la partie en cours ne doit pas re-remplir l'historique */
    t("« Oublier les questions jouées » : mémoire vide et message", (await H.evaluate(() => JSON.parse(localStorage.getItem("quizV58Seen")).length)) === 0 && /Historique effacé/.test(await H.textContent("#v58Msg")));
    t("après l'oubli, la question revient dans le tirage", (await inPool()) === true);
    if (SHOTS) { await H.evaluate(() => { document.getElementById("v58Extras").scrollIntoView(); }); await H.screenshot({ path: SHOTS + "/extras.png" }); }
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Outils de l'hôte (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
