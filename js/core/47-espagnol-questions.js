/* =========================================================
ESPAGNOL (questions)
========================================================= */
(function(){
const ES_PACK=[
["¿Qué alimento prácticamente nunca se echa a perder?",["La miel","La leche","La lechuga","El yogur"]],
["¿Qué animal tiene huellas dactilares muy parecidas a las humanas?",["El koala","El gato","El delfín","El panda"]],
["Botánicamente, el plátano (banana) es…",["Una baya","Una verdura","Una nuez","Un tubérculo"]],
["¿Qué galaxia contiene nuestro Sistema Solar?",["La Vía Láctea","Andrómeda","El Triángulo","El Sombrero"]],
["¿Cuánto tarda (aprox.) la luz del Sol en llegar a la Tierra?",["8 minutos","8 segundos","8 horas","8 días"]],
["¿Qué planeta gira sobre sí mismo «al revés» (rotación retrógrada)?",["Venus","Marte","Júpiter","Mercurio"]],
["¿Qué animal es la mascota de Linux?",["Un pingüino (Tux)","Un gato","Un león","Un delfín"]],
["¿Qué raza de perro es la estrella del meme «Doge»?",[".",".",".","."]],
["¿Cómo se llama el meme del gato volador con cuerpo de Pop-Tart y estela arcoíris?",[".",".",".","."]],
["¿Cuál es el órgano más grande del cuerpo humano?",["La piel","El hígado","El cerebro","El intestino"]],
["¿Cuántos huesos tiene un adulto (aprox.)?",[".",".",".","."]],
["¿Cuál es el hueso más largo del cuerpo humano?",["El fémur","La tibia","El húmero","El radio"]],
["¿Cuál es la montaña más alta del mundo sobre el nivel del mar?",["El Everest","El K2","El Mont Blanc","El Kilimanjaro"]],
["¿Cuál es el animal terrestre más rápido?",["El guepardo","El león","El avestruz","El caballo"]],
["¿Cuál es el río más largo de Francia?",["El Loira","El Sena","El Ródano","El Garona"]],
["¿En qué país está el Taj Mahal?",["La India","Pakistán","Nepal","Irán"]],
["¿En qué ciudad está la Sagrada Familia?",["Barcelona","Madrid","Sevilla","Valencia"]],
["¿Qué país tiene más husos horarios (territorios de ultramar incluidos)?",["Francia","Rusia","Estados Unidos","Reino Unido"]],
["¿Qué Pokémon es el número 25 de la Pokédex?",["Pikachu","Charmander","Pidgey","Jigglypuff"]],
["¿Qué estudio hizo «El viaje de Chihiro»?",[".",".",".","."]],
["En One Piece, ¿cuál es la fruta del diablo de Luffy?",[".",".",".","."]],
["¿Quién patentó el teléfono en 1876?",[".",".",".","."]],
["¿En qué año salió el primer iPhone?",[".",".",".","."]],
["¿Qué invento de Gutenberg revolucionó la difusión de los libros?",["La imprenta de tipos móviles","La brújula","La pólvora","El microscopio"]],
["¿Cómo se llama la escuela de magia de Harry Potter?",["Hogwarts","Beauxbatons","Durmstrang","Ilvermorny"]],
["En «El Señor de los Anillos», ¿dónde se destruye el Anillo Único?",["El Monte del Destino","Minas Tirith","Rivendel","Isengard"]],
["¿Cómo se llama el planeta desértico de «Dune»?",[".",".",".","."]],
["¿Cuántas casillas tiene un tablero de ajedrez?",[".",".",".","."]],
["¿Qué pieza de ajedrez se mueve en «L»?",["El caballo","El alfil","La torre","La reina"]],
["¿Cuántas armas hay en el juego base del Cluedo?",[".",".",".","."]],
["¿Qué cantante es apodada «Queen B»?",[".",".",".","."]],
["¿Qué juego móvil consistía en lanzar pájaros contra cerdos?",[".",".",".","."]],
["¿Qué baile popularizó el «Gangnam Style»?",["El baile del caballo","El moonwalk","La macarena","El twist"]],
["¿Qué criatura legendaria bebe sangre según el folclore?",["El vampiro","El yeti","La sirena","El centauro"]],
["¿Qué monstruo se dice que vive en un lago escocés?",[".",".",".","."]],
["¿Qué animal mítico renace de sus cenizas?",["El fénix","El grifo","La quimera","La hidra"]]
];
const ES_BASE=[["¿Cuál es la capital de Francia?", ["París", "Lyon", "Marsella", "Niza"]], ["¿Cuál es la capital de Italia?", ["Milán", "Roma", "Nápoles", "Venecia"]], ["¿Cuál es la capital de Japón?", [".", ".", ".", "."]], ["¿Cuál es el océano más grande?", ["Atlántico", "Índico", "Pacífico", "Ártico"]], ["¿Qué animal maúlla?", ["Perro", "Gato", "Caballo", "Vaca"]], ["¿Qué animal produce miel?", ["Abeja", "Hormiga", "Mariposa", "Mosca"]], ["¿Qué personaje lleva una gorra roja?", [".", ".", ".", "."]], ["¿Qué personaje es azul y muy rápido?", [".", ".", ".", "."]], ["¿En qué película aparece Simba?", ["El Rey León", ".", ".", "."]], ["¿Qué planeta es rojo?", ["Marte", "Júpiter", "Venus", "Mercurio"]], ["¿Cuántos días tiene una semana?", [".", ".", ".", "."]], ["¿Qué instrumento suele tener 88 teclas?", ["Guitarra", "Piano", "Violín", "Flauta"]], ["¿De qué país procede tradicionalmente la pizza?", ["Francia", "Italia", "España", "Grecia"]], ["¿Cuántos jugadores forman un equipo de fútbol en el campo?", [".", ".", ".", "."]], ["¿Cuál es el país más grande del mundo por superficie?", ["Canadá", "China", "Rusia", "Estados Unidos"]], ["¿Cuál es la capital de Australia?", [".", ".", ".", "."]], ["¿Qué animal puede cambiar de color para camuflarse?", ["Camaleón", "Tigre", "Elefante", "."]], ["¿Qué mamífero es capaz de volar?", ["Águila", "Murciélago", "Pingüino", "Avestruz"]], ["¿Qué personaje usa una espada en Zelda?", [".", ".", ".", "."]], ["¿En qué juego se encuentra el Nether?", [".", ".", ".", "."]], ["¿Qué personaje usa el martillo Mjolnir?", [".", ".", ".", "."]], ["¿Qué fuerza nos mantiene en el suelo?", ["Magnetismo", "Gravedad", "Electricidad", "Fricción"]], ["¿Qué órgano bombea la sangre?", ["Pulmón", "Cerebro", "Corazón", "Hígado"]], ["¿Qué significa HTML?", [".", ".", ".", "."]], ["¿Qué lenguaje sirve para dar estilo a una página web?", [".", ".", ".", "."]], ["¿Qué significa URL?", [".", ".", ".", "."]], ["¿Cuántos jugadores de un equipo de baloncesto están en la cancha?", [".", ".", ".", "."]], ["¿Cuál es la capital de Kazajistán?", [".", ".", "Biskek", "Taskent"]], ["¿Qué estrecho separa Europa de África?", ["Bósforo", "Gibraltar", "Bering", "Ormuz"]], ["¿Qué animal tiene tres corazones?", ["Pulpo", "Tiburón", "Delfín", "Medusa"]], ["¿Cuál es el único mamífero capaz de volar activamente?", ["Ardilla voladora", "Murciélago", "Lémur", "Colugo"]], ["¿Cómo se llama el reino principal de The Legend of Zelda?", [".", ".", ".", "."]], ["¿Qué director dirigió Origen (Inception)?", [".", ".", ".", "."]], ["¿Cuál es el símbolo químico del wolframio (tungsteno)?", [".", ".", ".", "."]], ["¿Qué partícula tiene carga negativa?", ["Protón", "Neutrón", "Electrón", "Fotón"]], ["¿Qué significa CPU?", [".", ".", ".", "."]], ["¿Cuántos semitonos tiene una octava?", [".", ".", ".", "."]], ["¿Qué movimiento artístico se asocia a Claude Monet?", ["Cubismo", "Impresionismo", "Surrealismo", "Barroco"]], ["¿Qué significa DNS?", [".", ".", ".", "."]], ["¿Cuál es la capital de Palaos?", [".", ".", ".", "."]], ["¿Qué país posee el enclave de Llívia?", ["Francia", "España", "Andorra", "Portugal"]], ["¿Qué animal tiene sangre azul por la hemocianina?", ["Pulpo", "Rana", "Tigre", "Águila"]], ["¿Qué constante vale aproximadamente 6,626 × 10⁻³⁴ J·s?", ["Constante de Planck", "Constante de Boltzmann", "Número de Avogadro", "Constante gravitacional"]], ["¿Cuál es aproximadamente el número de Avogadro?", [".", ".", ".", "."]], ["¿Qué estructura de datos sigue el principio LIFO?", ["Cola", "Pila", "Árbol", "Grafo"]], ["¿Qué estructura de datos sigue el principio FIFO?", ["Pila", "Cola", "Montículo", "Árbol"]], ["¿Qué lenguaje creó Guido van Rossum?", [".", ".", ".", "."]], ["¿Cómo se llama el protagonista de Hollow Knight?", [".", ".", ".", "."]], ["¿Qué director dirigió Stalker en 1979?", ["Andréi Tarkovski", "Akira Kurosawa", "Ingmar Bergman", "Federico Fellini"]], ["¿Qué compositor escribió La consagración de la primavera?", [".", ".", ".", "."]], ["¿Cuál es el único número primo par?", [".", ".", ".", "."]], ["¿Qué artista pintó el techo de la Capilla Sixtina?", ["Rafael", "Miguel Ángel", "Donatello", "Caravaggio"]], ["¿Qué código HTTP indica normalmente un error 'Not Found'?", [".", ".", ".", "."]]];
const rows=[];
/* index du pack = 36 dernières questions */
const startPack=QUESTIONS.length-36;
while(rows.length<QUESTIONS.length)rows.push(null);
ES_BASE.forEach((r,i)=>{rows[i]=r;});
ES_PACK.forEach((r,k)=>{rows[startPack+k]=r;});
LANG_PACKS.es={
cats:{
"Géographie":"Geografía","Animaux":"Animales","Jeux vidéo":"Videojuegos","Cinéma":"Cine",
"Sciences":"Ciencia","Culture générale":"Cultura general","Musique":"Música","Cuisine":"Cocina",
"Sport":"Deportes","Informatique":"Informática","Art":"Arte","Web":"Web",
"Incroyable mais vrai":"Increíble pero cierto","Espace":"Espacio","Internet & Mèmes":"Internet y memes",
"Corps humain":"Cuerpo humano","Records":"Récords","Voyages":"Viajes","Manga & Animation":"Manga y animación",
"Inventions":"Inventos","Fantasy":"Fantasía","Jeux de société":"Juegos de mesa","Pop culture":"Cultura pop",
"Légendes & Monstres":"Leyendas y monstruos","Histoire":"Historia","Littérature":"Literatura",
"Technologie":"Tecnología","Nature":"Naturaleza","Mythologie":"Mitología","Langues":"Idiomas"
},
diff:{facile:"🟢 FÁCIL",moyen:"🔵 MEDIO",difficile:"🟠 DIFÍCIL",impossible:"🔴 IMPOSIBLE"},
rows
};
QUESTION_LANGS.push({code:"es",label:"🇪🇸 Español"});
})();
