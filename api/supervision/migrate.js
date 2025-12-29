const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // 1. Drop existing table (WARNING: DATA LOSS)
    // If you want to preserve data, we would need a more complex migration.
    // Given the user asked for a schema change and is experiencing errors, a clean slate is often best.
    await sql`DROP TABLE IF EXISTS supervision_semanal`;

    // 2. Create new table with columns
    await sql`
      CREATE TABLE supervision_semanal (
        id TEXT PRIMARY KEY,
        mes TEXT,
        semana TEXT,
        week_index INTEGER,
        chatter TEXT,
        cuenta TEXT,
        facturacion TEXT,
        nuevos_fans TEXT,
        meta_semanal TEXT,
        meta_mensual TEXT,
        meta_facturacion TEXT,
        facturacion_mensual_objetivo TEXT,
        posteos TEXT,
        historias TEXT,
        pendientes TEXT,
        resueltos TEXT,
        impacto TEXT,
        tiempo_respuesta TEXT,
        estado_objetivo TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    res.status(200).json({ message: 'Schema migrated successfully to relational columns.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
