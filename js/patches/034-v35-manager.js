/* Extrait de l'ancien index.html : <script id="v35-manager"> */
(function V35Manager(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="quizV35CustomQuestions",MODE_KEY="quizV35SourceMode";
const MAX_QUESTIONS=1500,MAX_Q=220,MAX_A=120,MAX_C=250,PAGE=30;
const DIFFS=[["facile","🟢 Facile"],["moyen","🔵 Moyen"],["difficile","🟠 Difficile"],["impossible","🔴 Impossible"]];
const esc=s=>escapeHTML(String(s==null?"":s));
let store=[],persistOK=true,srcMode="all",editingId=null,tab="create",listLimit=PAGE,pushed=false,confirmDel=null;
let draft=null;
const runtime=new Map();
/* ---------- Outils ---------- */
function toast(m){try{if(typeof window.v34Toast==="function")return window.v34Toast(m);}catch(e){}}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function clean(s,max){return String(s==null?"":s).replace(/[\u0000-\u001F\u007F<>]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function uid(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function isDupVariant(q){return !!(q&&(q.v26Expanded||q.v23Expanded));}
function isCustom(q){return !!(q&&q.source==="perso");}
function sourceAllowed(q){
if(!q||isDupVariant(q))return false;
const c=isCustom(q);
return srcMode==="all"||(srcMode==="official"&&!c)||(srcMode==="custom"&&c);
}
/* ---------- Stockage ---------- */
function loadStore(){
try{
const raw=localStorage.getItem(KEY);const arr=raw?JSON.parse(raw):[];
store=Array.isArray(arr)?arr.map(sanitizeRecord).filter(Boolean):[];
}catch(e){store=[];persistOK=false;}
try{const m=localStorage.getItem(MODE_KEY);if(["all","official","custom"].includes(m))srcMode=m;}catch(e){}
}
function persist(){
try{localStorage.setItem(KEY,JSON.stringify(store));persistOK=true;return true;}
catch(e){persistOK=false;return false;}
}
function sanitizeRecord(r){
if(!r||typeof r!=="object")return null;
const category=clean(r.category,60),question=clean(r.question,MAX_Q);
const answers=Array.isArray(r.answers)?r.answers.slice(0,4).map(a=>clean(a,MAX_A)):[];
const correct=Number(r.correct);
const difficulty=DIFFS.some(d=>d[0]===r.difficulty)?r.difficulty:"moyen";
if(!category||!question||answers.length!==4||answers.some(a=>!a)||!(correct>=0&&correct<=3)||!Number.isInteger(correct))return null;
const media=(window.QMedia&&r.media)?window.QMedia.normalize(r.media):null;
const rec={id:String(r.id||uid()).slice(0,40),category,difficulty,question,answers,correct,correction:clean(r.correction,MAX_C),createdAt:Number(r.createdAt)||Date.now(),updatedAt:Number(r.updatedAt)||Date.now()};
if(media)rec.media=media;
return rec;
}
/* ---------- Synchronisation avec QUESTIONS ---------- */
function toRuntime(r){
const q={category:r.category,difficulty:r.difficulty,question:r.question,answers:r.answers.slice(),correct:r.correct,correction:r.correction||("La bonne réponse est « "+r.answers[r.correct]+" »."),source:"perso",v35Custom:true,customId:r.id};
if(r.media)q.media=r.media;
return q;
}
function addRuntime(r){const q=toRuntime(r);runtime.set(r.id,q);QUESTIONS.push(q);}
function removeRuntime(id){const q=runtime.get(id);if(!q)return;const i=QUESTIONS.lastIndexOf(q);if(i>=0)QUESTIONS.splice(i,1);runtime.delete(id);}
function categoriesOf(){return [...new Set(QUESTIONS.filter(q=>!isDupVariant(q)).map(q=>q.category))];}
let officialKeys=null;
function officialKey(key){
if(!officialKeys){officialKeys=new Map();QUESTIONS.forEach(q=>{if(isCustom(q)||isDupVariant(q))return;const k=norm(q.question);if(k&&!officialKeys.has(k))officialKeys.set(k,q.category);});}
return officialKeys.get(key);
}
function refreshThemes(selectCat){
try{if(typeof buildThemeSelector==="function")buildThemeSelector();}catch(e){}
if(selectCat){
try{const inp=[...document.querySelectorAll("#themeGrid input")].find(i=>i.value===selectCat);if(inp&&!inp.checked&&inp.nextElementSibling)inp.nextElementSibling.click();}catch(e){}
}
decorate();
}
/* ---------- Validation ---------- */
function validate(v,ignoreId){
const errs={};
const cat=v.newCat?clean(v.newCat,30):clean(v.category,60);
if(v.category==="__new"){
if(!cat||cat.length<2)errs.newCat="Donne un nom de thème (2 caractères minimum).";
}else if(!cat)errs.category="Choisis un thème.";
if(!DIFFS.some(d=>d[0]===v.difficulty))errs.difficulty="Choisis une difficulté.";
const q=clean(v.question,MAX_Q+50);
if(!q)errs.question="Écris la question.";
else if(q.length<5)errs.question="La question est trop courte (5 caractères minimum).";
else if(q.length>MAX_Q)errs.question="La question est trop longue ("+MAX_Q+" caractères maximum).";
else if(!/[\p{L}\p{N}]/u.test(q))errs.question="La question doit contenir des lettres ou des chiffres.";
const answers=(v.answers||[]).map(a=>clean(a,MAX_A+50));
answers.forEach((a,i)=>{
if(!a)errs["a"+i]="Réponse "+(i+1)+" obligatoire.";
else if(a.length>MAX_A)errs["a"+i]="Réponse "+(i+1)+" trop longue ("+MAX_A+" caractères maximum).";
});
if(!Object.keys(errs).some(k=>/^a\d/.test(k))){
const seen=new Map();
answers.forEach((a,i)=>{const k=norm(a)||a.toLowerCase();if(seen.has(k)){errs["a"+i]="Les réponses "+(seen.get(k)+1)+" et "+(i+1)+" sont identiques.";}else seen.set(k,i);});
}
const c=Number(v.correct);
if(!(v.correct!==""&&v.correct!=null&&Number.isInteger(c)&&c>=0&&c<=3))errs.correct="Coche la bonne réponse.";
if(v.correction&&clean(v.correction,MAX_C+50).length>MAX_C)errs.correction="Explication trop longue ("+MAX_C+" caractères maximum).";
if(!errs.question){
const k=norm(q);
const o=officialKey(k);
if(o)errs.question="Cette question existe déjà dans la banque officielle (thème "+o+").";
else{const d=store.find(r=>r.id!==ignoreId&&norm(r.question)===k);if(d)errs.question="Tu as déjà créé cette question (thème "+d.category+").";}
}
if(v.mediaError)errs.media=v.mediaError;
if(!ignoreId&&store.length>=MAX_QUESTIONS)errs.global="Limite atteinte : "+MAX_QUESTIONS+" questions personnelles. Supprime-en avant d'en ajouter.";
return{ok:!Object.keys(errs).length,errs,clean:{category:cat?(v.category==="__new"?withEmoji(cat):cat):"",difficulty:v.difficulty,question:q,answers,correct:c,correction:clean(v.correction,MAX_C),media:v.media||null}};
}
function withEmoji(name){return /^\s*(\p{Extended_Pictographic}|\p{Regional_Indicator})/u.test(name)?name:"⭐ "+name;}
/* ---------- Interface ---------- */
function ensureModal(){
let m=$("v35QModal");if(m)return m;
m=document.createElement("div");m.id="v35QModal";m.className="modal";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Mes questions");
m.innerHTML='<div class="v35q-sheet"><div class="v35q-head"><h2>📝 Mes questions</h2><button type="button" class="v35q-x" data-act="close" aria-label="Fermer">✕</button></div><div class="v35q-tabs" role="tablist" id="v35qTabs"></div><div class="v35q-body" id="v35qBody"></div></div>';
document.body.appendChild(m);
m.addEventListener("click",onClick);
m.addEventListener("input",onInput);
m.addEventListener("change",onChange);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&m.classList.contains("show"))closeModal();});
return m;
}
function openModal(t){
const m=ensureModal();tab=t||tab||"create";listLimit=PAGE;m.classList.add("show");
document.documentElement.style.overflow="hidden";
if(!pushed){try{history.pushState({v35q:1},"");pushed=true;}catch(e){}}
renderAll();
}
function closeModal(){
const m=$("v35QModal");if(!m||!m.classList.contains("show"))return;
m.classList.remove("show");document.documentElement.style.overflow="";confirmDel=null;
if(pushed){pushed=false;try{history.back();}catch(e){}}
}
window.addEventListener("popstate",()=>{if(pushed){pushed=false;const m=$("v35QModal");if(m&&m.classList.contains("show")){m.classList.remove("show");document.documentElement.style.overflow="";}}});
function renderTabs(){
const t=$("v35qTabs");if(!t)return;
const items=[["create",editingId?"✏️ Modifier":"➕ Créer"],["list","📚 Mes questions ("+store.length+")"],["bank","📊 Banque & source"],["backup","💾 Sauvegarde"]];
t.innerHTML=items.map(([id,l])=>'<button type="button" role="tab" data-act="tab" data-tab="'+id+'" aria-selected="'+(tab===id)+'">'+esc(l)+'</button>').join("");
}
function renderAll(){
renderTabs();
const b=$("v35qBody");if(!b)return;
const warn=persistOK?"":'<div class="v35q-msg warn show">⚠️ Le stockage du navigateur est indisponible (navigation privée ?). Tes questions fonctionnent pendant cette session mais seront perdues à la fermeture : utilise l\'onglet Sauvegarde pour les exporter.</div>';
if(tab==="create")b.innerHTML=warn+formHTML();
else if(tab==="list")b.innerHTML=warn+listHTML();
else if(tab==="bank")b.innerHTML=bankHTML();
else b.innerHTML=backupHTML();
if(tab==="create")applyDraftToForm();
b.scrollTop=0;
}
function themeOptions(sel){
const cats=categoriesOf().sort((a,b)=>a.localeCompare(b,"fr"));
const customCats=[...new Set(store.map(r=>r.category))].filter(c=>!cats.includes(c));
return '<option value="">— Choisir un thème —</option>'+[...cats,...customCats].map(c=>'<option value="'+esc(c)+'"'+(c===sel?" selected":"")+'>'+esc(c)+'</option>').join("")+'<option value="__new"'+(sel==="__new"?" selected":"")+'>➕ Nouveau thème…</option>';
}
/* ---------- Média de la question (image ou vidéo YouTube) ---------- */
let mediaData="";
function mediaToDraft(m){
if(!m)return{mediaMode:"none",mediaLink:"",mediaData:""};
if(m.type==="youtube")return{mediaMode:"link",mediaLink:window.QMedia.youtubeUrl(m),mediaData:""};
if(m.type==="image"&&/^data:/.test(m.url))return{mediaMode:"file",mediaLink:"",mediaData:m.url};
return{mediaMode:"link",mediaLink:m.url||"",mediaData:""};
}
function mediaBlockHTML(d){
if(!window.QMedia)return"";
const mode=d.mediaMode||"none";
return '<label>📎 Image ou vidéo (facultatif)</label><div class="v35q-radio" id="v35qMediaMode">'
+[["none","Aucun"],["link","🔗 Lien (image ou YouTube)"],["file","📁 Image de mon appareil"]].map(([v,l])=>'<label><input type="radio" name="v35qMM" value="'+v+'"'+(mode===v?' checked':'')+'> '+l+'</label>').join('')+'</div>'
+'<div id="v35qMediaLinkWrap" style="display:'+(mode==="link"?"block":"none")+'"><input type="text" id="v35qMediaLink" maxlength="600" autocomplete="off" inputmode="url" placeholder="https://… (image) ou https://youtu.be/… (vidéo)"></div>'
+'<div id="v35qMediaFileWrap" style="display:'+(mode==="file"?"block":"none")+'"><input type="file" id="v35qMediaFile" accept="image/jpeg,image/png,image/webp,image/gif" style="width:100%;font-size:16px"><div class="v35q-hint">L\'image est réduite automatiquement (≈ 900 px) pour rester légère.</div></div>'
+'<div class="v35q-hint" id="e_media"></div><div id="v35qMediaPreview" class="v35q-mediaprev"></div>'
+'<div class="v35q-hint">Les joueurs voient le média au-dessus de la question et peuvent l\'agrandir. Pour une vidéo, prévois un chrono assez long. Un lien d\'image doit commencer par https://.</div>';
}
function updateMediaPreview(){
const box=$("v35qMediaPreview");if(!box||!window.QMedia)return;
box.textContent="";
const hint=$("e_media");if(hint){hint.textContent="";hint.style.color="";}
const f=readForm();
if(f.mediaMode==="link"&&f.mediaLink.trim()&&f.mediaError){if(hint){hint.textContent="⚠️ "+f.mediaError;hint.style.color="#fca5a5";}return;}
if(!f.media)return;
const b=window.QMedia.build(f.media,{onError:m=>{if(hint){hint.textContent="⚠️ "+m;hint.style.color="#fca5a5";}}});
if(b)box.appendChild(b);
}
function formHTML(){
const d=draft||{category:"",newCat:"",difficulty:"moyen",question:"",answers:["","","",""],correct:"",correction:"",mediaMode:"none",mediaLink:"",mediaData:""};
return '<div id="v35qMsg" class="v35q-msg" role="alert" aria-live="assertive"></div>'
+(editingId?'<div class="v35q-msg warn show">✏️ Tu modifies une question existante.</div>':'')
+'<label for="v35qCat">Thème</label><select id="v35qCat">'+themeOptions(d.category)+'</select><div class="v35q-hint" id="e_category"></div>'
+'<div id="v35qNewWrap" style="display:'+(d.category==="__new"?"block":"none")+'"><label for="v35qNewCat">Nom du nouveau thème</label><input type="text" id="v35qNewCat" maxlength="30" autocomplete="off" placeholder="Ex. 🚲 Cyclisme"><div class="v35q-hint" id="e_newCat"></div></div>'
+'<label for="v35qDiff">Difficulté</label><select id="v35qDiff">'+DIFFS.map(([v,l])=>'<option value="'+v+'"'+(d.difficulty===v?" selected":"")+'>'+l+'</option>').join("")+'</select>'
+'<label for="v35qQ">Question <span class="v35q-hint" id="v35qQc"></span></label><textarea id="v35qQ" maxlength="'+(MAX_Q+50)+'" placeholder="Écris ta question…" autocomplete="off"></textarea><div class="v35q-hint" id="e_question"></div>'
+mediaBlockHTML(d)
+'<label>Réponses — coche la bonne</label>'
+[0,1,2,3].map(i=>'<div class="v35q-ans"><input type="radio" name="v35qCorrect" value="'+i+'" id="v35qR'+i+'" aria-label="Bonne réponse '+(i+1)+'"><input type="text" id="v35qA'+i+'" maxlength="'+(MAX_A+30)+'" autocomplete="off" placeholder="Réponse '+(i+1)+'"></div><div class="v35q-hint" id="e_a'+i+'" style="margin:-4px 0 6px 52px"></div>').join('')
+'<div class="v35q-hint" id="e_correct"></div>'
+'<label for="v35qExp">Explication (facultatif)</label><textarea id="v35qExp" maxlength="'+(MAX_C+50)+'" placeholder="Affichée après la réponse." style="min-height:64px"></textarea><div class="v35q-hint" id="e_correction"></div>'
+'<div class="v35q-hint">Les questions perso sont enregistrées sur cet appareil. Elles sont utilisées quand <b>tu</b> es l\'hôte de la partie.</div>'
+'<div class="v35q-actions"><button type="button" class="btn btn-primary" data-act="save">'+(editingId?'💾 Enregistrer les modifications':'💾 Enregistrer la question')+'</button>'+(editingId?'<button type="button" class="btn btn-secondary" data-act="cancelEdit">Annuler</button>':'<button type="button" class="btn btn-secondary" data-act="clearForm">Vider</button>')+'</div>';
}
function applyDraftToForm(){
const d=draft;if(!d)return;
const set=(id,v)=>{const e=$(id);if(e)e.value=v;};
set("v35qNewCat",d.newCat||"");set("v35qQ",d.question||"");(d.answers||[]).forEach((a,i)=>set("v35qA"+i,a));set("v35qExp",d.correction||"");
mediaData=d.mediaData||"";set("v35qMediaLink",d.mediaLink||"");setTimeout(updateMediaPreview,0);
if(d.correct!==""&&d.correct!=null){const r=$("v35qR"+d.correct);if(r)r.checked=true;}
updateCount();
}
function readForm(){
const val=id=>{const e=$(id);return e?e.value:"";};
const r=document.querySelector('input[name="v35qCorrect"]:checked');
const mm=document.querySelector('input[name="v35qMM"]:checked');const mediaMode=mm?mm.value:"none";
let media=null,mediaError="";
if(window.QMedia){
if(mediaMode==="link"){const x=window.QMedia.fromInput(val("v35qMediaLink"));if(x.error)mediaError=x.error;else if(!x.media)mediaError="Colle un lien, ou choisis « Aucun ».";else media=x.media;}
else if(mediaMode==="file"){if(!mediaData)mediaError="Choisis une image sur ton appareil, ou choisis « Aucun ».";else{const n=window.QMedia.normalize({type:"image",url:mediaData});if(n)media=n;else mediaError="Image invalide ou trop lourde.";}}
}
return{category:val("v35qCat"),newCat:val("v35qNewCat"),difficulty:val("v35qDiff"),question:val("v35qQ"),answers:[0,1,2,3].map(i=>val("v35qA"+i)),correct:r?r.value:"",correction:val("v35qExp"),mediaMode,mediaLink:val("v35qMediaLink"),mediaData,media,mediaError};
}
function updateCount(){const q=$("v35qQ"),c=$("v35qQc");if(q&&c)c.textContent="("+q.value.length+"/"+MAX_Q+")";}
function showErrors(errs){
document.querySelectorAll('#v35qBody .bad').forEach(e=>e.classList.remove("bad"));
document.querySelectorAll('#v35qBody [id^="e_"]').forEach(e=>{e.textContent="";e.style.color="";});
const map={category:"v35qCat",newCat:"v35qNewCat",difficulty:"v35qDiff",question:"v35qQ",a0:"v35qA0",a1:"v35qA1",a2:"v35qA2",a3:"v35qA3",correction:"v35qExp",media:"v35qMediaLink"};
let first=null;
Object.entries(errs).forEach(([k,m])=>{
const h=$("e_"+k);if(h){h.textContent="⚠️ "+m;h.style.color="#fca5a5";}
const f=$(map[k]);if(f){f.classList.add("bad");if(!first)first=f;}
});
const msg=$("v35qMsg");const n=Object.keys(errs).length;
if(msg){msg.className="v35q-msg err show";msg.textContent=errs.global||("❌ Corrige "+n+" point"+(n>1?"s":"")+" avant d'enregistrer.");}
if(first&&first.scrollIntoView)first.scrollIntoView({block:"center",behavior:"smooth"});
}
function saveForm(){
const v=readForm();draft=v;
const res=validate(v,editingId);
if(!res.ok){showErrors(res.errs);return false;}
const c=res.clean;const now=Date.now();
const newTheme=!categoriesOf().includes(c.category);
if(editingId){
const r=store.find(x=>x.id===editingId);
if(!r){editingId=null;showErrors({global:"Cette question n'existe plus."});return false;}
Object.assign(r,{category:c.category,difficulty:c.difficulty,question:c.question,answers:c.answers,correct:c.correct,correction:c.correction,updatedAt:now});
if(c.media)r.media=c.media;else delete r.media;
removeRuntime(r.id);addRuntime(r);
editingId=null;draft=null;persist();
toast("✅ Question modifiée");tab="list";renderAll();
afterChange(c.category,newTheme);
const msg=$("v35qBody");if(msg)msg.insertAdjacentHTML("afterbegin",'<div class="v35q-msg ok show" role="status">✅ Question modifiée.</div>');
return true;
}
const rec={id:uid(),category:c.category,difficulty:c.difficulty,question:c.question,answers:c.answers,correct:c.correct,correction:c.correction,createdAt:now,updatedAt:now};
if(c.media)rec.media=c.media;
store.push(rec);addRuntime(rec);
const ok=persist();
mediaData="";
draft={category:v.category==="__new"?c.category:v.category,newCat:"",difficulty:v.difficulty,question:"",answers:["","","",""],correct:"",correction:"",mediaMode:"none",mediaLink:"",mediaData:""};
afterChange(c.category,newTheme);
tab="create";renderAll();
const msg=$("v35qMsg");if(msg){msg.className="v35q-msg "+(ok?"ok":"warn")+" show";msg.textContent=ok?"✅ Question enregistrée dans « "+c.category+" ». Tu peux en ajouter une autre.":"⚠️ Question ajoutée pour cette session, mais impossible de l'enregistrer durablement (stockage indisponible).";}
toast(ok?"✅ Question enregistrée":"⚠️ Non enregistrée durablement");
return true;
}
function afterChange(cat,newTheme){refreshThemes(newTheme?cat:null);updateSrcBar();}
function listHTML(){
const cats=[...new Set(store.map(r=>r.category))].sort((a,b)=>a.localeCompare(b,"fr"));
const f=window.__v35Filter||{q:"",cat:""};
const q=norm(f.q);
const rows=store.filter(r=>(!f.cat||r.category===f.cat)&&(!q||norm(r.question+" "+r.answers.join(" ")+" "+r.category).includes(q))).sort((a,b)=>b.updatedAt-a.updatedAt);
let h='<div id="v35qMsg" class="v35q-msg" role="status"></div>'
+'<input type="search" id="v35qSearch" placeholder="🔎 Rechercher dans mes questions" value="'+esc(f.q)+'" autocomplete="off" enterkeyhint="search">'
+'<label for="v35qFilterCat">Thème</label><select id="v35qFilterCat"><option value="">Tous les thèmes</option>'+cats.map(c=>'<option value="'+esc(c)+'"'+(c===f.cat?" selected":"")+'>'+esc(c)+'</option>').join("")+'</select>';
if(!store.length)return h+'<div class="v35q-msg warn show" style="margin-top:16px">Tu n\'as pas encore créé de question. Va dans l\'onglet ➕ Créer.</div>';
if(!rows.length)return h+'<div class="v35q-msg warn show" style="margin-top:16px">Aucune question ne correspond à ta recherche.</div>';
h+='<div class="v35q-hint" style="margin-top:8px">'+rows.length+' question'+(rows.length>1?'s':'')+'</div>';
rows.slice(0,listLimit).forEach(r=>{
const dl=(DIFFS.find(d=>d[0]===r.difficulty)||[0,r.difficulty])[1];
h+='<div class="v35q-row" data-id="'+esc(r.id)+'"><div class="t">'+esc(r.question)+'</div><div class="m"><span class="v35-src perso">⭐ Perso</span><span>'+esc(r.category)+'</span><span>· '+esc(dl)+'</span>'+(r.media&&window.QMedia?'<span>· '+esc(window.QMedia.label(r.media))+'</span>':'')+'</div><ul>'+r.answers.map((a,i)=>'<li'+(i===r.correct?' class="ok"':'')+'>'+esc(a)+(i===r.correct?' ✓':'')+'</li>').join('')+'</ul>'
+(confirmDel===r.id?'<div class="v35q-msg warn show" style="margin-top:10px">Supprimer définitivement cette question ?</div><div class="b"><button type="button" class="danger" data-act="delYes" data-id="'+esc(r.id)+'">🗑️ Oui, supprimer</button><button type="button" data-act="delNo">Non, garder</button></div>'
:'<div class="b"><button type="button" data-act="edit" data-id="'+esc(r.id)+'">✏️ Modifier</button><button type="button" class="danger" data-act="del" data-id="'+esc(r.id)+'">🗑️ Supprimer</button></div>')+'</div>';
});
if(rows.length>listLimit)h+='<div class="v35q-actions"><button type="button" class="btn btn-secondary" data-act="more">Afficher plus ('+(rows.length-listLimit)+')</button></div>';
return h;
}
function counts(){
const c={};
QUESTIONS.forEach(q=>{if(isDupVariant(q))return;const e=c[q.category]||(c[q.category]={o:0,c:0});if(isCustom(q))e.c++;else e.o++;});
return c;
}
function bankHTML(){
const c=counts(),cats=Object.keys(c).sort((a,b)=>a.localeCompare(b,"fr"));
let o=0,p=0;cats.forEach(k=>{o+=c[k].o;p+=c[k].c;});
return '<div class="v35q-msg ok show">📚 '+o+' questions officielles · ⭐ '+p+' questions perso · '+cats.length+' thèmes</div>'
+'<label>Questions utilisées dans la partie (hôte)</label><div class="v35q-radio">'
+[["all","📚⭐ Officielles + perso"],["official","📚 Officielles seulement"],["custom","⭐ Perso seulement"]].map(([v,l])=>'<label><input type="radio" name="v35qSrc" value="'+v+'"'+(srcMode===v?' checked':'')+'> '+l+'</label>').join('')+'</div>'
+'<table class="v35q-tbl"><thead><tr><th>Thème</th><th class="n">📚</th><th class="n">⭐</th></tr></thead><tbody>'+cats.map(k=>'<tr><td>'+esc(k)+'</td><td class="n">'+c[k].o+'</td><td class="n">'+c[k].c+'</td></tr>').join('')+'</tbody></table>';
}
function backupHTML(){
return '<div id="v35qMsg" class="v35q-msg" role="status"></div><label>Exporter mes questions</label><div class="v35q-hint">Sauvegarde tes questions pour les retrouver sur un autre appareil.</div>'
+'<div class="v35q-actions"><button type="button" class="btn btn-secondary" data-act="export">📤 Générer</button><button type="button" class="btn btn-secondary" data-act="copy">📋 Copier</button><button type="button" class="btn btn-secondary" data-act="download">⬇️ Télécharger</button></div>'
+'<textarea id="v35qExport" readonly placeholder="Clique sur Générer" style="margin-top:10px;min-height:110px;font-size:16px"></textarea>'
+'<label style="margin-top:20px">Importer des questions</label><div class="v35q-hint">Colle le texte exporté ici ou choisis un fichier. Les doublons et les questions invalides sont ignorés.</div>'
+'<textarea id="v35qImport" placeholder="Colle ici le contenu exporté" style="min-height:110px"></textarea>'
+'<input type="file" id="v35qFile" accept=".json,application/json,text/plain" style="margin-top:8px;width:100%;font-size:16px">'
+'<div class="v35q-actions"><button type="button" class="btn btn-primary" data-act="import">📥 Importer</button></div>';
}
function setMsg(kind,text){const m=$("v35qMsg");if(!m)return;m.className="v35q-msg "+kind+" show";m.textContent=text;}
function exportJSON(){return JSON.stringify({app:"qui-suis-je",version:35,exportedAt:new Date().toISOString(),questions:store},null,1);}
function importText(txt){
let data;try{data=JSON.parse(txt);}catch(e){setMsg("err","❌ Texte invalide : ce n'est pas un export JSON.");return;}
const arr=Array.isArray(data)?data:(data&&Array.isArray(data.questions)?data.questions:null);
if(!arr){setMsg("err","❌ Aucune liste de questions trouvée.");return;}
let added=0,dup=0,bad=0,full=0;
arr.forEach(x=>{
const r=sanitizeRecord(x);if(!r){bad++;return;}
const k=norm(r.question);
if(officialKey(k)||store.some(s=>norm(s.question)===k)){dup++;return;}
if(store.length>=MAX_QUESTIONS){full++;return;}
r.id=uid();r.createdAt=r.updatedAt=Date.now();store.push(r);addRuntime(r);added++;
});
persist();refreshThemes();updateSrcBar();renderTabs();
setMsg(added?"ok":"warn",(added?"✅ ":"ℹ️ ")+added+" question(s) importée(s)"+(dup?" · "+dup+" doublon(s) ignoré(s)":"")+(bad?" · "+bad+" invalide(s) ignorée(s)":"")+(full?" · "+full+" refusée(s) (limite atteinte)":"")+".");
}
/* ---------- Ajout en lot (utilisé par le générateur de QCM) ---------- */
/* records : [{category,difficulty,question,answers[4],correct,correction}]
   opts.replaceCategory : supprime d'abord les anciennes questions GÉNÉRÉES de ce thème (id « qcm… »), jamais celles écrites à la main. */
function addRecords(records,opts){
opts=opts||{};
const res={added:0,duplicates:0,invalid:0,full:0,removed:0,persisted:true,categories:[]};
if(opts.replaceCategory){
for(let i=store.length-1;i>=0;i--){const r=store[i];if(r.category===opts.replaceCategory&&/^qcm/.test(r.id)){removeRuntime(r.id);store.splice(i,1);res.removed++;}}
}
const seen=new Set(store.map(r=>norm(r.question)));
const now=Date.now(),cats=new Set();
(records||[]).forEach((x,i)=>{
const r=sanitizeRecord(x);if(!r){res.invalid++;return;}
const k=norm(r.question);
if(!k||seen.has(k)||officialKey(k)){res.duplicates++;return;}
if(store.length>=MAX_QUESTIONS){res.full++;return;}
r.id="qcm"+now.toString(36)+i.toString(36)+Math.random().toString(36).slice(2,6);r.createdAt=r.updatedAt=now;
seen.add(k);store.push(r);addRuntime(r);cats.add(r.category);res.added++;
});
res.categories=[...cats];
res.persisted=persist();
refreshThemes();updateSrcBar();
if(!$("v35QModal")||!$("v35QModal").classList.contains("show")){}else renderAll();
return res;
}
function ensureAllSource(){if(srcMode==="official")setSrcMode("all");}
/* ---------- Évènements ---------- */
function onClick(e){
const t=e.target.closest("[data-act]");
if(e.target.id==="v35QModal"){closeModal();return;}
if(!t)return;
const act=t.dataset.act;
if(act==="close")closeModal();
else if(act==="tab"){if(tab==="create")draft=readForm();tab=t.dataset.tab;listLimit=PAGE;confirmDel=null;renderAll();}
else if(act==="save"){if(t.dataset.busy==="1")return;if(saveForm()){t.dataset.busy="1";setTimeout(()=>{t.dataset.busy="0";},700);}}
else if(act==="clearForm"){draft=null;renderAll();}
else if(act==="cancelEdit"){editingId=null;draft=null;tab="list";renderAll();}
else if(act==="edit"){
const r=store.find(x=>x.id===t.dataset.id);if(!r)return;
editingId=r.id;draft=Object.assign({category:r.category,newCat:"",difficulty:r.difficulty,question:r.question,answers:r.answers.slice(),correct:String(r.correct),correction:r.correction||""},window.QMedia?mediaToDraft(r.media):{});tab="create";renderAll();
}
else if(act==="del"){confirmDel=t.dataset.id;renderAll();const row=document.querySelector('.v35q-row[data-id="'+CSS.escape(confirmDel)+'"]');if(row&&row.scrollIntoView)row.scrollIntoView({block:"nearest"});}
else if(act==="delNo"){confirmDel=null;renderAll();}
else if(act==="delYes"){
const id=t.dataset.id;const i=store.findIndex(x=>x.id===id);
if(i>=0){store.splice(i,1);removeRuntime(id);persist();confirmDel=null;if(editingId===id){editingId=null;draft=null;}refreshThemes();updateSrcBar();renderAll();setMsg("ok","🗑️ Question supprimée.");toast("🗑️ Question supprimée");}
}
else if(act==="more"){listLimit+=PAGE;renderAll();}
else if(act==="export"){const a=$("v35qExport");if(a){a.value=exportJSON();setMsg("ok","✅ "+store.length+" question(s) prêtes à être copiées.");}}
else if(act==="copy"){
const a=$("v35qExport");if(!a)return;if(!a.value)a.value=exportJSON();
const done=()=>setMsg("ok","✅ Copié dans le presse-papiers.");
try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(a.value).then(done,()=>{a.select();a.setSelectionRange(0,a.value.length);try{document.execCommand("copy");done();}catch(_){setMsg("warn","Sélectionne le texte et copie-le manuellement.");}});return;}}catch(_){}
try{a.removeAttribute("readonly");a.focus();a.select();a.setSelectionRange(0,a.value.length);const ok=document.execCommand("copy");a.setAttribute("readonly","");if(ok)done();else setMsg("warn","Sélectionne le texte et copie-le manuellement.");}catch(_){setMsg("warn","Sélectionne le texte et copie-le manuellement.");}
}
else if(act==="download"){
try{const blob=new Blob([exportJSON()],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="mes-questions-quiz.json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);setMsg("ok","✅ Fichier généré.");}catch(err){setMsg("err","❌ Téléchargement impossible : utilise Générer puis Copier.");}
}
else if(act==="import"){const a=$("v35qImport");const txt=a?a.value.trim():"";if(!txt){setMsg("err","❌ Colle d'abord le texte à importer ou choisis un fichier.");return;}importText(txt);}
}
function onInput(e){
const t=e.target;
if(t.id==="v35qQ")updateCount();
if(t.id==="v35qMediaLink"){clearTimeout(onInput.m);onInput.m=setTimeout(updateMediaPreview,450);}
if(t.id==="v35qSearch"){window.__v35Filter=Object.assign(window.__v35Filter||{cat:""},{q:t.value});clearTimeout(onInput.t);onInput.t=setTimeout(()=>{listLimit=PAGE;const pos=t.selectionStart;renderAll();const s=$("v35qSearch");if(s){s.focus();try{s.setSelectionRange(pos,pos);}catch(_){}}},250);}
if(t.classList&&t.classList.contains("bad"))t.classList.remove("bad");
}
function onChange(e){
const t=e.target;
if(t.id==="v35qCat"){const w=$("v35qNewWrap");if(w)w.style.display=t.value==="__new"?"block":"none";}
if(t.name==="v35qMM"){
const lw=$("v35qMediaLinkWrap"),fw=$("v35qMediaFileWrap");if(lw)lw.style.display=t.value==="link"?"block":"none";if(fw)fw.style.display=t.value==="file"?"block":"none";
updateMediaPreview();
}
if(t.id==="v35qMediaFile"&&t.files&&t.files[0]&&window.QMedia){
const hint=$("e_media");if(hint){hint.textContent="⏳ Préparation de l'image…";hint.style.color="";}
window.QMedia.fileToDataUrl(t.files[0]).then(url=>{mediaData=url;updateMediaPreview();const h=$("e_media");if(h){h.textContent="✅ Image prête ("+Math.round(url.length*0.75/1024)+" Ko).";h.style.color="";}})
.catch(err=>{mediaData="";const h=$("e_media");if(h){h.textContent="⚠️ "+(err&&err.message||"Image refusée.");h.style.color="#fca5a5";}updateMediaPreview();});
}
if(t.id==="v35qFilterCat"){window.__v35Filter=Object.assign(window.__v35Filter||{q:""},{cat:t.value});listLimit=PAGE;renderAll();}
if(t.name==="v35qSrc"){setSrcMode(t.value);renderAll();}
if(t.id==="v35qFile"&&t.files&&t.files[0]){
const f=t.files[0];if(f.size>2000000){setMsg("err","❌ Fichier trop volumineux.");return;}
const rd=new FileReader();rd.onload=()=>{const a=$("v35qImport");if(a)a.value=String(rd.result||"");setMsg("ok","📄 Fichier chargé : clique sur Importer.");};rd.onerror=()=>setMsg("err","❌ Lecture du fichier impossible.");rd.readAsText(f);
}
}
/* ---------- Source officielle / perso ---------- */
function setSrcMode(m){
if(!["all","official","custom"].includes(m))m="all";
srcMode=m;try{localStorage.setItem(MODE_KEY,m);}catch(e){}
refreshThemes();updateSrcBar();
const bar=$("v35SrcSelect");if(bar)bar.value=m;
}
function updateSrcBar(){
const bar=$("v35SrcBar");if(!bar)return;
const c=counts();let o=0,p=0;Object.values(c).forEach(x=>{o+=x.o;p+=x.c;});
const info=$("v35SrcInfo");if(info)info.textContent="📚 "+o+" questions officielles · ⭐ "+p+" questions perso";
const s=$("v35SrcSelect");if(s&&s.value!==srcMode)s.value=srcMode;
const warn=$("v35SrcWarn");
if(warn){const usable=QUESTIONS.some(q=>sourceAllowed(q));warn.textContent=usable?"":"⚠️ Aucune question avec ce réglage : crée des questions perso ou change la source.";}
}
function mountEntries(){
const grid=document.querySelector("#homeScreen .home-grid");
if(grid&&!$("v35EntryHome")){
const b=document.createElement("button");b.type="button";b.id="v35EntryHome";b.className="btn btn-secondary v35-entry";b.dataset.v35open="1";b.textContent="📝 Mes questions : créer, modifier, supprimer";
grid.insertAdjacentElement("afterend",b);
}
if(grid&&!$("qcmEntryHome")&&window.QcmUI){
const q=document.createElement("button");q.type="button";q.id="qcmEntryHome";q.className="btn btn-secondary v35-entry qcm-entry";q.dataset.qcmopen="1";q.textContent="📄 Créer un QCM à partir d'un cours (PDF, ODT…)";
const anchorBtn=$("v35EntryHome");(anchorBtn||grid).insertAdjacentElement("afterend",q);
}
const tg=$("themeGrid");
if(tg&&!$("v35SrcBar")){
const bar=document.createElement("div");bar.id="v35SrcBar";bar.className="v35-srcbar";
bar.innerHTML='<b>📚 Banque de questions</b><div id="v35SrcInfo"></div><label for="v35SrcSelect" style="display:block;margin-top:8px;font-weight:800">Source utilisée pour cette partie</label><select id="v35SrcSelect"><option value="all">📚⭐ Officielles + perso</option><option value="official">📚 Officielles seulement</option><option value="custom">⭐ Perso seulement</option></select><div id="v35SrcWarn" style="margin-top:6px;color:#fca5a5"></div><button type="button" class="btn btn-secondary v35-entry" data-v35open="1">📝 Gérer mes questions</button><button type="button" class="btn btn-secondary v35-entry qcm-entry" data-qcmopen="1">📄 Créer un QCM à partir d\'un cours</button>';
const pre=[...tg.parentNode.children].find(c=>c.classList&&c.classList.contains("v10-theme-presets"));tg.parentNode.insertBefore(bar,pre||tg);
$("v35SrcSelect").addEventListener("change",e=>setSrcMode(e.target.value));
updateSrcBar();
}
}
function decorate(){
const c=counts();
document.querySelectorAll("#themeGrid .v163-theme").forEach(w=>{
const inp=w.querySelector("input"),lab=w.querySelector("label");if(!inp||!lab)return;
const e=c[inp.value]||{o:0,c:0};
const n=srcMode==="custom"?e.c:srcMode==="official"?e.o:e.o+e.c;
let s=lab.querySelector(".v35-count");
if(!s){s=document.createElement("span");s.className="v35-count";lab.appendChild(s);}
const txt="("+n+")"+(srcMode==="all"&&e.c?" ⭐"+e.c:"");
if(s.textContent!==txt)s.textContent=txt;
});
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-v35open]");if(b){e.preventDefault();openModal("create");return;}const q=e.target.closest("[data-qcmopen]");if(q){e.preventDefault();if(window.QcmUI)window.QcmUI.open();}});
/* ---------- Intégration au moteur ---------- */
const baseHas=hasTranslation;
hasTranslation=function(q,lang){
if(!q||!sourceAllowed(q))return false;
if(q.source==="perso")return true;
if(q.v35)return lang==="fr"||!!q.v35Neutral;
return baseHas(q,lang);
};
const baseLoc=localizeQuestion;
localizeQuestion=function(q,lang){if(q&&(q.source==="perso"||q.v35))return q;return baseLoc(q,lang);};
const baseBuild=window.buildThemeSelector;
if(typeof baseBuild==="function"){window.buildThemeSelector=function(){const r=baseBuild.apply(this,arguments);try{mountEntries();decorate();updateSrcBar();}catch(e){}return r;};}
const baseDisplay=displayQuestion;
displayQuestion=function(q,round){
const r=baseDisplay(q,round);
try{
const host=$("questionCategory");
if(host){let b=$("v35Src");if(!b){b=document.createElement("span");b.id="v35Src";host.insertAdjacentElement("afterend",b);}
const custom=q&&q.source==="perso";b.className="v35-src"+(custom?" perso":"");b.textContent=custom?"⭐ Question perso":"📚 Officielle";}
}catch(e){}
return r;
};
const baseScreen=showScreen;
showScreen=function(id){const r=baseScreen(id);setTimeout(()=>{try{mountEntries();decorate();}catch(e){}},0);return r;};
/* ---------- Initialisation ---------- */
QUESTIONS.forEach(q=>{if(q&&!q.source)q.source="officiel";});
loadStore();
store.forEach(addRuntime);
setTimeout(()=>{mountEntries();refreshThemes();},50);
setInterval(()=>{try{mountEntries();decorate();}catch(e){}},1500);
window.v35Q={open:openModal,close:closeModal,get store(){return store;},validate,norm,setSrcMode,get srcMode(){return srcMode;},sourceAllowed,counts,importText,exportJSON,addRecords,ensureAllSource,get max(){return MAX_QUESTIONS;},get left(){return Math.max(0,MAX_QUESTIONS-store.length);}};
})();
