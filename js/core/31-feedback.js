/* =========================================================
FEEDBACK
========================================================= */
function showFeedback(
correct,
symbol
){
const overlay=
document.getElementById(
"feedbackOverlay"
);
const element=
document.getElementById(
"feedbackSymbol"
);
overlay.classList.remove(
"show"
);
void overlay.offsetWidth;
element.className=
"feedback-symbol "+
(
correct
?"feedback-green"
:"feedback-red"
);
element.textContent=
symbol||
(correct?"✓":"✕");
overlay.classList.add("show");
setTimeout(()=>{
overlay.classList.remove(
"show"
);
},850);
}
