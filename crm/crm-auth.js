// crm-auth.js - Wrapper de autenticación aislado para CRM
// REUTILIZA el sistema de sesión existente SIN modificarlo

(function() {
    'use strict';
    
    // Verificar autenticación usando el MISMO patrón del dashboard
    const currentUser = sessionStorage.getItem('currentUser');
    
    if (!currentUser) {
        console.warn('⚠️ CRM: No hay usuario en sesión');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const user = JSON.parse(currentUser);
        console.log('✅ CRM: Usuario autenticado:', user.name);
        
        // Hacer disponible globalmente para el CRM
        window.CRM_USER = user;
        
        // Ocultar loading y mostrar app
        document.getElementById('auth-loading').classList.add('hidden');
        document.getElementById('crm-app').classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ CRM: Error al parsear usuario', error);
        sessionStorage.removeItem('currentUser');
        window.location.href = '/login.html';
    }
    
    // Función global de logout para el CRM
    window.CRM_LOGOUT = function() {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/login.html';
    };
    
})();
