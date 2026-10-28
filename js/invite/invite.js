/* =============================================================================
   V50 — Lien d'invitation : « https://…/?room=123456 »
   • L'hôte copie (ou partage, sur téléphone) un lien depuis le salon d'attente.
   • Le camarade ouvre le lien : le code est déjà saisi, il n'a plus qu'à entrer son prénom et cliquer « Rejoindre ».
   Rien à installer, aucune inscription.
   parseInvite() et buildUrl() sont purs : testables avec Node (tests/invite.test.js).
   ============================================================================= */
var QInvite = (function () {
  "use strict";
  /* « ?room=123456 », « ?salle=123456 », « ?code=123456 » ou « #123456 » → « 123456 » (sinon « ») */
  function parseInvite(search, hash) {
    var m = /[?&](?:room|salle|code)=(\d{6})(?![\d])/.exec(String(search || ""));
    if (m) return m[1];
    var h = /^#(?:room=|salle=)?(\d{6})$/.exec(String(hash || ""));
    return h ? h[1] : "";
  }
  function buildUrl(base, code) {
    if (!/^\d{6}$/.test(String(code || ""))) return "";
    var b = String(base || "").split("#")[0].split("?")[0];
    return b ? b + "?room=" + code : "";
  }
  var api = { parseInvite: parseInvite, buildUrl: buildUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window === "undefined" || typeof document === "undefined") return api;
  window.QInvite = api;

  function $(id) { return document.getElementById(id); }
  function say(text) {
    var w = $("waitingText"); if (!w) return;
    var old = "Partage le code à tes amis !";
    w.textContent = text; setTimeout(function () { if (w.textContent === text) w.textContent = old; }, 2500);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error("no clipboard"));
  }
  function invite() {
    var code = typeof roomCode !== "undefined" ? roomCode : "";
    var url = buildUrl(location.href, code);
    if (!url) return;
    var text = "Rejoins ma partie « Qui suis-je ? » : code " + code;
    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
      navigator.share({ title: "Qui suis-je ?", text: text, url: url }).catch(function () {});
      return;
    }
    copyText(url).then(function () { say("✅ Lien d'invitation copié !"); }, function () { try { window.prompt("Copie ce lien et envoie-le à tes amis :", url); } catch (e) {} });
  }
  function mountButton() {
    if ($("inviteBtn")) return;
    var header = document.querySelector("#lobbyScreen .room-header"); if (!header || !header.parentNode) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "inviteBtn"; b.className = "btn btn-secondary"; b.style.marginBottom = "14px";
    b.textContent = "🔗 Copier le lien d'invitation";
    b.addEventListener("click", invite);
    header.parentNode.insertBefore(b, header.nextSibling);
  }
  function applyInvite() {
    var code = parseInvite(location.search, location.hash);
    var input = $("roomInput"); if (!code || !input) return;
    input.value = code;
    try { if (typeof showMessage === "function") showMessage("homeMessage", "👋 Tu es invité(e) dans la salle " + code + " : entre ton prénom puis clique sur « Rejoindre ».", "success"); } catch (e) {}
    var name = $("joinName");
    setTimeout(function () { try { if (name) { name.scrollIntoView({ block: "center", behavior: "smooth" }); name.focus({ preventScroll: true }); } } catch (e) {} }, 250);
  }
  function start() { mountButton(); applyInvite(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  return api;
})();
