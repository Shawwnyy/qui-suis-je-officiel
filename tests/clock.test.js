/* Horloge permanente : format HH:MM:SS recalculé indépendamment (toTimeString), cas limites, recalage sur la seconde. */
const C = require("../js/clock/clock.js");
let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; console.log("ÉCHEC", msg); } }

ok(C.format(new Date(2026, 9, 27, 18, 3, 7)) === "18:03:07", "18:03:07");
ok(C.format(new Date(2026, 0, 1, 0, 0, 0)) === "00:00:00", "minuit");
ok(C.format(new Date(2026, 5, 15, 23, 59, 59)) === "23:59:59", "23:59:59");
ok(C.format(new Date(2026, 5, 15, 9, 5, 4, 999)) === "09:05:04", "les millisecondes ne passent pas à la seconde suivante");
ok(C.format(new Date("nope")) === "--:--:--", "date invalide");
ok(C.format(null) === "--:--:--" && C.format(undefined) === "--:--:--" && C.format("18:00:00") === "--:--:--" && C.format(1700000000000) === "--:--:--", "entrées qui ne sont pas des dates");

/* Tirages aléatoires sur 3 ans (changements d'heure compris) comparés à toTimeString, calculé autrement */
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let diff = 0;
for (let i = 0; i < 20000; i++) {
  const d = new Date(1735689600000 + Math.floor(rnd() * 3 * 365 * 86400000));
  const want = d.toTimeString().slice(0, 8);
  if (C.format(d) !== want || !/^\d\d:\d\d:\d\d$/.test(C.format(d))) { diff++; if (diff <= 3) console.log("écart", d.toISOString(), C.format(d), want); }
}
ok(diff === 0, diff + " écart(s) avec toTimeString sur 20 000 dates");

/* Chaque seconde de la journée est bien formée */
let wrong = 0;
for (let s = 0; s < 86400; s++) { const d = new Date(2026, 5, 15, 0, 0, s); if (C.format(d) !== [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, "0")).join(":")) wrong++; }
ok(wrong === 0, wrong + " seconde(s) mal formatée(s) dans la journée");

/* Recalage : le prochain passage tombe toujours juste APRÈS le début de la seconde suivante, jamais avant, jamais plus d'une seconde plus tard */
let early = 0, late = 0;
for (let ms = 0; ms < 5000; ms += 7) {
  const d = C.untilNextSecond(ms), at = ms + d;
  if (Math.floor(at / 1000) <= Math.floor(ms / 1000)) early++;
  if (d > 1015 || d < 15) late++;
}
ok(early === 0, early + " recalage(s) retombent sur la même seconde");
ok(late === 0, late + " délai(s) hors bornes");
ok(C.untilNextSecond(999) === 16 && C.untilNextSecond(1000) === 1015 && C.untilNextSecond(1500) === 515, "valeurs de référence du recalage");

console.log("Horloge : " + (n - bad) + " OK, " + bad + " échec(s)");
process.exit(bad ? 1 : 0);
