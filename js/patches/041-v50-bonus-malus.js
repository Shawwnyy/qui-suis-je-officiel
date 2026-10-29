/* =============================================================================
   V50 — 16 nouveaux pouvoirs (8 bonus, 8 malus) + écran VERT animé pour un bonus, écran ROUGE animé pour un malus

   • Les règles de chaque pouvoir (effets immédiats, gains, chrono) sont dans V50Powers, une logique pure (objets simples,
     aucun accès au DOM) testée par tests/v50.test.js. Le reste de ce fichier ne fait que la brancher sur le jeu existant
     (EXT_POWERS, applyExtPower, applyScoreFx, fxTimeDelta, startTimer, showPowerPanel) à la manière de js/core/53.
   • V50Flash : plein écran vert (bonus) ou rouge (malus) avec une animation (CSS dans css/v50.css). Il ne bloque jamais les
     clics (pointer-events:none), disparaît seul, et se réduit à un simple fondu si le système demande moins d'animations.
   ============================================================================= */
var V50Powers = (function () {
  "use strict";

  /* r : rareté (0 commun, 1 rare, 2 épique) ; q : nombre de questions ; instant : effet immédiat (pas de durée) */
  var DEFS = {
    /* ---------- BONUS ---------- */
    tresor:   { type: "bonus", r: 0, emoji: "💰", name: "Trésor",             desc: "+350 pts tout de suite", q: 0, instant: true },
    chance:   { type: "bonus", r: 0, emoji: "🍀", name: "Trèfle à 4 feuilles", desc: "1 chance sur 2 : +500 pts, sinon +150", q: 0, instant: true },
    soin:     { type: "bonus", r: 1, emoji: "💚", name: "Soin",               desc: "+2 combo tout de suite", q: 0, instant: true },
    ange:     { type: "bonus", r: 1, emoji: "😇", name: "Ange gardien",       desc: "bouclier + 100 pts", q: 0, instant: true },
    horloge:  { type: "bonus", r: 1, emoji: "🕰️", name: "Arrêt du temps",     desc: "+15 s sur ta prochaine question", q: 1 },
    boost15:  { type: "bonus", r: 1, emoji: "🚀", name: "Fusée ×1,5",         desc: "tes gains ×1,5 (2 q.)", q: 2 },
    lingot:   { type: "bonus", r: 1, emoji: "🥇", name: "Lingot d'or",        desc: "ta prochaine bonne réponse +300 pts", q: 1 },
    phenix:   { type: "bonus", r: 2, emoji: "🌅", name: "Phénix",             desc: "retrouve ton meilleur combo (+1)", q: 0, instant: true },
    /* ---------- MALUS ---------- */
    amende:   { type: "malus", r: 0, emoji: "👮", name: "Amende",             desc: "−300 pts tout de suite", q: 0, instant: true },
    seisme:   { type: "malus", r: 0, emoji: "📳", name: "Séisme",             desc: "l'écran de la cible tremble (1 q.)", q: 1 },
    boulet:   { type: "malus", r: 1, emoji: "⛓️", name: "Boulet",             desc: "−2 combo tout de suite", q: 0, instant: true },
    virus:    { type: "malus", r: 1, emoji: "🦠", name: "Virus",              desc: "ses gains −15 % (3 q.)", q: 3 },
    eclipse:  { type: "malus", r: 1, emoji: "🌑", name: "Éclipse",            desc: "réponses cachées 3 s au début (2 q.)", q: 2 },
    larcin:   { type: "malus", r: 1, emoji: "🕵️", name: "Larcin",             desc: "tu lui voles 200 pts", q: 0, instant: true },
    tempete:  { type: "malus", r: 1, emoji: "🌪️", name: "Tempête",            desc: "−3 s de chrono par question (2 q.)", q: 2 },
    trounoir: { type: "malus", r: 2, emoji: "⚫", name: "Trou noir",           desc: "sa prochaine bonne réponse ne rapporte rien", q: 1 }
  };
  var IDS = Object.keys(DEFS);
  var BONUS_IDS = IDS.filter(function (k) { return DEFS[k].type === "bonus"; });
  var MALUS_IDS = IDS.filter(function (k) { return DEFS[k].type === "malus"; });
  /* effets qui durent : à ranger avec les « malus actifs » (max 2 en même temps) / les « bonus actifs » (annulables) */
  var NEG_PERSISTENT = ["seisme", "virus", "eclipse", "tempete", "trounoir"];
  var POS_PERSISTENT = ["horloge", "boost15", "lingot"];

  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function gain(p, n) { n = Math.max(0, Math.round(n)); p.score = num(p.score) + n; p.bonusPoints = num(p.bonusPoints) + n; return n; }
  function lose(p, n) { var l = Math.min(num(p.score), Math.max(0, Math.round(n))); p.score = num(p.score) - l; p.malusPoints = num(p.malusPoints) + l; return l; }
  function addCombo(p, n) {
    p.combo = Math.max(0, num(p.combo) + n);
    p.bestCombo = Math.max(num(p.bestCombo), p.combo);
    p.powerGrantedCombo = 0;
  }
  function fxOn(p, id) { var f = p && p.fx && p.fx[id]; return !!(f && f.left > 0); }

  /* Effet immédiat d'un BONUS sur celui qui le joue. rng() ∈ [0,1[ (Math.random en jeu). Renvoie un petit texte ajouté au message. */
  function bonusInstant(id, p, rng) {
    rng = rng || Math.random;
    if (id === "tresor") { gain(p, 350); return " (+350 pts)"; }
    if (id === "chance") {
      if (rng() < 0.5) { gain(p, 500); return " (🍀 jackpot : +500 pts !)"; }
      gain(p, 150); return " (🍀 +150 pts)";
    }
    if (id === "soin") { addCombo(p, 2); return " (combo " + p.combo + ")"; }
    if (id === "ange") { p.shield = true; gain(p, 100); return " (+100 pts, bouclier prêt)"; }
    if (id === "phenix") {
      var before = num(p.combo);
      p.combo = Math.max(before, num(p.bestCombo)) + 1;
      p.bestCombo = Math.max(num(p.bestCombo), p.combo);
      p.powerGrantedCombo = 0;
      return " (combo " + before + " → " + p.combo + ")";
    }
    return "";
  }

  /* Effet immédiat d'un MALUS sur sa victime (déjà passé par bouclier / miroir / hérisson dans le jeu). */
  function malusInstant(id, victim, attacker) {
    if (id === "amende") { var l = lose(victim, 300); return " (−" + l + " pts)"; }
    if (id === "boulet") { var c = num(victim.combo); addCombo(victim, -2); return " (combo " + c + " → " + victim.combo + ")"; }
    if (id === "larcin") {
      var s = lose(victim, 200);
      if (attacker && attacker !== victim) gain(attacker, s);
      else if (attacker === victim) { /* renvoyé par un Miroir : le voleur se vole lui-même, rien ne bouge */ victim.score = num(victim.score) + s; victim.malusPoints = Math.max(0, num(victim.malusPoints) - s); s = 0; }
      return " (" + s + " pts volés)";
    }
    return "";
  }

  /* Gains d'une bonne réponse : g = gain déjà calculé par le jeu. Consomme les effets « une seule fois ». */
  function gainAdjust(p, g) {
    if (!p || !p.fx) return g;
    if (fxOn(p, "boost15")) g = Math.round(g * 1.5);
    if (fxOn(p, "lingot")) { g += 300; delete p.fx.lingot; }
    if (fxOn(p, "virus")) g = Math.round(g * 0.85);
    if (fxOn(p, "trounoir")) { g = 0; delete p.fx.trounoir; }
    return g;
  }

  /* Secondes ajoutées (+) ou retirées (−) au chrono de la question (s'ajoute à celles des autres pouvoirs). */
  function timeDelta(p) {
    var d = 0;
    if (fxOn(p, "horloge")) d += 15;
    if (fxOn(p, "tempete")) d -= 3;
    return d;
  }

  /* ---------- Écran vert / rouge : quel type, quel titre, quel pictogramme ? ---------- */
  var GOOD = "#86efac", BAD = "#fca5a5";
  function flashFor(text, color) {
    text = String(text == null ? "" : text);
    var c = String(color || "").toLowerCase();
    /* Miroir : le malus que tu as lancé te revient (jaune côté lanceur, mais c'est mauvais pour toi) / ton Miroir renvoie un malus (rouge côté cible, mais c'est bon pour toi) */
    if (c === "#facc15" && /te revient/i.test(text)) return { kind: "bad", title: "RENVOYÉ SUR TOI !", emoji: "🪞", sub: text };
    if (c === BAD && /miroir a renvoy/i.test(text)) return { kind: "good", title: "RENVOYÉ !", emoji: "🪞", sub: text };
    if (c !== GOOD && c !== BAD) return null;                 /* jaune = ce que tu as lancé aux autres : pas d'écran */
    var m = /^((?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*))/u.exec(text);
    var emoji = m ? m[1] : "";
    if (c === BAD) return { kind: "bad", title: "MALUS !", emoji: emoji || "💥", sub: text };
    if (/a bloqu[ée]|sans effet/i.test(text)) return { kind: "good", title: "BLOQUÉ !", emoji: /^🧱/u.test(text) ? "🧱" : "🛡️", sub: text };     /* un bonus « Armure » commence aussi par 🛡️ : ce n'est pas un blocage */
    return { kind: "good", title: "BONUS !", emoji: emoji || "🎁", sub: text };
  }

  return { DEFS: DEFS, IDS: IDS, BONUS_IDS: BONUS_IDS, MALUS_IDS: MALUS_IDS, NEG_PERSISTENT: NEG_PERSISTENT, POS_PERSISTENT: POS_PERSISTENT,
    bonusInstant: bonusInstant, malusInstant: malusInstant, gainAdjust: gainAdjust, timeDelta: timeDelta, flashFor: flashFor, fxOn: fxOn };
})();
if (typeof module !== "undefined" && module.exports) module.exports = V50Powers;

/* =============================================================================
   Branchement sur le jeu (navigateur uniquement)
   ============================================================================= */
(function V50Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof EXT_POWERS === "undefined" || typeof applyExtPower !== "function") return;
  var P = V50Powers;

  /* 1. les pouvoirs rejoignent les listes du jeu (tirage au sort à 3 choix, effets actifs, limite de 2 malus, purification…) */
  P.IDS.forEach(function (id) { if (!EXT_POWERS[id]) EXT_POWERS[id] = P.DEFS[id]; });
  P.BONUS_IDS.forEach(function (id) { if (EXT_IDS.bonus.indexOf(id) < 0) EXT_IDS.bonus.push(id); if (POWER_KINDS.bonus.indexOf(id) < 0) POWER_KINDS.bonus.push(id); });
  P.MALUS_IDS.forEach(function (id) { if (EXT_IDS.malus.indexOf(id) < 0) EXT_IDS.malus.push(id); if (POWER_KINDS.malus.indexOf(id) < 0) POWER_KINDS.malus.push(id); });
  P.NEG_PERSISTENT.forEach(function (id) { if (NEG_FX.indexOf(id) < 0) NEG_FX.push(id); });
  P.POS_PERSISTENT.forEach(function (id) { if (POS_FX.indexOf(id) < 0) POS_FX.push(id); });

  /* 2. effets immédiats : le jeu applique déjà bouclier / Miroir / Hérisson / limite de malus ; on agit ensuite sur la bonne personne */
  var baseApply = applyExtPower;
  applyExtPower = function (player, target, id, level) {
    var out = baseApply.apply(this, arguments);
    var d = P.DEFS[id];
    if (!d || !out || !d.instant) return out;
    try {
      var note = "";
      if (d.type === "bonus") note = P.bonusInstant(id, player);
      else if (!out.blocked) note = P.malusInstant(id, out.reflected ? player : target, out.reflected ? target : player);
      if (note) { out.note = (out.note || "") + note; out.msgSelf = (out.msgSelf || "") + note; if (out.msgTarget) out.msgTarget += note; }
    } catch (e) { if (window.console) console.error("V50 pouvoir", id, e); }
    return out;
  };

  /* 3. gains et chrono */
  var baseScore = applyScoreFx;
  applyScoreFx = function (p, pts, data) { return P.gainAdjust(p, baseScore.apply(this, arguments)); };
  var baseTime = fxTimeDelta;
  fxTimeDelta = function (p) { return Math.max(5, questionTime + baseTime(p) + P.timeDelta(p)) - questionTime; };

  /* 4. effets d'écran de la CIBLE : Séisme (l'écran tremble) et Éclipse (réponses cachées 3 s) */
  function clearUi() { document.body.classList.remove("v50-quake", "v50-eclipse"); }
  function applyUi() {
    clearUi();
    var me = typeof players !== "undefined" && players[myId];
    if (!me || !me.fx) return;
    void document.body.offsetWidth;                      /* relance l'animation à chaque question */
    if (P.fxOn(me, "seisme")) document.body.classList.add("v50-quake");
    if (P.fxOn(me, "eclipse")) document.body.classList.add("v50-eclipse");
  }
  var baseDisplay = displayQuestion;
  displayQuestion = function () { clearUi(); return baseDisplay.apply(this, arguments); };
  var baseStart = startTimer;
  startTimer = function () { var r = baseStart.apply(this, arguments); try { applyUi(); } catch (e) {} return r; };
  var baseShowScreen = showScreen;
  showScreen = function (id) { if (id !== "gameScreen") clearUi(); return baseShowScreen.apply(this, arguments); };

  /* 5. écran vert / rouge : tout ce que le jeu affiche dans le panneau de pouvoir passe par showPowerPanel */
  var reduced = function () { try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  var timer = 0;
  function flash(f) {
    var old = document.getElementById("v50Flash"); if (old) old.remove();
    clearTimeout(timer);
    var o = document.createElement("div");
    o.id = "v50Flash"; o.className = "v50-flash v50-" + f.kind + (reduced() ? " v50-calm" : "");
    o.setAttribute("role", "status"); o.setAttribute("aria-live", "assertive");
    var core = document.createElement("div"); core.className = "v50-core";
    var em = document.createElement("div"); em.className = "v50-emoji"; em.textContent = f.emoji;
    var ti = document.createElement("div"); ti.className = "v50-title"; ti.textContent = f.title;
    var su = document.createElement("div"); su.className = "v50-sub"; su.textContent = f.sub.length > 140 ? f.sub.slice(0, 137) + "…" : f.sub;
    core.appendChild(em); core.appendChild(ti); core.appendChild(su); o.appendChild(core);
    if (!reduced()) {
      var bits = f.kind === "good" ? ["✨", "⭐", "💚", "🎁", "✦"] : ["💥", "✖", "🔥", "⚡", "☠️"];
      for (var i = 0; i < 22; i++) {
        var s = document.createElement("span"); s.className = "v50-bit"; s.textContent = bits[i % bits.length];
        s.style.setProperty("--x", Math.round((i * 37 + 11) % 100) + "%");
        s.style.setProperty("--d", ((i * 0.11) % 1.1).toFixed(2) + "s");
        s.style.setProperty("--s", (0.8 + (i % 5) * 0.25).toFixed(2));
        o.appendChild(s);
      }
    }
    document.body.appendChild(o);
    if (f.kind === "bad") { try { navigator.vibrate && navigator.vibrate([90, 40, 90]); } catch (e) {} }
    timer = setTimeout(function () { if (o.parentNode) o.remove(); }, reduced() ? 1400 : 2600);
  }
  var basePanel = showPowerPanel;
  showPowerPanel = function (text, color) {
    var r = basePanel.apply(this, arguments);
    try { var f = P.flashFor(text, color); if (f) flash(f); } catch (e) { if (window.console) console.error("V50 écran", e); }
    return r;
  };
  window.V50Flash = { show: flash, flashFor: P.flashFor };
})();
