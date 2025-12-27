// dashboard-ai-messages.js - Generador IA limpio y definitivo

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
            personalidad: data.personalidad,
            descripcion: data.descripcion,
            emojis: data.emojis_favoritos,
            palabras: data.palabras_tipicas,
            intensidad: data.intensidad,
            pais: data.pais
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
            
            // Mostrar/ocultar contexto
            const contextSection = document.getElementById('context-section');
            if (this.dataset.type === 'masivo') {
                contextSection.classList.remove('hidden');
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
    
    // Contexto
    let context = null;
    if (messageType === 'masivo') {
        const timeOfDay = document.getElementById('time-of-day').value;
        const familiarity = document.getElementById('familiarity').value;
        context = { timeOfDay, familiarity };
    }
    
    // UI
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        const modelData = MODELOS_DATA[modelId];
        const instructions = `Soy ${modelData.nombre}. ${modelData.descripcion || ''}`;
        
        const apiUrl = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';
        const response = await fetch(`${apiUrl}/ai/generate-messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelName: model.name,
                instructions: instructions,
                emojis: model.emojis || '💕😘🔥',
                phrases: model.palabras || '',
                messageType: messageType,
                context: context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar mensajes');
        }
        
        const data = await response.json();
        displayMessages(data.messages);
        
    } catch (error) {
        console.error('❌ Error:', error);
        errorMessage.querySelector('p').textContent = error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    const results = document.getElementById('results');
    
    container.innerHTML = messages.map((message, index) => `
        <div class="message-item">
            <div style="padding-bottom: 0.5rem; white-space: pre-wrap;">${escapeHtml(message)}</div>
            <div class="message-actions">
                <button onclick="window.copyMessage('${escapeForAttr(message)}', this)">📋 Copiar</button>
                <button onclick="window.regenerateMessage(${index})">↻ Regenerar</button>
            </div>
        </div>
    `).join('');
    
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth' });
    
    // Guardar para regeneración
    window.currentGeneration = {
        modelId: window.selectedModelId,
        messageType: document.querySelector('.message-type-btn.active').dataset.type,
        messages: messages
    };
}

window.copyMessage = function(message, button) {
    navigator.clipboard.writeText(message).then(() => {
        const original = button.textContent;
        button.textContent = '✅ Copiado';
        setTimeout(() => button.textContent = original, 2000);
    });
};

window.regenerateMessage = async function(index) {
    await generateMessages();
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function escapeForAttr(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
}
