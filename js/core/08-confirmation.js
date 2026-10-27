/* =========================================================
CONFIRMATION
========================================================= */
function openConfirm(
title,
text,
action,
icon="❓"
){
pendingAction=action;
document.getElementById(
"confirmTitle"
).textContent=title;
document.getElementById(
"confirmText"
).textContent=text;
document.getElementById(
"confirmIcon"
).textContent=icon;
document.getElementById(
"confirmModal"
).classList.add("show");
}
function closeConfirm(){
pendingAction=null;
document.getElementById(
"confirmModal"
).classList.remove("show");
}
function confirmAction(){
const action=pendingAction;
closeConfirm();
if(typeof action==="function"){
action();
}
}
