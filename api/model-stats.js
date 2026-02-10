// api/model-stats.js - Dedicated endpoint for model dashboard stats
// Usage: GET /api/model-stats?accountId=326911669&start=...&end=...
const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { accountId, start, end, cursor } = req.query;

    if (!accountId || !start || !end) {
        return res.status(400).json({ 
            error: 'Parámetros requeridos: accountId, start, end' 
        });
    }

    try {
        let apiUrl = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/transactions?start=${start}&end=${end}&limit=1000`;
        if (cursor) {
            apiUrl += `&cursor=${encodeURIComponent(cursor)}`;
        }

        console.log(`📊 model-stats: account=${accountId}, ${start} → ${end}${cursor ? ' (cursor)' : ''}`);

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
            console.error('❌ OnlyMonster Error:', response.status, error);
            return res.status(response.status).json({
                error: error.message || `OnlyMonster API Error: ${response.status}`,
                status: response.status
            });
        }

        const data = await response.json();
        console.log(`✅ ${data.items?.length || 0} transactions${data.cursor ? ' (more pages)' : ''}`);
        return res.status(200).json(data);

    } catch (error) {
        console.error('❌ Server Error:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};
