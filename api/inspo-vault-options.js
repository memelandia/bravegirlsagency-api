// api/inspo-vault-options.js - Manage dynamic multi_select options for Branding & Elemento Viral
// GET  /api/inspo-vault-options → returns current options from Notion DB schema
// POST /api/inspo-vault-options → adds a new option to a property
//   body: { property: "Branding" | "Elemento Viral", value: "New Tag Name" }

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = 'c2623a10218442198f206f75792bc251';
const NOTION_VERSION = '2022-06-28';

const ALLOWED_PROPERTIES = ['Branding', 'Elemento Viral'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

    if (req.method === 'GET') {
        return await handleGetOptions(req, res);
    } else if (req.method === 'POST') {
        return await handleAddOption(req, res);
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

async function handleGetOptions(req, res) {
    try {
        const response = await fetch(
            `https://api.notion.com/v1/databases/${DATABASE_ID}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': NOTION_VERSION
                }
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: err.message || 'Error fetching database schema'
            });
        }

        const db = await response.json();
        const props = db.properties;

        const options = {};
        for (const propName of ALLOWED_PROPERTIES) {
            if (props[propName] && props[propName].multi_select) {
                options[propName] = props[propName].multi_select.options.map(o => o.name);
            } else {
                options[propName] = [];
            }
        }

        // Also return Vertical and Para Modelo options for filters
        if (props['Vertical'] && props['Vertical'].multi_select) {
            options['Vertical'] = props['Vertical'].multi_select.options.map(o => o.name);
        }
        if (props['Para Modelo'] && props['Para Modelo'].multi_select) {
            options['Para Modelo'] = props['Para Modelo'].multi_select.options.map(o => o.name);
        }

        return res.status(200).json({ success: true, options });
    } catch (error) {
        console.error('inspo-vault-options GET error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function handleAddOption(req, res) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { property, value } = body;

        if (!property || !value) {
            return res.status(400).json({ error: 'Missing property or value' });
        }

        if (!ALLOWED_PROPERTIES.includes(property)) {
            return res.status(400).json({
                error: `Property must be one of: ${ALLOWED_PROPERTIES.join(', ')}`
            });
        }

        const trimmedValue = value.trim();
        if (!trimmedValue) {
            return res.status(400).json({ error: 'Value cannot be empty' });
        }

        // First, get current options to check for duplicates
        const getResponse = await fetch(
            `https://api.notion.com/v1/databases/${DATABASE_ID}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': NOTION_VERSION
                }
            }
        );

        if (!getResponse.ok) {
            const err = await getResponse.json().catch(() => ({}));
            return res.status(getResponse.status).json({
                error: err.message || 'Error fetching database'
            });
        }

        const db = await getResponse.json();
        const existingOptions = db.properties[property]?.multi_select?.options || [];
        const alreadyExists = existingOptions.some(
            o => o.name.toLowerCase() === trimmedValue.toLowerCase()
        );

        if (alreadyExists) {
            return res.status(200).json({
                success: true,
                message: 'Option already exists',
                options: existingOptions.map(o => o.name)
            });
        }

        // Add the new option via PATCH to database
        const newOptions = [...existingOptions.map(o => ({ name: o.name })), { name: trimmedValue }];

        const patchResponse = await fetch(
            `https://api.notion.com/v1/databases/${DATABASE_ID}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': NOTION_VERSION,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    properties: {
                        [property]: {
                            multi_select: {
                                options: newOptions
                            }
                        }
                    }
                })
            }
        );

        if (!patchResponse.ok) {
            const err = await patchResponse.json().catch(() => ({}));
            console.error('Notion PATCH error:', patchResponse.status, err);
            return res.status(patchResponse.status).json({
                error: err.message || 'Error adding option to Notion'
            });
        }

        const updated = await patchResponse.json();
        const updatedOptions = updated.properties[property]?.multi_select?.options || [];

        return res.status(200).json({
            success: true,
            message: 'Option added',
            options: updatedOptions.map(o => o.name)
        });
    } catch (error) {
        console.error('inspo-vault-options POST error:', error);
        return res.status(500).json({ error: error.message });
    }
}
