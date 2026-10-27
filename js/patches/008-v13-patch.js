/* Extrait de l'ancien index.html : <script id="v13-patch"> */
(function V13(){
"use strict";
const A=window.v13ChatArchive=window.v13ChatArchive||[];
const makeId=()=>"v13-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
function archive(entry){
if(!isHost)return null;
const e={id:entry.id||makeId(),time:entry.time||new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}),at:entry.at||new Date().toISOString(),playerId:String(entry.playerId||""),name:String(entry.name||"Utilisateur").slice(0,30),text:String(entry.text||"").slice(0,220),status:entry.status||"published",reason:entry.reason||""};
const existing=A.find(x=>x.id===e.id);if(existing)Object.assign(existing,e);else A.push(e);if(A.length>500)A.splice(0,A.length-500);return e;
}
function mark(id,status,reason=""){if(!isHost)return;const e=A.find(x=>x.id===id);if(e){e.status=status;e.reason=reason;e.moderatedAt=new Date().toISOString();}}
/* Capture des messages réellement publiés par l'hôte. */
const priorAdd13=addChatMessage;
addChatMessage=function(m){if(isHost&&m&&m.id)archive({id:m.id,time:m.time,playerId:m.playerId,name:m.name,text:m.text,status:"published"});return priorAdd13(m);};
/* Capture aussi les tentatives bloquées sans diffuser leur contenu aux autres joueurs. */
const priorRelay13=relayChat;
relayChat=function(msg){
if(isHost&&msg){const p=players[msg.playerId];const check=window.v12AdvancedFilter?window.v12AdvancedFilter(msg.text):{blocked:false};if(check.blocked){archive({playerId:msg.playerId,name:p?.name||msg.name,text:msg.text,status:"blocked",reason:"Filtre automatique renforcé"});}}
return priorRelay13(msg);
};
const priorDelete13=window.requestDeleteMessageV12;
window.requestDeleteMessageV12=function(id){if(isHost)mark(id,"deleted","Supprimé manuellement par l’hôte");return priorDelete13(id);};
function snapshot(){return A.map(x=>({...x}));}
function esc13(v){return escapeHTML(String(v??""));}
function statusLabel(s){return s==="deleted"?"Supprimé":s==="blocked"?"Bloqué":"Publié";}
function renderHostChatReport(){
if(!isHost)return;const card=document.querySelector("#resultsScreen .card");if(!card)return;let box=document.getElementById("v13HostChatReport");if(box)box.remove();box=document.createElement("div");box.id="v13HostChatReport";box.className="v13-chat-report";
const rows=snapshot();box.innerHTML='<h3>💬 Historique du chat <span class="v13-host-only">HÔTE UNIQUEMENT</span></h3><p class="subtitle" style="margin-bottom:10px">'+rows.length+' entrée(s), dont '+rows.filter(x=>x.status==="deleted").length+' supprimée(s) et '+rows.filter(x=>x.status==="blocked").length+' bloquée(s).</p><div class="v13-chat-report-list">'+(rows.map(x=>'<div class="v13-chat-report-row"><span>'+esc13(x.time)+'</span><b>@'+esc13(x.name)+'</b><span class="v13-text">'+esc13(x.text)+'</span><span class="v13-status '+esc13(x.status)+'">'+statusLabel(x.status)+'</span></div>').join('')||'<div class="subtitle">Aucun message pendant cette partie.</div>')+'</div><button type="button" class="btn btn-primary" onclick="downloadLastReportV9()">📄 Télécharger le rapport V13 complet</button>';
card.appendChild(box);
}
/* Enregistrement exclusif chez l'hôte. Aucun historique du chat n'est inscrit dans la session locale des invités. */
const save13=saveCurrentSession;saveCurrentSession=function(sorted){save13(sorted);if(!isHost)return;try{const all=loadSessions(),rec=all.find(x=>x.id===window.__savedKey);if(rec){rec.version="V13";rec.chatHistory=snapshot();rec.chatSummary={total:rec.chatHistory.length,published:rec.chatHistory.filter(x=>x.status==="published").length,deleted:rec.chatHistory.filter(x=>x.status==="deleted").length,blocked:rec.chatHistory.filter(x=>x.status==="blocked").length};rec.chatHistoryHostOnly=true;storeSessions(all);window.v9LastFinishedData=rec;localStorage.setItem("quizV9LastReport",JSON.stringify(rec));}}catch(e){console.warn("V13 chat report",e);}};
const results13=showResults;showResults=function(data){const r=results13(data);setTimeout(renderHostChatReport,850);return r;};
const start13=startGame;startGame=function(){if(isHost)A.splice(0,A.length);return start13();};
const reset13=resetConnection;resetConnection=function(){A.splice(0,A.length);return reset13();};
/* Rapport PDF V13 : reprend les rubriques V12 et ajoute une annexe intégrale du chat, uniquement sur l'appareil hôte. */
const pdf13=window.downloadSessionPDFV9;window.downloadSessionPDFV9=function(id){
if(!isHost){alert("Le rapport contenant l’historique du chat est réservé à l’hôte de la partie.");return;}
try{
const s=loadSessions().find(x=>x.id===id)||JSON.parse(localStorage.getItem("quizV9LastReport")||"null");if(!s||!window.jspdf?.jsPDF)return pdf13(id);
const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"});let y=18;const page=()=>{doc.addPage();y=18;};const write=(t,size=10,bold=false,indent=0)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);const ls=doc.splitTextToSize(String(t??""),180-indent);if(y+ls.length*5>282)page();doc.text(ls,15+indent,y);y+=ls.length*5+2;};const heading=t=>{if(y>255)page();y+=2;doc.setTextColor(76,29,149);write(t,14,true);doc.setTextColor(25);};
doc.setFillColor(76,29,149);doc.rect(0,0,210,36,"F");doc.setTextColor(255);doc.setFontSize(22);doc.text("QUI SUIS-JE ? - RAPPORT V13",15,16);doc.setFontSize(9);doc.text("Rapport confidentiel de l'hote",15,25);doc.text(new Date(s.ts||Date.now()).toLocaleString("fr-FR"),195,25,{align:"right"});y=46;doc.setTextColor(25);
heading("RESUME DE LA PARTIE");write("Vainqueur : "+(s.winner||"-")+" - "+(s.topScore||0)+" points",11,true);write("Mode : "+(s.modeLabel||s.mode||"Individuel")+" | Variante : "+(s.variant||"classique")+" | Questions : "+(s.rounds||0)+" | Temps/question : "+(s.questionTime||"-")+" s");write("Themes : "+((s.themeSelection||[]).join(", ")||"Non disponibles"));
heading("CLASSEMENT COMPLET");(s.players||[]).forEach((p,i)=>write((i+1)+". "+p.name+" - "+p.score+" pts | "+p.correct+" bonnes | "+p.wrong+" erreurs | combo max "+p.bestCombo,9,i===0));
heading("DETAIL DES QUESTIONS");(s.log||[]).forEach(q=>{write((q.n||"")+". "+(q.q||""),9,true);write("Theme : "+(q.cat||"-")+" | Niveau : "+(q.diff||"-")+" | Bonne reponse : "+(q.a||"-")+" | Resultat : "+(q.mine===true?"correct":q.mine===false?"incorrect":"sans reponse"),8,2);});
heading("EVALUATIONS DE FIN DE PARTIE");const rs=s.ratings||[];if(rs.length){[["questions","Questions"],["difficulty","Difficulte"],["variety","Variete"],["fun","Plaisir"],["overall","Global"]].forEach(([k,l])=>write(l+" : "+(rs.reduce((a,r)=>a+(+r[k]||0),0)/rs.length).toFixed(1)+" / 5"));rs.filter(r=>r.comment).forEach(r=>write((r.name||"Utilisateur")+" : "+r.comment,8));}else write("Aucune evaluation recue.");
heading("MODERATION ET ADMINISTRATION");const m=s.moderation||{};write("Messages supprimes : "+(m.deletedMessages||0)+" | Messages bloques : "+(m.blockedMessages||0)+" | Joueurs en sourdine : "+((m.mutedPlayers||[]).join(", ")||"aucun"));(m.events||[]).forEach(e=>write("["+(e.time||"")+"] "+(e.action||"")+" - "+(e.detail||""),8));
heading("HISTORIQUE CONFIDENTIEL DU CHAT - HOTE UNIQUEMENT");const history=s.chatHistory||snapshot();write("Total : "+history.length+" | Publies : "+history.filter(x=>x.status==="published").length+" | Supprimes : "+history.filter(x=>x.status==="deleted").length+" | Bloques : "+history.filter(x=>x.status==="blocked").length,9,true);if(history.length){history.forEach((x,i)=>{write((i+1)+". ["+(x.time||"")+"] @"+(x.name||"Utilisateur")+" - "+statusLabel(x.status),8,true);write(x.text||"",8,false,2);if(x.reason)write("Motif : "+x.reason,7,false,2);});}else write("Aucun message pendant cette partie.");
for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(100);doc.text("V13 - Confidentiel hote | Page "+i+" / "+doc.getNumberOfPages(),105,290,{align:"center"});}
doc.save("qui-suis-je-V13-hote-"+String(s.id||Date.now()).slice(-8)+".pdf");
}catch(e){console.error("PDF V13",e);return pdf13(id);}
};
document.title="Qui suis-je ? 🎮 — V17";console.log("V13 chargée : historique confidentiel du chat dans le rapport de l’hôte.");
})();
