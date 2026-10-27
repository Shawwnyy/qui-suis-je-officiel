/* =========================================================
PROGRESSION
========================================================= */
function updateAnswerProgress(
answeredCount,
total
){
document.getElementById(
"answeredCount"
).textContent=
answeredCount;
document.getElementById(
"playerCount"
).textContent=
total;
const percent=
total>0
?Math.min(
100,
answeredCount/total*100
)
:0;
document.getElementById(
"progressFill"
).style.width=
percent+"%";
}
