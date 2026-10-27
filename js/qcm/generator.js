/* ============================================================================
   GÉNÉRATEUR DE QCM À PARTIR D'UN TEXTE (cours PDF / ODT / DOCX / TXT déjà converti en texte)
   QcmGenerator.generate(texte, { count: 5..100, lang: "auto"|"fr"|"en"|"es", title, seed })
     → { questions: [{ question, answers[4], correct, difficulty, correction }], stats }

   Fonctionne 100 % dans le navigateur, sans serveur ni clé d'API : il repère
     1. les DÉFINITIONS    « La mitose est un type de division… »   → « Quel terme correspond à… ? »
     2. les DATES / CHIFFRES « La Bastille est prise en 1789 »       → phrase à compléter + faux chiffres plausibles
     3. les TERMES CLÉS     noms propres, sigles, mots importants    → phrase à compléter
   et choisit les fausses réponses parmi les autres termes du même document.
   Les questions sont réparties sur tout le document (pas seulement le début).
   ============================================================================ */
(function (root) {
  "use strict";

  var LIMITS = { question: 220, answer: 120, correction: 250 };
  var BLANK = "_____";

  /* ---------- Mots vides ---------- */
  function words(s) { return s.split(/\s+/); }
  var STOP = {
    fr: words("a à au aux avec ce ces cet cette ceci cela celui celle ceux celles ci comme comment dans de des du donc dont elle elles en encore entre est et eux il ils je la le les leur leurs lui ma mais me même mes moi mon ne nos notre nous on ou où par pas pour qu que quel quelle quels quelles qui sa sans se ses si son sur ta te tes toi ton tu un une vos votre vous y été être avoir fait faire peut peuvent plus moins très aussi alors ainsi après avant bien car chaque chez depuis entre être sont sera seront était étaient ont avait avaient soit sous tout tous toute toutes autre autres quand lorsque puis cependant pourtant selon vers lors être ici là déjà jamais toujours souvent parfois aucun aucune certains certaines plusieurs quelques afin ainsi quelque peu non oui ensuite quatre trois deux cinq six sept huit neuf dix premier première second seconde généralement souvent parfois toutefois notamment environ presque maintenant tandis parmi autant beaucoup trop assez enfin ainsi donc"),
    en: words("a about after all also an and any are as at be been before but by can could did do does for from had has have he her his how i if in into is it its may more most no not of on one or other our out over she should so some such than that the their them then there these they this those to under up was we were what when where which while who will with would you your"),
    es: words("a al algo ante aquel aquella aquellos aquí como con contra cual cuando de del desde donde durante el ella ellas ellos en entre era eran es esa ese eso esta estaba este esto estos fue fueron ha han hasta hay la las le les lo los más mas me mi mucho muy ni no nos nosotros o otra otro para pero poco por porque que quien se sea según ser si sido sin sobre son su sus también tan te tiene todo todos tu tus un una uno unos y ya yo")
  };
  var STOPSET = {};
  Object.keys(STOP).forEach(function (l) { var o = {}; STOP[l].forEach(function (w) { o[w] = true; }); STOPSET[l] = o; });

  var DETCLS = {
    fr: { le: "m", un: "m", ce: "m", cet: "m", son: "m", mon: "m", ton: "m", du: "m", au: "m", la: "f", une: "f", cette: "f", sa: "f", ma: "f", ta: "f",
          les: "p", des: "p", ces: "p", ses: "p", mes: "p", tes: "p", leurs: "p", nos: "p", vos: "p", aux: "p", l: "?", notre: "?", votre: "?", leur: "?", chaque: "?" },
    es: { el: "m", un: "m", este: "m", ese: "m", su: "?", mi: "?", tu: "?", la: "f", una: "f", esta: "f", esa: "f", los: "p", las: "p", unos: "p", unas: "p", estos: "p", estas: "p", sus: "p", mis: "p", cada: "?" },
    en: { the: "?", a: "?", an: "?", this: "?", that: "?", these: "p", those: "p", its: "?", their: "?", his: "?", her: "?", our: "?", your: "?", my: "?", some: "?", each: "?", every: "?" }
  };
  var VERB_END = /(?:[^m]ent|ons|ez|ait|aient|ais|ira|era|eront|ée|ées|és|er|ir|ing|ed)$/;

  var PROMPT = {
    fr: { fill: "Complète la phrase : « ", def: "Quel terme correspond à cette définition : « ", end: " » ?", fillEnd: " »", from: "Extrait du cours : « " },
    en: { fill: "Complete the sentence: “", def: "Which term matches this definition: “", end: "” ?", fillEnd: "”", from: "From the course: “" },
    es: { fill: "Completa la frase: «", def: "¿Qué término corresponde a esta definición: «", end: "»?", fillEnd: "»", from: "Del curso: «" }
  };
  PROMPT.en.end = "”?";

  /* ---------- Outils ---------- */
  function rngFrom(seed) {
    var x = (Number(seed) >>> 0) || 2463534242;
    return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function clip(s, n) { s = String(s).replace(/\s+/g, " ").trim(); if (s.length <= n) return s; var c = s.slice(0, n - 1); var k = c.lastIndexOf(" "); return (k > n * 0.6 ? c.slice(0, k) : c).replace(/[,;:\s]+$/, "") + "…"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function detectLang(text) {
    var counts = { fr: 0, en: 0, es: 0 };
    (text.toLowerCase().match(/[\p{L}']+/gu) || []).slice(0, 3000).forEach(function (w) {
      Object.keys(counts).forEach(function (l) { if (STOPSET[l][w]) counts[l]++; });
    });
    var best = "fr";
    Object.keys(counts).forEach(function (l) { if (counts[l] > counts[best]) best = l; });
    return best;
  }

  /* ---------- Nettoyage du texte extrait (PDF : lignes coupées, en-têtes, numéros de page) ---------- */
  function cleanBlocks(text) {
    var t = String(text || "").replace(/\r\n?/g, "\n").replace(/[\u00ad\u200b\ufeff]/g, "").replace(/\f/g, "\n\n");
    t = t.replace(/([\p{L}])-\n([\p{Ll}])/gu, "$1$2");                       /* césure : exem-\nple */
    t = t.replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, " ");
    var lines = t.split("\n").map(function (l) { return l.replace(/[ \t\u00a0]+/g, " ").trim(); });
    var freq = {};
    lines.forEach(function (l) { if (l) freq[l] = (freq[l] || 0) + 1; });
    lines = lines.filter(function (l) {
      if (!l) return true;
      if (/^(page\s*)?\d{1,4}(\s*(\/|sur|of)\s*\d{1,4})?$/i.test(l)) return false;     /* numéro de page */
      if (freq[l] >= 3 && l.length < 90) return false;                                  /* en-tête / pied de page répété */
      return true;
    });
    var blocks = [], cur = "";
    lines.forEach(function (l) {
      if (!l) { if (cur) blocks.push(cur); cur = ""; return; }
      var bullet = /^([•▪‣◦·\-–—*●]|\d{1,2}[.)]|[a-z][.)])\s+/.test(l);
      if (cur && !bullet && /^[\p{Ll}(]/u.test(l) && !/[.!?…]$/.test(cur)) cur += " " + l;      /* ligne qui continue */
      else { if (cur) blocks.push(cur); cur = bullet ? l.replace(/^([•▪‣◦·\-–—*●]|\d{1,2}[.)]|[a-z][.)])\s+/, "") : l; }
    });
    if (cur) blocks.push(cur);
    return blocks;
  }

  var ABBR = /(?:^|\s)(?:M|MM|Mme|Mlle|Dr|Pr|Prof|St|Ste|Mr|Mrs|Ms|vs|etc|cf|fig|p|pp|env|ex|av|apr|J\.-C|c\.-à-d|i\.e|e\.g|n°|sec|min|jan|janv|fév|avr|juil|sept|oct|nov|déc)\.$/i;
  function splitSentences(block) {
    var res = [], start = 0, re = /[.!?…]+["»”)]*\s+/g, m;
    while ((m = re.exec(block))) {
      var endTxt = m.index + m[0].replace(/\s+$/, "").length;
      var before = block.slice(start, endTxt), next = block.charAt(m.index + m[0].length);
      if (/^[A-ZÀ-ÝÇ«"“(0-9]/.test(next) && !ABBR.test(before) && !/(^|\s)\d{1,2}\.$/.test(before)) {
        res.push(before.trim()); start = m.index + m[0].length;
      }
    }
    res.push(block.slice(start).trim());
    return res.filter(Boolean);
  }

  /* ---------- Termes clés ---------- */
  var TOKEN = /[\p{L}][\p{L}\-]*/gu;
  function tokens(s) {
    var out = [], m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(s))) out.push({ w: m[0], i: m.index });
    return out;
  }
  function stem(w) { return norm(w).replace(/(s|x)$/, ""); }

  function buildTerms(sents, lang) {
    var stop = STOPSET[lang], det = DETCLS[lang], table = {};
    function add(surface, proper, sIdx, dcls) {
      var key = stem(surface);
      if (!key || key.length < 3) return;
      var t = table[key] || (table[key] = { key: key, forms: {}, tf: 0, proper: false, det: 0, cls: {}, sents: {}, wc: surface.split(/\s+/).length });
      t.tf++; t.forms[surface] = (t.forms[surface] || 0) + 1; t.sents[sIdx] = true;
      if (proper) t.proper = true;
      if (dcls !== undefined) { t.det++; if (dcls !== "?") t.cls[dcls] = true; }
    }
    sents.forEach(function (s, si) {
      var tk = tokens(s.text);
      for (var i = 0; i < tk.length; i++) {
        var w = tk[i].w, lw = w.toLowerCase();
        var isCap = /^[A-ZÀ-ÝÇ]/.test(w), allCaps = w.length >= 2 && w.length <= 8 && w === w.toUpperCase() && /[A-ZÀ-Ý]/.test(w);
        var prev = i > 0 ? tk[i - 1].w.toLowerCase() : "";
        if (allCaps && !stop[lw] && !/^[IVXLCDM]+$/.test(w)) { add(w, true, si); continue; }       /* sigles : ADN, ONU */
        if (isCap && i > 0 && !stop[lw]) {                                                            /* noms propres : « Louis XIV », « Mont Blanc » */
          var phrase = [w], j = i + 1;
          while (j < tk.length && phrase.length < 4) {
            var nw = tk[j].w;
            if (/^[A-ZÀ-ÝÇ]/.test(nw) || /^[IVXLC]+$/.test(nw)) { phrase.push(nw); j++; }
            else if (/^(de|du|des|of|the|la|le)$/i.test(nw) && j + 1 < tk.length && /^[A-ZÀ-ÝÇ]/.test(tk[j + 1].w)) { phrase.push(nw, tk[j + 1].w); j += 2; }
            else break;
          }
          add(phrase.join(" "), true, si); i = j - 1; continue;
        }
        if (!isCap && lw.length >= 6 && !stop[lw] && !/\d/.test(lw) && !VERB_END.test(lw)) {
          var d1 = det[prev];                                                                          /* mot précédé d'un article = presque sûrement un nom */
          add(lw, false, si, d1);
          var nx = tk[i + 1];                                                                          /* bigrammes : « chaîne alimentaire » */
          if (d1 !== undefined && nx && nx.w.length >= 4 && !stop[nx.w.toLowerCase()] && !VERB_END.test(nx.w.toLowerCase()) && !/^[A-ZÀ-ÝÇ]/.test(nx.w) && s.text.slice(tk[i].i + w.length, nx.i) === " ") add(lw + " " + nx.w.toLowerCase(), false, si, d1);
        }
      }
    });
    var list = [];
    Object.keys(table).forEach(function (k) {
      var t = table[k], best = Object.keys(t.forms).sort(function (a, b) { return t.forms[b] - t.forms[a]; })[0];
      t.text = best; t.nsents = Object.keys(t.sents).length;
      t.tier = (t.proper || (t.tf >= 3 && t.det >= 1)) ? "A" : "B";
      if (t.proper || (t.tf >= 2 && t.det >= 1)) list.push(t);
    });
    return list;
  }
  function termRegex(term) { return new RegExp("(^|[^\\p{L}\\p{N}])(" + esc(term) + ")(?![\\p{L}\\p{N}])", "u"); }

  /* ---------- Définitions ---------- */
  var DEF = {
    fr: /^(?:(?:les|le|la|une|un|des|ce|cette)\s+|l['’])?(.{3,60}?)\s+(?:(?:est|sont)\s+(?:(?:une|un|les|le|la|des)\s+|l['’]|défini[es]*\s+comme\s+|appelé[es]*\s+|considéré[es]*\s+comme\s+)|désigne[nt]*\s+|signifie[nt]*\s+|correspond(?:ent)?\s+à\s+|se\s+définit\s+(?:comme\s+)?|représente[nt]*\s+|consiste[nt]*\s+(?:à|en)\s+)(.+)$/iu,
    en: /^(?:(?:the|a|an)\s+)?(.{3,60}?)\s+(?:(?:is|are)\s+(?:an|a|the|defined\s+as|called|known\s+as)\s+|refers?\s+to\s+|means\s+|stands?\s+for\s+)(.+)$/iu,
    es: /^(?:(?:los|las|el|la|unos|unas|una|un)\s+)?(.{3,60}?)\s+(?:(?:es|son)\s+(?:unos|unas|una|un|los|las|el|la|definid[oa]s?\s+como|llamad[oa]s?)\s+|significa\s+|se\s+define\s+como\s+|se\s+llama\s+|designa\s+|consiste\s+en\s+)(.+)$/iu
  };
  var BAD_TERM_START = /^(il|elle|ils|elles|on|ce|cela|ceci|c['’]|ça|qui|que|ainsi|mais|donc|alors|lorsque|quand|si|car|puis|it|he|she|they|this|that|which|who|then|so|but|if|when|ello|esto|eso|que|pero|si|cuando)\b/i;

  function findDefinition(text, lang) {
    var m = DEF[lang].exec(text.replace(/[.!?…]+$/, ""));
    if (!m) {
      var g = /^([\p{Lu}][\p{L}'’\- ]{2,40}?)\s*[:–—]\s+(.{25,})$/u.exec(text);        /* glossaire « Terme : définition » */
      if (!g || /[,;()]/.test(g[1]) || g[1].split(/\s+/).length > 5) return null;
      m = g;
    }
    var term = m[1].trim(), def = m[2].trim().replace(/[.!?…]+$/, "");
    if (!term || BAD_TERM_START.test(term) || /[,;:()«»"“”]/.test(term) || term.split(/\s+/).length > 4 || term.length > 45) return null;
    var tw = tokens(term).filter(function (t) { return !STOPSET[lang][t.w.toLowerCase()]; });
    if (!tw.length) return null;
    var firstClause = def;
    if (def.length > 170) { var cut = def.search(/[;,]\s/); if (cut > 40) firstClause = def.slice(0, cut); }
    if (firstClause.length < 20 || firstClause.length > 175) return null;
    if (norm(firstClause).indexOf(norm(term)) >= 0) return null;                          /* définition circulaire */
    return { term: term.replace(/^(?:les|le|la|une|un|des|the|an|a|los|las|el)\s+/i, "").replace(/^l['’]/i, ""), def: firstClause };
  }

  /* ---------- Nombres et dates ---------- */
  var NUM = /(^|[^\p{L}\p{N},.])(\d{1,3}(?:[ \u00a0.]\d{3})+|\d+)(?:,(\d{1,3}))?(\s?(?:%|°C|km|m|cm|mm|kg|g|mg|l|ml|ans|jours|heures|minutes|secondes|euros|€|millions|milliards|habitants|mètres|kilomètres|siècles|fois|years|days|hours|million|billion|metres|años|días|horas)\b|%)?(?![\p{L}\p{N}])/gu;
  function findNumber(text) {
    var best = null, m;
    NUM.lastIndex = 0;
    while ((m = NUM.exec(text))) {
      var intTxt = m[2], dec = m[3], unit = (m[4] || "").trim();
      var before = text.slice(Math.max(0, m.index + m[1].length - 10), m.index + m[1].length).toLowerCase();
      if (/(^|\s)(fig|figure|tableau|page|chap|chapitre|partie|question|n°|§)\.?\s?$/i.test(before) || /\($/.test(before)) continue;     /* « figure 3 », « (1) » */
      var plain = intTxt.replace(/[ \u00a0.]/g, ""), val = Number(plain + (dec ? "." + dec : ""));
      if (!isFinite(val)) continue;
      var isYear = !dec && !unit && plain.length === 4 && val >= 1000 && val <= 2100;
      if (!isYear && !unit && val < 10) continue;                                          /* petits entiers sans unité : trop ambigus */
      var cand = { start: m.index + m[1].length, raw: text.slice(m.index + m[1].length, m.index + m[0].length), intTxt: intTxt, dec: dec || "", unit: unit, val: val, isYear: isYear, pct: /%/.test(unit) };
      if (!best || (cand.isYear && !best.isYear)) best = cand;
      if (best.isYear) break;
    }
    return best;
  }
  function formatLike(c, v) {
    var decimals = c.dec.length, sep = /[ \u00a0]/.test(c.intTxt) ? "\u00a0" : (/\./.test(c.intTxt) ? "." : "");
    var s = decimals ? v.toFixed(decimals) : String(Math.round(v));
    var parts = s.split("."), ip = parts[0];
    if (sep && !c.isYear) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return ip + (decimals ? "," + parts[1] : "") + (c.unit ? (/^%/.test(c.unit) ? "" : " ") + c.unit.replace(/^\s+/, "") : "");
  }
  function numberDistractors(c, rand, avoid) {
    var out = {}, v = c.val, list = [], cands = [];
    if (c.isYear) [-20, -10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, 20].forEach(function (d) { cands.push(v + d); });
    else if (c.pct) [-5, 5, -10, 10, -15, 15, -20, 20, -25, 25].forEach(function (d) { cands.push(v + d); });
    else if (v < 20 && !c.dec) [v * 2, v * 3, Math.round(v / 2), v + 5, v - 5, v + 10, v + 2, v + 3].forEach(function (x) { cands.push(x); });
    else [0.5, 0.75, 0.9, 1.1, 1.25, 1.5, 2, 3, 0.25, 10].forEach(function (f) { cands.push(v * f); });
    cands = cands.filter(function (x) { return x > 0 && isFinite(x) && x !== v && (!c.pct || x <= 100) && (!c.isYear || (x >= 1000 && x <= 2100)); });
    if (!c.dec && !c.isYear && v >= 100) cands = cands.map(function (x) { var p = Math.pow(10, Math.max(0, String(Math.round(Math.abs(x))).length - 2)); return Math.round(x / p) * p; });
    var good = formatLike(c, v);
    shuffle(cands, rand).forEach(function (x) {
      var f = formatLike(c, x), digits = f.replace(/\D/g, "");
      if (!out[f] && f !== good && !avoid[digits]) { out[f] = 1; list.push(f); }       /* jamais un chiffre déjà présent ailleurs dans la phrase */
    });
    return list.slice(0, 3);
  }

  /* ---------- Choix des fausses réponses parmi les autres termes ---------- */
  function shapeOf(t) { return /^[A-ZÀ-Ý]{2,8}$/.test(t) ? "acr" : (/^[A-ZÀ-ÝÇ]/.test(t) ? "cap" : "low"); }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function upperFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /* primary / secondary : listes de termes déjà classées par qualité.
     needCls : « m » « f » « p » si le blanc est précédé d'un article (le / la / les…) : la fausse réponse doit s'accorder. */
  function termDistractors(answerTerm, sentenceText, lists, rand, proper, needCls) {
    var ansNorm = norm(answerTerm), ansStem = ansNorm.slice(0, 5), sNorm = " " + norm(sentenceText) + " ";
    var wc = answerTerm.split(/\s+/).length, len = answerTerm.length;
    function ok(t, strict) {
      var n = norm(t.text);
      if (!n || n === ansNorm || n.slice(0, 5) === ansStem || ansNorm.indexOf(n) >= 0 || n.indexOf(ansNorm) >= 0) return false;
      if (sNorm.indexOf(" " + n + " ") >= 0) return false;
      if (t.text.length > LIMITS.answer) return false;
      if (needCls && !(t.cls && t.cls[needCls])) return false;
      if (t.proper && proper && (shapeOf(t.text) === "acr") !== (shapeOf(answerTerm) === "acr")) return false;   /* un sigle ne s'oppose pas à un nom de personne */
      if (strict && (!!t.proper !== !!proper || Math.abs(t.wc - wc) > 1 || t.text.length > len * 2 + 4 || t.text.length < len / 2 - 2)) return false;
      return true;
    }
    /* forme affichée : au pluriel si la phrase l'exige (« des _____ », réponse en -s), sinon au singulier */
    var wantPlural = needCls ? needCls === "p" : /[sx]$/i.test(answerTerm) && wc === 1;
    function shown(t) {
      if (t.proper || !t.forms) return t.text;
      var forms = Object.keys(t.forms).filter(function (f) { return wc > 1 && f.split(/\s+/).length > 1 ? true : (/[sx]$/i.test(f) === wantPlural); });
      if (!forms.length) return null;
      forms.sort(function (a, b) { return t.forms[b] - t.forms[a]; });
      return forms[0];
    }
    var picked = [], seen = {};
    function take(list, strict, agree) {
      var cand = list.filter(function (t) { return ok(t, strict) && (!agree || t.proper || shown(t)); });
      cand.sort(function (a, b) { return Math.abs(a.text.length - len) - Math.abs(b.text.length - len); });
      shuffle(cand.slice(0, 10), rand).forEach(function (t) {
        var k = norm(t.text);
        if (picked.length < 3 && !seen[k]) { seen[k] = 1; picked.push(t); }
      });
    }
    lists.forEach(function (l) { if (picked.length < 3) take(l, true, true); });
    lists.forEach(function (l) { if (picked.length < 3) take(l, false, true); });
    lists.forEach(function (l) { if (picked.length < 3 && !needCls) take(l, false, false); });
    if (picked.length < 3) return null;
    var startsLower = answerTerm.charAt(0) !== answerTerm.charAt(0).toUpperCase();
    return picked.map(function (t) {
      var txt = t.proper ? t.text : (shown(t) || t.text);
      return t.proper ? txt : (startsLower ? lowerFirst(txt) : upperFirst(txt));
    });
  }

  /* ---------- Génération ---------- */
  function lastWordBefore(text, index) {
    var m = /([\p{L}]+)(['’]?)\s*$/u.exec(text.slice(0, index));
    return m ? { w: m[1].toLowerCase(), elided: !!m[2] } : { w: "", elided: false };
  }

  function generate(text, options) {
    options = options || {};
    var count = Math.max(1, Math.min(100, Math.floor(Number(options.count) || 10)));
    var lang = options.lang && options.lang !== "auto" ? options.lang : detectLang(String(text || ""));
    if (!STOPSET[lang]) lang = "fr";
    var P = PROMPT[lang], rand = rngFrom(options.seed || Date.now());
    var title = String(options.title || "Cours").trim();

    var blocks = cleanBlocks(text), sents = [];
    blocks.forEach(function (b) {
      splitSentences(b).forEach(function (s) {
        if (s.length >= 35 && s.length <= 260 && words(s).length >= 6 && !/(.)\1{5,}/.test(s)) sents.push({ text: s, block: b });
      });
    });
    sents.forEach(function (s, i) { s.idx = i; s.pos = sents.length > 1 ? i / (sents.length - 1) : 0; });
    var stats = { characters: String(text || "").length, sentences: sents.length, lang: lang, requested: count, produced: 0, definitions: 0, numbers: 0, terms: 0 };
    if (sents.length < 3) { return { questions: [], stats: stats, warning: "Le texte est trop court ou illisible : aucune phrase exploitable trouvée." }; }

    var terms = buildTerms(sents, lang);
    var tfMax = 1;
    terms.forEach(function (t) { if (t.tf > tfMax) tfMax = t.tf; });
    var defTerms = [], cands = [];
    var termIndex = {};
    terms.forEach(function (t) { termIndex[t.key] = t; });
    function findTermsIn(text) {
      var tk = tokens(text), out = [], seen = {};
      for (var i = 0; i < tk.length; i++) {
        for (var n = 1; n <= 6 && i + n - 1 < tk.length; n++) {
          var j = i + n - 1;
          if (n > 1 && text.slice(tk[j - 1].i + tk[j - 1].w.length, tk[j].i) !== " ") break;
          var form = text.slice(tk[i].i, tk[j].i + tk[j].w.length), t = termIndex[stem(form)];
          if (t && !seen[t.key]) { seen[t.key] = 1; out.push({ t: t, form: form, index: tk[i].i }); }
        }
      }
      return out;
    }

    sents.forEach(function (s) {
      var fit = 1 - Math.min(1, Math.abs(s.text.length - 120) / 140), jitter = rand() * 0.6;
      /* 1. définition */
      var d = findDefinition(s.text, lang);
      if (d) {
        defTerms.push({ text: d.term, tf: 3, proper: /^[A-ZÀ-ÝÇ]/.test(d.term) && !/^[A-ZÀ-ÝÇ][a-zà-ÿ]+$/.test(d.term) ? true : false, wc: d.term.split(/\s+/).length, cls: {} });
        cands.push({ type: "def", s: s, d: d, score: 3.2 + fit + jitter, pos: s.pos });
        return;
      }
      /* 2. nombre ou date */
      var n = findNumber(s.text);
      if (n && s.text.length <= 200) cands.push({ type: "num", s: s, n: n, score: 2 + fit + (n.isYear ? 0.4 : 0) + jitter, pos: s.pos });
      /* 3. terme clé (nom, sigle, nom propre) */
      var best = null;
      findTermsIn(s.text).forEach(function (f) {
        var t = f.t, before = lastWordBefore(s.text, f.index);
        if (before.elided) return;                                                  /* « l'_____ » : l'élision révélerait la réponse */
        var cls = DETCLS[lang][before.w];
        var w = (1 + Math.log(t.tf)) * (t.proper ? 1.3 : 1) * (t.wc > 1 ? 1.15 : 1);
        if (!best || w > best.w) best = { t: t, w: w, form: f.form, needCls: (cls && cls !== "?") ? cls : "" };
      });
      if (best && s.text.length <= 200) cands.push({ type: "term", s: s, t: best.t, form: best.form, needCls: best.needCls, score: 1 + fit + best.w / (1 + Math.log(tfMax)) + jitter, pos: s.pos });
    });

    /* sélection répartie sur tout le document, une seule question par phrase */
    cands.sort(function (a, b) { return b.score - a.score; });
    var picked = [], used = {};
    if (cands.length <= count) {
      cands.forEach(function (c) { if (!used[c.s.idx]) { used[c.s.idx] = 1; picked.push(c); } });
    } else {
      for (var b = 0; b < count; b++) {
        var lo = b / count, hi = (b + 1) / count;
        for (var k = 0; k < cands.length; k++) {
          var c0 = cands[k];
          if (!used[c0.s.idx] && c0.pos >= lo && (c0.pos < hi || (b === count - 1 && c0.pos <= 1))) { used[c0.s.idx] = 1; picked.push(c0); break; }
        }
      }
      cands.forEach(function (c) { if (picked.length < count && !used[c.s.idx]) { used[c.s.idx] = 1; picked.push(c); } });
    }
    /* quelques réserves au cas où certaines candidates échouent à trouver 3 fausses réponses */
    var reserve = cands.filter(function (c) { return picked.indexOf(c) < 0; });

    var tierA = terms.filter(function (t) { return t.tier === "A"; }), tierB = terms.filter(function (t) { return t.tier === "B"; });
    var seenQ = {}, questions = [];

    function build(c) {
      var q = null;
      if (c.type === "def") {
        var dist = termDistractors(c.d.term, c.s.text, [defTerms, tierA, tierB], rand, !!(/^[A-ZÀ-ÝÇ]/.test(c.d.term) && c.d.term.split(/\s+/).length > 1), "");
        if (dist) q = { question: P.def + c.d.def + P.end, answer: cap(c.d.term), wrong: dist.map(cap), difficulty: "moyen", kind: "definitions" };
      } else if (c.type === "num") {
        var avoid = {};
        (c.s.text.match(/\d[\d  .]*/g) || []).forEach(function (x) { avoid[x.replace(/\D/g, "")] = 1; });
        var nd = numberDistractors(c.n, rand, avoid);
        if (nd.length === 3) {
          var blanked = c.s.text.slice(0, c.n.start) + BLANK + c.s.text.slice(c.n.start + c.n.raw.length);
          q = { question: P.fill + blanked + P.fillEnd, answer: formatLike(c.n, c.n.val), wrong: nd, difficulty: c.n.isYear ? "difficile" : "moyen", kind: "numbers" };
        }
      } else {
        var dist2 = termDistractors(c.form, c.s.text, [tierA, tierB], rand, c.t.proper, c.needCls);
        if (dist2) {
          var g = new RegExp("(^|[^\\p{L}\\p{N}])(" + esc(c.form) + ")(?![\\p{L}\\p{N}])", "gu");
          var blankedS = c.s.text.replace(g, function (m0, pre) { return pre + BLANK; });
          q = { question: P.fill + blankedS + P.fillEnd, answer: c.form, wrong: dist2, difficulty: c.t.tf >= 4 ? "facile" : (c.t.tf >= 3 ? "moyen" : "difficile"), kind: "terms" };
        }
      }
      if (!q || q.question.length > LIMITS.question || q.answer.length > LIMITS.answer || !q.answer) return false;
      if (c.type !== "def" && words(q.question.replace(BLANK, " ")).length < 8) return false;
      var all = [q.answer].concat(q.wrong), seen = {};
      for (var i = 0; i < all.length; i++) { var kk = norm(all[i]) || all[i]; if (seen[kk]) return false; seen[kk] = 1; }
      var nq = norm(q.question);
      if (seenQ[nq]) return false; seenQ[nq] = 1;
      var correctIndex = Math.floor(rand() * 4), answers = q.wrong.slice();
      answers.splice(correctIndex, 0, q.answer);
      questions.push({
        question: q.question, answers: answers, correct: correctIndex, difficulty: q.difficulty,
        correction: clip(P.from + c.s.text + (lang === "en" ? "”" : lang === "es" ? "»" : " »"), LIMITS.correction),
        kind: q.kind, category: title, _pos: c.pos
      });
      stats[q.kind]++;
      return true;
    }
    picked.forEach(build);
    for (var r = 0; r < reserve.length && questions.length < count; r++) if (!used[reserve[r].s.idx]) { used[reserve[r].s.idx] = 1; build(reserve[r]); }
    questions.sort(function (a, b) { return a._pos - b._pos; });
    questions.forEach(function (q) { delete q._pos; });
    stats.produced = questions.length;
    var res = { questions: questions, stats: stats };
    if (questions.length < count) res.warning = questions.length ? "Le document ne permet de générer que " + questions.length + " question(s) de qualité sur les " + count + " demandées." : "Aucune question exploitable : le texte est peut-être un scan (image) ou trop pauvre en phrases complètes.";
    return res;
  }

  var QcmGenerator = { generate: generate, detectLang: detectLang, cleanBlocks: cleanBlocks, splitSentences: splitSentences, LIMITS: LIMITS };
  root.QcmGenerator = QcmGenerator;
  if (typeof module !== "undefined" && module.exports) module.exports = QcmGenerator;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
