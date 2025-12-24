// api/accounts/[accountId]/transactions.js - Get account transactions
const fetch = require('node-fetch');

const ONLYMONSTER_API_KEY = process.env.ONLYMONSTER_API_KEY || 'om_token_37211a79c42556feab68a2fdfc74c49087008c48b5b81e5b677877fd2c2be9b5';
const ONLYMONSTER_BASE_URL = 'https://omapi.onlymonster.ai';

module.exports = async (req, res) => {
    const { accountId } = req.query;
    const { start, end } = req.query;
    
    console.log(`📊 Fetching transactions for account ${accountId}`);
    
    try {
        const url = `${ONLYMONSTER_BASE_URL}/api/v0/platforms/onlyfans/accounts/${accountId}/transactions?start=${start}&end=${end}&limit=1000`;
        
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
                error: error.message || 'Error al obtener datos de OnlyMonster',
                status: response.status
            });
        }
        
        const data = await response.json();
        console.log('✅ Data fetched successfully');
        res.status(200).json(data);
        
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};
