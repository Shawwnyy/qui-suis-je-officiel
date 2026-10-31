/* 📚 Carte « Justifications » de l'écran final — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)   node tests/e2e/finaljustif.e2e.js
   Une partie de 5 questions (juste, fausse, puis justes) : à la fin, la carte liste les 5 questions, chacune avec sa bonne réponse et ses justifications. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 420, height: 900 } });
  if (!N) { console.log("Justifications de l'écran final (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Léo"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "5"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); if (q) q.value = "30"; acceptRules(); });
    await H.waitForTimeout(500);
    await H.evaluate(() => startGame()); await H.waitForSelector(".answer", { timeout: 20000 }); await H.waitForTimeout(1200);
    const answer = async good => {
      await H.waitForFunction(() => document.querySelectorAll(".answer:not(:disabled)").length >= 2 && typeof currentQuestion !== "undefined" && currentQuestion, { timeout: 30000 });
      const info = JSON.parse(await N.ev(H, `(function(){ const q=currentQuestion; const btns=[...document.querySelectorAll('.answer')]; return JSON.stringify([btns.findIndex(b=>b.textContent===q.answers[q.correct]), btns.length, q.question, q.answers[q.correct]]); })()`));
      const [right, n] = info;
      await H.locator(".answer").nth(good || right < 0 ? Math.max(0, right) : (right + 1) % n).click();
      await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show") && /La bonne réponse/.test(b.innerText); }, { timeout: 40000 }).catch(() => {});
      await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return !b || !b.classList.contains("show") || !/La bonne réponse/.test(b.innerText); }, { timeout: 40000 }).catch(() => {});
      return info;
    };
    const asked = []; for (let i = 0; i < 5; i++) asked.push(await answer(i !== 1));
    const q1 = asked[0], q2 = asked[1], q3 = asked[2];
    await H.waitForSelector("#resultsScreen.active", { timeout: 90000 }).catch(async e => { console.log("DEBUG", await H.evaluate(() => JSON.stringify({ act: [...document.querySelectorAll(".screen.active")].map(x => x.id), round: document.getElementById("roundNumber") && document.getElementById("roundNumber").textContent, status: document.getElementById("gameStatus") && document.getElementById("gameStatus").textContent, next: document.getElementById("v35Next") && document.getElementById("v35Next").textContent, ev: document.getElementById("v35Event") && document.getElementById("v35Event").className, wait: document.getElementById("v35Wait") && document.getElementById("v35Wait").className, modal: !!document.querySelector(".power-modal:not(.hidden),#powerModal.show")  }))); throw e; });
    await H.waitForSelector("#v62Learn .v62l-item", { timeout: 10000 });
    const box = await H.evaluate(() => { const b = document.getElementById("v62Learn"); return { n: b.querySelectorAll(".v62l-item").length, ok: b.querySelectorAll(".v62l-item.ok").length, bad: b.querySelectorAll(".v62l-item.bad").length, head: b.querySelector("h3").textContent, score: b.querySelector(".v62l-score").textContent, prev: b.previousElementSibling && b.previousElementSibling.id, inCard: !!b.closest("#resultsScreen .card"), texts: [...b.querySelectorAll(".v62l-q")].map(e => e.textContent) }; });
    t("la carte « 📚 Justifications » est sur l'écran final, juste après le classement détaillé", /Justifications/.test(box.head) && box.prev === "finalScores" && box.inCard);
    t("une ligne par question de la partie (5), dans l'ordre", box.n === 5 && asked.every((a, i) => box.texts[i] === a[2]));
    t("4 bonnes réponses et 1 fausse repérées", box.ok === 4 && box.bad === 1);
    t("le résumé annonce « 2 / 3 trouvées » et « 1 à revoir »", /4 \/ 5 trouvées/.test(box.score) && /1 à revoir/.test(box.score));
    /* la ligne fausse : ouverte, elle donne la bonne réponse, l'erreur, une phrase d'encouragement */
    const bad1 = await H.evaluate(() => { const d = document.querySelector("#v62Learn .v62l-item.bad"); d.open = true; return d.querySelector(".v62l-body").innerText; });
    t("question ratée : bonne réponse + « Tu avais répondu » + encouragement", bad1.includes(q2[3]) && /Tu avais répondu|Tu es .* trop|trop (basse|haute)/.test(bad1) && /(Maintenant tu la connais|erreur utile|Pas grave|reviendra)/.test(bad1));
    const good1 = await H.evaluate(() => { const d = document.querySelector("#v62Learn .v62l-item.ok"); d.open = true; return d.querySelector(".v62l-body").innerText; });
    t("question réussie : justifiée aussi (bonne réponse + au moins 3 lignes)", good1.includes(q1[3]) && good1.split("\n").filter(l => l.trim()).length >= 3);
    /* la fenêtre « Avis sur la partie » (autre module) est fermée pour pouvoir cliquer */
    await H.evaluate(() => { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); });
    /* filtre « À revoir » */
    await H.locator('#v62Learn [data-v62="bad"]').click();
    const vis = await H.evaluate(() => [...document.querySelectorAll("#v62Learn .v62l-item")].filter(d => d.offsetParent !== null).length);
    t("filtre « À revoir » : seule la question ratée reste visible", vis === 1);
    await H.locator('#v62Learn [data-v62="all"]').click();
    t("filtre « Toutes » : les 5 questions reviennent", await H.evaluate(() => [...document.querySelectorAll("#v62Learn .v62l-item")].filter(d => d.offsetParent !== null).length) === 5);
    await H.locator('#v62Learn [data-v62="open"]').click();
    t("« Tout ouvrir » ouvre toutes les lignes", await H.evaluate(() => [...document.querySelectorAll("#v62Learn .v62l-item")].every(d => d.open)));
    /* la carte reste en place (reconstruction de l'écran par un autre module) et sans débordement horizontal */
    await H.waitForTimeout(1800);
    t("la carte est toujours là et unique", await H.evaluate(() => document.querySelectorAll("#v62Learn").length === 1));
    t("aucun débordement horizontal sur écran de téléphone (420 px)", await H.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
    await H.screenshot({ path: "/tmp/claude-0/-home-claude/181eb494-6565-5851-a1b2-29796f1e31d8/scratchpad/final-justif.png", fullPage: false });
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Justifications de l'écran final (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
