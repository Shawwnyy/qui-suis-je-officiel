/* 🎆 Feu d'artifice à chaque réponse (bonne ou mauvaise) et à la fin — essai de bout en bout (Chromium via Playwright)   node tests/e2e/fx.e2e.js
   On compte les oscillateurs et sources de bruit réellement créés par Web Audio, et on vérifie les étincelles à l'écran. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 420, height: 900 } });
  if (!N) { console.log("Feux d'artifice (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Léo"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    await H.evaluate(() => {
      window.__cnt = { osc: 0, src: 0 };
      const P = AudioContext.prototype, co = P.createOscillator, cs = P.createBufferSource;
      P.createOscillator = function () { window.__cnt.osc++; return co.apply(this, arguments); };
      P.createBufferSource = function () { window.__cnt.src++; return cs.apply(this, arguments); };
    });
    const cnt = () => H.evaluate(() => ({ osc: window.__cnt.osc, src: window.__cnt.src }));
    const reset = () => H.evaluate(() => { window.__cnt.osc = 0; window.__cnt.src = 0; });
    /* 1 · recettes sonores réellement jouées */
    await H.evaluate(() => soundCorrect()); let c = await cnt();
    t("bonne réponse : feu d'artifice (2 sifflements + 2 chocs, 2 explosions + 2 crépitements)", c.osc === 4 && c.src >= 2 + 2 * 8);
    await reset(); await H.evaluate(() => soundWrong()); c = await cnt();
    t("mauvaise réponse : petit feu d'artifice (1 sifflement + 1 choc, 1 explosion + crépitement)", c.osc === 2 && c.src >= 1 + 3 && c.src < 20);
    await reset(); await H.evaluate(() => soundVictory()); c = await cnt();
    t("fin de partie : grande salve (13 tirs)", c.osc === 26 && c.src > 13 * 10);
    await reset(); await H.evaluate(() => { soundEnabled = false; }); await H.evaluate(() => { soundCorrect(); soundWrong(); soundVictory(); }); c = await cnt();
    t("« Son OFF » : aucun son", c.osc === 0 && c.src === 0);
    await H.evaluate(() => { soundEnabled = true; });
    /* 2 · étincelles */
    await H.evaluate(() => soundCorrect());
    await H.waitForFunction(() => window.V63Glue.parts() > 20, { timeout: 2000 });
    const cv = await H.evaluate(() => { const e = document.getElementById("v63Fx"); return e && { d: getComputedStyle(e).display, pe: getComputedStyle(e).pointerEvents, w: e.width > 0 }; });
    t("étincelles : canvas plein écran, visible, sans bloquer les clics", cv && cv.d === "block" && cv.pe === "none" && cv.w);
    await H.screenshot({ path: "/tmp/claude-0/-home-claude/181eb494-6565-5851-a1b2-29796f1e31d8/scratchpad/fx.png" });
    await H.waitForFunction(() => window.V63Glue.parts() === 0 && getComputedStyle(document.getElementById("v63Fx")).display === "none", { timeout: 6000 });
    t("étincelles : le canvas se vide et se cache tout seul", true);
    /* 3 · bouton « Effets » */
    const tg = await H.evaluate(() => { const b = document.getElementById("v63FxToggle"); return b && { txt: b.textContent, r: b.getBoundingClientRect().left }; });
    t("bouton « 🎆 Effets ON » présent à côté du bouton Son", tg && /Effets ON/.test(tg.txt) && tg.r > 100);
    await H.locator("#v63FxToggle").click(); await H.waitForTimeout(100);
    await H.evaluate(() => soundWrong());
    t("« Effets OFF » : plus d'étincelles (le son reste)", (await H.evaluate(() => window.V63Glue.parts())) === 0 && /Effets OFF/.test(await H.locator("#v63FxToggle").textContent()));
    await H.locator("#v63FxToggle").click(); await H.waitForTimeout(3000);
    /* 4 · en jeu : une vraie bonne réponse puis une vraie mauvaise déclenchent le feu d'artifice */
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "5"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); if (q) q.value = "30"; acceptRules(); });
    await H.evaluate(() => startGame()); await H.waitForSelector(".answer", { timeout: 20000 });
    const play = async good => {
      await H.waitForFunction(() => !document.getElementById("v62Read").classList.contains("show") && document.querySelectorAll(".answer:not(:disabled)").length >= 2, { timeout: 30000 });
      await reset();
      const right = JSON.parse(await N.ev(H, `JSON.stringify([...document.querySelectorAll('.answer')].findIndex(b=>b.textContent===currentQuestion.answers[currentQuestion.correct]))`));
      await H.locator(".answer").nth(good ? Math.max(0, right) : (right + 1) % 4).click();
      await H.waitForFunction(() => window.__cnt.src >= 7, { timeout: 8000 });
      const r = await cnt(); await H.waitForTimeout(1500); return r;
    };
    const g1 = await play(true);
    t("en jeu : une bonne réponse déclenche le feu d'artifice complet (2 explosions + 32 crépitements)", g1.src === 34);
    await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return !b || !b.classList.contains("show"); }, { timeout: 40000 }).catch(() => {});
    await H.waitForFunction(() => document.getElementById("v62Read") && document.getElementById("v62Read").classList.contains("show"), { timeout: 40000 });
    const g2 = await play(false);
    t("en jeu : une mauvaise réponse déclenche le petit feu d'artifice (1 explosion + 6 crépitements)", g2.src === 7);
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Feux d'artifice (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
