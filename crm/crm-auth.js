// crm-auth.js - Wrapper de autenticación aislado para CRM
// REUTILIZA el sistema de sesión existente SIN modificarlo

(function() {
    'use strict';
    
    // Verificar autenticación INMEDIATAMENTE
    const currentUser = sessionStorage.getItem('currentUser');
    
    if (!currentUser) {
        console.warn('⚠️ CRM: No hay usuario en sesión');
        window.location.href = '/crm/login.html';
        throw new Error('No authenticated');
    }
    
    try {
        const user = JSON.parse(currentUser);
        console.log('✅ CRM: Usuario autenticado:', user.name);
        
        // Hacer disponible globalmente ANTES de cargar React
        window.CRM_USER = user;
        window.CRM_AUTHENTICATED = true;
        
    } catch (error) {
        console.error('❌ CRM: Error al parsear usuario', error);
        sessionStorage.removeItem('currentUser');
        window.location.href = '/crm/login.html';
        throw error;
    }
    
    // Ocultar loading automáticamente después de 2 segundos (seguridad)
    setTimeout(function() {
        const loading = document.getElementById('auth-loading');
        const app = document.getElementById('crm-app');
        if (loading) loading.style.display = 'none';
        if (app) app.classList.remove('hidden');
        console.log('⚡ CRM: Loading ocultado por timeout');
    }, 2000);
    
    // Función para ocultar loading (llamada desde crm-app.jsx cuando React monta)
    window.CRM_HIDE_LOADING = function() {
        const loading = document.getElementById('auth-loading');
        const app = document.getElementById('crm-app');
        if (loading) loading.style.display = 'none';
        if (app) app.classList.remove('hidden');
        console.log('✅ CRM: Loading ocultado por React');
    };
    
    // Función global de logout para el CRM
    window.CRM_LOGOUT = function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/crm/login.html';
    };
    
})();
