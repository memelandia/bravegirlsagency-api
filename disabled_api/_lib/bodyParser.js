// ===================================================================
// Helper para parsear body de requests
// Vercel no parsea JSON automáticamente
// ===================================================================

/**
 * Parsear body de request
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        // Si el body está vacío, retornar objeto vacío
        if (!body || body.trim() === '') {
          resolve({});
          return;
        }
        
        // Si es JSON, parsearlo
        if (req.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(body));
        } else {
          // Si no es JSON, retornar como texto
          resolve({ raw: body });
        }
      } catch (error) {
        reject(error);
      }
    });
    
    req.on('error', reject);
  });
}

module.exports = { parseBody };
