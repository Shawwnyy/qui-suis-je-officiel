/* Extrait de l'ancien index.html : <script id="v19-final-patch"> */
(function V19Final(){
"use strict";
const ADD=[
["🚦 Code de la route","facile","Que signifie un feu rouge ?",["Arrêt obligatoire","Passage autorisé","Priorité à droite","Stationnement autorisé"]],
["🚦 Code de la route","moyen","À quoi sert la ceinture de sécurité ?",["À réduire les blessures en cas de choc","À remplacer l'airbag","À augmenter la vitesse","À signaler un virage"]],
["🚦 Code de la route","difficile","Sous la pluie, quelle précaution est essentielle ?",["Augmenter la distance de sécurité","Freiner au dernier moment","Rouler plus près du véhicule devant","Éteindre les feux"]],
["✍️ Grammaire","facile","Dans « Les enfants jouent », quel est le sujet ?",["Les enfants","jouent","Les","enfants jouent"]],
["✍️ Grammaire","moyen","Quel mot est un adverbe ?",["Rapidement","Rapide","Rapidité","Rapides"]],
["✍️ Grammaire","difficile","Quelle phrase est correctement accordée ?",["Les fleurs que j'ai cueillies","Les fleurs que j'ai cueilli","Les fleurs que j'ai cueillis","Les fleurs que j'ai cueillie"]],
["🤾 Handball","facile","Combien de joueurs d'une équipe de handball sont sur le terrain, gardien compris ?",["7","6","8","11"]],
["🤾 Handball","moyen","Combien de temps dure normalement un match senior, hors prolongations ?",["60 minutes","40 minutes","80 minutes","90 minutes"]],
["🤾 Handball","difficile","À quelle distance du but se trouve la ligne de jet de 7 mètres ?",["7 mètres","6 mètres","9 mètres","11 mètres"]],
["🏛️ Capitales","facile","Quelle est la capitale de l'Espagne ?",["Madrid","Barcelone","Séville","Valence"]],
["🏛️ Capitales","moyen","Quelle est la capitale du Canada ?",["Ottawa","Toronto","Montréal","Vancouver"]],
["🏛️ Capitales","difficile","Quelle est la capitale de la Slovénie ?",["Ljubljana","Zagreb","Bratislava","Sarajevo"]],
["🌐 Pays du monde","facile","Quel pays a la forme d'une botte ?",["L'Italie","Le Portugal","La Grèce","La Croatie"]],
["🌐 Pays du monde","moyen","Dans quel pays se trouve le Machu Picchu ?",["Le Pérou","Le Chili","La Bolivie","L'Équateur"]],
["🌐 Pays du monde","difficile","Quel pays est enclavé entre la France et l'Espagne ?",["Andorre","Monaco","Malte","Le Luxembourg"]],
["🏙️ Villes du monde","facile","Dans quelle ville se trouve le Colisée ?",["Rome","Athènes","Florence","Naples"]],
["🏙️ Villes du monde","moyen","Quelle ville est traversée par la Tamise ?",["Londres","Dublin","Édimbourg","Manchester"]],
["🏙️ Villes du monde","difficile","Dans quelle ville se trouve la place Jemaa el-Fna ?",["Marrakech","Tunis","Alger","Le Caire"]],
["🇫🇷 France nationale","facile","Quel est le numéro du département du Gard ?",["30","34","13","84"]],
["🇫🇷 France nationale","moyen","Quelle région a Toulouse pour chef-lieu ?",["Occitanie","Nouvelle-Aquitaine","Provence-Alpes-Côte d'Azur","Auvergne-Rhône-Alpes"]],
["🇫🇷 France nationale","difficile","Dans quelle région se trouve le département du Finistère ?",["Bretagne","Normandie","Pays de la Loire","Hauts-de-France"]],
["🗺️ France régionale","facile","Quelle ville est la préfecture du Gard ?",["Nîmes","Alès","Uzès","Le Vigan"]],
["🗺️ France régionale","moyen","Quel fleuve traverse Avignon ?",["Le Rhône","La Loire","La Garonne","La Seine"]],
["🗺️ France régionale","difficile","Dans quel département se trouve Montpellier ?",["L'Hérault","Le Gard","L'Aude","Les Bouches-du-Rhône"]],
["🇬🇧 Anglais → Français","facile","Comment traduit-on « house » en français ?",["Maison","Voiture","École","Fenêtre"]],
["🇬🇧 Anglais → Français","moyen","Comment traduit-on « to improve » en français ?",["Améliorer","Oublier","Traverser","Emprunter"]],
["🇬🇧 Anglais → Français","difficile","Comment traduit-on « nevertheless » en français ?",["Néanmoins","Immédiatement","Autrefois","Davantage"]],
["🇫🇷 Français → Anglais","facile","Comment traduit-on « chien » en anglais ?",["Dog","Cat","Bird","Horse"]],
["🇫🇷 Français → Anglais","moyen","Comment traduit-on « réussir » en anglais ?",["To succeed","To sleep","To borrow","To forget"]],
["🇫🇷 Français → Anglais","difficile","Comment traduit-on « pourtant » en anglais ?",["However","Therefore","Always","Already"]],
["🇪🇸 Espagnol → Français","facile","Comment traduit-on « libro » en français ?",["Livre","Stylo","Table","Porte"]],
["🇪🇸 Espagnol → Français","moyen","Comment traduit-on « aprender » en français ?",["Apprendre","Attendre","Vendre","Courir"]],
["🇪🇸 Espagnol → Français","difficile","Comment traduit-on « sin embargo » en français ?",["Cependant","Ensuite","Souvent","Autour"]],
["🇫🇷 Français → Espagnol","facile","Comment traduit-on « eau » en espagnol ?",["Agua","Aire","Fuego","Tierra"]],
["🇫🇷 Français → Espagnol","moyen","Comment traduit-on « fenêtre » en espagnol ?",["Ventana","Puerta","Techo","Calle"]],
["🇫🇷 Français → Espagnol","difficile","Comment traduit-on « se souvenir » en espagnol ?",["Recordar","Romper","Elegir","Cerrar"]],
["📝 Orthographe","facile","Quel mot est correctement orthographié ?",["Adresse","Addresse","Adrese","Adressse"]],
["📝 Orthographe","moyen","Quelle forme est correcte ?",["Parmi","Parmis","Parmmi","Parmie"]],
["📝 Orthographe","difficile","Quel mot est correctement orthographié ?",["Acquiescer","Aquiescer","Acquiesser","Acuiescer"]],
["🚩 Drapeaux","facile","Quelles couleurs composent le drapeau français ?",["Bleu, blanc, rouge","Vert, blanc, rouge","Noir, jaune, rouge","Bleu, jaune, rouge"]],
["🚩 Drapeaux","moyen","Quel pays a une feuille d'érable sur son drapeau ?",["Le Canada","L'Australie","La Suisse","Le Japon"]],
["🚩 Drapeaux","difficile","Quel pays a un dragon sur son drapeau national ?",["Le Bhoutan","Le Népal","La Mongolie","Le Laos"]],
["🇪🇺 Europe","facile","Quelle monnaie est utilisée en France ?",["L'euro","La livre","Le franc suisse","La couronne"]],
["🇪🇺 Europe","moyen","Dans quelle ville siège principalement la Commission européenne ?",["Bruxelles","Strasbourg","Luxembourg","La Haye"]],
["🇪🇺 Europe","difficile","Quel pays n'est pas membre de l'Union européenne ?",["La Norvège","La Suède","La Finlande","Le Danemark"]],
["🚑 Premiers secours","facile","Quel numéro d'urgence européen peut-on appeler dans l'Union européenne ?",["112","110","118","911"]],
["🚑 Premiers secours","moyen","Avant d'aider lors d'un accident, quelle est la première priorité ?",["Sécuriser la zone","Déplacer systématiquement la victime","Donner à boire","Prendre une photo"]],
["🚑 Premiers secours","difficile","Face à une personne inconsciente qui respire, quelle position est généralement indiquée ?",["Position latérale de sécurité","Assise penchée en avant","Debout contre un mur","Allongée sur le ventre"]]
];
const added=[];
ADD.forEach(r=>{if(QUESTIONS.some(q=>q.category===r[0]&&q.question===r[2]))return;const q={difficulty:r[1],category:r[0],question:r[2],answers:r[3],correct:0,v19:true};QUESTIONS.push(q);added.push(q);});
const oldTrans=hasTranslation;hasTranslation=function(q,lang){if(q&&q.v19)return true;return oldTrans(q,lang);};
const oldLocal=localizeQuestion;localizeQuestion=function(q,lang){if(q&&q.v19)return q;return oldLocal(q,lang);};
Object.assign(LANG_PACKS.en.cats,{"Code de la route":"Road safety","Grammaire":"Grammar","Handball":"Handball","Capitales":"Capitals","Pays du monde":"Countries","Villes du monde":"World cities","France nationale":"France: departments and regions","France régionale":"Regional France","Anglais → Français":"English to French","Français → Anglais":"French to English","Espagnol → Français":"Spanish to French","Français → Espagnol":"French to Spanish","Orthographe":"Spelling","Drapeaux":"Flags","Europe":"Europe","Premiers secours":"First aid"});
Object.assign(LANG_PACKS.es.cats,{"Code de la route":"Seguridad vial","Grammaire":"Gramática","Handball":"Balonmano","Capitales":"Capitales","Pays du monde":"Países","Villes du monde":"Ciudades del mundo","France nationale":"Francia: departamentos y regiones","France régionale":"Francia regional","Anglais → Français":"Inglés a francés","Français → Anglais":"Francés a inglés","Espagnol → Français":"Español a francés","Français → Espagnol":"Francés a español","Orthographe":"Ortografía","Drapeaux":"Banderas","Europe":"Europa","Premiers secours":"Primeros auxilios"});
/* Narrateur fiable, avec voix disponible sur PC et mobile. */
let narratorVoice="auto";
const oldSpeak=window.speakResult;
window.speakResult=function(ok){
if(!voiceOn||!("speechSynthesis" in window))return;
const lang=(window.__qlang||"fr");
const pack={fr:{ok:"Bonne réponse !",ko:"Mauvaise réponse.",lang:"fr-FR"},en:{ok:"Correct answer!",ko:"Wrong answer.",lang:"en-US"},es:{ok:"¡Respuesta correcta!",ko:"Respuesta incorrecta.",lang:"es-ES"}}[lang]||{ok:"Bonne réponse !",ko:"Mauvaise réponse.",lang:"fr-FR"};
try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(ok?pack.ok:pack.ko);u.lang=pack.lang;u.rate=1;u.volume=1;const voices=speechSynthesis.getVoices();if(narratorVoice!=="auto"){const v=voices.find(x=>x.name===narratorVoice);if(v)u.voice=v;}else{const v=voices.find(x=>x.lang&&x.lang.toLowerCase().startsWith(pack.lang.slice(0,2).toLowerCase()));if(v)u.voice=v;}speechSynthesis.speak(u);}catch(e){if(typeof oldSpeak==="function")oldSpeak(ok);}
};
function installNarratorSettings(){const host=document.getElementById("hostSettings");if(!host||document.getElementById("v19Narrator"))return;const box=document.createElement("div");box.id="v19Narrator";box.className="v19-narrator-settings";box.innerHTML='<label><input id="v19NarratorToggle" type="checkbox" '+(voiceOn?'checked':'')+'> 🎙️ Narrateur : annonce « bonne réponse » ou « mauvaise réponse »</label><select id="v19VoiceSelect" class="select"><option value="auto">Voix automatique</option></select>';host.appendChild(box);const toggle=box.querySelector("#v19NarratorToggle");toggle.onchange=()=>{voiceOn=toggle.checked;savePref("quizVoice",voiceOn?"1":"0");const b=document.getElementById("dockVoice");if(b)b.textContent=voiceOn?"🔊":"🔇";};const fill=()=>{const s=box.querySelector("#v19VoiceSelect"),current=s.value;const voices=speechSynthesis?.getVoices?.()||[];s.innerHTML='<option value="auto">Voix automatique</option>'+voices.map(v=>'<option value="'+escapeHTML(v.name)+'">'+escapeHTML(v.name)+' · '+escapeHTML(v.lang)+'</option>').join('');s.value=current||"auto";};fill();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=fill;box.querySelector("#v19VoiceSelect").onchange=e=>narratorVoice=e.target.value;}
/* Correctif robuste de l'avis de fin. */
function ratingMessage(text,type){const modal=document.getElementById("v11RatingModal");if(!modal)return;let m=modal.querySelector(".v19-rating-message");if(!m){m=document.createElement("div");m.className="v19-rating-message";modal.querySelector(".v11-rating-actions")?.before(m);}m.textContent=text;m.className="v19-rating-message show "+type;}
const submitBase=window.submitRatingV11;
window.submitRatingV11=function(){const modal=document.getElementById("v11RatingModal");if(!modal||modal.dataset.v19Submitting==="1")return;const selected=[...modal.querySelectorAll(".v11-stars")].filter(g=>g.querySelector(".v11-star.on")).length;if(selected<5){ratingMessage("Merci de noter les 5 critères avant l'envoi.","error");return;}modal.dataset.v19Submitting="1";modal.classList.add("v19-saving");try{if(typeof submitBase==="function")submitBase();ratingMessage("Merci, votre avis a bien été enregistré.","ok");setTimeout(()=>{modal.classList.remove("show","v19-saving");modal.dataset.v19Submitting="0";document.body.style.overflow="";document.documentElement.style.overflow="";},350);}catch(e){modal.classList.remove("v19-saving");modal.dataset.v19Submitting="0";ratingMessage("L'avis n'a pas pu être enregistré. Réessaie.","error");console.error(e);}};
const skipBase=window.skipRatingV11;
window.skipRatingV11=function(){try{if(typeof skipBase==="function")skipBase();}finally{const m=document.getElementById("v11RatingModal");m?.classList.remove("show","v19-saving");if(m)m.dataset.v19Submitting="0";document.body.style.overflow="";document.documentElement.style.overflow="";}};
document.addEventListener("pointerup",e=>{const star=e.target.closest?.("#v11RatingModal .v11-star");if(!star)return;e.preventDefault();const group=star.parentElement,n=Number(star.dataset.n),key=group.dataset.key;window.v11Draft=window.v11Draft||{};window.v11Draft[key]=n;group.querySelectorAll(".v11-star").forEach(x=>x.classList.toggle("on",Number(x.dataset.n)<=n));},{passive:false});
function refresh(){installNarratorSettings();if(document.getElementById("themeGrid")&&!document.querySelector('#themeGrid input[value="🚦 Code de la route"]')){try{buildThemeSelector();}catch(e){console.warn(e);}}document.title="Qui suis-je ? 🎮 — V19";}
const s0=showScreen;showScreen=function(id){const r=s0(id);setTimeout(refresh,0);return r;};
setTimeout(refresh,0);setInterval(installNarratorSettings,1500);
console.log("V19 : avis fin de partie corrigé, narrateur renforcé et nouveaux thèmes ajoutés.");
})();
