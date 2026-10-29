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
    const c = await H.evaluate(() => { const b = document.querySelector(".v40s-scroll"); return { text: b.innerText, svg: b.querySelectorAll("svg").length, tables: b.querySelectorAll("table").length, cards: b.querySelectorAll(".v40c-card, .v40-card").length }; });
    t("Catégories : les 4 catégories de la partie apparaissent", cats.every(x => c.text.includes(x.slice(3))));
    t("Catégories : carte des forces et champions présents", /carte des forces/i.test(c.text) && /champion/i.test(c.text));
    t("Catégories : au moins un graphique et un tableau", c.svg + c.cards >= 2 && c.tables >= 2);
    if (SHOTS) await H.screenshot({ path: SHOTS + "/stats-categories.png" });
    await H.getByRole("tab", { name: /Profils/i }).click(); await H.waitForTimeout(700);
    const p = await H.evaluate(() => { const b = document.querySelector(".v40s-scroll"); return { text: b.innerText, svg: b.querySelectorAll("svg").length, tables: b.querySelectorAll("table").length }; });
    t("Profils : les 4 joueurs apparaissent", names.every(n => p.text.includes(n)));
    t("Profils : vitesse, régularité et tableau de profils", /vitesse/i.test(p.text) && /régularité/i.test(p.text) && p.tables >= 1);
    t("Profils : au moins un graphique", p.svg >= 1);
    if (SHOTS) await H.screenshot({ path: SHOTS + "/stats-profils.png" });
    await H.getByRole("tab", { name: /Catégories/i }).click(); await H.waitForTimeout(300);
    t("on peut revenir sur Catégories sans erreur", (await H.evaluate(() => document.querySelector(".v40s-scroll").innerText)).includes("Géographie"));
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
