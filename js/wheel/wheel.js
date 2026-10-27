/* =============================================================================
   V45 — Roue des bonus et malus

   À certains moments de la partie (après la 3e, la 6e, la 9e… manche, jamais après la dernière), une roue tourne entre deux questions.
   • Tous les joueurs tirent leur propre case en même temps : l'hôte tire au sort pour chacun (8 cases, toutes équiprobables) puis diffuse le résultat.
   • Chaque joueur voit la roue s'arrêter sur SA case, puis la liste des résultats de tous.
   • Les effets sont appliqués par l'hôte uniquement (score, ×2, bouclier, série) ; un bouclier déjà obtenu annule un malus.
   • La question suivante démarre juste après la roue.
   La logique (due / pick / apply / plan) n'a pas besoin du DOM : testable avec Node (tests/wheel.test.js).
   ============================================================================= */
var V45Wheel = (function () {
  "use strict";
  var TOTAL_MS = 9500, SPIN_MS = 4600;
  var SEGMENTS = [
    { k: "xp", ch: "bonus", icon: "💎", label: "+300", color: "#16a34a" },
    { k: "xp", ch: "malus", icon: "💸", label: "−200", color: "#dc2626" },
    { k: "double", ch: "bonus", icon: "⚡", label: "×2", color: "#22c55e" },
    { k: "freeze", ch: "malus", icon: "💔", label: "Série", color: "#b91c1c" },
    { k: "jackpot", ch: "bonus", icon: "💰", label: "+1000", color: "#eab308" },
    { k: "tax", ch: "malus", icon: "🏛️", label: "−15 %", color: "#ef4444" },
    { k: "shield", ch: "bonus", icon: "🛡️", label: "Bouclier", color: "#15803d" },
    { k: "crush", ch: "malus", icon: "💥", label: "−500", color: "#991b1b" }
  ];
  var AMOUNT = { xp: { bonus: 300, malus: 200 }, jackpot: { bonus: 1000 }, crush: { malus: 500 } };

  /* Faut-il lancer la roue avant la question suivante ? « done » = manches terminées. */
  function due(done, total) { return Number.isInteger(done) && Number.isInteger(total) && done >= 3 && done % 3 === 0 && done < total; }
  function rng() {
    try { if (typeof crypto !== "undefined" && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } } catch (e) {}
    return Math.random();
  }
  function pick(rnd) { var i = Math.floor((rnd || rng)() * SEGMENTS.length); return i >= 0 ? Math.min(SEGMENTS.length - 1, i) : 0; }   /* NaN et négatifs → case 0 */
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function pts(n) { return (n < 0 ? "−" : "+") + Math.abs(n) + " point" + (Math.abs(n) > 1 ? "s" : ""); }

  /* Applique la case à un joueur (objet simple). Renvoie { seg, ch, kind, amount, blocked, text }. */
  function apply(p, si) {
    var s = SEGMENTS[si], out = { seg: si, ch: s.ch, kind: s.k, amount: 0, blocked: false, text: "" };
    p.score = num(p.score);
    if (s.ch === "bonus") {
      if (s.k === "xp" || s.k === "jackpot") { out.amount = AMOUNT[s.k].bonus; p.score += out.amount; p.bonusPoints = num(p.bonusPoints) + out.amount; out.text = pts(out.amount) + (s.k === "jackpot" ? " (jackpot !)" : ""); }
      else if (s.k === "double") { p.doubleNext = true; out.text = "Points ×2 sur la prochaine question"; }
      else if (s.k === "shield") { p.shield = true; out.text = "Bouclier : bloque le prochain malus"; }
      p.bonusesGiven = num(p.bonusesGiven) + 1;
      return out;
    }
    if (p.shield) { p.shield = false; out.blocked = true; out.text = "Bouclier utilisé : malus annulé"; return out; }
    if (s.k === "freeze") { out.text = num(p.combo) > 0 ? "Série de bonnes réponses brisée" : "Série brisée (tu n'en avais pas)"; p.combo = 0; p.powerGrantedCombo = 0; }
    else {
      var want = s.k === "tax" ? Math.floor(Math.max(0, p.score) * 0.15) : AMOUNT[s.k].malus;
      out.amount = Math.min(want, Math.max(0, p.score)); p.score -= out.amount; p.malusPoints = num(p.malusPoints) + out.amount;
      out.text = out.amount ? pts(-out.amount) : "Rien à perdre (score à 0)";
    }
    p.malusesReceived = num(p.malusesReceived) + 1;
    return out;
  }
  /* Tirage et application pour tous les joueurs actifs. */
  function plan(players, skip, rnd) {
    var res = [];
    Object.keys(players || {}).forEach(function (id) {
      var p = players[id]; if (!p || typeof p !== "object" || (skip && skip[id])) return;
      var r = apply(p, pick(rnd));
      res.push({ id: String(id), name: String(p.name || "Joueur").slice(0, 24), avatar: String(p.avatar || "🎮").slice(0, 8), seg: r.seg, ch: r.ch, kind: r.kind, amount: r.amount, blocked: r.blocked, text: r.text });
    });
    return res;
  }
  /* Message reçu du réseau : tout est borné et converti avant affichage. */
  function clean(d) {
    if (!d || !Array.isArray(d.results)) return null;
    var res = d.results.slice(0, 60).map(function (r) {
      r = r || {}; var si = Math.round(num(r.seg));
      return { id: String(r.id == null ? "" : r.id).slice(0, 64), name: String(r.name || "Joueur").slice(0, 24), avatar: String(r.avatar || "🎮").slice(0, 8), seg: si >= 0 && si < SEGMENTS.length ? si : 0, ch: r.ch === "malus" ? "malus" : "bonus", amount: Math.max(0, Math.min(99999, Math.round(num(r.amount)))), blocked: !!r.blocked, text: String(r.text || "").slice(0, 80) };
    });
    return res.length ? { id: Math.round(num(d.id)), results: res } : null;
  }

  var api = { SEGMENTS: SEGMENTS, TOTAL_MS: TOTAL_MS, due: due, pick: pick, apply: apply, plan: plan, clean: clean };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window === "undefined" || typeof document === "undefined") return api;
  window.V45Wheel = api;

  /* ---------- Interface ---------- */
  var timers = [], ROT = 0;
  function $(id) { return document.getElementById(id); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function polar(r, deg) { var a = deg * Math.PI / 180; return [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)]; }
  function wheelSvg() {
    var n = SEGMENTS.length, st = 360 / n, h = '<svg class="v45-wheel" viewBox="-104 -104 208 208" aria-hidden="true"><g class="v45-rot">';
    SEGMENTS.forEach(function (s, i) {
      var a = polar(100, i * st - st / 2), b = polar(100, i * st + st / 2);
      h += '<path d="M0 0L' + a[0] + " " + a[1] + "A100 100 0 0 1 " + b[0] + " " + b[1] + 'Z" fill="' + s.color + '" stroke="#0f1024" stroke-width="1.5"/>';
      h += '<g transform="rotate(' + (i * st) + ')"><text y="-68" text-anchor="middle" font-size="17">' + s.icon + '</text><text y="-50" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">' + s.label.replace("&", "&amp;") + "</text></g>";
    });
    return h + '</g><circle r="9" fill="#0f1024" stroke="#fff" stroke-width="2"/></svg>';
  }
  function build() {
    var o = $("v45Wheel"); if (o) return o;
    o = document.createElement("div"); o.id = "v45Wheel"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Roue des bonus et malus");
    o.innerHTML = '<div class="v45-card"><div class="v45-title">🎡 Roue des bonus / malus</div><div class="v45-stage"><div class="v45-pointer"></div>' + wheelSvg() +
      '</div><div class="v45-status" aria-live="polite"></div><ul class="v45-list"></ul><button type="button" class="v45-close">OK</button></div>';
    o.querySelector(".v45-close").addEventListener("click", hide);
    document.body.appendChild(o); return o;
  }
  function hide() { timers.forEach(clearTimeout); timers = []; var o = $("v45Wheel"); if (o) o.classList.remove("show"); }
  function show(d) {
    var ev = clean(d); if (!ev) return;
    var o = build(), rot = o.querySelector(".v45-rot"), stat = o.querySelector(".v45-status"), list = o.querySelector(".v45-list"), btn = o.querySelector(".v45-close");
    timers.forEach(clearTimeout); timers = [];
    var me = null; ev.results.forEach(function (r) { if (typeof myId !== "undefined" && r.id === String(myId)) me = r; });
    var target = me || ev.results[0], reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    rot.style.transition = "none"; rot.style.transform = "rotate(" + (ROT % 360) + "deg)"; list.textContent = ""; btn.style.display = "none";
    stat.className = "v45-status"; stat.textContent = "La roue tourne…";
    o.classList.add("show"); void rot.getBoundingClientRect();
    ROT = Math.floor(ROT / 360) * 360 + 360 * (reduce ? 1 : 5) + ((360 - target.seg * (360 / SEGMENTS.length)) % 360) + (Math.random() * 24 - 12);
    later(function () { rot.style.transition = "transform " + (reduce ? 600 : SPIN_MS) + "ms cubic-bezier(.12,.7,.1,1)"; rot.style.transform = "rotate(" + ROT + "deg)"; }, 250);
    later(function () {
      var s = SEGMENTS[target.seg];
      stat.className = "v45-status " + target.ch;
      stat.textContent = (me ? "Ton résultat : " : target.name + " : ") + s.icon + " " + target.text;
      ev.results.forEach(function (r) {
        var li = document.createElement("li"); li.className = r.ch + (r.blocked ? " blocked" : "") + (me && r === me ? " me" : "");
        var a = document.createElement("span"); a.className = "v45-who"; a.textContent = r.avatar + " " + r.name;
        var b = document.createElement("span"); b.className = "v45-what"; b.textContent = SEGMENTS[r.seg].icon + " " + r.text;
        li.appendChild(a); li.appendChild(b); list.appendChild(li);
      });
      btn.style.display = "";
    }, 250 + (reduce ? 700 : SPIN_MS + 150));
    later(hide, TOTAL_MS);
  }

  /* ---------- Hôte : lancer la roue avant la question suivante ---------- */
  var pending = false, lastSpin = -1, token = 0, seq = 0;
  function run() {
    var skip = (typeof excludedOnHost === "object" && excludedOnHost) || null;
    var results = plan(players, skip);
    if (!results.length) return false;
    var ev = { type: "v45Wheel", id: ++seq, round: currentQuestionIndex, results: results };
    try { broadcastPlayers(); } catch (e) {}
    try { broadcast(ev); } catch (e) {}
    show(ev); return true;
  }
  if (typeof sendNextQuestion === "function") {
    var baseNext = sendNextQuestion;
    sendNextQuestion = function (first) {
      if (!isHost || !gameStarted || first) return baseNext.apply(this, arguments);
      if (currentQuestionIndex < 3) lastSpin = -1;
      if (pending) return;                                   /* un appel en double pendant la roue : le bon appel part à la fin de la roue */
      if (due(currentQuestionIndex, totalRounds) && lastSpin !== currentQuestionIndex) {
        var self = this, args = arguments, my = ++token, ok = false;
        lastSpin = currentQuestionIndex;
        try { ok = run(); } catch (e) { if (window.console) console.error("V45Wheel", e); }
        if (ok) {
          pending = true;
          setTimeout(function () { if (my !== token) return; pending = false; if (!isHost || !gameStarted) return; baseNext.apply(self, args); }, TOTAL_MS);
          return;
        }
      }
      return baseNext.apply(this, arguments);
    };
  }
  function cancel() { token++; pending = false; hide(); }
  if (typeof finishGame === "function") { var baseFinish = finishGame; finishGame = function () { cancel(); return baseFinish.apply(this, arguments); }; }
  if (typeof resetConnection === "function") { var baseReset = resetConnection; resetConnection = function () { cancel(); return baseReset.apply(this, arguments); }; }

  /* ---------- Joueurs : réception ---------- */
  if (typeof handleData === "function") {
    var baseHandle = handleData;
    handleData = function (data) {
      if (data && data.type === "v45Wheel") { if (!isHost) show(data); return; }
      if (data && (data.type === "nextQuestion" || data.type === "gameStart")) hide();
      return baseHandle.apply(this, arguments);
    };
  }
  return api;
})();
