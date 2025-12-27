// dashboard-ai-messages.js - Generador de mensajes con IA

// 
// CONFIGURACIÓN Y STORAGE
// 

const STORAGE_KEYS = {
    HISTORY: 'ai_messages_history',
    FAVORITES: 'ai_messages_favorites'
};

let currentGeneration = null; // Guarda contexto de la última generación

// 
// FUNCIONES DE ALMACENAMIENTO (localStorage)
// 

function saveToHistory(modelId, modelName, messageType, message) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    history.unshift({
        id: Date.now() + Math.random(), // ID único
        modelId,
        modelName,
        messageType,
        message,
        timestamp: Date.now()
    });
    // Mantener solo últimos 50
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

    container.innerHTML = Object.entries(byModel).map(([modelId, data]) => `
        <div style="margin-bottom: 1rem;">
            <div class="model-badge">${data.name}</div>
            ${data.items.slice(0, 10).map(item => `
                <div class="history-item" onclick="copyFromHistory('\'${escapeForAttr(item.message)}'\')">
                    ${escapeHtml(item.message)}
                    <div class="timestamp">${formatTime(item.timestamp)}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function renderFavorites() {
    const container = document.getElementById('favorites-container');
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

    container.innerHTML = Object.entries(byModel).map(([modelId, data]) => `
        <div style="margin-bottom: 1rem;">
            <div class="model-badge">${data.name}</div>
            ${data.items.map(item => `
                <div class="favorite-item" onclick="copyFromHistory('\'${escapeForAttr(item.message)}'\')">
                    <button class="remove-fav" onclick="event.stopPropagation(); removeFromFavorites(${item.id})">
                         Quitar
                    </button>
                    ${escapeHtml(item.message)}
                    <div class="timestamp">${formatTime(item.timestamp)}</div>
                </div>
            `).join('')}
        </div>
    `).join('');
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
// INICIALIZACIÓN
// 

document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Generador IA iniciando...');
    
    // Verificar autenticación
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        console.warn(' No hay usuario en sesión');
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
    const modelSelect = document.getElementById('model-select');
    
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
            console.warn(' No hay modelos activas');
            modelSelect.innerHTML = '<option value="">No hay modelos disponibles</option>';
            return;
        }
        
        // Guardar en memoria
        window.availableModels = activeModels;
        
        // Llenar select
        modelSelect.innerHTML = '<option value="">Selecciona una modelo...</option>';
        activeModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} ${model.username}`;
            modelSelect.appendChild(option);
        });
        
        console.log(' Modelos cargadas:', activeModels.length);
        
    } catch (error) {
        console.error(' Error cargando modelos:', error);
        modelSelect.innerHTML = '<option value="">Error al cargar modelos</option>';
    }
}

// Construir instrucciones completas desde los datos de la modelo
function buildModelInstructions(modelData) {
    let instructions = `Soy ${modelData.nombre}, modelo de OnlyFans.\n\n`;
    
    if (modelData.personalidad) {
        instructions += `PERSONALIDAD: ${modelData.personalidad}\n\n`;
    }
    
    if (modelData.descripcion) {
        instructions += `DESCRIPCIÓN: ${modelData.descripcion}\n\n`;
    }
    
    if (modelData.palabras_tipicas) {
        instructions += `FRASES TÍPICAS: ${modelData.palabras_tipicas}\n\n`;
    }
    
    if (modelData.cosas_no_decir) {
        instructions += ` NUNCA MENCIONAR: ${modelData.cosas_no_decir}\n\n`;
    }
    
    if (modelData.pais) {
        instructions += `País: ${modelData.pais}\n`;
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
    const modelSelect = document.getElementById('model-select');
    const messageTypeBtns = document.querySelectorAll('.message-type-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    // Cambio de modelo
    modelSelect.addEventListener('change', function() {
        const modelId = this.value;
        if (!modelId) {
            document.getElementById('model-instructions').classList.add('hidden');
            return;
        }
        
        const model = window.availableModels.find(m => m.id === modelId);
        if (model && model.instructions) {
            document.getElementById('instructions-text').textContent = model.instructions;
            document.getElementById('model-instructions').classList.remove('hidden');
        } else {
            document.getElementById('model-instructions').classList.add('hidden');
        }
        
        checkFormValid();
    });
    
    // Selección de tipo de mensaje
    messageTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Quitar active de todos
            messageTypeBtns.forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            this.classList.add('active');
            
            // Mostrar/ocultar secciones según tipo
            const type = this.dataset.type;
            const timeSection = document.getElementById('time-section');
            const photoSection = document.getElementById('photo-section');
            const packSection = document.getElementById('pack-section');
            
            // Ocultar todas
            timeSection.classList.add('hidden');
            photoSection.classList.add('hidden');
            packSection.classList.add('hidden');
            
            // Mostrar la correspondiente
            if (type === 'masivo') {
                timeSection.classList.remove('hidden');
            } else if (type === 'posteo') {
                photoSection.classList.remove('hidden');
            } else if (type === 'venta') {
                packSection.classList.remove('hidden');
            }
            
            checkFormValid();
        });
    });
    
    // Botón generar
    generateBtn.addEventListener('click', generateMessages);
}

function checkFormValid() {
    const modelSelect = document.getElementById('model-select');
    const generateBtn = document.getElementById('generate-btn');
    const activeType = document.querySelector('.message-type-btn.active');
    
    const isValid = modelSelect.value !== '' && activeType !== null;
    generateBtn.disabled = !isValid;
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
    const modelId = modelSelect.value;
    const model = window.availableModels.find(m => m.id === modelId);
    const messageType = activeType.dataset.type;
    
    // Contexto según tipo
    let context = null;
    if (messageType === 'masivo') {
        const timeOfDay = document.getElementById('time-of-day').value;
        const familiarity = document.getElementById('familiarity').value;
        context = { timeOfDay, familiarity };
    } else if (messageType === 'posteo') {
        context = document.getElementById('photo-description').value;
    } else if (messageType === 'venta') {
        context = document.getElementById('pack-context').value;
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
        
        // Guardar contexto para regeneración individual
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

        // Efecto de éxito
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
    
    container.innerHTML = messages.map((message, index) => `
        <div class="message-item" data-message-index="${index}">
            <div class="message-number">${index + 1}</div>
            <div class="message-content">${escapeHtml(message)}</div>
            <div class="message-actions">
                <button class="copy-btn" onclick="copyMessage('\'${escapeForAttr(message)}'\', this)">
                     Copiar
                </button>
                <button class="fav-btn" onclick="toggleFavorite('\'${escapeForAttr(message)}'\', this)">
                     Fav
                </button>
                <button class="regen-btn" onclick="regenerateMessage(${index})">
                     Regenerar
                </button>
            </div>
        </div>
    `).join('');
    
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
        button.textContent = ' Copiado';
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar el mensaje');
    });
};

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
            button.textContent = ' Fav';
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
            button.textContent = ' Favorito';
        } else {
            alert('Este mensaje ya está en favoritos');
        }
    }
};

window.copyFromHistory = function(message) {
    navigator.clipboard.writeText(message).then(() => {
        // Mostrar feedback temporal
        const toast = document.createElement('div');
        toast.textContent = ' Copiado';
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
window.regenerateMessage = regenerateMessage;

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
