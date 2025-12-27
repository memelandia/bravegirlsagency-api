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
        const { modelName, instructions, emojis, phrases, messageType, packContext } = req.body;
        
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
        const userPrompt = buildUserPrompt(messageType, packContext);
        
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

function buildUserPrompt(messageType, packContext) {
    switch (messageType) {
        case 'captacion':
            return `Genera 3 mensajes DIFERENTES de captacion para enviar a potenciales suscriptores.
El objetivo es que se suscriban a tu OnlyFans de forma natural y atractiva.

IMPORTANTE: Cada mensaje debe empezar en minusculas, sin tildes, sin signos de apertura.

ENFOQUES DIFERENTES:
- Mensaje 1: Curioso/misterioso (genera intriga)
- Mensaje 2: Directo/cercano (conexion personal)
- Mensaje 3: Jugueton/coqueto (sensual pero sutil)

Recuerda: todo en minusculas, sin tildes, alarga vocales para naturalidad, usa emoticonos.

Formato de respuesta:
[Mensaje 1]
---
[Mensaje 2]
---
[Mensaje 3]`;
        
        case 'posteo':
            return `Genera 3 descripciones DIFERENTES para acompañar un posteo (foto o video) en tu feed de OnlyFans.
El objetivo es generar engagement, que los fans comenten, den like o quieran mas.

IMPORTANTE: Cada descripcion debe empezar en minusculas, sin tildes, sin signos de apertura.

ENFOQUES DIFERENTES:
- Descripcion 1: Sugerente/intrigante (genera curiosidad)
- Descripcion 2: Divertida/cercana (buen rollo)
- Descripcion 3: Misteriosa/sexy (juego y coqueteo)

NO describas la foto, solo escribe un texto atractivo que la acompañe.
Recuerda: todo en minusculas, sin tildes, alarga vocales, usa emoticonos.

Formato de respuesta:
[Descripcion 1]
---
[Descripcion 2]
---
[Descripcion 3]`;
        
        case 'venta':
            return `Genera 3 mensajes DIFERENTES para vender este contenido bloqueado (pack):

CONTENIDO DEL PACK:
${packContext || 'Pack de fotos y videos exclusivos'}

El objetivo es describir el contenido de forma atractiva y generar ganas de comprarlo.

IMPORTANTE: Cada mensaje debe empezar en minusculas, sin tildes, sin signos de apertura.

ENFOQUES DIFERENTES:
- Mensaje 1: Descriptivo/detallado (explica que hay)
- Mensaje 2: Jugueton/tentador (genera deseo)
- Mensaje 3: Directo/urgente (cierra la venta)

NO menciones el precio, solo describe el contenido de forma natural y sexy.
Recuerda: todo en minusculas, sin tildes, alarga vocales, usa emoticonos.

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
