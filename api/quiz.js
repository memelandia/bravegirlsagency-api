/**
 * API Endpoint: /api/quiz
 * Quiz interno para chatters de BraveGirls.
 *
 *   POST /api/quiz
 *     Body: { chatterName, account, score, totalQuestions, totalSeconds,
 *             tabSwitches, answers, startedAt }
 *     Sin auth. Inserta en chatter_quiz_attempts.
 *     -> { success: true, id }
 *
 *   GET  /api/quiz?admin=1
 *     Header: X-Admin-Token: <password>
 *     Devuelve los últimos 500 intentos.
 *     -> { success: true, data: [...] }
 *
 *   GET  /api/quiz   (sin admin=1)  -> 405
 *
 * Tabla esperada:
 *   CREATE TABLE chatter_quiz_attempts (
 *     id BIGSERIAL PRIMARY KEY,
 *     chatter_name VARCHAR(120) NOT NULL,
 *     account VARCHAR(120) NOT NULL,
 *     score INTEGER NOT NULL,
 *     total_questions INTEGER NOT NULL,
 *     total_seconds INTEGER NOT NULL,
 *     tab_switches INTEGER NOT NULL DEFAULT 0,
 *     answers JSONB NOT NULL,
 *     started_at TIMESTAMP NOT NULL,
 *     finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *   );
 */

const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ─── POST: submit attempt (público) ───
    if (req.method === 'POST') {
      const b = req.body || {};
      const chatterName = String(b.chatterName || '').trim();
      const account = String(b.account || '').trim();
      const score = Number(b.score);
      const totalQuestions = Number(b.totalQuestions);
      const totalSeconds = Number(b.totalSeconds);
      const tabSwitches = Number(b.tabSwitches || 0);
      const answers = Array.isArray(b.answers) ? b.answers : [];
      const startedAt = b.startedAt ? new Date(b.startedAt) : new Date();

      // Validaciones
      if (!chatterName || chatterName.length < 2) {
        return res.status(400).json({ success: false, error: 'chatterName requerido (mínimo 2 caracteres)' });
      }
      if (!account || account.length < 2) {
        return res.status(400).json({ success: false, error: 'account requerido (mínimo 2 caracteres)' });
      }
      if (chatterName.length > 120 || account.length > 120) {
        return res.status(400).json({ success: false, error: 'chatterName/account demasiado largos (máx 120)' });
      }
      if (!Number.isFinite(score) || !Number.isFinite(totalQuestions) || !Number.isFinite(totalSeconds)) {
        return res.status(400).json({ success: false, error: 'score/totalQuestions/totalSeconds deben ser numéricos' });
      }
      if (score < 0 || score > totalQuestions || totalQuestions <= 0) {
        return res.status(400).json({ success: false, error: 'score inválido respecto a totalQuestions' });
      }
      if (totalSeconds < 0 || totalSeconds > 24 * 3600) {
        return res.status(400).json({ success: false, error: 'totalSeconds fuera de rango' });
      }
      if (!Number.isFinite(tabSwitches) || tabSwitches < 0) {
        return res.status(400).json({ success: false, error: 'tabSwitches inválido' });
      }
      if (isNaN(startedAt.getTime())) {
        return res.status(400).json({ success: false, error: 'startedAt inválido' });
      }

      const answersJson = JSON.stringify(answers);

      const { rows } = await sql`
        INSERT INTO chatter_quiz_attempts
          (chatter_name, account, score, total_questions, total_seconds, tab_switches, answers, started_at, finished_at)
        VALUES
          (${chatterName}, ${account}, ${score}, ${totalQuestions}, ${totalSeconds}, ${tabSwitches}, ${answersJson}::jsonb, ${startedAt.toISOString()}, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      return res.status(200).json({ success: true, id: rows[0]?.id });
    }

    // ─── GET ?admin=1: listar resultados (password requerida) ───
    if (req.method === 'GET') {
      const isAdmin = req.query.admin === '1' || req.query.admin === 'true';
      if (!isAdmin) {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }

      const expected = process.env.QUIZ_ADMIN_PASSWORD;
      if (!expected) {
        return res.status(500).json({ success: false, error: 'QUIZ_ADMIN_PASSWORD env var no configurada' });
      }

      const token = req.headers['x-admin-token'];
      if (!token || token !== expected) {
        return res.status(401).json({ success: false, error: 'unauthorized' });
      }

      const { rows } = await sql`
        SELECT id, chatter_name, account, score, total_questions, total_seconds,
               tab_switches, started_at, finished_at
        FROM chatter_quiz_attempts
        ORDER BY finished_at DESC
        LIMIT 500
      `;

      const data = rows.map(r => ({
        id: Number(r.id),
        chatterName: r.chatter_name,
        account: r.account,
        score: r.score,
        totalQuestions: r.total_questions,
        totalSeconds: r.total_seconds,
        tabSwitches: r.tab_switches,
        startedAt: r.started_at,
        finishedAt: r.finished_at
      }));

      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('quiz API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database error',
      details: error.message,
      hint: 'Verificá que la tabla chatter_quiz_attempts exista en Vercel Postgres'
    });
  }
};
