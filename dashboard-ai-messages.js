// dashboard-ai-messages.js - Generador de mensajes con IA

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🤖 Generador IA iniciando...');
    
    // Verificar autenticación
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        console.warn('⚠️ No hay usuario en sesión');
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    console.log('👤 Usuario:', user.name, '- Tipo:', user.type);
    
    if (user.type !== 'chatter') {
        console.warn('⚠️ Usuario no es chatter');
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
});

// ═══════════════════════════════════════════════════════════════
// CARGAR MODELOS DESDE DASHBOARD-GUIAS.JS
// ═══════════════════════════════════════════════════════════════

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
            console.warn('⚠️ No hay modelos activas');
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
        
        console.log('✅ Modelos cargadas:', activeModels.length);
        
    } catch (error) {
        console.error('❌ Error cargando modelos:', error);
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
        instructions += `⚠️ NUNCA MENCIONAR: ${modelData.cosas_no_decir}\n\n`;
    }
    
    if (modelData.pais) {
        instructions += `País: ${modelData.pais}\n`;
    }
    
    if (modelData.hobbies) {
        instructions += `Hobbies: ${modelData.hobbies}\n`;
    }
    
    return instructions;
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupEventListeners() {
    const modelSelect = document.getElementById('model-select');
    const messageTypeBtns = document.querySelectorAll('.message-type-btn');
    const generateBtn = document.getElementById('generate-btn');
    const contextSection = document.getElementById('context-section');
    
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
            
            // Mostrar/ocultar contexto si es venta
            const type = this.dataset.type;
            if (type === 'venta') {
                contextSection.classList.remove('hidden');
            } else {
                contextSection.classList.add('hidden');
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

// ═══════════════════════════════════════════════════════════════
// GENERAR MENSAJES
// ═══════════════════════════════════════════════════════════════

async function generateMessages() {
    const modelSelect = document.getElementById('model-select');
    const activeType = document.querySelector('.message-type-btn.active');
    const packContext = document.getElementById('pack-context').value;
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorMessage = document.getElementById('error-message');
    const generateBtn = document.getElementById('generate-btn');
    
    // Obtener datos
    const modelId = modelSelect.value;
    const model = window.availableModels.find(m => m.id === modelId);
    const messageType = activeType.dataset.type;
    
    // UI: mostrar loading
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        // Llamar a la API en Vercel (igual que Google Sheets)
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
                packContext: messageType === 'venta' ? packContext : null
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar mensajes');
        }
        
        const data = await response.json();
        console.log('✅ Mensajes generados:', data);
        
        // Mostrar resultados
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

// ═══════════════════════════════════════════════════════════════
// MOSTRAR MENSAJES
// ═══════════════════════════════════════════════════════════════

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    const results = document.getElementById('results');
    
    container.innerHTML = '';
    
    messages.forEach((message, index) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'generated-message';
        messageDiv.innerHTML = `
            <button class="copy-btn" onclick="copyMessage(this, ${index})">
                📋 Copiar
            </button>
            <div style="padding-right: 80px;">
                ${escapeHtml(message)}
            </div>
        `;
        container.appendChild(messageDiv);
    });
    
    results.classList.remove('hidden');
    
    // Scroll suave a resultados
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ═══════════════════════════════════════════════════════════════
// COPIAR MENSAJE
// ═══════════════════════════════════════════════════════════════

window.copyMessage = function(button, index) {
    const messageDiv = button.parentElement;
    const textDiv = messageDiv.querySelector('div');
    const text = textDiv.textContent.trim();
    
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = '✅ Copiado';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = '📋 Copiar';
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar el mensaje');
    });
};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}
