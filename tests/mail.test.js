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
t("AUCUN serveur : le module n'appelle ni fetch, ni XMLHttpRequest, ni sendBeacon, ni WebSocket", !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\b\s*\(/.test(src) && !/new (XMLHttpRequest|WebSocket)/.test(src));
console.log("E-mail des statistiques : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
