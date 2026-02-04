// dashboard-ai-messages.js - Generador IA limpio y definitivo
// Última actualización: 27/12/2025 17:30 - Lucy agregada

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Generador IA...');
    
    // Verificar autenticación
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    if (user.type !== 'chatter') {
        window.location.href = 'login.html';
        return;
    }
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Cargar modelos y configurar
    loadModels();
    setupEventListeners();
    
    // Cargar historial y favoritos iniciales
    renderHistory();
    renderFavorites();
});

function loadModels() {
    const modelsGrid = document.getElementById('models-grid');
    
    if (typeof MODELOS_DATA === 'undefined') {
        modelsGrid.innerHTML = '<div style="text-align: center; color: #EF4444; padding: 2rem;">Error: No se pudieron cargar las modelos</div>';
        console.error('❌ MODELOS_DATA no está definido');
        return;
    }
    
    console.log('✅ MODELOS_DATA cargado correctamente');
    
    // Filtrar modelos activas
    const activeModels = Object.entries(MODELOS_DATA)
        .filter(([key, data]) => data.status === 'activa')
        .map(([key, data]) => ({
            id: key,
            name: data.nombre,
            username: data.username,
            emojis: data.emojis_favoritos,
            palabras: data.palabras_tipicas
        }));
    
    if (activeModels.length === 0) {
        modelsGrid.innerHTML = '<div style="text-align: center; color: #9CA3AF; padding: 2rem;">No hay modelos disponibles</div>';
        return;
    }
    
    // Generar cards
    modelsGrid.innerHTML = activeModels.map(model => {
        const initials = model.name.split(' ')[0].substring(0, 2).toUpperCase();
        return `
            <div class="model-card" data-model-id="${model.id}" onclick="window.selectModel('${model.id}')">
                <div class="model-avatar">${initials}</div>
                <div class="model-name">${model.name.split('(')[0].trim()}</div>
                <div class="model-username">${model.username}</div>
            </div>
        `;
    }).join('');
    
    // Guardar modelos
    window.availableModels = activeModels;
    window.selectedModelId = null;
    
    console.log('✅ Modelos cargadas:', activeModels.length);
}

window.selectModel = function(modelId) {
    // Actualizar visual
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-model-id="${modelId}"]`).classList.add('selected');
    
    window.selectedModelId = modelId;
    validateForm();
};

function setupEventListeners() {
    // Tipos de mensaje
    document.querySelectorAll('.message-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.message-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar/ocultar contexto según tipo
            const contextSection = document.getElementById('context-section');
            const contextMasivo = document.getElementById('context-masivo');
            const contextPosteo = document.getElementById('context-posteo');
            const contextVenta = document.getElementById('context-venta');
            
            const type = this.dataset.type;
            
            // Ocultar todos
            contextMasivo.classList.add('hidden');
            contextPosteo.classList.add('hidden');
            contextVenta.classList.add('hidden');
            
            // Mostrar el correspondiente
            if (type === 'masivo') {
                contextSection.classList.remove('hidden');
                contextMasivo.classList.remove('hidden');
            } else if (type === 'posteo') {
                contextSection.classList.remove('hidden');
                contextPosteo.classList.remove('hidden');
            } else if (type === 'venta') {
                contextSection.classList.remove('hidden');
                contextVenta.classList.remove('hidden');
            } else {
                contextSection.classList.add('hidden');
            }
            
            validateForm();
        });
    });
    
    // Botón generar
    document.getElementById('generate-btn').addEventListener('click', generateMessages);
}

function validateForm() {
    const generateBtn = document.getElementById('generate-btn');
    const hasModel = window.selectedModelId !== null;
    const hasType = document.querySelector('.message-type-btn.active') !== null;
    
    generateBtn.disabled = !(hasModel && hasType);
}

async function generateMessages() {
    const modelId = window.selectedModelId;
    const model = window.availableModels.find(m => m.id === modelId);
    const activeType = document.querySelector('.message-type-btn.active');
    const messageType = activeType.dataset.type;
    
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorMessage = document.getElementById('error-message');
    const generateBtn = document.getElementById('generate-btn');
    
    // Contexto según tipo de mensaje
    let context = null;
    if (messageType === 'masivo') {
        const timeOfDay = document.getElementById('time-of-day').value;
        const season = document.getElementById('season').value;
        const modelData = MODELOS_DATA[modelId];
        context = { 
            timeOfDay, 
            season,
            branding: modelData.branding || '',
            emojis: modelData.emojis_favoritos || '',
            phrases: modelData.palabras_tipicas || ''
        };
        console.log('📝 Contexto masivo:', context);
        console.log('  - Hora del día:', timeOfDay);
        console.log('  - Temporada:', season);
    } else if (messageType === 'posteo') {
        const photoDescription = document.getElementById('photo-description').value.trim();
        if (!photoDescription) {
            alert('⚠️ Debes describir la foto/video');
            generateBtn.disabled = false;
            return;
        }
        context = photoDescription;
        console.log('📸 Contexto posteo:', context);
    } else if (messageType === 'venta') {
        const packDescription = document.getElementById('pack-description').value.trim();
        if (!packDescription) {
            alert('⚠️ Debes describir el contenido del pack');
            generateBtn.disabled = false;
            return;
        }
        context = packDescription;
        console.log('💰 Contexto venta:', context);
    }
    
    console.log('📦 Payload completo a enviar:', {
        modelName: model.name,
        messageType,
        context,
        hasContext: !!context
    });
    
    // UI
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        const modelData = MODELOS_DATA[modelId];
        
        // Construir instructions completas con toda la información del modelo
        const instructions = `
Soy ${modelData.nombre}.
${modelData.descripcion || ''}

PERSONALIDAD: ${modelData.personalidad || 'Dulce, cariñosa y atrevida'}
INTENSIDAD: ${modelData.intensidad || 'Media'}
${modelData.branding ? `MI BRANDING/ACTIVIDADES: ${modelData.branding}` : ''}
${modelData.cosas_no_decir ? `NO MENCIONAR NUNCA: ${modelData.cosas_no_decir}` : ''}
${modelData.tipo_chico_ideal ? `TIPO DE CLIENTE IDEAL: ${modelData.tipo_chico_ideal}` : ''}
${modelData.notas ? `NOTAS ESTRATÉGICAS: ${modelData.notas}` : ''}
        `.trim();
        
        const apiUrl = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';
        
        console.log('🌐 Llamando API con:', {
            modelId: modelId,
            modelName: model.name,
            messageType,
            context,
            instructionsLength: instructions.length
        });
        
        // Agregar timestamp y seed para forzar variabilidad entre requests
        const timestamp = Date.now();
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        const response = await fetch(`${apiUrl}/ai/generate-messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelName: model.name,
                instructions: instructions,
                emojis: model.emojis || '💕😘🔥',
                phrases: model.palabras || '',
                messageType: messageType,
                context: context,
                timestamp: timestamp,  // Timestamp único para evitar cache
                seed: randomSeed       // Seed aleatorio para variabilidad
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar mensajes');
        }
        
        const data = await response.json();
        console.log('✅ Mensajes generados:', data);
        displayMessages(data.messages, model.name, modelId, messageType);
        
    } catch (error) {
        console.error('❌ Error:', error);
        errorMessage.querySelector('p').textContent = error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

function displayMessages(messages, modelName, modelId, messageType) {
    const container = document.getElementById('messages-container');
    const results = document.getElementById('results');
    
    // Si no se pasaron parámetros desde generateMessages, usar valores actuales
    if (!modelName) {
        modelId = window.selectedModelId;
        const model = window.availableModels.find(m => m.id === modelId);
        modelName = model?.name;
        messageType = document.querySelector('.message-type-btn.active')?.dataset.type;
    }
    
    container.innerHTML = messages.map((message, index) => `
        <div class="message-item">
            <div style="padding-bottom: 0.5rem; white-space: pre-wrap;">${escapeHtml(message)}</div>
            <div class="message-actions">
                <button onclick="window.copyMessage('${escapeForAttr(message)}', this)">📋 Copiar</button>
                <button onclick="window.addToFavorites('${modelId}', '${escapeForAttr(modelName)}', '${escapeForAttr(message)}', '${messageType}')">⭐ Favorito</button>
                <button onclick="window.regenerateMessage(${index})">↻ Regenerar</button>
            </div>
        </div>
    `).join('');
    
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth' });
    
    // Guardar para regeneración
    window.currentGeneration = {
        modelId: modelId,
        modelName: modelName,
        messageType: messageType,
        messages: messages
    };
    
    // Guardar cada mensaje en historial
    messages.forEach(msg => {
        saveToHistory(modelId, modelName, msg, messageType);
    });
    
    // Actualizar vistas de historial y favoritos
    renderHistory();
    renderFavorites();
}

// Funciones de localStorage
function saveToHistory(modelId, modelName, message, messageType) {
    let history = JSON.parse(localStorage.getItem('messagesHistory') || '[]');
    history.unshift({
        id: Date.now() + Math.random(), // ID único
        modelId,
        modelName,
        message,
        messageType,
        timestamp: new Date().toISOString()
    });
    
    // Límite de 50 mensajes
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    localStorage.setItem('messagesHistory', JSON.stringify(history));
}

function getHistory() {
    return JSON.parse(localStorage.getItem('messagesHistory') || '[]');
}

function saveToFavorites(modelId, modelName, message, messageType) {
    let favorites = JSON.parse(localStorage.getItem('messagesFavorites') || '{}');
    
    if (!favorites[modelId]) {
        favorites[modelId] = {
            modelName: modelName,
            messages: []
        };
    }
    
    // Evitar duplicados
    const exists = favorites[modelId].messages.some(fav => fav.message === message);
    if (!exists) {
        favorites[modelId].messages.push({
            id: Date.now() + Math.random(),
            message,
            messageType,
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem('messagesFavorites', JSON.stringify(favorites));
        return true;
    }
    return false;
}

function getFavorites() {
    return JSON.parse(localStorage.getItem('messagesFavorites') || '{}');
}

function removeFromFavorites(modelId, favoriteId) {
    let favorites = getFavorites();
    if (favorites[modelId]) {
        favorites[modelId].messages = favorites[modelId].messages.filter(fav => fav.id !== favoriteId);
        if (favorites[modelId].messages.length === 0) {
            delete favorites[modelId];
        }
        localStorage.setItem('messagesFavorites', JSON.stringify(favorites));
        renderFavorites();
    }
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No hay historial aún</p>';
        return;
    }
    
    historyList.innerHTML = history.slice(0, 20).map(item => `
        <div class="bg-gray-700 rounded-lg p-3 space-y-2 mb-2">
            <div class="flex items-center justify-between">
                <span class="text-xs text-pink-400 font-medium">${escapeHtml(item.modelName)}</span>
                <span class="text-xs text-gray-400">${new Date(item.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="text-sm text-white whitespace-pre-wrap" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${escapeHtml(item.message)}</div>
            <button 
                onclick="window.copyMessage('${escapeForAttr(item.message)}', this)"
                class="text-xs px-2 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded transition-colors w-full"
            >
                📋 Copiar
            </button>
        </div>
    `).join('');
}

function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;
    
    const favorites = getFavorites();
    const modelIds = Object.keys(favorites);
    
    if (modelIds.length === 0) {
        favoritesList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No hay favoritos aún</p>';
        return;
    }
    
    favoritesList.innerHTML = modelIds.map(modelId => {
        const modelFavorites = favorites[modelId];
        return `
            <div class="space-y-2 mb-4">
                <h4 class="text-sm font-medium text-pink-400">${escapeHtml(modelFavorites.modelName)}</h4>
                ${modelFavorites.messages.map(fav => `
                    <div class="bg-gray-700 rounded-lg p-3 space-y-2">
                        <div class="text-sm text-white whitespace-pre-wrap" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${escapeHtml(fav.message)}</div>
                        <div class="flex gap-2">
                            <button 
                                onclick="window.copyMessage('${escapeForAttr(fav.message)}', this)"
                                class="text-xs px-2 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded transition-colors flex-1"
                            >
                                📋 Copiar
                            </button>
                            <button 
                                onclick="window.removeFromFavorites('${modelId}', ${fav.id})"
                                class="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

window.addToFavorites = function(modelId, modelName, message, messageType) {
    const added = saveToFavorites(modelId, modelName, message, messageType);
    if (added) {
        renderFavorites();
        alert('✅ Añadido a favoritos');
    } else {
        alert('⚠️ Ya existe en favoritos');
    }
};

window.removeFromFavorites = removeFromFavorites;

window.copyMessage = function(message, button) {
    navigator.clipboard.writeText(message).then(() => {
        const original = button.textContent;
        button.textContent = '✅ Copiado';
        setTimeout(() => button.textContent = original, 2000);
    });
};

window.regenerateMessage = async function(index) {
    if (!window.currentGeneration) {
        console.error('❌ No hay generación actual para regenerar');
        return;
    }
    
    const { modelId, messageType } = window.currentGeneration;
    const model = window.availableModels.find(m => m.id === modelId);
    
    if (!model) {
        console.error('❌ Modelo no encontrado');
        return;
    }
    
    // Obtener el contexto actual según el tipo de mensaje
    let context = null;
    if (messageType === 'masivo') {
        const timeOfDay = document.getElementById('time-of-day').value;
        const season = document.getElementById('season').value;
        context = { timeOfDay, season };
    } else if (messageType === 'posteo') {
        context = document.getElementById('photo-description').value;
    } else if (messageType === 'venta') {
        context = document.getElementById('pack-description').value;
    }
    
    const container = document.getElementById('messages-container');
    const messageItems = container.querySelectorAll('.message-item');
    
    if (index < 0 || index >= messageItems.length) {
        console.error('❌ Índice de mensaje inválido');
        return;
    }
    
    // Mostrar loading solo en el mensaje específico
    const messageItem = messageItems[index];
    const originalContent = messageItem.innerHTML;
    messageItem.innerHTML = '<div style="text-align: center; padding: 1rem;"><div style="font-size: 1.5rem;">⏳</div><div style="color: #9CA3AF; margin-top: 0.5rem;">Regenerando...</div></div>';
    
    try {
        const modelData = MODELOS_DATA[modelId];
        
        // Construir instructions completas
        const instructions = `
Soy ${modelData.nombre}.
${modelData.descripcion || ''}

PERSONALIDAD: ${modelData.personalidad || 'Dulce, cariñosa y atrevida'}
INTENSIDAD: ${modelData.intensidad || 'Media'}
${modelData.branding ? `MI BRANDING/ACTIVIDADES: ${modelData.branding}` : ''}
${modelData.cosas_no_decir ? `NO MENCIONAR NUNCA: ${modelData.cosas_no_decir}` : ''}
${modelData.tipo_chico_ideal ? `TIPO DE CLIENTE IDEAL: ${modelData.tipo_chico_ideal}` : ''}
${modelData.notas ? `NOTAS ESTRATÉGICAS: ${modelData.notas}` : ''}
        `.trim();
        
        const apiUrl = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';
        
        // Agregar timestamp y seed para forzar variabilidad
        const timestamp = Date.now();
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        const response = await fetch(`${apiUrl}/ai/generate-messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelName: model.name,
                instructions: instructions,
                emojis: model.emojis || '💕😘🔥',
                phrases: model.palabras || '',
                messageType: messageType,
                context: context,
                timestamp: timestamp,
                seed: randomSeed
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al regenerar mensaje');
        }
        
        const data = await response.json();
        const newMessage = data.messages[0]; // Tomar solo el primero
        
        // Actualizar el mensaje en la UI
        messageItem.innerHTML = `
            <div style="padding-bottom: 0.5rem; white-space: pre-wrap;">${escapeHtml(newMessage)}</div>
            <div class="message-actions">
                <button onclick="window.copyMessage('${escapeForAttr(newMessage)}', this)">📋 Copiar</button>
                <button onclick="window.addToFavorites('${modelId}', '${escapeForAttr(model.name)}', '${escapeForAttr(newMessage)}', '${messageType}')">⭐ Favorito</button>
                <button onclick="window.regenerateMessage(${index})">↻ Regenerar</button>
            </div>
        `;
        
        // Actualizar en currentGeneration
        window.currentGeneration.messages[index] = newMessage;
        
        // Guardar en historial
        saveToHistory(modelId, model.name, newMessage, messageType);
        renderHistory();
        
    } catch (error) {
        console.error('❌ Error al regenerar:', error);
        messageItem.innerHTML = originalContent;
        alert('❌ Error al regenerar el mensaje. Intenta de nuevo.');
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function escapeForAttr(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '\\n');
}
