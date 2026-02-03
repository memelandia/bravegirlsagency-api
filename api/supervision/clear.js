/**
 * API Endpoint: Clear All Supervision Data (Month Reset)
 * Limpia todos los datos de supervisión para iniciar nuevo mes
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Limpiar todas las tablas de supervisión
    await sql`DELETE FROM supervision_checklist`;
    await sql`DELETE FROM supervision_semanal`;
    await sql`DELETE FROM supervision_vip_repaso`;
    await sql`DELETE FROM supervision_errores WHERE estado = 'Corregido'`;
    // Mantener errores abiertos
    
    console.log('✅ Supervision data cleared successfully');
    
    return res.status(200).json({
      success: true,
      message: 'All supervision data cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error clearing supervision data:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
