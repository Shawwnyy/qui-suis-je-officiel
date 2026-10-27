/* =========================================================
THEMES
========================================================= */
function buildThemeSelector(){
const container=
document.getElementById(
"themeGrid"
);
container.innerHTML="";
getCategories()
.forEach((category,index)=>{
const id="theme-"+index;
const wrapper=
document.createElement("div");
wrapper.className="theme-option";
wrapper.innerHTML=`
<input
type="checkbox"
id="${id}"
value="${escapeHTML(category)}"
checked>
<label for="${id}">
${escapeHTML(categoryLabel(category,questionLang))}
</label>
`;
wrapper
.querySelector("input")
.addEventListener(
"change",
updateSelectedThemes
);
container.appendChild(wrapper);
});
updateSelectedThemes();
}
function updateSelectedThemes(){
selectedThemes=
[...document.querySelectorAll(
"#themeGrid input:checked"
)].map(input=>input.value);
const total=
getCategories().length;
const info=
document.getElementById(
"selectedThemesInfo"
);
if(!selectedThemes.length){
info.textContent=
"⚠️ Aucun thème sélectionné.";
}else if(
selectedThemes.length===total
){
info.textContent=
"🎯 Tous les thèmes sont sélectionnés.";
}else{
info.textContent=
`🎯 ${selectedThemes.length} thème(s) sélectionné(s).`;
}
}
