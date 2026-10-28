/* Chat : les messages d'une seule lettre sont supprimés automatiquement. Lancer : node tests/chat.test.js */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../js/core/52-v7-chat.js"), "utf8");
const m = /function isOneLetterMsg\(text\)\{[\s\S]*?\n\}/.exec(src);
if (!m) { console.log("ÉCHEC : fonction isOneLetterMsg introuvable"); process.exit(1); }
const f = new Function(m[0] + "; return isOneLetterMsg;")();
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
["a", "K", " k ", "é", "ç", "5", "a !", "?a", "  a  ", "a.", "(a)", "… a …", "Z\n", "œ", "ß", "я", "あ"].forEach(x => t("supprimé : " + JSON.stringify(x), f(x) === true));
["ok", "si", "oui", "a b", "ab", "10", "👍", "k👍", "😀😀", "", "   ", "!!!", "?", "...", "a1", "lol", "Bonjour", "j'ai", "c'est", "a-b"].forEach(x => t("conservé : " + JSON.stringify(x), f(x) === false));
t("null / undefined sans plantage", f(null) === false && f(undefined) === false);
t("nombre accepté (non-chaîne)", f(7) === true && f(42) === false);
t("le relais de l'hôte filtre", /relayChat[\s\S]*?isOneLetterMsg\(check\.clean\)/.test(src));
t("l'envoi filtre avant tout", /isOneLetterMsg\(raw\)/.test(src));
t("les joueurs ignorent aussi (message reçu)", /else if\(!isOneLetterMsg\(data\.text\)\)\{\s*addChatMessage\(data\)/.test(src));
const v36 = fs.readFileSync(path.join(__dirname, "../js/patches/036-v36-chat.js"), "utf8");
t("v36 : le filtre commun rejette (why = oneletter)", /why:"oneletter"/.test(v36));
t("v36 : l'envoi vide le champ et prévient", /f\.why==="oneletter"\)\{clearInput\(\);warn\(ONE_LETTER_WARN\)/.test(v36));
t("v36 : le relais de l'hôte renvoie un rejet à l'expéditeur", /reject\(f\.why==="oneletter"\?ONE_LETTER_WARN/.test(v36));
t("v36 : un message forcé est supprimé à la réception", /strictCheck\(m\.text\)\|\|oneLetter\(m\.text\)/.test(v36));
t("v36 : la modification en une lettre est refusée", /f\.why==="oneletter"\?"✏️/.test(v36));
console.log("Chat : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
