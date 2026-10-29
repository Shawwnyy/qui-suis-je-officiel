/* =============================================================================
   V59 — 13 pouvoirs de plus (7 bonus, 6 malus), branchés comme les 16 de V50 (même chaîne : bouclier, Miroir, Hérisson,
   limite de 2 malus, rareté, « pas deux fois le même », écran vert / rouge).
   Les règles sont dans V59Powers, une logique pure (objets simples, aucun accès au DOM) testée par tests/v59.test.js.
   ============================================================================= */
var V59Powers = (function () {
  "use strict";
  /* r : rareté (0 commun, 1 rare, 2 épique) ; q : nombre de questions ; instant : effet immédiat */
  var DEFS = {
    /* ---------- BONUS ---------- */
    cadeau:    { type: "bonus", r: 0, emoji: "🎁", name: "Cadeau surprise",   desc: "+200 pts et +1 combo", q: 0, instant: true },
    machine:   { type: "bonus", r: 0, emoji: "🎰", name: "Machine à sous",    desc: "tirage : 0 à +900 pts", q: 0, instant: true },
    radar:     { type: "bonus", r: 1, emoji: "🔭", name: "Radar",             desc: "+5 s de chrono par question (2 q.)", q: 2 },
    rente:     { type: "bonus", r: 1, emoji: "💎", name: "Rente",             desc: "+100 pts à chaque bonne réponse (3 q.)", q: 3 },
    rattrapage:{ type: "bonus", r: 1, emoji: "🦸", name: "Rattrapage",        desc: "15 % de l'écart avec le leader (150 à 900 pts)", q: 0, instant: true },
    magicien:  { type: "bonus", r: 2, emoji: "🪄", name: "Magicien",          desc: "ta prochaine bonne réponse compte ×4 (2 q.)", q: 2 },
    treve:     { type: "bonus", r: 2, emoji: "🕊️", name: "Trêve",             desc: "un bouclier neuf à chaque question (3 q.)", q: 3, instant: true }
    ,
    /* ---------- MALUS ---------- */
    mine:      { type: "malus", r: 1, emoji: "💣", name: "Mine",              desc: "s'il se trompe à la prochaine question : −300 pts", q: 1 },
    deval:     { type: "malus", r: 1, emoji: "🏷️", name: "Dévaluation",       desc: "sa prochaine bonne réponse rapporte moitié moins (1 q.)", q: 1 },
    montagnes: { type: "malus", r: 1, emoji: "🎢", name: "Montagnes russes",  desc: "son combo tombe au hasard entre 0 et son combo", q: 0, instant: true },
    brouillard:{ type: "malus", r: 1, emoji: "🌫️", name: "Brouillard",        desc: "énoncé flou les 4 premières secondes (1 q.)", q: 1 },
    faucheuse: { type: "malus", r: 2, emoji: "💀", name: "Faucheuse",         desc: "−25 % de son score (max 1 500 pts)", q: 0, instant: true },
    vampire:   { type: "malus", r: 2, emoji: "🧛", name: "Vampire",           desc: "tu lui voles 10 % de son score (100 à 700 pts)", q: 0, instant: true }
  };
  var IDS = Object.keys(DEFS);
  var BONUS_IDS = IDS.filter(function (k) { return DEFS[k].type === "bonus"; });
  var MALUS_IDS = IDS.filter(function (k) { return DEFS[k].type === "malus"; });
  var NEG_PERSISTENT = ["mine", "deval", "brouillard"];
  var POS_PERSISTENT = ["radar", "rente", "magicien", "treve"];

  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function gain(p, n) { n = Math.max(0, Math.round(n)); p.score = num(p.score) + n; p.bonusPoints = num(p.bonusPoints) + n; return n; }
  function lose(p, n) { var l = Math.min(num(p.score), Math.max(0, Math.round(n))); p.score = num(p.score) - l; p.malusPoints = num(p.malusPoints) + l; return l; }
  function addCombo(p, n) { p.combo = Math.max(0, num(p.combo) + n); p.bestCombo = Math.max(num(p.bestCombo), p.combo); p.powerGrantedCombo = 0; }
  function fxOn(p, id) { var f = p && p.fx && p.fx[id]; return !!(f && f.left > 0); }
  function clampInt(v, lo, hi) { v = Math.round(num(v)); return Math.max(lo, Math.min(hi, v)); }

  /* Machine à sous : 40 % +100, 30 % +250, 20 % +500, 10 % +900 */
  function slotPrize(r) { r = Math.min(0.999999, Math.max(0, num(r))); return r < 0.4 ? 100 : r < 0.7 ? 250 : r < 0.9 ? 500 : 900; }
  /* Rattrapage : 15 % de l'écart avec le leader, entre 150 et 900 (le leader reçoit le minimum) */
  function catchUp(myScore, leaderScore) { return clampInt(0.15 * Math.max(0, num(leaderScore) - num(myScore)), 150, 900); }
  function reaperLoss(score) { return clampInt(0.25 * Math.max(0, num(score)), 0, 1500); }
  function vampireLoss(score) { var s = Math.max(0, num(score)); return Math.min(s, clampInt(0.10 * s, 100, 700)); }

  /* Effet immédiat d'un BONUS. leaderScore : meilleur score de la partie ; rng() ∈ [0,1[. Renvoie un petit texte. */
  function bonusInstant(id, p, leaderScore, rng) {
    rng = rng || Math.random;
    if (id === "cadeau") { gain(p, 200); addCombo(p, 1); return " (+200 pts, combo " + p.combo + ")"; }
    if (id === "machine") { var w = slotPrize(rng()); gain(p, w); return " (🎰 +" + w + " pts)"; }
    if (id === "rattrapage") { var g = catchUp(p.score, leaderScore); gain(p, g); return " (+" + g + " pts)"; }
    if (id === "treve") { p.shield = true; return " (bouclier prêt, renouvelé à chaque question)"; }
    return "";
  }
  /* Effet immédiat d'un MALUS sur sa victime (déjà passé par bouclier / Miroir / Hérisson dans le jeu). */
  function malusInstant(id, victim, attacker, rng) {
    rng = rng || Math.random;
    if (id === "montagnes") {
      var c = Math.max(0, Math.floor(num(victim.combo))), n = Math.min(c, Math.floor(Math.min(0.999999, Math.max(0, num(rng()))) * (c + 1)));
      victim.combo = n; victim.powerGrantedCombo = 0; return " (combo " + c + " → " + n + ")";
    }
    if (id === "faucheuse") { var l = lose(victim, reaperLoss(victim.score)); return " (−" + l + " pts)"; }
    if (id === "vampire") {
      var v = lose(victim, vampireLoss(victim.score));
      if (attacker && attacker !== victim) gain(attacker, v);
      else if (attacker === victim) { victim.score = num(victim.score) + v; victim.malusPoints = Math.max(0, num(victim.malusPoints) - v); v = 0; }
      return " (" + v + " pts volés)";
    }
    return "";
  }
  /* Gains d'une bonne réponse (g déjà calculé) : Rente +100, Magicien ×4 (une seule fois), Dévaluation ÷2. */
  function gainAdjust(p, g) {
    if (!p || !p.fx) return g;
    if (fxOn(p, "magicien")) { g = g * 4; delete p.fx.magicien; }
    if (fxOn(p, "rente")) g += 100;
    if (fxOn(p, "deval")) g = Math.round(g * 0.5);
    return g;
  }
  /* Radar : +5 s */
  function timeDelta(p) { return fxOn(p, "radar") ? 5 : 0; }
  /* Mauvaise réponse : la Mine explose (−300 pts) puis disparaît. Renvoie les points perdus. */
  function onWrong(p) {
    if (!fxOn(p, "mine")) return 0;
    var l = lose(p, 300); delete p.fx.mine; return l;
  }
  /* Début de question : la Trêve renouvelle le bouclier. Renvoie vrai s'il vient d'être remis. */
  function renewShield(p) {
    if (!fxOn(p, "treve") || p.shield) return false;
    p.shield = true; return true;
  }
  var api = { DEFS: DEFS, IDS: IDS, BONUS_IDS: BONUS_IDS, MALUS_IDS: MALUS_IDS, NEG_PERSISTENT: NEG_PERSISTENT, POS_PERSISTENT: POS_PERSISTENT,
    slotPrize: slotPrize, catchUp: catchUp, reaperLoss: reaperLoss, vampireLoss: vampireLoss,
    bonusInstant: bonusInstant, malusInstant: malusInstant, gainAdjust: gainAdjust, timeDelta: timeDelta, onWrong: onWrong, renewShield: renewShield, fxOn: fxOn };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function V59Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof EXT_POWERS === "undefined" || typeof applyExtPower !== "function") return;
  var P = V59Powers;
  window.V59Powers = P;
  P.IDS.forEach(function (id) { if (!EXT_POWERS[id]) EXT_POWERS[id] = P.DEFS[id]; });
  P.BONUS_IDS.forEach(function (id) { if (EXT_IDS.bonus.indexOf(id) < 0) EXT_IDS.bonus.push(id); if (POWER_KINDS.bonus.indexOf(id) < 0) POWER_KINDS.bonus.push(id); });
  P.MALUS_IDS.forEach(function (id) { if (EXT_IDS.malus.indexOf(id) < 0) EXT_IDS.malus.push(id); if (POWER_KINDS.malus.indexOf(id) < 0) POWER_KINDS.malus.push(id); });
  P.NEG_PERSISTENT.forEach(function (id) { if (NEG_FX.indexOf(id) < 0) NEG_FX.push(id); });
  P.POS_PERSISTENT.forEach(function (id) { if (POS_FX.indexOf(id) < 0) POS_FX.push(id); });

  function leader() { var m = 0; Object.keys(players).forEach(function (k) { m = Math.max(m, Number(players[k].score) || 0); }); return m; }
  var baseApply = applyExtPower;
  applyExtPower = function (player, target, id, level) {
    var out = baseApply.apply(this, arguments);
    var d = P.DEFS[id];
    if (!d || !out || !d.instant) return out;
    try {
      var note = "";
      if (d.type === "bonus") note = P.bonusInstant(id, player, leader());
      else if (!out.blocked) note = P.malusInstant(id, out.reflected ? player : target, out.reflected ? target : player);
      if (note) { out.note = (out.note || "") + note; out.msgSelf = (out.msgSelf || "") + note; if (out.msgTarget) out.msgTarget += note; }
    } catch (e) { if (window.console) console.error("V59 pouvoir", id, e); }
    return out;
  };
  var baseScore = applyScoreFx;
  applyScoreFx = function (p, pts, data) { return P.gainAdjust(p, baseScore.apply(this, arguments)); };
  var baseTime = fxTimeDelta;
  fxTimeDelta = function (p) { return Math.max(5, questionTime + baseTime(p) + P.timeDelta(p)) - questionTime; };
  var baseWrong = onWrongFx;
  onWrongFx = function (p) { try { P.onWrong(p); } catch (e) {} return baseWrong.apply(this, arguments); };
  /* début de question (hôte) : la Trêve remet un bouclier */
  var baseMods = withFxMods;
  withFxMods = function (q) {
    try { if (!(typeof currentQuestionIndex !== "undefined" && currentQuestionIndex === 0)) Object.keys(players).forEach(function (k) { P.renewShield(players[k]); }); } catch (e) {}
    return baseMods.apply(this, arguments);
  };

  /* Brouillard : l'énoncé de la cible est flou les 4 premières secondes */
  function clearBlur() { document.body.classList.remove("v59-blur"); }
  function applyBlur() {
    clearBlur();
    var me = typeof players !== "undefined" && players[myId];
    if (me && P.fxOn(me, "brouillard")) { void document.body.offsetWidth; document.body.classList.add("v59-blur"); }
  }
  var baseDisplay = displayQuestion;
  displayQuestion = function () { clearBlur(); return baseDisplay.apply(this, arguments); };
  var baseStart = startTimer;
  startTimer = function () { var r = baseStart.apply(this, arguments); try { applyBlur(); } catch (e) {} return r; };
  var baseShow = showScreen;
  showScreen = function (id) { if (id !== "gameScreen") clearBlur(); return baseShow.apply(this, arguments); };
})();
