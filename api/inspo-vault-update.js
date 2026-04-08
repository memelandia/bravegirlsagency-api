// api/inspo-vault-update.js - Update an Inspo Vault entry in Notion
// PATCH /api/inspo-vault-update?id=<page_id>

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

    try {
        const pageId = req.query.id;
        if (!pageId) {
            return res.status(400).json({ error: 'Missing page id' });
        }

        // Validate pageId format (Notion UUID)
        if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pageId)) {
            return res.status(400).json({ error: 'Invalid page id format' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { idea, mercado, link, vertical, paraModelo, branding, elementoViral } = body;

        const properties = {};

        if (idea !== undefined) {
            properties['Idea'] = {
                title: [{ text: { content: idea.trim() } }]
            };
        }

        if (mercado !== undefined) {
            properties['Mercado'] = mercado ? { select: { name: mercado } } : { select: null };
        }

        if (link !== undefined) {
            properties['Link del reel'] = { url: link || null };
        }

        if (vertical !== undefined) {
            properties['Vertical'] = {
                multi_select: (vertical || []).map(v => ({ name: v }))
            };
        }

        if (paraModelo !== undefined) {
            properties['Para Modelo'] = {
                multi_select: (paraModelo || []).map(m => ({ name: m }))
            };
        }

        if (branding !== undefined) {
            properties['Branding'] = {
                multi_select: (branding || []).map(b => ({ name: b }))
            };
        }

        if (elementoViral !== undefined) {
            properties['Elemento Viral'] = {
                multi_select: (elementoViral || []).map(e => ({ name: e }))
            };
        }

        if (Object.keys(properties).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Notion update error:', response.status, err);
            return res.status(response.status).json({
                error: err.message || 'Error updating page in Notion',
                status: response.status
            });
        }

        const page = await response.json();

        return res.status(200).json({
            success: true,
            entry: parseNotionPage(page)
        });
    } catch (error) {
        console.error('inspo-vault-update error:', error);
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
