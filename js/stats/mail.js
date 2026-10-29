/* =============================================================================
   V61 — ✉️ Recevoir les statistiques par e-mail, SANS serveur.
   Le jeu n'envoie rien lui-même : il prépare le message (récap + bilan perso) et ouvre ton application de messagerie
   (lien « mailto: »), Gmail ou Outlook (page « nouveau message » préremplie), ou le menu de partage du téléphone avec le PDF en pièce jointe.
   C'est toi qui appuies sur « Envoyer ».
   La logique est pure (V61Mail, testée par tests/mail.test.js) ; la fenêtre est la colle navigateur (V61MailUI).
   ============================================================================= */
var V61Mail = (function () {
  "use strict";
  var MAX_URL = 2000, NOTE = "[…] Résumé raccourci pour tenir dans un lien : le message complet est dans le presse-papiers.";
  function clean(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, " "); }
  function oneLine(s) { return clean(s).replace(/\s+/g, " ").trim(); }
  /* une seule adresse, sans espace, virgule, point-virgule, chevron ni guillemet : pas de destinataires en plus ni de champ glissé dans le lien */
  function validEmail(s) {
    s = String(s == null ? "" : s).trim();
    return s.length >= 5 && s.length <= 254 && /^[^\s@,;<>()[\]"'\\%?&#=:\/]+@[^\s@,;<>()[\]"'\\%?&#=:\/]+\.[^\s@,;<>()[\]"'\\%?&#=:\/.]{2,}$/.test(s) && !/\.\./.test(s) && !/^\.|\.@/.test(s);
  }
  function ordinal(n) { return n === 1 ? "1er" : n + "ᵉ"; }
  function nfr(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }
  function pct(x) { return Math.round((Number(x) || 0) * 100) + " %"; }
  function subject(dateStr, players) {
    var n = Math.max(0, Math.floor(Number(players) || 0));
    return oneLine("🏆 Statistiques de la partie" + (dateStr ? " — " + dateStr : "") + (n ? " · " + n + " joueur" + (n > 1 ? "s" : "") : "")).slice(0, 120);
  }
  /* bilan personnel à partir de V40Analysis.myCard() */
  function personal(card) {
    if (!card || typeof card !== "object") return "";
    var L = ["👤 Mon bilan — " + oneLine((card.avatar ? card.avatar + " " : "") + (card.name || ""))];
    if (card.rank && card.players) L.push("🏁 " + ordinal(card.rank) + " sur " + card.players + " · " + nfr(card.final) + " pts");
    if (card.answered) L.push("✅ " + card.correct + " bonne" + (card.correct > 1 ? "s" : "") + " réponse" + (card.correct > 1 ? "s" : "") + " sur " + card.answered + (card.accuracy === null || card.accuracy === undefined ? "" : " (" + pct(card.accuracy) + ")"));
    if (card.bestStreak >= 2) L.push("🔥 Meilleure série : " + card.bestStreak + " d'affilée");
    if (card.fastest > 0) L.push("⚡ Réponse la plus rapide : " + (Math.round(card.fastest * 10) / 10).toString().replace(".", ",") + " s");
    if (card.bestGain > 0) L.push("💥 Plus gros gain : +" + nfr(card.bestGain) + " pts");
    if (Array.isArray(card.awards) && card.awards.length) L.push("🏅 Trophées : " + card.awards.slice(0, 6).map(function (a) { return oneLine((a.emoji || "") + " " + (a.title || "")); }).join(" · "));
    return L.map(oneLine).join("\n");
  }
  /* message complet : (consigne), bilan perso, puis récap du groupe. Si le lien est trop long, c'est la fin du récap qui est coupée : ce qui t'intéresse le plus est en haut. */
  function message(recap, card, opts) {
    opts = opts || {};
    var parts = [];
    if (opts.prefix) parts.push(oneLine(opts.prefix));
    if (opts.personal !== false) { var p = personal(card); if (p) parts.push(p); }
    parts.push(clean(recap).trim());
    return parts.filter(Boolean).join("\n\n");
  }
  function enc(s, nl) { return encodeURIComponent(s).replace(/%0A/g, nl); }
  function url(kind, f) {
    var to = validEmail(f.to) ? String(f.to).trim() : "", su = oneLine(f.subject).slice(0, 200), body = clean(f.body);
    function make(b) {
      if (kind === "gmail") return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to) + "&su=" + enc(su, "%0A") + "&body=" + enc(b, "%0A");
      if (kind === "outlook") return "https://outlook.live.com/mail/0/deeplink/compose?to=" + encodeURIComponent(to) + "&subject=" + enc(su, "%0A") + "&body=" + enc(b, "%0A");
      return "mailto:" + encodeURIComponent(to).replace(/%40/g, "@") + "?subject=" + enc(su, "%0D%0A") + "&body=" + enc(b, "%0D%0A");
    }
    var out = make(body);
    if (out.length <= MAX_URL) return { url: out, truncated: false, body: body };
    /* trop long : on laisse d'abord tomber les lignes les moins utiles (trophées, question la plus difficile, signature), puis la fin du message */
    var lines = body.split("\n"), SHED = [/^🏅/, /^🧗/, /^🎮/], i, idx;
    var guard = -1, pi = -1; lines.forEach(function (l, k) { if (pi < 0 && /^👤/.test(l)) pi = k; });
    if (pi >= 0) { guard = lines.length; for (i = pi; i < lines.length; i++) if (lines[i] === "") { guard = i; break; } }
    function attempt() { while (lines.length && lines[lines.length - 1] === "") lines.pop(); var cut = lines.join("\n") + "\n\n" + NOTE, u = make(cut); return u.length <= MAX_URL ? { url: u, truncated: true, body: cut } : null; }
    for (i = 0; i < SHED.length; i++) {
      idx = -1; lines.forEach(function (l, k) { if (k > guard && SHED[i].test(l)) idx = k; });      /* jamais dans ton bilan perso, en haut */
      if (idx >= 0) { lines.splice(idx, 1); var r = attempt(); if (r) return r; }
    }
    while (lines.length > 1) { lines.pop(); var r2 = attempt(); if (r2) return r2; }
    var one = make(NOTE);
    return { url: one.length <= MAX_URL ? one : make(""), truncated: true, body: NOTE };
  }
  function fileName(ts, dark) { var d = new Date(Number(ts) || Date.now()); return "qui-suis-je-statistiques-" + (isNaN(d) ? "partie" : d.toISOString().slice(0, 10)) + (dark ? "-sombre" : "") + ".pdf"; }
  var api = { validEmail: validEmail, subject: subject, personal: personal, message: message, url: url, fileName: fileName, clean: clean, MAX_URL: MAX_URL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  return api;
})();

/* ---------------------------- fenêtre (navigateur) ---------------------------- */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var KEY = "quizV61MailTo", M = V61Mail, box = null, lastFocus = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function loadTo() { try { var v = localStorage.getItem(KEY); return M.validEmail(v) ? v : ""; } catch (e) { return ""; } }
  function saveTo(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {} }
  function close() {
    if (!box) return; var b = box; box = null; b.remove(); document.removeEventListener("keydown", onKey, true);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }
  function onKey(e) { if (e.key === "Escape" && box) { e.stopPropagation(); e.preventDefault(); close(); } }

  /* ctx : { host (élément où poser la fenêtre), log, dateStr, recap(), card(), pdf(dark) → octets, pdfDownload() } */
  function open(ctx) {
    if (!ctx || !ctx.log) return;
    close(); lastFocus = document.activeElement;
    var subj = M.subject(ctx.dateStr, ctx.log.P ? ctx.log.P.length : 0);
    box = el("div", "v61-mail"); box.id = "v61Mail"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "v61Title");
    var card = el("div", "v61-card"); box.appendChild(card);
    card.appendChild(el("h3", "", "✉️ Recevoir les stats par e-mail")).id = "v61Title";
    card.appendChild(el("p", "v61-note", "Aucun serveur : le jeu n'envoie rien lui-même. Ton application de messagerie (ou Gmail, Outlook) s'ouvre avec le message déjà écrit, et c'est toi qui l'envoies."));
    var lab = el("label", "v61-lab", "Adresse e-mail (facultatif)"); lab.setAttribute("for", "v61To"); card.appendChild(lab);
    var to = el("input", "v61-input"); to.type = "email"; to.id = "v61To"; to.autocomplete = "email"; to.inputMode = "email"; to.maxLength = 254; to.placeholder = "toi@exemple.fr"; to.value = loadTo(); card.appendChild(to);
    var keepRow = el("label", "v61-check"), keep = el("input"); keep.type = "checkbox"; keep.id = "v61Keep"; keep.checked = !!loadTo();
    keepRow.appendChild(keep); keepRow.appendChild(el("span", "", "Retenir cette adresse sur cet appareil (rien n'est envoyé ailleurs)")); card.appendChild(keepRow);
    var persoRow = el("label", "v61-check"), perso = el("input"); perso.type = "checkbox"; perso.id = "v61Perso"; perso.checked = true;
    var hasCard = !!(ctx.card && ctx.card()); persoRow.appendChild(perso); persoRow.appendChild(el("span", "", "Ajouter mon bilan personnel" + (hasCard ? "" : " (introuvable : ton prénom n'est pas dans cette partie)"))); if (!hasCard) { perso.checked = false; perso.disabled = true; } card.appendChild(persoRow);
    var msg = el("div", "v61-msg"); msg.id = "v61Msg"; msg.setAttribute("role", "status"); msg.setAttribute("aria-live", "polite");
    function say(t, bad) { msg.textContent = t; msg.className = "v61-msg" + (bad ? " bad" : t ? " ok" : ""); }
    function email() {
      var v = to.value.trim();
      if (v && !M.validEmail(v)) { say("⚠️ Cette adresse n'a pas l'air valide (une seule adresse, sans espace).", true); to.focus(); return null; }
      if (keep.checked && v) saveTo(v); else if (!keep.checked) saveTo("");
      return v;
    }
    function text(prefix) { return M.message(ctx.recap(), ctx.card ? ctx.card() : null, { personal: perso.checked, prefix: prefix }); }
    keep.addEventListener("change", function () { var v = to.value.trim(); if (!keep.checked) saveTo(""); else if (M.validEmail(v)) saveTo(v); });
    function copy(t) { try { return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; }); } catch (e) { return Promise.resolve(false); } }
    function go(kind) {
      var v = email(); if (v === null) return;
      var body = text(), r = M.url(kind, { to: v, subject: subj, body: body });
      api.lastUrl = r.url; api.lastKind = kind;
      if (r.truncated) copy(body);
      if (kind === "mailto") { var a = el("a"); a.href = r.url; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
      else window.open(r.url, "_blank", "noopener,noreferrer");
      say(kind === "mailto" ? "✉️ Ton application de messagerie s'ouvre" + (r.truncated ? " (résumé raccourci, message complet copié)" : "") + ". Si rien ne s'ouvre, choisis Gmail ou Outlook, ou copie le message." : "✉️ La page « nouveau message » s'ouvre dans un nouvel onglet" + (r.truncated ? " (résumé raccourci, message complet copié)" : "") + ".");
    }
    var row = el("div", "v61-row"); card.appendChild(row);
    function btn(id, label, fn, primary) { var b = el("button", "btn " + (primary ? "btn-primary" : "btn-secondary") + " v61-b", label); b.type = "button"; b.id = id; b.addEventListener("click", fn); row.appendChild(b); return b; }
    btn("v61Mailto", "📧 Mon application de messagerie", function () { go("mailto"); }, true);
    btn("v61Gmail", "Gmail", function () { go("gmail"); });
    btn("v61Outlook", "Outlook", function () { go("outlook"); });
    btn("v61Pdf", "📎 Avec le PDF joint", function () {
      var v = email(); if (v === null) return;
      var body = text(), bytes = null, file = null;
      try { bytes = ctx.pdf(false); file = new File([bytes], M.fileName(ctx.log.at, false), { type: "application/pdf" }); } catch (e) { say("⚠️ Le PDF n'a pas pu être créé : " + (e && e.message ? e.message : "erreur") + ". Utilise « Mon application de messagerie ».", true); return; }
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        api.lastKind = "share";
        navigator.share({ files: [file], title: subj, text: body }).then(function () { say("📎 Choisis ton application de messagerie dans le menu de partage : le PDF est déjà joint."); }, function (e) { if (!e || e.name !== "AbortError") say("⚠️ Le partage a échoué : télécharge le PDF et joins-le à ton e-mail.", true); });
        return;
      }
      /* pas de partage de fichier (ordinateur) : on télécharge le PDF, on prépare l'e-mail, il ne reste qu'à joindre le fichier */
      try { ctx.pdfDownload(); } catch (e) {}
      var r = M.url("mailto", { to: v, subject: subj, body: text("📎 PDF des statistiques : " + M.fileName(ctx.log.at, false) + " (téléchargé sur cet appareil, à joindre à ce message).") });
      api.lastUrl = r.url; api.lastKind = "mailto-pdf";
      var a = el("a"); a.href = r.url; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      say("📎 Le PDF vient d'être téléchargé : joins-le au message qui s'ouvre (glisse le fichier dans l'e-mail).");
    });
    btn("v61Copy", "📋 Copier le message", function () {
      copy(text()).then(function (ok) { say(ok ? "✓ Message copié : colle-le dans ton e-mail." : "✗ Copie impossible : sélectionne le texte à la main.", !ok); });
    });
    card.appendChild(msg);
    var prevH = el("details", "v61-prev"); prevH.appendChild(el("summary", "", "👀 Voir le message"));
    var pre = el("pre", "v61-pre"); prevH.appendChild(pre); prevH.addEventListener("toggle", function () { if (prevH.open) pre.textContent = subj + "\n\n" + text(); }); card.appendChild(prevH);
    var closeB = el("button", "btn btn-secondary v61-close", "Fermer"); closeB.type = "button"; closeB.addEventListener("click", close); card.appendChild(closeB);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", onKey, true);
    (ctx.host || document.body).appendChild(box);
    setTimeout(function () { try { to.focus(); } catch (e) {} }, 30);
  }
  var api = { open: open, close: close, lastUrl: "", lastKind: "", isOpen: function () { return !!box; } };
  window.V61MailUI = api;
})();
