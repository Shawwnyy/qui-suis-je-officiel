/* =============================================================================
   QMedia — questions avec image ou vidéo YouTube

   Un média de question est un objet simple, vérifié avant stockage et avant affichage :
     { type:"image",   url:"https://…" | "data:image/jpeg;base64,…" }
     { type:"youtube", id:"dQw4w9WgXcQ", start:0 }
     { type:"svg",     svg:"<svg …>…</svg>" }          (illustrations générées par le jeu)

   Sécurité : aucune chaîne venant d'un autre joueur n'est insérée en HTML. Les images passent par <img>
   (liens https ou petites images intégrées), les vidéos par un <iframe> dont l'adresse est reconstruite
   à partir d'un identifiant de 11 caractères, les illustrations SVG par <img src="data:image/svg+xml">
   (aucun script ne s'y exécute) après filtrage.
   ============================================================================= */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.QMedia = api;
})(typeof window !== "undefined" ? window : null, function (root) {
  "use strict";

  var YT_ID = /^[A-Za-z0-9_-]{11}$/;
  var MAX_URL = 600;
  var MAX_DATA_URL = 170000;      /* ~125 Ko d'image : reste raisonnable dans un message réseau et dans localStorage */
  var MAX_SVG = 30000;
  var DATA_IMG = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  var SVG_TAGS = { svg: 1, g: 1, defs: 1, lineargradient: 1, radialgradient: 1, stop: 1, rect: 1, circle: 1, ellipse: 1,
    path: 1, line: 1, polyline: 1, polygon: 1, text: 1, tspan: 1, clippath: 1, title: 1 };

  function str(v) { return typeof v === "string" ? v.trim() : ""; }

  /* ---------- YouTube ---------- */
  function parseTime(t) {
    if (t == null || t === "") return 0;
    t = String(t);
    if (/^\d+$/.test(t)) return Math.min(parseInt(t, 10), 86400);
    var m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(t);
    if (!m || (!m[1] && !m[2] && !m[3])) return 0;
    return Math.min((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0), 86400);
  }
  /* Accepte youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /live/ID, m.youtube.com, un identifiant seul. */
  function parseYouTube(input) {
    var s = str(input);
    if (!s || s.length > MAX_URL) return null;
    if (YT_ID.test(s)) return { id: s, start: 0 };
    var u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch (e) { return null; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    var host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    var id = "";
    if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
    else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      var parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "watch") id = u.searchParams.get("v") || "";
      else if (/^(embed|shorts|live|v)$/.test(parts[0] || "")) id = parts[1] || "";
    }
    if (!YT_ID.test(id)) return null;
    var start = parseTime(u.searchParams.get("start") || u.searchParams.get("t") || (u.hash.indexOf("t=") === 1 ? u.hash.slice(3) : ""));
    return { id: id, start: start };
  }

  /* ---------- Images ---------- */
  function cleanImageUrl(input) {
    var s = str(input);
    if (!s) return "";
    if (/^data:/i.test(s)) return s.length <= MAX_DATA_URL && DATA_IMG.test(s) ? s : "";
    if (s.length > MAX_URL) return "";
    var u;
    try { u = new URL(s); } catch (e) { return ""; }
    if (u.protocol !== "https:" || !u.hostname || u.username || u.password) return "";
    return u.href;
  }

  /* ---------- SVG généré ---------- */
  function cleanSvg(s) {
    s = str(s);
    if (!s || s.length > MAX_SVG || !/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return "";
    if (/<!|<\?|javascript:|\bon[a-z]+\s*=|<\s*(script|foreignobject|image|iframe|a|style|use|animate|set)\b/i.test(s)) return "";
    if (/(?:xlink:)?href\s*=\s*["'](?!#)/i.test(s)) return "";
    var tags = s.match(/<\/?\s*([A-Za-z][A-Za-z0-9:-]*)/g) || [];
    for (var i = 0; i < tags.length; i++) {
      var name = tags[i].replace(/^<\/?\s*/, "").toLowerCase();
      if (!SVG_TAGS[name]) return "";
    }
    return s;
  }

  /* ---------- Normalisation ---------- */
  function normalize(m) {
    if (!m) return null;
    if (typeof m === "string") {
      var yt0 = parseYouTube(m);
      if (yt0 && /youtu/i.test(m)) return { type: "youtube", id: yt0.id, start: yt0.start };
      var img0 = cleanImageUrl(m);
      return img0 ? { type: "image", url: img0 } : null;
    }
    if (typeof m !== "object") return null;
    if (m.type === "youtube") {
      var p = parseYouTube(m.id || m.url);
      return p ? { type: "youtube", id: p.id, start: m.start != null ? parseTime(m.start) : p.start } : null;
    }
    if (m.type === "image") {
      var url = cleanImageUrl(m.url);
      return url ? { type: "image", url: url } : null;
    }
    if (m.type === "svg") {
      var svg = cleanSvg(m.svg);
      return svg ? { type: "svg", svg: svg } : null;
    }
    return null;
  }
  /* Saisie d'un utilisateur : un lien (image ou YouTube). Renvoie { media } ou { error }. */
  function fromInput(text) {
    var s = str(text);
    if (!s) return { media: null };
    if (/youtu/i.test(s)) {
      var y = parseYouTube(s);
      return y ? { media: { type: "youtube", id: y.id, start: y.start } } : { error: "Lien YouTube non reconnu (colle l'adresse de la vidéo, par ex. https://youtu.be/…)." };
    }
    if (/^http:\/\//i.test(s)) return { error: "Le lien de l'image doit commencer par https:// (les liens http ne s'affichent pas sur un site sécurisé)." };
    var url = cleanImageUrl(s);
    return url ? { media: { type: "image", url: url } } : { error: "Lien non reconnu : colle l'adresse d'une image (https://…) ou d'une vidéo YouTube." };
  }
  function label(m) {
    return !m ? "" : m.type === "youtube" ? "▶️ Vidéo" : m.type === "svg" ? "🎨 Illustration" : "🖼️ Image";
  }
  function youtubeUrl(m) { return "https://www.youtube.com/watch?v=" + m.id + (m.start ? "&t=" + m.start + "s" : ""); }
  function embedUrl(m) {
    return "https://www.youtube-nocookie.com/embed/" + m.id + "?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3" + (m.start ? "&start=" + m.start : "");
  }
  function svgSrc(svg) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }

  /* ---------- Affichage (navigateur uniquement) ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  /* Un parent avec backdrop-filter / transform / filter devient le « bloc conteneur » des éléments en position:fixed :
     l'agrandissement n'occuperait alors que ce parent. On neutralise ces effets le temps de l'agrandissement. */
  function releaseAncestors(box, release) {
    if (!release) {
      Array.prototype.forEach.call(document.querySelectorAll(".qm-anc-fix"), function (e) { e.classList.remove("qm-anc-fix"); });
      return;
    }
    for (var e = box.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      var cs = getComputedStyle(e);
      if ((cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none") ||
          (cs.transform && cs.transform !== "none") || (cs.filter && cs.filter !== "none") ||
          (cs.perspective && cs.perspective !== "none") || /paint|layout|strict|content/.test(cs.contain || "")) e.classList.add("qm-anc-fix");
    }
  }
  function setOpen(box, open) {
    if (open) releaseAncestors(box, true);
    box.classList.toggle("qm-open", open);
    if (!open && !document.querySelector(".qm-box.qm-open")) releaseAncestors(box, false);
    var b = box.querySelector(".qm-zoom");
    if (b) { b.textContent = open ? "✕ Réduire" : "⤢ Agrandir"; b.setAttribute("aria-label", open ? "Réduire le média" : "Agrandir le média"); }
    document.documentElement.classList.toggle("qm-lock", !!document.querySelector(".qm-box.qm-open"));
  }
  /* Construit le bloc média. opts.onError(message) est appelé si l'image ne se charge pas. */
  function build(media, opts) {
    opts = opts || {};
    var m = normalize(media);
    if (!m || typeof document === "undefined") return null;
    var box = el("div", "qm-box qm-" + m.type);
    var frame = el("div", "qm-frame");
    var media$;
    if (m.type === "youtube") {
      media$ = document.createElement("iframe");
      media$.src = embedUrl(m);
      media$.title = "Vidéo de la question";
      media$.setAttribute("allow", "encrypted-media; picture-in-picture; fullscreen");
      media$.setAttribute("allowfullscreen", "");
      media$.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      media$.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
      media$.setAttribute("loading", "eager");
    } else {
      media$ = document.createElement("img");
      media$.alt = "Image de la question";
      media$.decoding = "async";
      media$.setAttribute("referrerpolicy", "no-referrer");
      media$.draggable = false;
      media$.src = m.type === "svg" ? svgSrc(m.svg) : m.url;
      media$.addEventListener("error", function () {
        box.classList.add("qm-broken");
        frame.textContent = "";
        frame.appendChild(el("div", "qm-fallback", "🖼️ Image indisponible"));
        if (opts.onError) opts.onError("Impossible de charger cette image : le lien est peut-être cassé ou protégé.");
      });
      if (opts.onLoad) media$.addEventListener("load", function () { opts.onLoad(media$); });
      media$.addEventListener("click", function () { setOpen(box, !box.classList.contains("qm-open")); });
    }
    frame.appendChild(media$);
    box.appendChild(frame);
    var bar = el("div", "qm-bar");
    var zoom = el("button", "qm-zoom", "⤢ Agrandir");
    zoom.type = "button";
    zoom.setAttribute("aria-label", "Agrandir le média");
    zoom.addEventListener("click", function () { setOpen(box, !box.classList.contains("qm-open")); });
    bar.appendChild(zoom);
    if (m.type === "youtube") {
      var a = el("a", "qm-link", "Ouvrir sur YouTube ↗");
      a.href = youtubeUrl(m); a.target = "_blank"; a.rel = "noopener noreferrer";
      bar.appendChild(a);
    }
    box.appendChild(bar);
    box.addEventListener("click", function (e) { if (e.target === box && box.classList.contains("qm-open")) setOpen(box, false); });
    return box;
  }
  function clearQuestionMedia() {
    var old = document.getElementById("v40Media");
    if (old) old.remove();
    document.documentElement.classList.remove("qm-lock");
  }
  /* Insère le média de la question courante au-dessus du texte de la question. */
  function mountForQuestion(q) {
    if (typeof document === "undefined") return null;
    clearQuestionMedia();
    var m = q && normalize(q.media);
    if (!m) return null;
    var text = document.getElementById("questionText");
    if (!text || !text.parentNode) return null;
    var holder = el("div", "qm-holder");
    holder.id = "v40Media";
    var box = build(m);
    if (!box) return null;
    holder.appendChild(box);
    text.parentNode.insertBefore(holder, text);
    return holder;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector(".qm-box.qm-open");
      if (open) setOpen(open, false);
    });
  }

  /* ---------- Image envoyée depuis l'appareil : réduite et compressée ---------- */
  function fileToDataUrl(file, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return reject(new Error("Format non pris en charge (JPEG, PNG, WebP ou GIF)."));
      if (file.size > 15 * 1024 * 1024) return reject(new Error("Fichier trop volumineux (15 Mo maximum)."));
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Impossible de lire cette image.")); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var side = opts.max || 900, q = 0.8, out = "";
          for (var tries = 0; tries < 10; tries++) {
            var k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
            var w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
            var c = document.createElement("canvas"); c.width = w; c.height = h;
            var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
            out = c.toDataURL("image/jpeg", q);
            if (out.length <= MAX_DATA_URL) return resolve(out);
            if (q > 0.5) q -= 0.1; else side = Math.round(side * 0.8);
          }
          reject(new Error("Image trop lourde même après compression."));
        } catch (e) { reject(new Error("Compression impossible.")); }
      };
      img.src = url;
    });
  }

  return {
    parseYouTube: parseYouTube, normalize: normalize, fromInput: fromInput, label: label, cleanSvg: cleanSvg,
    cleanImageUrl: cleanImageUrl, build: build, mountForQuestion: mountForQuestion, clearQuestionMedia: clearQuestionMedia,
    fileToDataUrl: fileToDataUrl, youtubeUrl: youtubeUrl, embedUrl: embedUrl, svgSrc: svgSrc, MAX_DATA_URL: MAX_DATA_URL
  };
});
