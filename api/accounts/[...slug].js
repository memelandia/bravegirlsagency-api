// api/accounts/[...slug].js - Catch-all for /api/accounts/* routes
// Handles: /api/accounts/326911669/transactions?start=...&end=...
const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Vercel provides dynamic segments in req.query.slug as an array
        // /api/accounts/326911669/transactions → slug = ['326911669', 'transactions']
        const slug = req.query.slug || [];
        
        console.log('📡 Catch-all slug:', slug);
        console.log('📡 Full URL:', req.url);
        
        if (slug.length >= 2 && slug[1] === 'transactions') {
            const accountId = slug[0];
            return await handleTransactions(req, res, accountId);
        } else if (slug.length >= 2 && slug[1] === 'chargebacks') {
            const accountId = slug[0];
            return await handleChargebacks(req, res, accountId);
        } else {
            return res.status(404).json({ error: 'Endpoint no encontrado', slug });
        }
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};

// Get account transactions with pagination
async function handleTransactions(req, res, accountId) {
    const { start, end, cursor } = req.query;
    
    if (!start || !end) {
        return res.status(400).json({ error: 'Parámetros start y end son requeridos' });
    }
    
    console.log(`📊 Fetching transactions for account ${accountId} (${start} → ${end})`);
    
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
    console.log(`✅ Transactions fetched: ${data.items?.length || 0} items${data.cursor ? ' (has more)' : ''}`);
    return res.status(200).json(data);
}

// Get account chargebacks
async function handleChargebacks(req, res, accountId) {
    const { start, end, cursor } = req.query;
    
    if (!start || !end) {
        return res.status(400).json({ error: 'Parámetros start y end son requeridos' });
    }
    
    console.log(`📊 Fetching chargebacks for account ${accountId}`);
    
    let apiUrl = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/chargebacks?start=${start}&end=${end}&limit=1000`;
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
            error: error.message || 'Error al obtener chargebacks',
            status: response.status
        });
    }
    
    const data = await response.json();
    console.log(`✅ Chargebacks fetched: ${data.items?.length || 0} items`);
    return res.status(200).json(data);
}
