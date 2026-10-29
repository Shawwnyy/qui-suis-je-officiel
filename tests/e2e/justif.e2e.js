/* 💰 « Tes points » dans la justification — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)   node tests/e2e/justif.e2e.js
   Joue une vraie partie à 3 questions en solo : bonne réponse puis mauvaise, et lit la justification affichée. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 880, height: 1000 } });
  if (!N) { console.log("Justification des points (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "10"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); if (q) q.value = "30"; acceptRules(); });
    await H.evaluate(() => startGame()); await H.waitForSelector("#v26Correction, .answer", { timeout: 20000 }); await H.waitForTimeout(1500);
    const panel = () => H.evaluate(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show") ? b.innerText : ""; });
    const answerWith = async good => {
      await H.waitForFunction(() => document.querySelectorAll(".answer:not(:disabled)").length >= 2 && typeof currentQuestion !== "undefined" && currentQuestion, { timeout: 20000 });
      const idx = await N.ev(H, `(function(){ const q=currentQuestion; const btns=[...document.querySelectorAll('.answer')]; const right=btns.findIndex(b=>b.textContent.includes(q.answers[q.correct])); return JSON.stringify([right, btns.length]); })()`);
      const [right, n] = JSON.parse(idx);
      const pick = good ? right : (right + 1) % n;
      await H.locator(".answer").nth(pick).click();
      await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show") && /Tes points/.test(b.innerText); }, { timeout: 25000 }).catch(() => {});
      await H.waitForTimeout(1200);
    };
    await answerWith(true);
    const p1 = await panel();
    t("bonne réponse : la justification contient « Tes points sur cette question : + … pts (avant → après) »", /Tes points sur cette question : \+[\d  ]+ pts \([\d  ]+ → [\d  ]+\)/.test(p1));
    t("bonne réponse : le calcul (500 de base, vitesse, combo, × difficulté) est expliqué", /Calcul : 500 de base \+ vitesse/.test(p1) && /\+ combo/.test(p1) && /le tout × \d/.test(p1));
    t("bonne réponse : l'ancienne justification est toujours là (bonne réponse + statistiques)", /La bonne réponse/.test(p1) && /joueur/.test(p1));
    const delta1 = Number((/\+([\d  ]+) pts \(/.exec(p1) || [0, "0"])[1].replace(/[  ]/g, ""));
    t("le total annoncé correspond au vrai score du joueur", delta1 > 0 && (await N.ev(H, `players[myId].score`)) === Number((/→ ([\d  ]+)\)/.exec(p1) || [0, "-1"])[1].replace(/[  ]/g, "")));
    /* question suivante : mauvaise réponse */
    await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return !b || !b.classList.contains("show") || !/Tes points/.test(b.innerText); }, { timeout: 30000 }).catch(() => {});
    await H.waitForTimeout(500);
    await answerWith(false);
    const p2 = await panel();
    if (process.env.SHOW) console.log("--- bonne ---\n" + p1 + "\n--- mauvaise ---\n" + p2);
    t("mauvaise réponse : « Tes points sur cette question » est affiché, avec la pénalité ou son absence expliquée", /Tes points sur cette question/.test(p2) && /(Pénalité de 200|Pas de pénalité|piège)/.test(p2));
    t("mauvaise réponse : pas de ligne « Calcul » (rien n'a été gagné)", !/Calcul :/.test(p2));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Justification des points (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
