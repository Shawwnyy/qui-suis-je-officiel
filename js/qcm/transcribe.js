/* ============================================================================
   TRANSCRIPTION AUDIO / VIDÉO → TEXTE
   QcmTranscribe.fromMedia(file, { lang, quality, phpUrl, serverStt, code, onStatus, abort }) → Promise<{ text, via, seconds }>

   Deux voies :
   1. Serveur (si php/qcm.php est configuré avec une clé de transcription) : rapide et précis, le fichier est envoyé au serveur.
   2. Navigateur (par défaut, gratuit, rien ne quitte l'appareil) : le son est décodé par le navigateur puis transcrit par le modèle
      Whisper de transformers.js (WebAssembly). Le premier usage télécharge le modèle (≈ 40 à 80 Mo, ensuite en cache).
      Les sons très longs sont lents : compte plusieurs minutes pour 30 minutes de cours.
   Formats lisibles : tout ce que le navigateur sait décoder (MP3, WAV, M4A/AAC, OGG/Opus, FLAC, et la piste son de MP4 / WebM / MOV).
   ============================================================================ */
(function (root) {
  "use strict";

  var CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";
  var MODELS = { fast: "Xenova/whisper-tiny", precise: "Xenova/whisper-base" };
  var LANGS = { fr: "french", en: "english", es: "spanish" };
  var RATE = 16000, WINDOW_S = 28;
  var MAX_BYTES = 300 * 1024 * 1024, MAX_SECONDS = 90 * 60;

  function err(code, message) { var e = new Error(message); e.code = code; return e; }

  /* ---------- Fonctions pures (testées avec Node) ---------- */
  /* AudioBuffer-like → Float32Array mono à 16 kHz. */
  function toMono16k(buf) {
    var n = buf.length, ch = buf.numberOfChannels, mono = new Float32Array(n), c, i;
    for (c = 0; c < ch; c++) { var d = buf.getChannelData(c); for (i = 0; i < n; i++) mono[i] += d[i] / ch; }
    if (buf.sampleRate === RATE) return mono;
    var ratio = buf.sampleRate / RATE, outLen = Math.floor(n / ratio), out = new Float32Array(outLen);
    for (i = 0; i < outLen; i++) {
      var pos = i * ratio, i0 = Math.floor(pos), i1 = Math.min(n - 1, i0 + 1), f = pos - i0;
      out[i] = mono[i0] * (1 - f) + mono[i1] * f;
    }
    return out;
  }
  function windows(samples, seconds) {
    var size = Math.floor((seconds || WINDOW_S) * RATE), out = [];
    for (var s = 0; s < samples.length; s += size) out.push(samples.subarray(s, Math.min(samples.length, s + size)));
    return out;
  }
  /* Une fenêtre quasi silencieuse n'est pas envoyée au modèle (évite les phrases inventées). */
  function isSilent(chunk) {
    var sum = 0, step = 16, cnt = 0;
    for (var i = 0; i < chunk.length; i += step) { sum += chunk[i] * chunk[i]; cnt++; }
    return cnt === 0 || Math.sqrt(sum / cnt) < 0.004;
  }
  /* Whisper répète parfois la même phrase ou ajoute des mentions de fin : on nettoie. */
  function cleanTranscript(parts) {
    var out = [], last = "";
    parts.forEach(function (p) {
      var t = String(p || "").replace(/\s+/g, " ").trim();
      if (!t || /^[\s.\-–…♪]*$/.test(t)) return;
      if (/^(\[?(musique|music|applaudissements)\]?|sous-titr\w+ (par|by|la communauté).*|merci d'avoir regardé.*|thanks for watching.*)$/i.test(t)) return;
      if (t === last) return;
      out.push(t); last = t;
    });
    return out.join(" ").replace(/([.!?…])\s+(?=[A-ZÀ-Ý«"])/g, "$1\n").trim();
  }

  /* ---------- Décodage du son par le navigateur ---------- */
  function decode(file) {
    var Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return Promise.reject(err("UNSUPPORTED", "Ce navigateur ne sait pas décoder le son. Essaie un navigateur récent (Chrome, Edge, Firefox, Safari)."));
    return file.arrayBuffer().then(function (ab) {
      var ctx;
      try { ctx = new Ctx({ sampleRate: RATE }); } catch (e) { ctx = new Ctx(); }
      return new Promise(function (resolve, reject) {
        var done = false;
        function ok(buf) { if (done) return; done = true; try { ctx.close(); } catch (e) {} resolve(buf); }
        function ko() { if (done) return; done = true; try { ctx.close(); } catch (e) {} reject(err("DECODE", "Impossible de lire le son de ce fichier (format ou codec non pris en charge par ton navigateur). Convertis-le en MP3 ou WAV, ou utilise un serveur configuré pour la transcription.")); }
        try { var p = ctx.decodeAudioData(ab, ok, ko); if (p && p.then) p.then(ok, ko); } catch (e) { ko(); }
      });
    });
  }

  /* ---------- Modèle Whisper (chargé une seule fois par qualité) ---------- */
  var pipes = {};
  function loadPipeline(quality, onStatus) {
    var key = MODELS[quality] ? quality : "fast";
    if (pipes[key]) return pipes[key];
    pipes[key] = import(CDN).then(function (tf) {
      if (tf.env) { tf.env.allowLocalModels = false; }
      var last = 0;
      return tf.pipeline("automatic-speech-recognition", MODELS[key], {
        progress_callback: function (p) {
          if (!onStatus || !p) return;
          if (p.status === "progress" && typeof p.progress === "number" && Date.now() - last > 400) { last = Date.now(); onStatus("Téléchargement du modèle de transcription… " + Math.round(p.progress) + " % (une seule fois)"); }
          else if (p.status === "initiate" || p.status === "download") onStatus("Préparation du modèle de transcription…");
        }
      });
    }).catch(function (e) {
      delete pipes[key];
      throw err("CDN", "Impossible de charger le modèle de transcription (connexion ? navigateur trop ancien ?)." + (e && e.message ? " " + e.message : ""));
    });
    return pipes[key];
  }

  /* ---------- Voie navigateur ---------- */
  function inBrowser(file, o) {
    var say = o.onStatus || function () {};
    say("Lecture du son de « " + file.name + " »…");
    return decode(file).then(function (buf) {
      var seconds = Math.round(buf.duration || buf.length / buf.sampleRate), samples = toMono16k(buf), truncated = false;
      if (samples.length > MAX_SECONDS * RATE) { samples = samples.subarray(0, MAX_SECONDS * RATE); truncated = true; }
      if (isSilent(samples)) throw err("EMPTY", "Aucune parole détectée dans ce fichier (son quasi silencieux).");
      return loadPipeline(o.quality, say).then(function (asr) {
        var wins = windows(samples), parts = [], i = 0, t0 = Date.now();
        var opts = { task: "transcribe", chunk_length_s: 30 };
        if (LANGS[o.lang]) opts.language = LANGS[o.lang];
        function next() {
          if (o.abort && o.abort.cancelled) throw err("ABORT", "Transcription annulée.");
          if (i >= wins.length) return { text: cleanTranscript(parts), via: "whisper (navigateur)", seconds: seconds, truncated: truncated };
          var w = wins[i], idx = i; i++;
          var elapsed = (Date.now() - t0) / 1000, left = idx ? Math.round(elapsed / idx * (wins.length - idx)) : 0;
          say("Transcription… " + Math.round(idx / wins.length * 100) + " % (" + (idx + 1) + "/" + wins.length + (left ? ", encore ≈ " + (left > 90 ? Math.round(left / 60) + " min" : left + " s") : "") + ")");
          if (isSilent(w)) return next();
          return Promise.resolve(asr(w, opts)).then(function (r) { parts.push(Array.isArray(r) ? r.map(function (x) { return x.text; }).join(" ") : (r && r.text)); return next(); });
        }
        return next();
      });
    });
  }

  /* ---------- Voie serveur ---------- */
  function onServer(file, o) {
    (o.onStatus || function () {})("Envoi du fichier au serveur pour transcription… (cela peut prendre quelques minutes)");
    var fd = new FormData();
    fd.append("file", file, file.name);
    if (o.lang && o.lang !== "auto") fd.append("lang", o.lang);
    var headers = {}; if (o.code) headers["X-Access-Code"] = o.code;
    return fetch(o.phpUrl + (o.phpUrl.indexOf("?") < 0 ? "?" : "&") + "action=transcribe", { method: "POST", body: fd, headers: headers }).then(function (r) {
      return r.json().catch(function () { throw err("SERVER", "Réponse du serveur illisible."); }).then(function (j) { return { status: r.status, j: j }; });
    }).then(function (x) {
      if (!x.j || !x.j.ok) { var e = err(x.status === 401 ? "AUTH" : "SERVER", (x.j && x.j.error) || "Le serveur n'a pas pu transcrire ce fichier."); e.status = x.status; throw e; }
      return { text: x.j.text || "", via: "serveur", seconds: x.j.seconds || 0 };
    });
  }

  function fromMedia(file, options) {
    var o = options || {};
    if (!file) return Promise.reject(err("NOFILE", "Aucun fichier choisi."));
    if (file.size > MAX_BYTES) return Promise.reject(err("SIZE", "Fichier trop volumineux (300 Mo maximum). Extrais le son (MP3) pour le réduire."));
    if (o.serverStt && o.phpUrl) {
      return onServer(file, o).catch(function (e) {
        if (e && (e.code === "AUTH" || e.status === 401)) throw e;
        (o.onStatus || function () {})("Le serveur n'a pas pu transcrire, essai dans le navigateur…");
        return inBrowser(file, o);
      });
    }
    return inBrowser(file, o);
  }

  var QcmTranscribe = { fromMedia: fromMedia, toMono16k: toMono16k, windows: windows, isSilent: isSilent, cleanTranscript: cleanTranscript, MAX_BYTES: MAX_BYTES, MAX_SECONDS: MAX_SECONDS, RATE: RATE, _CDN: CDN };
  root.QcmTranscribe = QcmTranscribe;
  if (typeof module !== "undefined" && module.exports) module.exports = QcmTranscribe;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
