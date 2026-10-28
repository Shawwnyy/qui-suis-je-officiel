/* ============================================================================
   INTERFACE « QCM À PARTIR D'UN COURS »
   Ouvre une fenêtre : choix du fichier (PDF, ODT, DOCX, TXT) ou texte collé → 5 à 100 questions
   → aperçu avec cases à cocher → ajout au jeu comme thème « perso » (via window.v35Q.addRecords).

   Dépend de : QcmGenerator (generator.js), QcmExtract (extract.js), window.v35Q (034-v35-manager.js).
   Mode « IA » facultatif : seulement si php/qcm.php répond et qu'une clé API y est configurée.
   ============================================================================ */
(function (root) {
  "use strict";

  var PHP_URL = "php/qcm.php";
  var MIN_COUNT = 5, MAX_COUNT = 100, MIN_CHARS = 200, AI_SLICE = 60000, AI_MAX_BATCHES = 8;
  var CODE_KEY = "qcmAccessCode";

  var S = null;           /* état de la fenêtre */
  var built = false;
  var job = 0;            /* identifiant du travail en cours (pour ignorer les réponses périmées) */

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(m) { try { if (typeof root.v34Toast === "function") root.v34Toast(m); } catch (e) {} }
  function store(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } }

  function freshState() {
    return {
      step: "source", source: "", docText: "", pasteText: "", fileName: "", docInfo: "",
      title: "", titleTouched: false, count: 20, lang: "auto", mode: "fast", stt: "fast", reader: false, url: "", abort: null,
      ai: undefined, code: read(CODE_KEY), result: null, checked: [], seed: 0,
      onlyThis: true, busy: "", msg: null, done: null, images: [], pageTexts: null, useImages: true
    };
  }

  /* ---------- Outils texte ---------- */
  function titleFromName(name) {
    var t = String(name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return "";
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return t.slice(0, 30);
  }
  function withEmoji(name) {
    return /^\s*(\p{Extended_Pictographic}|\p{Regional_Indicator})/u.test(name) ? name : "📄 " + name;
  }
  function currentText() {
    return S.source === "paste" ? S.pasteText : (S.docText || "");
  }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }

  /* ---------- Fenêtre ---------- */
  function build() {
    if (built) return;
    var m = document.createElement("div");
    m.id = "qcmModal"; m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Créer un QCM à partir d'un cours");
    m.innerHTML = '<div class="v35q-sheet"><div class="v35q-head"><h2>📄 QCM à partir d\'un cours</h2><button type="button" class="v35q-x" data-qcm="close" aria-label="Fermer">✕</button></div><div class="v35q-body" id="qcmBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", onClick);
    m.addEventListener("input", onInput);
    m.addEventListener("change", onChange);
    m.addEventListener("dragover", function (e) {
      if (!e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], "Files") < 0) return;
      e.preventDefault();
      var d = $("qcmDrop"); if (d) d.classList.add("over");
    });
    m.addEventListener("dragleave", function (e) { var d = $("qcmDrop"); if (d && (e.target === d || e.target === m)) d.classList.remove("over"); });
    m.addEventListener("drop", function (e) {
      if (!e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], "Files") < 0) return;
      e.preventDefault();
      var d = $("qcmDrop"); if (d) d.classList.remove("over");
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && S && S.step === "source" && !S.busy) loadFile(f);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && m.classList.contains("show")) close(); });
    m.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "qcmUrl") { e.preventDefault(); loadUrl(); } });
    built = true;
  }

  function open() {
    build();
    job++;
    S = freshState();
    $("qcmModal").classList.add("show");
    document.documentElement.classList.add("qcm-open");
    document.documentElement.style.overflow = "hidden";
    render();
    checkServer();
  }
  function close() {
    var m = $("qcmModal");
    if (!m || !m.classList.contains("show")) return;
    job++;
    m.classList.remove("show");
    document.documentElement.classList.remove("qcm-open");
    document.documentElement.style.overflow = "";
  }

  /* ---------- Serveur PHP facultatif ---------- */
  function checkServer() {
    var mine = S;
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    fetch(PHP_URL + "?action=status", { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); mine.ai = (j && j.ok) ? j : null; })
      .catch(function () { clearTimeout(timer); mine.ai = null; })
      .then(function () { if (S === mine && S.step === "source") renderMode(); });
  }

  /* ---------- Rendu ---------- */
  function setMsg(kind, text) { S.msg = text ? { kind: kind, text: text } : null; paintMsg(); }
  function paintMsg() {
    var el = $("qcmMsg"); if (!el) return;
    if (!S.msg) { el.className = "v35q-msg"; el.textContent = ""; return; }
    el.className = "v35q-msg " + S.msg.kind + " show"; el.textContent = S.msg.text;
    if (S.msg.kind === "err" && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function render() {
    var b = $("qcmBody"); if (!b) return;
    if (S.step === "source") b.innerHTML = sourceHTML();
    else if (S.step === "preview") b.innerHTML = previewHTML();
    else b.innerHTML = doneHTML();
    if (S.step === "source") { fillSource(); renderMode(); }
    paintMsg();
    if (S.busy) paintBusy();
    b.scrollTop = 0;
  }

  function sourceHTML() {
    return '<div id="qcmMsg" class="v35q-msg" role="alert" aria-live="polite"></div>'
      + '<div class="v35q-hint qcm-intro">Choisis un cours (document, présentation, tableur, page web, audio ou vidéo) : le jeu en tire des questions à 4 réponses. Rien n\'est envoyé sur Internet en mode rapide : le fichier est lu sur ton appareil.</div>'
      + '<label class="qcm-step">1 · Ton cours</label>'
      + '<label class="qcm-drop" id="qcmDrop" for="qcmFile"><span class="qcm-drop-ico" aria-hidden="true">📄</span><b>Choisir un fichier</b><span>ou dépose-le ici</span><small>PDF · Word · PowerPoint · ODP / ODT · Excel · EPUB · HTML · TXT · sous-titres · MP3 · WAV · MP4… — 25 Mo (300 Mo pour le son / la vidéo)</small></label>'
      + '<input type="file" id="qcmFile" class="qcm-file" accept=".pdf,.docx,.odt,.pptx,.odp,.xlsx,.ods,.csv,.tsv,.epub,.rtf,.html,.htm,.xhtml,.txt,.md,.markdown,.json,.srt,.vtt,.sbv,.ass,.ssa,.lrc,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.weba,.mp4,.m4v,.webm,.mov,.mkv,.ogv,audio/*,video/*,text/*,application/pdf,application/vnd.openxmlformats-officedocument.*,application/vnd.oasis.opendocument.*,application/epub+zip,application/rtf">'
      + '<div class="v35q-hint" id="qcmDoc" aria-live="polite"></div>'
      + '<details class="qcm-paste" id="qcmPasteBox"><summary>…ou colle le texte du cours</summary><textarea id="qcmText" placeholder="Colle ici le texte de ton cours (au moins quelques paragraphes)." autocomplete="off"></textarea></details>'
      + '<details class="qcm-paste" id="qcmLinkBox"><summary>🔗 …ou importe un lien (page web, Wikipédia, Canva, Google, YouTube)</summary>'
      + '<div class="qcm-link"><input type="url" id="qcmUrl" inputmode="url" autocomplete="off" placeholder="https://…" aria-label="Adresse du cours"><button type="button" class="btn btn-secondary" data-qcm="url" id="qcmUrlGo">🔗 Importer</button></div>'
      + '<label class="qcm-only"><input type="checkbox" id="qcmReader"> 🌐 Si le site refuse, passer par un service de lecture externe (r.jina.ai : l\'adresse est alors envoyée à ce service)</label>'
      + '<div class="v35q-hint">Canva, Google Slides / Docs, OneDrive, Drive et YouTube ne peuvent pas être lus depuis un simple lien : le jeu t\'indique alors comment télécharger le cours (PDF, PowerPoint…) pour le déposer ici.</div></details>'
      + '<details class="qcm-paste" id="qcmSttBox"><summary>🎧 Options audio / vidéo</summary>'
      + '<label for="qcmStt">Qualité de la transcription (dans le navigateur)</label>'
      + '<select id="qcmStt"><option value="fast">⚡ Rapide (modèle léger ≈ 40 Mo) — suffisant pour une voix claire</option><option value="precise">🎯 Précise (modèle ≈ 80 Mo) — 2 à 3 fois plus lente</option></select>'
      + '<div class="v35q-hint">La première fois, le modèle de reconnaissance vocale est téléchargé puis gardé en cache. Compte plusieurs minutes pour un cours d\'une heure ; choisis la langue à l\'étape 4 pour de meilleurs résultats.</div></details>'
      + '<label class="qcm-step" for="qcmTitle">2 · Nom du thème</label>'
      + '<input type="text" id="qcmTitle" maxlength="30" autocomplete="off" placeholder="Ex. Biologie cellulaire">'
      + '<label class="qcm-step" for="qcmRange">3 · Nombre de questions : <b id="qcmCountVal"></b></label>'
      + '<div class="qcm-count"><input type="range" id="qcmRange" min="' + MIN_COUNT + '" max="' + MAX_COUNT + '" step="1" aria-label="Nombre de questions"><input type="number" id="qcmNum" min="' + MIN_COUNT + '" max="' + MAX_COUNT + '" inputmode="numeric" aria-label="Nombre de questions (valeur exacte)"></div>'
      + '<div class="qcm-presets" role="group" aria-label="Nombres courants">' + [5, 10, 20, 30, 50, 100].map(function (n) { return '<button type="button" data-qcm="preset" data-n="' + n + '">' + n + '</button>'; }).join("") + '</div>'
      + '<label class="qcm-step" for="qcmLang">4 · Langue du cours</label>'
      + '<select id="qcmLang"><option value="auto">🔎 Détection automatique</option><option value="fr">🇫🇷 Français</option><option value="en">🇬🇧 English</option><option value="es">🇪🇸 Español</option></select>'
      + '<label class="qcm-step">5 · Méthode</label><div id="qcmModeBox"></div>'
      + '<div class="v35q-actions"><button type="button" class="btn btn-primary" data-qcm="generate" id="qcmGo">✨ Générer le QCM</button></div>';
  }
  function fillSource() {
    var set = function (id, v) { var e = $(id); if (e) e.value = v; };
    set("qcmTitle", S.title); set("qcmRange", S.count); set("qcmNum", S.count); set("qcmLang", S.lang); set("qcmStt", S.stt); set("qcmUrl", S.url);
    var rd = $("qcmReader"); if (rd) rd.checked = !!S.reader;
    var c = $("qcmCountVal"); if (c) c.textContent = S.count;
    var d = $("qcmDoc"); if (d) d.textContent = S.docInfo || "";
    var tx = $("qcmText"); if (tx) tx.value = S.pasteText || "";
    if (S.source === "paste") { var box = $("qcmPasteBox"); if (box) box.open = true; }
  }
  function renderMode() {
    var box = $("qcmModeBox"); if (!box) return;
    var ai = S.ai;
    var aiOk = !!(ai && ai.ai);
    if (S.mode === "ai" && !aiOk) S.mode = "fast";
    var h = '<div class="v35q-radio">'
      + '<label><input type="radio" name="qcmMode" value="fast"' + (S.mode === "fast" ? " checked" : "") + '> ⚡ Rapide — sur ton appareil, gratuit, sans Internet (questions « à trous » et définitions)</label>'
      + '<label' + (aiOk ? "" : ' class="disabled"') + '><input type="radio" name="qcmMode" value="ai"' + (S.mode === "ai" ? " checked" : "") + (aiOk ? "" : " disabled") + '> 🤖 IA — questions mieux rédigées (le texte est envoyé à un serveur puis à l\'API Claude)</label>'
      + '</div>';
    if (!aiOk) h += '<div class="v35q-hint">' + (S.ai === undefined ? "Recherche du mode IA…" : "Mode IA indisponible : il demande un hébergement PHP avec une clé API configurée (voir le README). Le mode rapide fonctionne partout.") + '</div>';
    if (aiOk && ai.needs_code && S.mode === "ai" || ai && ai.needs_code && (ai.stt || ai.fetch) && S.mode !== "ai") h += '<label for="qcmCode">Code d\'accès du serveur</label><input type="password" id="qcmCode" autocomplete="off" placeholder="Code d\'accès" value="' + esc(S.code) + '">';
    box.innerHTML = h;
  }

  function previewHTML() {
    var r = S.result, qs = r.questions, cat = withEmoji(S.title.trim() || "Cours");
    var nChecked = S.checked.filter(Boolean).length;
    var exist = window.v35Q && window.v35Q.store.some(function (x) { return x.category === cat && /^qcm/.test(x.id); });
    var h = '<div id="qcmMsg" class="v35q-msg" role="alert" aria-live="polite"></div>';
    h += '<div class="v35q-msg ok show">✅ ' + plural(qs.length, "question générée", "questions générées") + ' pour le thème « ' + esc(cat) + ' »'
      + (qs.length !== r.requested ? ' (' + r.requested + ' demandées)' : '') + '</div>';
    if (r.warning) h += '<div class="v35q-msg warn show">ℹ️ ' + esc(r.warning) + '</div>';
    if (exist) h += '<div class="v35q-msg warn show">♻️ Ce thème existe déjà : ses anciennes questions générées seront remplacées (tes questions écrites à la main sont conservées).</div>';
    if (S.images && S.images.length) {
      var ii = r.imgInfo || { assigned: 0 };
      h += '<label class="qcm-only qcm-imgs"><input type="checkbox" id="qcmImgs"' + (S.useImages !== false ? " checked" : "") + '> 🖼️ Joindre les images du cours (' + plural(S.images.length, "repérée", "repérées") + (S.useImages !== false ? ', ' + plural(ii.assigned, "jointe", "jointes") + ' aux questions' : '') + ')</label>';
      if (S.useImages !== false && !ii.assigned) h += '<div class="v35q-msg warn show">ℹ️ Aucune image n\'a pu être rattachée à une question (les phrases source ne sont pas sur les pages qui contiennent des images).</div>';
    }
    h += '<div class="v35q-hint">Relis les questions et décoche celles que tu ne veux pas. Un QCM automatique peut contenir des erreurs : tu pourras corriger chaque question ensuite dans « 📝 Mes questions ».</div>';
    h += '<div class="qcm-bar"><button type="button" data-qcm="all">Tout cocher</button><button type="button" data-qcm="none">Tout décocher</button><span id="qcmSel">' + nChecked + ' / ' + qs.length + ' sélectionnée' + (nChecked > 1 ? "s" : "") + '</span></div>';
    qs.forEach(function (q, i) {
      h += '<label class="qcm-q"><input type="checkbox" data-i="' + i + '"' + (S.checked[i] ? " checked" : "") + '><span class="qcm-qbody">' + (q.media && q.media.url ? '<img class="qcm-thumb" alt="Figure du cours (page ' + (q.figurePage || '?') + ')" src="' + q.media.url + '">' : '') + '<span class="t">' + (i + 1) + '. ' + esc(q.question) + '</span><ul>'
        + q.answers.map(function (a, k) { return '<li' + (k === q.correct ? ' class="ok"' : '') + '>' + esc(a) + (k === q.correct ? ' ✓' : '') + '</li>'; }).join("")
        + '</ul><span class="m">' + (q.media ? '🖼️ Figure du cours (page ' + esc(q.figurePage || '?') + ') · ' : '') + esc(({ facile: "🟢 Facile", moyen: "🔵 Moyen", difficile: "🟠 Difficile" })[q.difficulty] || "🔵 Moyen") + '</span></span></label>';
    });
    h += '<label class="qcm-only"><input type="checkbox" id="qcmOnly"' + (S.onlyThis ? " checked" : "") + '> 🎯 Jouer uniquement ce thème à la prochaine partie</label>';
    h += '<div class="v35q-actions"><button type="button" class="btn btn-secondary" data-qcm="back">← Modifier</button><button type="button" class="btn btn-secondary" data-qcm="regen">🔄 Régénérer</button>'
      + '<button type="button" class="btn btn-secondary" data-qcm="add" id="qcmAdd">➕ Ajouter ' + nChecked + ' question' + (nChecked > 1 ? "s" : "") + '</button>'
      + '<button type="button" class="btn btn-primary" data-qcm="addplay" id="qcmAddPlay">▶️ Ajouter et jouer maintenant</button></div>'
      + '<div class="v35q-hint">Ces questions sont enregistrées sur cet appareil et utilisées quand <b>tu</b> es l\'hôte de la partie.</div>';
    return h;
  }
  function updatePreviewCounts() {
    var n = S.checked.filter(Boolean).length, total = S.checked.length;
    var s = $("qcmSel"); if (s) s.textContent = n + " / " + total + " sélectionnée" + (n > 1 ? "s" : "");
    var a = $("qcmAdd"); if (a) { a.textContent = "➕ Ajouter " + n + " question" + (n > 1 ? "s" : ""); a.disabled = n === 0; }
    var ap = $("qcmAddPlay"); if (ap) ap.disabled = n === 0;
  }

  function doneHTML() {
    var d = S.done;
    return '<div class="v35q-msg ok show" role="status">✅ ' + plural(d.added, "question ajoutée", "questions ajoutées") + ' au thème « ' + esc(d.category) + ' ».'
      + (d.removed ? ' ' + plural(d.removed, "ancienne question remplacée", "anciennes questions remplacées") + '.' : '') + '</div>'
      + (d.images ? '<div class="v35q-msg ok show">🖼️ ' + plural(d.images, "question avec une figure du cours", "questions avec une figure du cours") + ' (images sur cet appareil).</div>' : '')
      + (d.duplicates ? '<div class="v35q-msg warn show">ℹ️ ' + plural(d.duplicates, "question ignorée (déjà existante)", "questions ignorées (déjà existantes)") + '.</div>' : '')
      + (d.full ? '<div class="v35q-msg warn show">⚠️ ' + plural(d.full, "question refusée", "questions refusées") + ' : limite de ' + esc(window.v35Q ? window.v35Q.max : "") + ' questions perso atteinte.</div>' : '')
      + (d.persisted ? '' : '<div class="v35q-msg warn show">⚠️ Le stockage du navigateur est indisponible : ces questions seront perdues à la fermeture de la page (exporte-les depuis « 📝 Mes questions »).</div>')
      + '<div class="v35q-msg ok show">📚 <b>Mode révision</b> : pour ce cours, la partie se joue sans roue ni malus (uniquement des bonus à gagner), et chaque mauvaise réponse est justifiée avec le passage du cours (réglable dans la salle d\'attente).</div>'
      + '<p class="qcm-done-txt">' + (d.selected ? 'Le thème est <b>présélectionné</b> et le nombre de questions est réglé sur <b>' + d.rounds + '</b>. Il te reste à créer la partie.' : 'Le thème est disponible dans la liste des thèmes de la salle d\'attente.') + '</p>'
      + '<div class="v35q-actions"><button type="button" class="btn btn-secondary" data-qcm="manage">📝 Voir mes questions</button><button type="button" class="btn btn-secondary" data-qcm="again">📄 Un autre cours</button><button type="button" class="btn btn-secondary" data-qcm="close">Terminer</button><button type="button" class="btn btn-primary" data-qcm="play">▶️ Jouer maintenant</button></div>';
  }

  /* ---------- Occupé / progression ---------- */
  function setBusy(text) {
    S.busy = text || "";
    paintBusy();
  }
  function paintBusy() {
    var go = $("qcmGo");
    var ids = ["qcmGo", "qcmFile", "qcmUrlGo", "qcmUrl"];
    ids.forEach(function (id) { var e = $(id); if (e) e.disabled = !!S.busy; });
    var old = $("qcmBusy"); if (old) old.remove();
    if (S.busy) {
      var d = document.createElement("div");
      d.id = "qcmBusy"; d.className = "qcm-busy"; d.setAttribute("role", "status");
      d.innerHTML = '<span class="qcm-spin" aria-hidden="true"></span><span id="qcmBusyTxt">' + esc(S.busy) + '</span>' + (S.abort ? '<button type="button" class="btn btn-secondary qcm-cancel" data-qcm="cancel">✖ Annuler</button>' : '');
      var anchor = go ? go.parentNode : ($("qcmBody") && $("qcmBody").firstChild);
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(d, anchor);
      else if ($("qcmBody")) $("qcmBody").appendChild(d);
    }
    var nb = $("qcmBusy"); if (nb && nb.scrollIntoView) nb.scrollIntoView({ block: "nearest" });
    document.querySelectorAll("#qcmBody [data-qcm='regen'],#qcmBody [data-qcm='add'],#qcmBody [data-qcm='back']").forEach(function (b) { b.disabled = !!S.busy; });
  }

  /* ---------- Lecture du fichier ou du lien ---------- */
  function serverOptions() {
    var ai = S.ai, usable = !!(ai && (!ai.needs_code || S.code));
    return { phpUrl: PHP_URL, code: S.code, serverStt: !!(usable && ai.stt), serverFetch: !!(usable && ai.fetch) };
  }
  function liveStatus(mine, my) {
    return function (t) { if (S !== mine || my !== job || !S.busy) return; S.busy = t; var e = $("qcmBusyTxt"); if (e) e.textContent = t; };
  }
  function afterRead(mine, my, r, label) {
    if (S !== mine || my !== job) return;
    S.abort = null;
    S.docText = r.text; S.source = "file"; S.fileName = label;
    S.images = Array.isArray(r.images) ? r.images : []; S.pageTexts = Array.isArray(r.pageTexts) ? r.pageTexts : null;
    var words = (r.text.match(/\S+/g) || []).length;
    var how = r.via === "php" || r.via === "serveur" ? " (par le serveur)" : (r.via && /^(whisper|wikip|page|service)/i.test(r.via) ? " (" + r.via + ")" : "");
    S.docInfo = "✅ " + label + " — " + (r.pages ? r.pages + " page" + (r.pages > 1 ? "s" : "") + ", " : "") + (r.seconds ? Math.max(1, Math.round(r.seconds / 60)) + " min de son, " : "") + words.toLocaleString("fr-FR") + " mots lus" + how + "." + (r.truncated ? " (Seules les 90 premières minutes sont lues.)" : "") + (S.images.length ? " 🖼️ " + plural(S.images.length, "image du cours repérée", "images du cours repérées") + "." : "");
    S.pasteText = ""; var t = $("qcmText"); if (t) t.value = "";
    if (!S.titleTouched) { S.title = titleFromName(r.title || label); var ti = $("qcmTitle"); if (ti) ti.value = S.title; }
    var d = $("qcmDoc"); if (d) d.textContent = S.docInfo;
    setBusy(""); setMsg("", "");
  }
  function readFailed(mine, my, e, fileInput) {
    if (S !== mine || my !== job) return;
    S.abort = null; setBusy("");
    S.docText = ""; S.docInfo = ""; var d = $("qcmDoc"); if (d) d.textContent = "";
    if (fileInput) { var fi = $("qcmFile"); if (fi) fi.value = ""; }
    if (e && e.code === "ABORT") { setMsg("", ""); return; }
    setMsg(e && e.code === "ADVICE" ? "warn" : "err", (e && e.code === "ADVICE" ? "ℹ️ " : "❌ ") + (e && e.message ? e.message : "Lecture impossible."));
  }
  function loadFile(f) {
    if (!root.QcmExtract) { setMsg("err", "❌ Le module de lecture des fichiers n'est pas chargé."); return; }
    var mine = S, my = ++job, so = serverOptions();
    var media = root.QcmFormats ? /^(audio|video)$/.test(root.QcmFormats.kindOf(f.name, f.type)) : false;
    S.abort = media ? { cancelled: false } : null;
    setMsg("", ""); setBusy("Lecture de « " + f.name + " »…");
    root.QcmExtract.fromFile(f, { phpUrl: so.phpUrl, code: so.code, serverStt: so.serverStt, lang: S.lang, quality: S.stt, abort: S.abort, onStatus: liveStatus(mine, my) })
      .then(function (r) { afterRead(mine, my, r, f.name); })
      .catch(function (e) { readFailed(mine, my, e, true); });
  }
  function loadUrl() {
    if (S.busy) return;
    if (!root.QcmExtract || !root.QcmExtract.fromUrl) { setMsg("err", "❌ Le module de lecture des liens n'est pas chargé."); return; }
    var inp = $("qcmUrl"), url = (inp ? inp.value : S.url).trim();
    S.url = url;
    if (!url) { setMsg("err", "❌ Colle d'abord une adresse (https://…)."); if (inp) inp.focus(); return; }
    var mine = S, my = ++job, so = serverOptions();
    setMsg("", ""); setBusy("Lecture du lien…");
    root.QcmExtract.fromUrl(url, { phpUrl: so.phpUrl, code: so.code, serverFetch: so.serverFetch, allowReader: !!S.reader, onStatus: liveStatus(mine, my) })
      .then(function (r) {
        var label = r.title || (function () { try { var u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : "https://" + url); return u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, "") : ""); } catch (e) { return url; } })();
        afterRead(mine, my, r, label.slice(0, 80));
      })
      .catch(function (e) { readFailed(mine, my, e, false); });
  }

  /* ---------- Génération ---------- */
  function generate(newSeed) {
    if (S.busy) return;
    var text = currentText();
    if (String(text).replace(/\s+/g, "").length < MIN_CHARS) {
      setMsg("err", "❌ Il manque le cours : choisis un fichier ou colle au moins quelques paragraphes (" + MIN_CHARS + " caractères minimum).");
      return;
    }
    var count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(Number(S.count) || 20)));
    S.count = count;
    var title = (S.title || "").trim();
    if (title.length < 2) { setMsg("err", "❌ Donne un nom au thème (2 caractères minimum)."); var ti = $("qcmTitle"); if (ti) ti.focus(); return; }
    S.seed = newSeed ? ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) : (S.seed || ((Date.now() ^ (Math.random() * 4294967296)) >>> 0));
    var mine = S, my = ++job;
    setMsg("", "");
    if (S.mode === "ai") {
      setBusy("Génération par l'IA…");
      generateAI(text, count, title, mine, my).then(function (res) { if (S === mine && my === job) showPreview(res, count); }).catch(function (e) {
        if (S !== mine || my !== job) return;
        setBusy("");
        setMsg("err", "❌ " + (e && e.message ? e.message : "La génération par l'IA a échoué.") + " Tu peux réessayer ou choisir le mode rapide.");
      });
      return;
    }
    if (!root.QcmGenerator) { setMsg("err", "❌ Le générateur n'est pas chargé."); return; }
    setBusy("Analyse du cours et création des questions…");
    setTimeout(function () {
      if (S !== mine || my !== job) return;
      var res;
      try { res = root.QcmGenerator.generate(text, { count: count, lang: S.lang, title: title, seed: S.seed }); }
      catch (e) { setBusy(""); setMsg("err", "❌ Erreur pendant la génération : " + (e && e.message ? e.message : e)); return; }
      showPreview(res, count);
    }, 40);
  }

  /* Joint les images du cours aux questions de la même page (mode rapide uniquement : les questions de l'IA n'indiquent pas leur phrase source). */
  function attachImages() {
    var qs = S.result && S.result.questions || [];
    S.result.imgInfo = null;
    if (!root.QcmImages) return;
    if (S.useImages === false || !S.images || !S.images.length) { qs.forEach(function (q) { delete q.media; delete q.figurePage; }); return; }
    S.result.imgInfo = root.QcmImages.assign(qs, S.pageTexts, S.images);
  }
  function showPreview(res, count) {
    setBusy("");
    if (!res.questions.length) {
      S.step = "source"; render();
      setMsg("warn", "⚠️ " + (res.warning || "Aucune question exploitable n'a pu être créée à partir de ce texte.") + " Essaie un cours plus détaillé (phrases complètes) ou le mode IA.");
      return;
    }
    S.result = { questions: res.questions, requested: count, warning: res.warning || "", stats: res.stats };
    attachImages();
    S.checked = res.questions.map(function () { return true; });
    S.step = "preview";
    render();
  }

  /* --- mode IA : lots de 30 questions max, chacun sur une tranche différente du cours --- */
  function sliceText(text, parts) {
    text = String(text).replace(/\r/g, "");
    if (parts <= 1) return [text];
    var paras = text.split(/\n{2,}/);
    if (paras.length < parts * 2) paras = text.match(/[^.!?\n]+[.!?]*\s*/g) || [text];
    var target = text.length / parts, out = [], cur = "";
    paras.forEach(function (p) {
      if (cur.length >= target && out.length < parts - 1) { out.push(cur); cur = ""; }
      cur += (cur ? "\n\n" : "") + p;
    });
    if (cur) out.push(cur);
    return out;
  }
  function generateAI(text, count, title, mine, my) {
    var per = Math.max(5, Math.min(30, Number(S.ai && S.ai.max_per_call) || 30));
    var batches = Math.max(Math.ceil(count / per), Math.min(AI_MAX_BATCHES, Math.ceil(text.length / AI_SLICE)));
    batches = Math.min(batches, count);
    var slices = sliceText(text, batches);
    batches = slices.length;
    var base = Math.floor(count / batches), rem = count % batches;
    var all = [], seen = {}, errors = 0, lastErr = null, i = 0, warning = "";
    var code = S.ai && S.ai.needs_code ? (($("qcmCode") && $("qcmCode").value) || S.code) : "";
    if (S.ai && S.ai.needs_code) { S.code = code; store(CODE_KEY, code || null); }

    function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
    function step() {
      if (S !== mine || my !== job) return Promise.reject(new Error("annulé"));
      if (i >= batches) return Promise.resolve();
      var n = base + (i < rem ? 1 : 0), idx = i++;
      if (n < 1) return step();
      var t = $("qcmBusyTxt"); if (t) t.textContent = "Génération par l'IA… lot " + (idx + 1) + " / " + batches;
      return fetch(PHP_URL + "?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Code": code || "" },
        body: JSON.stringify({ text: slices[idx], count: n, lang: S.lang, title: title })
      }).then(function (r) {
        return r.json().catch(function () { throw new Error("Réponse du serveur illisible."); }).then(function (j) { return { status: r.status, j: j }; });
      }).then(function (x) {
        if (!x.j || !x.j.ok) {
          var e = new Error((x.j && x.j.error) || "Erreur du serveur (" + x.status + ").");
          e.status = x.status; throw e;
        }
        (x.j.questions || []).forEach(function (q) {
          var k = norm(q.question);
          if (k && !seen[k]) { seen[k] = 1; all.push({ question: q.question, answers: q.answers, correct: q.correct, difficulty: q.difficulty || "moyen", correction: q.correction || "", kind: "ia" }); }
        });
      }).catch(function (e) {
        if (e && e.status === 401) { store(CODE_KEY, null); S.code = ""; throw new Error("Code d'accès incorrect ou manquant."); }
        if (S !== mine || my !== job) throw e;
        errors++; lastErr = e;
        if (!all.length && errors >= 1 && idx === 0) throw e;          /* premier lot en échec : inutile de continuer */
      }).then(step);
    }
    return step().then(function () {
      if (!all.length) throw lastErr || new Error("L'IA n'a renvoyé aucune question.");
      if (errors) warning = errors + " lot(s) sur " + batches + " ont échoué (" + (lastErr && lastErr.message ? lastErr.message : "erreur") + ") : le QCM est incomplet.";
      else if (all.length < count) warning = "L'IA a produit " + all.length + " question(s) sur les " + count + " demandées.";
      return { questions: all.slice(0, count), warning: warning, stats: { lang: S.lang, produced: all.length, requested: count } };
    });
  }

  /* ---------- Ajout au jeu ---------- */
  function addToGame() {
    if (S.busy || !window.v35Q || typeof window.v35Q.addRecords !== "function") { setMsg("err", "❌ Le gestionnaire de questions n'est pas disponible."); return; }
    var chosen = S.result.questions.filter(function (q, i) { return S.checked[i]; });
    if (!chosen.length) { setMsg("err", "❌ Coche au moins une question."); return; }
    var cat = withEmoji(S.title.trim() || "Cours");
    var norms = root.QcmImages && root.QcmImages.pageNorms ? root.QcmImages.pageNorms(S.pageTexts) : null, courseTitle = S.title.trim() || "Cours";
    var recs = chosen.map(function (q) { var r = { category: cat, difficulty: q.difficulty, question: q.question, answers: q.answers, correct: q.correct, correction: q.correction }; if (q.src) { var pg = norms ? root.QcmImages.locatePage(q.src, norms) : -1; r.lesson = { s: q.src, c: q.ctx || q.src, p: pg >= 0 ? pg + 1 : 0, t: courseTitle }; } if (q.media && S.useImages !== false) r.media = q.media; return r; });
    var withImg = recs.filter(function (r) { return r.media; }).length;
    var res = window.v35Q.addRecords(recs, { replaceCategory: cat });
    if (!res.added) {
      setMsg("err", "❌ Aucune question ajoutée" + (res.duplicates ? " (" + res.duplicates + " déjà existante" + (res.duplicates > 1 ? "s" : "") + ")" : "") + (res.full ? " — limite de " + window.v35Q.max + " questions perso atteinte" : "") + ".");
      return;
    }
    window.v35Q.ensureAllSource();
    S.onlyThis = !!($("qcmOnly") && $("qcmOnly").checked);
    var selected = selectTheme(cat, S.onlyThis);
    var rounds = setRounds(res.added);
    S.done = { images: withImg, added: res.added, removed: res.removed, duplicates: res.duplicates, full: res.full, persisted: res.persisted, category: cat, selected: selected, rounds: rounds };
    S.step = "done"; render();
    toast("✅ " + res.added + " questions ajoutées");
  }

  /* ---------- « Jouer maintenant » : crée une salle solo avec ce thème seul et lance la partie, question après question ---------- */
  function playNow() {
    var cat = S && S.done && S.done.category;
    if (!cat) return;
    var host = typeof isHost !== "undefined" && !!isHost, room = typeof roomCode !== "undefined" && !!roomCode, started = typeof gameStarted !== "undefined" && !!gameStarted;
    if (started) { toast("Une partie est déjà en cours."); return; }
    var inLobby = host && room && $("lobbyScreen") && $("lobbyScreen").classList.contains("active");
    if (!host && room) { toast("Tu es dans la salle de quelqu'un d'autre : quitte-la d'abord."); return; }
    var count = S.done.added;
    close();
    if (inLobby) { launch(cat, count); return; }
    var hn = $("hostName");
    if (!hn || typeof root.createRoom !== "function") { toast("Crée la partie depuis l'accueil : le thème est présélectionné."); return; }
    if (!hn.value.trim()) hn.value = "Moi";
    toast("📚 Création de ta partie de révision…");
    root.createRoom();
    var t0 = Date.now(), iv = setInterval(function () {
      var lobby = $("lobbyScreen") && $("lobbyScreen").classList.contains("active");
      if (lobby) { clearInterval(iv); launch(cat, count); }
      else if (Date.now() - t0 > 12000) { clearInterval(iv); toast("⚠️ Impossible de créer la salle (connexion ?). Crée la partie à la main : le thème est présélectionné."); }
    }, 150);
  }
  function launch(cat, count) {
    /* la salle réinitialise la grille des thèmes juste après son ouverture : on (re)sélectionne
       le thème du cours jusqu'à ce que la sélection soit stable, puis seulement on démarre */
    var want = String(Math.max(MIN_COUNT, Math.min(MAX_COUNT, count))), tries = 0, stable = 0;
    try { if (typeof root.acceptRules === "function") root.acceptRules(); } catch (e) {}
    var iv = setInterval(function () {
      tries++;
      var on = [].slice.call(document.querySelectorAll("#themeGrid input:checked")), rc = $("roundCount");
      if (on.length === 1 && on[0].value === cat && rc && rc.value === want) stable++;
      else { stable = 0; selectTheme(cat, true); setRounds(count); }
      if (stable >= 3) {
        clearInterval(iv);
        var qt = $("questionTime"); if (qt && [].some.call(qt.options, function (o) { return o.value === "30"; })) qt.value = "30";
        try { root.startGame(); } catch (e) { toast("⚠️ La partie n'a pas pu démarrer : lance-la depuis la salle d'attente."); }
      } else if (tries > 40) {
        clearInterval(iv);
        toast("⚠️ Le thème du cours n'a pas pu être sélectionné : choisis-le dans la salle d'attente puis lance la partie.");
      }
    }, 150);
  }
  function selectTheme(cat, only) {
    var found = false;
    var inputs = [].slice.call(document.querySelectorAll("#themeGrid .v163-theme input"));
    inputs.forEach(function (inp) {
      var want = inp.value === cat;
      if (want) found = true;
      if ((only ? want : (want ? true : inp.checked)) !== inp.checked && inp.nextElementSibling && !inp.disabled) inp.nextElementSibling.click();
    });
    return found;
  }
  function setRounds(n) {
    var rc = $("roundCount"); if (!rc) return n;
    var v = String(Math.max(MIN_COUNT, Math.min(MAX_COUNT, n)));
    if (![].some.call(rc.options, function (o) { return o.value === v; })) {
      var opt = new Option(v + " questions", v), before = null;
      [].forEach.call(rc.options, function (o) { var x = Number(o.value); if (!before && x !== 999 && x > Number(v)) before = o; });
      rc.add(opt, before || [].find.call(rc.options, function (o) { return o.value === "999"; }) || null);
    }
    rc.value = v;
    try { rc.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
    return Number(v);
  }

  /* ---------- Évènements ---------- */
  function onClick(e) {
    if (e.target.id === "qcmModal") { close(); return; }
    var t = e.target.closest && e.target.closest("[data-qcm]");
    if (!t) return;
    var a = t.dataset.qcm;
    if (a === "close") close();
    else if (a === "preset") { setCount(Number(t.dataset.n)); }
    else if (a === "generate") generate(false);
    else if (a === "url") loadUrl();
    else if (a === "cancel") { if (S.abort) S.abort.cancelled = true; job++; S.abort = null; setBusy(""); setMsg("", "Lecture annulée."); S.docText = ""; S.docInfo = ""; var dd = $("qcmDoc"); if (dd) dd.textContent = ""; var ff = $("qcmFile"); if (ff) ff.value = ""; }
    else if (a === "regen") generate(true);
    else if (a === "back") { S.step = "source"; render(); }
    else if (a === "all" || a === "none") { S.checked = S.checked.map(function () { return a === "all"; }); document.querySelectorAll("#qcmBody .qcm-q input").forEach(function (c) { c.checked = a === "all"; }); updatePreviewCounts(); }
    else if (a === "add") addToGame();
    else if (a === "addplay") { addToGame(); if (S && S.step === "done") playNow(); }
    else if (a === "play") playNow();
    else if (a === "manage") { close(); if (window.v35Q) window.v35Q.open("list"); }
    else if (a === "again") { var keepMode = S.mode, ai = S.ai; S = freshState(); S.mode = keepMode; S.ai = ai; render(); }
  }
  function setCount(n) {
    n = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(n) || MIN_COUNT));
    S.count = n;
    var r = $("qcmRange"), m = $("qcmNum"), c = $("qcmCountVal");
    if (r) r.value = n; if (m) m.value = n; if (c) c.textContent = n;
  }
  function onInput(e) {
    var t = e.target;
    if (!S) return;
    if (t.id === "qcmRange") setCount(Number(t.value));
    else if (t.id === "qcmNum") { var n = Number(t.value); if (n >= MIN_COUNT && n <= MAX_COUNT) { S.count = Math.floor(n); var r = $("qcmRange"), c = $("qcmCountVal"); if (r) r.value = S.count; if (c) c.textContent = S.count; } }
    else if (t.id === "qcmTitle") { S.title = t.value; S.titleTouched = true; }
    else if (t.id === "qcmText") { S.pasteText = t.value; S.source = "paste"; S.images = []; S.pageTexts = null; S.docInfo = ""; var d = $("qcmDoc"); if (d) d.textContent = ""; }
    else if (t.id === "qcmCode") { S.code = t.value; }
    else if (t.id === "qcmUrl") { S.url = t.value; }
  }
  function onChange(e) {
    var t = e.target;
    if (!S) return;
    if (t.id === "qcmFile") { var f = t.files && t.files[0]; if (f) loadFile(f); }
    else if (t.id === "qcmNum") { setCount(Number(t.value)); }
    else if (t.id === "qcmLang") S.lang = t.value;
    else if (t.id === "qcmStt") S.stt = t.value;
    else if (t.id === "qcmReader") S.reader = t.checked;
    else if (t.name === "qcmMode") { S.mode = t.value; renderMode(); }
    else if (t.id === "qcmOnly") S.onlyThis = t.checked;
    else if (t.id === "qcmImgs") { S.useImages = t.checked; attachImages(); render(); }
    else if (t.closest && t.closest(".qcm-q") && t.dataset.i != null) { S.checked[Number(t.dataset.i)] = t.checked; updatePreviewCounts(); }
  }

  root.QcmUI = {
    open: open, close: close,
    /* utilitaires exposés pour les tests */
    _sliceText: sliceText, _titleFromName: titleFromName
  };
})(typeof window !== "undefined" ? window : this);
