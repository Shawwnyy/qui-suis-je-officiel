/* Tests du lien d'invitation (fonctions pures).  Lancer :  node tests/invite.test.js */
"use strict";
const I = require("../js/invite/invite.js");
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("ÉCHEC : " + m); } };

ok(I.parseInvite("?room=123456", "") === "123456", "?room=123456");
ok(I.parseInvite("?salle=654321", "") === "654321", "?salle=654321");
ok(I.parseInvite("?code=111222", "") === "111222", "?code=111222");
ok(I.parseInvite("?a=1&room=999888&b=2", "") === "999888", "code au milieu d'autres paramètres");
ok(I.parseInvite("", "#123456") === "123456", "#123456");
ok(I.parseInvite("", "#room=123456") === "123456", "#room=123456");
ok(I.parseInvite("?room=12345", "") === "", "5 chiffres : refusé");
ok(I.parseInvite("?room=1234567", "") === "", "7 chiffres : refusé (pas de troncature silencieuse)");
ok(I.parseInvite("?room=abcdef", "") === "", "lettres : refusé");
ok(I.parseInvite("?room=123456<script>", "") === "123456", "le code est extrait, le reste est ignoré");
ok(I.parseInvite("?xroom=123456", "") === "", "« xroom » n'est pas « room »");
ok(I.parseInvite(undefined, null) === "" && I.parseInvite("", "") === "", "entrées vides");
ok(I.buildUrl("https://x.github.io/jeu/", "123456") === "https://x.github.io/jeu/?room=123456", "construction simple");
ok(I.buildUrl("https://x.github.io/jeu/?room=111111#a", "222222") === "https://x.github.io/jeu/?room=222222", "remplace l'ancien paramètre et l'ancre");
ok(I.buildUrl("https://x.github.io/jeu/", "12ab56") === "" && I.buildUrl("https://x.github.io/jeu/", "") === "" && I.buildUrl("", "123456") === "", "code ou adresse invalide : lien vide");
ok(I.parseInvite("?room=123456", "") === I.parseInvite(I.buildUrl("https://a/b/", "123456").slice(I.buildUrl("https://a/b/", "123456").indexOf("?")), ""), "aller-retour construction / lecture");

console.log("Invitation : " + (checks - fails) + " / " + checks + " OK" + (fails ? ", " + fails + " échec(s)" : ""));
process.exit(fails ? 1 : 0);
