// api/ai/generate-messages.js - OpenAI Integration

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { modelName, instructions, emojis, phrases, messageType, context } = req.body;
        
        // Validar datos requeridos
        if (!modelName || !messageType) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        
        // Obtener API Key de OpenAI desde variables de entorno de Vercel
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API Key no configurada. Agrégala en Vercel Environment Variables' });
        }
        
        // Construir el prompt según el tipo de mensaje
        const systemPrompt = buildSystemPrompt(modelName, instructions, emojis, phrases);
        const userPrompt = buildUserPrompt(messageType, context);
        
        console.log('🤖 Llamando a OpenAI...');
        
        // Llamar a OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Modelo más económico (10x más barato que gpt-4o)
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.9, // Alta creatividad para mensajes únicos
                max_tokens: 800,
                n: 1 // Solo 1 respuesta, pero con 3 mensajes dentro
            })
        });
        
        if (!openaiResponse.ok) {
            const error = await openaiResponse.json();
            console.error('❌ Error de OpenAI:', error);
            throw new Error(error.error?.message || 'Error al llamar a OpenAI');
        }
        
        const data = await openaiResponse.json();
        const generatedText = data.choices[0].message.content;
        
        // Parsear los 3 mensajes (separados por "---")
        const messages = generatedText
            .split('---')
            .map(msg => msg.trim())
            .filter(msg => msg.length > 0);
        
        console.log('✅ Mensajes generados:', messages.length);
        
        return res.status(200).json({
            success: true,
            messages: messages,
            model: 'gpt-4o',
            tokens: data.usage.total_tokens
        });
        
    } catch (error) {
        console.error('❌ Error en generate-messages:', error);
        return res.status(500).json({
            error: error.message || 'Error al generar mensajes'
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUIR PROMPTS
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(modelName, instructions, emojis, phrases) {
    // Detectar variante regional
    let regionalRules = '';
    const modelLower = modelName.toLowerCase();
    
    if (modelLower.includes('carmen') || modelLower.includes('carmencitax')) {
        regionalRules = `
VARIANTE REGIONAL: Andaluza (Córdoba)
- Usa acento andaluz suave y natural, SIN exageraciones
- NO uses acortamientos extremos como "to" por "todo"
- Usa expresiones naturales de Córdoba: "illo", "tio", "ostras", "jolin"
- Mantén la esencia andaluza pero legible y clara`;
    } else if (modelLower.includes('vicky') || modelLower.includes('lexi')) {
        regionalRules = `
VARIANTE REGIONAL: Argentina
- Usa "vos" en lugar de "tú"
- Conjuga verbos en argentino: "tenés", "querés", "vení", "mirá"
- Expresiones argentinas: "che", "boludo/a", "re", "acá", "mal", "posta"
- "Mina" en vez de "chica", "chabón" en vez de "chico"`;
    } else {
        regionalRules = `
VARIANTE REGIONAL: Madrid, España
- Usa "tú" y vosotros
- Expresiones madrileñas: "tío/tía", "guay", "molar", "flipar", "ostras"
- Nada latino (no "subs", "gustao", "videito")`;
    }

    return `Eres ${modelName}, una creadora de contenido de OnlyFans.

INFORMACIÓN DE TU PERFIL:
${instructions}

EMOJIS QUE USAS: ${emojis}

FRASES Y EXPRESIONES TÍPICAS: ${phrases}

${regionalRules}

REGLAS DE ESCRITURA ESTRICTAS:
1. NUNCA empieces frases con mayúscula (todo en minúsculas)
2. NO uses ¿ al inicio de preguntas, solo ? al final
3. NO uses ¡ al inicio, solo ! al final si es necesario
4. NO uses tildes/acentos (escribe "que" en vez de "qué", "mas" en vez de "más")
5. Pocas comas, escribe fluido como en WhatsApp
6. Alarga vocales para naturalidad: "ayyyy", "jajaja", "holaaaa", "asiii"
7. Usa emoticonos apropiados (1-3 por mensaje máximo)
8. Acorta palabras naturalmente: "suscrips" (suscriptores), "profes" (profesores)
9. Tono sensual/juguetón/cercano según contexto
10. Máximo 2-3 líneas cortas por mensaje
11. NO uses palabras cliché: "tentador", "irresistible", "seductor", "provocativo"
12. Escribe como mensaje real de móvil, NO perfecto
13. Si hay cosas que NO debes mencionar en tu perfil, EVÍTALAS completamente

EJEMPLOS DEL ESTILO:
✅ "holaa guapo 🫶 me has parecido super majo, te apetece conocerme mejor?"
✅ "ayy que calor tengo hoy jajaj me voy a sacar esta camiseta 😏"
✅ "ostras que ganas tenia de subir esto, espero que te guste 🙈"

❌ "¡Hola, guapo! ¿Qué tal estás?" (muy formal, con mayúsculas, con tildes)
❌ "Tengo contenido muy tentador para ti" (cliché, muy comercial)

IMPORTANTE: Genera EXACTAMENTE 3 mensajes diferentes separados por "---" (tres guiones en una línea aparte).
Cada mensaje debe ser único, espontáneo y sonar como si lo escribieras desde tu móvil en ese momento.`;
}

function buildUserPrompt(messageType, context) {
    switch (messageType) {
        case 'masivo':
            const timeOfDay = context?.timeOfDay || 'tarde';
            const familiarity = context?.familiarity || 'regular';
            
            let timeContext = '';
            if (timeOfDay === 'mañana') {
                timeContext = 'Es por la mañana (6:00-12:00). Contextos posibles: despertando, desayunando, empezando el dia, saliendo de casa, camino al trabajo/gym';
            } else if (timeOfDay === 'tarde') {
                timeContext = 'Es por la tarde (12:00-20:00). Contextos posibles: comiendo, en el trabajo, volviendo a casa, en el gym, descansando';
            } else {
                timeContext = 'Es por la noche (20:00-6:00). Contextos posibles: cenando, saliendo de la ducha, en la cama, aburrida en casa, preparandose para dormir';
            }
            
            let familiarityContext = '';
            if (familiarity === 'nuevo') {
                familiarityContext = `FAMILIARIDAD: Suscriptor NUEVO/DESCONOCIDO
- NO uses apodos muy íntimos ("bebe", "amor")
- Usa "hola", "que tal", "guapo" (más formal)
- NO menciones cosas muy personales o íntimas
- Tono amigable pero respetuoso
- NO digas "no puedo dejar de pensar en ti" ni frases muy intensas
- Evita preguntas demasiado atrevidas`;
            } else if (familiarity === 'regular') {
                familiarityContext = `FAMILIARIDAD: Suscriptor REGULAR
- Puedes usar apodos cariñosos: "guapo", "amorr", "cariño"
- Tono cercano y juguetón
- Preguntas ligeras y coquetas
- Menciona cosas casuales (ropa, actividades)`;
            } else {
                familiarityContext = `FAMILIARIDAD: Suscriptor FRECUENTE/HABITUAL
- Usa apodos íntimos: "bebe", "amor", "amorr"
- Tono muy cercano y cómplice
- Puedes ser más atrevida y directa
- Menciona cosas más personales o picantes`;
            }
            
            return `Genera 3 mensajes masivos DIFERENTES para enviar a tus suscriptores de OnlyFans.

OBJETIVO: Generar interaccion y respuestas. Son mensajes 1 a 1, personales, cercanos.

MOMENTO DEL DIA: ${timeContext}

${familiarityContext}

Los mensajes deben:
- Ser circunstanciales al momento del dia (menciona que estas haciendo AHORA)
- Generar curiosidad o pregunta que invite a responder
- Ser coquetos, juguetones, cercanos (ajustado al nivel de familiaridad)
- Incluir emojis naturales
- Ser conversacionales, como si le escribieras a un amigo/conocido

IMPORTANTE: Adapta el nivel de intimidad al tipo de suscriptor. Con nuevos, se MAS CAUTELOSA.

EJEMPLOS DEL ESTILO (ajusta según familiaridad):
PARA NUEVOS/REGULARES:
- "hola guapo, que tal tu dia?? yo aqui en casa aburrida jaja"
- "oye te puedo hacer una pregunta?? es rapida jaja"
- "que tal el viernes?? yo recien salgo del gym y estoy cansadisima"

PARA FRECUENTES:
- "bebee que tal tu dia??? escribeme que te cuento que braguitas me puse hoy"
- "bebe recien salgo de la ducha... me visto o que hacemos?"
- "amorr te puedo hacer una pregunta??"

IMPORTANTE: Cada mensaje debe empezar en minusculas, sin tildes, sin signos de apertura.

Formato de respuesta:
[Mensaje 1]
---
[Mensaje 2]
---
[Mensaje 3]`;
        
        case 'posteo':
            const photoDescription = context || 'foto sensual';
            
            return `Genera 3 descripciones DIFERENTES para acompañar este posteo en tu feed de OnlyFans:

FOTO/VIDEO: ${photoDescription}

OBJETIVO: Generar engagement (likes, comments, que quieran mas).

Las descripciones deben:
- Complementar la foto sin describir lo obvio
- Generar curiosidad, deseo o juego
- Ser sugerentes pero no explicitas
- Incluir emojis naturales
- Ser cortas (1-2 lineas maximo)

ENFOQUES:
- Descripcion 1: Sugerente/intrigante
- Descripcion 2: Divertida/cercana
- Descripcion 3: Misteriosa/coqueta

IMPORTANTE: Cada descripcion en minusculas, sin tildes, sin signos de apertura.

Formato de respuesta:
[Descripcion 1]
---
[Descripcion 2]
---
[Descripcion 3]`;
        
        case 'venta':
            const packContent = context || 'Pack de fotos y videos exclusivos';
            
            return `Genera 3 mensajes DIFERENTES para vender este contenido bloqueado (pack):

CONTENIDO DEL PACK:
${packContent}

OBJETIVO: Describir el contenido de forma atractiva y generar ganas de comprarlo.

Los mensajes deben:
- Describir que contiene el pack de forma sexy
- Generar deseo y urgencia
- Ser naturales, no sonar comerciales
- Incluir emojis apropiados
- NO mencionar precio

ENFOQUES:
- Mensaje 1: Descriptivo/detallado (que contiene)
- Mensaje 2: Jugueton/tentador (genera deseo)
- Mensaje 3: Directo/urgente (cierra venta)

IMPORTANTE: Cada mensaje en minusculas, sin tildes, sin signos de apertura.

Formato de respuesta:
[Mensaje 1]
---
[Mensaje 2]
---
[Mensaje 3]`;
        
        default:
            return 'Genera 3 mensajes diferentes.';
    }
}
