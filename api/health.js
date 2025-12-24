// api/health.js - Health check endpoint
module.exports = (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'BraveGirls Proxy Server is running',
        onlymonster_configured: !!process.env.ONLYMONSTER_API_KEY
    });
};
