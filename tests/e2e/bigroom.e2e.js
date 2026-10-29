/* Grandes salles (jusqu'à 9 999 places) et nouveaux onglets de statistiques — essai de bout en bout (Chromium via Playwright)
   node tests/e2e/bigroom.e2e.js        (facultatif : sans Playwright, l'essai est ignoré)
   Joue : réglage des places jusqu'à 9 999 (saisie trop grande ramenée, avertissements), panneau « Ma salle » borné avec 160 joueurs,
   onglets 🤝 Duels et 📌 Faits marquants, journal de 300 joueurs limité aux 200 meilleurs. */
const { boot } = require("./fake-peerjs.js");
const fs = require("fs");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const SHOTS = process.env.SHOTS || "";
(async () => {
  const N = await boot();
  if (!N) { console.log("Grandes salles (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    /* journal de référence (3 joueurs) et grand journal (300 joueurs) déposés dans l'historique avant le chargement */
    const small = { v: 1, id: "g-small", at: Date.now() - 60000, qt: 20, mode: "classic", P: [{ i: "a", n: "Léa", a: "🦊", h: 1 }, { i: "b", n: "Tom", a: "🐻" }, { i: "c", n: "Max", a: "🐸" }],
      R: [{ q: "Capitale de la France ?", c: "Géographie", d: "facile", m: 0, r: [[1, 2, 1000], [1, 3, 1000], [2, 4, 0]] }, { q: "Qui a peint la Joconde ?", c: "Arts", d: "moyen", m: 0, r: [[1, 2, 2000], [2, 3, 1000], [1, 1, 1000]] }, { q: "Symbole de l'or ?", c: "Sciences", d: "difficile", m: 0, r: [[2, 3, 2000], [1, 2, 3000], [3, 0, 1000]] }], C: [], B: [] };
    const bigP = Array.from({ length: 300 }, (_, i) => ({ i: "p" + i, n: "Joueur" + i, a: "🙂", h: i === 0 ? 1 : 0 }));
    const big = { v: 1, id: "g-big", at: Date.now() - 30000, qt: 20, mode: "classic", P: bigP, R: [0, 1, 2].map(q => ({ q: "Question " + (q + 1), c: "Culture", d: "facile", m: 0, r: bigP.map((p, k) => [k % 3 === 0 ? 2 : 1, 2 + (k % 7), (q + 1) * (300 - k) * 10]) })), C: [], B: [] };
    const H = await N.newPage("H");
    await H.evaluate(([a, b]) => { localStorage.setItem("quizV40History", JSON.stringify([b, a])); }, [small, big]);
    await H.reload(); await H.waitForTimeout(800);
    await H.fill("#hostName", "Alice"); await H.evaluate(() => createRoom()); await H.waitForSelector("#v54Room", { timeout: 10000 });
    /* ---- places jusqu'à 9 999 ---- */
    const note = async () => (await H.textContent("#v54Msg").catch(() => "")) || "";
    const msgSel = await H.evaluate(() => { const e = document.querySelector("#v54Room [role=status], #v54Room .v54-msg, #v54Say"); return e ? (e.id ? "#" + e.id : "." + e.className.split(" ")[0]) : ""; });
    const read = async () => H.evaluate(() => document.querySelector("#v54Room").innerText);
    t("le champ des places accepte jusqu'à 9999", (await H.getAttribute("#v54Max", "max")) === "9999");
    await H.fill("#v54Max", "12000"); await H.locator("#v54Max").press("Enter"); await H.waitForTimeout(300);
    t("saisie trop grande ramenée à 9 999 avec explication", (await H.inputValue("#v54Max")) === "9999" && /Maximum 9 999 places/.test(await read()));
    await H.fill("#v54Max", "500"); await H.locator("#v54Max").press("Enter"); await H.waitForTimeout(300);
    t("500 places : avertissement « plusieurs centaines de joueurs »", (await H.inputValue("#v54Max")) === "500" && /plusieurs centaines/.test(await read()) && (await N.ev(H, `V54State.st.max`)) === 500);
    await H.fill("#v54Max", "40"); await H.locator("#v54Max").press("Enter"); await H.waitForTimeout(300);
    t("40 places : simple avertissement de ralentissement", /trentaine/.test(await read()) && !/centaines/.test(await read()));
    await H.locator("#v54Inf").click(); await H.waitForTimeout(300);
    t("∞ : plafond technique de 9 999 annoncé", /plafond technique : 9 999/.test(await read()) && (await N.ev(H, `V54State.st.max`)) === 0 && (await N.ev(H, `v54PlayerCap()`)) === 9999);
    /* ---- panneau Ma salle borné ---- */
    await N.ev(H, `(function(){ for (var i=0;i<160;i++) players["z"+i] = { id: "z"+i, name: "Fan"+i, avatar: "🙂", score: 1000 - i, host: false }; })()`);
    await H.waitForTimeout(1300);
    await H.locator("#dockRoom").click(); await H.waitForTimeout(500);
    const rows = await H.locator(".v55-row").count(), more = await H.locator(".v55-more").textContent().catch(() => "");
    t("panneau Ma salle : 100 lignes au plus, « … et N autres joueurs »", rows === 100 && /… et 61 autres joueurs \(161 au total\)/.test(more));
    t("panneau Ma salle : la ligne « toi » reste visible", (await H.locator(".v55-row.me").count()) === 1);
    if (SHOTS) await H.screenshot({ path: SHOTS + "/room.png" });
    await N.ev(H, `V55UI.close()`);
    await N.ev(H, `(function(){ Object.keys(players).forEach(function(k){ if (k.charAt(0)==="z") delete players[k]; }); })()`);
    /* ---- statistiques ---- */
    await N.ev(H, `V40Stats.open()`); await H.waitForTimeout(600);
    const tabs = await H.locator(".v40s-tabs button, .v40s-tab, [role=tab]").allTextContents();
    t("onglets 🤝 Duels et 📌 Faits marquants présents", tabs.some(x => /Duels/.test(x)) && tabs.some(x => /Faits marquants/.test(x)));
    await N.ev(H, `(function(){ var s = document.getElementById("v40sSrc"); s.value = "g-small"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`); await H.waitForTimeout(400);
    await H.getByRole("tab", { name: /Duels/ }).click().catch(async () => { await H.getByText("🤝 Duels").first().click(); });
    await H.waitForTimeout(500);
    const duelsTxt = await H.evaluate(() => document.querySelector(".v40s-scroll").innerText);
    t("onglet Duels : rivalité, bilan et tableau face à face", /Plus belle rivalité/i.test(duelsTxt) && /Bête noire/i.test(duelsTxt) && /Souffre-douleur/i.test(duelsTxt) && /Face à face/.test(await H.evaluate(() => document.querySelector(".v40s-scroll").innerHTML)) && /2 – 1/.test(duelsTxt) && /3 V · 0 N · 2 D/.test(duelsTxt.replace(/\s+/g, " ")) && /Tom \(2 – 1\)/.test(duelsTxt));
    if (SHOTS) await H.screenshot({ path: SHOTS + "/duels.png" });
    await H.getByRole("tab", { name: /Faits marquants/ }).click().catch(async () => { await H.getByText("📌 Faits marquants").first().click(); });
    await H.waitForTimeout(500);
    const factsTxt = await H.evaluate(() => document.querySelector(".v40s-scroll").innerText);
    t("onglet Faits marquants : victoire au finish, écart au sommet, question la plus piégeuse", /Victoire au finish/i.test(factsTxt) && /Tom devance Léa de 1\u202f000 pts/.test(factsTxt) && /Question 3 « Symbole de l'or \? » : 33 % de réussite/.test(factsTxt));
    if (SHOTS) await H.screenshot({ path: SHOTS + "/facts.png" });
    /* ---- grand journal ---- */
    await N.ev(H, `(function(){ var s = document.getElementById("v40sSrc"); s.value = "g-big"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`); await H.waitForTimeout(600);
    await H.getByRole("tab", { name: /Vue d/ }).click().catch(async () => { await H.getByText("Vue d’ensemble").first().click(); }); await H.waitForTimeout(700);
    const bigTxt = await H.evaluate(() => document.querySelector(".v40s-scroll").innerText);
    t("grand journal : mention « Grande salle : 300 joueurs… 200 meilleurs » et 200 joueurs comptés", /Grande salle : 300 joueurs/.test(bigTxt) && /200 meilleurs/.test(bigTxt) && /\b200\s*\n?\s*Joueurs/i.test(bigTxt));
    if (SHOTS) await H.screenshot({ path: SHOTS + "/big.png" });
    await H.getByText("🤝 Duels").first().click(); await H.waitForTimeout(1500);
    const bigDuels = await H.evaluate(() => document.querySelector(".v40s-scroll").innerText);
    t("grand journal : l'onglet Duels s'affiche sans erreur, tableau face à face réservé aux petites parties", /Plus belle rivalité/i.test(bigDuels) && /jusqu’à 12 joueurs/.test(bigDuels));
    t("aucune erreur JavaScript ni boîte de dialogue", N.errs.length === 0);
    if (N.errs.length) console.log(N.errs.join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.message); }
  finally { await N.browser.close(); }
  console.log("Grandes salles (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
