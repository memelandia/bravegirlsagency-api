// api/inspo-vault-create.js - Create new Inspo Vault entry in Notion
// POST /api/inspo-vault-create

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = 'c2623a10218442198f206f75792bc251';
const NOTION_VERSION = '2022-06-28';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { idea, mercado, link, vertical, paraModelo, branding, elementoViral } = body;

        if (!idea || !idea.trim()) {
            return res.status(400).json({ error: 'El campo "idea" es obligatorio' });
        }

        const properties = {
            'Idea': {
                title: [{ text: { content: idea.trim() } }]
            }
        };

        if (mercado) {
            properties['Mercado'] = { select: { name: mercado } };
        }

        if (link) {
            properties['Link del reel'] = { url: link };
        }

        if (vertical && vertical.length > 0) {
            properties['Vertical'] = {
                multi_select: vertical.map(v => ({ name: v }))
            };
        }

        if (paraModelo && paraModelo.length > 0) {
            properties['Para Modelo'] = {
                multi_select: paraModelo.map(m => ({ name: m }))
            };
        }

        if (branding && branding.length > 0) {
            properties['Branding'] = {
                multi_select: branding.map(b => ({ name: b }))
            };
        }

        if (elementoViral && elementoViral.length > 0) {
            properties['Elemento Viral'] = {
                multi_select: elementoViral.map(e => ({ name: e }))
            };
        }

        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: DATABASE_ID },
                properties
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Notion create error:', response.status, err);
            return res.status(response.status).json({
                error: err.message || 'Error creating page in Notion',
                status: response.status
            });
        }

        const page = await response.json();

        return res.status(201).json({
            success: true,
            entry: parseNotionPage(page)
        });
    } catch (error) {
        console.error('inspo-vault-create error:', error);
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
