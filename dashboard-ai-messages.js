// dashboard-ai-messages.js - Generador de mensajes con IA

// 
// CONFIGURACI�N Y STORAGE
// 

const STORAGE_KEYS = {
    HISTORY: 'ai_messages_history',
    FAVORITES: 'ai_messages_favorites'
};

let currentGeneration = null; // Guarda contexto de la �ltima generaci�n

// 
// FUNCIONES DE ALMACENAMIENTO (localStorage)
// 

function saveToHistory(modelId, modelName, messageType, message) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    history.unshift({
        id: Date.now() + Math.random(), // ID �nico
        modelId,
        modelName,
        messageType,
        message,
        timestamp: Date.now()
    });
    // Mantener solo �ltimos 50
    if (history.length > 50) history.splice(50);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    renderHistory();
}

function saveToFavorites(modelId, modelName, messageType, message) {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    
    // Evitar duplicados exactos
    if (favorites.some(f => f.message === message && f.modelId === modelId)) {
        return false;
    }
    
    favorites.unshift({
        id: Date.now() + Math.random(),
        modelId,
        modelName,
        messageType,
        message,
        timestamp: Date.now()
    });
    
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    renderFavorites();
    return true;
}

function removeFromFavorites(id) {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    const filtered = favorites.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
    renderFavorites();
}

function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
}

function getFavorites() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
}

// 
// RENDERIZADO DE HISTORIAL Y FAVORITOS
// 

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    const history = getHistory();

    if (history.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #6B7280; text-align: center; padding: 2rem 0;">Sin historial aún</p>';
        return;
    }

    // Agrupar por modelo
    const byModel = {};
    history.forEach(item => {
        if (!byModel[item.modelId]) {
            byModel[item.modelId] = { name: item.modelName, items: [] };
        }
        byModel[item.modelId].items.push(item);
    });

    container.innerHTML = Object.entries(byModel).map(([modelId, data]) => {
        const itemsHtml = data.items.slice(0, 10).map(item => {
            const escapedMsg = escapeForAttr(item.message);
            return `
                <div class="history-item" onclick="window.copyFromHistory(\`${escapedMsg}\`)">
                    ${escapeHtml(item.message)}
                    <div class="timestamp">${formatTime(item.timestamp)}</div>
                </div>
            `;
        }).join('');
        
        return `
        <div style="margin-bottom: 1rem;">
            <div class="model-badge">${data.name}</div>
            ${itemsHtml}
        </div>
        `;
    }).join('');
}

function renderFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    const favorites = getFavorites();

    if (favorites.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #6B7280; text-align: center; padding: 2rem 0;">Sin favoritos aún</p>';
        return;
    }

    // Agrupar por modelo
    const byModel = {};
    favorites.forEach(item => {
        if (!byModel[item.modelId]) {
            byModel[item.modelId] = { name: item.modelName, items: [] };
        }
        byModel[item.modelId].items.push(item);
    });

    container.innerHTML = Object.entries(byModel).map(([modelId, data]) => {
        const itemsHtml = data.items.map(item => {
            const escapedMsg = escapeForAttr(item.message);
            return `
                <div class="favorite-item" onclick="window.copyFromHistory(\`${escapedMsg}\`)">
                    <button class="remove-fav" onclick="event.stopPropagation(); window.removeFromFavorites(${item.id})">
                        × Quitar
                    </button>
                    ${escapeHtml(item.message)}
                    <div class="timestamp">${formatTime(item.timestamp)}</div>
                </div>
            `;
        }).join('');
        
        return `
        <div style="margin-bottom: 1rem;">
            <div class="model-badge">${data.name}</div>
            ${itemsHtml}
        </div>
        `;
    }).join('');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

// 
// INICIALIZACI�N
// 

document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Generador IA iniciando...');
    
    // Verificar autenticaci�n
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        console.warn(' No hay usuario en sesi�n');
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    console.log(' Usuario:', user.name, '- Tipo:', user.type);
    
    if (user.type !== 'chatter') {
        console.warn(' Usuario no es chatter');
        window.location.href = 'login.html';
        return;
    }
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    
    // Cargar modelos
    await loadModels();
    
    // Event listeners
    setupEventListeners();
    
    // Cargar historial y favoritos
    renderHistory();
    renderFavorites();
});

// 
// CARGAR MODELOS DESDE DASHBOARD-GUIAS.JS
// 

async function loadModels() {
    const modelsGrid = document.getElementById('models-grid');
    
    try {
        // Obtener datos desde dashboard-guias.js (MODELOS_DATA)
        if (typeof MODELOS_DATA === 'undefined') {
            throw new Error('MODELOS_DATA no está cargado. Verifica que dashboard-guias.js esté incluido.');
        }
        
        // Procesar modelos desde MODELOS_DATA
        const models = Object.entries(MODELOS_DATA).map(([key, data]) => ({
            id: key,
            name: data.nombre,
            username: data.username,
            instructions: buildModelInstructions(data),
            emojis: data.emojis_favoritos || '',
            phrases: data.palabras_tipicas || '',
            personalidad: data.personalidad || '',
            intensidad: data.intensidad || 'Media'
        }));
        
        // Filtrar solo modelos activas
        const activeModels = models.filter(m => MODELOS_DATA[m.id].status === 'activa');
        
        if (activeModels.length === 0) {
            console.warn('⚠️ No hay modelos activas');
            modelsGrid.innerHTML = '<div class="model-card-loading">No hay modelos disponibles</div>';
            return;
        }
        
        // Guardar en memoria
        window.availableModels = activeModels;
        window.selectedModelId = null;
        
        // Generar cards de modelos
        modelsGrid.innerHTML = activeModels.map(model => {
            const initials = model.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return `
                <div class="model-card" data-model-id="${model.id}" onclick="selectModel('${model.id}')">
                    <div class="model-avatar">${initials}</div>
                    <div class="model-name">${model.name}</div>
                    <div class="model-username">${model.username}</div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Modelos cargadas:', activeModels.length);
        
    } catch (error) {
        console.error('❌ Error cargando modelos:', error);
        modelsGrid.innerHTML = '<div class="model-card-loading">Error al cargar modelos</div>';
    }
}

// Seleccionar modelo
window.selectModel = function(modelId) {
    console.log('📋 Modelo seleccionado:', modelId);
    
    // Actualizar selección visual
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-model-id="${modelId}"]`).classList.add('selected');
    
    // Guardar modelo seleccionado
    window.selectedModelId = modelId;
    
    // Validar formulario
    checkFormValid();
};

// Construir instrucciones completas desde los datos de la modelo
function buildModelInstructions(modelData) {
    let instructions = `Soy ${modelData.nombre}, modelo de OnlyFans.\n\n`;
    
    if (modelData.personalidad) {
        instructions += `PERSONALIDAD: ${modelData.personalidad}\n\n`;
    }
    
    if (modelData.descripcion) {
        instructions += `DESCRIPCI�N: ${modelData.descripcion}\n\n`;
    }
    
    if (modelData.palabras_tipicas) {
        instructions += `FRASES T�PICAS: ${modelData.palabras_tipicas}\n\n`;
    }
    
    if (modelData.cosas_no_decir) {
        instructions += ` NUNCA MENCIONAR: ${modelData.cosas_no_decir}\n\n`;
    }
    
    if (modelData.pais) {
        instructions += `Pa�s: ${modelData.pais}\n`;
    }
    
    if (modelData.hobbies) {
        instructions += `Hobbies: ${modelData.hobbies}\n`;
    }
    
    return instructions;
}

// 
// EVENT LISTENERS
// 

function setupEventListeners() {
    const messageTypeBtns = document.querySelectorAll('.message-type-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    console.log('✅ Event listeners configurados. Botones encontrados:', messageTypeBtns.length);
    
    // Selección de tipo de mensaje
    messageTypeBtns.forEach((btn, index) => {
        console.log(`🔘 Botón ${index}:`, btn.dataset.type);
        
        btn.addEventListener('click', function(e) {
            console.log('🖱️ Click en tipo de mensaje:', this.dataset.type);
            
            // Quitar active de todos
            messageTypeBtns.forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            this.classList.add('active');
            
            // Mostrar/ocultar secciones según tipo
            const type = this.dataset.type;
            const timeSection = document.getElementById('time-section');
            const photoSection = document.getElementById('photo-section');
            const packSection = document.getElementById('pack-section');
            
            console.log('📂 Secciones encontradas:', {
                time: !!timeSection,
                photo: !!photoSection,
                pack: !!packSection
            });
            
            // Ocultar todas
            if (timeSection) timeSection.classList.add('hidden');
            if (photoSection) photoSection.classList.add('hidden');
            if (packSection) packSection.classList.add('hidden');
            
            // Mostrar la correspondiente
            if (type === 'masivo' && timeSection) {
                console.log('⏰ Mostrando sección de tiempo');
                timeSection.classList.remove('hidden');
            } else if (type === 'posteo' && photoSection) {
                console.log('📷 Mostrando sección de foto');
                photoSection.classList.remove('hidden');
            } else if (type === 'venta' && packSection) {
                console.log('💰 Mostrando sección de pack');
                packSection.classList.remove('hidden');
            }
            
            checkFormValid();
        });
    });
    
    // Bot�n generar
    generateBtn.addEventListener('click', generateMessages);
}

function checkFormValid() {
    const generateBtn = document.getElementById('generate-btn');
    const activeType = document.querySelector('.message-type-btn.active');
    
    const isValid = window.selectedModelId && activeType !== null;
    
    console.log('✔️ Validación de formulario:', {
        modeloSeleccionado: !!window.selectedModelId,
        tipoSeleccionado: activeType !== null,
        esValido: isValid
    });
    
    generateBtn.disabled = !isValid;
    
    if (isValid) {
        console.log('🟢 Botón HABILITADO');
    } else {
        console.log('🔴 Botón DESHABILITADO');
    }
}

// 
// GENERAR MENSAJES
// 

async function generateMessages() {
    const modelSelect = document.getElementById('model-select');
    const activeType = document.querySelector('.message-type-btn.active');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorMessage = document.getElementById('error-message');
    const generateBtn = document.getElementById('generate-btn');
    
    // Obtener datos
    const modelId = window.selectedModelId;
    const model = window.availableModels.find(m => m.id === modelId);
    const messageType = activeType.dataset.type;
    
    // Contexto seg�n tipo
    let context = null;
    if (messageType === 'masivo') {
        const timeOfDayEl = document.getElementById('time-of-day');
        const familiarityEl = document.getElementById('familiarity');
        const timeOfDay = timeOfDayEl ? timeOfDayEl.value : 'tarde';
        const familiarity = familiarityEl ? familiarityEl.value : 'regular';
        context = { timeOfDay, familiarity };
    } else if (messageType === 'posteo') {
        const photoEl = document.getElementById('photo-description');
        context = photoEl ? photoEl.value : '';
    } else if (messageType === 'venta') {
        const packEl = document.getElementById('pack-context');
        context = packEl ? packEl.value : '';
    }
    
    // UI: mostrar loading
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        // Llamar a la API en Vercel
        const apiUrl = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';
        const response = await fetch(`${apiUrl}/ai/generate-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modelName: model.name,
                instructions: model.instructions,
                emojis: model.emojis,
                phrases: model.phrases,
                messageType: messageType,
                context: context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar mensajes');
        }
        
        const data = await response.json();
        console.log(' Mensajes generados:', data);
        
        // Guardar contexto para regeneraci�n individual
        currentGeneration = {
            modelId: model.id,
            modelName: model.name,
            model: model,
            messageType: messageType,
            context: context,
            messages: data.messages
        };
        
        // Mostrar resultados
        displayMessages(data.messages);
        
        // Guardar en historial
        data.messages.forEach(msg => {
            saveToHistory(model.id, model.name, messageType, msg);
        });
        
    } catch (error) {
        console.error(' Error:', error);
        errorMessage.querySelector('p').textContent = error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

// 
// REGENERAR MENSAJE INDIVIDUAL
// 

async function regenerateMessage(index) {
    if (!currentGeneration) return;

    const messageDiv = document.querySelector(`[data-message-index="${index}"]`);
    if (!messageDiv) return;

    const regenBtn = messageDiv.querySelector('.regen-btn');
    const messageContent = messageDiv.querySelector('.message-content');
    const originalText = messageContent.textContent;

    regenBtn.disabled = true;
    regenBtn.textContent = ' ...';
    messageContent.style.opacity = '0.5';

    try {
        const model = currentGeneration.model;
        const apiUrl = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';
        
        const response = await fetch(`${apiUrl}/ai/generate-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modelName: model.name,
                instructions: model.instructions,
                emojis: model.emojis,
                phrases: model.phrases,
                messageType: currentGeneration.messageType,
                context: currentGeneration.context
            })
        });

        if (!response.ok) {
            throw new Error('Error al regenerar mensaje');
        }

        const data = await response.json();
        const newMessage = data.messages[0];
        
        messageContent.textContent = newMessage;
        currentGeneration.messages[index] = newMessage;

        // Guardar en historial
        saveToHistory(
            currentGeneration.modelId,
            currentGeneration.modelName,
            currentGeneration.messageType,
            newMessage
        );

        // Efecto de �xito
        messageContent.style.opacity = '1';
        messageDiv.style.background = 'rgba(34, 197, 94, 0.05)';
        setTimeout(() => {
            messageDiv.style.background = 'rgba(255, 255, 255, 0.03)';
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        alert(`Error al regenerar: ${error.message}`);
        messageContent.textContent = originalText;
        messageContent.style.opacity = '1';
    } finally {
        regenBtn.disabled = false;
        regenBtn.textContent = ' Regenerar';
    }
}

// 
// MOSTRAR MENSAJES
// 

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    const results = document.getElementById('results');
    
    if (!container) {
        console.error('messages-container no encontrado');
        return;
    }
    
    console.log('📝 Mostrando', messages.length, 'mensajes');
    
    container.innerHTML = messages.map((message, index) => {
        return `
        <div class="message-item" data-message-index="${index}">
            <div class="message-number">${index + 1}</div>
            <div class="message-content">${escapeHtml(message)}</div>
            <div class="message-actions">
                <button class="copy-btn" onclick="window.copyMessage(\`${escapeForAttr(message)}\`, this)">
                    📋 Copiar
                </button>
                <button class="fav-btn" onclick="window.toggleFavorite(\`${escapeForAttr(message)}\`, this)">
                    ⭐ Fav
                </button>
                <button class="regen-btn" onclick="window.regenerateMessage(${index})">
                    ↻ Regenerar
                </button>
            </div>
        </div>
    `}).join('');
    
    console.log('✅ HTML de mensajes generado');
    
    results.classList.remove('hidden');
    
    // Scroll suave a resultados
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 
// ACCIONES DE MENSAJE
// 

window.copyMessage = function(message, button) {
    navigator.clipboard.writeText(message).then(() => {
        const originalText = button.textContent;
        button.classList.add('copied');
        button.textContent = '✅ Copiado';
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar el mensaje');
    });
};

window.regenerateMessage = regenerateMessage;

window.toggleFavorite = function(message, button) {
    if (!currentGeneration) return;

    const isFavorited = button.classList.contains('favorited');
    
    if (isFavorited) {
        // Quitar de favoritos
        const favorites = getFavorites();
        const fav = favorites.find(f => f.message === message && f.modelId === currentGeneration.modelId);
        if (fav) {
            removeFromFavorites(fav.id);
            button.classList.remove('favorited');
            button.textContent = '⭐ Fav';
        }
    } else {
        // Agregar a favoritos
        const success = saveToFavorites(
            currentGeneration.modelId,
            currentGeneration.modelName,
            currentGeneration.messageType,
            message
        );
        if (success) {
            button.classList.add('favorited');
            button.textContent = '★ Favorito';
        } else {
            alert('Este mensaje ya está en favoritos');
        }
    }
};

window.copyFromHistory = function(message) {
    navigator.clipboard.writeText(message).then(() => {
        // Mostrar feedback temporal
        const toast = document.createElement('div');
        toast.textContent = '✅ Copiado';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    });
};

window.removeFromFavorites = removeFromFavorites;

// 
// UTILIDADES
// 

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function escapeForAttr(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\\n');
}
