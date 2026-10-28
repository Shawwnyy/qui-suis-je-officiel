/* Filigrane « qui-suis-je-officiel » sur les images de graphiques copiées / téléchargées. Lancer : node tests/watermark.test.js */
const fs = require("fs"), path = require("path");
const V = require("../js/stats/charts.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }

/* Faux contexte 2D : enregistre les textes dessinés, avec l'opacité, l'alignement et la rotation en vigueur */
function fakeCtx() {
  const st = { globalAlpha: 1, textAlign: "left", textBaseline: "alphabetic", font: "", fillStyle: "", strokeStyle: "", lineWidth: 1 };
  const stack = [], texts = [], ops = [];
  let rot = 0, clip = null, rect = null;
  const ctx = {
    get globalAlpha() { return st.globalAlpha; }, set globalAlpha(v) { st.globalAlpha = v; },
    get textAlign() { return st.textAlign; }, set textAlign(v) { st.textAlign = v; },
    get textBaseline() { return st.textBaseline; }, set textBaseline(v) { st.textBaseline = v; },
    get font() { return st.font; }, set font(v) { st.font = v; },
    get fillStyle() { return st.fillStyle; }, set fillStyle(v) { st.fillStyle = v; },
    get strokeStyle() { return st.strokeStyle; }, set strokeStyle(v) { st.strokeStyle = v; },
    get lineWidth() { return st.lineWidth; }, set lineWidth(v) { st.lineWidth = v; },
    save() { stack.push({ s: Object.assign({}, st), rot: rot, clip: clip }); ops.push("save"); },
    restore() { const p = stack.pop(); Object.assign(st, p.s); rot = p.rot; clip = p.clip; ops.push("restore"); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() { ops.push("stroke"); },
    rect(x, y, w, h) { rect = [x, y, w, h]; }, clip() { clip = rect; },
    translate() {}, rotate(a) { rot += a; },
    measureText(s) { return { width: String(s).length * 10 }; },
    fillText(s, x, y) { texts.push({ s: s, x: x, y: y, alpha: st.globalAlpha, align: st.textAlign, rot: rot, clip: clip, font: st.font }); }
  };
  return { ctx: ctx, texts: texts, ops: ops, depth: function () { return stack.length; } };
}

t("la marque est « qui-suis-je-officiel »", V.BRAND === "qui-suis-je-officiel");

const W = 640, H = 420;
const f = fakeCtx();
V.watermark(f.ctx, W, H, "Arial");
const marks = f.texts.filter(function (x) { return x.s === V.BRAND; });
t("uniquement la marque est écrite", f.texts.length === marks.length && marks.length > 0);
t("save / restore équilibrés (le reste du dessin n'est pas perturbé)", f.depth() === 0);

const sig = marks.filter(function (x) { return x.alpha === 1; });
const pattern = marks.filter(function (x) { return x.alpha < 1; });
t("une signature lisible (opacité pleine), une seule", sig.length === 1);
t("signature en bas à droite, dans la bande du pied d'image", sig[0].align === "right" && sig[0].x <= W && sig[0].x >= W - 40 && sig[0].y > H - V.FOOT && sig[0].y <= H);
t("signature non tournée", sig[0].rot === 0);
t("motif diagonal : plusieurs répétitions", pattern.length >= 10);
t("motif très discret (opacité ≤ 10 %) mais visible (≥ 3 %)", pattern.every(function (x) { return x.alpha <= 0.1 && x.alpha >= 0.03; }));
t("motif incliné", pattern.every(function (x) { return Math.abs(x.rot) > 0.1 && Math.abs(x.rot) < 0.6; }));
t("motif rogné au-dessus du pied d'image (la signature reste nette)", pattern.every(function (x) { return x.clip && x.clip[0] === 0 && x.clip[1] === 0 && x.clip[2] === W && x.clip[3] === H - V.FOOT; }));
t("motif réparti sur toute la largeur (positions variées)", new Set(pattern.map(function (x) { return Math.round(x.x); })).size > 3);

/* petite et grande image : toujours au moins la signature + un motif */
[[320, 200], [1400, 900]].forEach(function (d) {
  const g = fakeCtx(); V.watermark(g.ctx, d[0], d[1]);
  t("taille " + d.join("×") + " : signature + motif", g.texts.length > 5 && g.texts.filter(function (x) { return x.alpha === 1; }).length === 1 && g.depth() === 0);
});

/* le dessin de la carte réserve la place du pied d'image et appelle le filigrane (copie ET téléchargement passent par cardCanvas) */
const src = fs.readFileSync(path.join(__dirname, "../js/stats/charts.js"), "utf8");
t("cardCanvas : hauteur augmentée de FOOT (seulement avec filigrane)", /var H = y0 \+ legH .*\+ pad - 2 \+ \(withMark \? FOOT : 0\);/.test(src));
t("cardCanvas : watermark appelé avant de rendre le canvas", /if \(withMark\) watermark\(ctx, W, H, fam\);\s*return cv;/.test(src));
t("« Copier l'image » et « PNG » utilisent cardCanvas", /var blobP = cardCanvas\(node,/.test(src) && /bSave\.addEventListener\("click", function \(\) \{\s*cardCanvas\(node,/.test(src));
t("aucun autre export d'image de graphique (toBlob / toDataURL) hors canvasBlob", (src.match(/toBlob|toDataURL/g) || []).length === 1);

/* ---------- Qui peut retirer le filigrane ? seulement l'hôte de la partie affichée ---------- */
const store = {};
global.window = { localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } } };

t("sans règle : filigrane forcé", V.markOn() === true && V.canSkipMark() === false);
V.setMarkGate(function () { return false; });
t("joueur (règle = non) : filigrane forcé", V.markOn() === true);
V.setNoMarkPref(true);
t("joueur : même avec la préférence « sans filigrane » enregistrée, filigrane forcé", V.markOn() === true && V.canSkipMark() === false);
V.setMarkGate(function () { throw new Error("boum"); });
t("règle qui plante : filigrane forcé", V.markOn() === true && V.canSkipMark() === false);
V.setMarkGate(function () { return 1; });
t("règle qui renvoie autre chose que true : filigrane forcé", V.markOn() === true);
V.setMarkGate(function () { return "true"; });
t("règle qui renvoie du texte : filigrane forcé", V.markOn() === true);
V.setMarkGate(42);
t("règle invalide : filigrane forcé", V.markOn() === true);

V.setMarkGate(function () { return true; });
t("hôte : sans filigrane par défaut (aucune préférence enregistrée)", (delete store.quizV40NoMark, V.noMarkPref() === true && V.markOn() === false));
V.setNoMarkPref(false);
t("hôte : peut choisir de garder le filigrane", V.markOn() === true && store.quizV40NoMark === "0");
V.setNoMarkPref(true);
t("hôte : peut choisir de le retirer", V.markOn() === false && store.quizV40NoMark === "1");
store.quizV40NoMark = "n'importe quoi";
t("préférence illisible : valeur par défaut (sans filigrane pour l'hôte)", V.noMarkPref() === true);
const saved = global.window.localStorage; global.window.localStorage = { getItem: function () { throw new Error("bloqué"); }, setItem: function () { throw new Error("bloqué"); } };
V.setNoMarkPref(false);
t("stockage bloqué : le choix de l'hôte est gardé en mémoire", V.noMarkPref() === false && V.markOn() === true);
global.window.localStorage = saved; V.setNoMarkPref(true);

/* la règle est relue à chaque copie : si l'hôte change de partie affichée, la décision change */
let hosted = true;
V.setMarkGate(function () { return hosted; });
t("règle relue à chaque fois (partie dont je suis l'hôte)", V.markOn() === false);
hosted = false;
t("règle relue à chaque fois (partie reçue d'un autre hôte)", V.markOn() === true);

/* code : le filigrane est le comportement par défaut de cardCanvas ; copie et PNG décident via markOn() */
t("cardCanvas : filigrane sauf si opts.mark === false", /var withMark = !\(opts && opts\.mark === false\);/.test(src));
t("copie : décision prise par markOn()", /cardCanvas\(node, \{ mark: markOn\(\) \}\)\.then\(canvasBlob\);/.test(src));
t("PNG : décision prise par markOn()", /cardCanvas\(node, \{ mark: markOn\(\) \}\)\.then\(canvasBlob\)\.then\(function \(b\) \{ saveBlob/.test(src));
t("aucun appel cardCanvas(…, {mark:false}) en dur", !/mark: false/.test(src));
t("bouton « sans filigrane » caché si l'utilisateur n'est pas l'hôte", /bMark\.style\.display = isImage && canSkipMark\(\) \? "" : "none"/.test(src));
t("clic sur le bouton ignoré si l'utilisateur n'est pas l'hôte", /bMark\.addEventListener\("click", function \(\) \{\s*if \(!canSkipMark\(\)\) return;/.test(src));
const st = fs.readFileSync(path.join(__dirname, "../js/stats/stats.js"), "utf8");
t("stats.js : l'hôte note sa partie au lancement (beginLog)", /function beginLog\(\) \{[\s\S]*?rememberHosted\(live\.id\);/.test(st));
t("stats.js : rememberHosted n'est appelé qu'à un seul endroit (jamais pour une partie reçue)", (st.match(/rememberHosted\(/g) || []).length === 2);   /* définition + beginLog */
t("stats.js : iHosted exige un identifiant de partie présent dans la liste de CET appareil", /function iHosted\(log\) \{ return !!log && typeof log\.id === "string" && \(hostedMem\[log\.id\] === 1 \|\| hostedIds\(\)\.indexOf\(log\.id\) >= 0\); \}/.test(st));
t("stats.js : règle = partie affichée dont cet appareil a été l'hôte", /K\.setMarkGate\(function \(\) \{ return iHosted\(currentLog\(\)\); \}\);/.test(st));
t("stats.js : beginLog n'est appelé que côté hôte", /if \(isHost && data && typeof data === "object"\) \{\s*if \(data\.type === "gameStart"\) \{ try \{ beginLog\(\)/.test(st));

console.log("Filigrane : " + ok + " OK, " + ko + " échec(s)");
process.exit(ko ? 1 : 0);
