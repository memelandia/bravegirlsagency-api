// api/inspo-vault.js - Consolidated Inspo Vault router
// Routes via ?action= query param:
//   GET  ?action=list    → list all entries
//   GET  ?action=options → get multi_select options from DB schema
//   POST ?action=create  → create new entry
//   POST ?action=options → add new option to Branding/Elemento Viral
//   POST ?action=setup   → one-time: create Branding & Elemento Viral properties
//   PATCH ?action=update&id=<page_id> → update entry
//   POST ?action=check   → verify Instagram profile URLs
//   POST ?action=delete  → archive a Notion page

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = 'c2623a10218442198f206f75792bc251';
const NOTION_VERSION = '2022-06-28';
const ALLOWED_PROPERTIES = ['Branding', 'Elemento Viral', 'Vertical', 'Para Modelo'];

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

    const action = req.query.action || '';

    try {
        // Parse body for POST/PATCH
        let body = {};
        if (['POST', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        switch (action) {
            case 'list':
                if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for list' });
                return await handleList(req, res);

            case 'create':
                if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for create' });
                return await handleCreate(req, res, body);

            case 'update':
                if (req.method !== 'PATCH') return res.status(405).json({ error: 'Use PATCH for update' });
                return await handleUpdate(req, res, body);

            case 'options':
                if (req.method === 'GET') return await handleGetOptions(req, res);
                if (req.method === 'POST') return await handleAddOption(req, res, body);
                return res.status(405).json({ error: 'Use GET or POST for options' });

            case 'setup':
                if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for setup' });
                return await handleSetup(req, res);

            case 'check':
                if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for check' });
                return await handleCheck(req, res, body);

            case 'delete':
                if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for delete' });
                return await handleDelete(req, res, body);

            case 'manage-options':
                if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for manage-options' });
                return await handleManageOptions(req, res, body);

            case 'avatar':
                if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for avatar' });
                return await handleAvatar(req, res);

            default:
                return res.status(400).json({
                    error: 'Missing or invalid action parameter',
                    valid: ['list', 'create', 'update', 'options', 'setup', 'check', 'delete', 'manage-options', 'avatar']
                });
        }
    } catch (error) {
        console.error('inspo-vault error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// ─── LIST ─────────────────────────────────────────────
async function handleList(req, res) {
    const allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const body = {
            page_size: 100,
            sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        };
        if (startCursor) body.start_cursor = startCursor;

        const response = await notionFetch(
            `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
            'POST', body
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err.message || 'Error querying Notion' });
        }

        const data = await response.json();
        allResults.push(...data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return res.status(200).json({
        success: true,
        count: allResults.length,
        entries: allResults.map(parseNotionPage)
    });
}

// ─── CREATE ───────────────────────────────────────────
async function handleCreate(req, res, body) {
    const { idea, mercado, link, vertical, paraModelo, branding, elementoViral, favorito, notas } = body;

    if (!idea || !idea.trim()) {
        return res.status(400).json({ error: 'El campo "idea" es obligatorio' });
    }

    const properties = {
        'Idea': { title: [{ text: { content: idea.trim() } }] }
    };

    if (mercado) properties['Mercado'] = { select: { name: mercado } };
    if (link) properties['Link del reel'] = { url: link };
    if (vertical && vertical.length) properties['Vertical'] = { multi_select: vertical.map(v => ({ name: v })) };
    if (paraModelo && paraModelo.length) properties['Para Modelo'] = { multi_select: paraModelo.map(m => ({ name: m })) };
    if (branding && branding.length) properties['Branding'] = { multi_select: branding.map(b => ({ name: b })) };
    if (elementoViral && elementoViral.length) properties['Elemento Viral'] = { multi_select: elementoViral.map(e => ({ name: e })) };
    if (favorito !== undefined) properties['Favorito'] = { checkbox: !!favorito };
    if (notas !== undefined) properties['Notas'] = { rich_text: notas ? [{ text: { content: notas } }] : [] };

    const response = await notionFetch('https://api.notion.com/v1/pages', 'POST', {
        parent: { database_id: DATABASE_ID },
        properties
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Error creating page' });
    }

    const page = await response.json();
    return res.status(201).json({ success: true, entry: parseNotionPage(page) });
}

// ─── UPDATE ───────────────────────────────────────────
async function handleUpdate(req, res, body) {
    const pageId = req.query.id;
    if (!pageId) return res.status(400).json({ error: 'Missing page id' });

    if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pageId)) {
        return res.status(400).json({ error: 'Invalid page id format' });
    }

    const { idea, mercado, link, vertical, paraModelo, branding, elementoViral, favorito, notas } = body;
    const properties = {};

    if (idea !== undefined) properties['Idea'] = { title: [{ text: { content: idea.trim() } }] };
    if (mercado !== undefined) properties['Mercado'] = mercado ? { select: { name: mercado } } : { select: null };
    if (link !== undefined) properties['Link del reel'] = { url: link || null };
    if (vertical !== undefined) properties['Vertical'] = { multi_select: (vertical || []).map(v => ({ name: v })) };
    if (paraModelo !== undefined) properties['Para Modelo'] = { multi_select: (paraModelo || []).map(m => ({ name: m })) };
    if (branding !== undefined) properties['Branding'] = { multi_select: (branding || []).map(b => ({ name: b })) };
    if (elementoViral !== undefined) properties['Elemento Viral'] = { multi_select: (elementoViral || []).map(e => ({ name: e })) };
    if (favorito !== undefined) properties['Favorito'] = { checkbox: !!favorito };
    if (notas !== undefined) properties['Notas'] = { rich_text: notas ? [{ text: { content: notas } }] : [] };

    if (Object.keys(properties).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    const response = await notionFetch(`https://api.notion.com/v1/pages/${pageId}`, 'PATCH', { properties });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Error updating page' });
    }

    const page = await response.json();
    return res.status(200).json({ success: true, entry: parseNotionPage(page) });
}

// ─── GET OPTIONS ──────────────────────────────────────
async function handleGetOptions(req, res) {
    const response = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'GET'
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Error fetching schema' });
    }

    const db = await response.json();
    const props = db.properties;
    const options = {};

    for (const name of [...ALLOWED_PROPERTIES, 'Vertical', 'Para Modelo']) {
        if (props[name] && props[name].multi_select) {
            options[name] = props[name].multi_select.options.map(o => o.name);
        } else {
            options[name] = [];
        }
    }

    return res.status(200).json({ success: true, options });
}

// ─── ADD OPTION ───────────────────────────────────────
async function handleAddOption(req, res, body) {
    const { property, value } = body;

    if (!property || !value) return res.status(400).json({ error: 'Missing property or value' });
    if (!ALLOWED_PROPERTIES.includes(property)) {
        return res.status(400).json({ error: `Property must be one of: ${ALLOWED_PROPERTIES.join(', ')}` });
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) return res.status(400).json({ error: 'Value cannot be empty' });

    // Get current options
    const getResponse = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'GET'
    );
    if (!getResponse.ok) {
        const err = await getResponse.json().catch(() => ({}));
        return res.status(getResponse.status).json({ error: err.message || 'Error fetching database' });
    }

    const db = await getResponse.json();
    const existingOptions = db.properties[property]?.multi_select?.options || [];

    if (existingOptions.some(o => o.name.toLowerCase() === trimmedValue.toLowerCase())) {
        return res.status(200).json({
            success: true, message: 'Option already exists',
            options: existingOptions.map(o => o.name)
        });
    }

    const newOptions = [...existingOptions.map(o => ({ name: o.name })), { name: trimmedValue }];

    const patchResponse = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'PATCH',
        { properties: { [property]: { multi_select: { options: newOptions } } } }
    );

    if (!patchResponse.ok) {
        const err = await patchResponse.json().catch(() => ({}));
        return res.status(patchResponse.status).json({ error: err.message || 'Error adding option' });
    }

    const updated = await patchResponse.json();
    const updatedOptions = updated.properties[property]?.multi_select?.options || [];

    return res.status(200).json({
        success: true, message: 'Option added',
        options: updatedOptions.map(o => o.name)
    });
}

// ─── SETUP (one-time) ────────────────────────────────
async function handleSetup(req, res) {
    const brandingOptions = [
        'Oficina', 'Profesión', 'Humor', 'Pareja', 'Público', 'Fitness',
        'MILF', 'Teen', 'Inocente', 'Niñera', 'Psicóloga', 'Becaria',
        'Secretaria', 'Médica', 'Gamer', 'Asiática', 'Motorista', 'Femdom',
        'Streamer', 'Yoga'
    ];

    const elementoViralOptions = [
        'Mirada directa', 'Outfit hook', 'Reacción', 'Storytime',
        'Doble sentido', 'Caption fuerte', 'Gesto sugerente', 'Primer plano',
        'Agitación', 'Tendencia', 'Humor', 'Silencio', 'Baile', 'TTS',
        'Espejo', 'Primer plano cara'
    ];

    const response = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'PATCH',
        {
            properties: {
                'Branding': { multi_select: { options: brandingOptions.map(name => ({ name })) } },
                'Elemento Viral': { multi_select: { options: elementoViralOptions.map(name => ({ name })) } }
            }
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Error updating schema', details: err });
    }

    const db = await response.json();
    return res.status(200).json({
        success: true,
        message: 'Database properties created successfully',
        branding_options: db.properties['Branding']?.multi_select?.options?.length || 0,
        elemento_viral_options: db.properties['Elemento Viral']?.multi_select?.options?.length || 0
    });
}

// ─── CHECK (verify Instagram URLs) ────────────────────
async function handleCheck(req, res, body) {
    const { profiles } = body;
    if (!Array.isArray(profiles) || profiles.length === 0) {
        return res.status(400).json({ error: 'profiles array is required' });
    }

    if (profiles.length > 50) {
        return res.status(400).json({ error: 'Max 50 profiles per request' });
    }

    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (p) => {
            if (!p.url) return { id: p.id, url: p.url, status: 'ERROR', reason: 'No URL' };
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const resp = await fetch(p.url, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml'
                    },
                    signal: controller.signal,
                    redirect: 'manual'
                });
                clearTimeout(timeout);

                if (resp.status === 404) {
                    return { id: p.id, url: p.url, status: 'ELIMINADO' };
                }

                // Instagram redirects to /accounts/login/ for deleted/private profiles
                const location = resp.headers.get('location') || '';
                if (location.includes('/accounts/login')) {
                    return { id: p.id, url: p.url, status: 'SIN_AVATAR', reason: 'Redirige a login (privado o eliminado)' };
                }

                if (resp.status >= 200 && resp.status < 400) {
                    return { id: p.id, url: p.url, status: 'ACTIVO' };
                }

                return { id: p.id, url: p.url, status: 'ERROR', reason: `HTTP ${resp.status}` };
            } catch (err) {
                return { id: p.id, url: p.url, status: 'ERROR', reason: err.name === 'AbortError' ? 'Timeout' : err.message };
            }
        }));
        results.push(...batchResults);
    }

    return res.status(200).json({ success: true, results });
}

// ─── DELETE (archive page) ────────────────────────────
async function handleDelete(req, res, body) {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'Missing page id' });

    if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id)) {
        return res.status(400).json({ error: 'Invalid page id format' });
    }

    const response = await notionFetch(`https://api.notion.com/v1/pages/${id}`, 'PATCH', {
        archived: true
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Error archiving page' });
    }

    return res.status(200).json({ success: true, message: 'Page archived' });
}

// ─── MANAGE OPTIONS (rename / delete from schema) ─────
async function handleManageOptions(req, res, body) {
    const { property, action: optAction, oldName, newName, name } = body;

    if (!property) return res.status(400).json({ error: 'Missing property' });
    if (!ALLOWED_PROPERTIES.includes(property)) {
        return res.status(400).json({ error: `Property must be one of: ${ALLOWED_PROPERTIES.join(', ')}` });
    }
    if (!optAction || !['rename', 'delete'].includes(optAction)) {
        return res.status(400).json({ error: 'action must be rename or delete' });
    }

    const getResponse = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'GET'
    );
    if (!getResponse.ok) {
        const err = await getResponse.json().catch(() => ({}));
        return res.status(getResponse.status).json({ error: err.message || 'Error fetching database' });
    }

    const db = await getResponse.json();
    const existingOptions = db.properties[property]?.multi_select?.options || [];

    let newOptions;
    if (optAction === 'rename') {
        if (!oldName || !newName) return res.status(400).json({ error: 'Missing oldName or newName' });
        const trimmed = newName.trim();
        if (!trimmed) return res.status(400).json({ error: 'newName cannot be empty' });
        const idx = existingOptions.findIndex(o => o.name === oldName);
        if (idx === -1) return res.status(404).json({ error: `Option "${oldName}" not found` });
        newOptions = existingOptions.map(o => o.name === oldName ? { name: trimmed } : { name: o.name });
    } else {
        if (!name) return res.status(400).json({ error: 'Missing name to delete' });
        const idx = existingOptions.findIndex(o => o.name === name);
        if (idx === -1) return res.status(404).json({ error: `Option "${name}" not found` });
        newOptions = existingOptions.filter(o => o.name !== name).map(o => ({ name: o.name }));
    }

    const patchResponse = await notionFetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}`, 'PATCH',
        { properties: { [property]: { multi_select: { options: newOptions } } } }
    );

    if (!patchResponse.ok) {
        const err = await patchResponse.json().catch(() => ({}));
        return res.status(patchResponse.status).json({ error: err.message || 'Error updating options' });
    }

    const updated = await patchResponse.json();
    const updatedOptions = updated.properties[property]?.multi_select?.options || [];

    return res.status(200).json({
        success: true,
        message: optAction === 'rename' ? `Renamed "${oldName}" to "${newName}"` : `Deleted "${name}"`,
        options: updatedOptions.map(o => o.name)
    });
}

// ─── AVATAR PROXY (unavatar.io PRO via x-api-key header) ──
const UNAVATAR_KEY = process.env.UNAVATAR_KEY;

async function handleAvatar(req, res) {
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
        if (!response.ok) return res.status(response.status).end();
        const contentType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
        return res.status(502).json({ error: 'Avatar fetch failed' });
    }
}

// ─── SHARED HELPERS ───────────────────────────────────
function notionFetch(url, method, body) {
    const opts = {
        method,
        headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts);
}

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
        notas: getRichText(p['Notas']),
        favorito: getCheckbox(p['Favorito']),
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
function getCheckbox(prop) {
    if (!prop || prop.checkbox === undefined) return false;
    return !!prop.checkbox;
}
