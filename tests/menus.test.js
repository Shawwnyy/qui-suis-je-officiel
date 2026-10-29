/* 🏠 Ma salle · ⚙️ Réglages & aide · annonces d'arrivée / de départ (js/patches/048-v55-menus.js)   node tests/menus.test.js */
const M = require("../js/patches/048-v55-menus.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

/* ---- réglages ---- */
t("réglages par défaut : 100 %, animations normales, pastilles et annonces actives", JSON.stringify(M.cleanPrefs({})) === JSON.stringify({ scale: 100, calm: false, keys: true, notify: true }));
t("« moins d'animations » suit le système tant que l'utilisateur n'a pas choisi", M.cleanPrefs({}, true).calm === true && M.cleanPrefs({ calm: false }, true).calm === false && M.cleanPrefs({ calm: true }, false).calm === true);
t("taille bornée de 80 à 160 %, par pas de 5", M.cleanPrefs({ scale: 10 }).scale === 80 && M.cleanPrefs({ scale: 999 }).scale === 160 && M.cleanPrefs({ scale: 123 }).scale === 125 && M.cleanPrefs({ scale: 122 }).scale === 120 && M.cleanPrefs({ scale: 80 }).scale === 80 && M.cleanPrefs({ scale: 160 }).scale === 160);
t("taille absurde → 100 % (jamais 80 par accident : null, vide, liste, booléen)", [NaN, "abc", null, undefined, {}, [], "", true, false, Infinity, -Infinity].every(v => M.cleanPrefs({ scale: v }).scale === 100) && M.stepScale(null, 1) === 110 && M.stepScale([], -1) === 90);
t("booléens stricts : seul « true » active le mode calme, seul « false » coupe pastilles et annonces", M.cleanPrefs({ calm: "true" }).calm === false && M.cleanPrefs({ calm: 1 }).calm === false && M.cleanPrefs({ keys: 0 }).keys === true && M.cleanPrefs({ keys: false }).keys === false && M.cleanPrefs({ notify: "non" }).notify === true && M.cleanPrefs({ notify: false }).notify === false);
t("rien d'inconnu n'est gardé (champs en trop, __proto__)", Object.keys(M.cleanPrefs({ evil: 1, __proto__: { x: 1 }, scale: 100 })).sort().join() === "calm,keys,notify,scale" && Object.keys(M.cleanPrefs(JSON.parse('{"__proto__":{"scale":160},"x":1}'))).length === 4);
t("pas : +10 / −10, jamais en dehors des bornes", M.stepScale(100, 1) === 110 && M.stepScale(100, -1) === 90 && M.stepScale(160, 1) === 160 && M.stepScale(80, -1) === 80 && M.stepScale("x", 1) === 110 && M.stepScale(NaN, -1) === 90);
t("lecture du stockage : texte abîmé → réglages par défaut", ["", "{", "null", "[]", "5", "abc", undefined, null].every(x => JSON.stringify(M.parsePrefs(x)) === JSON.stringify(M.cleanPrefs({}))) && M.parsePrefs('{"scale":130,"calm":true}').scale === 130 && M.parsePrefs('{"scale":130,"calm":true}').calm === true);

/* ---- annonces ---- */
const P = (...names) => { const o = {}; names.forEach((n, i) => { o["id" + n] = { name: n }; }); return o; };
t("première photo : rien à annoncer", M.diff(null, P("A"), "idA") === null && M.describe(M.diff(null, P("A", "B"), "idA")) === "");
t("arrivée d'un joueur", M.describe(M.diff(M.snapshot(P("A")), P("A", "Bob"), "idA")) === "➕ Bob a rejoint la salle");
t("départ d'un joueur (le pseudo vient de la photo précédente)", M.describe(M.diff(M.snapshot(P("A", "Bob")), P("A"), "idA")) === "➖ Bob est parti");
t("deux arrivées, trois arrivées", M.describe(M.diff(M.snapshot(P("A")), P("A", "Bob", "Léa"), "idA")) === "➕ Bob et Léa ont rejoint la salle" && M.describe(M.diff(M.snapshot(P("A")), P("A", "B", "C", "D"), "idA")) === "➕ B, C et D ont rejoint la salle");
t("beaucoup d'arrivées : trois noms puis « et N autres »", M.describe(M.diff(M.snapshot(P("A")), P("A", "B", "C", "D", "E"), "idA")) === "➕ B, C, D et 1 autre ont rejoint la salle" && M.describe(M.diff(M.snapshot(P("A")), P("A", "B", "C", "D", "E", "F"), "idA")) === "➕ B, C, D et 2 autres ont rejoint la salle");
t("arrivée et départ ensemble", M.describe(M.diff(M.snapshot(P("A", "Bob")), P("A", "Léa"), "idA")) === "➕ Léa a rejoint la salle · ➖ Bob est parti");
t("soi-même n'est jamais annoncé (ni arrivée ni départ)", M.describe(M.diff(M.snapshot(P("A")), P("Bob"), "idA")) === "➕ Bob a rejoint la salle" && M.describe(M.diff(M.snapshot(P("A", "Bob")), P("Bob"), "idA")) === "");
t("aucun changement : rien", M.describe(M.diff(M.snapshot(P("A", "Bob")), P("A", "Bob"), "idA")) === "");
t("identifiant « __proto__ » ou « constructor » : traité comme un joueur normal, sans corrompre la photo", (() => { const pl = JSON.parse('{"idA":{"name":"A"},"__proto__":{"name":"Zed"},"constructor":{"name":"Cora"}}'); const snap = M.snapshot(pl); return Object.keys(snap).length === 3 && snap.__proto__ === "Zed" && M.describe(M.diff(M.snapshot(P("A")), pl, "idA")) === "➕ Zed et Cora ont rejoint la salle" && ({}).x === undefined && Object.prototype.hasOwnProperty.call(Object.prototype, "Zed") === false; })());
t("pseudo nettoyé : contrôle, sens de lecture, espaces, 24 caractères, vide → Joueur", M.snapshot({ a: { name: "  A‮b\u0000  c " }, b: { name: "x".repeat(40) }, c: { name: "   " }, d: null, e: {} }).a === "Ab c" && M.snapshot({ b: { name: "x".repeat(40) } }).b.length === 24 && M.snapshot({ c: { name: "  " } }).c === "Joueur" && M.snapshot({ d: null }).d === "Joueur" && M.snapshot({ e: {} }).e === "Joueur");
t("données invalides : pas d'erreur", M.snapshot(null) && Object.keys(M.snapshot(undefined)).length === 0 && Object.keys(M.snapshot("x")).length === 0 && M.rows(null, "x").length === 0 && M.rows("x", "x").length === 0);

/* ---- classement du panneau ---- */
const pl = { a: { name: "Ana", score: 300, avatar: "🦊", host: true }, b: { name: "Bob", score: 500, avatar: "🐸" }, c: { name: "Cléo", score: 300 }, d: { name: "Dan", score: 100, team: "Rouges" }, e: { name: "Eve", score: 500 } };
const R = M.rows(pl, "c");
t("tri par score décroissant, puis par nom", R.map(r => r.name).join() === "Bob,Eve,Ana,Cléo,Dan");
t("égalités = même rang (1, 1, 3, 3, 5)", R.map(r => r.rank).join() === "1,1,3,3,5");
t("hôte, équipe, « moi », avatar par défaut", R.find(r => r.name === "Ana").host === true && R.find(r => r.name === "Dan").team === "Rouges" && R.find(r => r.name === "Cléo").me === true && R.filter(r => r.me).length === 1 && R.find(r => r.name === "Cléo").avatar === "🎮");
t("score absurde → 0, arrondi, hôte strict", M.rows({ a: { name: "A", score: "abc" }, b: { name: "B", score: 12.6 }, c: { name: "C", score: 1, host: "true" } }, "").map(r => r.name + r.score + r.host).join() === "B13false,C1false,A0false");
t("avatar : deux symboles au plus, pas de balise (affiché avec textContent)", M.rows({ a: { name: "A", avatar: "<img src=x onerror=1>" } }, "")[0].avatar.length <= 4 && M.rows({ a: { name: "A", avatar: "🦊🐸🐼" } }, "")[0].avatar === "🦊🐸");

/* ---- le code : branchement et sécurité (relecture du source) ---- */
const src = rd("js/patches/048-v55-menus.js"), css = rd("css/v55.css"), html = rd("index.html"), core = rd("js/core/14-handle-data.js"), rooms = rd("js/patches/047-v54-salles.js");
t("aucun innerHTML : tout est écrit avec textContent / createTextNode", !/innerHTML|insertAdjacentHTML|document\.write/.test(src));
t("boutons 🏠 et ⚙️ ajoutés à la colonne de droite ; 🏠 seulement dans une salle", /dockButton\("dockRoom", "🏠"/.test(src) && /dockButton\("dockSet", "⚙️"/.test(src) && /r\.style\.display = inRoom \? "" : "none"/.test(src));
t("le panneau n'est reconstruit que si son contenu change (un clic ne tombe pas sur un bouton remplacé)", /sig !== S\.sig/.test(src));
t("expulsion : réservée à l'hôte, jamais soi-même ni l'hôte", /isHost && !r\.me && !r\.host/.test(src) && /kickPlayer\(r\.id\)/.test(src));
t("fermer la salle : confirmation avant d'agir", /openConfirm\("Fermer la salle \?"/.test(src));
t("annonces : réinitialisées hors salle et sur l'accueil, coupables dans les réglages", /!roomCode \|\| activeScreen\(\) === "homeScreen"/.test(src) && /S\.prefs\.notify/.test(src));
t("Échap ferme le panneau", /e\.key === "Escape" && S\.mode/.test(src));
t("réglages lus et écrits avec try/catch (stockage bloqué toléré) et bornés", /try \{ t = localStorage\.getItem\(KEY\)/.test(src) && /try \{ localStorage\.setItem\(KEY/.test(src) && /V55\.parsePrefs\(t, systemCalm\(\)\)/.test(src));
t("zoom appliqué aux écrans seulement (pas au dock ni aux panneaux), via variable CSS", /\.screen \{ zoom: var\(--v55-zoom, 1\); \}/.test(css) && !/#dock \{[^}]*zoom/.test(css));
t("mode calme : le flash vert / rouge devient un fondu, pas supprimé", /body\.v55-calm \.v50-flash \{ animation: v50-fade/.test(css) && /animation-iteration-count: 1 !important/.test(css));
t("pastilles de touches masquables", /body\.v55-nokeys button\.answer\[data-v53k\]::before \{ display: none/.test(css));
t("cases à cocher visibles malgré appearance:none du site", /\.v55-tg input \{[^}]*appearance: none/.test(css) && /\.v55-tg input:checked \{[^}]*background-image/.test(css));
t("colonne de boutons : sur écran bas, passe sur plusieurs colonnes au lieu de déborder", /max-height: 620px\) \{ #dock \{ flex-wrap: wrap-reverse/.test(css));
t("places illimitées : la limite de 8 du cœur est remplacée par celle des salles", /typeof window\.v54PlayerCap\s*===\s*"function"\s*\?\s*window\.v54PlayerCap\(\)\s*:\s*8/.test(core) && /window\.v54PlayerCap = function \(\) \{ return R\.HARD_CAP; \}/.test(rooms));
t("index.html : feuille v55 et script 048 après 047, avant le mode révision", html.includes("css/v55.css") && html.indexOf("047-v54-salles.js") < html.indexOf("048-v55-menus.js") && html.indexOf("048-v55-menus.js") < html.indexOf("review/review.js"));

console.log("Menus : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
