/* =========================================================
AUDIO
========================================================= */
function initAudio(){
if(!soundEnabled)return;
try{
if(!audioContext){
audioContext=
new(
window.AudioContext||
window.webkitAudioContext
)();
}
if(audioContext.state==="suspended"){
audioContext.resume();
}
}catch(e){}
}
function tone(
freq,
duration,
type="sine",
volume=.07,
delay=0
){
if(!soundEnabled)return;
initAudio();
if(!audioContext)return;
const osc=
audioContext.createOscillator();
const gain=
audioContext.createGain();
osc.type=type;
osc.frequency.value=freq;
const now=
audioContext.currentTime;
gain.gain.setValueAtTime(
0,
now+delay
);
gain.gain.linearRampToValueAtTime(
volume,
now+delay+.01
);
gain.gain.exponentialRampToValueAtTime(
.001,
now+delay+duration
);
osc.connect(gain);
gain.connect(audioContext.destination);
osc.start(now+delay);
osc.stop(
now+
delay+
duration+
.03
);
}
function soundCorrect(){
tone(523,.12);
tone(659,.12,"sine",.08,.1);
tone(784,.2,"sine",.09,.2);
}
function soundWrong(){
tone(180,.16,"sawtooth",.09);
tone(120,.25,"sawtooth",.07,.12);
}
function soundPower(){
tone(523,.1);
tone(659,.1,"sine",.08,.1);
tone(1046,.3,"sine",.1,.2);
}
function soundVictory(){
[523,659,784,1046,1318]
.forEach((n,i)=>{
tone(n,.25,"sine",.09,i*.12);
});
}
function toggleSound(){
soundEnabled=!soundEnabled;
document.getElementById(
"soundToggle"
).textContent=
soundEnabled
?"🔊 Son ON"
:"🔇 Son OFF";
if(soundEnabled){
initAudio();
}
}
