// config.js - Configuración central del sistema
// IMPORTANTE: En producción, este archivo debe estar protegido y las credenciales
// deben manejarse en el backend, no en el frontend.

window.CONFIG = {
    // API Key de OnlyMonster
    onlyMonsterApiKey: 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5',
    
    // URL base de la API de OnlyMonster (CORRECTA)
    // USANDO BACKEND PROXY EN PRODUCCIÓN para evitar CORS
    onlyMonsterApiUrl: 'https://bravegirlsagency-api.vercel.app/api',
    
    // OpenAI Configuration (para generador de mensajes IA)
    // IMPORTANTE: La API Key debe estar en el servidor (Vercel Environment Variables)
    // NO expongas tu API Key real aquí en producción
    openai: {
        enabled: true,
        model: 'gpt-4o' // Modelo más reciente y económico
    },
    
    // Google Sheets Configuration
    googleSheets: {
        apiKey: 'AIzaSyAY6wmWOR2sl7-JNsS3WPazXYFzLNm7420',
        spreadsheetId: '1sO09-I21ileGD7SoIAsgnCOhc-mzzKcCa6pOIFVwTgY',
        chatters: {
            'chatter1': { name: 'Yaye Sanchez', gid: '145015741' },
            'chatter2': { name: 'Diego Salcedo', gid: '712917426' },
            'chatter3': { name: 'Alfonso Silva', gid: '1408176673' },
            'chatter4': { name: 'Nicolas Viganotti', gid: '1989454215' },
            'chatter5': { name: 'Kari Narvaez', gid: '1023806221' },
            'chatter6': { name: 'Emely', gid: '1931030491' }
        }
    },
    
    // Usuarios del sistema con IDs reales de OnlyMonster
    users: {
        // ═══════════════════════════════════════════════════════════
        // MODELOS - Con IDs reales de OnlyMonster
        // ═══════════════════════════════════════════════════════════
        models: [
            {
                id: 'model1',
                username: 'carmen',
                password: 'carmen2025',
                name: '✨Carmen✨ 𝙑𝙄𝙋',
                type: 'model',
                onlyFansUsername: '@carmencitax',
                onlyMonsterId: '85825874' // Platform Account ID correcto
            },
            {
                id: 'model2',
                username: 'lucy',
                password: 'lucy2025',
                name: 'Lucy García 🖤',
                type: 'model',
                onlyFansUsername: '@lucygarcia',
                onlyMonsterId: '314027187' // Platform Account ID correcto
            },
            {
                id: 'model3',
                username: 'bella',
                password: 'bella2025',
                name: '✨Bella Rey✨',
                type: 'model',
                onlyFansUsername: '@bellarey1',
                onlyMonsterId: '296183678' // Platform Account ID correcto
            },
            {
                id: 'model4',
                username: 'lexi',
                password: 'lexi2025',
                name: 'Lexiflix 😇',
                type: 'model',
                onlyFansUsername: '@lexiflix',
                onlyMonsterId: '326911669' // Platform Account ID correcto
            },
            {
                id: 'model5',
                username: 'vicky',
                password: 'vicky2025',
                name: 'Vicky Luna 🌙',
                type: 'model',
                onlyFansUsername: '@xvickyluna',
                onlyMonsterId: '436482929' // Platform Account ID correcto
            },
            {
                id: 'model6',
                username: 'vanessa',
                password: 'vanessa2025',
                name: 'Vanessa 🌸',
                type: 'model',
                onlyFansUsername: '@vanessa',
                onlyMonsterId: 'PENDING' // Actualizar con ID real de OnlyMonster
            }
        ],
        
        // ═══════════════════════════════════════════════════════════
        // CHATTERS - Con IDs reales de OnlyMonster
        // ═══════════════════════════════════════════════════════════
        chatters: [
            {
                id: 'chatter1',
                username: 'yaye',
                password: 'yaye2025',
                name: 'Yaye Sanchez',
                type: 'chatter',
                onlyMonsterId: '125226',
                assignedModels: ['model2', 'model4'] // Lucy, Lexi
            },
            {
                id: 'chatter2',
                username: 'diego',
                password: 'diego2025',
                name: 'Diego Salcedo',
                type: 'chatter',
                onlyMonsterId: '121434',
                assignedModels: ['model2', 'model4'] // Lucy, Lexi
            },
            {
                id: 'chatter3',
                username: 'alfonso',
                password: 'alfonso2025',
                name: 'Alfonso Silva',
                type: 'chatter',
                onlyMonsterId: '66986',
                assignedModels: ['model1', 'model3'] // Carmen, Bellarey
            },
            {
                id: 'chatter4',
                username: 'nico',
                password: 'nico2025',
                name: 'Nicolas Viganotti',
                type: 'chatter',
                onlyMonsterId: '25140',
                assignedModels: ['model1', 'model3'] // Carmen, Bellarey
            },
            {
                id: 'chatter5',
                username: 'kari',
                password: 'kari2025',
                name: 'Kari Narvaez',
                type: 'chatter',
                onlyMonsterId: '124700',
                assignedModels: ['model1', 'model3', 'model5'] // Carmen, Bellarey, Vicky
            },
            {
                id: 'chatter6',
                username: 'emely',
                password: 'emely2025',
                name: 'Emely',
                type: 'chatter',
                onlyMonsterId: '139826',
                assignedModels: ['model5'] // Vicky Luna por defecto
            }
        ]
    },
    
    // Configuración de comisiones
    commissions: {
        chatterPercentage: 10, // % de comisión para chatters
        agencyPercentage: 20    // % de comisión de la agencia
    }
};

// INSTRUCCIONES PARA AGREGAR NUEVOS USUARIOS:

/*
========================
AGREGAR NUEVA MODELO:
========================

1. Copia y pega este bloque en el array 'models' arriba:

{
    id: 'model3',                          // ID único (incrementa el número)
    username: 'nombreusuario',             // Usuario para login
    password: 'contraseña_segura',         // Contraseña (¡cambiar en producción!)
    name: 'Nombre Completo',               // Nombre real de la modelo
    type: 'model',                         // NO CAMBIAR
    onlyFansUsername: '@username'          // Su username de OnlyFans
}

2. Guarda el archivo.

========================
AGREGAR NUEVO CHATTER:
========================

1. Copia y pega este bloque en el array 'chatters' arriba:

{
    id: 'chatter3',                        // ID único (incrementa el número)
    username: 'chatter3',                  // Usuario para login
    password: 'contraseña_segura',         // Contraseña (¡cambiar en producción!)
    name: 'Nombre Completo',               // Nombre real del chatter
    type: 'chatter',                       // NO CAMBIAR
    assignedModels: ['model1', 'model2']   // IDs de las modelos que gestiona
}

2. Guarda el archivo.

========================
IMPORTANTE - SEGURIDAD:
========================

⚠️ ESTE SISTEMA ES PARA DEMOSTRACIÓN/DESARROLLO
⚠️ EN PRODUCCIÓN DEBES:

1. Mover toda la autenticación a un backend seguro (Node.js, PHP, etc.)
2. Usar hash para las contraseñas (bcrypt, argon2)
3. Implementar JWT tokens o sesiones del lado del servidor
4. Guardar las API keys solo en el servidor, NUNCA en el frontend
5. Usar HTTPS siempre
6. Implementar rate limiting y protección contra brute force
7. Usar variables de entorno para configuración sensible

========================
CONFIGURAR API KEY:
========================

1. Inicia sesión en tu cuenta de OnlyMonster
2. Ve a Settings > API Keys
3. Genera una nueva API Key
4. Reemplaza 'TU_API_KEY_AQUI' arriba con tu key real
5. Configura los permisos correctos en OnlyMonster:
   - Read access a statistics
   - Read access a earnings
   - Read access a messages metrics

*/

// Función helper para verificar configuración
window.CONFIG.isConfigured = function() {
    return this.onlyMonsterApiKey !== 'TU_API_KEY_AQUI';
};

// Función helper para obtener usuario por ID
window.CONFIG.getUserById = function(userId, type) {
    const userArray = type === 'model' ? this.users.models : this.users.chatters;
    return userArray.find(u => u.id === userId);
};

// Función helper para obtener modelos de un chatter
window.CONFIG.getChatterModels = function(chatterId) {
    const chatter = this.users.chatters.find(c => c.id === chatterId);
    if (!chatter) return [];
    
    return chatter.assignedModels.map(modelId => {
        return this.users.models.find(m => m.id === modelId);
    }).filter(m => m !== undefined);
};

// Advertencia si no está configurado
if (!window.CONFIG.isConfigured()) {
    console.warn('⚠️ ADVERTENCIA: API Key de OnlyMonster no configurada. Por favor actualiza config.js');
}
