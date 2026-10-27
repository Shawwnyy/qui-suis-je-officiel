/* Cohérence des thèmes « Drapeaux en images » et « Lire l'heure » : la bonne réponse est recalculée en LISANT le dessin. */
global.QMedia = require("../js/media/media.js");
const I = require("../js/data/image-themes.js");
const BATCHES = Number(process.argv[2]) || 40;
const NAMES = { fr: "La France", it: "L'Italie", ie: "L'Irlande", be: "La Belgique", ro: "La Roumanie", ml: "Le Mali", gn: "La Guinée", ng: "Le Nigeria", ci: "La Côte d'Ivoire", pe: "Le Pérou", de: "L'Allemagne", nl: "Les Pays-Bas", lu: "Le Luxembourg", at: "L'Autriche", hu: "La Hongrie", bg: "La Bulgarie", lt: "La Lituanie", ee: "L'Estonie", ru: "La Russie", ga: "Le Gabon", ye: "Le Yémen", pl: "La Pologne", ua: "L'Ukraine", se: "La Suède", dk: "Le Danemark", fi: "La Finlande", no: "La Norvège", ch: "La Suisse", jp: "Le Japon", bd: "Le Bangladesh" };
/* couleurs lues sur le dessin → pays (table indépendante du générateur) */
const COL = { fr: ["#0055A4", "#FFFFFF", "#EF4135"], de: ["#000000", "#DD0000", "#FFCE00"], it: ["#009246", "#FFFFFF", "#CE2B37"], ie: ["#169B62", "#FFFFFF", "#FF883E"], jp: ["#FFFFFF", "#BC002D"], ch: ["#DA291C", "#FFFFFF"], pl: ["#FFFFFF", "#DC143C"], ua: ["#0057B7", "#FFD700"], nl: ["#AE1C28", "#FFFFFF", "#21468B"], ru: ["#FFFFFF", "#0039A6", "#D52B1E"] };
let n = 0, bad = 0, flags = 0, clocks = 0, withColors = 0;
function fail(q, why) { bad++; if (bad <= 15) console.log("ÉCHEC", why, "|", q.question, "|", q.answers[0]); }
for (let b = 0; b < BATCHES; b++) {
  I.build().forEach(q => {
    n++;
    const svg = q.media.svg, a = q.answers[0];
    if (new Set(q.answers).size !== 4 || q.correct !== 0) return fail(q, "réponses");
    if (!QMedia.cleanSvg(svg)) return fail(q, "SVG refusé par QMedia");
    if (q.kind === "drapeau") {
      flags++;
      const id = (/data-flag="([a-z]+)"/.exec(svg) || [])[1];
      if (!NAMES[id] || a !== NAMES[id]) return fail(q, "drapeau " + id);
      if (COL[id]) {                                              /* les couleurs dessinées sont bien celles du pays */
        withColors++;
        const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase()).filter(c => c !== "#D8DEE6");
        if (!COL[id].every(c => fills.includes(c))) fail(q, "couleurs de " + id + " : " + fills.join());
      }
    } else if (q.kind === "heure") {
      clocks++;
      const hl = /data-hand="hour" x1="120" y1="120" x2="([-\d.]+)" y2="([-\d.]+)"/.exec(svg), ml = /data-hand="minute" x1="120" y1="120" x2="([-\d.]+)" y2="([-\d.]+)"/.exec(svg);
      if (!hl || !ml) return fail(q, "aiguilles introuvables");
      const ang = (x, y) => (Math.atan2(+x - 120, 120 - +y) * 180 / Math.PI + 360) % 360;
      const minute = Math.round(ang(ml[1], ml[2]) / 6) % 60, hAng = ang(hl[1], hl[2]);
      let hour = Math.floor((hAng - minute * 0.5 + 360) % 360 / 30 + 0.5) % 12; if (hour === 0) hour = 12;
      const want = hour + " h " + (minute < 10 ? "0" : "") + minute;
      if (a !== want) fail(q, "heure lue " + want);
      if (Math.abs((hAng - ((hour % 12) * 30 + minute * 0.5) + 540) % 360 - 180) > 1) fail(q, "aiguille des heures mal placée");
    } else fail(q, "type inconnu");
  });
}
console.log(n + " questions vérifiées : " + flags + " drapeaux (" + withColors + " avec contrôle des couleurs), " + clocks + " horloges");
console.log(bad ? bad + " incohérence(s)." : "Aucune incohérence : chaque réponse correspond à l'image.");
process.exit(bad ? 1 : 0);
