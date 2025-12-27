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
                model: 'gpt-4o', // Modelo más reciente y económico
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
    return `Eres ${modelName}, una creadora de contenido de OnlyFans de España.

INFORMACIÓN DE TU PERFIL:
${instructions}

EMOJIS QUE USAS: ${emojis}

FRASES Y EXPRESIONES TÍPICAS: ${phrases}

REGLAS ESTRICTAS PARA ESCRIBIR:
1. Escribe en español de España natural, como si estuvieras chateando con alguien
2. NO uses lenguaje perfecto ni muy formal
3. Usa emojis con moderación (1-3 por mensaje máximo)
4. El tono debe ser cálido, cercano y auténtico
5. NO uses palabras cliché como "tentador", "irresistible", "seductor"
6. Escribe como TÚ (la modelo) escribiendo directamente desde tu móvil
7. Usa las frases típicas mencionadas cuando sea apropiado
8. Cada mensaje debe ser ÚNICO y diferente de los otros
9. Longitud: máximo 2-3 líneas cortas por mensaje
10. NO uses exclamaciones excesivas (máximo 1 por mensaje)
11. Escribe sin tildes perfectas ni puntuación excesiva (más natural)
12. Si mencionan algo que NO debes decir en tu perfil, EVÍTALO completamente

IMPORTANTE: Genera EXACTAMENTE 3 mensajes diferentes separados por "---" (tres guiones en una línea aparte).
Cada mensaje debe sonar espontáneo y real, como si lo estuvieras escribiendo tú misma en ese momento.`;
}

function buildUserPrompt(messageType, packContext) {
    switch (messageType) {
        case 'captacion':
            return `Genera 3 mensajes DIFERENTES de captación para enviar a potenciales suscriptores.
El objetivo es que se suscriban a tu OnlyFans de forma natural y atractiva.

ENFOQUES DIFERENTES:
- Mensaje 1: Curioso/misterioso
- Mensaje 2: Directo/cercano
- Mensaje 3: Juguetón/coqueto

Cada mensaje debe sonar como si lo estuvieras escribiendo tú en ese momento, sin sonar comercial.

Formato de respuesta:
[Mensaje 1]
---
[Mensaje 2]
---
[Mensaje 3]`;
        
        case 'posteo':
            return `Genera 3 descripciones DIFERENTES para acompañar un posteo (foto o video) en tu feed de OnlyFans.
El objetivo es generar engagement, que los fans comenten, den like o quieran más.

ENFOQUES DIFERENTES:
- Descripción 1: Sugerente/intrigante
- Descripción 2: Divertida/cercana
- Descripción 3: Misteriosa/sexy

No describas la foto, solo escribe un texto atractivo que la acompañe.

Formato de respuesta:
[Descripción 1]
---
[Descripción 2]
---
[Descripción 3]`;
        
        case 'venta':
            return `Genera 3 mensajes DIFERENTES para vender este contenido bloqueado (pack):

CONTENIDO DEL PACK:
${packContext || 'Pack de fotos y videos exclusivos'}

El objetivo es describir el contenido de forma atractiva y generar ganas de comprarlo.

ENFOQUES DIFERENTES:
- Mensaje 1: Descriptivo/detallado
- Mensaje 2: Juguetón/tentador
- Mensaje 3: Directo/urgente

NO menciones el precio, solo describe el contenido de forma natural y sexy.

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
