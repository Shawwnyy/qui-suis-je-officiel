/* 🗣️ Voix grave, boutons à droite, flammes, ⚡ Vitesse / 💣 Bombe, questions dérivées — essai de bout en bout (Chromium via Playwright)   node tests/e2e/v64.e2e.js */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 1280, height: 800 } });
  if (!N) { console.log("V64 (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    await H.fill("#hostName", "Léo"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v57Config", { timeout: 10000 }); await H.waitForTimeout(800);
    /* 1 · questions dérivées présentes, moyenne ≈ 140 par thème de la banque */
    const st = JSON.parse(await N.ev(H, `(function(){var c={},th=Object.keys(V35_BANK);QUESTIONS.forEach(function(q){c[q.category]=(c[q.category]||0)+1});var tot=0;th.forEach(function(k){tot+=c[k]||0});var last=th.slice(-100),l=0;last.forEach(function(k){l+=c[k]||0});var min=1e9;th.forEach(function(k){min=Math.min(min,c[k]||0)});
      return JSON.stringify({derived:window.V64_DERIVED,v64:QUESTIONS.filter(function(q){return q.v64}).length,avg:tot/th.length,lastAvg:l/100,min:min,themes:th.length,okShape:QUESTIONS.filter(function(q){return q.v64}).every(function(q){return q.answers.length===4&&q.correct===0})})})()`));
    t("variantes : plus de 10 000 questions dérivées ajoutées, toutes à 4 réponses (bonne en premier)", st.derived > 10000 && st.derived === st.v64 && st.okShape);
    t("variantes : moyenne ≈ 140 questions par thème de la banque, aucun thème sous 40", st.avg > 138 && st.avg < 150 && st.min >= 40 && st.themes >= 200);
    t("variantes : les 100 derniers thèmes passent d'environ 26 à plus de 70 questions", st.lastAvg > 70);
    const sp = JSON.parse(await N.ev(H, `(function(){totalRounds=20;var th=Object.keys(V35_BANK).filter(function(k){return QUESTIONS.filter(function(q){return q.category===k&&q.v35}).length>=25}).slice(-1)[0],pool=QUESTIONS.filter(function(q){return q.category===th&&(q.v35||q.v64)}),bad=0;for(var k=0;k<30;k++){var s=shuffle(pool).slice(0,20),seen={};s.forEach(function(q){var key=q.srcKey||V64Variants.norm(q.question).slice(0,80);if(seen[key])bad++;seen[key]=1})}var ex=[];if(bad){var s3=shuffle(pool).slice(0,20),m={};s3.forEach(function(q){var key=q.srcKey||V64Variants.norm(q.question).slice(0,80);(m[key]=m[key]||[]).push(q.variant||'orig')});ex=Object.keys(m).filter(function(k){return m[k].length>1}).map(function(k){return k.slice(0,40)+':'+m[k]})}return JSON.stringify({n:pool.length,bad:bad,wrapped:/spread/.test(String(shuffle)),ex:ex})})()`));
    if (sp.bad) console.log("DEBUG sp", JSON.stringify(sp));
    t("tirage : jamais une question et sa variante dans les 20 premières (30 tirages)", sp.n > 30 && sp.bad === 0 && sp.wrapped);
    /* 2 · Son, Effets, micro : barre à droite */
    const tb = await H.evaluate(() => { const b = document.getElementById("v64Side"); if (!b) return null; const w = innerWidth, h = innerHeight; const rects = ["vcFab", "soundToggle", "v63FxToggle"].map(id => { const e = document.getElementById(id); if (!e || e.parentNode !== b) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width }; }); return { w, h, br: b.getBoundingClientRect().right, rects }; });
    t("barre « Son / Effets / micro » présente avec les 3 boutons", tb && tb.rects.every(Boolean));
    t("les 3 boutons sont à droite de l'écran, en bas, visibles et sans chevauchement", tb && tb.rects.every(r => r.l > tb.w * 0.4 && r.r <= tb.w && r.b <= tb.h && r.t > tb.h / 2 && r.w > 20) && tb.rects.slice().sort((a, b) => a.l - b.l).every((r, i, a) => i === 0 || r.l >= a[i - 1].r - 1));
    const left = await H.evaluate(() => [...document.querySelectorAll("#soundToggle,#v63FxToggle,#vcFab")].filter(e => e.getBoundingClientRect().left < innerWidth * 0.4).length);
    t("plus rien de ces boutons à gauche", left === 0);
    await H.locator("#v63FxToggle").click(); await H.waitForTimeout(100);
    t("les boutons déplacés restent cliquables (Effets OFF)", /Effets OFF/.test(await H.locator("#v63FxToggle").textContent()));
    await H.locator("#v63FxToggle").click();
    /* 3 · voix grave : vrai lancement de partie (compte à rebours de 5 s à l'écran) */
    await H.evaluate(() => { window.__sp = []; window.__t0 = 0; speechSynthesis.speak = u => { if (u.volume !== 0) window.__sp.push({ t: u.text, p: u.pitch, r: u.rate, l: u.lang, at: Math.round(performance.now() - window.__t0), n: (document.getElementById("startCountdownNum") || {}).textContent }); }; speechSynthesis.cancel = () => {}; soundEnabled = true;
      const r = document.getElementById("roundCount"); r.value = "5"; r.dispatchEvent(new Event("change", { bubbles: true })); acceptRules(); window.__t0 = performance.now(); startGame(); });
    await H.waitForFunction(() => window.__sp.some(s => /^Bonne chance/.test(s.t)), null, { timeout: 12000 });
    const spk = await H.evaluate(() => window.__sp.slice());
    t("départ réel : « La partie commence dans trois secondes. », « Deux. », « Un. », « Zéro. », « Bonne chance à toutes et à tous ! » dans l'ordre", spk.map(s => s.t).slice(0, 5).join("|") === "La partie commence dans trois secondes.|Deux.|Un.|Zéro.|Bonne chance à toutes et à tous !");
    t("départ réel : la phrase démarre avant le « 3 » affiché, Deux ≈ 3 s, Un ≈ 4 s, Zéro et Bonne chance ≈ 5 s", spk[0].at < 1500 && Math.abs(spk[1].at - 3000) < 500 && Math.abs(spk[2].at - 4000) < 500 && Math.abs(spk[3].at - 5000) < 600 && Math.abs(spk[4].at - 5000) < 700);
    t("voix grave : hauteur au minimum (0), débit lent, en français (annonceur)", spk.slice(0, 5).every(s => s.p === 0 && s.r < 1 && /^fr/.test(s.l)));
    t("la lecture de la question (voix off) vient APRÈS « Bonne chance à toutes et à tous ! », jamais avant", (() => { const i = spk.findIndex(s => /^Bonne chance/.test(s.t)), q = spk.findIndex(s => /\?$/.test(s.t)); return q === -1 || q > i; })());
    await H.waitForSelector(".answer", { timeout: 20000 });
    await H.evaluate(() => { window.__sp = []; soundEnabled = false; V64Glue.say("test"); });
    t("« Son OFF » : la voix se tait", (await H.evaluate(() => window.__sp.length)) === 0);
    await H.evaluate(() => { soundEnabled = true; });
    /* 4 · annonce d'une question spéciale + dernière question */
    await H.evaluate(() => { window.__sp = []; showScreen("gameScreen"); totalRounds = 10; displayQuestion({ question: "Capitale de la France ?", answers: ["Paris", "Rome", "Lyon", "Nice"], correct: 0, event: "bombe", category: "Géo", difficulty: "facile" }, 10); });
    await H.waitForTimeout(300);
    const sp2 = await H.evaluate(() => window.__sp.map(s => s.t).join(" / "));
    t("question bombe en dernière position : annonce « Dernière question » + « question bombe »", /Dernière question/.test(sp2) && /bombe/i.test(sp2));
    t("bandeau d'annonce affiché pour la bombe", /BOMBE/.test(await H.evaluate(() => document.body.innerText)));
    /* 5 · flammes de série */
    const fl = await H.evaluate(() => { const me = players[myId], out = []; [0, 3, 5, 8].forEach(c => { me.combo = c; updateMyScore(); out.push(document.body.getAttribute("data-v64-fire")); }); me.combo = 5; updateMyScore(); const on = document.body.getAttribute("data-v64-fire"); showScreen("lobbyScreen"); out.push(on, document.body.getAttribute("data-v64-fire")); me.combo = 0; return out; });
    t("flammes : niveaux 0, 1, 2, 3 selon la série, éteintes en quittant l'écran de jeu", fl.join() === "0,1,2,3,2,0");
    /* 6 · Vitesse : bonus de rapidité triple ; Bombe : −400 */
    const pts = JSON.parse(await N.ev(H, `(function(){var p=players[myId];p.combo=0;var save=currentQuestion;var d={time:12,playerId:myId};
      currentQuestion={question:'q',answers:['a','b','c','d'],correct:0};var base=applyScoreFx(p,1000,d);
      currentQuestion={question:'q',answers:['a','b','c','d'],correct:0,event:'vitesse'};var vit=applyScoreFx(p,1000,d);
      p.score=1000;p.malusPoints=0;currentQuestion={question:'q',answers:['a','b','c','d'],correct:0,event:'bombe'};onWrongFx(p);var s1=p.score,m1=p.malusPoints;
      p.score=150;p.malusPoints=0;onWrongFx(p);var s2=p.score;
      p.score=1000;p.malusPoints=0;currentQuestion={question:'q',answers:['a','b','c','d'],correct:0};onWrongFx(p);var s3=p.score;
      currentQuestion=save;p.score=0;p.malusPoints=0;return JSON.stringify({base:base,vit:vit,s1:s1,m1:m1,s2:s2,s3:s3})})()`));
    t("⚡ Vitesse : +50 pts par seconde restante en plus (12 s → +600)", pts.vit - pts.base === 600);
    t("💣 Bombe : mauvaise réponse = −400 pts (affichés en malus), jamais en dessous de zéro", pts.s1 <= 600 && pts.m1 >= 400 && pts.s2 === 0 && pts.s3 > 600);
    /* 7 · apparition des nouvelles questions spéciales côté hôte */
    const ev = JSON.parse(await N.ev(H, `(function(){var c={vitesse:0,bombe:0,early:0,n:0};isHost=true;window.gameOpts={golden:true,events:true,streak:true};totalRounds=20;
      for(var i=0;i<1500;i++){currentQuestionIndex=(i%19);var o=withFxMods({question:'Question numéro '+i+' ?',answers:['a','b','c','d'],correct:0,category:'x'});c.n++;if(o.event==='vitesse'||o.event==='bombe'){c[o.event]++;if(currentQuestionIndex<3)c.early++}}
      clearTimeout(window.__fxEnd);currentQuestionIndex=0;window.gameOpts={golden:true,events:false,streak:true};var off=0;for(i=0;i<400;i++){currentQuestionIndex=(i%18)+1;var o2=withFxMods({question:'q'+i+' ?',answers:['a','b','c','d'],correct:0,category:'x'});if(o2.event==='vitesse'||o2.event==='bombe')off++}
      clearTimeout(window.__fxEnd);currentQuestionIndex=0;window.gameOpts={golden:true,events:true,streak:true};c.off=off;return JSON.stringify(c)})()`));
    t("hôte : des questions Vitesse ET Bombe apparaissent, jamais dans les 3 premières", ev.vitesse > 5 && ev.bombe > 5 && ev.early === 0);
    t("hôte : case « événements » décochée → ni Vitesse ni Bombe", ev.off === 0);
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("V64 voix grave, flammes, vitesse/bombe, variantes (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
