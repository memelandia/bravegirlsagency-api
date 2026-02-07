/**
 * API Service para comunicación con backend
 * Reemplaza localStorage con llamadas a API de Vercel
 */

const API_BASE_URL = 'https://bravegirlsagency-api.vercel.app/api/supervision';

export const supervisionAPI = {
  // Clear all data (for month reset)
  async clearAllData() {
    try {
      localStorage.removeItem('checklist_mes_data');
      localStorage.removeItem('vip_daily_status');
      localStorage.removeItem('supervision_semanal_data');
      localStorage.removeItem('registro_errores_data');
      
      const response = await fetch(`${API_BASE_URL}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  },
  // Checklist Mes
  async getChecklist() {
    try {
      // SIEMPRE consultar base de datos primero
      const response = await fetch(`${API_BASE_URL}/checklist`);
      const result = await response.json();
      
      if (result.success) {
        // Si la BD respondió exitosamente, usar sus datos (aunque esté vacío)
        const data = result.data || {};
        localStorage.setItem('checklist_mes_data', JSON.stringify(data));
        return data;
      }
      
      // Solo si el API falla, usar localStorage
      const local = localStorage.getItem('checklist_mes_data');
      return local ? JSON.parse(local) : {};
      
    } catch (error) {
      console.error('Error loading checklist from API:', error);
      // Solo usar localStorage si falla la conexión
      const local = localStorage.getItem('checklist_mes_data');
      return local ? JSON.parse(local) : {};
    }
  },

  async saveChecklist(data: Record<string, string>) {
    try {
      const response = await fetch(`${API_BASE_URL}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await response.json();
      
      // Backup en localStorage
      localStorage.setItem('checklist_mes_data', JSON.stringify(data));
      
      return result.success;
    } catch (error) {
      console.error('Error saving checklist:', error);
      localStorage.setItem('checklist_mes_data', JSON.stringify(data));
      return false;
    }
  },

  // VIP Repaso
  async getVipRepaso() {
    try {
      const response = await fetch(`${API_BASE_URL}/vip-repaso`);
      const result = await response.json();
      
      if (result.success && result.data) {
        localStorage.setItem('vip_repaso_data', JSON.stringify(result.data));
        return result.data;
      }
      
      const local = localStorage.getItem('vip_repaso_data');
      return local ? JSON.parse(local) : {};
      
    } catch (error) {
      console.error('Error loading VIP repaso:', error);
      const local = localStorage.getItem('vip_repaso_data');
      return local ? JSON.parse(local) : {};
    }
  },

  async saveVipRepaso(data: Record<string, string>) {
    try {
      console.log('📤 [VIP-REPASO] Iniciando guardado. Keys:', Object.keys(data).length);
      console.log('📤 [VIP-REPASO] URL:', `${API_BASE_URL}/vip-repaso`);
      console.log('📤 [VIP-REPASO] Sample data:', Object.entries(data).slice(0, 3));
      
      const response = await fetch(`${API_BASE_URL}/vip-repaso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      
      console.log('📡 [VIP-REPASO] Response status:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('📡 [VIP-REPASO] Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ [VIP-REPASO] Failed to parse response:', responseText);
        throw new Error('Invalid JSON response');
      }
      
      console.log('📡 [VIP-REPASO] Parsed result:', result);
      
      if (!response.ok) {
        console.error('❌ [VIP-REPASO] HTTP error:', result);
        localStorage.setItem('vip_repaso_data', JSON.stringify(data));
        return false;
      }
      
      localStorage.setItem('vip_repaso_data', JSON.stringify(data));
      console.log('✅ [VIP-REPASO] Guardado exitoso');
      return result.success;
    } catch (error) {
      console.error('❌ [VIP-REPASO] Error saving VIP repaso:', error);
      localStorage.setItem('vip_repaso_data', JSON.stringify(data));
      return false;
    }
  },

  // Registro de Errores
  async getErrores() {
    try {
      const response = await fetch(`${API_BASE_URL}/errores`);
      const result = await response.json();
      
      if (result.success && result.data) {
        localStorage.setItem('registro_errores_data', JSON.stringify(result.data));
        return result.data;
      }
      
      const local = localStorage.getItem('registro_errores_data');
      return local ? JSON.parse(local) : [];
      
    } catch (error) {
      console.error('Error loading errores:', error);
      const local = localStorage.getItem('registro_errores_data');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveErrores(data: any[]) {
    try {
      const response = await fetch(`${API_BASE_URL}/errores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await response.json();
      
      localStorage.setItem('registro_errores_data', JSON.stringify(data));
      return result.success;
    } catch (error) {
      console.error('Error saving errores:', error);
      localStorage.setItem('registro_errores_data', JSON.stringify(data));
      return false;
    }
  },

  // Supervisión Semanal
  async getSemanal() {
    try {
      const response = await fetch(`${API_BASE_URL}/semanal`);
      const result = await response.json();
      
      if (result.success && result.data) {
        localStorage.setItem('supervision_semanal_data', JSON.stringify(result.data));
        return result.data;
      }
      
      const local = localStorage.getItem('supervision_semanal_data');
      return local ? JSON.parse(local) : [];
      
    } catch (error) {
      console.error('Error loading supervision semanal:', error);
      const local = localStorage.getItem('supervision_semanal_data');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveSemanal(data: any[]) {
    try {
      console.log('📤 [SEMANAL] Iniciando guardado. Registros:', data.length);
      console.log('📤 [SEMANAL] URL:', `${API_BASE_URL}/semanal`);
      console.log('📤 [SEMANAL] Sample data:', data.slice(0, 2));
      
      const response = await fetch(`${API_BASE_URL}/semanal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      
      console.log('📡 [SEMANAL] Response status:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('📡 [SEMANAL] Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ [SEMANAL] Failed to parse response:', responseText);
        throw new Error('Invalid JSON response');
      }
      
      console.log('📡 [SEMANAL] Parsed result:', result);
      
      if (!response.ok) {
        console.error('❌ [SEMANAL] HTTP error:', result);
        localStorage.setItem('supervision_semanal_data', JSON.stringify(data));
        return false;
      }
      
      localStorage.setItem('supervision_semanal_data', JSON.stringify(data));
      console.log('✅ [SEMANAL] Guardado exitoso');
      return result.success;
    } catch (error) {
      console.error('❌ [SEMANAL] Error saving supervision semanal:', error);
      localStorage.setItem('supervision_semanal_data', JSON.stringify(data));
      return false;
    }
  },

  // VIP Fans
  async getVipFans() {
    try {
      const response = await fetch(`${API_BASE_URL}/vip-fans`);
      const result = await response.json();
      
      if (result.success && result.data) {
        localStorage.setItem('vip_fans_list', JSON.stringify(result.data));
        return result.data;
      }
      
      const local = localStorage.getItem('vip_fans_list');
      return local ? JSON.parse(local) : [];
      
    } catch (error) {
      console.error('Error loading VIP fans:', error);
      const local = localStorage.getItem('vip_fans_list');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveVipFan(fan: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/vip-fans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fan)
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving VIP fan:', error);
      return false;
    }
  },

  async deleteVipFan(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/vip-fans?id=${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting VIP fan:', error);
      return false;
    }
  }
};
