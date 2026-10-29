/* ✉️ Statistiques par e-mail sans serveur — essai de bout en bout (Chromium via Playwright)   node tests/e2e/mail.e2e.js
   Charge une partie dans l'historique, ouvre les statistiques, prépare l'e-mail (messagerie, Gmail, PDF), et vérifie qu'AUCUNE requête réseau n'est faite par le jeu. */
const { boot } = require("./fake-peerjs.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
(async () => {
  const N = await boot({ viewport: { width: 900, height: 1000 } });
  if (!N) { console.log("E-mail des statistiques (e2e) : Playwright absent, essai ignoré."); return; }
  try {
    const H = await N.newPage("H");
    const cats = ["🌍 Géographie", "🎬 Cinéma"], names = ["Léa", "Tom", "Max"], cum = [0, 0, 0], R = [];
    for (let q = 0; q < 6; q++) R.push({ q: "Question " + (q + 1), c: cats[q % 2], d: "moyen", m: 0, r: names.map((n, k) => { const good = (q + k) % 3 !== 0; cum[k] += good ? 1000 : 0; return [good ? 1 : 2, 2 + k, cum[k]]; }) });
    const log = { v: 1, id: "g1", at: Date.UTC(2026, 9, 29, 19, 22), qt: 20, mode: "classic", rc: "ABCD", P: names.map((n, i) => ({ i: "p" + i, n, a: ["🦊", "🐻", "🐸"][i], h: i === 0 ? 1 : 0 })), R, C: [], B: [] };
    await H.evaluate(l => localStorage.setItem("quizV40History", JSON.stringify([l])), log); await H.reload(); await H.waitForTimeout(800);
    await N.ev(H, `myName = "Léa"`);
    const reqs = []; H.on("request", r => { const u = r.url(); if (!/^(file|data|blob|about|chrome-extension|mailto):/.test(u)) reqs.push(u); });
    await N.ev(H, `V40Stats.open()`); await H.waitForTimeout(600);
    t("le bouton « ✉️ E-mail » est dans l'en-tête des statistiques et actif", (await H.locator("#v40sMail").count()) === 1 && await H.locator("#v40sMail").isEnabled());
    await H.locator("#v40sMail").click(); await H.waitForTimeout(300);
    t("la fenêtre s'ouvre : explication de l'envoi, champ adresse, 4 actions", await H.evaluate(() => { const b = document.getElementById("v61Mail"); return !!b && /Envoyer/.test(b.textContent) && /EmailJS/.test(b.textContent) && !!b.querySelector("#v61To") && ["v61Send", "v61Mailto", "v61Gmail", "v61Outlook", "v61Pdf", "v61Copy", "v61Setup"].every(i => !!b.querySelector("#" + i)); }));
    if (process.env.SHOTS) await H.screenshot({ path: process.env.SHOTS + "/mail.png" });
    t("les cases à cocher sont visibles (24 × 24 px)", await H.evaluate(() => ["v61Keep", "v61Perso"].every(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.width >= 20 && r.height >= 20; })));
    t("le focus est dans le champ adresse", await H.evaluate(() => document.activeElement && document.activeElement.id === "v61To"));
    t("« Ajouter mon bilan personnel » est coché (Léa est dans la partie)", await H.evaluate(() => { const c = document.getElementById("v61Perso"); return c.checked && !c.disabled; }));
    /* adresse invalide : rien ne part */
    await H.fill("#v61To", "pas une adresse"); await H.locator("#v61Mailto").click(); await H.waitForTimeout(200);
    t("adresse invalide : message d'erreur, aucun lien préparé", /n'a pas l'air valide/.test(await H.textContent("#v61Msg")) && (await N.ev(H, `V61MailUI.lastUrl`)) === "");
    await H.fill("#v61To", "moi@mail.fr?bcc=x@y.fr"); await H.locator("#v61Gmail").click(); await H.waitForTimeout(200);
    t("adresse avec « ?bcc= » glissé : refusée", /n'a pas l'air valide/.test(await H.textContent("#v61Msg")) && (await N.ev(H, `V61MailUI.lastUrl`)) === "");
    /* messagerie */
    await H.fill("#v61To", "moi@mail.fr"); await H.locator("#v61Mailto").click(); await H.waitForTimeout(300);
    const u1 = await N.ev(H, `V61MailUI.lastUrl`), d1 = decodeURIComponent(u1.replace(/\+/g, " "));
    t("messagerie : lien mailto: vers l'adresse saisie, sujet avec date et joueurs", u1.startsWith("mailto:moi@mail.fr?subject=") && /Statistiques de la partie — .*3 joueurs/.test(d1));
    t("messagerie : le corps contient le récap (podium, code de salle) et le bilan perso de Léa", /Récap de la partie/.test(d1) && /🥇|🥈|🥉/.test(d1) && /🔑 Code de la salle : ABCD/.test(d1) && /Mon bilan — 🦊 Léa/.test(d1));
    t("messagerie : message de confirmation", /application de messagerie s'ouvre/.test(await H.textContent("#v61Msg")));
    /* Gmail : nouvelle page préremplie, ouverte dans un nouvel onglet (window.open interceptée) */
    await H.evaluate(() => { window.__opened = []; window.open = (u, n, f) => { window.__opened.push([u, n, f]); return null; }; });
    await H.locator("#v61Gmail").click(); await H.waitForTimeout(300);
    const op = await H.evaluate(() => window.__opened);
    t("Gmail : https://mail.google.com … préremplie, ouverte avec noopener", op.length === 1 && op[0][0].startsWith("https://mail.google.com/mail/?view=cm&fs=1&to=moi%40mail.fr&su=") && /noopener/.test(op[0][2]));
    await H.locator("#v61Outlook").click(); await H.waitForTimeout(300);
    t("Outlook : https://outlook.live.com … préremplie", (await H.evaluate(() => window.__opened)).length === 2 && (await H.evaluate(() => window.__opened[1][0])).startsWith("https://outlook.live.com/mail/0/deeplink/compose?to=moi%40mail.fr"));
    /* sans bilan perso */
    await H.locator("#v61Perso").uncheck(); await H.locator("#v61Mailto").click(); await H.waitForTimeout(200);
    t("sans « bilan personnel » : le message n'en contient plus", !/Mon bilan/.test(decodeURIComponent((await N.ev(H, `V61MailUI.lastUrl`)).replace(/\+/g, " "))));
    await H.locator("#v61Perso").check();
    /* aperçu */
    await H.locator(".v61-prev summary").click(); await H.waitForTimeout(200);
    t("« Voir le message » montre le sujet et le texte", /Statistiques de la partie/.test(await H.textContent("#v61Mail .v61-pre")) && /Récap de la partie/.test(await H.textContent("#v61Mail .v61-pre")));
    /* PDF : sur ordinateur (pas de partage de fichier) → téléchargement + e-mail préparé */
    const dl = H.waitForEvent("download", { timeout: 15000 }).catch(() => null);
    await H.locator("#v61Pdf").click(); const d = await dl; await H.waitForTimeout(400);
    const kind = await N.ev(H, `V61MailUI.lastKind`);
    t("PDF : un fichier .pdf est téléchargé, ou le menu de partage est ouvert", (d && /^qui-suis-je-statistiques-.*\.pdf$/.test(d.suggestedFilename())) || kind === "share");
    t("PDF (sans partage) : l'e-mail est préparé avec la consigne de joindre le fichier", kind === "share" || (kind === "mailto-pdf" && /joindre/.test(decodeURIComponent((await N.ev(H, `V61MailUI.lastUrl`)).replace(/\+/g, " ")))));
    if (process.env.SHOTS) await H.screenshot({ path: process.env.SHOTS + "/mail.png" });
    /* ---- 📨 envoi direct (EmailJS) : requêtes interceptées, rien ne part pour de vrai ---- */
    t("jusqu'ici (ouvrir, messagerie, Gmail, Outlook, PDF, copie) : aucune requête réseau faite par le jeu", reqs.length === 0);
    const posted = []; let reply = { status: 200, body: "OK" };
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
    await H.route("https://api.emailjs.com/**", route => { const rq = route.request(); if (rq.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors }); posted.push({ url: rq.url(), method: rq.method(), body: rq.postData(), type: rq.headers()["content-type"] }); return route.fulfill({ status: reply.status, body: reply.body, headers: { ...cors, "content-type": "text/plain" } }); });
    t("le bouton « 📨 Envoyer maintenant » est le premier bouton d'action", await H.evaluate(() => { const b = document.querySelector("#v61Mail .v61-row .v61-b"); return !!b && b.id === "v61Send"; }));
    await H.fill("#v61To", "ami@exemple.fr"); await H.locator("#v61Send").click(); await H.waitForTimeout(300);
    t("pas encore réglé : l'explication s'ouvre (5 étapes, 3 champs), rien n'est envoyé", (await H.evaluate(() => document.getElementById("v61Setup").open)) && /pas encore activé/.test(await H.textContent("#v61Msg")) && (await H.locator("#v61Setup ol li").count()) === 5 && (await H.locator("#v61Setup input").count()) === 3 && posted.length === 0);
    await H.fill("#v61CfgService", "service ab"); await H.fill("#v61CfgTemplate", "template_x1y2z3w"); await H.fill("#v61CfgKey", "AbCdEfGhIjKlMnOpQ"); await H.locator("#v61CfgSave").click(); await H.waitForTimeout(200);
    t("réglage invalide (espace dans un identifiant) : refusé, rien n'est gardé", /3 valeurs sont nécessaires/.test(await H.textContent("#v61Msg")) && (await H.evaluate(() => localStorage.getItem("quizV61EmailJs"))) === null);
    await H.fill("#v61CfgService", "service_ab12cd3"); await H.locator("#v61CfgSave").click(); await H.waitForTimeout(200);
    t("réglage valide : gardé sur cet appareil, l'explication se referme", (await H.evaluate(() => JSON.parse(localStorage.getItem("quizV61EmailJs")).serviceId)) === "service_ab12cd3" && !(await H.evaluate(() => document.getElementById("v61Setup").open)));
    await H.fill("#v61To", ""); await H.locator("#v61Send").click(); await H.waitForTimeout(200);
    t("sans adresse : message d'erreur, rien n'est envoyé", /Saisis l'adresse/.test(await H.textContent("#v61Msg")) && posted.length === 0);
    await H.fill("#v61To", "a@b.fr, c@d.fr"); await H.locator("#v61Send").click(); await H.waitForTimeout(200);
    t("deux adresses : refusé, rien n'est envoyé", /n'a pas l'air valide/.test(await H.textContent("#v61Msg")) && posted.length === 0);
    await H.fill("#v61To", "ami@exemple.fr"); await H.locator("#v61Send").click(); await H.waitForFunction(() => /Envoyé à/.test(document.getElementById("v61Msg").textContent), null, { timeout: 8000 }).catch(() => {});
    t("envoi : message de succès « Envoyé à ami@exemple.fr »", /✅ Envoyé à ami@exemple\.fr/.test(await H.textContent("#v61Msg")) && /ok/.test(await H.getAttribute("#v61Msg", "class")));
    const body = posted[0] && JSON.parse(posted[0].body);
    t("envoi : UNE requête POST JSON vers api.emailjs.com avec les 3 identifiants", posted.length === 1 && posted[0].method === "POST" && posted[0].url === "https://api.emailjs.com/api/v1.0/email/send" && /application\/json/.test(posted[0].type) && body.service_id === "service_ab12cd3" && body.template_id === "template_x1y2z3w" && body.user_id === "AbCdEfGhIjKlMnOpQ");
    const tp = body && body.template_params;
    t("envoi : destinataire, sujet, expéditeur, message texte et HTML (bilan de Léa + récap + code de salle)", tp && tp.to_email === "ami@exemple.fr" && /Statistiques de la partie/.test(tp.subject) && tp.from_name === "Léa" && /Mon bilan — 🦊 Léa/.test(tp.message) && /Récap de la partie/.test(tp.message) && /Code de la salle : ABCD/.test(tp.message) && /<br>/.test(tp.message_html) && !/<(script|b|i)>/.test(tp.message_html));
    t("envoi : le message COMPLET part (pas de coupure à 2 000 caractères comme pour mailto)", tp && tp.message.length > 400 && /qui-suis-je-officiel/.test(tp.message) && /Trophées/.test(tp.message));
    t("envoi : le bouton redevient utilisable", await H.isEnabled("#v61Send"));
    await H.locator("#v61Send").click(); await H.waitForTimeout(300);
    t("2ᵉ envoi tout de suite : « Patiente … s », aucune 2ᵉ requête", /Patiente \d+ s/.test(await H.textContent("#v61Msg")) && posted.length === 1);
    await H.evaluate(() => localStorage.removeItem("quizV61Sent")); reply = { status: 400, body: "The template ID not found" };
    await H.locator("#v61Send").click(); await H.waitForFunction(() => /modèle/.test(document.getElementById("v61Msg").textContent), null, { timeout: 8000 }).catch(() => {});
    t("erreur du service (400 modèle introuvable) : message clair en rouge, pas de faux « Envoyé »", /Identifiant de modèle EmailJS introuvable/.test(await H.textContent("#v61Msg")) && /bad/.test(await H.getAttribute("#v61Msg", "class")) && posted.length === 2);
    await H.evaluate(() => localStorage.removeItem("quizV61Sent")); await H.unroute("https://api.emailjs.com/**"); await H.route("https://api.emailjs.com/**", route => route.abort("failed"));
    await H.locator("#v61Send").click(); await H.waitForFunction(() => /connexion/.test(document.getElementById("v61Msg").textContent), null, { timeout: 8000 }).catch(() => {});
    t("pas de connexion : message clair, le bouton redevient utilisable", /Pas de connexion Internet/.test(await H.textContent("#v61Msg")) && await H.isEnabled("#v61Send"));
    await H.evaluate(() => localStorage.setItem("quizV61Sent", JSON.stringify([1, 2, 3, 4, 5, 6].map(k => Date.now() - 60000 * 10 - k)))); await H.locator("#v61Send").click(); await H.waitForTimeout(300);
    t("6 envois dans l'heure : limite atteinte, message clair", /Limite atteinte/.test(await H.textContent("#v61Msg")));
    await H.evaluate(() => localStorage.removeItem("quizV61Sent"));
    t("seules des requêtes vers api.emailjs.com ont été faites, et seulement après un clic sur « Envoyer »", reqs.every(u => u.startsWith("https://api.emailjs.com/")) && reqs.length >= 3);
    if (process.env.SHOTS) { await H.evaluate(() => { document.getElementById("v61Setup").open = true; }); await H.screenshot({ path: process.env.SHOTS + "/mail-setup.png" }); await H.evaluate(() => { document.getElementById("v61Setup").open = false; }); }
    /* retenir l'adresse */
    await H.fill("#v61To", "moi@mail.fr"); await H.locator("#v61Keep").check(); await H.locator("#v61Mailto").click(); await H.waitForTimeout(200);
    t("« Retenir cette adresse » : gardée dans le navigateur", (await H.evaluate(() => localStorage.getItem("quizV61MailTo"))) === "moi@mail.fr");
    /* la fenêtre résiste à une mise à jour des statistiques, se ferme avec Échap, et la fenêtre des stats reste ouverte */
    await N.ev(H, `V40Stats.open()`); await H.waitForTimeout(300);
    t("la fenêtre reste ouverte quand les statistiques se redessinent", (await H.locator("#v61Mail").count()) === 1);
    await H.keyboard.press("Escape"); await H.waitForTimeout(200);
    t("Échap ferme la fenêtre e-mail seulement ; les statistiques restent affichées", (await H.locator("#v61Mail").count()) === 0 && await H.evaluate(() => getComputedStyle(document.getElementById("v40Stats")).display !== "none"));
    await H.locator("#v40sMail").click(); await H.waitForTimeout(300);
    t("rouverte : l'adresse retenue est préremplie", (await H.inputValue("#v61To")) === "moi@mail.fr" && await H.isChecked("#v61Keep"));
    await H.locator("#v61Keep").uncheck(); await H.locator("#v61Copy").click(); await H.waitForTimeout(300);
    t("décocher « Retenir » efface l'adresse gardée", (await H.evaluate(() => localStorage.getItem("quizV61MailTo"))) === null);
    await H.locator(".v61-close").click(); await H.waitForTimeout(200);
    t("« Fermer » ferme la fenêtre", (await H.locator("#v61Mail").count()) === 0);
    t("aucune erreur JavaScript pendant tout l'essai", N.errs.filter(e => !/peer-unavailable|dialog|qcm\.php/.test(e)).length === 0);
    if (N.errs.length) console.log(N.errs.filter(e => !/dialog|qcm\.php/.test(e)).join("\n"));
  } catch (e) { bad++; console.log("ÉCHEC : exception", e && e.stack || e); }
  await N.browser.close();
  console.log("E-mail des statistiques (e2e) : " + ok + " OK, " + bad + " échec(s)");
  process.exit(bad ? 1 : 0);
})();
