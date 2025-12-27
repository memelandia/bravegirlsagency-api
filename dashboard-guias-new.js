// dashboard-guias.js - Sistema de guías para chatters
// Última actualización: 27/12/2025 - Lucy agregada

// Datos de ejemplo - En producción, esto vendría de Google Sheets o API
const MODELOS_DATA = {
    bellarey: {
        nombre: "Bella (Bellarey)",
        username: "@bellarey",
        status: "activa",
        edad: "—",
        pais: "España – Madrid",
        idiomas: "Español",
        altura: "173 cm",
        peso: "52 kg",
        horarios: "Mañanas, tardes y noches (consultar para grabaciones)",
        personalidad: "Dulce, juguetona, tímida, atrevida, cariñosa y con energía alta",
        descripcion: "Chica deportista, sensible, dulce y atrevida. Volviendo al ballet. Le gusta cocinar, cuidar y es muy fogosa.",
        hobbies: "Bailar, pintar, pasear, bici, entrenar, escribir, coser, cuidar plantas",
        musica: "Techno, clásica, reggaeton, jazz, blues",
        comida_favorita: "Tortilla de patatas",
        no_le_gusta_comida: "Pimiento y coles",
        mascotas: "Chihuahua: Canela (5 años, carácter fuerte) y Mestiza negra sin cola: Keyla (muy activa)",
        tipo_chico_ideal: "Cariñoso, fogoso, respetuoso, divertido, deportista, curioso, sincero y que huela bien",
        apaga: "Dientes sucios, malos olores, mentiras",
        emojis_favoritos: "🫶🏼✨🙈🙌🏼😌💕",
        expresiones_favoritas: "😳🤤😮‍💨😅🥹😇😍🤭😏",
        palabras_tipicas: "Ostras, qué chulo, ¿no? | Me mola | Guapo / bonito | Cotilla | Joer qué sueño | Tengo un vídeo para ti",
        cosas_no_decir: "Nada latino (ej: videito, gustao) | No abusar de 'rico' | Evitar expresiones 'de pueblo' | Cuidar ortografía SIEMPRE",
        contenido_nunca: "Heces, animales, vómitos, fluidos extremos, violencia, humillación fuerte",
        trabaja_sola: "Sí, solo ella",
        hace_customs: "Sí",
        ejemplos_customs: "Masturbación, contenido sensual, videos con outfits especiales, ballet vibes, lencería variada",
        outfits: "Blanco, Body, Maillot de ballet, Zapatos de ballet, Lencería de todos los colores, Medias de colores (preguntar)",
        accesorios: "Casi todo disponible. Si no lo tiene, lo compra/consigue (Amazon, bazar), mientras sea razonable",
        tiempo_entrega: "24-48h recomendado",
        intensidad: "Muy subido de tono",
        precio_mensaje: "$5 mínimo",
        precio_foto: "$15-30",
        precio_video: "$50-100",
        precio_custom_foto: "$40+",
        precio_custom_video: "$150+",
        notas: "🎯 ESTRATEGIA DE VENTA: Cliente ideal son hombres respetuosos, dulces, deportistas. Engancha con conversación dulce, cercana, juguetona. Elogios a su arte (ballet, dibujo). Nunca usar expresiones latinas. Su marca: dulzura + energía + sensualidad fogosa."
    },
    lexiflix: {
        nombre: "Lexiflix (Lexi)",
        username: "@lexiflix",
        status: "activa",
        edad: "19 (19/06/2007)",
        pais: "Málaga, España",
        idiomas: "Español, Inglés",
        altura: "166 cm",
        peso: "68 kg",
        estudia: "Administración de empresas",
        horarios: "Tardes y noches",
        personalidad: "Dulce, juguetona, tímida, cariñosa, divertida",
        descripcion: "Tímida, graciosa, buena, cariñosa y atenta. Vibra dulce y juvenil.",
        hobbies: "Ir al gym, escuchar música, leer, cocinar",
        musica: "Reggaeton",
        comida_favorita: "Sushi",
        no_le_gusta_comida: "Nada en particular",
        tiempo_libre: "Cenar afuera, pasear con Rocco, ir al cine",
        mascotas: "Rocco – perro salchicha, 8 meses",
        tipo_chico_ideal: "Fiel, respetuoso, comprometido, comprensivo, gracioso, generoso, humilde, compañero, amoroso, seguro",
        apaga: "Violencia, actitudes de superioridad, 'ratas'",
        emojis_favoritos: "🤭🥰😍🫶🏻🩷❤️❤️‍🔥😈",
        palabras_tipicas: "Bb | Me encantas",
        cosas_no_decir: "Que vive en Argentina | Su IG personal | Su nombre real | Promesas falsas (viajes, etc.) | Llamadas fuera del depto",
        contenido_nunca: "Nada con otras personas, Anal fuerte (sin dildos penetrativos), Vómito, Humillación exagerada, Degradación extrema",
        trabaja_sola: "Sí, solo ella",
        hace_customs: "Sí (consultar caso por caso)",
        ejemplos_customs: "Contenido sensual, coqueto, masturbación suave, outfits temáticos, POV dulce",
        outfits: "Consultar antes para confirmar",
        accesorios: "Aro de luz Gadnic de 46 cm (compra más cuando cobra)",
        disfraces: "Caperucita, Colegiala",
        tiempo_entrega: "Consultar disponibilidad",
        intensidad: "Suave, estilo girlfriend experience",
        zona_horaria: "Argentina (GMT-3)",
        paises_visitados: "Brasil",
        paises_visitar: "Dubai, Francia, Grecia, Estados Unidos, Polinesia Francesa",
        signo: "Géminis",
        precio_mensaje: "$3-5",
        precio_foto: "$15-30",
        precio_video: "$50-100",
        precio_custom_foto: "$40+",
        precio_custom_video: "$150+",
        notas: "🎯 ESTRATEGIA DE VENTA: Cliente ideal son chicos dulces, atentos, que buscan cariño y coquetería. Convierte bien en estilo 'novia tímida', conversación amable y juguetona, coqueteo suave. Venderla como: dulce, tierna, divertida, un poco tímida pero muy atenta. Su punto fuerte: naturaleza cariñosa + vibra juvenil + conexión emocional."
    },
    vickyluna: {
        nombre: "Vicky Luna (Vic)",
        username: "@vickyluna",
        status: "activa",
        edad: "26 (15/09/1995)",
        pais: "Madrid, España",
        idiomas: "Español (AR), Inglés",
        altura: "175 cm",
        peso: "72 kg",
        horarios: "Mañanas, tardes y noches",
        personalidad: "Cariñosa, atrevida, dulce, divertida. Tono argentino siempre",
        descripcion: "Argentina directa, sociable, sincera, plantada. 'No me banco ninguna.'",
        hobbies: "Cuidar plantas, hacerse las uñas ella misma",
        musica: "Trap, rap, música argentina",
        comida_favorita: "Japonesa / China",
        no_le_gusta_comida: "Árabe",
        tiempo_libre: "Se queda en casa, hace tareas, o sale con amigxs. Fuma socialmente",
        mascotas: "1 gata negra (Argentina), 1 siamesa (España)",
        tipo_chico_ideal: "Alto, dominante, con fuerza",
        apaga: "Personas sucias o desordenadas, gente que interrumpe mientras habla",
        emojis_favoritos: "—",
        palabras_tipicas: "Hablar como argentina ('acá' en vez de 'aquí'), tono directo y genuino",
        cosas_no_decir: "❌ Frases políticas ('Aguante Perón', 'Aguante Cristina') | ❌ Debates políticos o sociales",
        contenido_nunca: "Nada sadomasoquista fuerte, Nada escatológico (caca, pedos), Nada extremo o degradante",
        trabaja_sola: "Puede trabajar con chico",
        hace_customs: "Sí (caso por caso verificando límites)",
        ejemplos_customs: "Sensual dominante suave argentina, Bailes y strip tease, Fumando sensualmente, POV íntimo, Escenas con chico (respetando límites)",
        outfits: "Muchos colores: Bordó (x2), Rojo, Verde oscuro (x2), Rosas varios, Turquesa, Negro, Marrón (No tiene medias por arriba de rodilla)",
        accesorios: "2 dildos, 1 dildo anal, 1 vibrador",
        tiempo_entrega: "Consultar, suele tener flexibilidad",
        intensidad: "Media-alta, segura",
        paises_visitados: "Brasil, USA, España, Uruguay, Croacia, Italia, Chile, Alemania, Andorra",
        paises_visitar: "Punta Cana, Bali",
        signo: "Virgo",
        precio_mensaje: "$5 mínimo",
        precio_foto: "$20-40",
        precio_video: "$60-150",
        precio_custom_foto: "$50+",
        precio_custom_video: "$180+",
        notas: "🎯 ESTRATEGIA DE VENTA: Tono argentina directa, segura de sí misma, dulce pero atrevida, sexual de forma natural. NO usar lenguaje español neutro. Vende: Personalidad fuerte + dulzura, contenido sensual con actitud, customs con vibe dominante suave. Posicionarla: 'Una mina plantada, sincera y directa', 'Sexy, divertida y con actitud', 'Te habla como una argentina real, sin vueltas'."
    },
    carmencitax: {
        nombre: "Carmencitax (Carmen)",
        username: "@carmencitax",
        status: "activa",
        edad: "24 (26/06/2001)",
        pais: "Córdoba, España",
        idiomas: "Español",
        altura: "163 cm",
        peso: "64 kg",
        horarios: "Noches",
        personalidad: "Cariñosa, dominante, atrevida, dulce, tímida, juguetona, divertida. Lo más real posible, con carácter",
        descripcion: "Personas sinceras, honestas, puras, reales, leales. Con carácter, pero buena persona.",
        hobbies: "Bailar, cantar, leer, jugar LoL",
        musica: "Música actual, flamenquito",
        comida_favorita: "Tortilla de patatas, Huevos con patatas y jamón, Lasaña, Macarrones",
        no_le_gusta_comida: "Zanahoria, Cordero, Ternera",
        tiempo_libre: "Jugar LoL, salir con seres queridos, meditar, pensar, escribir, leer, bailar",
        despertar: "Ir al baño (20 min), lavarse la cara, recoger la casa",
        mascotas: "Ha tenido: perros, gatos, tortugas, pájaros/palomas, cerdos, gallinas (actualmente no tiene)",
        tipo_chico_ideal: "Como Homero para Morticia. Que la valore, respete y se preocupe. Físicamente: voluminoso, más alto que ella",
        apaga: "Más bajo que ella, sin trabajo ni dinero, no claro, indecisos",
        emojis_favoritos: "🥹🫣😎🫩😂❤️😍🤭😳🥲🤨🙂‍↔️😟",
        palabras_tipicas: "Me entiendes? | Sabes lo que te quiero decir? | Qué me cuentas?",
        cosas_no_decir: "❌ Nada relacionado con niños | ❌ Nada de familia | ❌ No inventar historias familiares | ⚠️ Tiene 1 hijo (NUNCA mencionarlo a fans)",
        contenido_nunca: "Caca, Pipí (evitar si es posible), Pedos, Eructos, Vómitos, Nada extremo o fuera de lo normal",
        trabaja_sola: "Sola, Con chico, Con otra chica",
        hace_customs: "Sí",
        ejemplos_customs: "Contenido sensual, dominante, juguetona",
        outfits: "Casi de todo disponible",
        accesorios: "Casi de todo (completo)",
        disfraces: "Casi de todo disponible",
        tiempo_entrega: "Noches",
        intensidad: "Media-alta, con carácter",
        paises_visitados: "Francia, Huelva, Jaén, Canarias, Málaga, Sevilla, Madrid, Almería, Granada",
        paises_visitar: "Tailandia, Argentina, Laponia, Brasil",
        signo: "Cáncer",
        precio_mensaje: "$5 mínimo",
        precio_foto: "$20-35",
        precio_video: "$60-120",
        precio_custom_foto: "$45+",
        precio_custom_video: "$160+",
        notas: "🎯 ESTRATEGIA DE VENTA: Cliente ideal busca personalidad real, con carácter pero cariñosa. Representarla como lo más real posible, sincera, leal, con 'huevos'. NO mencionar NUNCA temas de familia o niños. Venderla: auténtica, directa, cariñosa pero con actitud. Su punto fuerte: honestidad + carácter + lealtad."
    },
    lucy: {
        nombre: "Lucy",
        username: "@lucygarcia",
        status: "activa",
        edad: "30 (decir 30, real 37)",
        pais: "España – Barcelona",
        idiomas: "Español, Otros",
        altura: "168 cm",
        peso: "65 kg",
        horarios: "Tardes y noches",
        personalidad: "Dulce, juguetona, tímida, dominante, divertida. Altamente sensible y agradecida. Dura por fuera pero dulce por dentro.",
        descripcion: "Enfermera en clínica de Barcelona. Vive en piso compartido con amiga latina. Dulce y sumisa en parte vainilla, pero también domme. Muy sensible, agradecida, mira más por los demás que por ella. Tiene carácter pero lo está sacando.",
        hobbies: "Gimnasio, baile, montaña, playa, salir a cenar (aunque bastante casera)",
        musica: "Lista de reproducción variada: música antigua, reggaeton, dancehall, afro, hiphop, rock, techno",
        comida_favorita: "Le encanta todo, sobre todo el queso",
        no_le_gusta_comida: "Cosas extrañas tipo vísceras",
        mascotas: "2 gatas: Mía (blanca con manchas, primera adoptada) y Oruga (negra y blanca pelo largo, cogida de la calle). Tuvo a Lucy (gatita negra que murió hace 2 años)",
        tipo_chico_ideal: "Se fija en labios y forma de expresarse. Que la haga reír, abierto de mente, no engañe, transparente, respetuoso, cariñoso, esté en las buenas y malas, protector, positivo, le guste salir y hacer planes, viajar juntos",
        apaga: "Negatividad, que no sean empáticos, que no entiendan su sensibilidad, que hablen feo",
        emojis_favoritos: "🙏🏼🖤✨👀😛⛓️🔥🥹😋💗 (usa muchos emojis después de cada frase, es muy característico. Todo muy cuki aunque parezca dura)",
        expresiones_favoritas: "Pone emoji acorde con lo que dice. Ej: 'gracias amor me alegro que te guste 💗'",
        palabras_tipicas: "gracias amor | me alegro que te guste | amor | dulce y agradecida | Con sumisos: tono dominante ⛓️",
        cosas_no_decir: "❌ NUNCA 'ahorita' (es latinismo) | ❌ NUNCA 'acá' o 'allá' (decir 'aquí' y 'allí') | ❌ No dar detalles exactos de dónde vive/trabaja | ✔️ Decir que es enfermera en clínica de Barcelona | ✔️ Vive en piso compartido con amiga latina (por si escapa alguna expresión) | ❌ No decir que vive sola | ⚠️ Edad: decir 30 años",
        contenido_nunca: "Nada con hombres",
        trabaja_sola: "Sí, solo ella",
        hace_customs: "Sí",
        ejemplos_customs: "Contenido dulce/sumiso, contenido dominante/domme, lencería, transparencias, disfraces",
        outfits: "Lencería variada, cosas transparentes, ropa de SHEIN",
        accesorios: "Dildos, disfraces, arneses. De domme: strapon, ropa de látex, mordaza",
        disfraces: "Variedad disponible",
        tiempo_entrega: "Tardes/noches",
        intensidad: "Alta, subido de tono",
        paises_visitados: "Nueva York, Miami, México, Italia (Turín, Roma, San Benedetto, Bolonia, Cerdeña), Berlín, Bruselas, Francia, Andorra",
        paises_visitar: "Suiza, Brasil, Filipinas",
        signo: "Cáncer",
        color_favorito: "Morado",
        rutina_manana: "Abre la ventana y está con sus gatitas en la cama",
        precio_mensaje: "$5 mínimo",
        precio_foto: "$20-35",
        precio_video: "$60-120",
        precio_custom_foto: "$45+",
        precio_custom_video: "$160+",
        notas: "🎯 ESTRATEGIA DE VENTA: Cliente ideal busca dulzura genuina con un toque de misterio. En parte vainilla es dulce, sumisa, pone muchos emojis. Como domme, explotar su imagen dura. ES MUY IMPORTANTE mantener español de España (NUNCA latinismos como 'ahorita', 'acá', 'allá'). Si nota que no es ella, se da cuenta. Justificar si escapa alguna expresión latina: vive con amiga latina. Su punto fuerte: sensibilidad + dualidad dulce/dura + emojis constantes + genuina."
    }
};

const NORMAS_AGENCIA = {
    confidencialidad: [
        "❌ Prohibido descargar, guardar o reenviar contenido fuera de OnlyFans",
        "❌ Prohibido compartir capturas, datos privados o información interna",
        "❌ Prohibido mostrar conversaciones o material a terceros",
        "✔️ Todo lo que manejamos es confidencial"
    ],
    pagos: [
        "❌ No usar métodos de pago personales",
        "✔️ Todas las ventas se procesan solo por los métodos aprobados"
    ],
    horario: [
        "✔️ Cumplir el horario asignado",
        "📢 Avisar ausencias con antelación",
        "💬 Antes de cerrar turno: ningún chat sin responder"
    ],
    conducta: [
        "❌ Prohibido bloquear, discutir o faltar el respeto",
        "✔️ Comunicación cálida y orientada a ventas",
        "❌ No improvisar precios o servicios no permitidos",
        "✔️ Respetar estilo y límites de cada modelo"
    ],
    herramientas: [
        "❌ No compartir accesos a cuentas ni usar dispositivos ajenos",
        "✔️ Mantener bóveda, listas y notas ordenadas",
        "✔️ Usar solo contenido aprobado"
    ],
    penalizaciones: [
        "⚠️ Advertencia",
        "⛔ Suspensión",
        "❌ Despido",
        "💰 Puede aplicarse descuento en el pago si se afecta la reputación o ventas"
    ]
};

const TAREAS_DIARIAS = [
    {
        titulo: "🔥 PRIORIDAD 1 — Tráfico & Conversión",
        tareas: [
            "1) 🚀 Tirar ONLINE en los grupos",
            "2) 💬 Responder absolutamente todos los chats pendientes",
            "3) 🕒 Programar masivos (cada 2 h)",
            "4) 🔄 Programar el SFS diario"
        ]
    },
    {
        titulo: "📲 PRIORIDAD 2 — Crecimiento de la Cuenta",
        tareas: [
            "5) 🖼️ Subir 1 publicación diaria al feed",
            "6) 📢 Subir 2 historias con CTA para activar fans"
        ]
    },
    {
        titulo: "💎 PRIORIDAD 3 — Fidelización",
        tareas: [
            "7) 👋 Saludar fans gastadores / respetuosos",
            "8) 📂 Agregar fans valiosos a Fidelizar",
            "9) 📝 Añadir notas según fetiches o datos (nombre, edad, trabajo, gustos, cumpleaños, etc)"
        ]
    },
    {
        titulo: "📦 PRIORIDAD 4 — Organización",
        tareas: [
            "10) 🗂️ Mantener la bóveda ordenada",
            "11) 📸 Pedir a la modelo el contenido faltante"
        ]
    },
    {
        titulo: "🌙 FIN DE TURNO — Obligatorio",
        tareas: [
            "1) 🗑️ Eliminar masivos programados",
            "2) 📵 Avisar OFFLINE en los grupos",
            "3) 🧾 Registrar ventas del día (aunque sea $0)"
        ]
    }
];

const PRECIOS_MINIMOS = {
    orden_prioridad: {
        titulo: "🧾 ORDEN DE PRIORIDAD EN VENTAS",
        items: [
            "1️⃣ SCRIPT → Siempre lo primero a ofrecer",
            "2️⃣ Contenido de Bóveda → Segunda opción",
            "3️⃣ Custom o Videollamada → Solo si el cliente lo pide o está caliente"
        ],
        nota: "⚠️ Nunca empezar ofreciendo custom ni videollamada"
    },
    customs: {
        titulo: "🎥 CUSTOMS (Videos Personalizados)",
        descripcion: "Los precios dependen de: ⏱️ Minutos solicitados | 🔞 Nivel de explícito | 🔥 Acciones pedidas",
        contenido_caro: "Anal, Squirt, Participación de otra persona, Fetiches complejos o acciones intensas",
        regla: "A más minutos y más explícito → mayor precio inicial, luego se negocia si es necesario"
    },
    videollamadas: {
        titulo: "📞 VIDEOLLAMADAS (Cuentas Vainilla)",
        precio_inicial: "$30/min",
        negociable: "mínimo $25/min",
        nunca_menos: "$25/min",
        extras: "Se pueden agregar EXTRAS (lencería, dildo, juguetes, poses) - Ver guía de videollamadas",
        descripcion: "Para cuentas vainilla"
    },
    boveda: {
        titulo: "🎬 CONTENIDO DE BÓVEDA",
        reglas: [
            "✔️ Mientras más minutos tenga el video → mayor precio de salida",
            "✔️ Mientras más explícito → mayor precio inicial",
            "🔺 Videos con anal, squirt → precio más alto, no bajar de $80-$100 mínimo",
            "🔺 Videos de sexo con otra persona → precio más alto, no bajar de $80-$100 mínimo",
            "✔️ Objetivo: comenzar alto y negociar hacia abajo solo si es necesario"
        ],
        descripcion: "Es la opción más negociable, pero siguiendo reglas"
    },
    bragas: {
        titulo: "👙 ENVÍO DE BRAGAS",
        precio_inicial: "$150 a $200",
        extras: "Se agregan EXTRAS (días de uso, fotos, empaques especiales)",
        minimo: "❌ No se baja de $150 sin autorización",
        descripcion: "Envío físico de ropa interior"
    },
    recordatorio: {
        titulo: "✔️ Recordatorio Final",
        prohibido: [
            "❌ Regalar contenido",
            "❌ Rebajar precios sin justificación",
            "❌ Ofrecer servicios no aprobados"
        ],
        nota: "Cada venta debe mantener el valor de la modelo y de la agencia"
    }
};

// Inicializar el panel de guías
function initGuiasPanel() {
    // Agregar HTML del panel
    const panelHTML = `
        <!-- Botón flotante para abrir panel -->
        <button class="btn-guias" onclick="toggleGuiasPanel()" title="Abrir Guías">
            📚
        </button>
        
        <!-- Overlay oscuro -->
        <div class="guias-overlay" onclick="toggleGuiasPanel()"></div>
        
        <!-- Panel lateral -->
        <div class="guias-panel">
            <div class="guias-panel-header">
                <h2>📚 Centro de Guías</h2>
                <button class="btn-close-panel" onclick="toggleGuiasPanel()">×</button>
            </div>
            
            <div class="guias-tabs">
                <button class="guias-tab active" onclick="switchTab('modelos')">👥 Modelos</button>
                <button class="guias-tab" onclick="switchTab('normas')">📋 Normas</button>
                <button class="guias-tab" onclick="switchTab('tareas')">✅ Tareas</button>
                <button class="guias-tab" onclick="switchTab('precios')">💰 Precios</button>
            </div>
            
            <div class="guias-search">
                <input type="text" placeholder="🔍 Buscar en guías..." onkeyup="searchGuias(this.value)">
            </div>
            
            <div class="guias-content">
                <!-- Sección Modelos -->
                <div id="section-modelos" class="guias-section active"></div>
                
                <!-- Sección Normas -->
                <div id="section-normas" class="guias-section"></div>
                
                <!-- Sección Tareas -->
                <div id="section-tareas" class="guias-section"></div>
                
                <!-- Sección Precios -->
                <div id="section-precios" class="guias-section"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    
    // Cargar contenido de cada sección
    loadModelosSection();
    loadNormasSection();
    loadTareasSection();
    loadPreciosSection();
}

// Toggle panel
function toggleGuiasPanel() {
    const panel = document.querySelector('.guias-panel');
    const overlay = document.querySelector('.guias-overlay');
    
    panel.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Cambiar de pestaña
function switchTab(tabName) {
    // Actualizar pestañas activas
    document.querySelectorAll('.guias-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar sección correspondiente
    document.querySelectorAll('.guias-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`section-${tabName}`).classList.add('active');
}

// Cargar sección de modelos
function loadModelosSection() {
    const section = document.getElementById('section-modelos');
    let html = '<h2 style="margin-top: 0;">📋 Información de Modelos</h2>';
    
    Object.keys(MODELOS_DATA).forEach((key, index) => {
        const modelo = MODELOS_DATA[key];
        const statusClass = modelo.status;
        const statusText = modelo.status === 'activa' ? '🟢 Activa' : 
                          modelo.status === 'vacaciones' ? '🟡 Vacaciones' : '🔴 Inactiva';
        
        // Crear palabras clave de búsqueda
        const searchTerms = `${modelo.nombre} ${modelo.username} ${modelo.pais || ''} ${key}`.toLowerCase();
        
        html += `
            <div class="guia-accordion" data-search-content="${searchTerms}">
                <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                    <h3>${modelo.nombre} <span class="modelo-status ${statusClass}">${statusText}</span></h3>
                    <span class="guia-accordion-icon">▼</span>
                </div>
                <div class="guia-accordion-body">
                    <div class="guia-accordion-content">
                        <p><strong>👤 Username:</strong> ${modelo.username}</p>
                        ${modelo.edad ? `<p><strong>🎂 Edad:</strong> ${modelo.edad}</p>` : ''}
                        <p><strong>🌍 País/Ciudad:</strong> ${modelo.pais}</p>
                        <p><strong>💬 Idiomas:</strong> ${modelo.idiomas}</p>
                        <p><strong>📏 Altura:</strong> ${modelo.altura} | <strong>⚖️ Peso:</strong> ${modelo.peso}</p>
                        ${modelo.estudia ? `<p><strong>📚 Estudia:</strong> ${modelo.estudia}</p>` : ''}
                        ${modelo.mascotas ? `<p><strong>🐾 Mascotas:</strong> ${modelo.mascotas}</p>` : ''}
                        
                        <div class="info-highlight" style="margin: 15px 0;">
                            <strong>🎭 PERSONALIDAD & ESTILO</strong><br>
                            <strong>Energía:</strong> ${modelo.personalidad}<br>
                            <strong>Descripción:</strong> ${modelo.descripcion}
                        </div>
                        
                        <p><strong>🎨 Hobbies:</strong> ${modelo.hobbies}</p>
                        <p><strong>🎵 Música:</strong> ${modelo.musica}</p>
                        <p><strong>🍽️ Comida favorita:</strong> ${modelo.comida_favorita}</p>
                        ${modelo.no_le_gusta_comida ? `<p><strong>❌ No le gusta:</strong> ${modelo.no_le_gusta_comida}</p>` : ''}
                        ${modelo.tiempo_libre ? `<p><strong>🕒 Tiempo libre:</strong> ${modelo.tiempo_libre}</p>` : ''}
                        ${modelo.despertar ? `<p><strong>🌅 Al despertar:</strong> ${modelo.despertar}</p>` : ''}
                        
                        <div class="info-highlight" style="margin: 15px 0;">
                            <strong>💕 TIPO DE CHICO IDEAL</strong><br>
                            ${modelo.tipo_chico_ideal}<br>
                            <strong>❌ Cosas que la apagan:</strong> ${modelo.apaga}
                        </div>
                        
                        ${modelo.emojis_favoritos && modelo.emojis_favoritos !== '—' ? `<p><strong>😊 Emojis favoritos:</strong> ${modelo.emojis_favoritos}</p>` : ''}
                        ${modelo.expresiones_favoritas ? `<p><strong>😏 Expresiones favoritas:</strong> ${modelo.expresiones_favoritas}</p>` : ''}
                        
                        <div class="info-highlight" style="background: #fff3cd; border-left-color: #ffc107;">
                            <strong>💬 PALABRAS TÍPICAS:</strong><br>
                            ${modelo.palabras_tipicas ? modelo.palabras_tipicas.split('|').map(p => '• ' + p.trim()).join('<br>') : 'Consultar'}
                        </div>
                        
                        <div class="info-highlight" style="background: #f8d7da; border-left-color: #dc3545;">
                            <strong>🚫 NUNCA DECIR:</strong><br>
                            ${modelo.cosas_no_decir ? modelo.cosas_no_decir.split('|').map(p => '• ' + p.trim()).join('<br>') : 'Consultar'}
                        </div>
                        
                        ${modelo.intensidad ? `<p><strong>🔞 Intensidad:</strong> ${modelo.intensidad}</p>` : ''}
                        <p><strong>❌ Contenido que NUNCA hace:</strong> ${modelo.contenido_nunca}</p>
                        <p><strong>👥 Trabaja:</strong> ${modelo.trabaja_sola}</p>
                        <p><strong>🎥 ¿Hace customs?:</strong> ${modelo.hace_customs}</p>
                        <p><strong>📋 Ejemplos customs:</strong> ${modelo.ejemplos_customs}</p>
                        ${modelo.tiempo_entrega ? `<p><strong>⏰ Tiempo entrega:</strong> ${modelo.tiempo_entrega}</p>` : ''}
                        
                        ${modelo.outfits ? `<p><strong>👗 Outfits disponibles:</strong> ${modelo.outfits}</p>` : ''}
                        ${modelo.accesorios ? `<p><strong>🎁 Accesorios:</strong> ${modelo.accesorios}</p>` : ''}
                        ${modelo.disfraces ? `<p><strong>🎭 Disfraces:</strong> ${modelo.disfraces}</p>` : ''}
                        
                        <p><strong>🕒 Horarios:</strong> ${modelo.horarios}</p>
                        ${modelo.zona_horaria ? `<p><strong>🌐 Zona horaria:</strong> ${modelo.zona_horaria}</p>` : ''}
                        
                        <div class="info-highlight">
                            <strong>💰 PRECIOS MÍNIMOS:</strong><br>
                            • Mensajes: <span class="precio-minimo">${modelo.precio_mensaje}</span><br>
                            • Fotos: <span class="precio-minimo">${modelo.precio_foto}</span><br>
                            • Videos: <span class="precio-minimo">${modelo.precio_video}</span><br>
                            ${modelo.precio_custom_foto ? `• Custom Foto: <span class="precio-minimo">${modelo.precio_custom_foto}</span><br>` : ''}
                            ${modelo.precio_custom_video ? `• Custom Video: <span class="precio-minimo">${modelo.precio_custom_video}</span>` : ''}
                        </div>
                        
                        ${modelo.paises_visitados ? `<p><strong>✈️ Países visitados:</strong> ${modelo.paises_visitados}</p>` : ''}
                        ${modelo.paises_visitar ? `<p><strong>🗺️ Quiere visitar:</strong> ${modelo.paises_visitar}</p>` : ''}
                        ${modelo.signo ? `<p><strong>♈ Signo:</strong> ${modelo.signo}</p>` : ''}
                        
                        <div class="info-highlight" style="background: #d4edda; border-left-color: #28a745;">
                            ${modelo.notas}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    section.innerHTML = html;
}

// Cargar sección de normas
function loadNormasSection() {
    const section = document.getElementById('section-normas');
    let html = '<h2 style="margin-top: 0;">�️ NORMATIVA BRAVE GIRLS</h2>';
    html += '<p style="font-style: italic; color: #666; margin-bottom: 20px;">Documento oficial interno – Lectura obligatoria</p>';
    
    const normas = [
        { titulo: '🔐 Confidencialidad y Seguridad', items: NORMAS_AGENCIA.confidencialidad },
        { titulo: '💸 Gestión de Pagos', items: NORMAS_AGENCIA.pagos },
        { titulo: '⏰ Horario y Responsabilidad', items: NORMAS_AGENCIA.horario },
        { titulo: '🧠 Conducta Profesional', items: NORMAS_AGENCIA.conducta },
        { titulo: '🛠️ Uso de Herramientas', items: NORMAS_AGENCIA.herramientas },
        { titulo: '⚠️ Penalizaciones', items: NORMAS_AGENCIA.penalizaciones }
    ];
    
    normas.forEach(categoria => {
        html += `
            <div class="guia-accordion">
                <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                    <h3>${categoria.titulo}</h3>
                    <span class="guia-accordion-icon">▼</span>
                </div>
                <div class="guia-accordion-body">
                    <div class="guia-accordion-content">
                        <ul>
                            ${categoria.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });
    
    section.innerHTML = html;
}

// Cargar sección de tareas
function loadTareasSection() {
    const section = document.getElementById('section-tareas');
    let html = '<h2 style="margin-top: 0;">✅ TAREAS DIARIAS OBLIGATORIAS</h2>';
    html += '<p style="font-style: italic; color: #666; margin-bottom: 20px;">Ordenadas por prioridad real</p>';
    
    TAREAS_DIARIAS.forEach(grupo => {
        html += `
            <div class="guia-accordion">
                <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                    <h3>${grupo.titulo}</h3>
                    <span class="guia-accordion-icon">▼</span>
                </div>
                <div class="guia-accordion-body">
                    <div class="guia-accordion-content">
                        <ul>
                            ${grupo.tareas.map(tarea => `<li>${tarea}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });
    
    section.innerHTML = html;
}

// Cargar sección de precios
function loadPreciosSection() {
    const section = document.getElementById('section-precios');
    let html = '<h2 style="margin-top: 0;">💰 PRECIOS & TARIFAS</h2>';
    html += '<p style="font-style: italic; color: #666; margin-bottom: 20px;">Guía oficial para ventas – Obligatorio respetar</p>';
    
    // Orden de prioridad
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.orden_prioridad.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <ul>
                        ${PRECIOS_MINIMOS.orden_prioridad.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <div class="info-highlight" style="background: #f8d7da; border-left-color: #dc3545;">
                        <strong>${PRECIOS_MINIMOS.orden_prioridad.nota}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Customs
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.customs.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <p><em>${PRECIOS_MINIMOS.customs.descripcion}</em></p>
                    <div class="info-highlight" style="background: #fff3cd; border-left-color: #ffc107;">
                        <strong>🔺 Contenido CARO (precio más alto):</strong><br>
                        ${PRECIOS_MINIMOS.customs.contenido_caro}
                    </div>
                    <div class="info-highlight">
                        <strong>✔️ Regla general:</strong><br>
                        ${PRECIOS_MINIMOS.customs.regla}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Videollamadas
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.videollamadas.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <p><em>${PRECIOS_MINIMOS.videollamadas.descripcion}</em></p>
                    <div class="info-highlight">
                        <strong>💵 Precio inicial:</strong> <span class="precio-minimo">${PRECIOS_MINIMOS.videollamadas.precio_inicial}</span><br>
                        <strong>🔻 Negociable:</strong> <span class="precio-minimo">${PRECIOS_MINIMOS.videollamadas.negociable}</span><br>
                        <strong>❌ Nunca menos de:</strong> <span class="precio-minimo">${PRECIOS_MINIMOS.videollamadas.nunca_menos}</span><br>
                        <strong>➕ Extras:</strong> ${PRECIOS_MINIMOS.videollamadas.extras}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Bóveda
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.boveda.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <p><em>${PRECIOS_MINIMOS.boveda.descripcion}</em></p>
                    <ul>
                        ${PRECIOS_MINIMOS.boveda.reglas.map(regla => `<li>${regla}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Bragas
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.bragas.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <p><em>${PRECIOS_MINIMOS.bragas.descripcion}</em></p>
                    <div class="info-highlight">
                        <strong>💵 Precio inicial:</strong> <span class="precio-minimo">${PRECIOS_MINIMOS.bragas.precio_inicial}</span><br>
                        <strong>➕ Extras:</strong> ${PRECIOS_MINIMOS.bragas.extras}<br>
                        <strong>${PRECIOS_MINIMOS.bragas.minimo}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Recordatorio
    html += `
        <div class="guia-accordion">
            <div class="guia-accordion-header" onclick="toggleAccordion(this)">
                <h3>${PRECIOS_MINIMOS.recordatorio.titulo}</h3>
                <span class="guia-accordion-icon">▼</span>
            </div>
            <div class="guia-accordion-body">
                <div class="guia-accordion-content">
                    <div class="info-highlight" style="background: #f8d7da; border-left-color: #dc3545;">
                        <strong>Ningún chatter debe:</strong><br>
                        ${PRECIOS_MINIMOS.recordatorio.prohibido.map(item => `${item}<br>`).join('')}
                    </div>
                    <p style="margin-top: 15px;"><strong>${PRECIOS_MINIMOS.recordatorio.nota}</strong></p>
                </div>
            </div>
        </div>
    `;
    
    section.innerHTML = html;
}

// Toggle acordeón
function toggleAccordion(header) {
    const accordion = header.closest('.guia-accordion');
    accordion.classList.toggle('active');
}

// Búsqueda en guías mejorada
function searchGuias(query) {
    query = query.toLowerCase().trim();
    const accordions = document.querySelectorAll('.guia-accordion');
    let resultCount = 0;
    
    accordions.forEach(accordion => {
        const content = accordion.textContent.toLowerCase();
        const searchContent = accordion.getAttribute('data-search-content') || '';
        const allContent = content + ' ' + searchContent.toLowerCase();
        
        if (!query) {
            // Sin búsqueda, mostrar todo cerrado
            accordion.style.display = 'block';
            accordion.classList.remove('active');
            accordion.classList.remove('search-highlight');
        } else if (allContent.includes(query)) {
            // Coincide con la búsqueda
            accordion.style.display = 'block';
            accordion.classList.add('active'); // Auto-expandir resultados
            accordion.classList.add('search-highlight');
            resultCount++;
            
            // Resaltar texto encontrado
            highlightSearchText(accordion, query);
        } else {
            // No coincide
            accordion.style.display = 'none';
            accordion.classList.remove('search-highlight');
        }
    });
    
    // Mostrar contador de resultados
    updateSearchCounter(resultCount, query);
}

// Resaltar texto en resultados
function highlightSearchText(accordion, query) {
    const content = accordion.querySelector('.guia-accordion-content');
    if (!content) return;
    
    // Remover resaltados anteriores
    content.querySelectorAll('.search-match').forEach(span => {
        span.replaceWith(span.textContent);
    });
    
    if (!query) return;
    
    // Normalizar el contenido
    content.normalize();
}

// Actualizar contador de resultados
function updateSearchCounter(count, query) {
    let counter = document.querySelector('.search-counter');
    
    if (!counter) {
        const searchBox = document.querySelector('.guias-search');
        counter = document.createElement('div');
        counter.className = 'search-counter';
        searchBox.appendChild(counter);
    }
    
    if (query) {
        counter.textContent = `${count} resultado${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
        counter.style.display = 'block';
    } else {
        counter.style.display = 'none';
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuiasPanel);
} else {
    initGuiasPanel();
}
