/* ✉️ Statistiques par e-mail, sans serveur (js/stats/mail.js)   node tests/mail.test.js */
const M = require("../js/stats/mail.js");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }

/* ---- adresse ---- */
t("validEmail : adresses ordinaires acceptées", ["a@b.fr", "jean.dupont@exemple.com", "x_y-z+tag@sous.domaine.org", " moi@mail.io "].every(M.validEmail));
t("validEmail : plusieurs destinataires refusés (virgule, point-virgule, espace)", !M.validEmail("a@b.fr,c@d.fr") && !M.validEmail("a@b.fr;c@d.fr") && !M.validEmail("a@b.fr c@d.fr"));
t("validEmail : champs glissés dans le lien refusés (? & # = : / % guillemet chevron)", ["a@b.fr?cc=x@y.fr", "a@b.fr&bcc=x@y.fr", "a@b.fr#x", "a@b.fr=1", "a@b.fr:x", "a/b@c.fr", "a%40b@c.fr", 'a"b@c.fr', "<a@b.fr>", "a@b.fr\nbcc:x@y.fr"].every(x => !M.validEmail(x)));
t("validEmail : formes invalides refusées", ["", "abc", "a@", "@b.fr", "a@b", "a@b.", "a@@b.fr", "a@b..fr", ".a@b.fr", "a.@b.fr", null, undefined, 5].every(x => !M.validEmail(x)));
t("validEmail : trop long refusé", !M.validEmail("a".repeat(250) + "@b.fr"));

/* ---- sujet ---- */
t("subject : date et nombre de joueurs", M.subject("29 oct., 20:22", 4) === "🏆 Statistiques de la partie — 29 oct., 20:22 · 4 joueurs" && M.subject("", 1) === "🏆 Statistiques de la partie · 1 joueur" && M.subject(null, 0) === "🏆 Statistiques de la partie");
t("subject : retours à la ligne retirés, longueur bornée", !/[\r\n]/.test(M.subject("a\r\nBcc: x@y.fr", 2)) && M.subject("x".repeat(500), 2).length <= 120);

/* ---- bilan perso ---- */
const card = { name: "Léo", avatar: "🦊", rank: 1, players: 4, final: 12500, accuracy: 0.8, correct: 8, answered: 10, bestStreak: 5, fastest: 1.234, bestGain: 2400, awards: [{ emoji: "🔥", title: "Série folle" }, { emoji: "⚡", title: "Éclair" }] };
const P = M.personal(card);
t("personal : rang, score (espace), réussite, série, rapidité, gain, trophées", /Mon bilan — 🦊 Léo/.test(P) && /1er sur 4 · 12\s500 pts/.test(P) && /8 bonnes réponses sur 10 \(80 %\)/.test(P) && /Meilleure série : 5/.test(P) && /1,2 s/.test(P) && /\+2\s400 pts/.test(P) && /🔥 Série folle · ⚡ Éclair/.test(P));
t("personal : 2ᵉ, une seule bonne réponse au singulier, rien d'inutile", (function () { const p = M.personal({ name: "Zoé", rank: 2, players: 3, final: 300, accuracy: 1, correct: 1, answered: 1, bestStreak: 1, fastest: 0, bestGain: 0, awards: [] }); return /2ᵉ sur 3/.test(p) && /1 bonne réponse sur 1 \(100 %\)/.test(p) && !/série|rapide|gain|Trophées/i.test(p); })());
t("personal : entrée absente ou invalide → vide", M.personal(null) === "" && M.personal(undefined) === "" && M.personal("x") === "");
t("personal : pas de retour à la ligne caché dans un prénom", !/\n.*Bcc/.test(M.personal({ name: "A\nBcc: x@y.fr", rank: 1, players: 1, final: 0, answered: 0 })));
const R = "🏆 Récap de la partie — 29 oct.\n🥇 Léo — 12 500 pts\n🎮 qui-suis-je-officiel";
t("message : bilan perso en premier, puis récap, séparés d'une ligne vide ; sans bilan si demandé ; consigne en tête", (function () { const m = M.message(R, card); return m.startsWith("👤 Mon bilan") && m.indexOf("\n\n🏆 Récap de la partie") > 0 && M.message(R, card, { personal: false }) === R && M.message(R, null) === R && M.message(R, card, { prefix: "📎 PDF\nBcc: x" }).startsWith("📎 PDF Bcc: x\n\n👤"); })());

/* ---- liens ---- */
const u1 = M.url("mailto", { to: "moi@mail.fr", subject: "Sujet é", body: "Ligne 1\nLigne 2 🏆" });
t("mailto : adresse en clair, sujet et corps encodés, sauts de ligne en %0D%0A", u1.url.startsWith("mailto:moi@mail.fr?subject=") && /%0D%0A/.test(u1.url) && !/\n/.test(u1.url) && /body=Ligne%201%0D%0ALigne%202%20%F0%9F%8F%86/.test(u1.url) && u1.truncated === false);
t("mailto : sans adresse → destinataire vide (l'utilisateur le tape)", M.url("mailto", { to: "", subject: "s", body: "b" }).url.startsWith("mailto:?subject="));
t("mailto : adresse invalide ignorée, jamais recopiée dans le lien", (function () { const u = M.url("mailto", { to: "a@b.fr,x@y.fr?bcc=z@z.fr", subject: "s", body: "b" }).url; return u.startsWith("mailto:?subject=") && !/bcc|x@y/.test(u); })());
t("mailto : un « & » ou « ? » dans le texte ne crée pas de champ en plus", (function () { const u = M.url("mailto", { to: "", subject: "a&bcc=x@y.fr", body: "b?cc=x@y.fr&subject=Piégé" }).url; return (u.match(/[?&]subject=/g) || []).length === 1 && !/[?&]bcc=/.test(u) && !/[?&]cc=/.test(u) && (u.match(/&body=/g) || []).length === 1; })());
t("mailto : le sujet ne peut pas contenir de saut de ligne", !/%0A|%0D/.test(M.url("mailto", { to: "", subject: "a\r\nBcc: x@y.fr", body: "" }).url.split("&body=")[0]));
const g = M.url("gmail", { to: "moi@mail.fr", subject: "S", body: "a\nb" }), o = M.url("outlook", { to: "moi@mail.fr", subject: "S", body: "a\nb" });
t("Gmail : page « nouveau message » préremplie (https), sauts de ligne en %0A", g.url.startsWith("https://mail.google.com/mail/?view=cm&fs=1&to=moi%40mail.fr&su=S&body=a%0Ab") && g.truncated === false);
t("Outlook : page « nouveau message » préremplie (https)", o.url.startsWith("https://outlook.live.com/mail/0/deeplink/compose?to=moi%40mail.fr&subject=S&body=a%0Ab"));
t("aucun lien ne contient de caractère interdit (espace, retour à la ligne, guillemet, chevron)", [u1, g, o].every(x => !/[\s"<>]/.test(x.url)));

/* ---- longueur ---- */
const long = Array.from({ length: 80 }, (_, i) => "🥇 Joueur numéro " + i + " — " + (i * 137) + " pts (82 % de bonnes réponses)").join("\n");
["mailto", "gmail", "outlook"].forEach(k => {
  const r = M.url(k, { to: "moi@mail.fr", subject: M.subject("29 oct., 20:22", 80), body: long });
  t(k + " : un très long récap est raccourci pour tenir dans " + M.MAX_URL + " caractères, avec une note", r.truncated === true && r.url.length <= M.MAX_URL && /Résumé raccourci/.test(decodeURIComponent(r.url)) && decodeURIComponent(r.url).includes("Joueur numéro 0"));
});
t("raccourcissement : le bilan perso (en haut) est gardé, seule la fin du récap saute", (function () { const b = M.url("mailto", { to: "", subject: "s", body: M.message(long, card) }); return b.truncated && b.body.startsWith("👤 Mon bilan") && /Trophées : 🔥 Série folle/.test(b.body); })());
t("raccourcissement : coupé sur une ligne entière (pas de mot ni d'émoji tronqué)", (function () { const b = M.url("mailto", { to: "", subject: "s", body: long }).body; const kept = b.split("\n\n[…]")[0].split("\n"); return kept.every(l => /^🥇 Joueur numéro \d+ — \d+ pts \(82 % de bonnes réponses\)$/.test(l)); })());
t("récap moyen trop long : la ligne la moins utile (trophées du groupe) tombe d'abord ; code de salle et bilan perso restent", (function () {
  const recap = ["🏆 Récap de la partie — 29 oct., 20:22", "🥇 🦊 Léa — 4 000 pts (66,7 % de bonnes réponses)", "🥈 🐻 Tom — 3 000 pts (66,7 % de bonnes réponses)", "🥉 🐸 Max — 2 000 pts (66,7 % de bonnes réponses)", "4. 🐙 Zoé — 1 500 pts (50 % de bonnes réponses)", "5. 🦁 Sam — 900 pts (33,3 % de bonnes réponses)", "", "❓ 6 questions · ✅ réussite du groupe : 66,7 %", "🔥 Plus longue série : Léa (2 bonnes réponses d’affilée)", "⚡ Réponse la plus rapide : Léa (2 s)", "🧗 Question la plus difficile : « Question 1 » (66,7 % de réussite)", "🏅 Trophées : ⚡ Éclair — Léa · 💥 Gros coup — Léa, Tom et 1 autre · 🧐 Le plus réfléchi — Max · 👑 Roi de la partie — Tom", "🔑 Code de la salle : ABCD", "🎮 qui-suis-je-officiel"].join("\n");
  const r = M.url("mailto", { to: "moi@mail.fr", subject: M.subject("29 oct., 20:22", 3), body: M.message(recap, card) });
  return r.truncated && r.url.length <= M.MAX_URL && /🔑 Code de la salle : ABCD/.test(r.body) && /👤 Mon bilan/.test(r.body) && /Trophées : 🔥 Série folle/.test(r.body) && !/Roi de la partie/.test(r.body);
})());
t("un récap court n'est pas touché", M.url("mailto", { to: "", subject: "s", body: "court" }).truncated === false);
t("sujet démesuré : le lien reste sous la limite", M.url("mailto", { to: "", subject: "x".repeat(5000), body: "b" }).url.length <= M.MAX_URL);
t("clean : retours Windows normalisés, caractères de contrôle et inversions de texte retirés", M.clean("a\r\nb\rc\u0000d‮e") === "a\nb\nc d e");
t("fileName : date de la partie, version sombre", M.fileName(Date.UTC(2026, 9, 29, 12), false) === "qui-suis-je-statistiques-2026-10-29.pdf" && M.fileName(Date.UTC(2026, 9, 29, 12), true) === "qui-suis-je-statistiques-2026-10-29-sombre.pdf" && /^qui-suis-je-statistiques-/.test(M.fileName(undefined, false)));

const fs = require("fs"), path = require("path"), idx = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), st = fs.readFileSync(path.join(__dirname, "../js/stats/stats.js"), "utf8"), src = fs.readFileSync(path.join(__dirname, "../js/stats/mail.js"), "utf8");
t("index.html : le module est chargé avec les statistiques", /js\/stats\/mail\.js/.test(idx));
t("le bouton « ✉️ E-mail » est dans l'en-tête des statistiques, désactivé sans partie", /id: "v40sMail"/.test(st) && /mailBtn\.disabled = true/.test(st));
t("réseau : une seule requête possible (fetch vers EMAILJS_URL), ni XMLHttpRequest, ni sendBeacon, ni WebSocket, ni EventSource", (src.match(/\bfetch\s*\(/g) || []).length === 1 && /window\.fetch\(M\.EMAILJS_URL/.test(src) && !/XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(src));
t("réseau : les seuls sites cités dans le code sont EmailJS (envoi) et les pages « nouveau message » de Gmail et Outlook", (function () { const hosts = new Set((src.match(/https?:\/\/[a-z0-9.\-]+/gi) || []).map(x => x.replace(/^https?:\/\//i, "").toLowerCase())); return [...hosts].every(h => ["api.emailjs.com", "mail.google.com", "outlook.live.com"].includes(h)) && hosts.has("api.emailjs.com"); })());
t("le fichier de réglage est chargé avant le module, et vide par défaut", idx.indexOf("mail-config.js") > 0 && idx.indexOf("mail-config.js") < idx.indexOf("js/stats/mail.js") && /serviceId: ""/.test(fs.readFileSync(path.join(__dirname, "../js/stats/mail-config.js"), "utf8")) && /publicKey: ""/.test(fs.readFileSync(path.join(__dirname, "../js/stats/mail-config.js"), "utf8")));

/* ---- envoi direct (EmailJS) ---- */
const CFG = { serviceId: "service_ab12cd3", templateId: "template_x1y2z3w", publicKey: "AbCdEfGhIjKlMnOpQ" };
t("validConfig : 3 identifiants simples acceptés ; vides, espaces, caractères spéciaux, trop longs refusés", M.validConfig(CFG) && !M.validConfig({ ...CFG, publicKey: "" }) && !M.validConfig({ ...CFG, serviceId: "a b" }) && !M.validConfig({ ...CFG, templateId: "t<script>" }) && !M.validConfig({ ...CFG, publicKey: "x".repeat(65) }) && !M.validConfig(null) && !M.validConfig("x") && !M.validConfig({}));
const PL = M.emailjsPayload(CFG, { to: " moi@mail.fr ", subject: "Sujet\nBcc: x@y.fr", message: "Ligne 1\n<b>2</b> & co", fromName: "Léa" });
t("emailjsPayload : identifiants, destinataire, sujet sur une ligne, expéditeur", PL && PL.service_id === CFG.serviceId && PL.template_id === CFG.templateId && PL.user_id === CFG.publicKey && PL.template_params.to_email === "moi@mail.fr" && PL.template_params.reply_to === "moi@mail.fr" && !/[\r\n]/.test(PL.template_params.subject) && PL.template_params.from_name === "Léa");
t("emailjsPayload : message en texte ET en HTML ; le HTML est échappé (pas de balise injectée) avec des <br>", PL.template_params.message === "Ligne 1\n<b>2</b> & co" && PL.template_params.message_html === "Ligne 1<br>&lt;b&gt;2&lt;/b&gt; &amp; co" && !/<b>/.test(PL.template_params.message_html));
t("emailjsPayload : adresse invalide, réglage invalide ou absent → null (rien n'est envoyé)", M.emailjsPayload(CFG, { to: "a@b.fr,c@d.fr", subject: "s", message: "m" }) === null && M.emailjsPayload(CFG, { to: "", subject: "s", message: "m" }) === null && M.emailjsPayload({ ...CFG, publicKey: "" }, { to: "a@b.fr", subject: "s", message: "m" }) === null && M.emailjsPayload(CFG, null) === null && M.emailjsPayload(null, { to: "a@b.fr" }) === null);
t("emailjsPayload : message borné à 8 000 caractères, expéditeur par défaut", M.emailjsPayload(CFG, { to: "a@b.fr", subject: "s", message: "x".repeat(20000) }).template_params.message.length === 8000 && M.emailjsPayload(CFG, { to: "a@b.fr", subject: "s", message: "m" }).template_params.from_name === "Qui suis-je ?" && M.emailjsPayload(CFG, { to: "a@b.fr", subject: "s", message: "m", fromName: "x".repeat(200) }).template_params.from_name.length === 60);
t("html : & < > \" ' échappés, retours à la ligne en <br>", M.html("a&b <i>\"c\" 'd'\ne") === "a&amp;b &lt;i&gt;&quot;c&quot; &#39;d&#39;<br>e");
const now = 1e12;
t("sendLimit : premier envoi autorisé ; un 2ᵉ trop tôt (< 20 s) refusé avec l'attente ; après 20 s autorisé", M.sendLimit([], now).ok && (function () { const r = M.sendLimit([now - 5000], now); return !r.ok && r.why === "gap" && r.wait === 15000; })() && M.sendLimit([now - 21000], now).ok);
t("sendLimit : 6 envois dans l'heure → refus avec l'attente jusqu'au plus ancien ; les envois de plus d'une heure ne comptent plus", (function () { const h = [1, 2, 3, 4, 5, 6].map(k => now - 3500000 + k * 60000); const r = M.sendLimit(h, now); return !r.ok && r.why === "hour" && r.wait > 0 && r.wait <= 3600000; })() && M.sendLimit([1, 2, 3, 4, 5, 6].map(k => now - 4000000 - k), now).ok);
t("sendLimit : historique abîmé (texte, futur lointain, null) ignoré sans exception", M.sendLimit(["x", null, NaN, now + 1e9, {}], now).ok && M.sendLimit(null, now).ok && M.sendLimit("x", now).ok);
t("statusMessage : un message clair et utile pour chaque cas (réseau, délai, clé, service, modèle, origine, Gmail, adresse, quota, panne, autre)", [[0, "network", /Pas de connexion/], [0, "timeout", /ne répond pas/], [400, "The Public Key is invalid", /clé publique/], [400, "The service ID not found", /service/i], [400, "The template ID not found", /modèle/], [403, "", /Allowed origins/], [412, "Gmail_API", /reconnecté/], [422, "recipients address is corrupted", /\{\{to_email\}\}/], [429, "", /quota/i], [503, "", /indisponible/], [418, "", /code 418/]].every(([c, tx, re]) => re.test(M.statusMessage(c, tx))));
t("statusMessage : jamais de balise ni de texte serveur démesuré dans le message", M.statusMessage(400, "<script>x</script>" + "y".repeat(5000)).length < 200);

console.log("E-mail des statistiques : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
