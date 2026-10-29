/* Écran de configuration — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)
   node tests/e2e/config.e2e.js        (facultatif : sans Playwright, l'essai est ignoré)
   Joue : résumé en direct, liste des langues réparée si vidée, création de salle qui survit à un script planté,
   filtre de difficulté réellement appliqué à la partie lancée, code de config copié puis appliqué, marathon mémorisé, langue anglaise. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const SHOTS = process.env.SHOTS || "";
(async () => {
  const N = await boot({ viewport: { width: 880, height: 1000 } });
  if (!N) { console.log("Config (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    const lines = async () => H.evaluate(() => Array.from(document.querySelectorAll("#v57Lines .v57-chip")).map(c => c.getAttribute("data-k") + "=" + c.textContent));
    const lang = async () => H.evaluate(() => { const s = document.getElementById("questionLang"); return s.options.length + "/" + s.selectedIndex + "/" + s.value; });
    t("résumé affiché : durée et questions disponibles", (await lines()).some(l => /^time=⏱️ ≈ \d+ min · 10 questions × 20 s$/.test(l)) && (await lines()).some(l => /^pool=📚 [\d ]+ questions dans \d+ thèmes$/.test(l)));
    t("liste des langues remplie : Français, English, Español, Français sélectionné", (await lang()) === "3/0/fr");
    /* réparation automatique */
    await H.evaluate(() => { document.getElementById("questionLang").innerHTML = ""; document.getElementById("roundCount").selectedIndex = -1; document.getElementById("questionTime").selectedIndex = -1; });
    t("(contrôle) liste vidée avant la réparation", (await lang()).startsWith("0/"));
    await H.waitForTimeout(2300);
    t("liste des langues reconstruite toute seule en moins de 2 s", (await lang()) === "3/0/fr");
    t("listes des questions et du temps : une valeur est de nouveau sélectionnée", (await H.evaluate(() => document.getElementById("roundCount").selectedIndex >= 0 && document.getElementById("questionTime").selectedIndex >= 0)));
    await H.evaluate(() => { document.getElementById("themeGrid").replaceChildren(); }); await H.waitForTimeout(2300);
    t("grille des thèmes vidée → reconstruite avec les 201 thèmes", (await H.evaluate(() => document.querySelectorAll("#themeGrid input").length)) === 201);
    /* difficulté */
    await H.locator("#v57Diffs button[data-d=difficile]").click(); await H.waitForTimeout(300);
    t("difficulté : seule « Difficile » active, résumé mis à jour", (await H.locator("#v57Diffs button.on").count()) === 1 && (await lines()).some(l => l === "diffs=🎚️ Difficile"));
    await H.locator("#v57Diffs button[data-d=moyen]").click(); await H.waitForTimeout(300);
    t("difficulté : on peut en cumuler plusieurs (Moyen + Difficile)", (await H.locator("#v57Diffs button.on").count()) === 2 && (await lines()).some(l => l === "diffs=🎚️ Moyen, Difficile"));
    await H.locator("#v57Diffs button[data-d=moyen]").click(); await H.locator("#v57Diffs button[data-d=difficile]").click(); await H.waitForTimeout(300);
    t("difficulté : tout décocher = toutes les difficultés", (await H.locator("#v57Diffs button.on").count()) === 0 && !(await lines()).some(l => /^diffs=/.test(l)));
    await H.locator("#v57Diffs button[data-d=difficile]").click(); await H.waitForTimeout(200);
    await H.evaluate(() => acceptRules()); await H.waitForTimeout(300);
    await H.evaluate(() => { document.getElementById("roundCount").value = "20"; startGame(); }); await H.waitForTimeout(9000);
    const used = await N.ev(H, `usedQuestions.map(q=>q.difficulty)`);
    t("la partie lancée ne joue que des questions difficiles", used.length >= 10 && used.every(d => d === "difficile"));
    await N.ev(H, `(function(){ try { finishGame(); } catch(e){} })()`); await H.waitForTimeout(800);
    await H.evaluate(() => { try { skipRatingV11(); } catch (e) {} replayV9(); }); await H.waitForTimeout(1500);
    await H.evaluate(() => { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); });
    t("après la partie, la difficulté choisie est conservée à l'écran de configuration", (await H.locator("#v57Diffs button.on").count()) === 1);
    await H.locator("#v57Diffs button[data-d=difficile]").click(); await H.waitForTimeout(200);
    /* code de config */
    await N.ev(H, `randomThemes(3)`); await H.waitForTimeout(300);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "20"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); q.value = "30"; q.dispatchEvent(new Event("change", { bubbles: true })); });
    await H.locator("#v57Diffs button[data-d=facile]").click(); await H.waitForTimeout(300);
    const before = await N.ev(H, `[...document.querySelectorAll('#themeGrid input:checked')].map(i=>i.value).sort()`);
    await H.locator("#v57Copy").click(); await H.waitForTimeout(400);
    const code = await H.inputValue("#v57Code");
    t("« Copier mon code » : un code QSJ1. est affiché", /^QSJ1\.[A-Za-z0-9_-]+$/.test(code));
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "5"; r.dispatchEvent(new Event("change", { bubbles: true })); });
    await N.ev(H, `randomThemes(9)`); await H.locator("#v57Diffs button[data-d=facile]").click(); await H.waitForTimeout(300);
    await H.fill("#v57Code", code); await H.locator("#v57Apply").click(); await H.waitForTimeout(1500);
    const after = await N.ev(H, `[...document.querySelectorAll('#themeGrid input:checked')].map(i=>i.value).sort()`);
    t("« Appliquer ce code » : 20 questions, 30 s, difficulté Facile et les mêmes 3 thèmes", (await N.ev(H, `document.getElementById('roundCount').value+'/'+document.getElementById('questionTime').value`)) === "20/30" && JSON.stringify(after) === JSON.stringify(before) && (await H.locator("#v57Diffs button.on").count()) === 1 && /Config appliquée/.test(await H.textContent("#v57Msg")));
    await H.fill("#v57Code", "n'importe quoi"); await H.locator("#v57Apply").click(); await H.waitForTimeout(300);
    t("code invalide : message d'erreur, configuration inchangée", /Code invalide/.test(await H.textContent("#v57Msg")) && (await N.ev(H, `document.getElementById('roundCount').value`)) === "20");
    /* marathon mémorisé (V56) */
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "999"; r.dispatchEvent(new Event("change", { bubbles: true })); });
    await H.locator("#v56Save").click(); await H.waitForTimeout(200);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "10"; r.dispatchEvent(new Event("change", { bubbles: true })); });
    await H.locator("#v56Restore").click(); await H.waitForTimeout(900);
    t("« toutes les questions » (999) se mémorise et se reprend", (await N.ev(H, `document.getElementById('roundCount').value`)) === "999" && (await lines()).some(l => /^time=.*(toutes les|999 questions)/.test(l)));
    /* langue anglaise */
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "10"; r.dispatchEvent(new Event("change", { bubbles: true })); const s = document.getElementById("questionLang"); s.value = "en"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await H.waitForTimeout(3500);
    const en = await lines();
    t("anglais : la langue est annoncée, le nombre de questions disponibles est calculé", en.some(l => /^lang=🌐 🇬🇧 English$/.test(l)) && en.some(l => /^pool=📚 [\d ]+ questions? dans/.test(l)));
    t("anglais : les thèmes cochés sans traduction sont signalés", en.some(l => /^untranslated=ℹ️ \d+ thèmes? cochés? n/.test(l)));
    if (SHOTS) { await H.evaluate(() => document.getElementById("v57Config").scrollIntoView()); await H.screenshot({ path: SHOTS + "/config.png" }); }
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog/.test(e)).join("\n"));
    /* une étape de création de salle qui plante ne vide ni la langue, ni les thèmes */
    const G = await N.newPage("G");
    await G.evaluate(() => { (0, eval)("showScreen = function () { throw new Error('boum'); }"); });
    await G.fill("#hostName", "Bob"); await G.evaluate(() => createRoom()); await G.waitForTimeout(2500);
    const g = await G.evaluate(() => ({ langs: document.getElementById("questionLang").options.length, sel: document.getElementById("questionLang").selectedIndex, themes: document.querySelectorAll("#themeGrid input").length }));
    t("création de salle avec un script de correctif qui plante : langues (3) et thèmes (201) construits quand même", g.langs === 3 && g.sel === 0 && g.themes === 201);
    t("l'erreur est consignée dans la console au lieu d'interrompre la création", N.errs.some(e => /Création de la salle/.test(e) || /boum/.test(e)));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Config (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
