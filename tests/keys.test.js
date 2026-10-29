/* ⌨️ Raccourcis clavier de réponse (js/patches/046-v53-raccourcis.js)   node tests/keys.test.js */
const K = require("../js/patches/046-v53-raccourcis.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
t("chiffres de la rangée du haut : 1 à 4 → réponses 0 à 3", [1, 2, 3, 4].map(n => K.choice(String(n), "Digit" + n)).join() === "0,1,2,3");
t("pavé numérique : 1 à 4", [1, 2, 3, 4].map(n => K.choice(String(n), "Numpad" + n)).join() === "0,1,2,3");
t("clavier AZERTY sans Maj (la touche 1 donne « & ») : le code de touche est utilisé", K.choice("&", "Digit1") === 0 && K.choice("é", "Digit2") === 1 && K.choice('"', "Digit3") === 2 && K.choice("'", "Digit4") === 3);
t("lettres a b c d, majuscules comprises", ["a", "b", "c", "d"].map(k => K.choice(k, "Key" + k.toUpperCase())).join() === "0,1,2,3" && ["A", "B", "C", "D"].map(k => K.choice(k, "KeyX")).join() === "0,1,2,3");
t("autres touches ignorées : 0, 5, 9, e, z, Entrée, Espace, flèches, vide, rien", ["Digit0", "Digit5", "Digit9", "Numpad0", "Numpad5"].every(c => K.choice("x", c) === -1) && ["e", "z", "Enter", " ", "ArrowUp", "Escape", "Tab", "", "ab", "11"].every(k => K.choice(k, "") === -1) && K.choice() === -1 && K.choice(null, null) === -1 && K.choice(5, 5) === -1);
t("pas de faux positif : Digit12, XDigit1, Numpad10", K.choice("x", "Digit12") === -1 && K.choice("x", "XDigit1") === -1 && K.choice("x", "Numpad10") === -1);
t("écriture dans un champ : champ texte, zone de texte, liste, élément éditable", K.typing("INPUT", false) && K.typing("textarea", false) && K.typing("SELECT", false) && K.typing("DIV", true) && !K.typing("DIV", false) && !K.typing("BUTTON", false) && !K.typing(undefined, undefined) && !K.typing("BODY", false));
const src = rd("js/patches/046-v53-raccourcis.js"), css = rd("css/v53.css"), html = rd("index.html");
t("ignoré avec Ctrl, ⌘, Alt, touche répétée ou événement déjà traité", /e\.defaultPrevented \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey \|\| e\.repeat/.test(src));
t("ignoré quand une fenêtre est ouverte (.modal.show) ou les statistiques", /\.modal\.show/.test(src) && /v40s-lock/.test(src));
t("seulement pendant la partie : écran de jeu actif, bouton visible et non désactivé", /gameScreen/.test(src) && /classList\.contains\("active"\)/.test(src) && /b\.disabled \|\| b\.offsetParent === null/.test(src));
t("le texte des boutons n'est pas modifié (pastille en CSS via data-v53k), masquée sur écran tactile", /data-v53k/.test(src) && !/textContent|innerHTML|appendChild/.test(src) && /content: attr\(data-v53k\)/.test(css) && /hover: none/.test(css));
t("index.html : script 046 après 045 et avant le mode révision", html.indexOf("045-v53-sondage.js") < html.indexOf("046-v53-raccourcis.js") && html.indexOf("046-v53-raccourcis.js") < html.indexOf("review/review.js"));
console.log("Raccourcis clavier : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
