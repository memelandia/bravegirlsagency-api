// api/sheets/[spreadsheetId]/[gid].js - Google Sheets proxy
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { spreadsheetId, gid } = req.query;
    const apiKey = req.query.apiKey;
    
    console.log(`📊 Fetching Google Sheets data: ${spreadsheetId} / GID: ${gid}`);
    
    try {
        // Get sheet metadata to find sheet name from GID
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
        
        const metadataResponse = await fetch(metadataUrl);
        if (!metadataResponse.ok) {
            throw new Error(`Sheets API Error: ${metadataResponse.status}`);
        }
        
        const metadata = await metadataResponse.json();
        const sheet = metadata.sheets.find(s => s.properties.sheetId === parseInt(gid));
        
        if (!sheet) {
            throw new Error(`Sheet with GID ${gid} not found`);
        }
        
        const sheetName = sheet.properties.title;
        console.log(`📄 Sheet name: ${sheetName}`);
        
        // Get sheet data
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
        
        const dataResponse = await fetch(dataUrl);
        if (!dataResponse.ok) {
            const error = await dataResponse.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${dataResponse.status}`);
        }
        
        const data = await dataResponse.json();
        console.log('✅ Google Sheets data fetched successfully');
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('❌ Google Sheets Error:', error);
        res.status(500).json({
            error: 'Error al obtener datos de Google Sheets',
            message: error.message
        });
    }
};
