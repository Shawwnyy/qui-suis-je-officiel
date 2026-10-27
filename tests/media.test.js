/* Tests de QMedia (liens YouTube / image, filtrage SVG) et de la politique anti-triche. Lancer : node tests/media.test.js */
const Q = require("../js/media/media.js");
const Policy = require("../js/patches/039-v40-anti-triche.js");
let ok = 0, ko = 0;
function t(label, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } }
const ID = "dQw4w9WgXcQ";

/* --- YouTube --- */
["https://www.youtube.com/watch?v=" + ID, "http://youtube.com/watch?v=" + ID + "&feature=share", "https://youtu.be/" + ID,
 "youtu.be/" + ID + "?si=abc", "https://m.youtube.com/watch?v=" + ID, "https://www.youtube.com/embed/" + ID,
 "https://www.youtube.com/shorts/" + ID, "https://www.youtube.com/live/" + ID, "https://music.youtube.com/watch?v=" + ID,
 "https://www.youtube-nocookie.com/embed/" + ID].forEach(u => t("accepté : " + u, (Q.parseYouTube(u) || {}).id === ID));
t("début en secondes", Q.parseYouTube("https://youtu.be/" + ID + "?t=42").start === 42);
t("début 1m30s", Q.parseYouTube("https://www.youtube.com/watch?v=" + ID + "&t=1m30s").start === 90);
t("début start=15", Q.parseYouTube("https://www.youtube.com/embed/" + ID + "?start=15").start === 15);
["https://evil.com/watch?v=" + ID, "https://youtube.com.evil.com/watch?v=" + ID, "https://www.youtube.com/watch?v=court",
 "https://www.youtube.com/watch?v=" + ID + "AAA", "javascript:alert(1)", "https://www.youtube.com/", "", "ftp://youtu.be/" + ID, null, 42]
  .forEach(u => t("refusé : " + u, Q.parseYouTube(u) === null));
t("embed sans cookies", Q.embedUrl({ type: "youtube", id: ID, start: 5 }) === "https://www.youtube-nocookie.com/embed/" + ID + "?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&start=5");
t("identifiant forcé dans l'embed (pas d'injection)", !/["'<> ]/.test(Q.embedUrl(Q.normalize({ type: "youtube", id: ID }))));
t("id malveillant refusé", Q.normalize({ type: "youtube", id: ID + '"onload="x' }) === null);

/* --- Images --- */
t("image https", (Q.normalize({ type: "image", url: "https://exemple.fr/a/b.jpg?x=1" }) || {}).url === "https://exemple.fr/a/b.jpg?x=1");
["http://exemple.fr/a.jpg", "javascript:alert(1)", "data:text/html;base64,AAAA", "data:image/svg+xml;base64,AAAA", "ftp://x/a.png",
 "https://user:pass@exemple.fr/a.png", "//exemple.fr/a.png", "https://" + "a".repeat(700) + ".fr/x.png", "", null]
  .forEach(u => t("image refusée : " + String(u).slice(0, 40), Q.normalize({ type: "image", url: u }) === null));
t("data URL jpeg acceptée", Q.normalize({ type: "image", url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" }) !== null);
t("data URL trop lourde refusée", Q.normalize({ type: "image", url: "data:image/jpeg;base64," + "A".repeat(Q.MAX_DATA_URL) }) === null);
t("chaîne : lien image", (Q.normalize("https://exemple.fr/photo.png") || {}).type === "image");
t("chaîne : lien YouTube", (Q.normalize("https://youtu.be/" + ID) || {}).type === "youtube");
t("fromInput : http refusé avec message", /https/.test(Q.fromInput("http://exemple.fr/a.png").error));
t("fromInput : vide = pas de média", Q.fromInput("   ").media === null);
t("fromInput : YouTube cassé", !!Q.fromInput("https://youtu.be/xx").error);
t("type inconnu refusé", Q.normalize({ type: "html", html: "<b>x</b>" }) === null);

/* --- SVG --- */
const good = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><text x="1" y="5">Salut</text></svg>';
t("svg propre accepté", Q.cleanSvg(good) === good);
[
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick = "x()"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.com/x.png"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.com/x.svg#a"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="x" xlink:href="https://evil.com"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.com/x.css)</style></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x"/></svg>',
  '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"></svg>',
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
  '<div><svg xmlns="http://www.w3.org/2000/svg"></svg></div>',
  '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="x"></iframe></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1"/>' + "x".repeat(31000) + "</svg>"
].forEach((s, i) => t("svg dangereux refusé #" + i, Q.cleanSvg(s) === ""));
t("svg href interne autorisé", Q.cleanSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="a"/></defs><rect/></svg>') !== "");

/* --- Politique anti-triche : « supérieur à 2 » = malus, « supérieur à 4 » = exclusion --- */
const exp = { 0: "none", 1: "warn", 2: "warn", 3: "malus", 4: "malus", 5: "kick", 6: "kick", 20: "kick" };
Object.keys(exp).forEach(n => t("niveau pour " + n + " infraction(s) = " + exp[n], Policy.level(+n) === exp[n]));
t("niveau tolère les valeurs invalides", Policy.level(undefined) === "none" && Policy.level("x") === "none" && Policy.level(-3) === "none" && Policy.level(2.9) === "warn");
t("compte à rebours avant malus", Policy.describe(1).untilMalus === 2 && Policy.describe(2).untilMalus === 1 && Policy.describe(3).untilMalus === 0);
t("compte à rebours avant exclusion", Policy.describe(3).untilKick === 2 && Policy.describe(4).untilKick === 1 && Policy.describe(5).untilKick === 0);

console.log("\n" + ok + " vérifications réussies, " + ko + " échec(s).");
process.exit(ko ? 1 : 0);
