/* =========================================================
CLAVIER
========================================================= */
document.addEventListener(
"keydown",
e=>{
if(
e.key==="Escape"&&
document.getElementById(
"confirmModal"
).classList.contains("show")
){
closeConfirm();
}
if(
e.key==="Enter"&&
document.getElementById(
"confirmModal"
).classList.contains("show")
){
confirmAction();
}
}
);
