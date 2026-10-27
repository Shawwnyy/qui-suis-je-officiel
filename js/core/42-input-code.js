/* =========================================================
INPUT CODE
========================================================= */
document.getElementById(
"roomInput"
).addEventListener(
"input",
function(){
this.value=
this.value
.replace(/\D/g,"")
.slice(0,6);
}
);
