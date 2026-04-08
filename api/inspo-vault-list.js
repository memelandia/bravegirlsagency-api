// api/inspo-vault-list.js - List Inspo Vault entries from Notion
// GET /api/inspo-vault-list

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = 'c2623a10218442198f206f75792bc251';
const NOTION_VERSION = '2022-06-28';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

    try {
        const allResults = [];
        let hasMore = true;
        let startCursor = undefined;

        while (hasMore) {
            const body = {
                page_size: 100,
                sorts: [{ timestamp: 'created_time', direction: 'descending' }]
            };
            if (startCursor) body.start_cursor = startCursor;

            const response = await fetch(
                `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${NOTION_TOKEN}`,
                        'Notion-Version': NOTION_VERSION,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('Notion API error:', response.status, err);
                return res.status(response.status).json({
                    error: err.message || 'Error querying Notion',
                    status: response.status
                });
            }

            const data = await response.json();
            allResults.push(...data.results);
            hasMore = data.has_more;
            startCursor = data.next_cursor;
        }

        const entries = allResults.map(page => parseNotionPage(page));

        return res.status(200).json({
            success: true,
            count: entries.length,
            entries
        });
    } catch (error) {
        console.error('inspo-vault-list error:', error);
        return res.status(500).json({ error: error.message });
    }
};

function parseNotionPage(page) {
    const p = page.properties;
    return {
        id: page.id,
        idea: getTitle(p['Idea']),
        mercado: getSelect(p['Mercado']),
        link: getUrl(p['Link del reel']),
        vertical: getMultiSelect(p['Vertical']),
        paraModelo: getMultiSelect(p['Para Modelo']),
        branding: getMultiSelect(p['Branding']),
        elementoViral: getMultiSelect(p['Elemento Viral']),
        estado: getSelect(p['Estado']),
        contextoBranding: getRichText(p['Contexto de Branding']),
        elementosVirales: getRichText(p['Elementos Virales']),
        createdTime: page.created_time
    };
}

function getTitle(prop) {
    if (!prop || !prop.title || !prop.title.length) return '';
    return prop.title.map(t => t.plain_text).join('');
}

function getSelect(prop) {
    if (!prop || !prop.select) return '';
    return prop.select.name || '';
}

function getMultiSelect(prop) {
    if (!prop || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
}

function getUrl(prop) {
    if (!prop || !prop.url) return '';
    return prop.url;
}

function getRichText(prop) {
    if (!prop || !prop.rich_text || !prop.rich_text.length) return '';
    return prop.rich_text.map(t => t.plain_text).join('');
}
