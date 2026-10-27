/* =========================================================
V7 — HISTORIQUE, MEILLEURES PARTIES, EXPORT PDF
========================================================= */
const SESS_KEY="quizSessionsV7";
function loadSessions(){
try{return JSON.parse(localStorage.getItem(SESS_KEY)||"[]");}catch(e){return [];}
}
function storeSessions(list){
try{localStorage.setItem(SESS_KEY,JSON.stringify(list.slice(0,60)));}catch(e){}
}
function saveCurrentSession(sorted){
const key=window.__gameKey||String(Date.now());
if(window.__savedKey===key)return;
window.__savedKey=key;
const log=(window.__log||[]).slice();
const rec={
id:key,
ts:Date.now(),
title:document.title||"Quiz",
lang:window.__qlang||"fr",
rounds:log.length,
impossible:log.some(l=>l.imp),
winner:sorted[0]?sorted[0].name:"?",
topScore:sorted[0]?(sorted[0].score||0):0,
players:sorted.map(p=>({
name:p.name,score:p.score||0,correct:p.correct||0,wrong:p.wrong||0,
bestCombo:p.bestCombo||0,bonusPoints:p.bonusPoints||0,malusPoints:p.malusPoints||0,
bonusesGiven:p.bonusesGiven||0,malusesReceived:p.malusesReceived||0,me:p.id===myId
})),
log
};
const all=loadSessions().filter(s=>s.id!==rec.id);
all.unshift(rec);
storeSessions(all);
}
function fmtDate(ts){
return new Date(ts).toLocaleString();
}
function buildReportHTML(sessions){
const e=escapeHTML;
const pages=sessions.map((s,i)=>{
const rows=s.players.map((p,k)=>
`<tr><td>${k+1}</td><td>${e(p.name)}${p.me?" (moi)":""}</td><td><b>${p.score}</b></td><td>${p.correct}</td><td>${p.wrong}</td><td>${p.bestCombo}</td><td>+${p.bonusPoints}</td><td>-${p.malusPoints}</td></tr>`
).join("");
const qs=(s.log||[]).map(l=>
`<tr><td>${l.n}</td><td>${e(l.cat||"")}</td><td>${e(String(l.diff||""))}</td><td>${e(l.q||"")}</td><td>${e(l.a||"")}</td><td>${l.mine===null||l.mine===undefined?"—":(l.mine?"✓":"✗")}</td><td>${e(l.all||"")}</td></tr>`
).join("");
const good=(s.log||[]).filter(l=>l.mine===true).length;
const answered=(s.log||[]).filter(l=>l.mine!==null&&l.mine!==undefined).length;
return `<section class="page">
<h1>Rapport de session ${sessions.length>1?`n°${i+1}`:""}</h1>
<p class="meta">${e(s.title)} — ${e(fmtDate(s.ts))} — langue : ${e(s.lang)} — ${s.rounds} questions — ${s.players.length} joueur(s)${s.impossible?" — question impossible jouée":""}</p>
<h2>🏆 Vainqueur : ${e(s.winner)} (${s.topScore} pts)</h2>
<h3>Classement et statistiques</h3>
<table><tr><th>#</th><th>Joueur</th><th>Score</th><th>Justes</th><th>Fausses</th><th>Meilleur combo</th><th>Bonus</th><th>Malus</th></tr>${rows}</table>
${answered?`<p class="meta">Mes réponses : ${good} / ${answered} justes (${Math.round(good/answered*100)} %)</p>`:""}
<h3>Questions de la partie</h3>
<table><tr><th>#</th><th>Thème</th><th>Niveau</th><th>Question</th><th>Bonne réponse</th><th>Moi</th><th>Tous les joueurs</th></tr>${qs||'<tr><td colspan="6">Journal des questions non disponible.</td></tr>'}</table>
</section>`;
}).join("");
return `<!doctype html><html><head><meta charset="utf-8"><title>Rapport de session</title><style>
@page{margin:14mm}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px}
.page{page-break-after:always}.page:last-child{page-break-after:auto}
h1{font-size:24px;margin:0 0 4px;color:#4c1d95}h2{font-size:16px;margin:12px 0 6px}h3{font-size:13px;margin:14px 0 6px;color:#444}
.meta{color:#555;margin:2px 0 8px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}
th{background:#efe9ff}
tr:nth-child(even) td{background:#fafafa}
</style></head><body>${pages}
</body></html>`;
}
function exportSessionsPDF(ids){
const sessions=loadSessions().filter(s=>ids.includes(s.id));
if(!sessions.length){
alert("Sélectionne au moins une session.");
return;
}
const html=buildReportHTML(sessions);
window.__lastReportHTML=html;
const frame=document.createElement("iframe");
frame.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
document.body.appendChild(frame);
const doc=frame.contentWindow.document;
doc.open();
doc.write(html);
doc.close();
setTimeout(()=>{
try{
frame.contentWindow.focus();
frame.contentWindow.print();
}catch(err){}
setTimeout(()=>frame.remove(),3000);
},400);
}
function openHof(){
let modal=document.getElementById("hofModal");
if(!modal){
modal=document.createElement("div");
modal.id="hofModal";
modal.style.cssText="position:fixed;inset:0;z-index:4000;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;padding:14px";
modal.innerHTML=
'<div style="width:min(640px,100%);max-height:88vh;overflow:auto;border-radius:20px;background:#12122a;border:1px solid rgba(255,255,255,.18);color:#fff;padding:20px;font-family:inherit">'+
'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h2 style="margin:0">🏆 Meilleures parties</h2><button onclick="closeHof()" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">✕</button></div>'+
'<p style="opacity:.7;font-size:13px;margin-bottom:10px">Classées par meilleur score. Coche des sessions puis exporte-les en PDF (rapport complet).</p>'+
'<div id="hofList"></div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'+
'<button onclick="hofExport()" style="flex:1;min-width:150px;padding:11px;border:0;border-radius:12px;background:#7c3aed;color:#fff;font-weight:900;cursor:pointer">📄 Exporter la sélection (PDF)</button>'+
'<button onclick="hofAll()" style="padding:11px 14px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:none;color:#fff;font-weight:800;cursor:pointer">Tout cocher</button>'+
'<button onclick="hofClear()" style="padding:11px 14px;border:1px solid rgba(239,68,68,.5);border-radius:12px;background:none;color:#fca5a5;font-weight:800;cursor:pointer">🗑️ Vider</button>'+
'</div></div>';
document.body.appendChild(modal);
}
renderHof();
modal.style.display="flex";
}
function closeHof(){
const m=document.getElementById("hofModal");
if(m)m.style.display="none";
}
function renderHof(){
const list=document.getElementById("hofList");
const sessions=loadSessions().slice().sort((a,b)=>b.topScore-a.topScore);
if(!sessions.length){
list.innerHTML='<p style="opacity:.7;padding:14px 0">Aucune partie enregistrée pour l\'instant : termine une partie pour la voir apparaître ici.</p>';
return;
}
list.innerHTML=sessions.slice(0,15).map((s,i)=>
`<label style="display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,${i%2?".04":".08"});margin-bottom:6px;cursor:pointer">
<input type="checkbox" class="hofCheck" value="${escapeHTML(s.id)}">
<span style="font-size:20px;width:28px;text-align:center">${["🥇","🥈","🥉"][i]||"#"+(i+1)}</span>
<span style="flex:1;font-size:13px"><b>${escapeHTML(s.winner)}</b> — ${s.topScore} pts<br><span style="opacity:.65">${escapeHTML(fmtDate(s.ts))} · ${s.players.length} joueur(s) · ${s.rounds} q. · ${escapeHTML(s.lang)}</span></span>
</label>`
).join("");
}
function hofExport(){
const ids=[...document.querySelectorAll(".hofCheck:checked")].map(c=>c.value);
exportSessionsPDF(ids);
}
function hofAll(){
document.querySelectorAll(".hofCheck").forEach(c=>{c.checked=true;});
}
function hofClear(){
if(confirm("Effacer tout l'historique des parties ?")){
storeSessions([]);
renderHof();
}
}
/* ---------- accroches dans le jeu ---------- */
const __withFxV7=withFxMods;
withFxMods=function(q){
const out=__withFxV7(q);
out.lang=questionLang;
return out;
};
const __displayV7=displayQuestion;
displayQuestion=function(question,round){
if(question&&question.lang)window.__qlang=question.lang;
if(round===1){
window.__log=[];
window.__gameKey=String(Date.now());
window.__savedKey=null;
}
__displayV7(question,round);
if(question&&question.impossible){
const mine=(question.impIds||[]).includes(myId);
showBanner(mine
?"💀 QUESTION IMPOSSIBLE — juste : score ×4 · faux : score ÷4 !"
:"💀 Question impossible (les sans-faute jouent leur score) — points normaux pour toi");
}
};
const __qResultV7=showQuestionResult;
showQuestionResult=function(data){
__qResultV7(data);
const ok=myAnswerForQuestion===data.correct;
if(currentQuestion){
(window.__log=window.__log||[]).push({
n:window.__log.length+1,
cat:currentQuestion.category,
diff:currentQuestion.diffLabel||currentQuestion.difficulty,
q:currentQuestion.question,
a:currentQuestion.answers[data.correct],
mine:myAnswerForQuestion===null?null:ok,
imp:!!currentQuestion.impossible
});
}
speakResult(ok);
};
const __resultsV7=showResults;
showResults=function(data){
__resultsV7(data);
const sorted=Object.values(players).sort((a,b)=>(b.score||0)-(a.score||0));
saveCurrentSession(sorted);
const card=document.querySelector("#resultsScreen .card");
if(card&&!document.getElementById("resultsExtras")){
const box=document.createElement("div");
box.id="resultsExtras";
box.style.cssText="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap";
box.innerHTML=
'<button class="btn btn-secondary" style="flex:1;min-width:200px" onclick="openHof()">🏆 Meilleures parties</button>'+
'<button class="btn btn-primary" style="flex:1;min-width:200px" onclick="exportSessionsPDF([window.__savedKey])">📄 Rapport PDF de cette partie</button>';
card.appendChild(box);
}
};
buildChatUI();
/* Règles : nouvelles lignes */
RULES_TEXT.fr+="<br><b>💀 Sans-faute :</b> si tu n'as fait aucune erreur, tu débloques la <b>question impossible</b> : juste = score ×4, faux = score ÷4.<br><b>💬 Chat :</b> reste poli, les insultes et mots vulgaires sont bloqués. <b>🔊 Voix :</b> « bonne / mauvaise réponse » (désactivable).";
RULES_TEXT.en+="<br><b>💀 Flawless:</b> with zero mistakes you unlock the <b>impossible question</b>: right = score ×4, wrong = score ÷4.<br><b>💬 Chat:</b> keep it polite, insults and vulgar words are blocked. <b>🔊 Voice:</b> 'correct / wrong answer' (can be turned off).";
RULES_TEXT.es+="<br><b>💀 Sin fallos:</b> si no has fallado ninguna, desbloqueas la <b>pregunta imposible</b>: acierto = puntuación ×4, fallo = puntuación ÷4.<br><b>💬 Chat:</b> sé educado, los insultos y palabras vulgares se bloquean. <b>🔊 Voz:</b> «respuesta correcta / incorrecta» (se puede desactivar).";
setRulesLang("fr");
