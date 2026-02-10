// api/accounts.js - Consolidated accounts endpoint
// Routes:
//   GET /accounts - list all accounts
//   GET /accounts/:accountId/transactions - get account transactions
const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Route: if accountId query param is present, fetch transactions
        // Otherwise, list all accounts
        const { accountId } = req.query;
        
        if (accountId) {
            return await handleTransactions(req, res, accountId);
        } else {
            return await handleListAccounts(req, res);
        }
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};

// List all accounts
async function handleListAccounts(req, res) {
    console.log('📋 Fetching accounts list');
    
    const url = `${ONLYMONSTER_BASE_URL}/api/v0/accounts?limit=100`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-om-auth-token': ONLYMONSTER_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('❌ OnlyMonster API Error:', response.status, error);
        return res.status(response.status).json({
            error: error.message || 'Error al obtener cuentas',
            status: response.status
        });
    }
    
    const data = await response.json();
    console.log('✅ Accounts fetched successfully');
    return res.status(200).json(data);
}

// Get account transactions with pagination support
async function handleTransactions(req, res, accountId) {
    const { start, end, cursor } = req.query;
    
    console.log(`📊 Fetching transactions for account ${accountId}`);
    
    // Build URL with optional cursor for pagination
    let apiUrl = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/transactions?start=${start}&end=${end}&limit=1000`;
    if (cursor) {
        apiUrl += `&cursor=${cursor}`;
    }
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'x-om-auth-token': ONLYMONSTER_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('❌ OnlyMonster API Error:', response.status, error);
        return res.status(response.status).json({
            error: error.message || 'Error al obtener datos de OnlyMonster',
            status: response.status
        });
    }
    
    const data = await response.json();
    console.log(`✅ Data fetched: ${data.items?.length || 0} transactions${data.cursor ? ' (has more pages)' : ''}`);
    return res.status(200).json(data);
}
