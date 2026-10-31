/* =============================================================================
   V63 — 🎆 Bruit de FEU D'ARTIFICE à chaque réponse (bonne ou mauvaise) et grand feu d'artifice final, avec étincelles à l'écran.
   • Le son est synthétisé (sifflement qui monte → explosion sourde → crépitement), aucune ressource externe :
       bonne réponse = tir complet en 2 bouquets · mauvaise réponse = petit tir « raté », plus grave · fin de partie = salve de 10 tirs + final.
   • Étincelles dessinées sur un canvas (désactivées si le système demande « moins d'animations ») ; secousse + vibration sur une erreur.
   • Respecte le bouton « Son ON/OFF » ; un bouton « 🎆 Effets » coupe les étincelles et la vibration.
   La recette sonore est pure (V63Fx.plan, testée par tests/fireworks.test.js) ; le reste est la colle navigateur.
   ============================================================================= */
var V63Fx = (function () {
  "use strict";
  function rng32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* un tir : sifflement (montée de fréquence) → explosion (bruit grave + choc) → crépitement */
  function shot(at, o, rng) {
    var j = function (v) { return v * (0.9 + 0.2 * rng()); };
    return [
      { k: "whistle", at: at, f0: j(o.f0), f1: j(o.f1), dur: o.rise, vol: o.vw },
      { k: "boom", at: at + o.rise, f: j(o.boomF), dur: o.boomD, vol: o.vb },
      { k: "crackle", at: at + o.rise + 0.04, n: o.n, span: o.span, vol: o.vc }
    ];
  }
  var KINDS = {
    correct: { shots: [0, 0.85], f0: 520, f1: 1900, rise: 0.42, boomF: 380, boomD: 0.55, vb: 0.2, vw: 0.035, n: 16, span: 0.9, vc: 0.05 },
    wrong: { shots: [0], f0: 320, f1: 900, rise: 0.3, boomF: 220, boomD: 0.4, vb: 0.13, vw: 0.03, n: 6, span: 0.5, vc: 0.03 }
  };
  function plan(kind, rng) {
    rng = typeof rng === "function" ? rng : Math.random;
    var out = [], i;
    if (kind === "finale") {
      var t = 0;
      for (i = 0; i < 10; i++) {
        out = out.concat(shot(t, { f0: 480 + rng() * 200, f1: 1500 + rng() * 700, rise: 0.35 + rng() * 0.15, boomF: 300 + rng() * 150, boomD: 0.6, vb: 0.19, vw: 0.03, n: 14, span: 0.8, vc: 0.045 }, rng));
        t += Math.max(0.25, 0.7 - i * 0.05) + rng() * 0.15;
      }
      for (i = 0; i < 3; i++) out = out.concat(shot(t + i * 0.12, { f0: 450, f1: 1800, rise: 0.4, boomF: 260, boomD: 0.9, vb: 0.26, vw: 0.035, n: 28, span: 1.4, vc: 0.055 }, rng));
    } else {
      var K = KINDS[kind] || KINDS.correct;
      K.shots.forEach(function (s) { out = out.concat(shot(s, K, rng)); });
    }
    return out.sort(function (a, b) { return a.at - b.at; });
  }
  function duration(p) { return (p || []).reduce(function (m, e) { return Math.max(m, e.at + (e.dur || e.span || 0)); }, 0); }
  /* gerbes visuelles : { at (ms), x, y (0..1), hue, n, speed, size } */
  function bursts(kind, rng) {
    rng = typeof rng === "function" ? rng : Math.random;
    var out = [], i, n;
    if (kind === "wrong") return [{ at: 0, x: 0.5, y: 0.35, hue: 20, n: 26, speed: 3.2, size: 2 }];
    if (kind === "finale") { for (i = 0; i < 14; i++) out.push({ at: Math.round(i * 380 + rng() * 150), x: 0.12 + rng() * 0.76, y: 0.12 + rng() * 0.45, hue: Math.round(rng() * 360), n: 50 + Math.round(rng() * 30), speed: 5 + rng() * 3, size: 2.4 }); return out; }
    for (i = 0; i < 3; i++) out.push({ at: i * 190, x: 0.2 + rng() * 0.6, y: 0.15 + rng() * 0.4, hue: Math.round(rng() * 360), n: 44, speed: 5 + rng() * 2, size: 2.2 });
    return out;
  }
  var api = { plan: plan, duration: duration, bursts: bursts, rng32: rng32, KINDS: KINDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

(function V63Glue() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined" || typeof soundCorrect !== "function" || typeof soundWrong !== "function" || typeof soundVictory !== "function") return;
  var V = V63Fx; window.V63Fx = V;
  var KEY = "quizV63Fx", effects = true, noise = null, parts = [], raf = 0, cv = null, g = null, last = 0, MAXP = 700;
  try { effects = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  var reduce = false; try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}

  /* ---- son ---- */
  function noiseBuf(ctx) {
    if (noise && noise.sampleRate === ctx.sampleRate) return noise;
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }
  function sound(kind) {
    if (typeof soundEnabled !== "undefined" && !soundEnabled) return false;
    try {
      initAudio();
      var ctx = audioContext; if (!ctx) return false;
      var p = V.plan(kind), t0 = ctx.currentTime + 0.03, out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      p.forEach(function (e) {
        var t = t0 + e.at, gn = ctx.createGain(), o, f, s, i;
        if (e.k === "whistle") {
          o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(e.f0, t); o.frequency.exponentialRampToValueAtTime(e.f1, t + e.dur);
          gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(e.vol, t + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, t + e.dur);
          o.connect(gn); gn.connect(out); o.start(t); o.stop(t + e.dur + 0.03);
        } else if (e.k === "boom") {
          s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(e.f * 2.2, t); f.frequency.exponentialRampToValueAtTime(e.f * 0.5, t + e.dur);
          gn.gain.setValueAtTime(e.vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + e.dur);
          s.connect(f); f.connect(gn); gn.connect(out); s.start(t); s.stop(t + e.dur + 0.03);
          o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(e.f * 0.5, t); o.frequency.exponentialRampToValueAtTime(40, t + e.dur * 0.7);
          var g2 = ctx.createGain(); g2.gain.setValueAtTime(e.vol * 0.9, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + e.dur * 0.7);
          o.connect(g2); g2.connect(out); o.start(t); o.stop(t + e.dur);
        } else if (e.k === "crackle") {
          for (i = 0; i < e.n; i++) {
            var tt = t + Math.random() * e.span, k = 1 - (i / e.n) * 0.6, hp = ctx.createBiquadFilter(), gg = ctx.createGain(), b = ctx.createBufferSource();
            hp.type = "highpass"; hp.frequency.value = 2500 + Math.random() * 3500;
            gg.gain.setValueAtTime(e.vol * k, tt); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03);
            b.buffer = noiseBuf(ctx); b.connect(hp); hp.connect(gg); gg.connect(out); b.start(tt, Math.random() * 0.8, 0.03);
          }
        }
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---- étincelles ---- */
  function ensureCanvas() {
    if (cv) return true;
    cv = document.createElement("canvas"); cv.id = "v63Fx"; cv.setAttribute("aria-hidden", "true"); cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:21800;display:none";
    document.body.appendChild(cv); g = cv.getContext && cv.getContext("2d"); return !!g;
  }
  function size() { var d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); g.setTransform(d, 0, 0, d, 0, 0); }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, innerWidth, innerHeight); g.globalCompositeOperation = "lighter";
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.12; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
      var a = Math.max(0, p.life / p.ttl); g.fillStyle = "hsla(" + p.h + ",100%," + (55 + 25 * a) + "%," + a.toFixed(2) + ")"; g.beginPath(); g.arc(p.x, p.y, p.s * (0.5 + a), 0, 6.283); g.fill();
    }
    if (parts.length) raf = requestAnimationFrame(frame); else { raf = 0; g.clearRect(0, 0, innerWidth, innerHeight); cv.style.display = "none"; }
  }
  function explode(b) {
    if (!ensureCanvas()) return;
    size(); cv.style.display = "block";
    var cx = b.x * innerWidth, cy = b.y * innerHeight;
    for (var i = 0; i < b.n && parts.length < MAXP; i++) {
      var ang = Math.random() * 6.283, sp = b.speed * (0.35 + Math.random() * 0.65), ttl = 0.9 + Math.random() * 0.9;
      parts.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: ttl, ttl: ttl, h: (b.hue + Math.random() * 40 - 20 + 360) % 360, s: b.size });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function visual(kind) {
    if (!effects || reduce) return;
    V.bursts(kind).forEach(function (b) { setTimeout(function () { try { explode(b); } catch (e) {} }, b.at); });
  }
  function shake() {
    if (!effects || reduce) return;
    var s = document.querySelector(".screen.active"); if (!s) return;
    s.classList.remove("v63-shake"); void s.offsetWidth; s.classList.add("v63-shake"); setTimeout(function () { s.classList.remove("v63-shake"); }, 520);
  }
  function buzz(p) { if (effects) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} } }

  var baseC = soundCorrect, baseW = soundWrong, baseV = soundVictory;
  soundCorrect = function () { visual("correct"); buzz([25]); if (!sound("correct")) return baseC.apply(this, arguments); };
  soundWrong = function () { visual("wrong"); shake(); buzz([70, 40, 70]); if (!sound("wrong")) return baseW.apply(this, arguments); };
  soundVictory = function () { visual("finale"); buzz([40, 30, 40, 30, 120]); if (!sound("finale")) return baseV.apply(this, arguments); };

  /* ---- bouton « 🎆 Effets » à côté du bouton Son ---- */
  function mountToggle() {
    var s = document.getElementById("soundToggle"); if (!s || document.getElementById("v63FxToggle")) return;
    var b = document.createElement("button"); b.type = "button"; b.id = "v63FxToggle"; b.className = s.className; b.title = "Étincelles, secousse et vibration"; b.setAttribute("aria-pressed", String(effects));
    var paint = function () { b.textContent = effects ? "🎆 Effets ON" : "🎆 Effets OFF"; b.setAttribute("aria-pressed", String(effects)); };
    paint(); b.addEventListener("click", function () { effects = !effects; try { localStorage.setItem(KEY, effects ? "1" : "0"); } catch (e) {} paint(); if (effects) { visual("correct"); sound("correct"); } });
    s.insertAdjacentElement("afterend", b);
  }
  mountToggle(); document.addEventListener("DOMContentLoaded", mountToggle);
  window.V63Glue = { sound: sound, visual: visual, parts: function () { return parts.length; }, effects: function () { return effects; } };
})();
