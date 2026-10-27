/* Tests du moteur de modération.  Lancer :  node tests/moderation.test.js */
"use strict";
const Moderation = require("../js/moderation/moderation.js");

const MUST_BLOCK = [
  /* --- le cas demandé : lettres sur des lignes séparées --- */
  "B\nI\nT\nE", "b\ni\nt\ne", "B\r\nI\r\nT\r\nE", "B\n\nI\n\nT\n\nE", "B\n I\n T\n E", "f\nu\nc\nk", "p\nu\nt\ne",
  "c\no\nn\nn\na\nr\nd", "a\nb\nc", "o\nk\ni", "Salut\nB\nI\nT\nE\nmerci",
  "bi\nte", "pu\nte", "con\nnard", "enc\nule", "mer\nde",
  /* --- lettres espacées sur une ligne --- */
  "B I T E", "b.i.t.e", "b-i-t-e", "b_i_t_e", "B   I   T   E", "b*i*t*e", "b/i/t/e", "b•i•t•e", "b,i,t,e",
  "f u c k", "F.U.C.K", "s a l o p e", "e n c u l é", "c o n n a r d", "n t m", "f.d.p", "z o b", "t e u b", "p é d é",
  "m e r d e", "c o u i l l e s", "b i t c h", "k y s", "s h i t",
  "a b c d e f", "x y z w v u",
  "b 1 t e", "b 1 t 3", "p u t 4 i n", "b😀i😀t😀e", "b\u3000i\u3000t\u3000e", "b. i. t. e.",
  /* --- mots simples --- */
  "bite", "BITE", "Bite !", "zob", "teub", "pute", "salope", "connard", "connasse", "enculé", "ENCULE", "ntm", "fdp",
  "tg", "pd", "nique", "niquer", "putain", "merde", "pédé", "bougnoule", "couilles", "couillon", "branleur",
  "fuck", "fucking", "motherfucker", "bitch", "asshole", "bastard", "cunt", "whore", "slut", "faggot", "nigger",
  "mierda", "puta", "joder", "cabron", "gilipollas", "scheisse", "scheiße", "arschloch", "hurensohn", "stronzo",
  "vaffanculo", "caralho", "klootzak", "blyat", "orospu", "idiot", "abruti", "débile", "crétin",
  "Tu es un con", "espèce de con", "quel con", "ce con", "sale con",
  /* --- étirements --- */
  "bbiittee", "ffuucckk", "biiiite", "biiiiiite", "fuuuuck", "connnnard", "merdeeee", "salooope", "puuuute", "zoooob",
  /* --- leet / symboles --- */
  "b1te", "b!te", "b|te", "b1t3", "p@ute", "put@in", "c0nnard", "c0nn4rd", "sh!t", "f*ck", "f**k", "p*tain", "m*rde", "enc*lé",
  "s4l0p3", "m3rd3", "put41n", "n1qu3", "b1tch", "fuk", "fck",
  /* --- Unicode déguisé --- */
  "𝐛𝐢𝐭𝐞", "𝕓𝕚𝕥𝕖", "ｂｉｔｅ", "ⓑⓘⓣⓔ", "🇧🇮🇹🇪", "🅱🅸🆃🅴", "bіte" /* i cyrillique */, "bіtе",
  "bi​te", "b​i​t​e", "b⁠i⁠t⁠e", "b̶i̶t̶e̶", "bi­te", "pu️te",
  "ṗute", "cønnard",
  /* --- expressions --- */
  "ta gueule", "TA GUEULE", "ferme ta gueule", "t a g u e u l e", "nique ta mère", "n i q u e t a m e r e", "nique ta mere",
  "va te faire foutre", "fils de pute", "fils de p u t e", "sale arabe", "sale noir", "sale juif", "va crever", "tue toi",
  "suicide toi", "je vais te tuer", "kill yourself", "go to hell", "hijo de puta", "heil hitler", "tais-toi", "tais toi",
  "I'll kill you", "i will kill you",
  /* --- phrases avec insulte noyée --- */
  "Franchement t'es qu'une grosse pute", "bonjour connard", "oui salope merci", "lol fdp", "mdr ntm",
  "Quelle réponse ? bite", "c'est la B I T E", "va te faire enculer", "ferme la gueule", "bbiittee", "enc*lé"
];

const MUST_PASS = [
  /* --- faux positifs classiques (Scunthorpe) --- */
  "Quel est le plus grand continent ?", "continent", "Constantinople", "Constance", "Conan le barbare", "conseil", "concours",
  "contre", "contenu", "connais", "je connais la réponse", "connaissance",
  "computer", "ordinateur", "réputation", "reputation", "dispute", "députés", "déjà", "disputer", "habite", "j'habite à Paris",
  "habiter", "bitume", "bitcoin", "bitter", "bitte", "salopette", "technique", "la technique est bonne", "analyse", "analyser",
  "Scunthorpe", "communiquer", "communiqué", "JO d'été", "les JO d'été de 2024", "Comic Con Paris", "un cul-de-sac", "une voûte en cul-de-four", "0,1 à 0,4 s", "0,1 à 0,4 seconde", "L M M J V", "O T T F F", "Essex", "Middlesex", "Sussex", "assassin", "classic", "classe", "bass", "pass", "passe", "assis", "grape",
  "Cassandra", "hello", "Dickens a écrit David Copperfield", "Moby Dick", "cocktail", "peacock", "shiitake", "shitake",
  "calcul", "calcul mental", "reculer", "culture", "culturel", "particulier", "ridicule", "macule", "peculiar", "cucumber",
  "pédagogie", "pédale", "pédestre", "médecin", "pédiatre", "ordure", "bordel", "Nîmes", "Mathis", "Léa", "Kévin", "Huy",
  "Lucas_97", "Antoine", "Camille", "Zoé", "Jean-Pierre", "Marie-Hélène", "Amélie",
  /* --- petits mots français qui pourraient se recoller --- */
  "j'ai pu te dire", "je n'ai pas pu te répondre", "il a pu te voir", "j'ai pu te le dire hier", "tu as pu te tromper",
  "on a pu te voir", "je suis en retard", "il est en retard", "retard", "ça va ?", "ça te dit ?", "oui et toi ?",
  /* --- anglais --- */
  "it's hit or miss", "that's hit", "pros and cons", "the con artist", "it's a big hit", "what's it", "he's a good one",
  "this is the best answer", "I think it's B", "Hello everyone", "Good game", "well played",
  /* --- espagnol / italien / portugais --- */
  "vamos con el equipo", "hola, voy con mis amigos", "con mucho gusto", "quiero ir con ellos a la casa", "come stai? con te volentieri",
  "obrigado, vou com você", "puttanesca", "spaghetti alla puttanesca", "Troia", "la guerra de Troya", "verga",
  /* --- quiz --- */
  "A", "B", "C", "je pense que c'est B", "la réponse est A ou B", "A B C D", "A, B, C ou D ?", "J. R. R. Tolkien", "U.S.A.", "S.O.S",
  "XXX", "1 2 3 4 5 6", "10 20 30 40", "2024", "mp3", "3D", "gr8", "b2b", "x y", "a b", "pas de souci", "ok merci", "mdr", "lol",
  "haha", "ptdr", "wtf", "nul", "t'es nul", "bien joué", "c'est quoi la capitale de la France ?", "Quelle est la capitale du Togo ?",
  "Paris", "Berlin", "H2O", "NaCl", "le symbole du fer est Fe", "salut les gars", "bonjour à tous", "bravo !", "super partie",
  "@Léa t'as vu ?", "@Mathis bien joué", "à qui le tour ?", "c'est à moi", "pourquoi pas", "peut-être", "d'accord", "oui oui",
  "Qui est le roi des animaux ? Le lion", "La tour Eiffel mesure 330 mètres", "1789 : la Révolution française",
  "Le mot impasse vient du français", "la capitale est Paris", "J'adore ce thème", "On refait une partie ?", "GG", "gg wp"
];

let fails = 0;
function report(kind, text, res) {
  fails++;
  console.log("ÉCHEC [" + kind + "] " + JSON.stringify(text) + " → " + JSON.stringify(res));
}
MUST_BLOCK.forEach(t => { const r = Moderation.check(t); if (!r.blocked) report("devrait être bloqué", t, r); });
MUST_PASS.forEach(t => { const r = Moderation.check(t); if (r.blocked) report("ne devrait PAS être bloqué", t, r); });

/* sanctions progressives */
Moderation.resetStrikes();
const levels = [1, 2, 3, 4].map(() => Moderation.strike("joueurA"));
const expect = [[1, 0], [2, 60000], [3, 300000], [4, 900000]];
levels.forEach((l, i) => { if (l.count !== expect[i][0] || l.muteMs !== expect[i][1]) report("sanction", "strike " + (i + 1), l); });
if (Moderation.strike("joueurB").muteMs !== 0) report("sanction", "autre joueur", {});

/* épellation répartie sur plusieurs messages : « b », « i », « t », « e » */
function seq(list, gap, id) {
  Moderation.resetSequence();
  let t = 1000;
  return list.map(w => { const r = Moderation.sequence(id || "p", w, t, "m" + t); t += gap; return r; });
}
const spell = seq(["b", "i", "t", "e"], 1000);
if (spell[0].blocked || spell[1].blocked) report("épellation", "les 2 premières lettres ne doivent pas encore être bloquées", spell);
if (!spell[2].blocked || !spell[2].ban) report("épellation", "b i t doit déclencher le bannissement", spell[2]);
if (!spell[3].ban || spell[3].run.length < 4) report("épellation", "b i t e : bannissement + 4 messages à supprimer", spell[3]);
if (!seq(["b", "i", "te"], 1000)[2].ban) report("épellation", "b / i / te", {});
if (!seq(["pu", "te"], 1000)[1].ban) report("épellation", "pu / te", {});
if (!seq(["b", "salut", "i", "ça va", "t", "e"], 1000)[4].ban) report("épellation", "lettres entrecoupées de messages normaux", {});
if (!seq(["B", "I", "T", "E"], 1000)[2].ban) report("épellation", "majuscules", {});
if (!seq(["🇧", "🇮", "🇹", "🇪"], 1000)[2].ban) report("épellation", "lettres emoji", {});
const aba = seq(["a", "b", "a"], 1000)[2];
if (!aba.blocked || aba.ban) report("épellation", "a b a : supprimé sans bannissement", aba);
if (seq(["ok", "ok", "ok", "ok"], 500).some(r => r.blocked)) report("épellation", "ok ok ok ok ne doit pas être bloqué", {});
if (seq(["a", "a", "a", "a", "a"], 500).some(r => r.ban)) report("épellation", "a a a a a ne doit pas être banni", {});
if (seq(["3", "2", "1", "go"], 1000).some(r => r.blocked)) report("épellation", "compte à rebours 3 2 1", {});
if (seq(["A", "B"], 1000).some(r => r.blocked)) report("épellation", "deux réponses A / B", {});
if (seq(["b", "i", "t", "e"], 20000).some(r => r.ban)) report("épellation", "lettres espacées de 20 s : hors fenêtre de 30 s", {});
const sepA = (Moderation.resetSequence(), Moderation.sequence("A", "b", 1000, "x1"), Moderation.sequence("B", "i", 1100, "x2"), Moderation.sequence("A", "i", 1200, "x3"), Moderation.sequence("B", "t", 1300, "x4"));
if (sepA.blocked) report("épellation", "deux joueurs différents ne s'additionnent pas", sepA);
/* aucune suite plausible de petits mots français ne doit déclencher */
const SMALL = "le la un de du en et ou où au ne ni si se ce ca ça ma ta sa me te je tu il on ah oh ok eh ha ho hi to is it no so go".split(" ");
let fp = 0, seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let n = 0; n < 20000; n++) {
  const len = 2 + Math.floor(rnd() * 5), arr = [];
  for (let i = 0; i < len; i++) arr.push(SMALL[Math.floor(rnd() * SMALL.length)]);
  if (seq(arr, 500).some(r => r.blocked)) { fp++; if (fp <= 5) console.log("  faux positif possible : " + arr.join(" ")); }
}
if (fp > 5) report("épellation", fp + " faux positifs sur des suites de petits mots", {});   /* 'si te', 'pu te'… : seuls de vrais mots interdits */

console.log("\n" + MUST_BLOCK.length + " cas à bloquer, " + MUST_PASS.length + " cas légitimes, " + fails + " échec(s).");
process.exit(fails ? 1 : 0);
