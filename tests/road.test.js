/* Cohérence des questions « Code de la route en images » : la bonne réponse est recalculée en LISANT le SVG dessiné.
   node tests/road.test.js [nombre de lots] */
global.QMedia = require("../js/media/media.js");
const R = require("../js/data/road-questions.js");
const BATCHES = Number(process.argv[2]) || 25;
let n = 0, bad = 0; const kinds = {};
function fail(q, why) { bad++; if (bad <= 15) console.log("ÉCHEC", why, "|", q.question, "|", q.answers[0]); }
const ids = {}; R.SIGNS.forEach(s => { ids[s.id] = s; });
const signOf = id => ids[id] || (/^vitesse-(\d+)$/.test(id) ? { id, name: "Limitation de vitesse à " + RegExp.$1 + " km/h", cat: "interdiction", shape: "rond", speed: +RegExp.$1 } : null);
const RIGHT = { S: "E", E: "N", N: "W", W: "S" };                       /* table réécrite ici, indépendante du module */
const SPEED = { autoroute: { sec: 130, pluie: 110 }, chaussees: { sec: 110, pluie: 100 }, ville: { sec: 50, pluie: 50 } };
const CATNAME = { danger: "Un panneau de danger", interdiction: "Un panneau d'interdiction", obligation: "Un panneau d'obligation", indication: "Un panneau d'indication", priorite: "Un panneau de priorité" };
const SHAPENAME = { tri: "Un triangle, pointe en haut", triInv: "Un triangle, pointe en bas", rond: "Un rond", octo: "Un octogone", losange: "Un losange", carre: "Un carré", rect: "Un rectangle", croix: "Une croix en X" };
const LIGHT = { rouge: "S'arrêter", orange: "S'arrêter, sauf si l'arrêt est dangereux", vert: "Passer en restant vigilant" };
function inc(k) { kinds[k] = (kinds[k] || 0) + 1; }
function vehicles(svg) { return [...svg.matchAll(/<g data-v="([^"]+)" data-arm="([A-Z])"(?: data-turn="(\w+)")?/g)].map(m => ({ c: m[1], arm: m[2], turn: m[3] })); }
function signsOnArms(svg) { return [...svg.matchAll(/<g data-sign="([^"]+)" data-arm="([A-Z])"/g)].map(m => ({ id: m[1], arm: m[2] })); }
for (let b = 0; b < BATCHES; b++) {
  R.build().forEach(q => {
    n++;
    const svg = q.media.svg, a = q.answers[0];
    if (new Set(q.answers).size !== 4 || q.correct !== 0) return fail(q, "réponses");
    if (!QMedia.cleanSvg(svg)) return fail(q, "SVG refusé par QMedia");
    if (svg.length > 30000) return fail(q, "SVG trop long");
    const k = q.kind; inc(k);
    if (k === "signe" || k === "famille" || k === "forme" || k === "vitesse" || k === "action") {
      const id = (/<g data-sign="([^"]+)"/.exec(svg) || [])[1], s = signOf(id);
      if (!s) return fail(q, "panneau inconnu " + id);
      if (k === "signe" && a !== s.name) fail(q, "nom " + s.name);
      if (k === "famille" && a !== CATNAME[s.cat]) fail(q, "famille " + s.cat);
      if (k === "forme" && a !== SHAPENAME[s.shape]) fail(q, "forme " + s.shape);
      if (k === "vitesse" && a !== s.speed + " km/h") fail(q, "vitesse " + s.speed);
      if (k === "action" && !(id === "stop" || id === "cedez" || id === "sens-interdit" || id === "parking" || id === "hopital")) fail(q, "action sur " + id);
      if (k === "action" && id === "stop" && !/complètement/.test(a)) fail(q, "stop");
      if (k === "action" && id === "cedez" && !/Laisser passer/.test(a)) fail(q, "cédez");
      if (k === "action" && id === "sens-interdit" && !/interdit de s'engager/.test(a)) fail(q, "sens interdit");
    } else if (k === "quel") {
      const name = (/« (.+) »/.exec(q.question) || [])[1];
      const panels = [...svg.matchAll(/data-panel="([A-D])" data-sign="([^"]+)"/g)].map(m => ({ p: m[1], s: signOf(m[2]) }));
      if (panels.length !== 4) return fail(q, "4 panneaux attendus");
      const hit = panels.filter(p => p.s && p.s.name === name);
      if (hit.length !== 1 || a !== "Le panneau " + hit[0].p) fail(q, "panneau " + (hit[0] && hit[0].p));
    } else if (k === "feu") {
      const lit = (/data-lit="([^"]+)"/.exec(svg) || [])[1];
      if (a !== LIGHT[lit]) fail(q, "feu " + lit);
      const fills = [...svg.matchAll(/<circle cx="120" cy="(\d+)" r="25" fill="(#[0-9a-f]{6})"( stroke)?/g)];
      if (fills.length !== 3 || fills.filter(m => m[3]).length !== 1 || ["rouge", "orange", "vert"][fills.findIndex(m => m[3])] !== lit) fail(q, "lampe allumée incohérente");
    } else if (k === "droite" || k === "panneau" || k === "losange") {
      const v = vehicles(svg), sg = signsOnArms(svg);
      if (v.length !== 2 || v[0].arm === v[1].arm || RIGHT[RIGHT[v[0].arm]] === v[1].arm) return fail(q, "deux bras voisins attendus");
      if (v.some(x => x.turn !== "straight")) return fail(q, "trajectoire tout droit attendue");
      const toRight = (x, y) => RIGHT[x.arm] === y.arm;         /* y est à droite de x */
      let win;
      if (k === "droite") { if (sg.length) return fail(q, "pas de panneau attendu"); win = toRight(v[0], v[1]) ? v[1] : v[0]; }
      else if (k === "panneau") { if (sg.length !== 1 || !/^(stop|cedez)$/.test(sg[0].id)) return fail(q, "un stop/cédez attendu"); const loser = v.find(x => x.arm === sg[0].arm); if (!loser) return fail(q, "panneau sur un bras sans véhicule"); win = v.find(x => x !== loser); if (!q.question.includes("véhicule " + loser.c)) fail(q, "texte/couleur"); }
      else { if (sg.length !== 1 || sg[0].id !== "priorite") return fail(q, "losange attendu"); win = v.find(x => x.arm === sg[0].arm); const other = v.find(x => x !== win); if (!toRight(win, other)) fail(q, "l'autre doit arriver par la droite"); if (!q.question.includes("véhicule " + win.c)) fail(q, "texte/couleur"); }
      if (a !== "Le véhicule " + win.c) fail(q, "gagnant " + win.c);
    } else if (k === "gauche") {
      const v = vehicles(svg);
      const l = v.find(x => x.turn === "left"), st = v.find(x => x.turn === "straight");
      if (v.length !== 2 || !l || !st || RIGHT[RIGHT[l.arm]] !== st.arm) return fail(q, "tourne-à-gauche : bras opposés attendus");
      if (a !== "Le véhicule " + st.c) fail(q, "gauche : gagnant " + st.c);
      if (!q.question.includes("véhicule " + l.c + " tourne à gauche")) fail(q, "texte/couleur");
    } else if (k === "rond-point") {
      const m = /data-ring="([^"]+)" data-enter="([^"]+)"/.exec(svg) || [];
      const ring = /data-role="ring"[^>]*>\s*<rect[^>]*fill="(#[0-9a-f]{6})"/.exec(svg), enter = /data-role="enter"[^>]*>\s*<rect[^>]*fill="(#[0-9a-f]{6})"/.exec(svg);
      const HEX = { bleu: "#1f6feb", rouge: "#e11d2e", vert: "#1fa34a", jaune: "#facc15", orange: "#f97316", violet: "#8b3fd1" };
      if (!ring || !enter || HEX[m[1]] !== ring[1] || HEX[m[2]] !== enter[1]) return fail(q, "couleurs du rond-point incohérentes");
      if (!/data-sign="cedez"/.test(svg)) fail(q, "cédez le passage attendu");
      if (a !== "Le véhicule " + m[1] || !q.question.includes("véhicule " + m[1] + " est déjà dans")) fail(q, "rond-point : gagnant " + m[1]);
    } else if (k === "conditions") {
      const road = (/data-road="([^"]+)"/.exec(svg) || [])[1], w = (/data-weather="([^"]+)"/.exec(svg) || [])[1];
      if (!SPEED[road] || a !== SPEED[road][w] + " km/h") fail(q, "vitesse " + road + " " + w);
      if ((w === "pluie") !== /pluie/.test(q.question)) fail(q, "météo du texte");
    } else fail(q, "type inconnu " + k);
  });
}
console.log(n + " questions vérifiées (" + BATCHES + " lots) :", Object.keys(kinds).map(k => k + " " + kinds[k]).join(", "));
console.log(bad ? bad + " incohérence(s)." : "Aucune incohérence : chaque réponse correspond à l'image.");
process.exit(bad ? 1 : 0);
