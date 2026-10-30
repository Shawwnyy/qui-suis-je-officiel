/* Extrait de l'ancien index.html : <script id="v161-report-fix"> */
(function V161ReportFix(){
"use strict";
const REPORT_COUNTER_KEY="quizReportCounterV161";
function nextReportNumber(){
try{const n=Math.max(0,Number(localStorage.getItem(REPORT_COUNTER_KEY)||0))+1;localStorage.setItem(REPORT_COUNTER_KEY,String(n));return n;}catch(e){return Date.now();}
}
function cleanPdfText(v){
return String(v??"").normalize("NFC")
.replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/gu,"")
.replace(/[\u200B-\u200D\uFE0E\uFE0F]/g,"")
.replace(/[^\x20-\x7E\xA0-\xFF]/g,"")
.replace(/\s+/g," ").trim();
}
function safeFileName(v){return cleanPdfText(v).replace(/[<>:"/\\|?*]+/g,"-").replace(/\s+/g," ").trim();}
function getReportSession(id){
let s=null;try{s=loadSessions().find(x=>String(x.id)===String(id));}catch(e){}
if(!s){try{s=JSON.parse(localStorage.getItem("quizV9LastReport")||"null");}catch(e){}}
return s;
}
window.downloadSessionPDFV9=function(id){
if(!isHost){alert("Le rapport complet est réservé à l’hôte de la partie.");return;}
try{
const s=getReportSession(id);if(!s){alert("Rapport introuvable.");return;}
if(!window.jspdf?.jsPDF){alert("Le générateur PDF n’est pas disponible. Vérifie la connexion Internet puis réessaie.");return;}
const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4",compress:true});
const reportNo=nextReportNumber(),title="Rapport Qui suis-je "+reportNo;
let y=44;
const page=()=>{doc.addPage();y=18;};
const ensure=h=>{if(y+h>282)page();};
const write=(value,size=9,bold=false,indent=0,spacing=2)=>{const t=cleanPdfText(value)||"-";doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);const lines=doc.splitTextToSize(t,180-indent);ensure(lines.length*4.5+spacing);doc.text(lines,15+indent,y);y+=lines.length*4.5+spacing;};
const heading=value=>{ensure(13);y+=2;doc.setTextColor(76,29,149);write(value,13,true,0,3);doc.setTextColor(25,25,35);};
doc.setFillColor(76,29,149);doc.rect(0,0,210,35,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text(title.toUpperCase(),15,15);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.text("Rapport confidentiel de l'hote",15,25);doc.text(new Date(s.ts||Date.now()).toLocaleString("fr-FR"),195,25,{align:"right"});doc.setTextColor(25,25,35);
heading("RESUME DE LA PARTIE");write("Vainqueur : "+(s.winner||"-")+" - "+Number(s.topScore||0)+" points",10,true);write("Mode : "+(s.modeLabel||s.mode||"Individuel")+" | Variante : "+(s.variant||"classique")+" | Questions : "+Number(s.rounds||0)+" | Temps/question : "+(s.questionTime||"-")+" s");write("Themes : "+((s.themeSelection||[]).map(cleanPdfText).filter(Boolean).join(", ")||"Non disponibles"));
heading("CLASSEMENT COMPLET");(s.players||[]).forEach((p,i)=>write((i+1)+". "+(p.name||"Joueur")+" - "+Number(p.score||0)+" pts | "+Number(p.correct||0)+" bonnes | "+Number(p.wrong||0)+" erreurs | combo max "+Number(p.bestCombo||0),9,i===0));
heading("DETAIL DES QUESTIONS");if((s.log||[]).length){(s.log||[]).forEach((q,i)=>{write((q.n||i+1)+". "+(q.q||"Question indisponible"),9,true);write("Theme : "+(q.cat||"-")+" | Niveau : "+(q.diff||"-")+" | Bonne reponse : "+(q.a||"-")+" | Resultat : "+(q.mine===true?"correct":q.mine===false?"incorrect":"sans reponse"),8,false,2);if(q.why)write("Pourquoi : "+q.why,8,false,2);if(q.all)write("Tous les joueurs : "+q.all,8,false,2);});}else write("Journal des questions non disponible.");
heading("EVALUATIONS DE FIN DE PARTIE");const rs=s.ratings||[];if(rs.length){[["questions","Questions"],["difficulty","Difficulte"],["variety","Variete"],["fun","Plaisir"],["overall","Global"]].forEach(([k,l])=>write(l+" : "+(rs.reduce((a,r)=>a+(Number(r[k])||0),0)/rs.length).toFixed(1)+" / 5"));rs.filter(r=>r.comment).forEach(r=>write((r.name||"Utilisateur")+" : "+r.comment,8));}else write("Aucune evaluation recue.");
heading("MODERATION ET ADMINISTRATION");const m=s.moderation||{};write("Messages supprimes : "+Number(m.deletedMessages||0)+" | Messages bloques : "+Number(m.blockedMessages||0)+" | Joueurs en sourdine : "+((m.mutedPlayers||[]).join(", ")||"aucun"));(m.events||[]).forEach(e=>write("["+(e.time||"")+"] "+(e.action||"")+" - "+(e.detail||""),8));
heading("HISTORIQUE CONFIDENTIEL DU CHAT - HOTE UNIQUEMENT");const history=s.chatHistory||[];write("Total : "+history.length+" | Publies : "+history.filter(x=>x.status==="published").length+" | Supprimes : "+history.filter(x=>x.status==="deleted").length+" | Bloques : "+history.filter(x=>x.status==="blocked").length,9,true);if(history.length){history.forEach((x,i)=>{write((i+1)+". ["+(x.time||"")+"] @"+(x.name||"Utilisateur")+" - "+(x.status==="deleted"?"Supprime":x.status==="blocked"?"Bloque":"Publie"),8,true);write(x.text||"",8,false,2);if(x.reason)write("Motif : "+x.reason,7,false,2);});}else write("Aucun message pendant cette partie.");
const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100);doc.text(title+" | Page "+i+" / "+pages,105,290,{align:"center"});}
doc.save(safeFileName(title)+".pdf");
}catch(e){console.error("Rapport V16.2",e);alert("Une erreur a empêché la génération du rapport. Recharge la page puis réessaie.");}
};
window.downloadLastReportV9=function(){let id=window.__savedKey;try{if(!id)id=JSON.parse(localStorage.getItem("quizV9LastReport")||"null")?.id;}catch(e){}if(!id){alert("Le rapport de cette partie n’est pas encore disponible.");return;}downloadSessionPDFV9(id);};
document.title="Qui suis-je ? 🎮 — V17";
console.log("V16.2 : rapports PDF corrigés et renommés Rapport Qui suis-je N.");
})();
