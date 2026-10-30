/* 📖 Nouveaux thèmes + justification dans les rapports — essai de bout en bout (Chromium via Playwright, réseau PeerJS simulé)   node tests/e2e/learn.e2e.js
   Vérifie : thèmes présents dans la grille, partie « Trouve la différence » (image affichée, explication), puis rapports (journal des stats + journal de session). */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 880, height: 1000 } });
  if (!N) { console.log("Nouveaux thèmes et rapports (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    const names = await H.evaluate(() => [...document.querySelectorAll("#themeGrid .v163-theme input")].map(i => i.value));
    t("la grille compte 232 thèmes (201 + 29 de questions + 2 en images)", names.length === 232);
    ["🔍 Trouve la différence", "🧐 Trouve l'intrus", "🔤 Acronymes courants", "💾 Acronymes informatiques", "⌨️ Dactylographie : les bases", "⏱️ Vitesse de frappe et mots par minute", "⌨️ Raccourcis clavier"].forEach(n => t("thème présent : " + n, names.includes(n)));
    t("aucun thème en double dans la grille", new Set(names).size === names.length);

    /* uniquement « Trouve la différence » */
    const T = "🔍 Trouve la différence";
    await H.evaluate(t0 => { document.querySelectorAll("#themeGrid .v163-theme input:checked").forEach(i => { if (i.value !== t0 && i.nextElementSibling) i.nextElementSibling.click(); }); const me = [...document.querySelectorAll("#themeGrid .v163-theme input")].find(i => i.value === t0); if (me && !me.checked && me.nextElementSibling) me.nextElementSibling.click(); }, T);
    await H.waitForTimeout(500);
    const only = await H.evaluate(() => [...document.querySelectorAll("#themeGrid input:checked")].map(i => i.value));
    t("seul le thème « Trouve la différence » est coché", JSON.stringify(only) === JSON.stringify([T]));
    const pool = JSON.parse(await N.ev(H, `(selectedThemes=[...document.querySelectorAll("#themeGrid input:checked")].map(i=>i.value), JSON.stringify(getQuestionPool().map(q=>[q.category,!!q.vDiff,q.media&&q.media.type,!!q.correction,q.answers.length])))`));
    t("le tirage ne contient que des questions du thème, avec image SVG, explication et 4 réponses", pool.length >= 50 && pool.every(p => p[0] === T && p[1] && p[2] === "svg" && p[3] && p[4] === 4));

    await H.evaluate(() => { const r = document.getElementById("roundCount"); r.value = "3"; r.dispatchEvent(new Event("change", { bubbles: true })); const q = document.getElementById("questionTime"); if (q) q.value = "30"; acceptRules(); });
    await H.evaluate(() => startGame()); await H.waitForSelector(".answer", { timeout: 20000 }); await H.waitForTimeout(1200);
    const answer = async good => {
      await H.waitForFunction(() => document.querySelectorAll(".answer:not(:disabled)").length >= 2 && typeof currentQuestion !== "undefined" && currentQuestion, { timeout: 20000 });
      const q = JSON.parse(await N.ev(H, `JSON.stringify({q:currentQuestion.question,cat:currentQuestion.category,vd:!!currentQuestion.vDiff,corr:currentQuestion.correction,right:currentQuestion.answers[currentQuestion.correct],imgs:document.querySelectorAll('.qm-holder img, .qm-box img').length,w:(document.querySelector('.qm-box img')||{}).naturalWidth||0})`));
      const idx = await N.ev(H, `(function(){ const q=currentQuestion; const btns=[...document.querySelectorAll('.answer')]; return JSON.stringify([btns.findIndex(b=>b.textContent.includes(q.answers[q.correct])), btns.length]); })()`);
      const [right, n] = JSON.parse(idx);
      await H.locator(".answer").nth(good ? right : (right + 1) % n).click();
      await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show") && /La bonne réponse/.test(b.innerText); }, { timeout: 25000 }).catch(() => {});
      await H.waitForTimeout(1200);
      const panel = await H.evaluate(() => { const b = document.getElementById("v26Correction"); return b && b.classList.contains("show") ? b.innerText : ""; });
      return { q, panel };
    };
    const a1 = await answer(true);
    t("la question est une « Trouve la différence » avec une vraie image affichée", a1.q.vd && a1.q.cat === T && a1.q.imgs >= 1 && a1.q.w > 100);
    t("bonne réponse : la correction cite la bonne réponse ET l'explication de l'image", a1.panel.includes(a1.q.right) && /différence|intrus|Il y a|La différence/.test(a1.panel) && a1.panel.includes(a1.q.corr.slice(0, 20)));
    await H.waitForFunction(() => { const b = document.getElementById("v26Correction"); return !b || !b.classList.contains("show") || !/La bonne réponse/.test(b.innerText); }, { timeout: 30000 }).catch(() => {});
    await H.waitForTimeout(500);
    const a2 = await answer(false);
    t("mauvaise réponse : la correction explique pourquoi (explication de l'image)", a2.panel.includes(a2.q.right) && a2.panel.includes(a2.q.corr.slice(0, 20)));

    /* 2 · journaux : bonne réponse + pourquoi */
    const live = JSON.parse(await N.ev(H, `JSON.stringify(window.V40Stats.getLive())`));
    t("journal des statistiques : chaque question terminée porte sa bonne réponse et son explication", live.R.length >= 2 && live.R.slice(0, 2).every(r => r.a && r.w && r.w.length > 20));
    t("journal de la session (rapport de l'hôte) : champ « why » rempli", await H.evaluate(() => (window.__log || []).length >= 2 && window.__log.slice(0, 2).every(l => l.why && l.why.length > 20 && l.a)));
    const pdf = await N.ev(H, `(function(){ var b = window.V40Pdf.build(window.V40Stats.getLive(), {theme:"light"}); var s = ""; for (var i=0;i<b.length;i++) s += String.fromCharCode(b[i]); return s; })()`);
    t("PDF des statistiques : section « Réviser » avec « Bonne réponse » et « Pourquoi »", /R\\351viser/.test(pdf) && pdf.includes("Pourquoi :") && pdf.includes("Bonne r"));
    const csv = await N.ev(H, `window.V40Analysis.toCSV(window.V40Stats.getLive())`);
    t("CSV : colonnes « bonne_réponse » et « explication »", /;bonne_réponse;explication\r?\n/.test(csv));
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Nouveaux thèmes et rapports (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
