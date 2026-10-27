/* Extrait de l'ancien index.html : <script id="v208-normal-navigation-script"> */
(function V208NormalNavigation(){
"use strict";
function cleanup(){
document.getElementById("v205KeyboardState")?.remove();
document.querySelectorAll(".v205-focus").forEach(function(el){
el.classList.remove("v205-focus");
});
document.documentElement.style.overflowY="auto";
document.body.style.overflowY="auto";
}
if(document.readyState==="loading"){
document.addEventListener("DOMContentLoaded",cleanup,{once:true});
}else{
cleanup();
}
window.addEventListener("pageshow",cleanup);
document.title="Qui suis-je ? 🎮 — V20.8 navigation normale";
})();
