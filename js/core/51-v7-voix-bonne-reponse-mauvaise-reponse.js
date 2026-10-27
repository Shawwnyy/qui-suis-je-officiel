/* =========================================================
V7 — VOIX : « Bonne réponse » / « Mauvaise réponse »
========================================================= */
const VOICE_TEXT={
fr:{ok:"Bonne réponse",ko:"Mauvaise réponse",lang:"fr-FR"},
en:{ok:"Correct answer",ko:"Wrong answer",lang:"en-US"},
es:{ok:"Respuesta correcta",ko:"Respuesta incorrecta",lang:"es-ES"}
};
function loadPref(key,fallback){
try{
const v=localStorage.getItem(key);
return v===null?fallback:v;
}catch(e){
return fallback;
}
}
function savePref(key,value){
try{localStorage.setItem(key,value);}catch(e){}
}
let voiceOn=loadPref("quizVoice","1")==="1";
function speakResult(ok){
if(!voiceOn||!("speechSynthesis" in window))return;
const pack=VOICE_TEXT[window.__qlang]||VOICE_TEXT.fr;
try{
speechSynthesis.cancel();
const u=new SpeechSynthesisUtterance(ok?pack.ok:pack.ko);
u.lang=pack.lang;
u.rate=1.05;
u.pitch=ok?1.15:0.8;
speechSynthesis.speak(u);
}catch(e){}
}
function toggleVoice(){
voiceOn=!voiceOn;
savePref("quizVoice",voiceOn?"1":"0");
const b=document.getElementById("dockVoice");
if(b)b.textContent=voiceOn?"🔊":"🔇";
if(!voiceOn&&"speechSynthesis" in window)speechSynthesis.cancel();
}
