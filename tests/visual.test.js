/* Cohérence des questions en images : la bonne réponse est recalculée en LISANT le SVG dessiné. node tests/visual.test.js [nombre de lots] */
global.QMedia = require("../js/media/media.js");
const V = require("../js/data/visual-questions.js");
const BATCHES = Number(process.argv[2]) || 12;
const col = {}; V.COLORS.forEach(c => { col[c.m] = c.hex; });
const byFem = {}; V.COLORS.forEach(c => { byFem[c.f] = c; byFem[c.fp] = c; });
let n = 0, bad = 0; const kinds = {};
function fail(q, why) { bad++; if (bad <= 15) console.log("ÉCHEC", why, "|", q.question, "|", q.answers[0]); }
const people = svg => svg.split('<g transform="translate(').slice(1);
const torso = g => (/<rect x="-25" y="-98"[^>]*fill="(#[0-9a-f]{6})"/.exec(g) || [])[1];
const pants = g => (/<rect x="-17" y="-44"[^>]*fill="(#[0-9a-f]{6})"/.exec(g) || [])[1];
const hat = g => (/<path d="M-24 -128 Q0 -170 24 -128Z" fill="(#[0-9a-f]{6})"/.exec(g) || [])[1];
const hair = g => (/<path d="M-23 -124 Q0 -152[^>]*fill="(#[0-9a-f]{6})"/.exec(g) || [])[1];
const hairHex = {}; ["Blond:#f1cf6b", "Roux:#e2561a", "Brun:#5a3a1f", "Noir:#1b1b1f", "Gris:#b9bcc4"].forEach(s => { const [a, b] = s.split(":"); hairHex[a] = b; });
function inc(k) { kinds[k] = (kinds[k] || 0) + 1; }
function colorInText(text) { for (const c of V.COLORS) { if (new RegExp("\\b" + c.f + "\\b|\\b" + c.fp + "\\b", "i").test(text)) return c; } return null; }
for (let b = 0; b < BATCHES; b++) {
  V.build().forEach(q => {
    n++;
    const svg = q.media.svg, a = q.answers[0], t = q.question, P = people(svg);
    if (new Set(q.answers).size !== 4 || q.correct !== 0) return fail(q, "réponses");
    let m;
    if (/Combien de ballons|Combien y a-t-il de ballons/.test(t)) { inc("ballons"); const c = (svg.match(/rx="19" ry="24"/g) || []).length; if (String(c) !== a) fail(q, "ballons " + c); }
    else if (/Combien d'étoiles/.test(t)) { inc("étoiles"); const c = colorInText(t); const k = (svg.match(new RegExp('<polygon points="[^"]*" fill="' + c.hex + '"', "g")) || []).length; if (String(k) !== a) fail(q, "étoiles " + k); }
    else if (/à la fois un pull/.test(t)) { inc("pull+bonnet"); const c = colorInText(t); const k = P.filter(g => torso(g) === c.hex && hat(g)).length; if (String(k) !== a) fail(q, "pull+bonnet " + k); }
    else if (/Combien de personnes portent un pull/.test(t)) { inc("groupe"); const c = colorInText(t); const k = P.filter(g => torso(g) === c.hex).length; if (String(k) !== a) fail(q, "groupe " + k); }
    else if ((m = /Quelle personne porte un pull (\S+) \?/.exec(t))) { inc("position"); const c = byFem[m[1]]; const idx = P.findIndex(g => torso(g) === c.hex); const want = "La " + ["1re", "2e", "3e", "4e", "5e", "6e"][idx] + " personne"; if (P.filter(g => torso(g) === c.hex).length !== 1 || want !== a) fail(q, "position " + want); }
    else if ((m = /pull de la (\d)\S* personne en partant/.exec(t))) { inc("nième"); const idx = +m[1] - 1; if (torso(P[idx]) !== col[a]) fail(q, "nième"); }
    else if (/pull de la personne (de gauche|de droite)/.test(t)) { inc("gauche/droite"); const i = /gauche/.test(t) ? 0 : 1; if (torso(P[i]) !== col[a]) fail(q, "g/d"); }
    else if (/pantalon/.test(t)) { inc("pantalon"); if (pants(P[0]) !== col[a]) fail(q, "pantalon"); }
    else if (/bonnet/.test(t)) { inc("bonnet"); if (hat(P[0]) !== col[a]) fail(q, "bonnet"); }
    else if (/cheveux/.test(t)) { inc("cheveux"); if (hair(P[0]) !== hairHex[a]) fail(q, "cheveux"); }
    else if (/pull/.test(t)) { inc("pull"); if (P.length !== 1 || torso(P[0]) !== col[a]) fail(q, "pull"); }
    else if (/De quelle couleur est (le cercle|le carré|le triangle|l'étoile)/.test(t)) {
      inc("forme→couleur"); const sh = /cercle/.test(t) ? "<circle cx" : /carré/.test(t) ? '<rect x=' : /triangle/.test(t) ? "<polygon points=\"" : "<polygon";
      let el;
      if (/cercle/.test(t)) el = /<circle cx="\d+" cy="118" r="34" fill="(#[0-9a-f]{6})"/.exec(svg);
      else if (/carré/.test(t)) el = /<rect x="\d+" y="86" width="64" height="64" rx="4" fill="(#[0-9a-f]{6})"/.exec(svg);
      else if (/triangle/.test(t)) el = /<polygon points="\d+,80 [^"]*" fill="(#[0-9a-f]{6})"/.exec(svg);
      else el = /<polygon points="[^"]*(?:[0-9.]+,[0-9.]+ ){9}[0-9.]+,[0-9.]+" fill="(#[0-9a-f]{6})"/.exec(svg.slice(svg.lastIndexOf("<polygon")));
      if (!el || el[1] !== col[a]) fail(q, "forme→couleur");
    }
    else if ((m = /Quelle forme est (\S+) \?/.exec(t))) {
      inc("couleur→forme"); const c = byFem[m[1]];
      const rect = [["Le cercle", /<circle cx="\d+" cy="118" r="34" fill="(#[0-9a-f]{6})"/], ["Le carré", /<rect x="\d+" y="86" width="64" height="64" rx="4" fill="(#[0-9a-f]{6})"/],
        ["Le triangle", /<polygon points="\d+,80 [^"]*" fill="(#[0-9a-f]{6})"/], ["L'étoile", /<polygon points="(?:[0-9.]+,[0-9.]+ ){9}[0-9.]+,[0-9.]+" fill="(#[0-9a-f]{6})"/]];
      const found = rect.filter(([, re]) => { const e = re.exec(svg); return e && e[1] === c.hex; }).map(x => x[0]);
      if (found.length !== 1 || found[0] !== a) fail(q, "couleur→forme " + found);
    }
    else fail(q, "question non reconnue par le test");
  });
}
console.log(n + " questions vérifiées sur " + BATCHES + " lots :", JSON.stringify(kinds));
console.log(bad ? bad + " incohérence(s)." : "Aucune incohérence : chaque réponse correspond à l'image.");
process.exit(bad ? 1 : 0);
