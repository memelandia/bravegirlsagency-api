/**
 * API Endpoint: Diagnóstico de Base de Datos
 * GET: /api/supervision/diagnostico
 * Verifica el estado de todas las tablas y conexiones
 */

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostico = {
    timestamp: new Date().toISOString(),
    conexion: 'OK',
    tablas: {},
    errores: []
  };

  try {
    // 1. Verificar que las tablas existen
    const tablas = ['checklist_mes', 'vip_repaso', 'vip_fans', 'registro_errores', 'supervision_semanal'];
    
    for (const tabla of tablas) {
      try {
        // Verificar si la tabla existe
        const { rows: existeTabla } = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tabla}
          )
        `;
        
        const existe = existeTabla[0].exists;
        
        if (existe) {
          // Contar registros
          const { rows: count } = await sql.query(`SELECT COUNT(*) as count FROM ${tabla}`);
          
          // Obtener columnas
          const { rows: columnas } = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = ${tabla}
            ORDER BY ordinal_position
          `;
          
          // Obtener muestra de datos (primeros 2 registros)
          const { rows: muestra } = await sql.query(`SELECT * FROM ${tabla} LIMIT 2`);
          
          diagnostico.tablas[tabla] = {
            existe: true,
            registros: parseInt(count[0].count),
            columnas: columnas.map(c => `${c.column_name} (${c.data_type})`),
            muestra: muestra
          };
        } else {
          diagnostico.tablas[tabla] = {
            existe: false,
            error: 'Tabla no existe en la base de datos'
          };
          diagnostico.errores.push(`⚠️ Tabla ${tabla} no existe`);
        }
      } catch (error) {
        diagnostico.tablas[tabla] = {
          existe: false,
          error: error.message
        };
        diagnostico.errores.push(`❌ Error al verificar ${tabla}: ${error.message}`);
      }
    }

    // 2. Verificar variables de entorno
    diagnostico.env = {
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Configurado' : '❌ No configurado',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? '✅ Configurado' : '❌ No configurado',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? '✅ Configurado' : '❌ No configurado'
    };

    return res.status(200).json({
      success: true,
      diagnostico
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      diagnostico
    });
  }
};
