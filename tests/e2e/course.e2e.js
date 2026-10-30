/* 📚 Thèmes de cours à part — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)   node tests/e2e/course.e2e.js
   Joue : un thème issu d'un cours est absent des salles normales (grille, tirage), visible dans la salle créée depuis le
   cours (« 👥 À plusieurs » de la liste « Mes cours »), seul coché, puis de nouveau caché au retour à l'accueil. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const CAT = "📄 Dossier technique plaque à induction";
(async () => {
  const N = await boot({ viewport: { width: 880, height: 1000 } });
  if (!N) { console.log("Thèmes de cours (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    const recs = Array.from({ length: 6 }, (_, i) => ({ category: CAT, difficulty: "facile", question: "Question du dossier technique numéro " + (i + 1) + " : quel est l'élément n° " + (i + 1) + " ?", answers: ["Bobine " + (i + 1), "Aimant " + (i + 1), "Ventilateur " + (i + 1), "Fusible " + (i + 1)], correct: 0, correction: "La bonne réponse est « Bobine " + (i + 1) + " »." }));
    const added = await H.evaluate(r => window.v35Q.addRecords(r, { replaceCategory: null }).added, recs);
    t("6 questions de cours enregistrées (ids « qcm… »)", added === 6 && (await H.evaluate(() => window.v35Q.store.every(r => /^qcm/.test(r.id)))));
    const inGrid = () => H.evaluate(c => [...document.querySelectorAll("#themeGrid .v163-theme input")].some(i => i.value === c), CAT);
    const inPool = () => N.ev(H, `(selectedThemes=[...document.querySelectorAll("#themeGrid input:checked")].map(i=>i.value), getQuestionPool().some(q=>q.category===${JSON.stringify(CAT)}))`);
    const checked = () => H.evaluate(() => [...document.querySelectorAll("#themeGrid input:checked")].map(i => i.value));

    /* 1 · salle normale : le thème de cours n'y est pas */
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    t("salle normale : le thème de cours est absent de la grille des thèmes", (await inGrid()) === false && (await H.locator("#themeGrid .v163-theme").count()) > 150);
    await H.evaluate(() => { const b = document.getElementById("v21SelectVisible"); if (b) b.click(); }); await H.waitForTimeout(500);
    t("salle normale, tout coché : le thème de cours n'entre pas dans le tirage", (await inPool()) === false && !(await checked()).includes(CAT));
    t("sans thème de cours, la grille compte 232 thèmes (celui du cours n'est pas ajouté)", (await H.locator("#themeGrid .v163-theme").count()) === 232);

    /* retour accueil */
    await H.evaluate(() => { try { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); } catch (e) {} });
    await N.ev(H, `resetConnection(); showScreen("homeScreen")`); await H.waitForTimeout(500);

    /* 2 · salle créée à partir du cours : liste « Mes cours », bouton « À plusieurs » */
    await H.evaluate(() => window.QcmUI.open()); await H.waitForTimeout(400);
    t("l'écran des cours liste « Mes cours enregistrés » avec ce cours et ses 6 questions", await H.evaluate(c => { const s = document.getElementById("qcmSaved"); return !!s && s.textContent.includes(c) && /6 q\./.test(s.textContent); }, CAT));
    t("la liste propose « Jouer » et « À plusieurs »", (await H.locator('#qcmSaved [data-qcm="replay"]').count()) === 1 && (await H.locator('#qcmSaved [data-qcm="replaymulti"]').count()) === 1);
    await H.locator('#qcmSaved [data-qcm="replaymulti"]').click();
    await H.waitForFunction(c => { const on = [...document.querySelectorAll("#themeGrid input:checked")]; return on.length === 1 && on[0].value === c && document.getElementById("lobbyScreen").classList.contains("active"); }, CAT, { timeout: 20000 }).catch(() => {});
    await H.waitForTimeout(1500);
    t("salle de cours : le thème est dans la grille, seul coché", (await inGrid()) === true && JSON.stringify(await checked()) === JSON.stringify([CAT]));
    t("salle de cours : le tirage ne contient que ce thème", await N.ev(H, `(function(){selectedThemes=[...document.querySelectorAll("#themeGrid input:checked")].map(i=>i.value);const p=getQuestionPool();return p.length===6&&p.every(q=>q.category===${JSON.stringify(CAT)});})()`));
    t("salle de cours : la partie n'est pas lancée (on attend les camarades)", (await N.ev(H, `gameStarted`)) === false && (await N.ev(H, `document.querySelector('.screen.active').id`)) === "lobbyScreen");

    /* 3 · retour accueil : de nouveau caché, et plus rien de coché en cachette */
    await H.evaluate(() => { try { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); } catch (e) {} });
    await N.ev(H, `resetConnection(); showScreen("homeScreen")`); await H.waitForTimeout(800);
    t("retour à l'accueil : plus de thème de cours dévoilé", (await H.evaluate(() => window.V60CourseUI.revealed().length)) === 0 && (await inGrid()) === false);

    /* 4 · nouvelle salle normale : toujours absent */
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(1000);
    await H.evaluate(() => { const b = document.getElementById("v21SelectVisible"); if (b) b.click(); }); await H.waitForTimeout(500);
    t("nouvelle salle normale : absent de la grille, du tirage et de la sélection", (await inGrid()) === false && (await inPool()) === false && !(await checked()).includes(CAT) && !(await N.ev(H, `selectedThemes.includes(${JSON.stringify(CAT)})`)));
    t("le thème reste géré dans « Mes questions » (rien n'est supprimé)", (await H.evaluate(() => window.v35Q.store.filter(r => r.category === "📄 Dossier technique plaque à induction").length)) === 6);
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Thèmes de cours (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
