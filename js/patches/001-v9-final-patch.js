/* Extrait de l'ancien index.html : <script id="v9-final-patch"> */
(function V9FinalPatch(){
"use strict";
const V9_THEME_LIST=[
"🌍 Géographie","🦁 Animaux","🎮 Jeux vidéo","🎬 Cinéma","🚀 Sciences","🧠 Culture générale","🎵 Musique","🍕 Cuisine","⚽ Sport","💻 Informatique","🌐 Web","🎨 Art","🏛️ Histoire","📚 Littérature","💡 Technologie","🌿 Nature","⚡ Mythologie","🗣️ Langues","🤯 Incroyable mais vrai","🪐 Espace","😂 Internet & Mèmes","🧬 Corps humain","🏆 Records","🧳 Voyages","🎌 Manga & Animation","🧪 Inventions","🦄 Fantasy","🎲 Jeux de société","🕺 Pop culture","🧛 Légendes & Monstres",
"💰 Économie & Argent","🔬 Médecine & Santé","⚖️ Droit & Justice","🏛️ Politique & Société","🧩 Psychologie","🕵️ Mystères & Enquêtes","🔐 Énigmes & Logique","🔮 Superstitions & Paranormal","🏺 Archéologie","🌋 Géologie & Volcans","🌦️ Météo & Climat","🐉 Créatures mythiques","🚗 Automobile","✈️ Aviation","🚢 Océans & Navigation","🏗️ Architecture","👗 Mode & Tendances","📸 Photographie","🎭 Théâtre & Spectacle","📰 Actualités & Monde"
];
const NEW_Q=[
["💰 Économie & Argent","Quel terme désigne une hausse générale et durable des prix ?",["L'inflation","La déflation","Le troc","Le dividende"],"What term means a general, lasting rise in prices?",["Inflation","Deflation","Barter","Dividend"],"¿Qué término designa una subida general y duradera de los precios?",["La inflación","La deflación","El trueque","El dividendo"]],
["🔬 Médecine & Santé","Quel professionnel délivre généralement les médicaments prescrits ?",["Le pharmacien","L'architecte","Le notaire","Le géologue"],"Which professional usually dispenses prescribed medicines?",["The pharmacist","The architect","The notary","The geologist"],"¿Qué profesional dispensa normalmente los medicamentos recetados?",["El farmacéutico","El arquitecto","El notario","El geólogo"]],
["⚖️ Droit & Justice","Comment appelle-t-on une décision rendue par un tribunal ?",["Un jugement","Un sondage","Un budget","Un traité musical"],"What is a decision issued by a court called?",["A judgment","A poll","A budget","A musical treaty"],"¿Cómo se llama una decisión dictada por un tribunal?",["Una sentencia","Una encuesta","Un presupuesto","Un tratado musical"]],
["🏛️ Politique & Société","Comment appelle-t-on le droit de choisir ses représentants par un vote ?",["Le suffrage","Le forage","Le cryptage","Le péage"],"What is the right to choose representatives by voting called?",["Suffrage","Drilling","Encryption","A toll"],"¿Cómo se llama el derecho a elegir representantes mediante voto?",["El sufragio","La perforación","El cifrado","El peaje"]],
["🧩 Psychologie","Quel mot désigne la capacité à se mettre à la place d'autrui ?",["L'empathie","L'inertie","L'ironie","L'amnésie"],"What word means the ability to put yourself in another person's place?",["Empathy","Inertia","Irony","Amnesia"],"¿Qué palabra designa la capacidad de ponerse en el lugar de otra persona?",["La empatía","La inercia","La ironía","La amnesia"]],
["🕵️ Mystères & Enquêtes","Quel élément matériel peut aider à résoudre une enquête ?",["Un indice","Un refrain","Une recette","Une orbite"],"What physical element can help solve an investigation?",["A clue","A chorus","A recipe","An orbit"],"¿Qué elemento material puede ayudar a resolver una investigación?",["Una pista","Un estribillo","Una receta","Una órbita"]],
["🔐 Énigmes & Logique","Si tous les A sont B et tous les B sont C, alors tous les A sont-ils C ?",["Oui","Non","Seulement la nuit","Impossible à lire"],"If all A are B and all B are C, are all A also C?",["Yes","No","Only at night","Impossible to read"],"Si todos los A son B y todos los B son C, ¿todos los A son C?",["Sí","No","Solo de noche","Imposible de leer"]],
["🔮 Superstitions & Paranormal","Quel objet est souvent associé à la superstition du vendredi 13 ?",["Le porte-bonheur","Le thermomètre","Le compas","Le clavier"],"Which object is often associated with superstition?",["A lucky charm","A thermometer","A compass","A keyboard"],"¿Qué objeto suele asociarse con la superstición?",["Un amuleto","Un termómetro","Un compás","Un teclado"]],
["🏺 Archéologie","Comment appelle-t-on l'étude des sociétés anciennes par leurs vestiges ?",["L'archéologie","L'astrologie","La météorologie","La cardiologie"],"What is the study of ancient societies through their remains called?",["Archaeology","Astrology","Meteorology","Cardiology"],"¿Cómo se llama el estudio de las sociedades antiguas mediante sus restos?",["La arqueología","La astrología","La meteorología","La cardiología"]],
["🌋 Géologie & Volcans","Comment appelle-t-on la roche en fusion sous la surface terrestre ?",["Le magma","La lave froide","Le quartz","Le sable"],"What is molten rock below Earth's surface called?",["Magma","Cold lava","Quartz","Sand"],"¿Cómo se llama la roca fundida bajo la superficie terrestre?",["El magma","La lava fría","El cuarzo","La arena"]],
["🌦️ Météo & Climat","Quel instrument mesure la température de l'air ?",["Le thermomètre","Le baromètre","L'anémomètre","La boussole"],"Which instrument measures air temperature?",["A thermometer","A barometer","An anemometer","A compass"],"¿Qué instrumento mide la temperatura del aire?",["El termómetro","El barómetro","El anemómetro","La brújula"]],
["🐉 Créatures mythiques","Quelle créature est souvent représentée avec un corps de cheval et une corne ?",["La licorne","Le kraken","Le cyclope","Le minotaure"],"Which creature is often shown with a horse's body and one horn?",["The unicorn","The kraken","The cyclops","The minotaur"],"¿Qué criatura suele representarse con cuerpo de caballo y un cuerno?",["El unicornio","El kraken","El cíclope","El minotauro"]],
["🚗 Automobile","Quelle pédale permet généralement de ralentir une voiture ?",["Le frein","L'accélérateur","L'embrayage seul","Le klaxon"],"Which pedal generally slows a car?",["The brake","The accelerator","The clutch alone","The horn"],"¿Qué pedal permite normalmente frenar un coche?",["El freno","El acelerador","Solo el embrague","El claxon"]],
["✈️ Aviation","Comment s'appelle la personne qui commande un avion ?",["Le pilote","Le capitaine de port","Le machiniste","Le libraire"],"What is the person who controls an aircraft called?",["The pilot","The harbour master","The machinist","The bookseller"],"¿Cómo se llama la persona que controla un avión?",["El piloto","El capitán de puerto","El maquinista","El librero"]],
["🚢 Océans & Navigation","Quel instrument indique traditionnellement le nord magnétique ?",["La boussole","Le sextant seul","Le sonar","Le chronomètre"],"Which instrument traditionally indicates magnetic north?",["The compass","The sextant alone","Sonar","A stopwatch"],"¿Qué instrumento indica tradicionalmente el norte magnético?",["La brújula","Solo el sextante","El sonar","El cronómetro"]],
["🏗️ Architecture","Comment appelle-t-on une structure courbe qui franchit une ouverture ?",["Une arche","Une colonne","Une dalle","Une façade"],"What is a curved structure spanning an opening called?",["An arch","A column","A slab","A facade"],"¿Cómo se llama una estructura curva que salva una abertura?",["Un arco","Una columna","Una losa","Una fachada"]],
["👗 Mode & Tendances","Quel accessoire se porte généralement autour du cou ?",["Une écharpe","Une chaussure","Une ceinture de sécurité","Un gant"],"Which accessory is generally worn around the neck?",["A scarf","A shoe","A seat belt","A glove"],"¿Qué accesorio se lleva normalmente alrededor del cuello?",["Una bufanda","Un zapato","Un cinturón de seguridad","Un guante"]],
["📸 Photographie","Quel réglage contrôle la quantité de lumière entrant par l'objectif ?",["L'ouverture","Le haut-parleur","Le GPS","Le microphone"],"Which setting controls how much light enters through the lens?",["Aperture","The speaker","GPS","The microphone"],"¿Qué ajuste controla la cantidad de luz que entra por el objetivo?",["La apertura","El altavoz","El GPS","El micrófono"]],
["🎭 Théâtre & Spectacle","Comment appelle-t-on le texte prononcé par un acteur seul sur scène ?",["Un monologue","Un générique","Un éditorial","Un algorithme"],"What is a text spoken by one actor alone on stage called?",["A monologue","Credits","An editorial","An algorithm"],"¿Cómo se llama el texto pronunciado por un actor solo en escena?",["Un monólogo","Unos créditos","Un editorial","Un algoritmo"]],
["📰 Actualités & Monde","Quelle pratique consiste à vérifier une information avant de la partager ?",["La vérification des faits","Le copier-coller","Le hasard","Le montage sonore"],"What practice checks information before sharing it?",["Fact-checking","Copy and paste","Chance","Audio editing"],"¿Qué práctica consiste en verificar una información antes de compartirla?",["La verificación de hechos","Copiar y pegar","El azar","La edición de audio"]]
];
function addThemeQuestions(){
const existing=new Set(QUESTIONS.map(q=>q.category));
const en=LANG_PACKS.en.rows, es=LANG_PACKS.es.rows;
NEW_Q.forEach(r=>{
if(existing.has(r[0]))return;
const idx=QUESTIONS.length;
QUESTIONS.push({difficulty:"moyen",category:r[0],question:r[1],answers:r[2],correct:0});
while(en.length<idx)en.push(null); while(es.length<idx)es.push(null);
en[idx]=[r[3],r[4]]; es[idx]=[r[5],r[6]]; existing.add(r[0]);
});
Object.assign(LANG_PACKS.en.cats,{"Économie & Argent":"Economy & Money","Médecine & Santé":"Medicine & Health","Droit & Justice":"Law & Justice","Politique & Société":"Politics & Society","Psychologie":"Psychology","Mystères & Enquêtes":"Mysteries & Investigations","Énigmes & Logique":"Riddles & Logic","Superstitions & Paranormal":"Superstitions & Paranormal","Archéologie":"Archaeology","Géologie & Volcans":"Geology & Volcanoes","Météo & Climat":"Weather & Climate","Créatures mythiques":"Mythical Creatures","Automobile":"Automotive","Aviation":"Aviation","Océans & Navigation":"Oceans & Navigation","Architecture":"Architecture","Mode & Tendances":"Fashion & Trends","Photographie":"Photography","Théâtre & Spectacle":"Theatre & Performance","Actualités & Monde":"News & World"});
Object.assign(LANG_PACKS.es.cats,{"Économie & Argent":"Economía y dinero","Médecine & Santé":"Medicina y salud","Droit & Justice":"Derecho y justicia","Politique & Société":"Política y sociedad","Psychologie":"Psicología","Mystères & Enquêtes":"Misterios e investigaciones","Énigmes & Logique":"Acertijos y lógica","Superstitions & Paranormal":"Supersticiones y paranormal","Archéologie":"Arqueología","Géologie & Volcans":"Geología y volcanes","Météo & Climat":"Tiempo y clima","Créatures mythiques":"Criaturas míticas","Automobile":"Automóvil","Aviation":"Aviación","Océans & Navigation":"Océanos y navegación","Architecture":"Arquitectura","Mode & Tendances":"Moda y tendencias","Photographie":"Fotografía","Théâtre & Spectacle":"Teatro y espectáculo","Actualités & Monde":"Actualidad y mundo"});
const cats=getCategories();
if(cats.length!==50||V9_THEME_LIST.some(x=>!cats.includes(x))) console.error("V9: contrôle des thèmes échoué",cats.length,cats);
}
addThemeQuestions();
const baseGetCategories=getCategories;
getCategories=function(){const found=baseGetCategories();return V9_THEME_LIST.filter(x=>found.includes(x));};
function nowTime(){return new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});}
const typingUsers=new Map(); let typingLocal=false, typingStopTimer=null, typingHeartbeat=null;
function ensureTypingUI(){
buildChatUI(); const panel=chatEl("chatPanel"); if(!panel)return;
let area=chatEl("chatTyping"); if(!area){area=document.createElement("div");area.id="chatTyping";area.setAttribute("aria-live","polite");const warn=chatEl("chatWarn");panel.insertBefore(area,warn);}
const close=panel.querySelector("#chatHead button");if(close){close.id="chatClose";close.title="Fermer le chat";close.setAttribute("aria-label","Fermer le chat");close.textContent="✕";}
}
function renderTyping(){ensureTypingUI();const area=chatEl("chatTyping");if(!area)return;const now=Date.now();for(const [id,v] of typingUsers){if(now-v.seen>5500)typingUsers.delete(id);}area.innerHTML=[...typingUsers.values()].filter(v=>v.id!==myId).map(v=>"@"+escapeHTML(v.name)+" est en train d’écrire. — "+escapeHTML(v.time)).join("<br>");}
function sendTyping(active){
if(!myId)return; const msg={type:"typing",playerId:myId,name:myName,active:!!active,time:nowTime()};
if(isHost){processTyping(msg);}else{const c=Object.values(connections)[0];if(c&&c.open)c.send(msg);}
}
function startTyping(){
if(!typingLocal){typingLocal=true;sendTyping(true);clearInterval(typingHeartbeat);typingHeartbeat=setInterval(()=>typingLocal&&sendTyping(true),2500);}
clearTimeout(typingStopTimer);typingStopTimer=setTimeout(stopTyping,1800);
}
function stopTyping(){clearTimeout(typingStopTimer);clearInterval(typingHeartbeat);typingHeartbeat=null;if(typingLocal){typingLocal=false;sendTyping(false);}}
function processTyping(data){
const id=String(data.playerId||"");if(!id)return;
if(data.active){const p=players[id];typingUsers.set(id,{id,name:p?.name||String(data.name||"Utilisateur").slice(0,20),time:/^\d{2}:\d{2}:\d{2}$/.test(data.time||"")?data.time:nowTime(),seen:Date.now()});}
else typingUsers.delete(id);
renderTyping();if(isHost)broadcast({type:"typing",playerId:id,name:players[id]?.name||data.name,active:!!data.active,time:data.time||nowTime()});
}
const h0=handleData;handleData=function(data){if(data&&data.type==="typing"){processTyping(data);return;}return h0(data);};
const c0=chatSubmit;chatSubmit=function(){stopTyping();return c0();};
const rc0=resetConnection;resetConnection=function(){stopTyping();typingUsers.clear();renderTyping();return rc0();};
setInterval(renderTyping,1200);
setTimeout(()=>{ensureTypingUI();const input=chatEl("chatInput");if(input){input.addEventListener("input",()=>input.value.trim()?startTyping():stopTyping());input.addEventListener("blur",stopTyping);}},0);
window.addEventListener("beforeunload",stopTyping);
function ensureProfileModal(){
if(document.getElementById("profileModal"))return;
const m=document.createElement("div");m.id="profileModal";m.className="modal";m.innerHTML='<div class="modal-box"><div id="profileContent"></div><button class="btn btn-secondary" type="button" onclick="closeProfileV9()">Fermer</button></div>';document.body.appendChild(m);
m.addEventListener("click",e=>{if(e.target===m)closeProfileV9();});
}
window.closeProfileV9=function(){document.getElementById("profileModal")?.classList.remove("show");};
window.openProfileV9=function(id){
ensureProfileModal();const p=players[id];if(!p)return;const total=(p.correct||0)+(p.wrong||0),rate=total?Math.round((p.correct||0)/total*100):0;
document.getElementById("profileContent").innerHTML='<div class="profile-hero"><div class="profile-avatar">'+escapeHTML(p.avatar||"🙂")+'</div><div><div class="profile-name">@'+escapeHTML(p.name||"Utilisateur")+'</div><div class="profile-badges">'+(p.host?'<span class="profile-badge">👑 Hôte</span>':'<span class="profile-badge">🎮 Joueur</span>')+(p.team?'<span class="profile-badge">👥 '+escapeHTML(p.team)+'</span>':'')+(id===myId?'<span class="profile-badge">Vous</span>':'')+'</div></div></div><div class="profile-stats"><div class="profile-stat"><strong>'+Number(p.score||0)+'</strong><span>POINTS</span></div><div class="profile-stat"><strong>'+Number(p.correct||0)+'</strong><span>BONNES RÉPONSES</span></div><div class="profile-stat"><strong>'+Number(p.wrong||0)+'</strong><span>ERREURS</span></div><div class="profile-stat"><strong>'+rate+' %</strong><span>RÉUSSITE</span></div><div class="profile-stat"><strong>'+Number(p.bestCombo||p.combo||0)+'</strong><span>MEILLEUR COMBO</span></div><div class="profile-stat"><strong>'+Number(p.bonusesGiven||0)+' / '+Number(p.malusesReceived||0)+'</strong><span>POUVOIRS / MALUS</span></div></div>';
document.getElementById("profileModal").classList.add("show");
};
const acm0=addChatMessage;addChatMessage=function(m){acm0(m);const list=chatEl("chatList"),div=list?.lastElementChild,b=div?.querySelector("b");if(b&&m.playerId){b.classList.add("chat-profile-link");b.title="Voir le profil détaillé";b.onclick=()=>openProfileV9(m.playerId);}};
const up0=updatePlayers;updatePlayers=function(){const r=up0();document.querySelectorAll("#playersList .player").forEach((el,i)=>{const p=Object.values(players)[i];if(!p)return;el.onclick=e=>{if(e.target.closest(".kick-button"))return;openProfileV9(p.id);};if(!el.querySelector(".player-profile-hint")){const h=document.createElement("div");h.className="player-profile-hint";h.textContent="Voir le profil";el.appendChild(h);}});return r;};
function enhanceSessionBadge(){
const badge=document.getElementById("v9SessionBadge");if(!badge||badge.dataset.v9final)return;badge.dataset.v9final="1";const old=badge.querySelector("button");const actions=document.createElement("div");actions.className="v9-session-actions";if(old)actions.appendChild(old);const del=document.createElement("button");del.type="button";del.className="v9-delete-session";del.textContent="Supprimer la session";del.onclick=requestDeleteSessionV9;actions.appendChild(del);badge.appendChild(actions);
}
window.requestDeleteSessionV9=function(){openConfirm("Supprimer la session ?","Voulez-vous vraiment supprimer cette session ? Cette action est irréversible.",deleteCurrentSessionV9,"🗑️");const b=document.getElementById("confirmButton");if(b){b.textContent="Supprimer";b.className="btn btn-danger";}};
function deleteCurrentSessionV9(){
const name=myName||(()=>{try{return JSON.parse(localStorage.getItem("quizV9Session")||"null")?.name||"";}catch(e){return"";}})();
try{const kept=loadSessions().filter(s=>String(s.sessionUser||"").toLocaleLowerCase()!==String(name).toLocaleLowerCase());storeSessions(kept);["quizV9Session","quizV9CurrentGame","quizV9LastReport"].forEach(k=>localStorage.removeItem(k));}catch(e){}
resetConnection();["hostName","joinName","roomInput"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});const badge=document.getElementById("v9SessionBadge");if(badge)badge.remove();showScreen("homeScreen");showMessage("homeMessage","Session supprimée définitivement.","success");
}
const ss0=showScreen;showScreen=function(id){const r=ss0(id);setTimeout(()=>{enhanceSessionBadge();ensureTypingUI();},0);return r;};
setInterval(enhanceSessionBadge,900);
document.title="Qui suis-je ? 🎮 — V17";
console.log("V9 terminée : 50 thèmes, saisie en direct, profils, session et commandes séparées.");
})();
