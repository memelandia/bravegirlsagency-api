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
            'chatter3': { name: 'Alfonso Silva', gid: '1408176673' },
            'chatter4': { name: 'Nicolas Viganotti', gid: '1989454215' },
            'chatter5': { name: 'Kari Narvaez', gid: '1023806221' },
            'chatter7': { name: 'Carlo', gid: '1922350290' },
            'chatter8': { name: 'Leo', gid: '1346980441' },
            'chatter9': { name: 'Genesys', gid: '524118032' }
        }
    },
    
    // Marketing Pipeline API (Google Apps Script)
    marketingApi: {
        url: 'https://script.google.com/macros/s/AKfycbzuT0PNN1l52QcuHgPdGGezvrSh1FzGOo3bR1gxZzuw9-R1z8aM1dvtyiBJQ8bP37XO9A/exec',
        key: 'BG-Franco2025-Pipeline'
    },

    // Mensaje de agencia para dashboards de modelos (dejar vacío para ocultar)
    modelDashboardMessage: '¡Buen trabajo esta semana! 🔥',

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
                slug: 'carmencitax',
                dashboardPassword: 'carmen123',
                name: '✨Carmen✨ 𝙑𝙄𝙋',
                realName: 'Carmen',
                type: 'model',
                onlyFansUsername: '@carmencitax',
                onlyMonsterId: '85825874', // Platform Account ID correcto
                driveKey: 'CARMEN',
                instagramHandle: '@carmencitax',
                monthlyGoal: 3500, // Meta mensual personalizada en USD (null = auto: mes pasado + 15%)
                chatters: ['Genesys', 'Yaye', 'Camila'],
                teamLeader: 'Yaye'
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
                slug: 'lexiflix',
                dashboardPassword: 'lexi123',
                name: 'Lexiflix 😇',
                realName: 'Camila',
                type: 'model',
                onlyFansUsername: '@lexiflix',
                onlyMonsterId: '326911669', // Platform Account ID correcto
                driveKey: 'LEXI',
                instagramHandle: '@lexiflix',
                monthlyGoal: 3000, // Meta mensual personalizada en USD (null = auto: mes pasado + 15%)
                chatters: ['Genesys', 'Yaye', 'Camila'],
                teamLeader: 'Yaye'
            },
            {
                id: 'model5',
                username: 'vicky',
                password: 'vicky2025',
                slug: 'xvickyluna',
                dashboardPassword: 'vicky123',
                name: 'Vicky Luna 🌙',
                realName: 'Malena',
                type: 'model',
                onlyFansUsername: '@xvickyluna',
                onlyMonsterId: '436482929', // Platform Account ID correcto
                driveKey: 'VICKY',
                instagramHandle: '@xvickyluna',
                monthlyGoal: 13000, // Meta mensual personalizada en USD (null = auto: mes pasado + 15%)
                chatters: ['Alfonso', 'Nico', 'Kari'],
                teamLeader: 'Kari'
            },
            {
                id: 'model6',
                username: 'lily',
                password: 'lily2025',
                slug: 'lilymontero',
                dashboardPassword: 'lily123',
                name: 'Lily Montero 🌸',
                realName: 'Cata',
                type: 'model',
                onlyFansUsername: '@lilymontero',
                onlyMonsterId: 'PENDING',
                driveKey: 'LILY',
                instagramHandle: '@lilymontero',
                monthlyGoal: 5000, // Meta mensual personalizada en USD (null = auto: mes pasado + 15%)
                chatters: ['Alfonso', 'Nico', 'Kari'],
                teamLeader: 'Kari'
            },
            {
                id: 'model7',
                username: 'ariana',
                password: 'ariana2025',
                slug: 'arianacruzz',
                dashboardPassword: 'ariana123',
                name: 'Ariana Cruz 💫',
                realName: 'Ailen',
                type: 'model',
                onlyFansUsername: '@arianacruzz',
                onlyMonsterId: 'PENDING',
                driveKey: 'ARIANA',
                instagramHandle: '@arianacruzz',
                monthlyGoal: null, // Meta mensual personalizada en USD (null = auto: mes pasado + 15%)
                chatters: ['Leo'],
                teamLeader: 'Leo'
            },
            {
                id: 'model8',
                username: 'katierose',
                password: 'katie2025',
                slug: 'xxkatierose',
                dashboardPassword: 'katie123',
                name: 'KatieRose 🌹',
                realName: 'Malena',
                type: 'model',
                onlyFansUsername: '@xxkatierose',
                onlyMonsterId: '62052',
                driveKey: 'KATIEROSE',
                instagramHandle: '',
                monthlyGoal: 3000,
                chatters: ['Genesys', 'Yaye', 'Camila'],
                teamLeader: 'Yaye'
            },
            {
                id: 'model9',
                username: 'lilyjane',
                password: 'lily2025',
                slug: 'lilyjane',
                dashboardPassword: 'lily123',
                name: 'LilyJane 🌼',
                realName: 'Cata',
                type: 'model',
                onlyFansUsername: '@lilyjane',
                onlyMonsterId: '61572',
                driveKey: 'LILYJANE',
                instagramHandle: '',
                monthlyGoal: 750,
                chatters: ['Alfonso', 'Nico', 'Kari'],
                teamLeader: 'Kari'
            },
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
                id: 'chatter7',
                username: 'carlo',
                password: 'carlo2025',
                name: 'Carlo',
                type: 'chatter',
                onlyMonsterId: 'PENDING',
                assignedModels: [] // Configurar según modelos asignados
            },
            {
                id: 'chatter8',
                username: 'leo',
                password: 'leo2025',
                name: 'Leo',
                type: 'chatter',
                onlyMonsterId: '164901',
                assignedModels: ['model1', 'model2', 'model3', 'model4', 'model5'] // Cubrefrancos - todas las cuentas
            },
            {
                id: 'chatter9',
                username: 'genesys',
                password: 'genesys2025',
                name: 'Genesys',
                type: 'chatter',
                onlyMonsterId: '166534',
                assignedModels: ['model1', 'model2', 'model4'] // Carmen, Lucy, Lexi (reemplaza a Emely)
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
