/**
 * API Endpoint: /api/onlymonster/config
 *
 * Devuelve la lista de cuentas (accounts) y miembros (members) registrados
 * en OnlyMonster.  Se consume desde el hook useOMConfig del frontend para
 * reemplazar la configuración hardcodeada de chatters y modelos.
 *
 * GET /api/onlymonster/config
 * → { success: true, data: { accounts: [...], members: [...] } }
 */

const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY =
  process.env.ONLYMONSTER_API_KEY ||
  'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

const HEADERS = {
  'x-om-auth-token': ONLYMONSTER_API_KEY,
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

// ───────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET', headers: HEADERS });
      if (response.ok) return await response.json();

      if (response.status === 429 || response.status >= 500) {
        const wait = attempt * 2000;
        console.warn(`⚠️ config ${url} attempt ${attempt}: HTTP ${response.status}, waiting ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(`OnlyMonster HTTP ${response.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

async function fetchAllAccounts() {
  // /api/v0/accounts does not paginate — returns all accounts in one call
  const result = await fetchWithRetry(`${ONLYMONSTER_BASE_URL}/api/v0/accounts`);
  const raw = result.accounts || result.items || [];
  return raw.map(a => ({
    id: a.id,
    platform_account_id: String(a.platform_account_id ?? a.id),
    name: a.name || '',
    username: a.username || '',
    avatar: a.avatar || ''
  }));
}

async function fetchAllMembers() {
  const PAGE_SIZE = 50;
  let offset = 0;
  let all = [];

  while (true) {
    const url = `${ONLYMONSTER_BASE_URL}/api/v0/members?limit=${PAGE_SIZE}&offset=${offset}`;
    const result = await fetchWithRetry(url);
    const users = result.users || result.items || [];
    all = all.concat(
      users.map(u => ({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        avatar: u.avatar || ''
      }))
    );
    if (users.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

// ───────────────────────────────────────────
// Handler
// ───────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const [accounts, members] = await Promise.all([
      fetchAllAccounts(),
      fetchAllMembers()
    ]);

    return res.status(200).json({
      success: true,
      data: { accounts, members },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in /api/onlymonster/config:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
