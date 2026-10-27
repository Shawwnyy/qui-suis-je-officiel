/* ============================================================================
   MODÉRATION STRICTE — moteur de détection
   Utilisation :  Moderation.check(texte)  →  { blocked, reason, label, match }
                  Moderation.strike(idJoueur) → { count, muteMs, level }

   Ce que le moteur fait avant de comparer au lexique :
   - lit le message BRUT (retours à la ligne conservés) ;
   - supprime les caractères invisibles, les accents, les marques combinantes ;
   - remplace les lettres « déguisées » (Unicode pleine largeur, ⓑⓘⓣⓔ, 🇧🇮🇹🇪, cyrillique/grec) ;
   - décode le leet : b1t3, p@ute, sh!t, c0nnard ;
   - gère les mots étirés : biiiite, fuuuck ;
   - gère les mots censurés : f*ck, p*tain ;
   - détecte les lettres isolées : « B I T E », « b.i.t.e », ou une lettre par ligne ;
   - bloque d'office tout texte « vertical » (3 lignes courtes ou plus).
   Pour éviter les faux positifs (« continent », « salopette », « habite », « Moby Dick »…),
   les mots courts ne sont bloqués que s'ils sont entiers.
   ============================================================================ */
(function (root) {
  "use strict";

  var LEX = root.ModerationLexicon || (typeof require === "function" ? require("./lexicon.js") : null);
  if (!LEX) throw new Error("ModerationLexicon manquant : charger lexicon.js avant moderation.js");

  var MAX_ANALYZE = 400;          /* nombre max de caractères analysés */
  var RUN_SINGLES = 6;            /* 6 lettres isolées d'affilée = bloqué (« L M M J V S » reste possible jusqu'à 5) */
  var VERTICAL_LINES = 3;         /* 3 lignes courtes d'affilée = texte vertical, bloqué */
  var WINDOW_MAX_TOKENS = 16;
  var WINDOW_MAX_LETTERS = 14;
  var STRIKE_DECAY_MS = 10 * 60 * 1000;

  /* ---------- Outils ---------- */
  function toSet(list) { var o = Object.create(null); list.forEach(function (w) { o[w] = true; }); return o; }
  var EXACT = toSet(LEX.exact);
  var STOP = toSet(LEX.stopwords);
  var ROOTS = LEX.roots.slice();
  var FULL = {};                  /* tous les mots complets, rangés par longueur */
  var FULLSET = Object.create(null);
  LEX.exact.concat(LEX.roots).forEach(function (w) {
    if (FULLSET[w]) return;
    FULLSET[w] = true;
    (FULL[w.length] = FULL[w.length] || []).push(w);
  });
  function squash3(s) { return s.replace(/(.)\1{2,}/g, "$1"); }   /* aaa… → a  (étirement) */
  function squashAll(s) { return s.replace(/(.)\1+/g, "$1"); }    /* aa → a */
  var ROOTS_SQ = ROOTS.filter(function (r) { return squashAll(r).length >= 6; }).map(squashAll);

  /* ---------- Normalisation ---------- */
  var INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ︀-️﻿]/g;
  var MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g;
  var HOMO = {
    /* cyrillique */ "а": "a", "в": "b", "е": "e", "ё": "e", "к": "k", "м": "m", "н": "h", "о": "o", "р": "p", "с": "c",
    "т": "t", "у": "y", "х": "x", "ѕ": "s", "і": "i", "ї": "i", "ј": "j", "һ": "h", "ԁ": "d", "ԛ": "q", "ԝ": "w", "ӏ": "i",
    /* grec */ "α": "a", "β": "b", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x",
    /* lettres spéciales */ "ß": "ss", "æ": "ae", "œ": "oe", "ø": "o", "đ": "d", "ł": "l", "ı": "i"
  };
  function mapChar(ch) {
    var cp = ch.codePointAt(0);
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) return String.fromCharCode(97 + cp - 0x1F1E6);   /* 🇧 🇮 🇹 🇪 */
    if (cp >= 0x1F130 && cp <= 0x1F149) return String.fromCharCode(97 + cp - 0x1F130);   /* 🄱 carrés */
    if (cp >= 0x1F150 && cp <= 0x1F169) return String.fromCharCode(97 + cp - 0x1F150);   /* 🅑 ronds noirs */
    if (cp >= 0x1F170 && cp <= 0x1F189) return String.fromCharCode(97 + cp - 0x1F170);   /* 🅱 carrés noirs */
    if (cp >= 0xE0000 && cp <= 0xE01EF) return "";                                        /* caractères « tag » invisibles */
    return HOMO[ch] || ch;
  }
  function prep(raw) {
    /* les suites d'espaces sont compressées avant la coupe : on ne peut pas « cacher » un mot loin dans le message */
    var s = String(raw == null ? "" : raw).replace(/\s+/g, function (m) { return /[\r\n\u0085\u2028\u2029]/.test(m) ? "\n" : " "; }).slice(0, MAX_ANALYZE);
    try { s = s.normalize("NFKC"); } catch (e) { /* vieux navigateur */ }
    s = s.replace(INVISIBLE, "").toLowerCase();
    try { s = s.normalize("NFD"); } catch (e) { /* vieux navigateur */ }
    s = s.replace(MARKS, "");
    var out = "";
    Array.from(s).forEach(function (ch) { out += mapChar(ch); });
    /* l'apostrophe est supprimée : « j'ai » → « jai », « it's » → « its » (évite de fabriquer des lettres isolées) */
    return out.replace(/[’‘ʼ'`´]/g, "");
  }

  var LEET_SYM = { "@": "a", "$": "s", "!": "i", "|": "i", "¡": "i", "€": "e", "£": "l", "§": "s", "¢": "c" };
  var LEET_DIG = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g" };
  function leetSymbols(s) {
    /* un symbole entouré de lettres/chiffres est lu comme une lettre : p@ute, sh!t, b!te */
    return s.replace(/([a-z0-9])([@$!|¡€£§¢])(?=[a-z0-9])/g, function (m, a, b) { return a + LEET_SYM[b]; });
  }
  function leetToken(tok, oneIsL) {
    if (!/[a-z]/.test(tok)) {
      /* un chiffre isolé peut être une lettre épelée : « b 1 t e » */
      if (tok.length === 1) return oneIsL && tok === "1" ? "l" : (LEET_DIG[tok] || tok);
      return tok;
    }
    return tok.replace(/[0-9]/g, function (d) { return d === "1" && oneIsL ? "l" : (LEET_DIG[d] || d); });
  }

  /* ---------- Détection ---------- */
  function ambiguousSkip(word, tokenSet) {
    var amb = LEX.ambiguous[word];
    if (!amb) return false;
    return amb.some(function (m) { return tokenSet[m]; });
  }

  function wordHit(w, tokenSet) {
    var s3 = squash3(w), forms = [w];
    if (s3 !== w) forms.push(s3);
    if (w.length >= 6 && /^(?:(.)\1)+$/.test(w)) forms.push(w.replace(/(.)\1/g, "$1"));   /* bbiittee */
    forms.slice().forEach(function (f) { if (f.length > 4 && /[sxz]$/.test(f)) forms.push(f.slice(0, -1)); });
    var i, f, r;
    for (i = 0; i < forms.length; i++) {
      f = forms[i];
      if (EXACT[f] && !ambiguousSkip(f, tokenSet)) return f;
    }
    for (i = 0; i < ROOTS.length; i++) {
      r = ROOTS[i];
      if (w.indexOf(r) >= 0 || s3.indexOf(r) >= 0) return r;
    }
    var all = squashAll(w);
    for (i = 0; i < ROOTS_SQ.length; i++) if (all.indexOf(ROOTS_SQ[i]) >= 0) return ROOTS_SQ[i];
    return "";
  }

  function wildcardHit(tok) {
    /* mot censuré : f*ck, sh*t, p*tain */
    if (tok.indexOf("*") < 0 || tok.length < 4) return "";
    var stars = (tok.match(/\*/g) || []).length;
    if (stars > 3 || tok.length - stars < 2) return "";
    var cand = FULL[tok.length];
    if (!cand) return "";
    for (var i = 0; i < cand.length; i++) {
      var w = cand[i], ok = true;
      for (var k = 0; k < tok.length; k++) { if (tok[k] !== "*" && tok[k] !== w[k]) { ok = false; break; } }
      if (ok) return w;
    }
    return "";
  }

  function fullHit(joined, tokenSet) {
    var s3 = squash3(joined);
    var forms = s3 === joined ? [joined] : [joined, s3];
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      if (FULLSET[f] && !ambiguousSkip(f, tokenSet)) return f;
    }
    for (var j = 0; j < ROOTS.length; j++) if (joined.indexOf(ROOTS[j]) >= 0 || s3.indexOf(ROOTS[j]) >= 0) return ROOTS[j];
    return "";
  }

  /* lettres espacées : une fenêtre de petits morceaux dont l'assemblage forme un mot interdit.
     Si le morceau est réparti sur plusieurs lignes, la fenêtre est plus tolérante : un message
     multi-ligne est déjà suspect. */
  function windowHit(toks, tokenSet) {
    var n = toks.length;
    for (var i = 0; i < n; i++) {
      var joined = "", singles = 0, longIdx = -1, hasStop = false, lines = {}, nLines = 0, count = 0;
      for (var j = i; j < n && j < i + WINDOW_MAX_TOKENS; j++) {
        var t = toks[j].t, len = t.length, li = toks[j].line;
        var nl = nLines + (lines[li] ? 0 : 1);
        if (len > (nl > 1 ? 7 : 4)) break;
        if (nl <= 1) {
          if (len > 2) { if (longIdx !== -1) break; longIdx = j; }
          else if (longIdx !== -1 && longIdx !== i) break;
        }
        if (!lines[li]) { lines[li] = 1; nLines = nl; }
        joined += t; count++;
        if (len === 1) singles++;
        if (len <= 3 && STOP[t]) hasStop = true;
        if (count >= 2 && joined.length >= 3 && joined.length <= WINDOW_MAX_LETTERS) {
          /* « j'ai pu te dire » → « pute », « JO d'été » → « jodete » : sans lettre isolée ni saut de ligne,
             seuls les mots longs (7 lettres et plus) sont recollés */
          if (singles >= 1 || nLines > 1 || (joined.length >= 7 && !hasStop)) {
            var w = fullHit(joined, tokenSet);
            if (w) return { word: w, text: joined };
          }
        }
        if (nLines <= 1 && longIdx !== -1 && longIdx !== i) break;
      }
    }
    return null;
  }

  function singleRun(toks) {
    var run = 0;
    for (var i = 0; i < toks.length; i++) {
      if (/^[a-z]$/.test(toks[i].o)) { run++; if (run >= RUN_SINGLES) return true; }
      else run = 0;
    }
    return false;
  }

  function verticalText(lines) {
    var run = 0;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\s+/g, "");
      if (!l) continue;                                       /* ligne vide : ignorée */
      if (!/[a-z0-9]/.test(l)) continue;                      /* ligne de ponctuation : ignorée */
      if (l.length <= 2 && /[a-z]/.test(l)) { run++; if (run >= VERTICAL_LINES) return true; }
      else run = 0;
    }
    return false;
  }

  function buildTokens(text, oneIsL) {
    var toks = [], lines = text.split(/\r\n|[\r\n\u0085\u2028\u2029\u000B\u000C]/);
    lines.forEach(function (line, li) {
      line.split(/[^a-z0-9]+/).forEach(function (raw) {
        if (raw) toks.push({ t: leetToken(raw, oneIsL), o: raw, line: li });
      });
    });
    return toks;
  }

  function phraseHit(toks) {
    var flat = " " + toks.map(function (k) { return squash3(k.t); }).join(" ") + " ";
    var compact = toks.map(function (k) { return k.t; }).join("");
    for (var i = 0; i < LEX.phrases.length; i++) {
      var p = LEX.phrases[i];
      if (flat.indexOf(" " + p + " ") >= 0) return p;
      var pc = p.replace(/ /g, "");
      if (pc.length >= 9 && compact.indexOf(pc) >= 0) return p;
    }
    return "";
  }

  var LABELS = {
    insulte: "langage interdit",
    phrase: "expression interdite",
    lettres_separees: "lettres séparées pour contourner le filtre",
    texte_vertical: "texte écrit lettre par lettre sur plusieurs lignes"
  };
  function verdict(reason, match) { return { blocked: true, reason: reason, label: LABELS[reason], match: match || "" }; }

  function analyzeVariant(text, oneIsL) {
    var toks = buildTokens(text, oneIsL);
    var tokenSet = Object.create(null);
    toks.forEach(function (k) { tokenSet[k.t] = true; });

    var w = windowHit(toks, tokenSet);
    if (w) return verdict("lettres_separees", w.word);
    if (singleRun(toks)) return verdict("lettres_separees", "");

    var i, h;
    for (i = 0; i < toks.length; i++) {
      h = wordHit(toks[i].t, tokenSet);
      if (h && LEX.followSkip && LEX.followSkip[h] && toks[i + 1] && LEX.followSkip[h].indexOf(toks[i + 1].t) >= 0) h = "";
      if (h) return verdict("insulte", h);
    }
    /* mots censurés avec * (on garde l'étoile dans le mot) */
    var starToks = text.replace(/\r\n|[\r\n\u0085\u2028\u2029]/g, " ").split(/[^a-z0-9*]+/);
    for (i = 0; i < starToks.length; i++) {
      if (starToks[i].indexOf("*") >= 0) {
        h = wildcardHit(leetToken(starToks[i].replace(/\*/g, "*"), false));
        if (h) return verdict("insulte", h);
      }
    }
    h = phraseHit(toks);
    if (h) return verdict("phrase", h);
    return null;
  }

  function check(raw, options) {
    options = options || {};
    var text = prep(raw);
    if (!text.trim()) return { blocked: false, reason: "", label: "", match: "" };

    if (options.vertical !== false && verticalText(text.split(/\r\n|[\r\n\u0085\u2028\u2029\u000B\u000C]/))) {
      return verdict("texte_vertical", "");
    }
    /* deux lectures : symboles lus comme lettres (p@ute) et symboles lus comme séparateurs (b!i!t!e) */
    var variants = [text, leetSymbols(text)];
    var oneIsL = [false];
    if (/1/.test(text)) oneIsL.push(true);
    for (var a = 0; a < variants.length; a++) {
      for (var b = 0; b < oneIsL.length; b++) {
        var v = analyzeVariant(variants[a], oneIsL[b]);
        if (v) return v;
      }
    }
    return { blocked: false, reason: "", label: "", match: "" };
  }

  /* ---------- Sanctions progressives (côté hôte) ---------- */
  var strikes = Object.create(null);
  function strike(id) {
    var now = Date.now(), s = strikes[id] || (strikes[id] = { n: 0, last: 0 });
    if (now - s.last > STRIKE_DECAY_MS) s.n = 0;
    s.n++; s.last = now;
    var ms = s.n >= 4 ? 15 * 60000 : s.n === 3 ? 5 * 60000 : s.n === 2 ? 60000 : 0;
    return { count: s.n, muteMs: ms, level: ms ? "mute" : "warn" };
  }
  function resetStrikes(id) { if (id == null) strikes = Object.create(null); else delete strikes[id]; }

  /* ---------- Épellation répartie sur plusieurs messages (b / i / t / e) ----------
     Un message ne contient qu'une ou deux lettres : le filtre « message par message » ne voit rien.
     On garde donc, pour chaque expéditeur, ses derniers « morceaux » (1 ou 2 caractères) sur 30 secondes,
     même si d'autres messages normaux sont intercalés, et on analyse les lettres mises bout à bout.
       · les morceaux forment un mot interdit  → bannissement ;
       · 3 lettres isolées différentes (ou plus) en 30 s → bannissement (contournement évident) ;
       · 3 lettres isolées seulement 2 à 2 différentes (« a b a ») → message supprimé + avertissement.                                              */
  var SEQ_WINDOW_MS = 30000, SEQ_KEEP = 10;
  var seqState = Object.create(null);
  function pieceOf(raw) {
    var t = prep(raw), letters = "", n = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (c >= "a" && c <= "z") { letters += c; n++; }
      else if (LEET_DIG[c]) { letters += LEET_DIG[c]; n++; }
      else if (c >= "0" && c <= "9") { n++; }
    }
    /* au-delà de deux caractères, ce n'est plus un morceau ; un nombre seul (compte à rebours 3, 2, 1) n'en est pas un */
    if (n < 1 || n > 2 || !/[a-z]/.test(t)) return null;
    return { letters: letters, single: n === 1 };
  }
  function sequence(id, raw, now, mid) {
    now = now || Date.now();
    var ok = { blocked: false, ban: false, reason: "", label: "", run: [], letters: "" };
    if (id == null) return ok;
    var list = (seqState[id] || []).filter(function (e) { return now - e.t <= SEQ_WINDOW_MS; });
    var pc = pieceOf(raw);
    if (!pc) { if (list.length) seqState[id] = list; else delete seqState[id]; return ok; }
    list.push({ t: now, letters: pc.letters, single: pc.single, mid: mid == null ? "" : String(mid) });
    if (list.length > SEQ_KEEP) list = list.slice(list.length - SEQ_KEEP);
    seqState[id] = list;
    /* mots interdits formés par les k derniers morceaux (k = 2…8) */
    for (var k = 2; k <= Math.min(list.length, 8); k++) {
      var tail = list.slice(list.length - k), joined = tail.map(function (e) { return e.letters; }).join("");
      if (joined.length < 3) continue;
      var v = check(joined, { vertical: false });
      if (v.blocked) {
        return { blocked: true, ban: true, reason: "epellation", label: "mot interdit épelé en plusieurs messages", run: tail.map(function (e) { return e.mid; }), letters: joined, word: v.label || "" };
      }
    }
    var singles = list.filter(function (e) { return e.single; });
    var distinct = Object.create(null); singles.forEach(function (e) { distinct[e.letters] = true; });
    var nd = Object.keys(distinct).length;
    if (singles.length >= 3 && nd >= 3) {
      return { blocked: true, ban: true, reason: "epellation", label: "message épelé lettre par lettre", run: singles.map(function (e) { return e.mid; }), letters: singles.map(function (e) { return e.letters; }).join("") };
    }
    if (singles.length >= 3 && nd >= 2) {   /* 3 lettres dont 2 seulement différentes (« a b a ») : message supprimé + avertissement */
      return { blocked: true, ban: false, reason: "epellation", label: "message épelé lettre par lettre", run: singles.map(function (e) { return e.mid; }), letters: singles.map(function (e) { return e.letters; }).join("") };
    }
    return ok;
  }
  function resetSequence(id) { if (id == null) seqState = Object.create(null); else delete seqState[id]; }

  var Moderation = {
    version: "2.1",
    sequence: sequence,
    resetSequence: resetSequence,
    check: check,
    strike: strike,
    resetStrikes: resetStrikes,
    label: function (reason) { return LABELS[reason] || LABELS.insulte; },
    _prep: prep
  };
  root.Moderation = Moderation;
  if (typeof module !== "undefined" && module.exports) module.exports = Moderation;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
