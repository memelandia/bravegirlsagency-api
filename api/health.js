// api/health.js - Health check endpoint
module.exports = (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    res.status(200).json({
        status: 'ok',
        message: 'BraveGirls Proxy Server is running',
        onlymonster_configured: !!process.env.ONLYMONSTER_API_KEY
    });
};
