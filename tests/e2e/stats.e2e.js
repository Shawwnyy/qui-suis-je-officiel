/* Statistiques — onglets 🗂️ Catégories et 🧬 Profils (Chromium via Playwright, facultatif)
   node tests/e2e/stats.e2e.js
   Charge une partie de démonstration dans l'historique, ouvre la fenêtre de statistiques et vérifie que les deux onglets
   affichent leurs graphiques (nuage de points, barres, carte des forces, tableaux) sans erreur JavaScript. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const SHOTS = process.env.SHOTS || "";
(async () => {
  const N = await boot({ viewport: { width: 1000, height: 1100 } });
  if (!N) { console.log("Statistiques (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    const cats = ["🌍 Géographie", "🎬 Cinéma", "🧪 Sciences", "⚽ Sport"], diffs = ["facile", "moyen", "difficile", "moyen"], names = ["Léa", "Tom", "Max", "Zoé"];
    const cum = [0, 0, 0, 0], R = [];
    for (let q = 0; q < 12; q++) {
      R.push({ q: "Question " + (q + 1), c: cats[q % 4], d: diffs[(q * 3) % 4], m: 0, r: names.map((n, k) => {
        const good = ((q * 7 + k * 3 + (q % 4 === k ? 1 : 0)) % 5) < 3; const tm = 2 + ((q + k * 2) % 6) + (k === 2 ? 3 : 0) - (k === 0 ? 1 : 0);
        if (q === 5 && k === 3) return [0, 0, 0];
        cum[k] += good ? 1000 : 0; return [good ? 1 : (q % 3 === 0 ? 3 : 2), good || q % 3 !== 0 ? tm : 0, cum[k]]; }) });
    }
    const log = { v: 1, id: "g1", at: Date.now() - 1000, qt: 20, mode: "classic", P: names.map((n, i) => ({ i: "p" + i, n, a: ["🦊", "🐻", "🐸", "🐙"][i], h: i === 0 ? 1 : 0 })), R, C: [], B: [] };
    await H.evaluate(l => localStorage.setItem("quizV40History", JSON.stringify([l])), log); await H.reload(); await H.waitForTimeout(800);
    await N.ev(H, `V40Stats.open()`); await H.waitForTimeout(600);
    t("la fenêtre propose les onglets Catégories et Profils", (await H.getByRole("tab", { name: /Catégories/i }).count()) === 1 && (await H.getByRole("tab", { name: /Profils/i }).count()) === 1);
    await H.getByRole("tab", { name: /Catégories/i }).click(); await H.waitForTimeout(700);
    const c = await H.evaluate(() => { const b = document.querySelector(".v40s-scroll"); return { text: b.innerText, svg: b.querySelectorAll("svg").length, tables: b.querySelectorAll("table").length, cards: b.querySelectorAll(".v40s-card").length }; });
    t("Catégories : les 4 catégories de la partie apparaissent", cats.every(x => c.text.includes(x.slice(3))));
    t("Catégories : carte des forces et champions présents", /carte des forces/i.test(c.text) && /champion/i.test(c.text));
    t("Catégories : tous les blocs s'ouvrent en graphique (au moins 5 graphiques) ; les tableaux sont derrière « Tableau »", c.svg >= 5 && c.cards >= 5 && c.tables === 0);
    if (SHOTS) { await H.evaluate(() => { document.querySelector(".v40s-scroll").scrollTop = 99999; }); await H.waitForTimeout(300); await H.screenshot({ path: SHOTS + "/stats-categories.png" }); }
    await H.getByRole("tab", { name: /Profils/i }).click(); await H.waitForTimeout(700);
    const p = await H.evaluate(() => { const b = document.querySelector(".v40s-scroll"); return { text: b.innerText, svg: b.querySelectorAll("svg").length, tables: b.querySelectorAll("table").length }; });
    t("Profils : les 4 joueurs apparaissent", names.every(n => p.text.includes(n)));
    t("Profils : vitesse, régularité et tableau de profils", /vitesse/i.test(p.text) && /régularité/i.test(p.text) && p.tables >= 1);
    t("Profils : au moins un graphique", p.svg >= 1);
    if (SHOTS) await H.screenshot({ path: SHOTS + "/stats-profils.png" });
    await H.getByRole("tab", { name: /Catégories/i }).click(); await H.waitForTimeout(300);
    t("on peut revenir sur Catégories sans erreur", (await H.evaluate(() => document.querySelector(".v40s-scroll").innerText)).includes("Géographie"));
    /* graphiques réels (et plus seulement des tableaux) pour « Carte des forces » et « Le champion de chaque catégorie » */
    const cardOf = re => H.evaluate(src => { const c = [...document.querySelectorAll(".v40s-card")].find(x => new RegExp(src, "i").test((x.querySelector("h3") || {}).textContent || "")); if (!c) return null; return { svg: c.querySelectorAll("svg.v40s-svg").length, tables: c.querySelectorAll("table").length, sel: c.querySelectorAll("select.v40s-forcepick").length, texts: [...c.querySelectorAll("svg text")].map(x => x.textContent).join("|"), on: (c.querySelector(".v40s-seg .on") || {}).textContent || "" }; }, re.source);
    const champ = await cardOf(/champion de chaque/);
    t("Champion : la vue « Graphique » est un vrai graphique (barres), pas un tableau", champ && champ.svg === 1 && champ.tables === 0 && /Graphique/.test(champ.on) && cats.every(x => champ.texts.includes(x.slice(3))));
    t("Champion : le nom du champion et sa réussite sont écrits sur chaque barre", champ && /(Léa|Tom|Max|Zoé) · \d+ ?%/.test(champ.texts));
    const forces = await cardOf(/carte des forces/);
    t("Carte des forces : un vrai graphique avec choix du joueur, et les 4 catégories", forces && forces.svg === 1 && forces.sel === 1 && cats.every(x => forces.texts.includes(x.slice(3))));
    await H.evaluate(() => { const sel = document.querySelector("select.v40s-forcepick"); sel.value = sel.options[2].value; sel.dispatchEvent(new Event("change", { bubbles: true })); }); await H.waitForTimeout(300);
    const forces2 = await cardOf(/carte des forces/);
    t("Carte des forces : changer de joueur redessine le graphique", forces2 && forces2.svg === 1 && forces2.texts !== forces.texts);
    await H.evaluate(() => { const c = [...document.querySelectorAll(".v40s-card")].find(x => /carte des forces/i.test(x.querySelector("h3").textContent)); [...c.querySelectorAll(".v40s-seg button")].find(b => /Tableau/.test(b.textContent)).click(); }); await H.waitForTimeout(300);
    const forces3 = await cardOf(/carte des forces/);
    t("Carte des forces : la vue « Tableau » montre les 4 joueurs d'un coup (carte de chaleur)", forces3 && forces3.tables === 1 && forces3.svg === 0 && /Tableau/.test(forces3.on) && await H.evaluate(() => { const c = [...document.querySelectorAll(".v40s-card")].find(x => /carte des forces/i.test(x.querySelector("h3").textContent)); return c.querySelectorAll("table.v40s-heat tbody tr").length === 4; }));
    /* le choix Graphique / Tableau est retenu en changeant d'onglet */
    await H.getByRole("tab", { name: /Profils/i }).click(); await H.waitForTimeout(400);
    await H.getByRole("tab", { name: /Catégories/i }).click(); await H.waitForTimeout(500);
    const forces4 = await cardOf(/carte des forces/);
    t("la carte reste en « Tableau » après un aller-retour entre onglets", forces4 && forces4.tables === 1 && /Tableau/.test(forces4.on));
    await H.evaluate(() => { const c = [...document.querySelectorAll(".v40s-card")].find(x => /carte des forces/i.test(x.querySelector("h3").textContent)); [...c.querySelectorAll(".v40s-seg button")].find(b => /Graphique/.test(b.textContent)).click(); }); await H.waitForTimeout(300);
    /* barre d'onglets : garde sa position et l'onglet choisi reste visible */
    await H.setViewportSize({ width: 600, height: 900 }); await H.waitForTimeout(400);
    await H.evaluate(() => { document.querySelector(".v40s-scroll").scrollTop = 99999; document.querySelector(".v40s-tabs").scrollLeft = 99999; });
    await H.evaluate(() => { [...document.querySelectorAll(".v40s-tabs button")].find(b => /Profils/.test(b.textContent)).click(); }); await H.waitForTimeout(500);
    const tabs = await H.evaluate(() => { const tb = document.querySelector(".v40s-tabs"), on = tb.querySelector(".on"), a = on.getBoundingClientRect(), c = tb.getBoundingClientRect(); return { left: tb.scrollLeft, visible: a.left >= c.left - 1 && a.right <= c.right + 1, label: on.textContent, top: document.querySelector(".v40s-scroll").scrollTop }; });
    t("changer d'onglet : la barre d'onglets ne revient pas à gauche, l'onglet choisi est visible", tabs.left > 0 && tabs.visible && /Profils/.test(tabs.label));
    t("changer d'onglet : le nouveau contenu s'ouvre tout en haut", tabs.top === 0);
    await H.setViewportSize({ width: 1000, height: 1100 }); await H.waitForTimeout(300);
    t("aucune erreur JavaScript dans les statistiques", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    /* historique vide : pas de plantage */
    await H.evaluate(() => localStorage.setItem("quizV40History", "[]")); await H.reload(); await H.waitForTimeout(600);
    await N.ev(H, `V40Stats.open()`); await H.waitForTimeout(400);
    await H.getByRole("tab", { name: /Catégories/i }).click(); await H.waitForTimeout(300); await H.getByRole("tab", { name: /Profils/i }).click(); await H.waitForTimeout(300);
    t("sans aucune partie, les deux onglets s'ouvrent sans erreur", true);
    t("aucune erreur JavaScript", N.errs.filter(e => !/dialog|peer-unavailable/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("Statistiques (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
