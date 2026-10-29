/* 🏠 Salles : nom, mot de passe, places, verrouillage, refus propres, identité (js/patches/047-v54-salles.js)   node tests/rooms.test.js */
const R = require("../js/patches/047-v54-salles.js");
const fs = require("fs"), path = require("path");
let ok = 0, bad = 0;
function t(label, cond) { if (cond) ok++; else { bad++; console.log("ÉCHEC :", label); } }
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const NOW = 1_700_000_000_000;
function st(o) { return Object.assign(R.newState(), o || {}); }
function join(s, o) { return R.decideJoin(s, Object.assign({ peer: "p1", count: 1, started: false, present: false, pass: "", nameCheck: { ok: true }, now: NOW }, o || {})); }

/* ---- nom de salle ---- */
t("nom : espaces compactés et rognés", R.cleanName("  Les   Quizzeurs  ") === "Les Quizzeurs");
t("nom : 24 caractères au plus", R.cleanName("x".repeat(40)).length === 24 && R.cleanName("é".repeat(30)).length === 24);
t("nom : un émoji (2 unités) n'est pas coupé en deux", Array.from(R.cleanName("😀".repeat(30))).length === 24 && !/[\ud800-\udbff]$/.test(R.cleanName("😀".repeat(30))));
t("nom : caractères de contrôle et sens de lecture (RLO) retirés", R.cleanName("a\u202eb\u0000c\u200bd\n e") === "abcd e");
t("nom : vide → valeur de repli", R.cleanName("   ", "Salle") === "Salle" && R.cleanName(null, "S") === "S" && R.cleanName(undefined) === "");
t("nom : pas de HTML interprété ici (le texte brut est gardé, l'interface utilise textContent)", R.cleanName("<b>x</b>") === "<b>x</b>");
/* ---- mot de passe ---- */
t("mot de passe : vide = salle publique", R.checkPass("").ok && R.checkPass("   ").pass === "" && R.checkPass(null).pass === "");
t("mot de passe : 4 à 16 caractères", R.checkPass("abcd").ok && R.checkPass("a".repeat(16)).ok && !R.checkPass("abc").ok && !R.checkPass("a".repeat(17)).ok);
t("mot de passe : espaces autour retirés, espaces au milieu gardés", R.checkPass("  ab cd  ").pass === "ab cd");
t("mot de passe : message d'erreur utile", /4 à 16/.test(R.checkPass("ab").error));
t("mot de passe : contrôle retiré", R.checkPass("ab\u0007cdef").pass === "abcdef");
/* ---- places ---- */
t("places : de 1 (solo) à 100", R.clampMax(5, 1) === 5 && R.clampMax(1, 1) === 1 && R.clampMax(99, 1) === 99 && R.clampMax(100, 1) === 100 && R.clampMax(101, 1) === 100 && R.clampMax(5000, 1) === 100 && R.clampMax(-3, 0) === 1 && R.clampMax(0.5, 0) === 1);
t("places : jamais sous le nombre de joueurs déjà là", R.clampMax(2, 5) === 5 && R.clampMax(3, 8) === 8 && R.clampMax(2, 99) === 99 && R.clampMax(2, 250) === 100 && R.clampMax(1, 1) === 1);
t("places : illimité = 0, accepté sous toutes ses écritures (0, ∞, inf, illimité, Infinity)", [0, "0", "∞", "inf", "INF", "infini", "illimité", "illimites", " 0 ", Infinity].every(x => R.clampMax(x, 3) === 0));
t("places : champ vide, texte ou rien → 8 par défaut ; « 00 » → 1 (jamais illimité par accident)", R.clampMax("", 1) === 8 && R.clampMax("10x", 1) === 8 && R.clampMax(null, 1) === 8 && R.clampMax(undefined, 1) === 8 && R.clampMax("00", 1) === 1 && R.clampMax("12", 1) === 12 && R.clampMax(-Infinity, 1) === 8);
t("places : limite réelle — illimité = plafond de 100, valeur absurde = 8", R.limit(0) === 100 && R.limit(1) === 1 && R.limit(7) === 7 && R.limit(100) === 100 && R.limit(500) === 100 && R.limit("x") === 8 && R.limit(NaN) === 8 && R.limit(-2) === 8 && R.limit(undefined) === 8);
t("places : complète ? (isFull)", R.isFull(1, 1) && !R.isFull(1, 0) && R.isFull(8, 8) && !R.isFull(8, 7) && !R.isFull(0, 99) && R.isFull(0, 100) && R.isFull(0, 500));
t("places : valeurs absurdes → 8", R.clampMax("abc", 1) === 8 && R.clampMax(NaN, 1) === 8 && R.clampMax(undefined, 1) === 8 && R.clampMax("6", 1) === 6 && R.clampMax(4.9, 1) === 4);
/* ---- comparaison ---- */
t("safeEq : égalité stricte, longueurs différentes, types bizarres", R.safeEq("abc", "abc") && !R.safeEq("abc", "abd") && !R.safeEq("abc", "abcd") && !R.safeEq("abcd", "abc") && !R.safeEq("", "a") && R.safeEq("", "") && R.safeEq(null, "") && !R.safeEq("x", undefined));
/* ---- identifiants ---- */
t("identifiants : clés réservées et vides refusées", ["__proto__", "constructor", "prototype", "toString", "valueOf", "hasOwnProperty", "CONSTRUCTOR", "x__proto__y", "", 5, null, {}, "x".repeat(81)].every(i => !R.validId(i)) && R.validId("abc-123") && R.validId("quiz-123456"));
/* ---- décision de rejoindre ---- */
t("salle publique : accepté", join(st()).ok === true);
t("salle fermée : refus", (d => !d.ok && d.reason === "closed")(join(st({ closed: true }))));
t("partie commencée : refus", (d => !d.ok && d.reason === "started" && /commencé/.test(d.message))(join(st(), { started: true })));
t("verrouillée : refus", (d => !d.ok && d.reason === "locked" && /verrouillé/.test(d.message))(join(st({ locked: true }))));
t("pleine : refus à max, accepté à max-1", (d => !d.ok && d.reason === "full")(join(st({ max: 3 }), { count: 3 })) && join(st({ max: 3 }), { count: 2 }).ok);
t("pleine : plafond de 100 même si l'état dit plus, 8 si l'état n'a pas de nombre, illimité jusqu'à 100", !join(st({ max: 500 }), { count: 100 }).ok && join(st({ max: 500 }), { count: 99 }).ok && !join(st({ max: "x" }), { count: 8 }).ok && join(st({ max: "x" }), { count: 7 }).ok && join(st({ max: 0 }), { count: 99 }).ok && !join(st({ max: 0 }), { count: 100 }).ok);
t("partie solo (1 place) : personne ne peut rejoindre", (d => !d.ok && d.reason === "full")(join(st({ max: 1 }), { count: 1 })));
t("déjà présent : ignoré sans bruit (pas de remise à zéro du score)", (d => !d.ok && d.silent === true && d.reason === "dup")(join(st(), { present: true })));
t("identifiant réservé : refus", (d => !d.ok && d.reason === "id")(join(st(), { peer: "__proto__" })) && !join(st(), { peer: "constructor" }).ok && !join(st(), { peer: 42 }).ok);
t("pseudo refusé : message du contrôle de pseudo", (d => !d.ok && d.reason === "name" && d.message === "Trop court")(join(st(), { nameCheck: { ok: false, error: "Trop court" } })));
t("ordre : fermée avant verrouillée avant pleine", join(st({ closed: true, locked: true, max: 2 }), { count: 2 }).reason === "closed" && join(st({ locked: true, max: 2 }), { count: 2 }).reason === "locked" && join(st({ max: 2 }), { count: 2, started: true }).reason === "started");
/* ---- mot de passe à l'entrée ---- */
const priv = () => st({ pass: "secret1" });
t("privée sans mot de passe : demande du mot de passe (pas un essai raté)", (s => { const d = join(s, { pass: "" }); return !d.ok && d.reason === "password" && s.fails.length === 0; })(priv()));
t("privée, mauvais mot de passe : refus + essai compté", (s => { const d = join(s, { pass: "faux" }); return !d.ok && d.reason === "badpass" && s.fails.length === 1; })(priv()));
t("privée, bon mot de passe : accepté", join(priv(), { pass: "secret1" }).ok);
t("mot de passe sensible à la casse et aux espaces", !join(priv(), { pass: "SECRET1" }).ok && !join(priv(), { pass: "secret1 " }).ok && !join(priv(), { pass: " secret1" }).ok);
t("mot de passe de type inattendu : refus sans erreur", !join(priv(), { pass: 12345 }).ok && !join(priv(), { pass: { a: 1 } }).ok && !join(priv(), { pass: ["secret1"] }).ok);
t("mot de passe numérique forgé (12345 au lieu de \"12345\") refusé", !join(st({ pass: "12345" }), { pass: 12345 }).ok && join(st({ pass: "12345" }), { pass: "12345" }).ok && (s => { join(s, { pass: 12345 }); return s.fails.length === 1; })(st({ pass: "12345" })));
t("salle pleine + privée + sans mot de passe : « pleine » (rien de plus révélé)", join(st({ pass: "secret1", max: 2 }), { count: 2, pass: "" }).reason === "full");
t("le mot de passe n'ouvre pas une salle verrouillée ni commencée", join(st({ pass: "secret1", locked: true }), { pass: "secret1" }).reason === "locked" && join(st({ pass: "secret1" }), { pass: "secret1", started: true }).reason === "started");
t("limite d'essais : 6 mauvais en 60 s bloquent, même avec le bon mot de passe", (s => { for (let i = 0; i < R.FAIL_LIMIT; i++) join(s, { pass: "faux" + i, now: NOW + i * 1000 }); const d = join(s, { pass: "secret1", now: NOW + 7000 }); return !d.ok && d.reason === "throttle" && /\d+ s/.test(d.message); })(priv()));
t("limite d'essais : 5 mauvais ne bloquent pas", (s => { for (let i = 0; i < R.FAIL_LIMIT - 1; i++) join(s, { pass: "faux" + i, now: NOW + i * 1000 }); return join(s, { pass: "secret1", now: NOW + 6000 }).ok; })(priv()));
t("limite d'essais : levée après 60 s, temps restant annoncé", (s => { for (let i = 0; i < R.FAIL_LIMIT; i++) join(s, { pass: "faux", now: NOW }); const w = R.retryIn(s, NOW + 10000); return w === 50 && R.retryIn(s, NOW + 60000) === 0 && join(s, { pass: "secret1", now: NOW + 60001 }).ok; })(priv()));
t("limite d'essais : le délai restant est dans le message", (s => { for (let i = 0; i < R.FAIL_LIMIT; i++) join(s, { pass: "faux", now: NOW }); return /50 s/.test(join(s, { pass: "secret1", now: NOW + 10000 }).message); })(priv()));
t("horloge qui recule : les essais futurs ne bloquent pas indéfiniment", (s => { s.fails = Array(10).fill(NOW + 3600000); return R.retryIn(s, NOW) === 0; })(priv()));
/* ---- infos publiques ---- */
t("infos publiques : jamais le mot de passe", (i => !("pass" in i) && !JSON.stringify(i).includes("secret1") && i.priv === true && i.count === 3 && i.max === 6 && i.name === "Salle de Léa")(R.info(st({ pass: "secret1", max: 6 }), 3, "Salle de Léa")));
t("infos : nom choisi prioritaire, sinon repli", R.info(st({ name: "Mon nom" }), 1, "x").name === "Mon nom" && R.info(st(), 1, "Salle de X").name === "Salle de X" && R.info(st(), 1).name === "Salle");
t("badges : places, privée/publique, verrouillée/complète", R.badges({ count: 3, max: 8, priv: true, locked: false }).join("|") === "👥 3/8|🔒 privée" && R.badges({ count: 3, max: 8, priv: false, locked: true }).join("|") === "👥 3/8|🌐 publique|⛔ verrouillée" && R.badges({ count: 4, max: 4, priv: false, locked: false }).includes("🈵 complète") && R.badges({ count: 40, max: 0, priv: false, locked: false }).join("|") === "👥 40/∞|🌐 publique" && R.badges(null).length === 0);
/* ---- données reçues (invité) ---- */
t("infos reçues : valeurs aberrantes ramenées", (i => i.max === 100 && i.count === 100 && i.locked === false && i.priv === false && i.name === "Salle")(R.sanitizeInfo({ max: 999, count: 999, locked: "oui", priv: 1, name: "   " })));
t("infos reçues : illimité (0) conservé, négatif → 1, absent → 8", R.sanitizeInfo({ max: 0 }).max === 0 && R.sanitizeInfo({ max: -4 }).max === 1 && R.sanitizeInfo({}).max === 8 && R.sanitizeInfo({ max: "abc" }).max === 8);
t("infos reçues : nom nettoyé, nombres bornés", (i => i.name === "ab" && i.max === 1 && i.count === 0)(R.sanitizeInfo({ name: "a\u202eb", max: -4, count: -2, locked: false, priv: false })));
t("infos reçues : pas un objet → null", R.sanitizeInfo(null) === null && R.sanitizeInfo("x") === null && R.sanitizeInfo(5) === null && R.sanitizeInfo(undefined) === null);
t("infos reçues : booléens stricts", R.sanitizeInfo({ locked: true, priv: true }).locked === true && R.sanitizeInfo({ locked: "true", priv: "true" }).priv === false);
t("refus reçu : raison inconnue → unknown, texte nettoyé et borné", (r => r.reason === "unknown" && r.message.length <= 140 && !/\u0000/.test(r.message))(R.sanitizeRefuse({ reason: "<script>", message: "a\u0000".repeat(300) })));
t("refus reçu : « dup » n'est jamais montré, message vide → texte par défaut", R.sanitizeRefuse({ reason: "dup" }).reason === "unknown" && R.sanitizeRefuse({ reason: "full" }).message === "La salle est pleine." && R.sanitizeRefuse(null).reason === "unknown");
t("refus reçu : priv strict", R.sanitizeRefuse({ reason: "password", priv: true }).priv === true && R.sanitizeRefuse({ reason: "password", priv: "1" }).priv === false);
/* ---- dernière salle ---- */
t("dernière salle : code à 6 chiffres obligatoire, jamais de mot de passe", R.packLast({ code: "12345" }) === null && R.packLast(null) === null && (p => p.code === "123456" && !("pass" in p) && p.name === "Salle" && p.max === 4 && p.host === "Léa")(R.packLast({ code: "123456", name: "Salle", max: 4, host: "Léa", pass: "x" }, NOW)));
t("dernière salle : relue si récente (3 h), sinon oubliée", R.readLast(JSON.stringify(R.packLast({ code: "123456", name: "S", max: 4 }, NOW)), NOW + 3600000) !== null && R.readLast(JSON.stringify(R.packLast({ code: "123456" }, NOW)), NOW + 3 * 3600 * 1000 + 1) === null && R.readLast(JSON.stringify(R.packLast({ code: "123456" }, NOW)), NOW + 3 * 3600 * 1000) !== null);
t("dernière salle : données abîmées ou truquées → null", ["", "{", "null", "[]", "5", '{"code":"abc","at":1}', '{"code":"123456"}', '{"code":"123456","at":"x"}'].every(r => R.readLast(r, NOW) === null) && R.readLast(undefined, NOW) === null && R.readLast(JSON.stringify({ code: "123456", at: NOW + 3600000 }), NOW) === null);
t("dernière salle : nom et places relus avec les mêmes limites (illimité conservé)", (l => l.name.length === 24 && l.max === 100)(R.readLast(JSON.stringify({ code: "123456", name: "x".repeat(99), max: 999, at: NOW }), NOW)) && R.readLast(JSON.stringify({ code: "123456", max: 0, at: NOW }), NOW).max === 0);

/* ---- le code : branchement, identité, refus propres (relecture du source) ---- */
const src = rd("js/patches/047-v54-salles.js"), css = rd("css/v54.css"), html = rd("index.html"), rules = rd("js/core/56-v7-chat-a-droite-regles-a-accepter-compte-a-.js");
t("identité : tout « playerId » reçu d'un invité est remplacé par celui de la connexion (écouteur posé avant le traitement)", /connection\.on\("data", function \(d\) \{[\s\S]{0,200}d\.__from = peerId;[\s\S]{0,80}d\.playerId = peerId/.test(src) && src.indexOf('connection.on("data"') < src.indexOf("return baseSetup(connection)"));
t("identité : seulement côté hôte", /if \(isHost\) \{\s*var peerId = String\(connection\.peer\);/.test(src));
t("fiche du joueur reconstruite par l'hôte (pas de host:true, rulesOk ou score envoyés par l'invité)", /var fresh = createPlayer\(from, str\(pl\.name\), false\);\s*data\.player = fresh;/.test(src));
t("le mot de passe est retiré du message avant le traitement et n'est jamais diffusé", /delete data\.pass;/.test(src) && !/broadcast\([^)]*pass/.test(src.replace(/S\.st\.pass/g, "")) && !/pass: S\.st\.pass/.test(src));
t("refus : message puis déconnexion réelle, et la connexion est retirée tout de suite", /type: "v54Refuse"/.test(src) && /if \(c\) delete connections\[peerId\];/.test(src) && /c\.close\(\)/.test(src));
t("connexion sans « join » fermée au bout de 8 s", /connections\[peerId\] === connection && !has\(players, peerId\)/.test(src) && /, 8000\)/.test(src));
t("invité : le refus n'écrase pas l'écoute (écouteurs « close » et « data » retirés avant la remise à zéro)", /removeAllListeners\("close"\);\s*c\.removeAllListeners\("data"\)/.test(src));
t("invité : plus de alert() bloquante pour un refus (message sur l'accueil)", /showMessage\("homeMessage", msg/.test(src) && !/\balert\(/.test(src));
t("invité : l'ancien message « error » est traité comme un refus tant qu'on n'est pas dans la salle", /t === "error" && typeof data\.message === "string" && !has\(players, myId\)/.test(src));
t("invité : le mot de passe part dans « join » seulement", /d\.type === "join" && S\.pass/.test(src));
t("délai de connexion de 15 s (« l'hôte ne répond pas »)", /\}, 15000\);/.test(src) && /L'hôte ne répond pas/.test(src));
t("hôte disparu en pleine partie : message + bouton, pas pour un départ volontaire ni les résultats", /S\.closing \|\| S\.refused \|\| S\.gone \|\| kicked \|\| !peer/.test(src) && /resultsScreen/.test(src) && /Retour à l'accueil/.test(src));
t("fermeture : prévient les invités puis détruit la connexion", /type: "v54Closed"/.test(src) && /setTimeout\(function \(\) \{[\s\S]{0,160}resetConnection\(\)/.test(src));
t("« Rejouer » de l'hôte prévient les invités", /type: "v54Reopen"/.test(src) && /window\.replayV9 = function/.test(src));
t("réouverture : même code via randomCode, jamais de mot de passe enregistré", /S\.forceCode/.test(src) && !/safeStore\(LAST_KEY[^)]*pass/.test(src));
t("la carte de l'hôte est retirée à la remise à zéro et à la création (pas de réglages périmés affichés)", /var card = \$\("v54Room"\); if \(card && card\.parentNode\) card\.parentNode\.removeChild\(card\)/.test(src) && /var oldCard = \$\("v54Room"\)/.test(src));
t("textes de l'invité affichés avec textContent (pas d'innerHTML)", !/innerHTML/.test(src));
t("règles : les invités reçoivent l'état d'acceptation et la renvoient seuls si l'hôte l'a perdu", /out\[id\]\.rulesOk = p\.rulesOk === true/.test(src) && /me\.rulesOk === false/.test(src) && /ont accepté/.test(rules));
t("règles : le compteur n'est pas faussé par les clés héritées (hasOwn)", /!has\(players, myId\)/.test(src));
t("index.html : feuille v54 et script 047 après 046, avant le mode révision", html.includes("css/v54.css") && html.indexOf("046-v53-raccourcis.js") < html.indexOf("047-v54-salles.js") && html.indexOf("047-v54-salles.js") < html.indexOf("review/review.js"));
t("CSS : carte, fenêtre « hôte parti » au-dessus de tout", /\.v54-card/.test(css) && /\.v54-gone \{[^}]*z-index: 2600/.test(css));

console.log("Salles : " + ok + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
