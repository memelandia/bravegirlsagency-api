// api/inspo-vault-setup.js - One-time setup: create Branding and Elemento Viral properties
// POST /api/inspo-vault-setup
// Run once to add the new multi_select properties to the Notion database

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = 'c2623a10218442198f206f75792bc251';
const NOTION_VERSION = '2022-06-28';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

    if (!NOTION_TOKEN) {
        return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
    }

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

    try {
        const response = await fetch(
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
                        'Branding': {
                            multi_select: {
                                options: brandingOptions.map(name => ({ name }))
                            }
                        },
                        'Elemento Viral': {
                            multi_select: {
                                options: elementoViralOptions.map(name => ({ name }))
                            }
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Notion PATCH error:', response.status, err);
            return res.status(response.status).json({
                error: err.message || 'Error updating database schema',
                details: err
            });
        }

        const db = await response.json();
        const brandingCreated = db.properties['Branding']?.multi_select?.options?.length || 0;
        const viralCreated = db.properties['Elemento Viral']?.multi_select?.options?.length || 0;

        return res.status(200).json({
            success: true,
            message: 'Database properties created successfully',
            branding_options: brandingCreated,
            elemento_viral_options: viralCreated
        });
    } catch (error) {
        console.error('inspo-vault-setup error:', error);
        return res.status(500).json({ error: error.message });
    }
};
