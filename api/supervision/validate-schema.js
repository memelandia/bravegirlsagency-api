/**
 * API Endpoint: Validación Completa de Esquema
 * GET: /api/supervision/validate-schema
 * Compara la estructura esperada vs la estructura real en NeonTech
 */

const { sql } = require('@vercel/postgres');

// Esquemas esperados por el backend
const EXPECTED_SCHEMAS = {
  checklist_mes: {
    id: 'integer',
    key: 'text',
    status: 'text',
    updated_at: 'timestamp without time zone'
  },
  vip_repaso: {
    id: 'integer',
    key: 'text',
    status: 'text',
    updated_at: 'timestamp without time zone'
  },
  vip_fans: {
    id: 'text',
    name: 'text',
    account: 'text',
    type: 'text',
    chat_link: 'text',
    created_at: 'timestamp without time zone'
  },
  registro_errores: {
    id: 'text',
    fecha: 'date',
    cuenta: 'text',
    chatter: 'text',
    tipo: 'text',
    gravedad: 'text',
    detalle: 'text',
    traslado: 'text',
    estado: 'text',
    link: 'text',
    created_at: 'timestamp without time zone'
  },
  supervision_semanal: {
    id: 'text',
    mes: 'text',
    semana: 'text',
    week_index: 'integer',
    chatter: 'text',
    cuenta: 'text',
    facturacion: 'text',
    nuevos_fans: 'text',
    meta_semanal: 'text',
    meta_mensual: 'text',
    meta_facturacion: 'text',
    facturacion_mensual_objetivo: 'text',
    posteos: 'text',
    historias: 'text',
    pendientes: 'text',
    resueltos: 'text',
    impacto: 'text',
    tiempo_respuesta: 'text',
    estado_objetivo: 'text',
    updated_at: 'timestamp without time zone'
  }
};

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

  const validacion = {
    timestamp: new Date().toISOString(),
    tablas: {},
    errores: [],
    warnings: [],
    resumen: {
      tablasCorrectas: 0,
      tablasConErrores: 0,
      tablasFaltantes: 0,
      columnasFaltantes: 0,
      tiposIncorrectos: 0
    }
  };

  try {
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMAS)) {
      const tableValidation = {
        existe: false,
        estructura: {},
        columnasFaltantes: [],
        columnasExtra: [],
        tiposIncorrectos: [],
        indices: [],
        constraints: []
      };

      try {
        // 1. Verificar si la tabla existe
        const { rows: tableExists } = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          )
        `;

        if (!tableExists[0].exists) {
          tableValidation.existe = false;
          validacion.errores.push(`❌ Tabla ${tableName} NO EXISTE`);
          validacion.resumen.tablasFaltantes++;
          validacion.tablas[tableName] = tableValidation;
          continue;
        }

        tableValidation.existe = true;

        // 2. Obtener estructura actual
        const { rows: columns } = await sql`
          SELECT 
            column_name, 
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `;

        // Convertir a objeto para fácil comparación
        const actualColumns = {};
        columns.forEach(col => {
          actualColumns[col.column_name] = col.data_type;
          tableValidation.estructura[col.column_name] = {
            tipo: col.data_type,
            nullable: col.is_nullable,
            default: col.column_default
          };
        });

        // 3. Comparar columnas esperadas vs actuales
        for (const [colName, expectedType] of Object.entries(expectedColumns)) {
          if (!actualColumns[colName]) {
            tableValidation.columnasFaltantes.push(colName);
            validacion.errores.push(`❌ ${tableName}.${colName} FALTA`);
            validacion.resumen.columnasFaltantes++;
          } else if (actualColumns[colName] !== expectedType) {
            tableValidation.tiposIncorrectos.push({
              columna: colName,
              esperado: expectedType,
              actual: actualColumns[colName]
            });
            validacion.warnings.push(
              `⚠️ ${tableName}.${colName} tipo incorrecto: esperado ${expectedType}, actual ${actualColumns[colName]}`
            );
            validacion.resumen.tiposIncorrectos++;
          }
        }

        // 4. Columnas extra (que no están en el esquema esperado)
        for (const colName of Object.keys(actualColumns)) {
          if (!expectedColumns[colName]) {
            tableValidation.columnasExtra.push(colName);
          }
        }

        // 5. Obtener índices
        const { rows: indexes } = await sql`
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE tablename = ${tableName}
        `;
        tableValidation.indices = indexes;

        // 6. Obtener constraints
        const { rows: constraints } = await sql`
          SELECT
            con.conname AS constraint_name,
            con.contype AS constraint_type
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = ${tableName}
        `;
        tableValidation.constraints = constraints;

        // 7. Verificar integridad
        if (tableValidation.columnasFaltantes.length === 0 && 
            tableValidation.tiposIncorrectos.length === 0) {
          validacion.resumen.tablasCorrectas++;
        } else {
          validacion.resumen.tablasConErrores++;
        }

      } catch (error) {
        tableValidation.error = error.message;
        validacion.errores.push(`❌ Error al validar ${tableName}: ${error.message}`);
        validacion.resumen.tablasConErrores++;
      }

      validacion.tablas[tableName] = tableValidation;
    }

    // Resumen final
    const totalTablas = Object.keys(EXPECTED_SCHEMAS).length;
    validacion.resumen.porcentajeOk = Math.round(
      (validacion.resumen.tablasCorrectas / totalTablas) * 100
    );

    validacion.resultado = validacion.resumen.tablasCorrectas === totalTablas 
      ? '✅ TODAS LAS TABLAS CORRECTAS'
      : '⚠️ HAY PROBLEMAS EN EL ESQUEMA';

    return res.status(200).json({
      success: true,
      validacion
    });

  } catch (error) {
    console.error('❌ Error en validación:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
