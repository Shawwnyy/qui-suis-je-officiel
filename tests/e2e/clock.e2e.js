/* ⏱️ Lecture avant le chrono, temps restant après la réponse, écran bonus/malus en grand — essai de bout en bout (Chromium via Playwright)   node tests/e2e/clock.e2e.js */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 420, height: 900 } });
  if (!N) { console.log("Lecture, chrono et écran bonus (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Léo"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "5"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); if (q) q.value = "10"; acceptRules(); });
    await H.waitForTimeout(400);
    await H.evaluate(() => startGame()); await H.waitForSelector(".answer", { timeout: 20000 });
    const st = () => N.ev(H, `JSON.stringify({tl:timeLeft,ans:answered,read:document.getElementById("v62Read").classList.contains("show"),lock:document.getElementById("answers").classList.contains("v62-lock"),rm:currentQuestion.readMs,msg:document.getElementById("v62Msg").textContent})`).then(JSON.parse);
    const s0 = await st();
    t("pendant la lecture : bandeau « Lis la question », réponses verrouillées, chrono plein (10)", s0.read && s0.lock && s0.tl === 10 && /Lis la question/.test(s0.msg));
    t("l'hôte fixe la durée de lecture (2 à 7 s) dans la question", s0.rm >= 2000 && s0.rm <= 7000);
    await H.locator(".answer").first().click({ force: true }).catch(() => {});
    const s1 = await st();
    t("un clic pendant la lecture ne répond pas", s1.ans === false && s1.tl === 10);
    await H.waitForFunction(() => !document.getElementById("v62Read").classList.contains("show"), { timeout: 12000 });
    const s2 = await st();
    t("après la lecture : réponses déverrouillées et chrono encore ~plein", !s2.lock && !s2.read && s2.tl >= 9);
    await H.waitForTimeout(2300);
    const s3 = await st();
    t("le chrono descend après la lecture", s3.tl <= s2.tl - 2);
    /* un 2e joueur (Sam) qui n'a pas encore répondu garde la question ouverte */
    await H.evaluate(() => { players.zz = { id: "zz", name: "Sam", avatar: "🦊", score: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0 }; });
    /* réponse : le temps restant reste visible et continue de descendre */
    const right = JSON.parse(await N.ev(H, `JSON.stringify([...document.querySelectorAll('.answer')].findIndex(b=>b.textContent===currentQuestion.answers[currentQuestion.correct]))`));
    await H.locator(".answer").nth(Math.max(0, right)).click();
    await H.waitForFunction(() => document.getElementById("v62Left").classList.contains("show"), { timeout: 5000 });
    const c1 = await H.evaluate(() => ({ txt: document.getElementById("v62Left").textContent, tl: timeLeft, done: document.getElementById("timer").classList.contains("v62-done"), shown: document.getElementById("timerValue").textContent }));
    t("après la réponse : « il reste N s » affiché, anneau marqué « répondu »", /il reste \d+ s/.test(c1.txt) && c1.done);
    t("le nombre affiché est le temps réel restant", Number(c1.shown) === c1.tl && c1.tl > 0);
    t("l'annonce « Léo a répondu · il reste N s » est affichée", /Léo a répondu · il reste \d+ s/.test(c1.txt));
    await H.waitForTimeout(2300);
    const c2 = await H.evaluate(() => ({ txt: document.getElementById("v62Left").textContent, tl: timeLeft }));
    t("après la réponse, le temps restant continue de descendre", c2.tl <= c1.tl - 2 && Math.abs(Number((c2.txt.match(/il reste (\d+) s/) || [])[1]) - c2.tl) <= 1);
    /* un autre joueur répond : les autres le voient */
    await H.evaluate(() => window.V62Clock.noteAnswered({ name: "Sam" }));
    t("un autre joueur qui répond est annoncé (« Léo et Sam ont répondu · il reste N s »)", /Léo et Sam ont répondu · il reste \d+ s/.test(await H.evaluate(() => document.getElementById("v62Left").textContent)));
    /* écran bonus / malus plein écran vert / rouge */
    const ev = async (choice, extra) => {
      await H.evaluate(([choice, extra]) => { (0, eval)("isHost=false"); try { handleData(Object.assign({ type: "v35Event", id: Date.now() % 1e6, choice, kind: "double", label: "✨ Points ×2", selfText: "Ta prochaine bonne réponse vaut ×2.", pubText: "Léo : Points ×2.", targetText: "Tu perds 200 points.", giverId: myId, giverName: "Léo", targetId: "zz", targetName: "Sam", ms: 6000 }, extra || {})); } finally { (0, eval)("isHost=true"); } }, [choice, extra]);
      await H.waitForFunction(() => document.getElementById("v35Event") && document.getElementById("v35Event").classList.contains("show"), { timeout: 5000 });
      await H.waitForTimeout(500);
      return H.evaluate(() => { const e = document.getElementById("v35Event"), r = e.getBoundingClientRect(), c = e.querySelector(".v35-card").getBoundingClientRect(); return { w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, cw: c.width, ch: c.height, bg: getComputedStyle(e).backgroundImage, emoji: parseFloat(getComputedStyle(e.querySelector(".v35-ev-emoji")).fontSize), cls: e.className, title: e.querySelector(".v35-ev-title").textContent }; });
    };
    const b = await ev("bonus");
    t("bonus : l'écran couvre tout l'écran (carte comprise)", b.w === b.vw && b.h === b.vh && b.cw >= b.vw - 1 && b.ch >= b.vh - 1);
    t("bonus : fond VERT (le canal vert domine) et gros émoji (≥ 110 px)", /bonus/.test(b.cls) && (function () { const m = b.bg.match(/rgb\((\d+), (\d+), (\d+)\)/); return m && +m[2] > +m[1] && +m[2] > +m[3]; })() && b.emoji >= 110);
    await H.screenshot({ path: "/tmp/claude-0/-home-claude/181eb494-6565-5851-a1b2-29796f1e31d8/scratchpad/ev-bonus.png" });
    await H.locator("#v35Event .v35-card").click();
    t("un clic n'importe où ferme l'écran", await H.evaluate(() => !document.getElementById("v35Event").classList.contains("show")));
    const m = await ev("malus");
    t("malus : plein écran, fond ROUGE (le canal rouge domine)", m.w === m.vw && m.h === m.vh && /malus/.test(m.cls) && (function () { const x = m.bg.match(/rgb\((\d+), (\d+), (\d+)\)/); return x && +x[1] > +x[2] && +x[1] > +x[3]; })());
    await H.screenshot({ path: "/tmp/claude-0/-home-claude/181eb494-6565-5851-a1b2-29796f1e31d8/scratchpad/ev-malus.png" });
    await H.locator("#v35Event .v35-card").click();
    t("aucun débordement horizontal (420 px)", await H.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    /* fin de question : bandeau et chip disparaissent */
    await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show"); }, { timeout: 45000 }).catch(() => {});
    const fin = await H.evaluate(() => ({ show: document.getElementById("v62Left").classList.contains("show"), txt: document.getElementById("v62Left").textContent, post: window.V62Clock.state.post, chip: window.V62Clock.state.chip, fin: document.getElementById("gameStatus").dataset.finished, corr: document.getElementById("v26Correction").className }));
    t("au résultat : le chrono d'après-réponse est arrêté et la pastille masquée", !fin.show && fin.post === 0 || (console.log("DEBUG", JSON.stringify(fin)), false));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Lecture, chrono et écran bonus (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
