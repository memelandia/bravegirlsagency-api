// api/avatar.js - Proxy for unavatar.io (requires x-api-key header)
const UNAVATAR_KEY = process.env.UNAVATAR_KEY;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const username = req.query.u;
    if (!username || !/^[a-zA-Z0-9_.]+$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username' });
    }

    if (!UNAVATAR_KEY) {
        return res.status(500).json({ error: 'UNAVATAR_KEY not configured' });
    }

    try {
        const url = `https://unavatar.io/instagram/${username}?ttl=7d`;
        const response = await fetch(url, {
            headers: { 'x-api-key': UNAVATAR_KEY }
        });

        if (!response.ok) {
            return res.status(response.status).end();
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days browser cache
        res.status(200).send(Buffer.from(buffer));
    } catch (err) {
        res.status(502).json({ error: 'Avatar fetch failed' });
    }
};
